"""
GCode generation module for food 3D printing.

Image-based offset ring generation:

  generate_offset_rings_from_image()
     — Takes a binary silhouette image (e.g. from DALL-E) directly.
     — Erode pipeline produces concentric offset rings.

Rings are then:
  → connected into a single continuous path (nearest-neighbor)
  → converted to GCode (continuous extrusion, no travel between rings)

Dependencies: opencv-python-headless, numpy
"""

from __future__ import annotations

import math
from typing import Dict, List, Tuple

import cv2
import numpy as np


# ═══════════════════════════════════════════════════════════════════════
# Shared: erode pipeline (image → rings in pixel coords)
# ═══════════════════════════════════════════════════════════════════════

def _make_erode_kernel(nozzle_diameter_mm: float, ppm: float) -> np.ndarray:
    """Create a circular erosion kernel sized to nozzle_radius in pixels."""
    offset_step_mm = nozzle_diameter_mm / 1.0
    radius_px = max(1, int(round(offset_step_mm * ppm)))
    size = radius_px * 2 + 1
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (size, size))


def _contours_from_image(
    img: np.ndarray,
    simplify_epsilon_mm: float = 0.15,
    ppm: float = 1.0,
    min_area_px: float = 4.0,
) -> List[np.ndarray]:
    """
    Extract simplified contours from a binary image.
    simplify_epsilon_mm controls the approximation tolerance in mm.
    Returns list of contour arrays, each shape (N, 2) in pixel coords.
    """
    contours_raw, _ = cv2.findContours(
        img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE,
    )
    epsilon_px = simplify_epsilon_mm * ppm
    result = []
    for c in contours_raw:
        if cv2.contourArea(c) < min_area_px:
            continue
        approx = cv2.approxPolyDP(c, epsilon_px, True)
        pts = approx.reshape(-1, 2).astype(float)
        if len(pts) >= 3:
            result.append(pts)
    return result


def _erode_and_extract_rings_px(
    binary_img: np.ndarray,
    kernel: np.ndarray,
    ppm: float = 1.0,
    min_area_px: float = 4.0,
    max_iterations: int = 200,
) -> List[np.ndarray]:
    """
    Core erode loop: repeatedly erode the binary image and extract contours.
    Returns a flat list of all contour arrays (in pixel coords),
    from outermost (original) to innermost.
    """
    all_contours: List[np.ndarray] = []

    contours_px = _contours_from_image(binary_img, ppm=ppm, min_area_px=min_area_px)
    all_contours.extend(contours_px)

    current = binary_img.copy()
    for _ in range(max_iterations):
        eroded = cv2.erode(current, kernel, iterations=1)
        if cv2.countNonZero(eroded) == 0:
            break
        contours_px = _contours_from_image(eroded, ppm=ppm, min_area_px=min_area_px)
        if not contours_px:
            break
        all_contours.extend(contours_px)
        current = eroded

    return all_contours


# ═══════════════════════════════════════════════════════════════════════
# Silhouette preprocessing
# ═══════════════════════════════════════════════════════════════════════

def _prepare_silhouette(silhouette_img: np.ndarray) -> np.ndarray:
    """
    Convert a silhouette image (black shape on white, or any grayscale/colour)
    to a clean binary mask (white shape = 255, background = 0).
    """
    if len(silhouette_img.shape) == 3:
        gray = cv2.cvtColor(silhouette_img, cv2.COLOR_BGR2GRAY)
    else:
        gray = silhouette_img

    h, w = gray.shape
    border = np.concatenate([
        gray[0, :], gray[-1, :], gray[:, 0], gray[:, -1],
    ])
    if np.mean(border) > 128:
        _, binary = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV)
    else:
        _, binary = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY)

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    return binary


# ═══════════════════════════════════════════════════════════════════════
# Image → offset rings
# ═══════════════════════════════════════════════════════════════════════

def generate_offset_rings_from_image(
    silhouette_img: np.ndarray,
    nozzle_diameter_mm: float,
    bed_region_mm: Tuple[float, float, float, float],
    min_area_mm2: float = 1.0,
) -> Tuple[List[List[Tuple[float, float]]], Dict[str, float]]:
    """
    Generate concentric offset rings directly from a silhouette image.

    Returns:
        (rings_in_mm, bbox_info)
    """
    x_min, y_min, x_max, y_max = bed_region_mm
    region_w_mm = x_max - x_min
    region_h_mm = y_max - y_min

    binary = _prepare_silhouette(silhouette_img)
    img_h, img_w = binary.shape

    ppm_x = img_w / region_w_mm
    ppm_y = img_h / region_h_mm
    ppm = (ppm_x + ppm_y) / 2.0

    min_area_px = min_area_mm2 * ppm * ppm

    kernel = _make_erode_kernel(nozzle_diameter_mm, ppm)

    contours_px = _erode_and_extract_rings_px(
        binary, kernel, ppm=ppm, min_area_px=min_area_px,
    )

    # Calculate bounding box from binary silhouette
    contours_all, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours_all:
        largest_contour = max(contours_all, key=cv2.contourArea)
        x_px, y_px, w_px, h_px = cv2.boundingRect(largest_contour)
        width_mm = round(w_px / ppm, 1)
        depth_mm = round(h_px / ppm, 1)
    else:
        width_mm = round(region_w_mm, 1)
        depth_mm = round(region_h_mm, 1)

    bbox_info = {
        "width_mm": width_mm,
        "depth_mm": depth_mm,
    }

    # Convert pixel coords → mm coords
    rings = []
    for c in contours_px:
        ring = [
            (float(pt[0]) / ppm + x_min,
             y_max - float(pt[1]) / ppm)
            for pt in c
        ]
        if len(ring) >= 3:
            rings.append(ring)

    return rings, bbox_info


# ═══════════════════════════════════════════════════════════════════════
# Connect rings into a single continuous path
# ═══════════════════════════════════════════════════════════════════════

def _vec_sub(a: Tuple[float, float], b: Tuple[float, float]) -> Tuple[float, float]:
    return (a[0] - b[0], a[1] - b[1])

def _vec_len(v: Tuple[float, float]) -> float:
    return math.sqrt(v[0] ** 2 + v[1] ** 2)

def _closest_point_index(
    ring: List[Tuple[float, float]],
    target: Tuple[float, float],
) -> int:
    best_idx = 0
    best_dist = float("inf")
    for i, pt in enumerate(ring):
        d = _vec_len(_vec_sub(pt, target))
        if d < best_dist:
            best_dist = d
            best_idx = i
    return best_idx


def _ring_min_distance_fast(
    ring_a: List[Tuple[float, float]],
    ring_b: List[Tuple[float, float]],
) -> float:
    """Approximate minimum distance between two rings (sampled)."""
    min_d = float("inf")
    step_a = max(1, len(ring_a) // 12)
    step_b = max(1, len(ring_b) // 12)
    for i in range(0, len(ring_a), step_a):
        for j in range(0, len(ring_b), step_b):
            d = _vec_len(_vec_sub(ring_a[i], ring_b[j]))
            if d < min_d:
                min_d = d
    return min_d


def _ring_path_length(ring: List[Tuple[float, float]]) -> float:
    """Compute total perimeter length of a closed ring in mm."""
    if len(ring) < 2:
        return 0.0
    total = 0.0
    n = len(ring)
    for i in range(n):
        dx = ring[(i + 1) % n][0] - ring[i][0]
        dy = ring[(i + 1) % n][1] - ring[i][1]
        total += math.sqrt(dx * dx + dy * dy)
    return total


def split_rings_outer_inner(
    rings: List[List[Tuple[float, float]]],
    outer_fraction: float,
) -> Tuple[List[List[Tuple[float, float]]], List[List[Tuple[float, float]]]]:
    """Split rings into outer (Syringe 1) and inner (Syringe 2) groups.

    Rings are assumed to be ordered from outermost (index 0) to innermost.
    outer_fraction is the target fraction of total path length for the outer group.

    Returns (outer_rings, inner_rings).
    """
    if not rings:
        return [], []
    if len(rings) == 1:
        return list(rings), []

    outer_fraction = max(0.0, min(1.0, outer_fraction))
    if outer_fraction >= 1.0:
        return list(rings), []
    if outer_fraction <= 0.0:
        return [], list(rings)

    ring_lengths = [_ring_path_length(r) for r in rings]
    total_length = sum(ring_lengths)
    if total_length == 0:
        return list(rings), []

    target_outer_length = total_length * outer_fraction
    cumulative = 0.0
    split_idx = 1
    for i, length in enumerate(ring_lengths):
        cumulative += length
        if cumulative >= target_outer_length:
            split_idx = i + 1
            break

    # Ensure at least 1 ring in outer; leave at least 1 in inner if possible
    split_idx = max(1, min(split_idx, len(rings) - 1))
    return rings[:split_idx], rings[split_idx:]


def connect_rings_continuous(
    rings: List[List[Tuple[float, float]]],
) -> List[Tuple[float, float]]:
    """
    Connect all rings into a single continuous path.
    Uses nearest-neighbor ring ordering to minimise travel.
    """
    if not rings:
        return []
    if len(rings) == 1:
        return list(rings[0]) + [rings[0][0]]

    remaining = list(range(1, len(rings)))
    order = [0]

    while remaining:
        last_ring = rings[order[-1]]
        best_idx = remaining[0]
        best_dist = float("inf")
        for idx in remaining:
            d = _ring_min_distance_fast(last_ring, rings[idx])
            if d < best_dist:
                best_dist = d
                best_idx = idx
        remaining.remove(best_idx)
        order.append(best_idx)

    path: List[Tuple[float, float]] = []
    for i, ring_idx in enumerate(order):
        ring = rings[ring_idx]
        if i == 0:
            ordered = list(ring)
        else:
            last_pt = path[-1]
            closest = _closest_point_index(ring, last_pt)
            ordered = ring[closest:] + ring[:closest]

        path.extend(ordered)
        path.append(ordered[0])

    return path


# ═══════════════════════════════════════════════════════════════════════
# GCode generation
# ═══════════════════════════════════════════════════════════════════════

def continuous_path_to_gcode(
    path: List[Tuple[float, float]],
    z: float,
    e_rate: float,
    speed: float,
    e_offset: float = 0.0,
    max_seg_mm: float = 1.0,
) -> Tuple[List[str], float]:
    """
    Convert a continuous (x, y) path to GCode lines.

    Extrusion uses relative mode (M83): each E value is the incremental
    extrusion for that segment, not a running total.
    X, Y, Z remain in absolute coordinates (G90).

    Long segments are subdivided so that no single G1 move exceeds
    max_seg_mm in length. This ensures smooth extrusion and prevents
    slicer previews from showing dotted lines.

    e_offset is accepted for API compatibility but ignored in relative mode.
    Returns (gcode_lines, total_extrusion_delta).
    """
    if len(path) < 2:
        return [], 0.0

    lines: List[str] = []
    e_total = 0.0

    # Travel move to start position (no extrusion)
    lines.append(f"G0 X{path[0][0]:.3f} Y{path[0][1]:.3f} Z{z:.3f} F{int(speed)}")

    for i in range(1, len(path)):
        dx = path[i][0] - path[i - 1][0]
        dy = path[i][1] - path[i - 1][1]
        dist = math.sqrt(dx * dx + dy * dy)
        if dist < 1e-6:
            continue

        # Subdivide long segments
        n_sub = max(1, math.ceil(dist / max_seg_mm))
        sub_e = (dist * e_rate) / n_sub
        x0, y0 = path[i - 1]
        for s in range(1, n_sub + 1):
            t = s / n_sub
            sx = x0 + dx * t
            sy = y0 + dy * t
            e_total += sub_e
            lines.append(f"G1 X{sx:.3f} Y{sy:.3f} E{sub_e:.6f} F{int(speed)}")

    return lines, e_total


# ═══════════════════════════════════════════════════════════════════════
# Print time estimation
# ═══════════════════════════════════════════════════════════════════════

def estimate_print_time(gcode_lines: List[str]) -> Dict[str, float]:
    """Estimate print time from GCode lines."""
    cur_x, cur_y, cur_z = 0.0, 0.0, 0.0
    cur_f = 300.0

    extrusion_time = 0.0
    travel_time = 0.0
    dwell_time = 0.0
    extrusion_dist = 0.0
    travel_dist = 0.0

    for line in gcode_lines:
        line = line.strip()
        if not line or line.startswith(";"):
            continue
        if ";" in line:
            line = line[:line.index(";")].strip()

        parts = line.split()
        if not parts:
            continue

        cmd = parts[0].upper()

        if cmd == "G4":
            for p in parts[1:]:
                p_upper = p.upper()
                if p_upper.startswith("P"):
                    dwell_time += float(p_upper[1:]) / 1000.0
                elif p_upper.startswith("S"):
                    dwell_time += float(p_upper[1:])
            continue

        if cmd not in ("G0", "G1"):
            continue

        new_x, new_y, new_z = cur_x, cur_y, cur_z
        new_f = cur_f
        for p in parts[1:]:
            p_upper = p.upper()
            if p_upper.startswith("X"):
                new_x = float(p_upper[1:])
            elif p_upper.startswith("Y"):
                new_y = float(p_upper[1:])
            elif p_upper.startswith("Z"):
                new_z = float(p_upper[1:])
            elif p_upper.startswith("F"):
                new_f = float(p_upper[1:])

        dx = new_x - cur_x
        dy = new_y - cur_y
        dz = new_z - cur_z
        dist = math.sqrt(dx * dx + dy * dy + dz * dz)

        if dist > 1e-6 and new_f > 0:
            move_time = dist / new_f * 60.0
            if cmd == "G1":
                extrusion_time += move_time
                extrusion_dist += dist
            else:
                travel_time += move_time
                travel_dist += dist

        cur_x, cur_y, cur_z = new_x, new_y, new_z
        cur_f = new_f

    total = extrusion_time + travel_time + dwell_time
    return {
        "total_seconds": round(total, 2),
        "total_minutes": round(total / 60.0, 2),
        "extrusion_seconds": round(extrusion_time, 2),
        "travel_seconds": round(travel_time, 2),
        "dwell_seconds": round(dwell_time, 2),
        "total_extrusion_distance_mm": round(extrusion_dist, 2),
        "total_travel_distance_mm": round(travel_dist, 2),
    }


# ═══════════════════════════════════════════════════════════════════════
# High-level: image → GCode
# ═══════════════════════════════════════════════════════════════════════

def rings_to_gcode(
    rings: List[List[Tuple[float, float]]],
    z: float,
    e_rate: float,
    print_speed: float,
    travel_speed: float,
    max_seg_mm: float = 1.0,
) -> Tuple[List[str], float]:
    """
    Convert ordered rings to GCode with proper G0 travel moves between rings.

    Each ring is extruded as a closed loop (G1 + E).
    Transitions between rings use G0 (travel, no extrusion).
    Long segments within a ring are subdivided to max_seg_mm.
    Returns (gcode_lines, total_extrusion_delta).
    """
    if not rings:
        return [], 0.0

    # Order rings by nearest-neighbor for minimal travel
    ordered_rings = _order_rings(rings)

    lines: List[str] = []
    e_total = 0.0

    for ring_i, ring in enumerate(ordered_rings):
        if len(ring) < 3:
            continue

        # G0 travel to ring start (no extrusion)
        lines.append(f"G0 X{ring[0][0]:.3f} Y{ring[0][1]:.3f} Z{z:.3f} F{int(travel_speed)}")

        # Extrude along the ring
        closed_ring = list(ring) + [ring[0]]
        for i in range(1, len(closed_ring)):
            dx = closed_ring[i][0] - closed_ring[i - 1][0]
            dy = closed_ring[i][1] - closed_ring[i - 1][1]
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < 1e-6:
                continue

            # Subdivide long segments
            n_sub = max(1, math.ceil(dist / max_seg_mm))
            sub_e = (dist * e_rate) / n_sub
            x0, y0 = closed_ring[i - 1]
            for s in range(1, n_sub + 1):
                t = s / n_sub
                sx = x0 + dx * t
                sy = y0 + dy * t
                e_total += sub_e
                lines.append(f"G1 X{sx:.3f} Y{sy:.3f} E{sub_e:.6f} F{int(print_speed)}")

    return lines, e_total


def _order_rings(
    rings: List[List[Tuple[float, float]]],
) -> List[List[Tuple[float, float]]]:
    """
    Order rings by nearest-neighbor to minimise travel distance.
    Also rotates each ring so the start point is closest to the
    previous ring's end point.
    """
    if len(rings) <= 1:
        return rings

    remaining = list(range(1, len(rings)))
    order = [0]

    while remaining:
        last_ring = rings[order[-1]]
        best_idx = remaining[0]
        best_dist = float("inf")
        for idx in remaining:
            d = _ring_min_distance_fast(last_ring, rings[idx])
            if d < best_dist:
                best_dist = d
                best_idx = idx
        remaining.remove(best_idx)
        order.append(best_idx)

    result: List[List[Tuple[float, float]]] = []
    last_pt: Tuple[float, float] | None = None
    for ring_idx in order:
        ring = rings[ring_idx]
        if last_pt is not None:
            closest = _closest_point_index(ring, last_pt)
            ring = ring[closest:] + ring[:closest]
        result.append(ring)
        # End point of this ring = start point (closed loop)
        last_pt = ring[0]

    return result


def image_to_gcode(
    silhouette_img: np.ndarray,
    nozzle_d: float,
    bed_region_mm: Tuple[float, float, float, float],
    z: float,
    e_rate: float,
    speed: float,
    e_offset: float,
    travel_speed: float = 3000.0,
) -> Tuple[List[str], float, List[List[Tuple[float, float]]], Dict[str, float]]:
    """
    All-in-one: silhouette image → offset rings → GCode.

    Returns:
        (gcode_lines, extrusion_delta, rings, bbox_info)
    """
    rings, bbox_info = generate_offset_rings_from_image(
        silhouette_img, nozzle_d, bed_region_mm,
    )
    if not rings:
        return [], 0.0, rings, bbox_info
    gcode, e_delta = rings_to_gcode(
        rings, z, e_rate,
        print_speed=speed,
        travel_speed=travel_speed,
    )
    return gcode, e_delta, rings, bbox_info