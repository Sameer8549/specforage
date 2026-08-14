"""UNSPSC classification with an injectable LLM tie-break boundary."""

import re
from datetime import datetime, timezone
from typing import Protocol, Sequence

from specforge.config import Settings
from specforge.contracts import Candidate, ClassificationStage, ItemRecord, ReviewFlag
from specforge.expected_attributes import ExpectedAttributeCatalog
from specforge.unspsc import UNSPSCIndex, UNSPSCRecord


class ClassificationTieBreaker(Protocol):
    def choose(self, query: str, candidates: Sequence[UNSPSCRecord]) -> str | None: ...


def classification_query(part_desc: str | None, mfg_part_num: str | None) -> str:
    query = part_desc or ""
    if mfg_part_num:
        query = re.sub(re.escape(mfg_part_num), " ", query, flags=re.IGNORECASE)
    query = re.sub(r"\bdisplay\s+only\b", " ", query, flags=re.IGNORECASE)
    query = re.sub(r"\s+", " ", query).strip(" -_,")
    return query


def run_classify_stage(
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
    ranked = index.search(query, limit=3) if query else []
    candidates = [
        Candidate(value=f"{candidate.commodity_code} | {candidate.classpath}", confidence=max(0, min(1, score)))
        for candidate, score in ranked
    ]
    flags: list[ReviewFlag] = []
    selected: tuple[UNSPSCRecord, float] | None = ranked[0] if ranked else None
    tie_break_used = False

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
                chosen_code = tie_breaker.choose(query, [candidate for candidate, _ in ranked[:2]])
                selected = next(
                    ((candidate, score) for candidate, score in ranked[:2] if candidate.commodity_code == chosen_code),
                    None,
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
        flags=flags,
    )
    return record.model_copy(
        update={"classify": stage, "updated_at": datetime.now(timezone.utc)}, deep=True
    )
