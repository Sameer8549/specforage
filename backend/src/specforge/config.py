from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_prefix="SPECFORGE_",
        extra="ignore",
    )

    env: str = "development"
    working_dataset: Path = Field(default=Path("data/sample_1000_items.csv"))
    ground_truth_dataset: Path = Field(default=Path("data/ground_truth.csv"))
    unspsc_dataset: Path = Field(default=Path("data/unspsc_codes.csv"))
    unspsc_embeddings: Path = Field(default=Path("data/unspsc_bge_small.float16.npy"))
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    expected_working_rows: int = 1000
    expected_ground_truth_rows: int = 2
    manufacturer_match_threshold: float = Field(default=0.86, ge=0, le=1)
    brand_match_threshold: float = Field(default=0.86, ge=0, le=1)
    classification_threshold: float = Field(default=0.42, ge=0, le=1)
    classification_tie_margin: float = Field(default=0.03, ge=0, le=1)

    def resolve_data_path(self, path: Path) -> Path:
        return path if path.is_absolute() else BACKEND_ROOT / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
