"""
OpenAI LLM provider implementation.
"""
from __future__ import annotations

from typing import Any, Dict, List, Type

from openai import OpenAI


class OpenAIProvider:
    """Wraps the OpenAI Python client."""

    def __init__(self) -> None:
        self._client = OpenAI()  # reads OPENAI_API_KEY from env

    def chat_structured(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        response_format: Type[Any],
    ) -> Any:
        """Parse response into a Pydantic model using OpenAI structured outputs."""
        response = self._client.responses.parse(
            model=model,
            input=[{"role": "system", "content": system}] + messages,
            text_format=response_format,
        )
        return response.output_parsed

    def chat(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
    ) -> str:
        """Plain chat completion — returns text content."""
        response = self._client.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=[{"role": "system", "content": system}] + messages,
        )
        return response.choices[0].message.content or ""
