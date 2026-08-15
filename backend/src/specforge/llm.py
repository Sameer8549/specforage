"""OpenAI-compatible structured JSON clients for NVIDIA and Groq."""

import asyncio
import json
from typing import Any, Protocol

from openai import OpenAI, OpenAIError
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
        max_retries: int,
        retry_backoff_seconds: float,
        enable_thinking: bool | None,
        reasoning_budget: int | None = None,
        strict_schema: bool = False,
    ) -> None:
        if reasoning_budget is not None and enable_thinking is not True:
            raise ValueError("A reasoning budget requires thinking to be enabled.")
        self.model = model
        self.enable_thinking = enable_thinking
        self.reasoning_budget = reasoning_budget
        self.strict_schema = strict_schema
        self.max_retries = max_retries
        self.retry_backoff_seconds = retry_backoff_seconds
        self.client = OpenAI(
            base_url=base_url,
            api_key=api_key.get_secret_value(),
            timeout=timeout_seconds,
            max_retries=0,
        )

    @property
    def extra_body(self) -> dict[str, Any] | None:
        if self.enable_thinking is None:
            return None
        body: dict[str, Any] = {
            "chat_template_kwargs": {"enable_thinking": self.enable_thinking}
        }
        if self.reasoning_budget is not None:
            body["reasoning_budget"] = self.reasoning_budget
        return body

    def _complete(self, system_prompt: str, user_prompt: str, schema: dict[str, Any]) -> dict:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
            stream=False,
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "specforge_response",
                    "strict": self.strict_schema,
                    "schema": schema,
                },
            },
            extra_body=self.extra_body,
        )
        content = response.choices[0].message.content
        parsed = json.loads(content or "")
        if not isinstance(parsed, dict):
            raise ValueError("Completion content was not a JSON object")
        return parsed

    async def complete_json(
        self, system_prompt: str, user_prompt: str, schema: dict[str, Any]
    ) -> dict[str, Any]:
        last_error: Exception | None = None
        for attempt in range(self.max_retries + 1):
            try:
                return await asyncio.to_thread(
                    self._complete, system_prompt, user_prompt, schema
                )
            except (OpenAIError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
                last_error = exc
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_backoff_seconds * (2**attempt))
        raise LLMError(
            f"JSON completion failed for {self.model} after {self.max_retries + 1} attempts"
        ) from last_error


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


def _groq_fallback(settings: Settings) -> OpenAICompatibleJSONClient | None:
    if settings.groq_api_key is None or not settings.groq_api_key.get_secret_value().strip():
        return None
    return OpenAICompatibleJSONClient(
        base_url=settings.groq_base_url,
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        timeout_seconds=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
        retry_backoff_seconds=settings.llm_retry_backoff_seconds,
        enable_thinking=None,
        strict_schema=True,
    )


def _require_nvidia_key(settings: Settings) -> SecretStr:
    key = settings.nvidia_api_key
    if key is None or not key.get_secret_value().strip():
        raise LLMError("NVIDIA_API_KEY is required for NVIDIA inference")
    return key


def build_extraction_llm(settings: Settings) -> FallbackJSONLLM:
    primary = OpenAICompatibleJSONClient(
        base_url=settings.nvidia_base_url,
        model=settings.nvidia_model,
        api_key=_require_nvidia_key(settings),
        timeout_seconds=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
        retry_backoff_seconds=settings.llm_retry_backoff_seconds,
        enable_thinking=False,
        reasoning_budget=None,
        strict_schema=False,
    )
    return FallbackJSONLLM(primary, _groq_fallback(settings))


def build_adjudication_llm(settings: Settings) -> FallbackJSONLLM:
    primary = OpenAICompatibleJSONClient(
        base_url=settings.nvidia_base_url,
        model=settings.nvidia_model,
        api_key=_require_nvidia_key(settings),
        timeout_seconds=settings.llm_timeout_seconds,
        max_retries=settings.llm_max_retries,
        retry_backoff_seconds=settings.llm_retry_backoff_seconds,
        enable_thinking=True,
        reasoning_budget=settings.adjudication_reasoning_budget,
        strict_schema=False,
    )
    return FallbackJSONLLM(primary, _groq_fallback(settings))
