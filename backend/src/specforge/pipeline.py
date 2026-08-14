"""Composition root for the complete enrichment pipeline."""

from dataclasses import dataclass
from typing import Any

from specforge.config import Settings
from specforge.contracts import ItemRecord
from specforge.data import DatasetCatalog, load_catalog
from specforge.descriptions import DescriptionFormulaCatalog
from specforge.expected_attributes import ExpectedAttributeCatalog
from specforge.llm import JSONLLM, LLMError, build_adjudication_llm, build_extraction_llm
from specforge.normalization import AttributeVocabulary
from specforge.stages.adjudicate import run_adjudicate_stage
from specforge.stages.audit import run_audit_stage
from specforge.stages.brand_resolution import (
    ResolutionVocabularies,
    build_resolution_vocabularies,
    run_brand_resolution_stage,
)
from specforge.stages.classify import run_classify_stage
from specforge.stages.clean import run_clean_stage
from specforge.stages.description import run_description_stage
from specforge.stages.extract import run_extract_stage
from specforge.stages.normalize import run_normalize_stage
from specforge.stages.output_mapper import run_output_mapper_stage
from specforge.stages.verify import run_verify_stage
from specforge.unspsc import FastEmbedBackend, UNSPSCIndex


class UnavailableJSONLLM:
    async def complete_json(
        self, system_prompt: str, user_prompt: str, schema: dict[str, Any]
    ) -> dict[str, Any]:
        raise LLMError("No LLM API key is configured")


def _optional_llm(builder: Any, settings: Settings) -> JSONLLM:
    try:
        return builder(settings)
    except LLMError:
        return UnavailableJSONLLM()


@dataclass(slots=True)
class Pipeline:
    settings: Settings
    catalog: DatasetCatalog
    resolution_vocabularies: ResolutionVocabularies
    unspsc_index: UNSPSCIndex
    expected_attributes: ExpectedAttributeCatalog
    attribute_vocabulary: AttributeVocabulary
    description_catalog: DescriptionFormulaCatalog
    extraction_llm: JSONLLM
    adjudication_llm: JSONLLM

    async def process(
        self, record: ItemRecord, ground_truth_row: dict[str, str] | None = None
    ) -> ItemRecord:
        current = run_clean_stage(record)
        current = run_brand_resolution_stage(
            current, self.resolution_vocabularies, self.settings
        )
        current = run_classify_stage(
            current, self.unspsc_index, self.expected_attributes, self.settings
        )
        current = await run_extract_stage(current, self.extraction_llm, self.settings)
        current = run_normalize_stage(current, self.attribute_vocabulary, self.settings)
        current = await run_verify_stage(current, self.extraction_llm)
        current = await run_adjudicate_stage(current, self.adjudication_llm)
        current = run_description_stage(current, self.description_catalog)
        current = run_audit_stage(current, self.settings, ground_truth_row)
        return run_output_mapper_stage(current, self.settings)


def build_pipeline(settings: Settings, catalog: DatasetCatalog | None = None) -> Pipeline:
    datasets = catalog or load_catalog(settings)
    embedder = FastEmbedBackend(settings.embedding_model)
    index = UNSPSCIndex.load(
        settings.resolve_data_path(settings.unspsc_dataset),
        settings.resolve_data_path(settings.unspsc_embeddings),
        embedder,
    )
    return Pipeline(
        settings=settings,
        catalog=datasets,
        resolution_vocabularies=build_resolution_vocabularies(datasets),
        unspsc_index=index,
        expected_attributes=ExpectedAttributeCatalog.from_ground_truth(datasets.ground_truth),
        attribute_vocabulary=AttributeVocabulary.from_ground_truth(datasets.ground_truth),
        description_catalog=DescriptionFormulaCatalog.from_ground_truth(datasets.ground_truth),
        extraction_llm=_optional_llm(build_extraction_llm, settings),
        adjudication_llm=_optional_llm(build_adjudication_llm, settings),
    )
