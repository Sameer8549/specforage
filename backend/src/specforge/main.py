from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from specforge.config import get_settings
from specforge.data import DatasetCatalog, load_catalog


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.datasets = load_catalog(get_settings())
    yield


app = FastAPI(
    title="SpecForge API",
    version="0.1.0",
    description="Controlled-vocabulary product enrichment pipeline",
    lifespan=lifespan,
)


def get_dataset_catalog() -> DatasetCatalog:
    return app.state.datasets
