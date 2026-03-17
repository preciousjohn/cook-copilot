"""
Engineer Agent — GCode generation for food 3D printing.

generate() produces GCode from approved syringe recipes + shape silhouette.
Supports per-tool extrusion multiplier and layer height tuning.
"""

from __future__ import annotations

import base64
import math
from typing import List, Optional, Dict, Any, Tuple

import cv2
import numpy as np
from pathlib import Path

from pydantic import BaseModel, Field
from openai import OpenAI
from dotenv import load_dotenv

from datetime import datetime
from zoneinfo import ZoneInfo

from gcode_generation import (
    image_to_gcode,
    estimate_print_time,
    generate_offset_rings_from_image,
    rings_to_gcode,
    split_rings_outer_inner,
    _prepare_silhouette,
)


load_dotenv()
client = OpenAI()

TEMPLATE_DIR = Path(__file__).resolve().parent / "gcode_templates"


def _load_template(filename: str) -> List[str]:
    path = TEMPLATE_DIR / filename
    if not path.exists():
        return []
    return path.read_text(encoding="utf-8").splitlines()


# ═══════════════════════════════════════════════════════════════════════
# Printer Config (unchanged)
# ═══════════════════════════════════════════════════════════════════════

class PrinterConfig(BaseModel):
    bed_size_x_mm: float = 300.0
    bed_size_y_mm: float = 300.0
    bed_size_z_mm: float = 300.0
    num_tools: int = 2
    nozzle_diameter_mm: float = 2.5
    layer_height_mm: float = 1.0
    print_speed: float = 500.0
    travel_speed_mm_per_min: float = 3000.0
    extrusion_multiplier_0: float = Field(default=0.01, ge=0.001)
    extrusion_multiplier_1: float = Field(default=0.02, ge=0.001)
    retract_mm: float = 2.0
    z_hop_mm: float = 2.0


# ═══════════════════════════════════════════════════════════════════════
# 2. generate() — GCode generation (refactored from run_engineer_agent)
# ═══════════════════════════════════════════════════════════════════════

IMG_SIZE = 512

def _make_circle_silhouette() -> np.ndarray:
    img = np.ones((IMG_SIZE, IMG_SIZE), dtype=np.uint8) * 255
    center = IMG_SIZE // 2
    radius = int(IMG_SIZE * 0.4)
    cv2.circle(img, (center, center), radius, 0, -1)
    return img


def _generate_silhouette(shape_description: str) -> Optional[bytes]:
    prompt = (
        f"A cute flat 2D illustration of a {shape_description} as a solid black shape, "
        f"centered on a pure white background. "
        f"Flat cartoon sticker style, like a bold children's stamp or icon. "
        f"Completely filled solid black, NO internal details, NO patterns, NO lines inside. "
        f"Pure white background. Simple clean silhouette, outline only."
    )
    try:
        resp = client.images.generate(
            model="gpt-image-1", prompt=prompt,
            size="1024x1024", quality="low", output_format="png", n=1,
        )
        return base64.b64decode(resp.data[0].b64_json)
    except Exception as e:
        print(f"[Engineer] Image gen failed: {e}")
        return None


def _decode_silhouette(png_bytes: bytes) -> Optional[np.ndarray]:
    nparr = np.frombuffer(png_bytes, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)


MAX_DIAMETER_INFANT_MM = 20   # age <= 2
MAX_DIAMETER_SNACK_MM = 50    # meal_type == "snack"
MAX_DIAMETER_MM = 100         # default
DEFAULT_DIAMETER_SNACK_MM = 40
DEFAULT_DIAMETER_MM = 70
NUM_LAYERS = 3


def _min_diameter_for_shape(silhouette_img: np.ndarray, diameter_min_mm: float, diameter_max_mm: float, base_diameter: float) -> float:
    """Return the bed_region diameter needed so the actual shape is >= diameter_min_mm."""
    binary = _prepare_silhouette(silhouette_img)
    img_h, img_w = binary.shape
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return base_diameter
    _, _, w_px, h_px = cv2.boundingRect(max(contours, key=cv2.contourArea))
    shape_fraction = min(w_px / img_w, h_px / img_h)
    if shape_fraction <= 0:
        return base_diameter
    needed = diameter_min_mm / shape_fraction
    return min(diameter_max_mm, max(base_diameter, needed))


def _resolve_shape(shape_desc: str) -> Tuple[Dict[str, Any], Optional[bytes]]:
    png_bytes = _generate_silhouette(shape_desc)
    if png_bytes:
        silhouette_img = _decode_silhouette(png_bytes)
        if silhouette_img is not None:
            return {
                "tier": "image_generation",
                "method": "image_generation_silhouette",
                "shape_description": shape_desc,
                "silhouette_img": silhouette_img,
            }, png_bytes

    silhouette_img = _make_circle_silhouette()
    return {
        "tier": "fallback",
        "method": "fallback_circle_silhouette",
        "silhouette_img": silhouette_img,
    }, None


def _gcode_header(
    cfg: PrinterConfig,
    num_layers: int = 0,
    diameter: float = 0,
    em_map: List[float] = None,
    lh_map: List[float] = None,
) -> List[str]:
    em_map = em_map or [cfg.extrusion_multiplier_0, cfg.extrusion_multiplier_1]
    lh_map = lh_map or [cfg.layer_height_mm] * cfg.num_tools

    tool_lines = []
    for i in range(len(em_map)):
        lh_val = lh_map[i] if i < len(lh_map) else cfg.layer_height_mm
        tool_lines.append(f"; T{i} (Syringe {i+1}): EM={em_map[i]:.4f}, LH={lh_val:.1f}mm")
    tool_params_str = "\n".join(tool_lines)

    pst = ZoneInfo("America/Los_Angeles")
    timestamp = datetime.now(pst).strftime("%Y-%m-%d %H:%M:%S %Z")

    lines = _load_template("header.gcode")
    if lines:
        raw = "\n".join(lines)
        raw = raw.replace("{TIMESTAMP}", timestamp)
        raw = raw.replace("{NUM_LAYERS}", str(num_layers))
        raw = raw.replace("{DIAMETER}", str(int(diameter)))
        raw = raw.replace("{TOOL_PARAMS}", tool_params_str)
        return raw.split("\n")

    return [
        f"; === CookCopilot GCode ===",
        f"; Generated: {timestamp}",
        f"; Layers: {num_layers}, Diameter: {int(diameter)}mm",
        *tool_lines,
        "G90", "G21", "M83", "G28",
        f"G0 Z10 F{int(cfg.travel_speed_mm_per_min)}",
        "",
    ]


def _gcode_footer() -> List[str]:
    lines = _load_template("footer.gcode")
    if lines:
        return lines
    return ["", "G91", "G0 Z10", "G90", "G0 X0 Y0 F3000", "M84"]


def _tool_change(
    cfg: PrinterConfig,
    tool_idx: int,
    start_xy: Optional[Tuple[float, float]] = None,
) -> List[str]:
    lines = [
        "",
        f"; --- Tool change -> T{tool_idx} ---",
        f"T{tool_idx}",
    ]
    if start_xy is not None:
        x, y = start_xy
        lines.append(f"G0 Z20 F{int(cfg.travel_speed_mm_per_min)} ; Raise to safe height")
        lines.append(
            f"G0 X{x:.3f} Y{y:.3f} Z20.000 F{int(cfg.travel_speed_mm_per_min)}"
            f" ; Move above start point"
        )
    return lines


# Paste density assumed 1 g/cm³ = 0.001 g/mm³
_PASTE_DENSITY_G_PER_MM3 = 0.001
# Allowed print diameter range (mm)
_DIAMETER_MIN_MM = 30.0
_DIAMETER_MAX_MM = 120.0


def _get_nozzle_d(cfg: PrinterConfig, syringe_specs: List[Any], tool_idx: int) -> float:
    if tool_idx < len(syringe_specs):
        spec = syringe_specs[tool_idx]
        if isinstance(spec, dict):
            return float(spec.get("tip_diameter_mm", cfg.nozzle_diameter_mm))
    return cfg.nozzle_diameter_mm


def _run_layer_loop(
    cfg: PrinterConfig,
    silhouette_img,
    diameter: float,
    cx: float,
    cy: float,
    num_layers: int,
    em_map: List[float],
    lh_map: List[float],
    syringe_specs: List[Any],
    outer_fraction: float = 0.5,
) -> Tuple[List[str], float, float, List[Dict[str, Any]], Dict[str, float]]:
    """Build dual-syringe GCode: all layers T0 (outer) first, then all layers T1 (inner).

    Returns (gcode_lines, e_total_s1, e_total_s2, contour_viz, bbox_info).
    """
    half = diameter / 2
    bed_region = (cx - half, cy - half, cx + half, cy + half)

    lines = _gcode_header(
        cfg,
        num_layers=num_layers,
        diameter=diameter,
        em_map=em_map,
        lh_map=lh_map,
    )
    e_total_s1 = 0.0
    e_total_s2 = 0.0
    contour_viz: List[Dict[str, Any]] = []
    bbox_info: Dict[str, float] = {}

    nozzle_d_s1 = _get_nozzle_d(cfg, syringe_specs, 0)
    e_rate_s1 = em_map[0] if em_map else cfg.extrusion_multiplier_0
    e_rate_s2 = em_map[1] if len(em_map) > 1 else e_rate_s1
    lh = lh_map[0] if lh_map else cfg.layer_height_mm

    # Rings are identical every layer (same silhouette), compute once.
    all_rings, layer_bbox = generate_offset_rings_from_image(
        silhouette_img, nozzle_d_s1, bed_region,
    )
    bbox_info = layer_bbox or {}
    outer_rings, inner_rings = split_rings_outer_inner(all_rings, outer_fraction)

    # Contour visualization (geometry is the same for all layers)
    for idx, ring in enumerate(outer_rings):
        contour_viz.append({
            "label": "main_body" if idx == 0 else f"outer_{idx}",
            "syringe_id": 1, "points": ring[:300], "num_points": len(ring),
        })
    for idx, ring in enumerate(inner_rings):
        contour_viz.append({
            "label": f"inner_{idx}",
            "syringe_id": 2, "points": ring[:300], "num_points": len(ring),
        })

    # --- Pass 1: T0 (Syringe 1) — all layers, outer rings ---
    if outer_rings:
        start_xy_t0 = outer_rings[0][0] if outer_rings[0] else None
        lines.extend(_tool_change(cfg, 0, start_xy=start_xy_t0))
        for layer_idx in range(num_layers):
            z = lh * (layer_idx + 1)
            lines.append(f"; --- Layer {layer_idx + 1}/{num_layers}  Z={z:.2f} [T0] ---")
            lines.append(f"; Syringe 1 — {len(outer_rings)} outer ring(s)")
            outer_gcode, e_delta = rings_to_gcode(
                outer_rings, z, e_rate_s1,
                print_speed=cfg.print_speed,
                travel_speed=cfg.travel_speed_mm_per_min,
            )
            lines.extend(outer_gcode)
            e_total_s1 += e_delta

    # --- Pass 2: T1 (Syringe 2) — all layers, inner rings ---
    if inner_rings:
        start_xy_t1 = inner_rings[0][0] if inner_rings[0] else None
        lines.extend(_tool_change(cfg, 1, start_xy=start_xy_t1))
        for layer_idx in range(num_layers):
            z = lh * (layer_idx + 1)
            lines.append(f"; --- Layer {layer_idx + 1}/{num_layers}  Z={z:.2f} [T1] ---")
            lines.append(f"; Syringe 2 — {len(inner_rings)} inner ring(s)")
            inner_gcode, e_delta = rings_to_gcode(
                inner_rings, z, e_rate_s2,
                print_speed=cfg.print_speed,
                travel_speed=cfg.travel_speed_mm_per_min,
            )
            lines.extend(inner_gcode)
            e_total_s2 += e_delta

    lines.extend(_gcode_footer())
    return lines, e_total_s1, e_total_s2, contour_viz, bbox_info


def generate(
    requirement: Dict[str, Any],
    chef_output: Dict[str, Any],
    printer_config: Optional[Dict[str, Any]] = None,
    extrusion_multipliers: Optional[List[float]] = None,
    layer_heights: Optional[List[float]] = None,
    silhouette_image_b64: Optional[str] = None,
) -> Dict[str, Any]:
    """Generate GCode from approved recipes. Supports tunable EM/LH per tool."""
    cfg = PrinterConfig(**(printer_config or {}))
    warnings: List[str] = []

    age = requirement.get("age", 0)
    meal_type = requirement.get("meal_type", "")

    # ── Resolve silhouette: reuse if provided, else generate circle ───
    if silhouette_image_b64:
        png_bytes = base64.b64decode(silhouette_image_b64)
        silhouette_img = _decode_silhouette(png_bytes)
        silhouette_bytes = png_bytes
        shape_info = {"tier": "reused", "method": "reused_silhouette", "silhouette_img": silhouette_img}
    else:
        silhouette_img = _make_circle_silhouette()
        silhouette_bytes = None
        shape_info = {"tier": "fallback", "method": "fallback_circle_silhouette", "silhouette_img": silhouette_img}

    if age <= 2:
        diameter = MAX_DIAMETER_INFANT_MM
        diameter_max = MAX_DIAMETER_INFANT_MM
    elif meal_type == "snack":
        diameter = DEFAULT_DIAMETER_SNACK_MM
        diameter_max = MAX_DIAMETER_SNACK_MM
    else:
        diameter = min(DEFAULT_DIAMETER_MM, MAX_DIAMETER_MM)
        diameter_max = MAX_DIAMETER_MM

    # Ensure actual shape size >= _DIAMETER_MIN_MM by adjusting bed_region upfront
    if silhouette_img is not None:
        diameter = _min_diameter_for_shape(silhouette_img, _DIAMETER_MIN_MM, diameter_max, diameter)

    num_layers = NUM_LAYERS

    cx, cy = 160, 190

    # ── Resolve per-tool extrusion multipliers and layer heights ─────
    em_map = extrusion_multipliers or [
        cfg.extrusion_multiplier_0,
        cfg.extrusion_multiplier_1,
    ]
    lh_map = layer_heights or [cfg.layer_height_mm] * cfg.num_tools
    syringe_specs = chef_output.get("syringe_system_specs", [])

    # ── Resolve per-syringe recipe weights and nozzle specs ───────────
    syringes = chef_output.get("syringe_recipes", [])
    recipe_weight_s1 = float(syringes[0].get("calculated_grams", 0.0)) if len(syringes) > 0 else 0.0
    recipe_weight_s2 = float(syringes[1].get("calculated_grams", 0.0)) if len(syringes) > 1 else 0.0
    total_recipe_weight_g = recipe_weight_s1 + recipe_weight_s2

    nozzle_d_0 = _get_nozzle_d(cfg, syringe_specs, 0)
    nozzle_d_1 = _get_nozzle_d(cfg, syringe_specs, 1)
    nozzle_area_0 = math.pi * (nozzle_d_0 / 2) ** 2
    nozzle_area_1 = math.pi * (nozzle_d_1 / 2) ** 2

    # outer_fraction: fraction of path length for Syringe 1 (outer rings)
    # Derived from weight ratio accounting for nozzle area:
    #   outer_fraction = (nozzle_area_1 × recipe_s1) / (nozzle_area_0 × recipe_s2 + nozzle_area_1 × recipe_s1)
    denom = nozzle_area_0 * recipe_weight_s2 + nozzle_area_1 * recipe_weight_s1
    if denom > 0:
        outer_fraction = (nozzle_area_1 * recipe_weight_s1) / denom
    elif total_recipe_weight_g > 0:
        outer_fraction = recipe_weight_s1 / total_recipe_weight_g
    else:
        outer_fraction = 0.5  # fallback: equal split

    e_rate_s1 = em_map[0] if em_map else cfg.extrusion_multiplier_0
    e_rate_s2 = em_map[1] if len(em_map) > 1 else e_rate_s1

    # ── First pass: generate GCode at base diameter ───────────────────
    gcode_lines, e_total_s1, e_total_s2, all_contour_viz, bbox_info = _run_layer_loop(
        cfg, silhouette_img, diameter, cx, cy,
        num_layers, em_map, lh_map, syringe_specs,
        outer_fraction=outer_fraction,
    )

    # ── Weight matching (total weight: S1 + S2) ────────────────────────
    path_len_s1 = e_total_s1 / e_rate_s1 if e_rate_s1 > 0 else 0.0
    path_len_s2 = e_total_s2 / e_rate_s2 if e_rate_s2 > 0 else 0.0
    print_weight_s1 = path_len_s1 * nozzle_area_0 * _PASTE_DENSITY_G_PER_MM3
    print_weight_s2 = path_len_s2 * nozzle_area_1 * _PASTE_DENSITY_G_PER_MM3
    total_print_weight_g = print_weight_s1 + print_weight_s2

    final_diameter = diameter
    pieces = 1

    if total_recipe_weight_g > 0 and total_print_weight_g > 0:
        # weight ∝ diameter², so scale by sqrt
        scale = math.sqrt(total_recipe_weight_g / total_print_weight_g)
        desired_diameter = diameter * scale
        final_diameter = max(_DIAMETER_MIN_MM, min(diameter_max, desired_diameter))

        if abs(final_diameter - diameter) > 1.0:
            # Second pass with adjusted diameter
            gcode_lines, e_total_s1, e_total_s2, all_contour_viz, bbox_info = _run_layer_loop(
                cfg, silhouette_img, final_diameter, cx, cy,
                num_layers, em_map, lh_map, syringe_specs,
                outer_fraction=outer_fraction,
            )
            path_len_s1 = e_total_s1 / e_rate_s1 if e_rate_s1 > 0 else 0.0
            path_len_s2 = e_total_s2 / e_rate_s2 if e_rate_s2 > 0 else 0.0
            print_weight_s1 = path_len_s1 * nozzle_area_0 * _PASTE_DENSITY_G_PER_MM3
            print_weight_s2 = path_len_s2 * nozzle_area_1 * _PASTE_DENSITY_G_PER_MM3
            total_print_weight_g = print_weight_s1 + print_weight_s2

        if total_print_weight_g > 0:
            pieces = max(1, math.ceil(total_recipe_weight_g / total_print_weight_g))

    # Backward-compat aliases for metadata
    print_weight_g = total_print_weight_g
    recipe_weight_g = total_recipe_weight_g

    gcode_str = "\n".join(gcode_lines)
    time_info = estimate_print_time(gcode_lines)

    primary_lh = lh_map[0] if lh_map else cfg.layer_height_mm
    width_mm = bbox_info.get("width_mm", final_diameter)
    depth_mm = bbox_info.get("depth_mm", final_diameter)

    metadata = {
        "shape_resolution_tier": shape_info["tier"],
        "shape_method": shape_info.get("method", "unknown"),
        "num_layers": num_layers,
        "layer_height_mm": primary_lh,
        "total_height_mm": round(num_layers * primary_lh, 2),
        "diameter_mm": final_diameter,
        "width_mm": width_mm,
        "depth_mm": depth_mm,
        "total_extrusion_mm": round(e_total_s1 + e_total_s2, 2),
        "gcode_lines": gcode_str.count("\n") + 1,
        "estimated_print_time_seconds": time_info["total_seconds"],
        "estimated_print_time_minutes": time_info["total_minutes"],
        "printer": "Jubilee",
        "center_mm": {"x": cx, "y": cy},
        "print_weight_g": round(print_weight_g, 2),
        "recipe_weight_g": round(recipe_weight_g, 2),
        "syringe1_print_weight_g": round(print_weight_s1, 2),
        "syringe2_print_weight_g": round(print_weight_s2, 2),
        "syringe1_recipe_weight_g": round(recipe_weight_s1, 2),
        "syringe2_recipe_weight_g": round(recipe_weight_s2, 2),
        "outer_fraction": round(outer_fraction, 3),
    }

    result: Dict[str, Any] = {
        "gcode": gcode_str, "metadata": metadata, "warnings": warnings,
        "shape_plan": {k: v for k, v in shape_info.items() if k != "silhouette_img"},
        "pieces": pieces,
    }

    if silhouette_bytes:
        result["silhouette_image_b64"] = base64.b64encode(silhouette_bytes).decode("utf-8")
    result["contour_polygons"] = all_contour_viz

    return result


# Backward-compatible alias
def run_engineer_agent(
    requirement, chef_output, printer_config=None,
    extrusion_multipliers=None, layer_heights=None, silhouette_image_b64=None,
):
    return generate(
        requirement, chef_output, printer_config,
        extrusion_multipliers=extrusion_multipliers,
        layer_heights=layer_heights,
        silhouette_image_b64=silhouette_image_b64,
    )


