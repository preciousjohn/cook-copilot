"""
LLM provider protocol — all providers implement this interface.
"""
from __future__ import annotations

from typing import Any, List, Dict, Protocol, Type


class LLMProvider(Protocol):
    """Common interface for all LLM provider implementations."""

    def chat_structured(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        response_format: Type[Any],
    ) -> Any:
        """
        Run a chat completion that returns a structured (parsed) Pydantic object.
        Used by agents that need structured JSON output.
        """
        ...

    def chat(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
    ) -> str:
        """
        Run a plain chat completion and return the text response.
        """
        ...
