"""UNSPSC classification with an explicit LLM tie-break decision."""

import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Protocol, Sequence

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from specforge.config import Settings
from specforge.contracts import Candidate, ClassificationStage, ItemRecord, ReviewFlag
from specforge.expected_attributes import ExpectedAttributeCatalog
from specforge.llm import JSONLLM, LLMError
from specforge.unspsc import UNSPSCIndex, UNSPSCRecord


GENUINELY_AMBIGUOUS = "genuinely_ambiguous"
CLASSIFICATION_CANDIDATE_LIMIT = 10
TIE_BREAK_MIN_CANDIDATES = 5
TIE_BREAK_EXTRA_SCORE_BAND = 0.05


@dataclass(frozen=True, slots=True)
class TieBreakDecision:
    commodity_code: str | None
    genuinely_ambiguous: bool = False
    reasoning: str | None = None


class ClassificationTieBreaker(Protocol):
    async def choose(
        self,
        query: str,
        candidates: Sequence[UNSPSCRecord],
        manufacturer: str | None = None,
        brand: str | None = None,
        manufacturer_source: str | None = None,
    ) -> TieBreakDecision: ...


class TieBreakPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: str = Field(min_length=1)
    reasoning: str = Field(min_length=1)


class LLMClassificationTieBreaker:
    def __init__(self, llm: JSONLLM) -> None:
        self.llm = llm

    async def choose(
        self,
        query: str,
        candidates: Sequence[UNSPSCRecord],
        manufacturer: str | None = None,
        brand: str | None = None,
        manufacturer_source: str | None = None,
    ) -> TieBreakDecision:
        allowed = [candidate.commodity_code for candidate in candidates]
        schema = TieBreakPayload.model_json_schema()
        schema["properties"]["decision"]["enum"] = [*allowed, GENUINELY_AMBIGUOUS]
        prompt = json.dumps(
            {
                "item_description": query,
                "resolved_context": {
                    "manufacturer": manufacturer,
                    "brand": brand,
                    "manufacturer_source": manufacturer_source,
                },
                "candidates": [
                    {
                        "commodity_code": candidate.commodity_code,
                        "segment_code": candidate.segment_code,
                        "segment_name": candidate.segment_name,
                        "family_code": candidate.family_code,
                        "family_name": candidate.family_name,
                        "class_code": candidate.class_code,
                        "class_name": candidate.class_name,
                        "commodity_name": candidate.commodity_name,
                        "classpath": candidate.classpath,
                    }
                    for candidate in candidates
                ],
                "instruction": (
                    "Select exactly one supplied commodity_code only when the description "
                    "supports it. Otherwise return genuinely_ambiguous. Residential or consumer "
                    "appliance listings from a distributor catalog should default toward the "
                    "domestic/consumer-grade commodity unless the item description contains "
                    "explicit commercial or industrial evidence such as 'commercial', "
                    "'restaurant grade', or 'NSF certified'. 'Display Only' is a retail "
                    "merchandising note and is not evidence of commercial-grade equipment."
                ),
            },
            ensure_ascii=False,
        )
        try:
            raw = await self.llm.complete_json(
                "You resolve close UNSPSC classification ties without inventing evidence.",
                prompt,
                schema,
            )
            payload = TieBreakPayload.model_validate(raw)
        except (LLMError, ValidationError):
            return TieBreakDecision(commodity_code=None)
        if payload.decision == GENUINELY_AMBIGUOUS:
            return TieBreakDecision(
                commodity_code=None,
                genuinely_ambiguous=True,
                reasoning=payload.reasoning,
            )
        if payload.decision not in allowed:
            return TieBreakDecision(commodity_code=None)
        return TieBreakDecision(
            commodity_code=payload.decision,
            reasoning=payload.reasoning,
        )


def classification_query(part_desc: str | None, mfg_part_num: str | None) -> str:
    query = part_desc or ""
    if mfg_part_num:
        query = re.sub(re.escape(mfg_part_num), " ", query, flags=re.IGNORECASE)
    query = re.sub(r"\bdisplay\s+only\b", " ", query, flags=re.IGNORECASE)
    query = re.sub(r"\s+", " ", query).strip(" -_,")
    return query


async def run_classify_stage(
    record: ItemRecord,
    index: UNSPSCIndex,
    expected_attributes: ExpectedAttributeCatalog,
    settings: Settings,
    tie_breaker: ClassificationTieBreaker | None = None,
) -> ItemRecord:
    source = record.clean or record.input
    # Product description is the classification evidence. MPNs and entity names commonly
    # behave as embedding noise and belong to their own resolution stages.
    query = classification_query(source.part_desc, source.mfg_part_num)
    ranked = index.search(query, limit=CLASSIFICATION_CANDIDATE_LIMIT) if query else []
    candidates = [
        Candidate(value=f"{candidate.commodity_code} | {candidate.classpath}", confidence=max(0, min(1, score)))
        for candidate, score in ranked
    ]
    flags: list[ReviewFlag] = []
    selected: tuple[UNSPSCRecord, float] | None = ranked[0] if ranked else None
    tie_break_used = False
    tie_break_outcome: str | None = None
    tie_break_reasoning: str | None = None

    if selected is not None and len(ranked) > 1:
        close = selected[1] - ranked[1][1] <= settings.classification_tie_margin
        if close:
            if tie_breaker is None:
                selected = None
                flags.append(
                    ReviewFlag(
                        code="classification_tiebreak_unavailable",
                        message="Top UNSPSC candidates are too close and no LLM tie-breaker is configured.",
                        field="unspsc_code",
                        stage="classify",
                    )
                )
            else:
                tie_break_used = True
                expanded_band = settings.classification_tie_margin + TIE_BREAK_EXTRA_SCORE_BAND
                tie_candidates = [
                    candidate
                    for position, candidate in enumerate(ranked)
                    if position < TIE_BREAK_MIN_CANDIDATES
                    or ranked[0][1] - candidate[1] <= expanded_band
                ]
                decision = await tie_breaker.choose(
                    source.part_desc or query,
                    [candidate for candidate, _ in tie_candidates],
                    (
                        record.brand_resolution.manufacturer.canonical_name
                        if record.brand_resolution
                        else None
                    ),
                    (
                        record.brand_resolution.brand.canonical_name
                        if record.brand_resolution
                        else None
                    ),
                    (
                        record.brand_resolution.manufacturer_source
                        if record.brand_resolution
                        else None
                    ),
                )
                tie_break_reasoning = decision.reasoning
                chosen_code = decision.commodity_code
                selected = next(
                    (
                        (candidate, score)
                        for candidate, score in tie_candidates
                        if candidate.commodity_code == chosen_code
                    ),
                    None,
                )
                if selected is not None:
                    tie_break_outcome = f"selected:{chosen_code}"
                elif decision.genuinely_ambiguous:
                    tie_break_outcome = GENUINELY_AMBIGUOUS
                    flags.append(
                        ReviewFlag(
                            code="classification_genuinely_ambiguous",
                            message="The tie-breaker found insufficient evidence to choose either candidate.",
                            field="unspsc_code",
                            stage="classify",
                        )
                    )
                else:
                    tie_break_outcome = "failed"
                    flags.append(
                        ReviewFlag(
                            code="classification_tiebreak_failed",
                            message="The LLM tie-breaker failed to return an allowed decision.",
                            field="unspsc_code",
                            stage="classify",
                        )
                    )

    if selected is not None and selected[1] < settings.classification_threshold:
        selected = None
    if selected is None:
        flags.append(
            ReviewFlag(
                code="classification_unresolved",
                message="UNSPSC classification did not meet the confidence requirements.",
                field="unspsc_code",
                stage="classify",
            )
        )

    selected_record, selected_score = selected if selected is not None else (None, 0.0)
    classpath = selected_record.classpath if selected_record is not None else None
    stage = ClassificationStage(
        unspsc_code=selected_record.commodity_code if selected_record is not None else None,
        classpath=classpath,
        confidence=max(0, min(1, selected_score)),
        expected_attributes=expected_attributes.for_classification(classpath) if classpath else [],
        candidates=candidates,
        tie_break_used=tie_break_used,
        tie_break_outcome=tie_break_outcome,
        tie_break_reasoning=tie_break_reasoning,
        flags=flags,
    )
    return record.model_copy(
        update={"classify": stage, "updated_at": datetime.now(timezone.utc)}, deep=True
    )
