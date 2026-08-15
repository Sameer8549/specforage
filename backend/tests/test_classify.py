from pathlib import Path

import numpy as np
import pytest

from specforge.config import Settings
from specforge.contracts import CleanStage, InputStage, ItemRecord
from specforge.data import load_catalog
from specforge.expected_attributes import ExpectedAttributeCatalog
from specforge.stages.classify import (
    LLMClassificationTieBreaker,
    TieBreakDecision,
    classification_query,
    run_classify_stage,
)
from specforge.unspsc import UNSPSCIndex, UNSPSCRecord, iter_unspsc


class FakeEmbedder:
    def __init__(self, vector: list[float]) -> None:
        self.vector = np.asarray([vector], dtype=np.float32)

    def embed(self, texts: list[str]) -> np.ndarray:
        return np.repeat(self.vector, len(texts), axis=0)


class FakeTieBreaker:
    def __init__(self, code: str) -> None:
        self.code = code
        self.calls = 0
        self.candidates: list[UNSPSCRecord] = []

    async def choose(
        self,
        query: str,
        candidates: list[UNSPSCRecord],
        manufacturer: str | None = None,
        brand: str | None = None,
        manufacturer_source: str | None = None,
    ) -> TieBreakDecision:
        self.calls += 1
        self.candidates = list(candidates)
        return TieBreakDecision(commodity_code=self.code)


def dishwasher() -> UNSPSCRecord:
    return UNSPSCRecord(
        "52000000",
        "Domestic Appliances and Supplies and Consumer Electronic Products",
        "52140000",
        "Domestic appliances",
        "52141500",
        "Domestic kitchen appliances",
        "52141505",
        "Dishwashing machines",
    )


def oven() -> UNSPSCRecord:
    return UNSPSCRecord(
        "52000000",
        "Domestic Appliances and Supplies and Consumer Electronic Products",
        "52140000",
        "Domestic appliances",
        "52141600",
        "Domestic laundry appliances",
        "52141601",
        "Domestic washing machines",
    )


def test_bundled_unspsc_taxonomy_validates() -> None:
    settings = Settings()
    records = list(iter_unspsc(settings.resolve_data_path(settings.unspsc_dataset)))

    assert len(records) == 71502
    assert all(len(record.commodity_code) == 8 for record in records)


def test_expected_attributes_are_derived_from_ground_truth() -> None:
    catalog = load_catalog(Settings())
    attributes = ExpectedAttributeCatalog.from_ground_truth(catalog.ground_truth)

    result = attributes.for_classification(dishwasher().classpath)
    assert result[:3] == ["Series", "Model", "Number of Wash Cycles"]
    assert "Sound Level" in result
    assert attributes.for_classification("Office Supplies>Paper Products>Envelopes") == []


@pytest.mark.asyncio
async def test_classifier_returns_unspsc_and_expected_attributes() -> None:
    records = [dishwasher(), oven()]
    matrix = np.asarray([[1.0, 0.0], [0.0, 1.0]], dtype=np.float16)
    index = UNSPSCIndex(records, matrix, FakeEmbedder([1.0, 0.0]))
    settings = Settings(classification_tie_margin=0.01)
    attributes = ExpectedAttributeCatalog.from_ground_truth(load_catalog(settings).ground_truth)
    item = ItemRecord(
        input=InputStage(mfg_part_num="PDSH", part_desc="Dishwasher"),
        clean=CleanStage(mfg_part_num="PDSH", part_desc="Built-in dishwasher"),
    )

    result = await run_classify_stage(item, index, attributes, settings)

    assert result.classify is not None
    assert result.classify.unspsc_code == "52141505"
    assert result.classify.classpath == dishwasher().classpath
    assert "Voltage Rating" in result.classify.expected_attributes
    assert len(result.classify.candidates) == 2


def test_classification_query_removes_identifier_and_display_noise() -> None:
    assert (
        classification_query("WDTS7024RZ Dishwasher SS - Display Only", "WDTS7024RZ")
        == "Dishwasher SS"
    )


@pytest.mark.asyncio
async def test_close_candidates_without_llm_are_unresolved() -> None:
    records = [dishwasher(), oven()]
    matrix = np.asarray([[1.0, 0.0], [0.995, 0.005]], dtype=np.float16)
    index = UNSPSCIndex(records, matrix, FakeEmbedder([1.0, 0.0]))
    settings = Settings(classification_tie_margin=0.01)
    attributes = ExpectedAttributeCatalog.from_ground_truth(load_catalog(settings).ground_truth)
    item = ItemRecord(input=InputStage(mfg_part_num="X", part_desc="Kitchen appliance"))

    result = await run_classify_stage(item, index, attributes, settings)

    assert result.classify is not None
    assert result.classify.unspsc_code is None
    assert {flag.code for flag in result.classify.flags} == {
        "classification_tiebreak_unavailable",
        "classification_unresolved",
    }


@pytest.mark.asyncio
async def test_close_candidates_invoke_only_the_injected_llm_tiebreaker() -> None:
    records = [dishwasher(), oven()]
    matrix = np.asarray([[1.0, 0.0], [0.995, 0.005]], dtype=np.float16)
    index = UNSPSCIndex(records, matrix, FakeEmbedder([1.0, 0.0]))
    settings = Settings(classification_tie_margin=0.03)
    attributes = ExpectedAttributeCatalog.from_ground_truth(load_catalog(settings).ground_truth)
    tie_breaker = FakeTieBreaker(dishwasher().commodity_code)
    item = ItemRecord(input=InputStage(mfg_part_num="X", part_desc="Kitchen appliance"))

    result = await run_classify_stage(item, index, attributes, settings, tie_breaker)

    assert tie_breaker.calls == 1
    assert result.classify is not None
    assert result.classify.tie_break_used is True
    assert result.classify.unspsc_code == dishwasher().commodity_code
    assert result.classify.tie_break_outcome == f"selected:{dishwasher().commodity_code}"


@pytest.mark.asyncio
async def test_close_tie_retrieves_ten_and_supplies_expanded_llm_shortlist() -> None:
    records = [
        UNSPSCRecord(
            "52000000",
            "Consumer Products",
            "52140000",
            "Appliances",
            "52141500",
            "Kitchen appliances",
            f"521415{index:02d}",
            "Domestic dish washers" if index == 5 else f"Dishwasher candidate {index}",
        )
        for index in range(1, 11)
    ]
    scored = [
        (record, 0.70 - (position * 0.012)) for position, record in enumerate(records)
    ]

    class StubIndex:
        requested_limit = 0

        def search(self, query: str, limit: int):
            self.requested_limit = limit
            return scored[:limit]

    index = StubIndex()
    settings = Settings(classification_tie_margin=0.03)
    attributes = ExpectedAttributeCatalog.from_ground_truth(load_catalog(settings).ground_truth)
    tie_breaker = FakeTieBreaker(records[4].commodity_code)
    item = ItemRecord(input=InputStage(mfg_part_num="X", part_desc="Dishwasher SS"))

    result = await run_classify_stage(item, index, attributes, settings, tie_breaker)

    assert index.requested_limit == 10
    assert result.classify is not None
    assert len(result.classify.candidates) == 10
    assert records[4].commodity_code in {
        candidate.commodity_code for candidate in tie_breaker.candidates
    }
    assert result.classify.unspsc_code == records[4].commodity_code


@pytest.mark.asyncio
async def test_llm_tiebreaker_can_explicitly_return_genuinely_ambiguous() -> None:
    class FakeLLM:
        async def complete_json(self, system_prompt: str, user_prompt: str, schema: dict) -> dict:
            assert "item_description" in user_prompt
            assert "resolved_context" in user_prompt
            assert "Rheem Manufacturing" in user_prompt
            assert "mpn_web_lookup" in user_prompt
            assert "segment_name" in user_prompt
            assert "commodity_name" in user_prompt
            assert "Display Only" in user_prompt
            assert "not evidence of commercial-grade equipment" in user_prompt
            assert schema["properties"]["decision"]["enum"][-1] == "genuinely_ambiguous"
            return {"decision": "genuinely_ambiguous", "reasoning": "Insufficient evidence."}

    decision = await LLMClassificationTieBreaker(FakeLLM()).choose(
        "Generic kitchen appliance",
        [dishwasher(), oven()],
        manufacturer="Rheem Manufacturing",
        manufacturer_source="mpn_web_lookup",
    )

    assert decision == TieBreakDecision(
        commodity_code=None,
        genuinely_ambiguous=True,
        reasoning="Insufficient evidence.",
    )
