"""Build an explicitly non-calibration confidence/entailment summary."""

from __future__ import annotations

import json
import shutil
from collections import Counter
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
SOURCE = BACKEND_ROOT / "data" / "working_set_results.json"
ARTIFACT_DIR = BACKEND_ROOT / "data" / "artifacts"
PUBLIC_DIR = REPO_ROOT / "specforage-app" / "public" / "artifacts"

# Manual review is deliberately explicit and reproducible. These six supported
# label/value assignments are excerpt-grounded but semantically questionable.
QUESTIONABLE_SUPPORTED = {
    ("44-A", "Model"),
    ("ADR5117512FW", "Model"),
    ("174-0CSB3-15W", "Model"),
    ("e28cnkha", "Series"),
    ("55227", "Series"),
    ("924422", "Series"),
}


def confidence_tier(value: float) -> str:
    if value >= 0.95:
        return "high (0.95–1.00)"
    if value >= 0.80:
        return "medium (0.80–0.949)"
    return "low (<0.80)"


def main() -> None:
    records = json.loads(SOURCE.read_text(encoding="utf-8"))["records"]
    observations = []
    for record in records:
        mpn = record["input"]["mfg_part_num"]
        final_labels = {item["label"] for item in record["adjudication"]["final_attributes"]}
        for attribute in record["extraction"]["attributes"]:
            label = attribute["entailment"]
            retained = attribute["label"] in final_labels
            if label == "not_supported":
                correct_looking = (mpn, attribute["label"]) != ("JT1-549", "Voltage Rating")
                review_note = (
                    "Likely incorrect rejection: 115V appears verbatim in the bandsaw description."
                    if not correct_looking
                    else "Unsupported brand abbreviation was correctly rejected as Series."
                )
            elif label == "partially_supported":
                correct_looking = True
                review_note = "Value is verbatim and the partial label reflects value/UOM normalization."
            else:
                correct_looking = (mpn, attribute["label"]) not in QUESTIONABLE_SUPPORTED
                review_note = (
                    "Excerpt-grounded, but the attribute label is semantically questionable."
                    if not correct_looking
                    else "Excerpt-grounded and manually plausible for its assigned label."
                )
            confidence = float(attribute["verification_confidence"])
            observations.append(
                {
                    "mpn": mpn,
                    "attribute": attribute["label"],
                    "value": attribute["value"],
                    "entailment": label,
                    "confidence": confidence,
                    "confidence_tier": confidence_tier(confidence),
                    "retained": retained,
                    "manual_correct_looking": correct_looking,
                    "manual_review_note": review_note,
                }
            )

    def summarize(key: str) -> list[dict]:
        output = []
        for value in sorted({item[key] for item in observations}):
            rows = [item for item in observations if item[key] == value]
            output.append(
                {
                    key: value,
                    "observations": len(rows),
                    "retained": sum(item["retained"] for item in rows),
                    "retained_percent": round(100 * sum(item["retained"] for item in rows) / len(rows), 2),
                    "manual_correct_looking": sum(item["manual_correct_looking"] for item in rows),
                    "manual_correct_looking_percent": round(
                        100 * sum(item["manual_correct_looking"] for item in rows) / len(rows), 2
                    ),
                }
            )
        return output

    artifact = {
        "title": "Working-set confidence and entailment self-consistency check",
        "scope": "27 extracted attribute observations across the published 30-row unlabeled working set.",
        "warning": "This is not a calibration accuracy estimate. Ground truth is unavailable for these rows; 'correct-looking' is a documented manual plausibility review of excerpt grounding, label semantics, and final disposition.",
        "manual_review_policy": {
            "supported": "Counted correct-looking only when the excerpt supports both the value and its assigned attribute label.",
            "partially_supported": "Counted correct-looking when normalization explains the partial label and the output remains faithful to the excerpt.",
            "not_supported": "Counted correct-looking when rejection prevents an unsupported attribute; counted questionable when verbatim evidence appears to have been rejected.",
        },
        "by_entailment": summarize("entailment"),
        "by_confidence_tier": summarize("confidence_tier"),
        "observations": observations,
    }

    entailment = {row["entailment"]: row for row in artifact["by_entailment"]}
    tiers = {row["confidence_tier"]: row for row in artifact["by_confidence_tier"]}
    notes = Counter(item["manual_review_note"] for item in observations if not item["manual_correct_looking"])
    markdown = f"""# Confidence and Entailment Self-Consistency Check

This is **not a formal calibration curve or accuracy estimate**. The 30-row working set has no labels. It is a transparent manual plausibility review of the 27 extracted attribute observations: whether the source excerpt grounds the value, whether the assigned attribute label looks semantically appropriate, and whether the final retain/reject disposition looks reasonable.

## By entailment label

| Label | Observations | Retained | Manually correct-looking |
|---|---:|---:|---:|
| Supported | {entailment['supported']['observations']} | {entailment['supported']['retained']} ({entailment['supported']['retained_percent']:.2f}%) | {entailment['supported']['manual_correct_looking']} ({entailment['supported']['manual_correct_looking_percent']:.2f}%) |
| Partially supported | {entailment['partially_supported']['observations']} | {entailment['partially_supported']['retained']} ({entailment['partially_supported']['retained_percent']:.2f}%) | {entailment['partially_supported']['manual_correct_looking']} ({entailment['partially_supported']['manual_correct_looking_percent']:.2f}%) |
| Not supported | {entailment['not_supported']['observations']} | {entailment['not_supported']['retained']} ({entailment['not_supported']['retained_percent']:.2f}%) | {entailment['not_supported']['manual_correct_looking']} ({entailment['not_supported']['manual_correct_looking_percent']:.2f}%) |
| Ambiguous | 0 | 0 | Not observed |

All 23 `supported` values survived adjudication, but six assignments looked semantically questionable despite having verbatim excerpts—for example a brand treated as `Series`, an MPN treated as `Series`, or an over-broad description treated as `Model`. This is why excerpt entailment should not be presented as attribute-label accuracy.

Both `partially_supported` observations produced reasonable-looking normalized voltage outputs. Of the two `not_supported` observations, rejecting `Milw` as a Series looked correct; rejecting `115V` for the bandsaw looked overly conservative because the value appears verbatim.

## By confidence tier

| Verification confidence | Observations | Retained | Manually correct-looking |
|---|---:|---:|---:|
| High (0.95–1.00) | {tiers['high (0.95–1.00)']['observations']} | {tiers['high (0.95–1.00)']['retained']} ({tiers['high (0.95–1.00)']['retained_percent']:.2f}%) | {tiers['high (0.95–1.00)']['manual_correct_looking']} ({tiers['high (0.95–1.00)']['manual_correct_looking_percent']:.2f}%) |
| Medium (0.80–0.949) | {tiers['medium (0.80–0.949)']['observations']} | {tiers['medium (0.80–0.949)']['retained']} ({tiers['medium (0.80–0.949)']['retained_percent']:.2f}%) | {tiers['medium (0.80–0.949)']['manual_correct_looking']} ({tiers['medium (0.80–0.949)']['manual_correct_looking_percent']:.2f}%) |
| Low (<0.80) | {tiers['low (<0.80)']['observations']} | {tiers['low (<0.80)']['retained']} ({tiers['low (<0.80)']['retained_percent']:.2f}%) | {tiers['low (<0.80)']['manual_correct_looking']} ({tiers['low (<0.80)']['manual_correct_looking_percent']:.2f}%) |

The two lower-tier observations are too few to support any confidence-calibration conclusion. The high tier is also not cleanly calibrated: {tiers['high (0.95–1.00)']['manual_correct_looking_percent']:.2f}% looked correct under this manual rubric, mainly because high entailment confidence can coexist with a wrong attribute label. Treat these figures as a debugging signal, not model reliability.

## Reproducibility

The JSON artifact includes all 27 decisions and the manual note applied to each. The six supported label assignments counted as questionable are declared in `backend/scripts/publish_confidence_self_check.py`; the bandsaw voltage rejection is separately identified. Changing the rubric therefore produces a reviewable diff rather than an unexplained metric.
"""

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    json_path = ARTIFACT_DIR / "confidence_self_check.json"
    md_path = ARTIFACT_DIR / "CONFIDENCE_SELF_CHECK.md"
    json_path.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(markdown, encoding="utf-8")
    shutil.copy2(json_path, PUBLIC_DIR / json_path.name)
    shutil.copy2(md_path, PUBLIC_DIR / md_path.name)
    print(json.dumps({"observations": len(observations), "by_entailment": artifact["by_entailment"]}))


if __name__ == "__main__":
    main()
