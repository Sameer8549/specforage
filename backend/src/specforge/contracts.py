"""Versioned, append-only contracts shared by every pipeline stage."""

from datetime import datetime, timezone
from enum import StrEnum
from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class SourceType(StrEnum):
    DESCRIPTION = "description"
    MANUFACTURER_SITE = "manufacturer_site"


class EntailmentLabel(StrEnum):
    SUPPORTED = "supported"
    PARTIALLY_SUPPORTED = "partially_supported"
    NOT_SUPPORTED = "not_supported"
    AMBIGUOUS = "ambiguous"


class ReviewFlag(ContractModel):
    code: str
    message: str
    field: str | None = None
    stage: str


class Candidate(ContractModel):
    value: str
    confidence: float = Field(ge=0, le=1)


class AttributeValue(ContractModel):
    label: str
    value: str | None = None
    uom: str | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    source_excerpt: str | None = None
    source_type: SourceType | None = None


class InputStage(ContractModel):
    mfg_part_num: str
    part_desc: str
    e1_brand: str | None = None
    unilog_brand: str | None = None
    dib_brand: str | None = None
    part_manuf: str | None = None
    source_row_number: int | None = Field(default=None, ge=1)


class CleanStage(ContractModel):
    mfg_part_num: str | None = None
    part_desc: str | None = None
    e1_brand: str | None = None
    unilog_brand: str | None = None
    dib_brand: str | None = None
    part_manuf: str | None = None
    nullified_fields: list[str] = Field(default_factory=list)


class EntityResolution(ContractModel):
    canonical_name: str | None = None
    confidence: float = Field(default=0, ge=0, le=1)
    candidates: list[Candidate] = Field(default_factory=list, max_length=3)


class BrandResolutionStage(ContractModel):
    manufacturer: EntityResolution = Field(default_factory=EntityResolution)
    brand: EntityResolution = Field(default_factory=EntityResolution)
    manufacturer_domain: str | None = None
    manufacturer_source: str | None = None
    mpn_lookup_attempted: bool = False
    mpn_lookup_cache_hit: bool | None = None
    flags: list[ReviewFlag] = Field(default_factory=list)


class ClassificationStage(ContractModel):
    unspsc_code: str | None = None
    classpath: str | None = None
    confidence: float = Field(default=0, ge=0, le=1)
    expected_attributes: list[str] = Field(default_factory=list)
    candidates: list[Candidate] = Field(default_factory=list)
    tie_break_used: bool = False
    tie_break_outcome: str | None = None
    tie_break_reasoning: str | None = None
    flags: list[ReviewFlag] = Field(default_factory=list)


class ExtractStage(ContractModel):
    attributes: list[AttributeValue] = Field(default_factory=list)
    retrieval_attempted: bool = False
    extraction_failed: bool = False
    flags: list[ReviewFlag] = Field(default_factory=list)


class NormalizeStage(ContractModel):
    attributes: list[AttributeValue] = Field(default_factory=list)
    flags: list[ReviewFlag] = Field(default_factory=list)


class Verification(ContractModel):
    label: str
    value: str | None = None
    entailment: EntailmentLabel
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    vocabulary_compliant: bool
    uom_compliant: bool


class VerifyStage(ContractModel):
    results: list[Verification] = Field(default_factory=list)
    flags: list[ReviewFlag] = Field(default_factory=list)


class RejectedValue(ContractModel):
    field: str
    value: str
    reason: str
    source_type: SourceType | None = None


class AdjudicateStage(ContractModel):
    attributes: list[AttributeValue] = Field(default_factory=list)
    rejected_values: list[RejectedValue] = Field(default_factory=list)
    needs_human_review: bool = False
    reasoning: list[str] = Field(default_factory=list)


class DescriptionStage(ContractModel):
    mobile_desc: str | None = None
    invoice_desc: str | None = None
    short_desc: str | None = None
    long_desc1: str | None = None
    retail_desc: str | None = None
    marketing_description: str | None = None
    character_limit_compliant: bool = True
    field_compliance: dict[str, bool] = Field(default_factory=dict)
    flags: list[ReviewFlag] = Field(default_factory=list)


class AuditStage(ContractModel):
    coverage_percent: float = Field(default=0, ge=0, le=100)
    resolved_fields: int = Field(default=0, ge=0)
    total_fields: int = Field(default=0, ge=0)
    needs_human_review: bool = False
    accuracy: dict[str, float | None] | None = None
    field_status: dict[str, bool] = Field(default_factory=dict)
    vocabulary_compliance_percent: float | None = Field(default=None, ge=0, le=100)
    vocabulary_compliance_evaluated_fields: int = Field(default=0, ge=0)
    attribute_coverage_percent: float | None = Field(default=None, ge=0, le=100)
    attribute_produced_fields: int = Field(default=0, ge=0)
    attribute_expected_fields: int = Field(default=0, ge=0)
    character_limit_compliance_percent: float | None = Field(default=None, ge=0, le=100)
    character_limit_compliant_fields: int = Field(default=0, ge=0)
    character_limit_evaluated_fields: int = Field(default=0, ge=0)
    routed_to_review: bool = False
    gap_report: list[str] = Field(default_factory=list)
    flags: list[ReviewFlag] = Field(default_factory=list)


class Provenance(ContractModel):
    stage: str
    confidence: float | None = Field(default=None, ge=0, le=1)
    source_type: SourceType | None = None
    source_excerpt: str | None = None


class OutputRowStage(ContractModel):
    values: dict[str, str | None] = Field(default_factory=dict)
    header_order: list[str] = Field(default_factory=list)
    provenance: dict[str, Provenance] = Field(default_factory=dict)


class ItemRecord(ContractModel):
    """Append-only aggregate; a stage writes only to its namespaced field."""

    schema_version: str = "1.0"
    item_id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    input: InputStage
    clean: CleanStage | None = None
    brand_resolution: BrandResolutionStage | None = None
    classify: ClassificationStage | None = None
    extract: ExtractStage | None = None
    normalize: NormalizeStage | None = None
    verify: VerifyStage | None = None
    adjudicate: AdjudicateStage | None = None
    description: DescriptionStage | None = None
    audit: AuditStage | None = None
    output_row: OutputRowStage | None = None
    processing_metadata: dict[str, Any] = Field(default_factory=dict)
