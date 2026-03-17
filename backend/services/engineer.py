"""
Engineer service — translates the new simplified API input into the
requirement + chef_output dicts expected by engineer_agent.generate().
"""
from __future__ import annotations

import sys
import os
from typing import Any, Dict, List, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run(
    prompt: str,
    chef_output: Dict[str, Any],
    age: int = 0,
    meal_type: str = "",
    silhouette_b64: Optional[str] = None,
    em_values: Optional[List[float]] = None,
    lh: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Run the engineer pipeline.

    Args:
        prompt:        The user's original food description
        chef_output:   The full ChefResponse dict
        silhouette_b64: Optional existing silhouette to reuse (avoids image generation)
        em_values:     Per-syringe extrusion multipliers
        lh:            Layer height in mm
    Returns:
        Full engineer output dict (EngineerResponse)
    """
    import engineer_agent

    requirement = {"age": age, "meal_type": meal_type}

    layer_heights = [lh] * (chef_output.get("num_syringes", 2) or 2) if lh else None

    # Reuse the silhouette from chef output to keep shape consistent
    resolved_silhouette = silhouette_b64 or chef_output.get("silhouette_image_b64")

    return engineer_agent.generate(
        requirement,
        chef_output,
        extrusion_multipliers=em_values,
        layer_heights=layer_heights,
        silhouette_image_b64=resolved_silhouette,
    )


def regenerate(
    syringe_recipes: List[Dict[str, Any]],
    silhouette_b64: str,
    em_values: List[float],
    lh: float,
) -> str:
    """
    Regenerate GCode with updated EM/LH parameters, reusing the existing silhouette.
    Returns the GCode string.
    """
    import engineer_agent

    # Build a minimal chef_output with just the recipes the engineer needs
    minimal_chef = {
        "num_syringes": len(em_values),
        "syringe_recipes": syringe_recipes,
        "syringe_system_specs": [],
    }
    layer_heights = [lh] * len(em_values)

    result = engineer_agent.generate(
        requirement={},
        chef_output=minimal_chef,
        extrusion_multipliers=em_values,
        layer_heights=layer_heights,
        silhouette_image_b64=silhouette_b64,
    )
    return result.get("gcode", "")
