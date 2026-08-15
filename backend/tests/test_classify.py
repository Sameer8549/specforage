from pathlib import Path

import numpy as np
import pytest

from specforge.config import Settings
from specforge.contracts import CleanStage, InputStage, ItemRecord
from specforge.data import load_catalog
from specforge.expected_attributes import (
    GENERIC_EXPECTED_ATTRIBUTES,
    ExpectedAttributeCatalog,
)
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
    by_code = {record.commodity_code: record for record in records}
    assert by_code["27112748"].commodity_name == "Miter saw"
    assert by_code["31191506"].commodity_name == "Abrasive discs"
    assert by_code["30171501"].class_name == "Doors"
    assert by_code["26121545"].commodity_name == "Portable electrical cord"
    assert by_code["40101609"].commodity_name == "Ceiling fan"


def test_global_commodity_match_survives_a_weak_semantic_class_score() -> None:
    records = [
        UNSPSCRecord(
            "27000000",
            "Tools",
            f"2711{index:04d}",
            f"Family {index}",
            f"2712{index:04d}",
            f"Class {index}",
            f"2799{index:04d}",
            f"Unrelated commodity {index}",
        )
        for index in range(129)
    ]
    records.append(
        UNSPSCRecord(
            "27000000",
            "Tools and General Machinery",
            "27110000",
            "Hand tools",
            "27112700",
            "Power tools",
            "27112748",
            "Miter saw",
        )
    )
    matrix = np.asarray([[1.0, 0.0]] * 129 + [[0.0, 1.0]], dtype=np.float16)
    index = UNSPSCIndex(records, matrix, FakeEmbedder([1.0, 0.0]))

    result = index.search("Dewalt 20V miter saw", limit=10)

    assert any(record.commodity_code == "27112748" for record, _ in result)


def test_expected_attributes_are_derived_from_ground_truth() -> None:
    catalog = load_catalog(Settings())
    attributes = ExpectedAttributeCatalog.from_ground_truth(catalog.ground_truth)

    result = attributes.for_classification(dishwasher().classpath)
    assert result[:3] == ["Series", "Model", "Number of Wash Cycles"]
    assert "Sound Level" in result
    assert attributes.for_classification(
        "Office Supplies>Paper Products>Envelopes"
    ) == list(GENERIC_EXPECTED_ATTRIBUTES)


def test_category_specific_attributes_take_priority_over_generic_fallback() -> None:
    attributes = ExpectedAttributeCatalog.from_ground_truth(
        load_catalog(Settings()).ground_truth
    )

    assert attributes.for_classification(dishwasher().classpath)[0] == "Series"
    assert "Number of Wash Cycles" in attributes.for_classification(dishwasher().classpath)
    assert "Dimensions" not in attributes.for_classification(dishwasher().classpath)


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


def test_classification_query_expands_grounded_catalog_shorthand() -> None:
    assert "patio door" in classification_query("1517602 Patio Dr LowE", "1517602")
    assert "portable electrical cord" in classification_query(
        "23346 Wire 16/3 SJEWA", "23346"
    )
    assert "abrasive cutting grinding disc" in classification_query(
        "X Cut n Grind Disc", "X"
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
async def test_low_score_top_candidate_invokes_llm_sanity_check_without_close_tie() -> None:
    scored = [(dishwasher(), 0.70), (oven(), 0.50)]

    class StubIndex:
        def search(self, query: str, limit: int):
            return scored

    settings = Settings(
        classification_tie_margin=0.03,
        classification_sanity_threshold=0.75,
    )
    attributes = ExpectedAttributeCatalog.from_ground_truth(load_catalog(settings).ground_truth)
    tie_breaker = FakeTieBreaker(dishwasher().commodity_code)
    item = ItemRecord(input=InputStage(mfg_part_num="X", part_desc="Dishwasher"))

    result = await run_classify_stage(
        item, StubIndex(), attributes, settings, tie_breaker
    )

    assert tie_breaker.calls == 1
    assert result.classify is not None
    assert result.classify.tie_break_used is True
    assert result.classify.unspsc_code == dishwasher().commodity_code


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


@pytest.mark.asyncio
async def test_llm_tiebreaker_reports_disallowed_decision_without_calling_it_validation() -> None:
    class FakeLLM:
        async def complete_json(self, system_prompt: str, user_prompt: str, schema: dict) -> dict:
            return {"decision": "99999999", "reasoning": "Wrong candidate."}

    decision = await LLMClassificationTieBreaker(FakeLLM()).choose(
        "Dishwasher", [dishwasher(), oven()]
    )

    assert decision.failure_kind == "disallowed_decision"
    assert "99999999" in (decision.reasoning or "")


@pytest.mark.asyncio
async def test_llm_tiebreaker_distinguishes_schema_validation_failure() -> None:
    class FakeLLM:
        async def complete_json(self, system_prompt: str, user_prompt: str, schema: dict) -> dict:
            return {"decision": dishwasher().commodity_code}

    decision = await LLMClassificationTieBreaker(FakeLLM()).choose(
        "Dishwasher", [dishwasher(), oven()]
    )

    assert decision.failure_kind == "validation_error"
    assert "reasoning" in (decision.reasoning or "")
