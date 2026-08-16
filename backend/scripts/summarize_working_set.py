"""Print concise aggregates and rows from the checkpointed working-set run."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
payload = json.loads((ROOT / "data" / "working_set_results.json").read_text(encoding="utf-8"))
records = payload["records"]
valid = [record for record in records if "error" not in record]


def leaf(record: dict) -> str:
    path = record["classification"].get("classpath") or "Unresolved"
    return path.rsplit(">", 1)[-1]


classified = [record for record in valid if record["classification"].get("unspsc_code")]
with_attributes = [record for record in valid if record["adjudication"]["final_attributes"]]
expected = sum(record["audit"]["attribute_expected_fields"] for record in valid)
produced = sum(len(record["adjudication"]["final_attributes"]) for record in valid)
description_values = {
    "mobile_desc": "MOBILE_DESC",
    "invoice_desc": "INVOICE_DESC",
    "short_desc": "SHORT_DESC",
    "long_desc1": "LONG_DESC1",
    "retail_desc": "RETAIL_DESC",
}
description_total = 0
description_passed = 0
for record in valid:
    for field, delivery_field in description_values.items():
        if record["descriptions"].get(field):
            description_total += 1
            description_passed += int(record["descriptions"]["field_compliance"].get(delivery_field, False))

categories: dict[str, list[dict]] = defaultdict(list)
for record in valid:
    categories[leaf(record)].append(record)

summary = {
    "attempted": len(records),
    "completed": len(valid),
    "errors": [{"row_number": r["row_number"], "error": r["error"]} for r in records if "error" in r],
    "distinct_resolved_unspsc": len({r["classification"]["unspsc_code"] for r in classified}),
    "average_classification_confidence_all_completed": round(sum(r["classification"]["confidence"] for r in valid) / len(valid), 4),
    "average_classification_confidence_resolved": round(sum(r["classification"]["confidence"] for r in classified) / len(classified), 4) if classified else None,
    "classified_percent": round(100 * len(classified) / len(valid), 2),
    "with_final_attributes_percent": round(100 * len(with_attributes) / len(valid), 2),
    "attribute_yield": f"{produced}/{expected}",
    "attribute_yield_percent": round(100 * produced / expected, 2) if expected else None,
    "routed_to_review_percent": round(100 * sum(r["audit"]["routed_to_review"] for r in valid) / len(valid), 2),
    "character_limit_compliance": f"{description_passed}/{description_total}",
    "character_limit_compliance_percent": round(100 * description_passed / description_total, 2),
    "retrieval_attempted_count": sum(bool(r["extraction"]["retrieval_attempted"]) for r in valid),
}
print("AGGREGATE")
print(json.dumps(summary, indent=2))
print("\nCATEGORIES")
for name, items in sorted(categories.items()):
    print(json.dumps({
        "category": name,
        "rows": len(items),
        "classified": sum(bool(r["classification"]["unspsc_code"]) for r in items),
        "with_final_attributes": sum(bool(r["adjudication"]["final_attributes"]) for r in items),
        "average_confidence": round(sum(r["classification"]["confidence"] for r in items) / len(items), 3),
        "reviewed": sum(bool(r["audit"]["routed_to_review"]) for r in items),
    }))
print("\nROWS")
for record in valid:
    print(json.dumps({
        "row": record["row_number"],
        "mpn": record["input"]["mfg_part_num"],
        "description": record["input"]["part_desc"],
        "manufacturer": record["manufacturer"],
        "brand": record["brand"],
        "code": record["classification"]["unspsc_code"],
        "category": leaf(record),
        "classpath": record["classification"]["classpath"],
        "confidence": record["classification"]["confidence"],
        "tie": record["classification"]["tie_break_outcome"],
        "expected": record["audit"]["attribute_expected_fields"],
        "extracted": record["audit"]["attribute_produced_fields"],
        "final_attributes": record["adjudication"]["final_attributes"],
        "raw_attributes": record["extraction"]["attributes"],
        "adjudication_fired": record["adjudication"]["fired"],
        "rejected": record["adjudication"]["rejected_values"],
        "retrieval": record["extraction"]["retrieval_attempted"],
        "char_compliance": record["audit"]["character_limit_compliance_percent"],
        "review": record["audit"]["routed_to_review"],
        "descriptions": record["descriptions"],
        "flags": record["audit"]["flags"],
    }, ensure_ascii=False))

print("\nMARKDOWN")
for record in valid:
    classification = record["classification"]
    audit = record["audit"]
    final_attributes = record["adjudication"]["final_attributes"]
    description = record["input"]["part_desc"].replace("|", "/")
    code_and_leaf = (
        f"{classification['unspsc_code']} {leaf(record)}"
        if classification.get("unspsc_code")
        else "— Unresolved"
    )
    print(
        f"| {record['row_number']} | {record['input']['mfg_part_num']} | {description} | "
        f"{code_and_leaf} | {classification['confidence']:.3f} | "
        f"{len(final_attributes)}/{audit['attribute_expected_fields']} | "
        f"{audit['character_limit_compliance_percent']}% | "
        f"{'Yes' if audit['routed_to_review'] else 'No'} |"
    )
