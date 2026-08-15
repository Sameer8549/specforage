"""FastAPI surface for single-item, batch, and evaluation workflows."""

import asyncio
import csv
import io
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import AsyncIterator
from uuid import UUID, uuid4

from fastapi import BackgroundTasks, Body, Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from specforge.audit import aggregate_accuracy
from specforge.config import Settings, get_settings
from specforge.contracts import InputStage, ItemRecord
from specforge.data import (
    WORKING_HEADERS,
    DatasetCatalog,
    item_record_from_row,
    iter_csv_rows,
    load_catalog,
)
from specforge.pipeline import Pipeline, build_pipeline


class APIModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ProcessRequest(APIModel):
    mfg_part_num: str = Field(min_length=1)
    part_desc: str = Field(min_length=1)
    e1_brand: str | None = None
    unilog_brand: str | None = None
    dib_brand: str | None = None
    part_manuf: str | None = None


class BatchAccepted(APIModel):
    job_id: UUID
    status: str
    total_rows: int
    status_url: str


@dataclass(slots=True)
class BatchRow:
    row_number: int
    state: str = "pending"
    record: ItemRecord | None = None
    error: str | None = None
    error_code: str | None = None


@dataclass(slots=True)
class BatchJob:
    job_id: UUID
    rows: list[dict[str, str]]
    row_states: list[BatchRow]
    status: str = "queued"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def response(self) -> dict:
        completed = sum(row.state == "completed" for row in self.row_states)
        failed = sum(row.state == "failed" for row in self.row_states)
        return {
            "job_id": self.job_id,
            "status": self.status,
            "total_rows": len(self.row_states),
            "completed_rows": completed,
            "failed_rows": failed,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "rows": [
                {
                    "row_number": row.row_number,
                    "state": row.state,
                    "record": row.record,
                    "error": row.error,
                    "error_code": row.error_code,
                }
                for row in self.row_states
            ],
        }


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.datasets = load_catalog(get_settings())
    app.state.pipeline = None
    app.state.pipeline_lock = asyncio.Lock()
    app.state.batch_jobs = {}
    yield


app = FastAPI(
    title="SpecForge API",
    version="0.1.0",
    description="Controlled-vocabulary product enrichment pipeline",
    lifespan=lifespan,
)


def get_dataset_catalog() -> DatasetCatalog:
    return app.state.datasets


async def get_pipeline() -> Pipeline:
    if app.state.pipeline is None:
        async with app.state.pipeline_lock:
            if app.state.pipeline is None:
                app.state.pipeline = await asyncio.to_thread(
                    build_pipeline, get_settings(), app.state.datasets
                )
    return app.state.pipeline


@app.get("/health")
async def health(catalog: DatasetCatalog = Depends(get_dataset_catalog)) -> dict:
    return {
        "status": "ok",
        "service": "specforge",
        "working_rows": catalog.working.row_count,
        "ground_truth_rows": catalog.ground_truth.row_count,
        "pipeline_loaded": app.state.pipeline is not None,
    }


@app.post("/process", response_model=ItemRecord)
async def process_item(
    request: ProcessRequest, pipeline: Pipeline = Depends(get_pipeline)
) -> ItemRecord:
    record = ItemRecord(
        input=InputStage(
            mfg_part_num=request.mfg_part_num,
            part_desc=request.part_desc,
            e1_brand=request.e1_brand,
            unilog_brand=request.unilog_brand,
            dib_brand=request.dib_brand,
            part_manuf=request.part_manuf,
        )
    )
    return await pipeline.process(record)


def _parse_batch_csv(payload: bytes) -> list[dict[str, str]]:
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded.") from exc
    reader = csv.DictReader(io.StringIO(text, newline=""))
    if reader.fieldnames is None:
        raise HTTPException(status_code=400, detail="CSV header row is missing.")
    missing = set(WORKING_HEADERS) - set(reader.fieldnames)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {sorted(missing)}",
        )
    rows = [row for row in reader if any((value or "").strip() for value in row.values())]
    if not rows:
        raise HTTPException(status_code=400, detail="CSV contains no data rows.")
    return rows


async def _run_batch(job_id: UUID, pipeline: Pipeline) -> None:
    job: BatchJob = app.state.batch_jobs[job_id]
    job.status = "running"
    for index, source_row in enumerate(job.rows):
        state = job.row_states[index]
        if state.state == "completed":
            continue
        state.state = "running"
        job.updated_at = datetime.now(timezone.utc)
        try:
            state.record = await pipeline.process(
                item_record_from_row(source_row, state.row_number)
            )
            state.state = "completed"
        except Exception as exc:  # Per-row isolation is part of the batch contract.
            state.state = "failed"
            state.error_code = "processing_error"
            state.error = str(exc)
        job.updated_at = datetime.now(timezone.utc)
    job.status = "completed_with_errors" if any(
        row.state == "failed" for row in job.row_states
    ) else "completed"


@app.post("/batch", response_model=BatchAccepted, status_code=status.HTTP_202_ACCEPTED)
async def start_batch(
    background_tasks: BackgroundTasks,
    payload: bytes = Body(..., media_type="text/csv"),
    pipeline: Pipeline = Depends(get_pipeline),
) -> BatchAccepted:
    rows = _parse_batch_csv(payload)
    job_id = uuid4()
    app.state.batch_jobs[job_id] = BatchJob(
        job_id=job_id,
        rows=rows,
        row_states=[BatchRow(row_number=index) for index in range(1, len(rows) + 1)],
    )
    background_tasks.add_task(_run_batch, job_id, pipeline)
    return BatchAccepted(
        job_id=job_id,
        status="queued",
        total_rows=len(rows),
        status_url=f"/batch/{job_id}",
    )


@app.get("/batch/{job_id}")
async def batch_status(job_id: UUID) -> dict:
    job = app.state.batch_jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Batch job not found.")
    return job.response()


@app.get("/eval")
async def evaluate(
    pipeline: Pipeline = Depends(get_pipeline),
    catalog: DatasetCatalog = Depends(get_dataset_catalog),
) -> dict:
    records: list[ItemRecord] = []
    accuracy_rows: list[dict[str, float | None]] = []
    for row_number, ground_truth in enumerate(iter_csv_rows(catalog.ground_truth), start=1):
        record = await pipeline.process(
            item_record_from_row(ground_truth, row_number), ground_truth
        )
        records.append(record)
        if record.audit and record.audit.accuracy:
            accuracy_rows.append(record.audit.accuracy)
    total = len(records)
    vocabulary_audits = [
        record.audit
        for record in records
        if record.audit and record.audit.vocabulary_compliance_percent is not None
    ]
    vocabulary_denominator = sum(
        audit.vocabulary_compliance_evaluated_fields for audit in vocabulary_audits
    )
    vocabulary_percent = (
        round(
            sum(
                audit.vocabulary_compliance_percent
                * audit.vocabulary_compliance_evaluated_fields
                for audit in vocabulary_audits
                if audit.vocabulary_compliance_percent is not None
            )
            / vocabulary_denominator,
            2,
        )
        if vocabulary_denominator
        else None
    )
    character_audits = [record.audit for record in records if record.audit]
    character_denominator = sum(
        audit.character_limit_evaluated_fields for audit in character_audits
    )
    character_passed = sum(
        audit.character_limit_compliant_fields for audit in character_audits
    )
    character_percent = (
        round(100 * character_passed / character_denominator, 2)
        if character_denominator
        else None
    )
    return {
        "evaluated_rows": total,
        "accuracy": aggregate_accuracy(accuracy_rows),
        "vocabulary_compliance_percent": vocabulary_percent,
        "vocabulary_compliance_evaluated_fields": vocabulary_denominator,
        "character_limit_compliance_percent": character_percent,
        "character_limit_compliant_fields": character_passed,
        "character_limit_evaluated_fields": character_denominator,
        "routed_to_review_percent": round(
            100 * sum(bool(record.audit and record.audit.routed_to_review) for record in records)
            / total,
            2,
        )
        if total
        else 0.0,
        "gap_report": [
            {"item_id": record.item_id, "gaps": record.audit.gap_report}
            for record in records
            if record.audit and record.audit.gap_report
        ],
    }
