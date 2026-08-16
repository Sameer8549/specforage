# SpecForge

SpecForge turns sparse distributor catalog rows into UNSPSC-classified, evidence-grounded product records while routing anything unsupported or uncertain to human review.

**Live frontend:** [specforage.vercel.app](https://specforage.vercel.app)  
**Live backend:** [specforge-backend-production.up.railway.app](https://specforge-backend-production.up.railway.app) ([API docs](https://specforge-backend-production.up.railway.app/docs))  
**Published artifacts:** [specforage.vercel.app/artifacts](https://specforage.vercel.app/artifacts)
**Repository:** [github.com/Sameer8549/specforage](https://github.com/Sameer8549/specforage)

## Never Invents Values

Every emitted attribute must be grounded in an allowed source excerpt and survive normalization, entailment verification, and conflict handling. When evidence is absent, ambiguous, or contradictory, SpecForge leaves the field empty and flags it for human review. That refusal to manufacture catalog data is a deliberate product decision: a visible gap is safer than a plausible-looking false value entering an ERP or PIM.

## Pipeline

```text
Raw catalog row
      |
      v
[01 Clean] --------------------- code
      |
[02 Resolve Manufacturer/Brand]  code + targeted web lookup
      |
[03 Classify] ------------------ embeddings/code; LLM sanity check when needed
      |
[04 Extract] ------------------- LLM, schema-constrained
      |
[05 Normalize & Constrain] ----- code
      |
[06 Verify] -------------------- LLM entailment + deterministic LOV/UOM checks
      |
[07 Adjudicate] ---------------- code normally; thinking LLM only for conflicts
      |
[08 Build Description] --------- code
      |
[09 Audit] --------------------- code
      |
[10 Output Mapper] ------------- code
      |
      v
Delivery Format record + provenance + review flags
```

The routine path limits model inference to three stages: Classify's low-confidence/tie sanity check, Extract, and Verify. Adjudicate makes an additional model call only when an actual evidence conflict exists; it is skipped for uncontested values. The other stages are deterministic code.

## Dual Results

These results are intentionally separate. The official set is scored against the only supplied labeled rows; the working set is unlabeled and reports observed system behavior, **not accuracy**.

| Measure | Official 2-row ground truth | Diverse 30-row working set |
|---|---:|---:|
| Evidence type | Scored against supplied truth where comparable | Self-reported behavior on unseen, unlabeled rows |
| Rows completed | 2/2 | 30/30 |
| Successfully classified | 2/2, but no compatible truth label for scoring | 46.67% (14/30) |
| Average classification confidence | Not aggregated by `/eval` | 0.392 overall; 0.840 among resolved rows |
| Rows with retained evidence-backed attributes | 2/2, with sparse yield | 46.67% (14/30) |
| Attribute coverage | 6.67% (2/30 expected values) | 19.84% (25/126 expected values on resolved rows) |
| Description character-limit compliance | 90.00% (9/10) | 74.29% (78/105) |
| Routed to review | 100% | 100% |
| Manufacturer exact accuracy | 50.00% | Not scored—no labels |
| Brand exact accuracy | 0.00% | Not scored—no labels |
| Classpath accuracy | Not directly comparable—no taxonomy mapping | Not scored—no labels |
| Overall official score | 2.63% across comparable exact-match fields | Not applicable |

See [RESULTS.md](RESULTS.md) for selection methodology, all 30 records, field-level metrics, and the complete evidence gallery.

## Example Gallery

### Aluminum railing — rich, grounded enrichment

Input `543340896`, brand `TREX`: “4x4-37\" Black Alum Post Sleeve Select Alum Railing - w/Cap & Skirt.” SpecForge selected `30103102 Aluminum rail` at **0.85**, retained `Material = Alum` and `Color = Black`, and verified both as `supported` at 1.00 using exact description excerpts. All five generated descriptions met their individual limits. The record still went to review because manufacturer confidence and seven expected fields remained unresolved.

### Low-E patio door — classification and evidence agree

Input `1517602`, brand `United Window & Door`: “6068R Gliding Patio Dr 4500 United Blk Ext/WH Int LowE Arg w/J.” SpecForge selected `30171501 Glass doors` at **0.85** and retained `Series = 6068R` and `Model = Gliding Patio Dr 4500`, each supported at 1.00 by exact excerpts. This is also the production playground smoke-test case.

### Cut/grind disc — refuses an unsupported value

Input `49-94-0907`: “Milw 4-1/2×1/8×5/8-11 Perform+ Dual Metal Cut n Grind Disc.” The classifier selected `27111507 Metal cutters` at **0.85** after considering nearby Grinders and Abrasive discs candidates. Extraction proposed `Series = Milw`, but verification marked it unsupported and conflict adjudication rejected it rather than treating a brand abbreviation as a series. Only the evidence-backed `Model = 49-94-0907` survived.

### Bandsaw — sibling-category failure disclosed

Input `JT1-549`: “JWBS18SFX 18\" Bandsaw - 1.75HP 1PH 115V.” SpecForge selected `23231101 Bandsaw wheel` at **0.793**, which is likely a component/sibling mismatch for a complete bandsaw. It retained only `Power Rating = 1.75HP` and routed the record to review. Because this row has no ground truth, the classification is reported as a likely failure by inspection—not scored as one.

The [full gallery](RESULTS.md#example-gallery) also includes miter saw, mortar, battery kit, stock-feeder ambiguity, and cross-domain homonym failures.

## Architecture Deep-Dive

1. **Clean.** Normalizes the six raw input columns and removes known placeholders such as “No Unilog Brand” so missing data cannot masquerade as evidence.
2. **Resolve Manufacturer/Brand.** Canonicalizes brand evidence, uses known brand–manufacturer pairings when available, and attempts a cached MPN lookup when brand evidence is absent. Distributor-supplied manufacturer text is a low-confidence last resort, not trusted as truth.
3. **Classify.** Searches the bundled public UNSPSC hierarchy using local BGE embeddings over full segment/family/class context plus lexical coverage across all 71,502 commodities. UNSPSC provides a portable public taxonomy; a private merchandising taxonomy would not generalize across catalogs. Low-score or close-candidate cases receive an LLM sanity check that may explicitly return `genuinely_ambiguous`.
4. **Extract.** Requests only attributes expected for the selected category (or a small generic fallback schema). The model must return schema-valid JSON with verbatim excerpts. Sparse rows may trigger retrieval, but only after a confident manufacturer and official domain are resolved.
5. **Normalize & Constrain.** Canonicalizes units and values with deterministic rules, then checks the vocabulary derived from the supplied files. It defines what forms are acceptable; it does not create missing facts.
6. **Verify.** Labels each extracted claim `supported`, `partially_supported`, `not_supported`, or `ambiguous` against its excerpt. Deterministic vocabulary and UOM decisions are combined with, never replaced by, the entailment result.
7. **Adjudicate.** Passes uncontested supported values through in code. Only real conflicts invoke the thinking-enabled model; mandatory source priority is official manufacturer site over catalog description, and unresolved conflicts remain null.
8. **Build Description.** Applies formulas learned from the supplied delivery-format rows and enforces each output field's character rule independently.
9. **Audit.** Measures attribute coverage, vocabulary compliance over produced values, description compliance, and confidence thresholds. It produces explicit field-level review flags rather than one opaque score.
10. **Output Mapper.** Maps accepted values into the original Delivery Format columns and attaches field provenance so every output can be traced back through the pipeline.

Manufacturer web retrieval is deliberately domain-restricted. Once an official domain is confidently resolved, retrieval may use that site as evidence; marketplaces and unrelated distributor pages cannot silently become authoritative sources.

The self-derived manufacturer/brand vocabulary, attribute snapshot, UOM rules, and limited 18-commodity taxonomy bridge are versioned under [`backend/data/artifacts/`](backend/data/artifacts/). Their measured sizes, collapse rates, normalization examples, curation method, and caveats are documented in [`VOCABULARIES.md`](backend/data/artifacts/VOCABULARIES.md) and can also be inspected or downloaded from the [live Artifacts page](https://specforage.vercel.app/artifacts). The bridge is presentation metadata only and does not alter pipeline classifications or evaluation scores.

## Model Stack, Cost, and Memory

| Responsibility | Model/service | Invocation policy |
|---|---|---|
| UNSPSC candidate retrieval | `BAAI/bge-small-en-v1.5` via FastEmbed | Local CPU embeddings; memory-mapped float16 index |
| Classify sanity/tie decision | `nvidia/nemotron-3.5-lightning-30b-a3b` | Only for close candidates or a top score below the sanity bar; thinking off |
| Extract | `nvidia/nemotron-3.5-lightning-30b-a3b` | One structured, non-streaming call when a class schema exists; thinking off |
| Verify | `nvidia/nemotron-3.5-lightning-30b-a3b` | One structured, non-streaming call when attributes exist; thinking off |
| Conflict adjudication | `nvidia/nemotron-3.5-lightning-30b-a3b` | Conflict cases only; thinking on with a 16,384-token reasoning budget |
| Optional provider fallback | Groq `openai/gpt-oss-20b` | Used only when configured and NVIDIA inference fails |

All generative calls use temperature 0, structured JSON schemas, and `stream=False`. Limiting calls to evidence-sensitive decisions controls latency and cost while leaving validation, normalization, descriptions, audit, and mapping deterministic. The measured Railway production footprint is **382.5 MB**, within the **512 MB** service budget; the memory-mapped UNSPSC embedding matrix is approximately **4 MB**.

## Known Limitations

- The supplied ground-truth file contains **2 rows, not 200**. Official metrics therefore describe two dishwasher records and should not be generalized into a broad accuracy claim.
- No official attribute vocabulary or LOV files were supplied. Expected attributes, normalization vocabulary, and description patterns are derived only from the two provided CSV files; generic fallback attributes improve coverage but cannot replace a real category vocabulary.
- The ground truth uses a private Unilog merchandising classpath while the public classifier emits UNSPSC, and both supplied ground-truth UNSPSC cells are blank. Classpath accuracy is therefore reported as not directly comparable rather than forced into a misleading exact-match score.
- Classification still has a precision ceiling on close siblings and lexical/domain collisions. Observed examples include Metal cutters versus Grinders/Abrasive discs, a complete bandsaw versus Bandsaw wheel, building fascia versus automotive fascia, and skylight versus Solasulfone.
- Manufacturer-site retrieval is intentionally conservative and often does not fire for sparse catalog rows because a trustworthy official domain cannot be established. This protects provenance but limits attribute yield.
- Every row in the current 30-row working set was routed to review. The system is useful as an evidence-preserving enrichment and triage pipeline, but the present data and thresholds do not support hands-off catalog publication.

## What We Would Improve with More Time

- Build a validated bridge between UNSPSC and the target retailer's private merchandising taxonomy.
- Add broader labeled examples and official category-specific attribute/LOV packages, then calibrate confidence thresholds on held-out data.
- Tighten sibling-category and cross-domain disambiguation using richer taxonomy definitions and domain-aware negative evidence.
- Expand and cache manufacturer/brand/MPN-to-official-domain coverage while preserving the official-site-only evidence rule.
- Improve description fitting so all five evaluated delivery fields remain within their independent character limits.
- Add a larger human-reviewed evaluation set so precision, recall, and review-routing utility can be measured rather than inferred.

## Run Locally

Requirements: Python 3.11+, Node.js 20+, and an NVIDIA API key. Groq is optional as a fallback. Never place keys in source code; both apps load local environment files that are ignored by Git.

### Backend

```bash
git clone https://github.com/Sameer8549/specforage.git
cd specforage/backend

python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
python -m pip install -e ".[dev]"

cp .env.example .env
# On Windows PowerShell: Copy-Item .env.example .env
# Edit .env and add NVIDIA_API_KEY. GROQ_API_KEY is optional.

uvicorn specforge.main:app --reload --host 0.0.0.0 --port 8000
```

Minimum backend environment:

```dotenv
NVIDIA_API_KEY=your_nvidia_key
# Optional fallback:
GROQ_API_KEY=your_groq_key
SPECFORGE_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

The API is then available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

Run backend tests with:

```bash
pytest
```

### Frontend

```bash
cd specforge/specforage-app
npm install
cp .env.example .env.local
# On Windows PowerShell: Copy-Item .env.example .env.local
```

For a local backend, set:

```dotenv
NEXT_PUBLIC_SPECFORGE_API_URL=http://localhost:8000
```

Then run:

```bash
npm run dev
# Quality checks:
npm run lint
npm run build
```

Open `http://localhost:3000/pipeline` to run the interactive playground and inspect or download the complete live trace.
