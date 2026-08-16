"""Publish reproducible, documentation-only SpecForge reference artifacts."""

from __future__ import annotations

import csv
import json
import shutil
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any


BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
sys.path.insert(0, str(BACKEND_ROOT / "src"))

from specforge.contracts import AttributeValue  # noqa: E402
from specforge.data import DatasetInfo, inspect_csv, iter_csv_rows  # noqa: E402
from specforge.normalization import (  # noqa: E402
    UOM_ALIASES,
    decimal_text_to_fraction,
    normalize_candidate,
)
from specforge.stages.clean import clean_optional  # noqa: E402
from specforge.vocabulary import (  # noqa: E402
    EntityVocabulary,
    display_name,
    entity_key,
)


DATA_DIR = BACKEND_ROOT / "data"
ARTIFACT_DIR = DATA_DIR / "artifacts"
PUBLIC_DIR = REPO_ROOT / "specforage-app" / "public" / "artifacts"

LEGAL_SUFFIXES = [
    "Co",
    "Company",
    "Corp",
    "Corporation",
    "Inc",
    "Incorporated",
    "LLC",
    "Ltd",
    "Limited",
    "PLC",
]

BRIDGE_ROWS: list[dict[str, Any]] = [
    {
        "unspsc_code": "52141505",
        "commodity": "Domestic dish washers",
        "unilog_style_classpath": "Appliances & Consumer Electronics>Kitchen Appliances>Built-In Dishwashers",
        "confidence": "high",
        "basis": "Exact private classpath observed in both supplied ground-truth rows; UNSPSC association manually curated.",
        "caveat": "Ground-truth UNSPSC cells are blank, so the code-to-path link is curator-supplied.",
    },
    {
        "unspsc_code": "27111507",
        "commodity": "Metal cutters",
        "unilog_style_classpath": "Tools & Hardware>Cutting Tools>Metal Cutters",
        "confidence": "medium",
        "basis": "Manual merchandising-style label from the resolved UNSPSC hierarchy.",
        "caveat": "Dual cut/grind discs may merchandise under Abrasive Discs or Grinders instead.",
    },
    {
        "unspsc_code": "31191506",
        "commodity": "Abrasive discs",
        "unilog_style_classpath": "Tools & Hardware>Abrasives>Abrasive Discs",
        "confidence": "medium",
        "basis": "Manual curation for the sibling candidate observed in disc tests.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "30103102",
        "commodity": "Aluminum rail",
        "unilog_style_classpath": "Building Materials>Decking & Railing>Aluminum Railing",
        "confidence": "medium",
        "basis": "Manual curation from the explicit railing product noun and UNSPSC hierarchy.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "30171501",
        "commodity": "Glass doors",
        "unilog_style_classpath": "Building Materials>Doors & Windows>Glass & Patio Doors",
        "confidence": "medium",
        "basis": "Manual curation from the tested Low-E patio-door listings.",
        "caveat": "The path groups patio and general glass doors for this small bridge.",
    },
    {
        "unspsc_code": "40101609",
        "commodity": "Ceiling fan",
        "unilog_style_classpath": "Appliances & Consumer Electronics>Heating, Cooling & Air Quality>Ceiling Fans",
        "confidence": "medium",
        "basis": "Manual curation from ceiling-fan tests and the UNSPSC hierarchy.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "27112748",
        "commodity": "Miter saw",
        "unilog_style_classpath": "Tools & Hardware>Power Tools>Miter Saws",
        "confidence": "medium",
        "basis": "Manual curation from the explicit DeWalt miter-saw test.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "30111504",
        "commodity": "Mortars",
        "unilog_style_classpath": "Building Materials>Concrete, Cement & Masonry>Mortar",
        "confidence": "medium",
        "basis": "Manual curation from the mortar working-set item.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "39122211",
        "commodity": "Toggle switch",
        "unilog_style_classpath": "Electrical>Switches & Controls>Toggle Switches",
        "confidence": "medium",
        "basis": "Manual curation from the toggle-switch working-set item.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "44122107",
        "commodity": "Staples",
        "unilog_style_classpath": "Tools & Hardware>Fasteners>Staples",
        "confidence": "medium",
        "basis": "Manual curation from the staples working-set item.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "27112812",
        "commodity": "Countersinks",
        "unilog_style_classpath": "Tools & Hardware>Drill Bits & Accessories>Countersinks",
        "confidence": "medium",
        "basis": "Manual curation from the countersink working-set item.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "23101514",
        "commodity": "Planing machines",
        "unilog_style_classpath": "Tools & Hardware>Woodworking Tools>Planers",
        "confidence": "medium",
        "basis": "Manual curation from the Mafell planer working-set item.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "23101525",
        "commodity": "Oscillating spindle sander",
        "unilog_style_classpath": "Tools & Hardware>Woodworking Tools>Spindle Sanders",
        "confidence": "medium",
        "basis": "Manual curation from the Grizzly sander working-set item.",
        "caveat": "No supplied private-taxonomy row confirms this path.",
    },
    {
        "unspsc_code": "26111710",
        "commodity": "Product specific battery packs",
        "unilog_style_classpath": "Tools & Hardware>Power Tool Accessories>Batteries & Chargers",
        "confidence": "low",
        "basis": "Manual curation from a combined Kreg battery/charger kit.",
        "caveat": "A kit is broader than the selected battery-pack commodity.",
    },
    {
        "unspsc_code": "23231101",
        "commodity": "Bandsaw wheel",
        "unilog_style_classpath": "Tools & Hardware>Power Tool Accessories>Band Saw Parts",
        "confidence": "low",
        "basis": "Manual commodity-level bridge for the resolved UNSPSC code.",
        "caveat": "The tested item was a complete bandsaw and is likely misclassified as this component.",
    },
    {
        "unspsc_code": "25172608",
        "commodity": "Fascias",
        "unilog_style_classpath": "Automotive>Exterior Accessories>Fascias",
        "confidence": "low",
        "basis": "Manual commodity-level bridge from the vehicle UNSPSC hierarchy.",
        "caveat": "Do not apply to the tested PVC building fascia; that classification is a known domain collision.",
    },
    {
        "unspsc_code": "51287008",
        "commodity": "Solasulfone",
        "unilog_style_classpath": "Healthcare>Pharmaceuticals>Antibacterial Sulfones",
        "confidence": "low",
        "basis": "Manual commodity-level bridge from the pharmaceutical UNSPSC hierarchy.",
        "caveat": "Do not apply to the tested skylight; that classification is a known lexical collision.",
    },
    {
        "unspsc_code": "26121545",
        "commodity": "Portable electrical cord",
        "unilog_style_classpath": "Electrical>Wire & Cable>Portable Cord",
        "confidence": "medium",
        "basis": "Manual curation from the prior SJEWA portable-cord test.",
        "caveat": "Does not cover every wire construction, including unresolved aluminum triplex wire.",
    },
]


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _dataset(path: Path) -> DatasetInfo:
    return inspect_csv(path)


def _entity_artifact() -> dict[str, Any]:
    working = _dataset(DATA_DIR / "sample_1000_items.csv")
    truth = _dataset(DATA_DIR / "ground_truth.csv")
    manufacturer_values: list[str] = []
    brand_values: list[str] = []
    pairings: dict[str, dict[str, str]] = {}

    for row in iter_csv_rows(working):
        if value := clean_optional(row.get("Part_Manuf")):
            manufacturer_values.append(value)
        for field in ("E1_Brand", "Unilog_Brand", "DIB_Brand"):
            if value := clean_optional(row.get(field)):
                brand_values.append(value)
    for row in iter_csv_rows(truth):
        manufacturer = clean_optional(row.get("MANUFACTURER_NAME"))
        brand = clean_optional(row.get("BRAND_NAME"))
        if manufacturer:
            manufacturer_values.append(manufacturer)
        if brand:
            brand_values.append(brand)
        if manufacturer and brand:
            pairings[entity_key(brand)] = {"brand": display_name(brand), "manufacturer": display_name(manufacturer)}

    def serialize(values: list[str]) -> dict[str, Any]:
        vocabulary = EntityVocabulary(values)
        entries: list[dict[str, Any]] = []
        fuzzy_aliases = 0
        normalized_aliases = 0
        unique_observations = {value for value in values if clean_optional(value)}
        for entry in vocabulary.entries:
            aliases = []
            for alias in entry.aliases:
                if display_name(alias) == entry.canonical_name:
                    reason = "canonical_or_repeated"
                elif entity_key(alias) == entry.key:
                    reason = "legal_suffix_punctuation_or_vendor_code"
                    normalized_aliases += 1
                else:
                    reason = "fuzzy_cluster_96_percent"
                    fuzzy_aliases += 1
                aliases.append({"observed": alias, "collapse_reason": reason})
            entries.append(
                {
                    "canonical_name": entry.canonical_name,
                    "comparison_key": entry.key,
                    "frequency": entry.frequency,
                    "aliases": aliases,
                }
            )
        denominator = len(unique_observations)
        return {
            "canonical_entries": len(entries),
            "unique_observed_strings": denominator,
            "total_observations": len(values),
            "fuzzy_collapsed_aliases": fuzzy_aliases,
            "fuzzy_collapsed_percent": round(100 * fuzzy_aliases / denominator, 2) if denominator else 0,
            "rule_normalized_aliases": normalized_aliases,
            "entries": entries,
        }

    return {
        "artifact": "Self-derived manufacturer and brand vocabulary",
        "source_files": ["sample_1000_items.csv", "ground_truth.csv"],
        "cluster_threshold_percent": 96,
        "canonical_policy": "Most frequent observed spelling; ties prefer the shortest sourced display name.",
        "legal_suffix_normalization": {
            "comparison_only": True,
            "suffixes_removed_when_trailing": LEGAL_SUFFIXES,
            "additional_rules": [
                "Convert ampersand to the token 'and' for comparison.",
                "Remove punctuation and case-fold for comparison.",
                "Remove one trailing parenthesized vendor identifier from display names.",
                "Preserve the selected sourced spelling as the canonical display value.",
            ],
        },
        "manufacturers": serialize(manufacturer_values),
        "brands": serialize(brand_values),
        "brand_manufacturer_pairings": sorted(pairings.values(), key=lambda row: row["brand"].casefold()),
    }


def _attribute_artifact() -> dict[str, Any]:
    truth = _dataset(DATA_DIR / "ground_truth.csv")
    observations: list[dict[str, Any]] = []
    label_columns = [
        (index, f"ATTRIBUTE_LABEL {index}")
        for index in range(1, 31)
        if f"ATTRIBUTE_LABEL {index}" in truth.headers
    ]
    for row in iter_csv_rows(truth):
        classpath = row.get("Classpath", "").strip()
        for index, label_column in label_columns:
            label = row.get(label_column, "").strip()
            value = row.get(f"ATTRIBUTE_VALUE {index}", "").strip()
            uom = row.get(f"ATTRIBUTE_UOM {index}", "").strip() or None
            if not (classpath and label and value):
                continue
            normalized, canonical_uom, valid = normalize_candidate(AttributeValue(label=label, value=value, uom=uom))
            if valid:
                observations.append(
                    {
                        "classpath": classpath,
                        "label": label,
                        "observed_value": value,
                        "observed_uom": uom,
                        "canonical_value": normalized,
                        "canonical_uom": canonical_uom,
                        "source": "ground_truth",
                        "collapse_reason": "uom_or_fraction_rule" if (value, uom) != (normalized, canonical_uom) else "first_seen_original",
                    }
                )

    working_results = json.loads((DATA_DIR / "working_set_results.json").read_text(encoding="utf-8"))["records"]
    for record in working_results:
        classpath = record["classification"].get("classpath")
        extracted_by_label = {item["label"]: item for item in record["extraction"]["attributes"]}
        for final in record["adjudication"]["final_attributes"]:
            extracted = extracted_by_label.get(final["label"], final)
            raw_value = extracted.get("value")
            raw_uom = extracted.get("uom")
            canonical_value = final.get("value")
            canonical_uom = final.get("uom")
            if not (classpath and raw_value and canonical_value):
                continue
            if raw_value != canonical_value and raw_uom == canonical_uom:
                reason = "fuzzy_collapse"
            elif (raw_value, raw_uom) != (canonical_value, canonical_uom):
                reason = "uom_or_fraction_rule"
            else:
                reason = "first_seen_original"
            observations.append(
                {
                    "classpath": classpath,
                    "label": final["label"],
                    "observed_value": raw_value,
                    "observed_uom": raw_uom,
                    "canonical_value": canonical_value,
                    "canonical_uom": canonical_uom,
                    "source": "working_set_trace",
                    "collapse_reason": reason,
                }
            )

    grouped: dict[tuple[str, str, str, str | None], list[dict[str, Any]]] = defaultdict(list)
    for item in observations:
        grouped[(item["classpath"], item["label"], item["canonical_value"], item["canonical_uom"])].append(item)
    entries = []
    for (classpath, label, value, uom), aliases in sorted(grouped.items()):
        unique_aliases = []
        seen = set()
        for alias in aliases:
            key = (alias["observed_value"], alias["observed_uom"])
            if key not in seen:
                seen.add(key)
                unique_aliases.append(
                    {
                        "value": alias["observed_value"],
                        "uom": alias["observed_uom"],
                        "source": alias["source"],
                        "collapse_reason": alias["collapse_reason"],
                    }
                )
        entries.append(
            {
                "classpath": classpath,
                "label": label,
                "canonical_value": value,
                "canonical_uom": uom,
                "observed_aliases": unique_aliases,
            }
        )

    fuzzy = sum(item["collapse_reason"] == "fuzzy_collapse" for item in observations)
    total = len(observations)
    return {
        "artifact": "Self-building attribute vocabulary snapshot",
        "scope": "Seeded by the two supplied truth rows and extended with accepted values in the published 30-row trace.",
        "matching_threshold": 0.9,
        "canonical_entries": len(entries),
        "observed_values": total,
        "fuzzy_collapsed_values": fuzzy,
        "fuzzy_collapsed_percent": round(100 * fuzzy / total, 2) if total else 0,
        "note": "No fuzzy near-duplicate collapse occurred in the currently published traces; this is reported as 0%, not backfilled with invented aliases.",
        "entries": entries,
    }


def _uom_artifact() -> dict[str, Any]:
    examples = ["1.5", "2.25", "0.125", "3.875", "-1.5", "24.25 in", "50.1875"]
    return {
        "artifact": "Universal UOM and decimal-to-fraction rules",
        "canonical_uom_count": len(UOM_ALIASES),
        "alias_count_including_canonical": sum(len(set((canonical, *aliases))) for canonical, aliases in UOM_ALIASES.items()),
        "uom_aliases": {key: list(values) for key, values in UOM_ALIASES.items()},
        "decimal_to_fraction": {
            "maximum_denominator": 64,
            "rounding": "ROUND_HALF_UP to the nearest 1/64",
            "application": "Applied to inch/foot values and dimensional attribute labels only.",
            "examples": [{"before": value, "after": decimal_text_to_fraction(value)} for value in examples],
        },
    }


def _bridge_artifact() -> dict[str, Any]:
    return {
        "artifact": "Small manually curated UNSPSC-to-Unilog-style taxonomy bridge",
        "method": "Manual curation from the one private classpath pattern present in ground truth plus merchandising-style names for categories exercised in testing.",
        "coverage": {
            "mapped_unspsc_commodities": len(BRIDGE_ROWS),
            "observed_private_paths": 1,
            "comprehensive": False,
        },
        "warning": "This table is presentation metadata, not pipeline classification logic. Low-confidence rows and known misclassifications remain visibly caveated.",
        "mappings": BRIDGE_ROWS,
    }


def _markdown(entity: dict[str, Any], attributes: dict[str, Any], uom: dict[str, Any], bridge: dict[str, Any]) -> str:
    manufacturers = entity["manufacturers"]
    brands = entity["brands"]

    observed_entity_examples: list[tuple[str, str, str]] = []
    for group_name in ("manufacturers", "brands"):
        for entry in entity[group_name]["entries"]:
            for alias in entry["aliases"]:
                if alias["collapse_reason"] != "canonical_or_repeated":
                    observed_entity_examples.append((alias["observed"], entry["canonical_name"], alias["collapse_reason"]))
    entity_examples = observed_entity_examples[:10]
    if len(entity_examples) < 5:
        entity_examples.extend(
            [
                ("Acme, Inc.", "Acme", "legal-suffix rule demonstration"),
                ("Acme LLC", "Acme", "legal-suffix rule demonstration"),
                ("Acme Corporation", "Acme", "legal-suffix rule demonstration"),
                ("Smith & Company", "Smith", "ampersand + trailing-suffix rule demonstration"),
                ("Example Corp (V123)", "Example", "vendor-code + suffix rule demonstration"),
            ][: 5 - len(entity_examples)]
        )

    attribute_examples = []
    for entry in attributes["entries"]:
        for alias in entry["observed_aliases"]:
            before = f"{alias['value']} {alias['uom'] or ''}".strip()
            after = f"{entry['canonical_value']} {entry['canonical_uom'] or ''}".strip()
            if before != after:
                attribute_examples.append((before, after, alias["collapse_reason"]))
    attribute_examples.extend(
        [
            ("Alum", "Alum", "first-seen canonical; no expansion invented"),
            ("Black", "Black", "first-seen canonical"),
            ("6068R", "6068R", "first-seen canonical"),
            ("Gliding Patio Dr 4500", "Gliding Patio Dr 4500", "first-seen canonical"),
            ("Leg Mount", "not observed / not collapsed", "example intentionally not claimed by this snapshot"),
        ]
    )

    lines = [
        "# Published Reference Vocabularies",
        "",
        "These files are reproducible snapshots built only from `sample_1000_items.csv`, `ground_truth.csv`, and the accepted values in `working_set_results.json`. They are reference artifacts, not external standards.",
        "",
        "## Inventory",
        "",
        "| Artifact | Size | Fuzzy-collapsed share |",
        "|---|---:|---:|",
        f"| Manufacturer vocabulary | {manufacturers['canonical_entries']} canonical entries from {manufacturers['unique_observed_strings']} unique strings | {manufacturers['fuzzy_collapsed_percent']:.2f}% |",
        f"| Brand vocabulary | {brands['canonical_entries']} canonical entries from {brands['unique_observed_strings']} unique strings | {brands['fuzzy_collapsed_percent']:.2f}% |",
        f"| Attribute vocabulary snapshot | {attributes['canonical_entries']} canonical classpath/label/value entries from {attributes['observed_values']} accepted observations | {attributes['fuzzy_collapsed_percent']:.2f}% |",
        f"| Universal UOM table | {uom['canonical_uom_count']} canonical units; {uom['alias_count_including_canonical']} accepted spellings | Not applicable—exact alias table |",
        f"| Taxonomy bridge | {bridge['coverage']['mapped_unspsc_commodities']} mapped UNSPSC commodities | Not applicable—manual curation |",
        "",
        "## Manufacturer and Brand Rules",
        "",
        "Entity clustering uses a 96% RapidFuzz ratio threshold after comparison-only normalization. Trailing `Co`, `Company`, `Corp`, `Corporation`, `Inc`, `Incorporated`, `LLC`, `Ltd`, `Limited`, and `PLC` are removed; ampersands become `and`; punctuation and case are ignored; and a trailing parenthesized vendor identifier is removed. The most frequent observed spelling remains the display value.",
        "",
        "| Before | Canonical / comparison result | Why |",
        "|---|---|---|",
        *[f"| `{before}` | `{after}` | {reason.replace('_', ' ')} |" for before, after, reason in entity_examples[:10]],
        "",
        "## Attribute Vocabulary",
        "",
        "Values are scoped by classpath and attribute label. The first valid value creates a canonical bucket; later values must match a same-UOM canonical value at 0.90 WRatio or are rejected. The published traces produced no genuine fuzzy near-duplicate collapses, so the measured fuzzy-collapse rate is 0%.",
        "",
        "| Before | Canonical result | Why |",
        "|---|---|---|",
        *[f"| `{before}` | `{after}` | {reason.replace('_', ' ')} |" for before, after, reason in attribute_examples[:10]],
        "",
        "`Leg Mount → Leg` is therefore **not** asserted: `Leg Mount` does not occur in the supplied or published trace data. `Leg` is a ground-truth value for Mounting Type, but inventing an unseen alias would misrepresent the artifact.",
        "",
        "## UOM and Fractions",
        "",
        "The UOM table is universal code-owned configuration rather than a learned file. Decimal dimensions round half-up to the nearest 1/64 and reduce to a mixed fraction. Conversion is limited to inch/foot values or dimensional labels.",
        "",
        "| Before | After |",
        "|---|---|",
        *[f"| `{item['before']}` | `{item['after']}` |" for item in uom["decimal_to_fraction"]["examples"]],
        "",
        "Representative UOM aliases include `volts → V`, `amps → A`, `inches → in`, `feet → ft`, `pounds → lb`, `watts → W`, `gallons per minute → GPM`, and `kilowatt-hours → kW-hr`.",
        "",
        "## Taxonomy Bridge",
        "",
        f"The bridge covers **{bridge['coverage']['mapped_unspsc_commodities']} UNSPSC commodities** exercised during testing. Only the dishwasher private path was observed in ground truth; all other paths are explicitly manual merchandising-style proposals. The bridge is displayed beside UNSPSC output but is not used to alter classification, audit scores, or Delivery Format values.",
        "",
        "See `taxonomy_bridge.csv` or `taxonomy_bridge.json` for confidence and row-specific caveats.",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    entity = _entity_artifact()
    attributes = _attribute_artifact()
    uom = _uom_artifact()
    bridge = _bridge_artifact()

    payloads = {
        "manufacturer_brand_vocabulary.json": entity,
        "attribute_vocabulary.json": attributes,
        "uom_rules.json": uom,
        "taxonomy_bridge.json": bridge,
    }
    for filename, payload in payloads.items():
        _write_json(ARTIFACT_DIR / filename, payload)

    with (ARTIFACT_DIR / "taxonomy_bridge.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(BRIDGE_ROWS[0]))
        writer.writeheader()
        writer.writerows(BRIDGE_ROWS)

    (ARTIFACT_DIR / "VOCABULARIES.md").write_text(
        _markdown(entity, attributes, uom, bridge), encoding="utf-8"
    )

    for path in ARTIFACT_DIR.iterdir():
        if path.is_file():
            shutil.copy2(path, PUBLIC_DIR / path.name)

    print(
        json.dumps(
            {
                "manufacturers": entity["manufacturers"]["canonical_entries"],
                "brands": entity["brands"]["canonical_entries"],
                "attributes": attributes["canonical_entries"],
                "uom": uom["canonical_uom_count"],
                "bridge": bridge["coverage"]["mapped_unspsc_commodities"],
            }
        )
    )


if __name__ == "__main__":
    main()
