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
from specforge.manufacturer_lookup import ManufacturerLookup, OfficialDomainResolver
from specforge.stages.clean import clean_optional, run_clean_stage
from specforge.vocabulary import EntityVocabulary, VocabularyEntry, entity_key


@dataclass(frozen=True, slots=True)
class ResolutionVocabularies:
    manufacturers: EntityVocabulary
    brands: EntityVocabulary
    brand_manufacturers: dict[str, str]


def build_resolution_vocabularies(catalog: DatasetCatalog) -> ResolutionVocabularies:
    manufacturers: list[str] = []
    brands: list[str] = []
    brand_manufacturers: dict[str, str] = {}
    for row in iter_csv_rows(catalog.working):
        manufacturer = clean_optional(row.get("Part_Manuf"))
        if manufacturer is not None:
            manufacturers.append(manufacturer)
        for field in ("E1_Brand", "Unilog_Brand", "DIB_Brand"):
            brand = clean_optional(row.get(field))
            if brand is not None:
                brands.append(brand)
    for row in iter_csv_rows(catalog.ground_truth):
        manufacturer = clean_optional(row.get("MANUFACTURER_NAME"))
        brand = clean_optional(row.get("BRAND_NAME"))
        if manufacturer is not None:
            manufacturers.append(manufacturer)
        if brand is not None:
            brands.append(brand)
        if manufacturer is not None and brand is not None:
            brand_manufacturers[entity_key(brand)] = manufacturer
    return ResolutionVocabularies(
        manufacturers=EntityVocabulary(manufacturers),
        brands=EntityVocabulary(brands),
        brand_manufacturers=brand_manufacturers,
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


async def run_brand_resolution_stage(
    record: ItemRecord,
    vocabularies: ResolutionVocabularies,
    settings: Settings,
    manufacturer_lookup: ManufacturerLookup | None = None,
    domain_resolver: OfficialDomainResolver | None = None,
) -> ItemRecord:
    cleaned_record = record if record.clean is not None else run_clean_stage(record)
    clean = cleaned_record.clean
    assert clean is not None

    brand, brand_conflict = _resolve_one(
        [clean.e1_brand, clean.unilog_brand, clean.dib_brand],
        vocabularies.brands,
        settings.brand_match_threshold,
    )
    manufacturer = EntityResolution()
    manufacturer_conflict = False
    manufacturer_source: str | None = None
    mpn_lookup_attempted = False
    paired_manufacturer = (
        vocabularies.brand_manufacturers.get(entity_key(brand.canonical_name))
        if brand.canonical_name
        else None
    )
    if paired_manufacturer:
        manufacturer = EntityResolution(
            canonical_name=paired_manufacturer,
            confidence=0.98,
            candidates=[Candidate(value=paired_manufacturer, confidence=0.98)],
        )
        manufacturer_source = "brand_manufacturer_pair"
    elif not any((clean.e1_brand, clean.unilog_brand, clean.dib_brand)):
        mpn_lookup_attempted = manufacturer_lookup is not None
        lookup_result = (
            await manufacturer_lookup.lookup(clean.mfg_part_num or "", clean.part_desc)
            if manufacturer_lookup is not None and clean.mfg_part_num
            else None
        )
        if lookup_result is not None:
            manufacturer = EntityResolution(
                canonical_name=lookup_result.manufacturer,
                confidence=lookup_result.confidence,
                candidates=[
                    Candidate(
                        value=lookup_result.manufacturer,
                        confidence=lookup_result.confidence,
                    )
                ],
            )
            manufacturer_source = "mpn_web_lookup"

    used_distributor_fallback = False
    if manufacturer.canonical_name is None and clean.part_manuf:
        ranked = vocabularies.manufacturers.rank(clean.part_manuf)
        if ranked:
            entry, raw_score = ranked[0]
            fallback_confidence = min(raw_score, 0.65)
            manufacturer = EntityResolution(
                canonical_name=entry.canonical_name,
                confidence=fallback_confidence,
                candidates=_candidate_list(ranked),
            )
            manufacturer_source = "part_manuf_fallback"
            used_distributor_fallback = True
    manufacturer_domain = None
    if (
        manufacturer.canonical_name
        and manufacturer.confidence >= settings.manufacturer_match_threshold
        and domain_resolver is not None
    ):
        manufacturer_domain = await domain_resolver.resolve(
            manufacturer.canonical_name
        )
    flags: list[ReviewFlag] = []
    if manufacturer.canonical_name is None or (
        manufacturer.confidence < settings.manufacturer_match_threshold
    ):
        flags.append(
            ReviewFlag(
                code="manufacturer_unresolved",
                message="Manufacturer did not meet the resolution threshold.",
                field="manufacturer",
                stage="brand_resolution",
            )
        )
    if used_distributor_fallback:
        flags.append(
            ReviewFlag(
                code="low_confidence_distributor_field_used",
                message=(
                    "Part_Manuf was used only as a last resort and may identify a distributor."
                ),
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
                manufacturer_source=manufacturer_source,
                mpn_lookup_attempted=mpn_lookup_attempted,
                manufacturer_domain=manufacturer_domain,
                flags=flags,
            ),
            "updated_at": datetime.now(timezone.utc),
        },
        deep=True,
    )
