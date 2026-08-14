"""Manufacturer and brand resolution using only the self-derived vocabulary."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable

from specforge.config import Settings
from specforge.contracts import (
    BrandResolutionStage,
    Candidate,
    EntityResolution,
    ItemRecord,
    ReviewFlag,
)
from specforge.data import DatasetCatalog, iter_csv_rows
from specforge.stages.clean import clean_optional, run_clean_stage
from specforge.vocabulary import EntityVocabulary, VocabularyEntry


@dataclass(frozen=True, slots=True)
class ResolutionVocabularies:
    manufacturers: EntityVocabulary
    brands: EntityVocabulary


def build_resolution_vocabularies(catalog: DatasetCatalog) -> ResolutionVocabularies:
    manufacturers: list[str] = []
    brands: list[str] = []
    for row in iter_csv_rows(catalog.working):
        manufacturer = clean_optional(row.get("Part_Manuf"))
        if manufacturer is not None:
            manufacturers.append(manufacturer)
        for field in ("E1_Brand", "Unilog_Brand", "DIB_Brand"):
            brand = clean_optional(row.get(field))
            if brand is not None:
                brands.append(brand)
    return ResolutionVocabularies(
        manufacturers=EntityVocabulary(manufacturers),
        brands=EntityVocabulary(brands),
    )


def _candidate_list(ranked: list[tuple[VocabularyEntry, float]]) -> list[Candidate]:
    return [
        Candidate(value=entry.canonical_name, confidence=score)
        for entry, score in ranked
    ]


def _resolve_one(
    values: Iterable[str | None], vocabulary: EntityVocabulary, threshold: float
) -> tuple[EntityResolution, bool]:
    all_rankings = [vocabulary.rank(value) for raw in values if (value := clean_optional(raw))]
    all_rankings = [ranking for ranking in all_rankings if ranking]
    if not all_rankings:
        return EntityResolution(), False

    best_by_name: dict[str, tuple[VocabularyEntry, float]] = {}
    leading_names: set[str] = set()
    for ranking in all_rankings:
        leading_entry, leading_score = ranking[0]
        if leading_score >= threshold:
            leading_names.add(leading_entry.canonical_name)
        for entry, score in ranking:
            current = best_by_name.get(entry.canonical_name)
            if current is None or score > current[1]:
                best_by_name[entry.canonical_name] = (entry, score)

    ranked = sorted(best_by_name.values(), key=lambda item: (-item[1], item[0].canonical_name))[:3]
    candidates = _candidate_list(ranked)
    conflict = len(leading_names) > 1
    if not ranked or ranked[0][1] < threshold or conflict:
        return EntityResolution(candidates=candidates), conflict
    return EntityResolution(
        canonical_name=ranked[0][0].canonical_name,
        confidence=ranked[0][1],
        candidates=candidates,
    ), False


def run_brand_resolution_stage(
    record: ItemRecord,
    vocabularies: ResolutionVocabularies,
    settings: Settings,
) -> ItemRecord:
    cleaned_record = record if record.clean is not None else run_clean_stage(record)
    clean = cleaned_record.clean
    assert clean is not None

    manufacturer, manufacturer_conflict = _resolve_one(
        [clean.part_manuf], vocabularies.manufacturers, settings.manufacturer_match_threshold
    )
    brand, brand_conflict = _resolve_one(
        [clean.e1_brand, clean.unilog_brand, clean.dib_brand],
        vocabularies.brands,
        settings.brand_match_threshold,
    )
    flags: list[ReviewFlag] = []
    if manufacturer.canonical_name is None:
        flags.append(
            ReviewFlag(
                code="manufacturer_unresolved",
                message="Manufacturer did not meet the resolution threshold.",
                field="manufacturer",
                stage="brand_resolution",
            )
        )
    if manufacturer_conflict:
        flags.append(
            ReviewFlag(
                code="manufacturer_conflict",
                message="Manufacturer evidence resolves to conflicting canonical values.",
                field="manufacturer",
                stage="brand_resolution",
            )
        )
    if brand.canonical_name is None:
        flags.append(
            ReviewFlag(
                code="brand_unresolved",
                message="Brand did not meet the resolution threshold.",
                field="brand",
                stage="brand_resolution",
            )
        )
    if brand_conflict:
        flags.append(
            ReviewFlag(
                code="brand_conflict",
                message="Brand fields resolve to conflicting canonical values.",
                field="brand",
                stage="brand_resolution",
            )
        )

    return cleaned_record.model_copy(
        update={
            "brand_resolution": BrandResolutionStage(
                manufacturer=manufacturer,
                brand=brand,
                flags=flags,
            ),
            "updated_at": datetime.now(timezone.utc),
        },
        deep=True,
    )
