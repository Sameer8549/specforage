# SpecForge backend

FastAPI service and data contracts for the SpecForge enrichment pipeline.

## Development

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -e ".[dev]"
.venv\Scripts\uvicorn specforge.main:app --reload
```

The data loader validates headers and row counts at application startup. Paths and expected counts can be overridden with the environment variables shown in `.env.example`.

The Classify stage loads all 71,502 bundled UNSPSC commodities and uses a memory-mapped 5,313-class BGE-small float16 index (approximately 4 MB). Class vectors contain the full segment/family/class hierarchy; classification searches a broad semantic class pool and also performs global lexical retrieval across every commodity title. Run `python scripts/build_unspsc_index.py` from `backend/` to rebuild the matrix after replacing the taxonomy.

## Supplied data

- `data/sample_1000_items.csv`: 1,000 working rows and the six required input columns.
- `data/ground_truth.csv`: 252-column Delivery Format schema in its original header order. The locally supplied source has **2 rows**, despite the challenge prompt describing a 200-item ground truth. The mismatch is documented rather than hidden; replace this file with the full dataset and set `SPECFORGE_EXPECTED_GROUND_TRUTH_ROWS=200` when it is available.
