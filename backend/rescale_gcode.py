"""
Rescale an existing GCode file by new EM and/or LH values.

- EM (extrusion multiplier): scales all E values proportionally
- LH (layer height):         scales all Z values proportionally

No weight matching or image processing — pure GCode text transformation.

Usage:
    python rescale_gcode.py input.gcode output.gcode --em 0.02 --lh 1.5
    python rescale_gcode.py input.gcode output.gcode --em0 0.015 --em1 0.025
    python rescale_gcode.py input.gcode output.gcode --lh 1.2
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


def _parse_current_params(lines: list[str]) -> dict:
    """Read EM and LH from the GCode header comments."""
    params = {"em": [], "lh": None}
    for line in lines:
        # "; T0 (Syringe 1): EM=0.0100, LH=1.0mm"
        m = re.search(r'EM=([\d.]+)', line)
        if m:
            params["em"].append(float(m.group(1)))
        m = re.search(r'LH=([\d.]+)mm', line)
        if m and params["lh"] is None:
            params["lh"] = float(m.group(1))
    return params


def rescale_gcode(
    gcode: str,
    em_values: list[float] | None = None,   # new EM per tool [em_T0, em_T1, ...]
    lh: float | None = None,                # new layer height (mm)
) -> str:
    """
    Rescale E and Z values in a GCode string.

    em_values: new extrusion multipliers per tool. If a tool's EM is not provided,
               its E values are left unchanged.
    lh:        new layer height. Z values are scaled by (new_lh / old_lh).
    """
    lines = gcode.splitlines()
    current = _parse_current_params(lines)

    # Compute per-tool E scale factors
    old_ems = current["em"]
    e_scales: list[float] = []
    if em_values and old_ems:
        for i, new_em in enumerate(em_values):
            old_em = old_ems[i] if i < len(old_ems) else old_ems[-1]
            e_scales.append(new_em / old_em if old_em > 0 else 1.0)

    # Compute Z scale factor
    old_lh = current["lh"]
    z_scale = (lh / old_lh) if (lh and old_lh and old_lh > 0) else 1.0

    current_tool = 0
    out_lines: list[str] = []

    for line in lines:
        stripped = line.strip()

        # Track current tool
        if re.match(r'^T(\d+)\s*($|;)', stripped):
            m = re.match(r'^T(\d+)', stripped)
            if m:
                current_tool = int(m.group(1))
            out_lines.append(line)
            continue

        # Update header comment
        if '; T' in line and 'EM=' in line:
            if em_values:
                idx = None
                m = re.search(r'; T(\d+)', line)
                if m:
                    idx = int(m.group(1))
                if idx is not None and idx < len(em_values):
                    line = re.sub(r'EM=[\d.]+', f'EM={em_values[idx]:.4f}', line)
            if lh:
                line = re.sub(r'LH=[\d.]+mm', f'LH={lh:.1f}mm', line)
            out_lines.append(line)
            continue

        # Skip comment-only lines
        if stripped.startswith(';') or not stripped:
            out_lines.append(line)
            continue

        # Scale E values
        if e_scales and re.search(r'\bE[\d.]+', line, re.IGNORECASE):
            scale = e_scales[current_tool] if current_tool < len(e_scales) else 1.0
            if abs(scale - 1.0) > 1e-9:
                line = re.sub(
                    r'\bE([\d.]+)',
                    lambda m: f'E{float(m.group(1)) * scale:.6f}',
                    line,
                    flags=re.IGNORECASE,
                )

        # Scale Z values
        if z_scale != 1.0 and re.search(r'\bZ[\d.]+', line, re.IGNORECASE):
            line = re.sub(
                r'\bZ([\d.]+)',
                lambda m: f'Z{float(m.group(1)) * z_scale:.3f}',
                line,
                flags=re.IGNORECASE,
            )

        out_lines.append(line)

    return "\n".join(out_lines)


def main():
    parser = argparse.ArgumentParser(description="Rescale GCode EM/LH values")
    parser.add_argument("input",  help="Input GCode file")
    parser.add_argument("output", help="Output GCode file")
    parser.add_argument("--em",  type=float, default=None,
                        help="New EM for all tools")
    parser.add_argument("--em0", type=float, default=None,
                        help="New EM for T0 (Syringe 1)")
    parser.add_argument("--em1", type=float, default=None,
                        help="New EM for T1 (Syringe 2)")
    parser.add_argument("--lh",  type=float, default=None,
                        help="New layer height (mm)")
    args = parser.parse_args()

    gcode = Path(args.input).read_text()
    current = _parse_current_params(gcode.splitlines())

    # Build em_values list
    if args.em is not None:
        em_values = [args.em] * max(len(current["em"]), 2)
    elif args.em0 is not None or args.em1 is not None:
        em_values = [
            args.em0 if args.em0 is not None else (current["em"][0] if current["em"] else 0.01),
            args.em1 if args.em1 is not None else (current["em"][1] if len(current["em"]) > 1 else 0.01),
        ]
    else:
        em_values = None

    print(f"Current: EM={current['em']}, LH={current['lh']}mm")
    print(f"New:     EM={em_values}, LH={args.lh}mm")

    result = rescale_gcode(gcode, em_values=em_values, lh=args.lh)
    Path(args.output).write_text(result)
    print(f"Saved → {args.output}")


if __name__ == "__main__":
    main()
