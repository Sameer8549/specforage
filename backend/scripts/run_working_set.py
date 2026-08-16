"""Run a reproducible, description-rich working-set evaluation against /process.

This script changes no pipeline behavior. It selects 40 catalog rows with a greedy
text-diversity pass and emits compact JSON suitable for the submission report.
"""

from __future__ import annotations

import csv
import http.client
import json
import math
import re
import time
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "sample_1000_items.csv"
ENDPOINT = "https://specforge-backend-production.up.railway.app/process"
RESULTS_PATH = ROOT / "data" / "working_set_results.json"
COUNT = 30
WORKERS = 2


def tokens(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z][a-z0-9]{2,}", value.lower())
        if token not in {"the", "and", "for", "with", "from", "each", "only"}
    }


def select_rows(rows: list[dict[str, str]]) -> list[tuple[int, dict[str, str]]]:
    candidates = [
        (number, row, tokens(row.get("Part_Desc", "")))
        for number, row in enumerate(rows, start=2)
        if len((row.get("Part_Desc") or "").strip()) >= 22
    ]
    document_frequency = Counter(token for _, _, terms in candidates for token in terms)

    def vector(terms: set[str]) -> dict[str, float]:
        return {
            term: math.log((len(candidates) + 1) / (document_frequency[term] + 1)) + 1
            for term in terms
        }

    vectors = [(number, row, vector(terms)) for number, row, terms in candidates]

    def cosine(left: dict[str, float], right: dict[str, float]) -> float:
        shared = left.keys() & right.keys()
        numerator = sum(left[key] * right[key] for key in shared)
        left_norm = math.sqrt(sum(value * value for value in left.values()))
        right_norm = math.sqrt(sum(value * value for value in right.values()))
        return numerator / (left_norm * right_norm) if left_norm and right_norm else 0.0

    selected: list[tuple[int, dict[str, str], dict[str, float]]] = []
    used_manufacturers: Counter[str] = Counter()
    while vectors and len(selected) < COUNT:
        def score(item: tuple[int, dict[str, str], dict[str, float]]) -> float:
            _, row, item_vector = item
            novelty = 1.0 - max((cosine(item_vector, existing[2]) for existing in selected), default=0.0)
            richness = min(len(row.get("Part_Desc", "")) / 100.0, 1.0)
            manufacturer = row.get("Part_Manuf", "")
            manufacturer_bonus = 0.2 if not used_manufacturers[manufacturer] else 0.0
            return novelty + 0.25 * richness + manufacturer_bonus

        chosen = max(vectors, key=score)
        vectors.remove(chosen)
        selected.append(chosen)
        used_manufacturers[chosen[1].get("Part_Manuf", "")] += 1
    return [(number, row) for number, row, _ in selected]


def post_row(row_number: int, row: dict[str, str]) -> dict[str, object]:
    payload = {
        "mfg_part_num": row["Mfg_Part_Num"],
        "part_desc": row["Part_Desc"],
        "e1_brand": row.get("E1_Brand") or None,
        "unilog_brand": row.get("Unilog_Brand") or None,
        "dib_brand": row.get("DIB_Brand") or None,
        "part_manuf": row.get("Part_Manuf") or None,
    }
    request = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    last_error = ""
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                result = json.load(response)
            break
        except (
            urllib.error.URLError,
            TimeoutError,
            http.client.IncompleteRead,
            http.client.HTTPException,
            json.JSONDecodeError,
            OSError,
        ) as exc:
            last_error = str(exc)
            time.sleep(2 ** attempt)
    else:
        return {"row_number": row_number, "input": payload, "error": last_error}

    classification = result.get("classify") or {}
    extraction = result.get("extract") or {}
    verification = result.get("verify") or {}
    adjudication = result.get("adjudicate") or {}
    description = result.get("description") or {}
    audit = result.get("audit") or {}
    verification_by_label = {item["label"]: item for item in verification.get("results", [])}
    attributes = []
    for item in extraction.get("attributes", []):
        checked = verification_by_label.get(item.get("label"), {})
        attributes.append(
            {
                "label": item.get("label"),
                "value": item.get("value"),
                "uom": item.get("uom"),
                "confidence": item.get("confidence"),
                "source_type": item.get("source_type"),
                "source_excerpt": item.get("source_excerpt"),
                "entailment": checked.get("entailment"),
                "verification_confidence": checked.get("confidence"),
                "vocabulary_compliant": checked.get("vocabulary_compliant"),
            }
        )
    return {
        "row_number": row_number,
        "input": payload,
        "manufacturer": {
            "value": ((result.get("brand_resolution") or {}).get("manufacturer") or {}).get("canonical_name"),
            "confidence": ((result.get("brand_resolution") or {}).get("manufacturer") or {}).get("confidence"),
        },
        "brand": {
            "value": ((result.get("brand_resolution") or {}).get("brand") or {}).get("canonical_name"),
            "confidence": ((result.get("brand_resolution") or {}).get("brand") or {}).get("confidence"),
        },
        "manufacturer_domain": (result.get("brand_resolution") or {}).get("manufacturer_domain"),
        "classification": {
            "unspsc_code": classification.get("unspsc_code"),
            "classpath": classification.get("classpath"),
            "confidence": classification.get("confidence"),
            "expected_attributes": classification.get("expected_attributes", []),
            "tie_break_used": classification.get("tie_break_used"),
            "tie_break_outcome": classification.get("tie_break_outcome"),
            "tie_break_reasoning": classification.get("tie_break_reasoning"),
            "flags": [flag.get("code") for flag in classification.get("flags", [])],
        },
        "extraction": {
            "attributes": attributes,
            "retrieval_attempted": extraction.get("retrieval_attempted"),
            "flags": [flag.get("code") for flag in extraction.get("flags", [])],
        },
        "adjudication": {
            "fired": bool(adjudication.get("reasoning") or adjudication.get("rejected_values")),
            "needs_human_review": adjudication.get("needs_human_review"),
            "reasoning": adjudication.get("reasoning", []),
            "rejected_values": adjudication.get("rejected_values", []),
            "final_attributes": adjudication.get("attributes", []),
        },
        "descriptions": {
            "mobile_desc": description.get("mobile_desc"),
            "invoice_desc": description.get("invoice_desc"),
            "short_desc": description.get("short_desc"),
            "long_desc1": description.get("long_desc1"),
            "retail_desc": description.get("retail_desc"),
            "field_compliance": description.get("field_compliance", {}),
        },
        "audit": {
            "coverage_percent": audit.get("coverage_percent"),
            "attribute_coverage_percent": audit.get("attribute_coverage_percent"),
            "attribute_produced_fields": audit.get("attribute_produced_fields"),
            "attribute_expected_fields": audit.get("attribute_expected_fields"),
            "character_limit_compliance_percent": audit.get("character_limit_compliance_percent"),
            "routed_to_review": audit.get("routed_to_review"),
            "flags": [flag.get("field") for flag in audit.get("flags", [])],
        },
    }


def main() -> None:
    with SOURCE.open(encoding="utf-8-sig", newline="") as handle:
        selected = select_rows(list(csv.DictReader(handle)))
    records: list[dict[str, object]] = []
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(post_row, number, row): number for number, row in selected}
        for future in as_completed(futures):
            try:
                records.append(future.result())
            except Exception as exc:  # preserve other completed evaluation evidence
                records.append({"row_number": futures[future], "error": repr(exc)})
            records.sort(key=lambda record: int(record["row_number"]))
            RESULTS_PATH.write_text(
                json.dumps(
                    {"selection_method": "greedy TF-IDF description diversity", "records": records},
                    indent=2,
                ),
                encoding="utf-8",
            )
    records.sort(key=lambda record: int(record["row_number"]))
    print(json.dumps({"selection_method": "greedy TF-IDF description diversity", "records": records}, indent=2))


if __name__ == "__main__":
    main()
