"""
LLM provider factory — returns the correct provider based on settings.
"""
from __future__ import annotations

from functools import lru_cache

from llm.base import LLMProvider


def get_provider(provider: str) -> LLMProvider:
    """
    Return an LLMProvider instance for the given provider name.
    Provider names: "openai", "anthropic", "gemini"
    """
    match provider.lower():
        case "openai":
            from llm.openai_provider import OpenAIProvider
            return OpenAIProvider()
        case "anthropic":
            from llm.anthropic_provider import AnthropicProvider
            return AnthropicProvider()
        case "gemini":
            from llm.gemini_provider import GeminiProvider
            return GeminiProvider()
        case _:
            # Default to OpenAI
            from llm.openai_provider import OpenAIProvider
            return OpenAIProvider()
