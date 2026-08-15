from types import SimpleNamespace

import pytest

from specforge.config import Settings
from specforge.llm import FallbackJSONLLM, build_extraction_llm


def configured_settings(monkeypatch) -> Settings:
    monkeypatch.setenv("NVIDIA_API_KEY", __name__)
    return Settings(_env_file=None)


def test_nvidia_key_uses_exact_unprefixed_environment_name(monkeypatch) -> None:
    settings = configured_settings(monkeypatch)

    assert settings.nvidia_api_key is not None
    assert settings.nvidia_api_key.get_secret_value() == __name__


def test_extract_and_verify_client_disable_thinking_without_budget(monkeypatch) -> None:
    client = build_extraction_llm(configured_settings(monkeypatch)).primary

    assert client.model == "nvidia/nemotron-3.5-lightning-30b-a3b"
    assert client.enable_thinking is False
    assert client.reasoning_budget is None
    assert client.extra_body == {"chat_template_kwargs": {"enable_thinking": False}}


@pytest.mark.asyncio
async def test_completion_is_non_streaming_and_uses_nested_extra_body(monkeypatch) -> None:
    client = build_extraction_llm(configured_settings(monkeypatch)).primary
    captured: dict = {}

    def create(**kwargs):
        captured.update(kwargs)
        message = SimpleNamespace(content='{"attributes": []}')
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])

    monkeypatch.setattr(client.client.chat.completions, "create", create)
    result = await client.complete_json("system", "user", {"type": "object"})

    assert result == {"attributes": []}
    assert captured["stream"] is False
    assert captured["extra_body"] == {
        "chat_template_kwargs": {"enable_thinking": False}
    }


@pytest.mark.asyncio
async def test_primary_retries_twice_with_exponential_backoff(monkeypatch) -> None:
    client = build_extraction_llm(configured_settings(monkeypatch)).primary
    calls = 0
    delays: list[float] = []

    def complete(*args):
        nonlocal calls
        calls += 1
        if calls < 3:
            raise ValueError("temporary invalid response")
        return {"attributes": []}

    async def sleep(delay: float) -> None:
        delays.append(delay)

    monkeypatch.setattr(client, "_complete", complete)
    monkeypatch.setattr("specforge.llm.asyncio.sleep", sleep)

    assert await client.complete_json("system", "user", {}) == {"attributes": []}
    assert calls == 3
    assert delays == [0.5, 1.0]


@pytest.mark.asyncio
async def test_fallback_runs_only_after_primary_retry_budget(monkeypatch) -> None:
    settings = configured_settings(monkeypatch)
    primary = build_extraction_llm(settings).primary
    attempts = 0

    def fail(*args):
        nonlocal attempts
        attempts += 1
        raise ValueError("provider unavailable")

    class Fallback:
        calls = 0

        async def complete_json(self, *args):
            self.calls += 1
            return {"attributes": []}

    async def no_wait(delay: float) -> None:
        return None

    fallback = Fallback()
    monkeypatch.setattr(primary, "_complete", fail)
    monkeypatch.setattr("specforge.llm.asyncio.sleep", no_wait)

    result = await FallbackJSONLLM(primary, fallback).complete_json("system", "user", {})

    assert result == {"attributes": []}
    assert attempts == 3
    assert fallback.calls == 1
