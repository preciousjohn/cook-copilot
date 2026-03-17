"""
Pydantic schemas for app settings (researcher configuration).
"""
from __future__ import annotations

from typing import Dict, List
from pydantic import BaseModel, Field

from core.config import DEFAULT_DIETITIAN_PROMPT, DEFAULT_CHEF_PROMPT, DEFAULT_ENGINEER_PROMPT


class SystemPrompts(BaseModel):
    dietitian: str = DEFAULT_DIETITIAN_PROMPT
    chef: str = DEFAULT_CHEF_PROMPT
    engineer: str = DEFAULT_ENGINEER_PROMPT


class ChefSectionsEnabled(BaseModel):
    printer_context: bool = True
    food_safety_rules: bool = True
    food_design: bool = True
    supplementary: bool = True
    printability_check: bool = True
    food_safety_check: bool = True
    nutrition_rules: bool = True


class AppSettings(BaseModel):
    llm_provider: str = "openai"      # "openai" | "anthropic" | "gemini"
    llm_model: str = "gpt-4o-mini"
    use_rag: bool = True
    rag_sources_enabled: List[str] = [
        "nutrition/dietitian_kb.md",
        "recipe/viscosity_charts.md",
        "recipe/usda_safe_temperature_chart.md",
    ]
    system_prompts: SystemPrompts = SystemPrompts()
    # Evaluation / ablation controls
    chef_sections_enabled: ChefSectionsEnabled = ChefSectionsEnabled()
    chef_sections_content: Dict[str, str] = Field(default_factory=dict)  # empty = use defaults
    skip_dietitian: bool = False   # Eval 1 baseline: bypass nutrition calculation
    use_usda_api: bool = True      # part of nutrition_rules ablation


class RAGSource(BaseModel):
    filename: str
    enabled: bool
    size_bytes: int
    chunk_count: int
