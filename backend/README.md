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

## Supplied data

- `data/sample_1000_items.csv`: 1,000 working rows and the six required input columns.
- `data/ground_truth.csv`: 252-column Delivery Format schema in its original header order. The locally supplied source has **2 rows**, despite the challenge prompt describing a 200-item ground truth. The mismatch is documented rather than hidden; replace this file with the full dataset and set `SPECFORGE_EXPECTED_GROUND_TRUTH_ROWS=200` when it is available.
