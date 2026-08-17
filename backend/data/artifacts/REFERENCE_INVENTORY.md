# Reference-data inventory

This inventory distinguishes supplied data, self-derived artifacts, and missing official reference packages. It must not be interpreted as proof that a self-derived artifact is an official Unilog standard.

| Artifact | Status | Origin / role |
|---|---:|---|
| Delivery Format header | Available | Supplied `ground_truth.csv`; exactly 252 ordered columns |
| Labeled ground truth | Partial | 2 supplied rows, not the challenge-described 200 rows |
| Working catalog | Available | 1,000 supplied raw rows |
| Official Unicat manufacturer/brand list | Missing | Required for strict submission mode |
| Official attribute LOV package | Missing | Required for strict submission mode |
| Self-derived manufacturer/brand vocabulary | Available | Derived from the two supplied CSV files; development fallback only |
| Self-derived attribute vocabulary | Available | Derived from populated ground-truth attribute slots; development fallback only |
| UOM normalization table | Available | Locally curated/self-derived; not represented as an official supplied standard |
| UNSPSC taxonomy/index | Available | Public UNSPSC taxonomy and local embeddings |

## Delivery schema version

- Column count: `252`
- Ordered-header SHA-256: `a8729c81fba2b174641d1d22ec40f4a5857c6699849d87ee077e97aff055d727`
- The backend validates count, uniqueness, required core fields, complete attribute slot triples, and ordered-header hash at startup.

## Strict mode

Set `SPECFORGE_REQUIRE_OFFICIAL_REFERENCE_DATA=true` only after configuring:

- `SPECFORGE_OFFICIAL_UNICAT_DATASET`
- `SPECFORGE_OFFICIAL_LOV_DATASET`

Strict mode fails startup if either official artifact is absent. Development mode remains available for the public demonstration but reports the missing official inputs through `/health`.

## LLM call-site audit

The intended rule is that LLM calls are permitted only in Extract, Verify, and Adjudicate. The current code audit found:

- Extract: LLM call — allowed.
- Verify: LLM call — allowed.
- Adjudicate: LLM call — allowed only when deterministic conflict detection finds competing, unsupported, or ambiguous evidence. No force/debug bypass exists.
- Classify: deterministic embedding retrieval and confidence/margin guards only. Close-margin and low-score results are unresolved and routed to review; no LLM call is permitted.

Manufacturer web lookup and manufacturer-site retrieval are external retrieval operations rather than LLM stages, but an official Unicat result must ultimately constrain the accepted entity identity in strict mode.
