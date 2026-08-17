import json

import pytest

from specforge.config import Settings
from specforge.contracts import (
    BrandResolutionStage,
    ClassificationStage,
    CleanStage,
    EntityResolution,
    InputStage,
    ItemRecord,
)
from specforge.llm import FallbackJSONLLM, LLMError
from specforge.retrieval import RetrievedExcerpt, is_official_url
from specforge.stages.extract import run_extract_stage


class FakeLLM:
    def __init__(self, result: dict | None = None, error: bool = False) -> None:
        self.result = result or {"attributes": []}
        self.error = error
        self.calls = 0
        self.user_prompt = ""

    async def complete_json(self, system_prompt: str, user_prompt: str, schema: dict) -> dict:
        self.calls += 1
        self.user_prompt = user_prompt
        if self.error:
            raise LLMError("failed")
        return self.result


class FakeRetriever:
    async def retrieve(self, domain: str, query: str) -> list[RetrievedExcerpt]:
        assert query.startswith(f"site:{domain}")
        return [
            RetrievedExcerpt("https://support.acme.com/spec", "Voltage is 120 V"),
            RetrievedExcerpt("https://marketplace.example/item", "Voltage is 240 V"),
        ]


class EmptyRetriever:
    async def retrieve(self, domain: str, query: str) -> list[RetrievedExcerpt]:
        return []


def classified_record(description: str = "Dishwasher, 120 V, 15 A") -> ItemRecord:
    return ItemRecord(
        input=InputStage(mfg_part_num="ABC", part_desc=description),
        clean=CleanStage(mfg_part_num="ABC", part_desc=description),
        classify=ClassificationStage(
            unspsc_code="52141505",
            classpath="Domestic appliances>Dishwashers",
            confidence=0.9,
            expected_attributes=["Voltage Rating", "Amperage Rating"],
        ),
    )


@pytest.mark.asyncio
async def test_extracts_only_expected_attributes_with_verified_excerpts() -> None:
    llm = FakeLLM(
        {
            "attributes": [
                {
                    "label": "Voltage Rating",
                    "value": "120 V",
                    "source_excerpt": "120 V",
                    "source_type": "description",
                },
                {
                    "label": "Color",
                    "value": "Silver",
                    "source_excerpt": "Dishwasher",
                    "source_type": "description",
                },
            ]
        }
    )

    result = await run_extract_stage(classified_record(), llm, Settings())

    assert result.extract is not None
    assert [attribute.label for attribute in result.extract.attributes] == ["Voltage Rating"]
    assert {flag.code for flag in result.extract.flags} == {"unexpected_attribute_rejected"}


@pytest.mark.asyncio
async def test_rejects_value_not_present_in_its_real_excerpt() -> None:
    llm = FakeLLM({"attributes": [{
        "label": "Voltage Rating",
        "value": "240 V",
        "source_excerpt": "Dishwasher, 120 V",
        "source_type": "description",
    }]})

    result = await run_extract_stage(classified_record(), llm, Settings())

    assert result.extract is not None
    assert result.extract.attributes == []
    assert result.extract.flags[0].code == "ungrounded_value_rejected"


@pytest.mark.asyncio
async def test_prompt_exposes_lovs_as_constraints_not_evidence() -> None:
    record = classified_record().model_copy(deep=True)
    record.classify.applicable_lovs = {"Voltage Rating": ["120", "240"]}
    llm = FakeLLM()

    await run_extract_stage(record, llm, Settings())

    prompt = json.loads(llm.user_prompt)
    assert prompt["APPLICABLE_LOVS"] == {"Voltage Rating": ["120", "240"]}
    assert prompt["PRODUCT_IDENTITY"] == {"manufacturer_part_number": "ABC"}


@pytest.mark.asyncio
async def test_rejects_mpn_copied_into_series_without_explicit_series_label() -> None:
    record = classified_record("ABC Dishwasher SS").model_copy(deep=True)
    record.classify.expected_attributes = ["Series"]
    llm = FakeLLM({"attributes": [{
        "label": "Series",
        "value": "ABC",
        "source_excerpt": "ABC Dishwasher SS",
        "source_type": "description",
    }]})

    result = await run_extract_stage(record, llm, Settings())

    assert result.extract is not None
    assert result.extract.attributes == []
    assert result.extract.flags[0].code == "product_identity_leakage_rejected"


@pytest.mark.asyncio
async def test_allows_mpn_as_model_when_source_explicitly_labels_it() -> None:
    record = classified_record("Model ABC Dishwasher SS").model_copy(deep=True)
    record.classify.expected_attributes = ["Model"]
    llm = FakeLLM({"attributes": [{
        "label": "Model",
        "value": "ABC",
        "source_excerpt": "Model ABC Dishwasher SS",
        "source_type": "description",
    }]})

    result = await run_extract_stage(record, llm, Settings())

    assert result.extract is not None
    assert [attribute.value for attribute in result.extract.attributes] == ["ABC"]
    assert result.extract.flags == []


@pytest.mark.asyncio
async def test_skips_llm_when_no_expected_attributes() -> None:
    llm = FakeLLM()
    record = ItemRecord(input=InputStage(mfg_part_num="X", part_desc="Unknown item"))

    result = await run_extract_stage(record, llm, Settings())

    assert llm.calls == 0
    assert result.extract is not None
    assert result.extract.flags[0].code == "no_expected_attributes"


@pytest.mark.asyncio
async def test_retrieval_is_restricted_to_confident_manufacturer_domain() -> None:
    llm = FakeLLM(
        {
            "attributes": [
                {
                    "label": "Voltage Rating",
                    "value": "120 V",
                    "source_excerpt": "Voltage is 120 V",
                    "source_type": "manufacturer_site",
                }
            ]
        }
    )
    record = classified_record("Dishwasher")
    record = record.model_copy(
        update={
            "brand_resolution": BrandResolutionStage(
                manufacturer=EntityResolution(canonical_name="Acme", confidence=0.99),
                manufacturer_domain="acme.com",
            )
        }
    )

    result = await run_extract_stage(record, llm, Settings(), FakeRetriever())

    prompt = json.loads(llm.user_prompt)
    assert result.extract is not None
    assert result.extract.retrieval_attempted is True
    assert result.extract.retrieved_source_count == 1
    assert len(prompt["SOURCE_BLOCKS"]) == 2
    assert prompt["SOURCE_BLOCKS"][1]["url"] == "https://support.acme.com/spec"
    assert {flag.code for flag in result.extract.flags} == {"non_official_sources_rejected"}


@pytest.mark.asyncio
async def test_empty_manufacturer_retrieval_is_explicitly_flagged() -> None:
    record = classified_record("Dishwasher")
    record = record.model_copy(
        update={
            "brand_resolution": BrandResolutionStage(
                manufacturer=EntityResolution(canonical_name="Acme", confidence=0.99),
                manufacturer_domain="acme.com",
            )
        }
    )

    result = await run_extract_stage(record, FakeLLM(), Settings(), EmptyRetriever())

    assert result.extract is not None
    assert result.extract.retrieval_attempted is True
    assert result.extract.retrieved_source_count == 0
    flag = next(flag for flag in result.extract.flags if flag.code == "manufacturer_retrieval_no_results")
    assert "acme.com" in flag.message


@pytest.mark.asyncio
async def test_failed_schema_routes_to_review() -> None:
    llm = FakeLLM({"attributes": [{"label": "Voltage Rating"}]})
    result = await run_extract_stage(classified_record(), llm, Settings())

    assert result.extract is not None
    assert result.extract.extraction_failed is True
    assert result.extract.flags[-1].code == "extraction_failed"
    assert llm.calls == 2


@pytest.mark.asyncio
async def test_invalid_schema_retries_once_with_strict_reminder() -> None:
    class SchemaRetryLLM:
        def __init__(self) -> None:
            self.prompts: list[str] = []

        async def complete_json(self, system_prompt: str, user_prompt: str, schema: dict) -> dict:
            self.prompts.append(system_prompt)
            if len(self.prompts) == 1:
                return {"attributes": [{"label": "Voltage Rating"}]}
            return {"attributes": []}

    llm = SchemaRetryLLM()
    result = await run_extract_stage(classified_record(), llm, Settings())

    assert result.extract is not None
    assert result.extract.extraction_failed is False
    assert len(llm.prompts) == 2
    assert "previous response did not match" in llm.prompts[1]


@pytest.mark.asyncio
async def test_fallback_llm_runs_only_after_primary_failure() -> None:
    primary = FakeLLM(error=True)
    fallback = FakeLLM({"attributes": []})
    client = FallbackJSONLLM(primary, fallback)

    result = await client.complete_json("system", "user", {})

    assert result == {"attributes": []}
    assert primary.calls == 1
    assert fallback.calls == 1


def test_official_domain_guard_rejects_suffix_spoofing() -> None:
    assert is_official_url("https://support.acme.com/spec", "acme.com")
    assert not is_official_url("https://acme.com.evil.example/spec", "acme.com")
