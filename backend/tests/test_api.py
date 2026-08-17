import csv
import io

from fastapi.testclient import TestClient

from specforge.contracts import (
    AdjudicateStage,
    AuditStage,
    BrandResolutionStage,
    ClassificationStage,
    CleanStage,
    DescriptionStage,
    ExtractStage,
    ItemRecord,
    NormalizeStage,
    OutputRowStage,
    VerifyStage,
)
from specforge.data import load_catalog
from specforge.config import get_settings
from specforge.main import app, get_pipeline


class FakePipeline:
    async def process(
        self, record: ItemRecord, ground_truth_row: dict[str, str] | None = None
    ) -> ItemRecord:
        if record.input.mfg_part_num == "FAIL":
            raise RuntimeError("simulated row failure")
        accuracy = (
            {
                "manufacturer": 100.0,
                "brand": 50.0,
                "classpath": 100.0,
                "attributes": 50.0,
                "descriptions": 100.0,
                "overall": 80.0,
            }
            if ground_truth_row is not None
            else None
        )
        headers = load_catalog(get_settings()).ground_truth.headers
        return record.model_copy(
            update={
                "clean": CleanStage(
                    mfg_part_num=record.input.mfg_part_num,
                    part_desc=record.input.part_desc,
                ),
                "brand_resolution": BrandResolutionStage(),
                "classify": ClassificationStage(),
                "extract": ExtractStage(),
                "normalize": NormalizeStage(),
                "verify": VerifyStage(),
                "adjudicate": AdjudicateStage(),
                "description": DescriptionStage(),
                "audit": AuditStage(
                    coverage_percent=75,
                    resolved_fields=3,
                    total_fields=4,
                    accuracy=accuracy,
                    vocabulary_compliance_percent=90,
                    vocabulary_compliance_evaluated_fields=4,
                    attribute_coverage_percent=50,
                    attribute_produced_fields=2,
                    attribute_expected_fields=4,
                    character_limit_compliance_percent=95,
                    character_limit_compliant_fields=19,
                    character_limit_evaluated_fields=20,
                    routed_to_review=True,
                    needs_human_review=True,
                    gap_report=["Known ground-truth gap"] if ground_truth_row else [],
                ),
                "output_row": OutputRowStage(
                    values={header: None for header in headers},
                    header_order=headers,
                ),
            },
            deep=True,
        )


def client() -> TestClient:
    app.dependency_overrides[get_pipeline] = lambda: FakePipeline()
    return TestClient(app)


def test_health_reports_bundled_dataset_counts_without_loading_pipeline() -> None:
    with client() as api:
        response = api.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert {key: body[key] for key in (
        "status", "service", "working_rows", "ground_truth_rows", "pipeline_loaded"
    )} == {
        "status": "ok",
        "service": "specforge",
        "working_rows": 1000,
        "ground_truth_rows": 2,
        "pipeline_loaded": False,
    }
    assert body["delivery_columns"] == 252
    assert len(body["delivery_schema_sha256"]) == 64
    assert body["reference_artifacts"]["official_unicat"]["available"] is False
    assert body["reference_artifacts"]["official_lov"]["available"] is False
    app.dependency_overrides.clear()


def test_cors_allows_configured_frontend_origin() -> None:
    with client() as api:
        response = api.options(
            "/process",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    app.dependency_overrides.clear()


def test_process_returns_versioned_stage_trace() -> None:
    with client() as api:
        response = api.post(
            "/process",
            json={"mfg_part_num": "ABC-1", "part_desc": "Dishwasher, 120 V"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["input"]["mfg_part_num"] == "ABC-1"
    assert body["audit"]["coverage_percent"] == 75
    assert "schema_version" in body
    assert [
        stage
        for stage in (
            "clean",
            "brand_resolution",
            "classify",
            "extract",
            "normalize",
            "verify",
            "adjudicate",
            "description",
            "audit",
            "output_row",
        )
        if body[stage] is None
    ] == []
    assert body["output_row"]["header_order"]
    assert list(body["output_row"]["values"]) == body["output_row"]["header_order"]
    app.dependency_overrides.clear()


def test_legacy_force_adjudication_flag_is_accepted_but_ignored() -> None:
    with client() as api:
        response = api.post(
            "/process",
            json={
                "mfg_part_num": "ABC-1",
                "part_desc": "Dishwasher, 120 V",
                "force_adjudication": True,
            },
        )

    assert response.status_code == 200
    assert "force_adjudication" not in response.json()["processing_metadata"]
    app.dependency_overrides.clear()


def _csv_payload(rows: list[dict[str, str]]) -> bytes:
    handle = io.StringIO(newline="")
    writer = csv.DictWriter(
        handle,
        fieldnames=[
            "Mfg_Part_Num",
            "Part_Desc",
            "E1_Brand",
            "Unilog_Brand",
            "DIB_Brand",
            "Part_Manuf",
        ],
    )
    writer.writeheader()
    writer.writerows(rows)
    return handle.getvalue().encode()


def test_batch_tracks_each_row_and_isolates_failures() -> None:
    payload = _csv_payload(
        [
            {"Mfg_Part_Num": "OK", "Part_Desc": "One"},
            {"Mfg_Part_Num": "FAIL", "Part_Desc": "Two"},
        ]
    )
    with client() as api:
        accepted = api.post("/batch", content=payload, headers={"content-type": "text/csv"})
        result = api.get(accepted.json()["status_url"])

    assert accepted.status_code == 202
    assert result.status_code == 200
    assert result.json()["status"] == "completed_with_errors"
    assert result.json()["completed_rows"] == 1
    assert result.json()["failed_rows"] == 1
    assert [row["state"] for row in result.json()["rows"]] == ["completed", "failed"]
    assert result.json()["rows"][1]["error_code"] == "processing_error"
    app.dependency_overrides.clear()


def test_batch_rejects_missing_required_headers() -> None:
    with client() as api:
        response = api.post(
            "/batch", content=b"Mfg_Part_Num\nABC\n", headers={"content-type": "text/csv"}
        )

    assert response.status_code == 400
    assert "missing required columns" in response.json()["detail"]
    app.dependency_overrides.clear()


def test_eval_returns_required_aggregate_metrics() -> None:
    with client() as api:
        response = api.get("/eval")

    assert response.status_code == 200
    body = response.json()
    assert body["evaluated_rows"] == 2
    assert body["accuracy"]["overall"] == 80
    assert body["vocabulary_compliance_percent"] == 90
    assert body["vocabulary_compliance_evaluated_fields"] == 8
    assert body["attribute_coverage_percent"] == 50
    assert body["attribute_produced_fields"] == 4
    assert body["attribute_expected_fields"] == 8
    assert body["character_limit_compliance_percent"] == 95
    assert body["character_limit_compliant_fields"] == 38
    assert body["character_limit_evaluated_fields"] == 40
    assert body["routed_to_review_percent"] == 100
    assert len(body["gap_report"]) == 2
    app.dependency_overrides.clear()


def test_unknown_batch_job_returns_404() -> None:
    with client() as api:
        response = api.get("/batch/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    app.dependency_overrides.clear()
