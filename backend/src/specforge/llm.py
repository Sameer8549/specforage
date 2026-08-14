"""Minimal OpenAI-compatible JSON clients for NIM primary and Groq fallback."""

import json
from typing import Any, Protocol

import httpx
from pydantic import SecretStr

from specforge.config import Settings


class LLMError(RuntimeError):
    pass


class JSONLLM(Protocol):
    async def complete_json(
        self, system_prompt: str, user_prompt: str, schema: dict[str, Any]
    ) -> dict[str, Any]: ...


class OpenAICompatibleJSONClient:
    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        api_key: SecretStr,
        timeout_seconds: float,
        thinking_enabled: bool | None,
        strict_schema: bool = False,
    ) -> None:
        self.url = f"{base_url.rstrip('/')}/chat/completions"
        self.model = model
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds
        self.thinking_enabled = thinking_enabled
        self.strict_schema = strict_schema

    async def complete_json(
        self, system_prompt: str, user_prompt: str, schema: dict[str, Any]
    ) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0,
            "stream": False,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "specforge_response",
                    "strict": self.strict_schema,
                    "schema": schema,
                },
            },
        }
        if self.thinking_enabled is False:
            payload["chat_template_kwargs"] = {"enable_thinking": False}
        headers = {
            "Authorization": f"Bearer {self.api_key.get_secret_value()}",
            "Content-Type": "application/json",
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(self.url, headers=headers, json=payload)
                response.raise_for_status()
                body = response.json()
            content = body["choices"][0]["message"]["content"]
            parsed = json.loads(content)
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            raise LLMError(f"JSON completion failed for {self.model}") from exc
        if not isinstance(parsed, dict):
            raise LLMError(f"JSON completion from {self.model} was not an object")
        return parsed


class FallbackJSONLLM:
    def __init__(self, primary: JSONLLM, fallback: JSONLLM | None = None) -> None:
        self.primary = primary
        self.fallback = fallback

    async def complete_json(
        self, system_prompt: str, user_prompt: str, schema: dict[str, Any]
    ) -> dict[str, Any]:
        try:
            return await self.primary.complete_json(system_prompt, user_prompt, schema)
        except LLMError:
            if self.fallback is None:
                raise
            return await self.fallback.complete_json(system_prompt, user_prompt, schema)


def build_extraction_llm(settings: Settings) -> FallbackJSONLLM:
    if settings.nim_api_key is None or not settings.nim_api_key.get_secret_value().strip():
        raise LLMError("SPECFORGE_NIM_API_KEY is required for extraction")
    primary = OpenAICompatibleJSONClient(
        base_url=settings.nim_base_url,
        model=settings.nim_model,
        api_key=settings.nim_api_key,
        timeout_seconds=settings.llm_timeout_seconds,
        thinking_enabled=False,
        strict_schema=False,
    )
    fallback: OpenAICompatibleJSONClient | None = None
    if settings.groq_api_key is not None and settings.groq_api_key.get_secret_value().strip():
        fallback = OpenAICompatibleJSONClient(
            base_url=settings.groq_base_url,
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            timeout_seconds=settings.llm_timeout_seconds,
            thinking_enabled=None,
            strict_schema=True,
        )
    return FallbackJSONLLM(primary, fallback)


def build_adjudication_llm(settings: Settings) -> FallbackJSONLLM:
    if settings.nim_api_key is None or not settings.nim_api_key.get_secret_value().strip():
        raise LLMError("SPECFORGE_NIM_API_KEY is required for adjudication")
    primary = OpenAICompatibleJSONClient(
        base_url=settings.nim_base_url,
        model=settings.nim_model,
        api_key=settings.nim_api_key,
        timeout_seconds=settings.llm_timeout_seconds,
        thinking_enabled=True,
        strict_schema=False,
    )
    fallback: OpenAICompatibleJSONClient | None = None
    if settings.groq_api_key is not None and settings.groq_api_key.get_secret_value().strip():
        fallback = OpenAICompatibleJSONClient(
            base_url=settings.groq_base_url,
            model=settings.groq_model,
            api_key=settings.groq_api_key,
            timeout_seconds=settings.llm_timeout_seconds,
            thinking_enabled=None,
            strict_schema=True,
        )
    return FallbackJSONLLM(primary, fallback)
