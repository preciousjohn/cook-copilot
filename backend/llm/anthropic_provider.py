"""
Anthropic (Claude) LLM provider implementation.
Structured output is simulated via JSON mode + Pydantic parsing.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Type


class AnthropicProvider:
    """Wraps the Anthropic Python client."""

    def __init__(self) -> None:
        try:
            import anthropic
            self._client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env
        except ImportError:
            raise ImportError(
                "anthropic package is not installed. "
                "Run: pip install anthropic"
            )

    def chat_structured(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        response_format: Type[Any],
    ) -> Any:
        """
        Structured output via JSON mode — ask Claude to return JSON,
        then parse into the Pydantic model.
        """
        import anthropic

        json_instruction = (
            f"\n\nReturn ONLY valid JSON matching this schema: "
            f"{response_format.model_json_schema()}"
        )

        response = self._client.messages.create(
            model=model,
            max_tokens=4096,
            system=system + json_instruction,
            messages=messages,
        )
        text = response.content[0].text
        # Parse JSON and construct Pydantic object
        data = json.loads(text)
        return response_format(**data)

    def chat(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
    ) -> str:
        response = self._client.messages.create(
            model=model,
            max_tokens=2048,
            temperature=temperature,
            system=system,
            messages=messages,
        )
        return response.content[0].text
