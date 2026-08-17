import pytest

from specforge.contracts import (
    AttributeValue,
    ExtractStage,
    InputStage,
    ItemRecord,
    NormalizeStage,
    SourceType,
)
from specforge.llm import LLMError
from specforge.stages.verify import run_verify_stage


class FakeLLM:
    def __init__(self, result: dict | None = None, error: bool = False) -> None:
        self.result = result or {"results": []}
        self.error = error
        self.calls = 0

    async def complete_json(self, system_prompt: str, user_prompt: str, schema: dict) -> dict:
        self.calls += 1
        if self.error:
            raise LLMError("failed")
        return self.result


def record_with_attributes(normalized_value: str | None = "120") -> ItemRecord:
    extracted = AttributeValue(
        label="Voltage Rating",
        value="120 volts",
        source_excerpt="rated at 120 volts",
        source_type=SourceType.DESCRIPTION,
    )
    normalized = AttributeValue(
        label="Voltage Rating",
        value=normalized_value,
        uom="V" if normalized_value else None,
        source_excerpt=extracted.source_excerpt,
        source_type=extracted.source_type,
    )
    return ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Dishwasher rated at 120 volts"),
        extract=ExtractStage(attributes=[extracted]),
        normalize=NormalizeStage(attributes=[normalized]),
    )


def supported_payload(**overrides: object) -> dict:
    result = {
        "label": "Voltage Rating",
        "entailment": "supported",
        "confidence": 0.98,
        "reasoning": "The source explicitly states the voltage.",
    }
    result.update(overrides)
    return {"results": [result]}


@pytest.mark.asyncio
async def test_supported_value_preserves_entailment_and_compliance() -> None:
    result = await run_verify_stage(record_with_attributes(), FakeLLM(supported_payload()))

    assert result.verify is not None
    verification = result.verify.results[0]
    assert verification.entailment == "supported"
    assert verification.confidence == 0.98
    assert verification.vocabulary_compliant is True
    assert verification.uom_compliant is True


@pytest.mark.asyncio
async def test_model_cannot_override_failed_deterministic_vocabulary_check() -> None:
    result = await run_verify_stage(
        record_with_attributes(normalized_value=None), FakeLLM(supported_payload())
    )

    assert result.verify is not None
    verification = result.verify.results[0]
    assert verification.vocabulary_compliant is False
    assert verification.uom_compliant is True


@pytest.mark.asyncio
async def test_model_compliance_fields_are_rejected_as_out_of_scope() -> None:
    payload = supported_payload()
    payload["results"][0]["vocabulary_compliant"] = True
    payload["results"][0]["uom_compliant"] = True

    result = await run_verify_stage(record_with_attributes(), FakeLLM(payload))

    assert result.verify is not None
    assert result.verify.results[0].entailment == "ambiguous"
    assert result.verify.flags[0].code == "verification_failed"


@pytest.mark.asyncio
async def test_missing_result_becomes_ambiguous() -> None:
    result = await run_verify_stage(record_with_attributes(), FakeLLM({"results": []}))

    assert result.verify is not None
    assert result.verify.results[0].entailment == "ambiguous"
    assert result.verify.results[0].confidence == 0
    assert result.verify.flags[0].code == "verification_incomplete"


@pytest.mark.asyncio
async def test_malformed_or_failed_response_marks_every_value_ambiguous() -> None:
    result = await run_verify_stage(record_with_attributes(), FakeLLM(error=True))

    assert result.verify is not None
    assert result.verify.results[0].entailment == "ambiguous"
    assert result.verify.flags[0].code == "verification_failed"


@pytest.mark.asyncio
async def test_unknown_verification_is_rejected_and_expected_one_is_missing() -> None:
    payload = supported_payload(label="Color")
    result = await run_verify_stage(record_with_attributes(), FakeLLM(payload))

    assert result.verify is not None
    assert result.verify.results[0].entailment == "ambiguous"
    assert {flag.code for flag in result.verify.flags} == {
        "unexpected_verification_rejected",
        "verification_incomplete",
    }


@pytest.mark.asyncio
async def test_no_attributes_skips_llm() -> None:
    llm = FakeLLM()
    record = ItemRecord(input=InputStage(mfg_part_num="X", part_desc="Unknown"))

    result = await run_verify_stage(record, llm)

    assert llm.calls == 0
    assert result.verify is not None
    assert result.verify.flags[0].code == "no_attributes_to_verify"
