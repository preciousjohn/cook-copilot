"""
Google Gemini LLM provider implementation.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Type


class GeminiProvider:
    """Wraps the Google generativeai client."""

    def __init__(self) -> None:
        try:
            import google.generativeai as genai
            import os
            genai.configure(api_key=os.getenv("GOOGLE_API_KEY", ""))
            self._genai = genai
        except ImportError:
            raise ImportError(
                "google-generativeai package is not installed. "
                "Run: pip install google-generativeai"
            )

    def chat_structured(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        response_format: Type[Any],
    ) -> Any:
        """Structured output via JSON mode + Pydantic parsing."""
        client = self._genai.GenerativeModel(
            model_name=model,
            system_instruction=system,
            generation_config={"response_mime_type": "application/json"},
        )
        history = [{"role": m["role"], "parts": [m["content"]]} for m in messages[:-1]]
        last_msg = messages[-1]["content"] if messages else ""

        chat = client.start_chat(history=history)
        response = chat.send_message(last_msg)
        data = json.loads(response.text)
        return response_format(**data)

    def chat(
        self,
        model: str,
        system: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
    ) -> str:
        client = self._genai.GenerativeModel(
            model_name=model,
            system_instruction=system,
            generation_config={"temperature": temperature},
        )
        history = [{"role": m["role"], "parts": [m["content"]]} for m in messages[:-1]]
        last_msg = messages[-1]["content"] if messages else ""
        chat = client.start_chat(history=history)
        response = chat.send_message(last_msg)
        return response.text
