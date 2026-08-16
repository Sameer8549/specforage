# Published Reference Vocabularies

These files are reproducible snapshots built only from `sample_1000_items.csv`, `ground_truth.csv`, and the accepted values in `working_set_results.json`. They are reference artifacts, not external standards.

## Inventory

| Artifact | Size | Fuzzy-collapsed share |
|---|---:|---:|
| Manufacturer vocabulary | 77 canonical entries from 77 unique strings | 0.00% |
| Brand vocabulary | 36 canonical entries from 36 unique strings | 0.00% |
| Attribute vocabulary snapshot | 46 canonical classpath/label/value entries from 48 accepted observations | 0.00% |
| Universal UOM table | 16 canonical units; 64 accepted spellings | Not applicable—exact alias table |
| Taxonomy bridge | 18 mapped UNSPSC commodities | Not applicable—manual curation |

## Manufacturer and Brand Rules

Entity clustering uses a 96% RapidFuzz ratio threshold after comparison-only normalization. Trailing `Co`, `Company`, `Corp`, `Corporation`, `Inc`, `Incorporated`, `LLC`, `Ltd`, `Limited`, and `PLC` are removed; ampersands become `and`; punctuation and case are ignored; and a trailing parenthesized vendor identifier is removed. The most frequent observed spelling remains the display value.

| Before | Canonical / comparison result | Why |
|---|---|---|
| `Acme, Inc.` | `Acme` | legal-suffix rule demonstration |
| `Acme LLC` | `Acme` | legal-suffix rule demonstration |
| `Acme Corporation` | `Acme` | legal-suffix rule demonstration |
| `Smith & Company` | `Smith` | ampersand + trailing-suffix rule demonstration |
| `Example Corp (V123)` | `Example` | vendor-code + suffix rule demonstration |

## Attribute Vocabulary

Values are scoped by classpath and attribute label. The first valid value creates a canonical bucket; later values must match a same-UOM canonical value at 0.90 WRatio or are rejected. The published traces produced no genuine fuzzy near-duplicate collapses, so the measured fuzzy-collapse rate is 0%.

| Before | Canonical result | Why |
|---|---|---|
| `20V` | `20 V` | uom or fraction rule |
| `Alum` | `Alum` | first-seen canonical; no expansion invented |
| `Black` | `Black` | first-seen canonical |
| `6068R` | `6068R` | first-seen canonical |
| `Gliding Patio Dr 4500` | `Gliding Patio Dr 4500` | first-seen canonical |
| `Leg Mount` | `not observed / not collapsed` | example intentionally not claimed by this snapshot |

`Leg Mount → Leg` is therefore **not** asserted: `Leg Mount` does not occur in the supplied or published trace data. `Leg` is a ground-truth value for Mounting Type, but inventing an unseen alias would misrepresent the artifact.

## UOM and Fractions

The UOM table is universal code-owned configuration rather than a learned file. Decimal dimensions round half-up to the nearest 1/64 and reduce to a mixed fraction. Conversion is limited to inch/foot values or dimensional labels.

| Before | After |
|---|---|
| `1.5` | `1-1/2` |
| `2.25` | `2-1/4` |
| `0.125` | `1/8` |
| `3.875` | `3-7/8` |
| `-1.5` | `-1-1/2` |
| `24.25 in` | `24-1/4 in` |
| `50.1875` | `50-3/16` |

Representative UOM aliases include `volts → V`, `amps → A`, `inches → in`, `feet → ft`, `pounds → lb`, `watts → W`, `gallons per minute → GPM`, and `kilowatt-hours → kW-hr`.

## Taxonomy Bridge

The bridge covers **18 UNSPSC commodities** exercised during testing. Only the dishwasher private path was observed in ground truth; all other paths are explicitly manual merchandising-style proposals. The bridge is displayed beside UNSPSC output but is not used to alter classification, audit scores, or Delivery Format values.

See `taxonomy_bridge.csv` or `taxonomy_bridge.json` for confidence and row-specific caveats.
