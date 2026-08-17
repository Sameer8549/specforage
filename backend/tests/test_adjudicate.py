import pytest

from specforge.contracts import (
    AttributeValue,
    EntailmentLabel,
    ExtractStage,
    InputStage,
    ItemRecord,
    NormalizeStage,
    SourceType,
    Verification,
    VerifyStage,
)
from specforge.config import Settings
from specforge.llm import LLMError, OpenAICompatibleJSONClient, build_adjudication_llm
from specforge.stages.adjudicate import run_adjudicate_stage


class FakeLLM:
    def __init__(self, result: dict | None = None, error: bool = False) -> None:
        self.result = result or {"decisions": []}
        self.error = error
        self.calls = 0

    async def complete_json(self, system_prompt: str, user_prompt: str, schema: dict) -> dict:
        self.calls += 1
        if self.error:
            raise LLMError("failed")
        return self.result


def decision(
    selected: str | None,
    human: bool = False,
    rejected: list[str] | None = None,
) -> dict:
    if rejected is None:
        rejected = ["normalized:0"] if selected == "extracted:0" else ["extracted:0"]
    return {
        "decisions": [
            {
                "label": "Material",
                "selected_candidate_id": selected,
                "needs_human_review": human,
                "reasoning": "Selected the supported controlled value.",
                "rejected_candidate_ids": rejected,
            }
        ]
    }


def record(
    *,
    extracted: list[AttributeValue],
    normalized: list[AttributeValue],
    entailment: EntailmentLabel = EntailmentLabel.SUPPORTED,
) -> ItemRecord:
    return ItemRecord(
        input=InputStage(mfg_part_num="X", part_desc="Product"),
        extract=ExtractStage(attributes=extracted),
        normalize=NormalizeStage(attributes=normalized),
        verify=VerifyStage(
            results=[
                Verification(
                    label="Material",
                    value=extracted[0].value,
                    entailment=entailment,
                    confidence=0.9,
                    reasoning="Verification result.",
                    vocabulary_compliant=True,
                    uom_compliant=True,
                )
            ]
        ),
    )


@pytest.mark.asyncio
async def test_no_conflict_skips_llm_and_passes_normalized_value() -> None:
    extracted = AttributeValue(label="Material", value="Stainless Steel")
    normalized = AttributeValue(label="Material", value="Stainless Steel")
    llm = FakeLLM()

    result = await run_adjudicate_stage(
        record(extracted=[extracted], normalized=[normalized]), llm
    )

    assert llm.calls == 0
    assert result.adjudicate is not None
    assert result.adjudicate.attributes[0].value == "Stainless Steel"
    assert not result.adjudicate.needs_human_review
    assert result.adjudicate.llm_invoked is False


@pytest.mark.asyncio
async def test_real_normalization_difference_invokes_llm() -> None:
    extracted = AttributeValue(label="Material", value="SST", source_type=SourceType.DESCRIPTION)
    normalized = AttributeValue(
        label="Material", value="Stainless Steel", source_type=SourceType.DESCRIPTION
    )
    llm = FakeLLM(decision("normalized:0"))

    result = await run_adjudicate_stage(
        record(extracted=[extracted], normalized=[normalized]), llm
    )

    assert llm.calls == 1
    assert result.adjudicate is not None
    assert result.adjudicate.attributes[0].value == "Stainless Steel"
    assert [item.value for item in result.adjudicate.rejected_values] == ["SST"]


@pytest.mark.asyncio
async def test_not_supported_value_is_rejected_despite_model_selection() -> None:
    extracted = AttributeValue(label="Material", value="SST")
    normalized = AttributeValue(label="Material", value="Stainless Steel")
    result = await run_adjudicate_stage(
        record(
            extracted=[extracted],
            normalized=[normalized],
            entailment=EntailmentLabel.NOT_SUPPORTED,
        ),
        FakeLLM(decision("normalized:0")),
    )

    assert result.adjudicate is not None
    assert result.adjudicate.attributes == []
    assert len(result.adjudicate.rejected_values) == 2


@pytest.mark.asyncio
async def test_ambiguous_or_failed_adjudication_routes_to_human() -> None:
    extracted = AttributeValue(label="Material", value="SST")
    normalized = AttributeValue(label="Material", value="Stainless Steel")
    result = await run_adjudicate_stage(
        record(
            extracted=[extracted],
            normalized=[normalized],
            entailment=EntailmentLabel.AMBIGUOUS,
        ),
        FakeLLM(error=True),
    )

    assert result.adjudicate is not None
    assert result.adjudicate.needs_human_review is True
    assert result.adjudicate.attributes == []


@pytest.mark.asyncio
async def test_manufacturer_site_priority_overrides_description_selection() -> None:
    extracted = [
        AttributeValue(
            label="Material", value="Steel", source_type=SourceType.MANUFACTURER_SITE
        ),
        AttributeValue(label="Material", value="Plastic", source_type=SourceType.DESCRIPTION),
    ]
    normalized = [
        AttributeValue(
            label="Material", value="Steel", source_type=SourceType.MANUFACTURER_SITE
        ),
        AttributeValue(label="Material", value="Plastic", source_type=SourceType.DESCRIPTION),
    ]

    result = await run_adjudicate_stage(
        record(extracted=extracted, normalized=normalized),
        FakeLLM(decision("normalized:1", rejected=["extracted:0", "normalized:0", "extracted:1"])),
    )

    assert result.adjudicate is not None
    assert result.adjudicate.attributes[0].value == "Steel"
    assert "mandatory manufacturer-source priority" in result.adjudicate.reasoning[0]


@pytest.mark.asyncio
async def test_conflicting_top_priority_sources_require_human_review() -> None:
    extracted = [
        AttributeValue(
            label="Material", value="Steel", source_type=SourceType.MANUFACTURER_SITE
        ),
        AttributeValue(
            label="Material", value="Aluminum", source_type=SourceType.MANUFACTURER_SITE
        ),
    ]
    normalized = extracted.copy()

    result = await run_adjudicate_stage(
        record(extracted=extracted, normalized=normalized),
        FakeLLM(decision("normalized:0", rejected=["extracted:0", "extracted:1", "normalized:1"])),
    )

    assert result.adjudicate is not None
    assert result.adjudicate.needs_human_review is True
    assert result.adjudicate.attributes == []


@pytest.mark.asyncio
async def test_invalid_candidate_set_cannot_be_silently_accepted() -> None:
    extracted = AttributeValue(label="Material", value="SST")
    normalized = AttributeValue(label="Material", value="Stainless Steel")
    result = await run_adjudicate_stage(
        record(extracted=[extracted], normalized=[normalized]),
        FakeLLM(decision("normalized:0", rejected=[])),
    )

    assert result.adjudicate is not None
    assert result.adjudicate.attributes == []
    assert result.adjudicate.needs_human_review is True
    assert "invalid or incomplete candidate set" in result.adjudicate.reasoning[0]


@pytest.mark.asyncio
async def test_unexpected_adjudication_label_invalidates_the_response() -> None:
    extracted = AttributeValue(label="Material", value="SST")
    normalized = AttributeValue(label="Material", value="Stainless Steel")
    payload = decision("normalized:0")
    payload["decisions"].append({
        "label": "Color",
        "selected_candidate_id": None,
        "needs_human_review": False,
        "reasoning": "Not requested.",
        "rejected_candidate_ids": [],
    })

    result = await run_adjudicate_stage(
        record(extracted=[extracted], normalized=[normalized]), FakeLLM(payload)
    )

    assert result.adjudicate is not None
    assert result.adjudicate.needs_human_review is True
    assert result.adjudicate.attributes == []


def test_adjudication_factory_enables_budgeted_nemotron_thinking(monkeypatch) -> None:
    monkeypatch.setenv("NVIDIA_API_KEY", __name__)
    client = build_adjudication_llm(Settings(_env_file=None))

    assert isinstance(client.primary, OpenAICompatibleJSONClient)
    assert client.primary.model == "nvidia/nemotron-3.5-lightning-30b-a3b"
    assert client.primary.enable_thinking is True
    assert client.primary.extra_body == {
        "chat_template_kwargs": {"enable_thinking": True},
        "reasoning_budget": 16384,
    }
