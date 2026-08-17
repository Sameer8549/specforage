# Official reference adapters

SpecForge does not rename self-derived data as official. When Unilog supplies its reference exports, configure the adapters below and enable strict mode.

## Unicat manufacturer and brand CSV

Required logical fields:

| Logical field | Accepted headers |
|---|---|
| Manufacturer ID | `Manufacturer ID`, `manufacturer_id`, `mfr_id`, `manufacturer_code` |
| Manufacturer name | `Manufacturer Name`, `manufacturer_name`, `mfr_name`, `manufacturer` |
| Brand ID | `Brand ID`, `brand_id`, `brand_code` |
| Brand name | `Brand Name`, `brand_name`, `brand` |

Manufacturer ID and name are required on usable rows. Brand ID and name are optional as a pair. A brand row establishes the official brand→manufacturer relationship. Resolved records retain both the official ID and canonical display name.

```env
SPECFORGE_OFFICIAL_UNICAT_DATASET=data/official/unicat.csv
```

## Attribute LOV CSV

Required logical fields:

| Logical field | Accepted headers |
|---|---|
| Classpath | `Classpath`, `classpath`, `category_path`, `category` |
| Attribute | `Attribute`, `attribute`, `attribute_name`, `label` |
| Canonical value | `Value`, `value`, `lov_value`, `canonical_value` |
| UOM | `UOM`, `uom`, `unit`, `unit_of_measure` (optional) |

The file drives both `expected_attributes` and `applicable_lovs` returned by Classify. Every `(Classpath, Attribute)` present in this file is treated as a closed vocabulary. Normalize & Constrain may canonicalize a sufficiently close input to an existing value, but it cannot append an unseen value.

```env
SPECFORGE_OFFICIAL_LOV_DATASET=data/official/attribute_lovs.csv
```

## Strict submission mode

```env
SPECFORGE_REQUIRE_OFFICIAL_REFERENCE_DATA=true
SPECFORGE_EXPECTED_GROUND_TRUTH_ROWS=200
```

Strict mode fails startup if either configured official artifact is absent. Adapter validation also fails on missing identity columns, empty usable datasets, and unsupported UOM values.
