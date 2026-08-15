from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
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
    classification_sanity_threshold: float = Field(default=0.75, ge=0, le=1)
    classification_tie_margin: float = Field(default=0.03, ge=0, le=1)
    nvidia_base_url: str = "https://integrate.api.nvidia.com/v1"
    nvidia_model: str = "nvidia/nemotron-3.5-lightning-30b-a3b"
    nvidia_api_key: SecretStr | None = Field(
        default=None, validation_alias="NVIDIA_API_KEY"
    )
    adjudication_reasoning_budget: int = Field(default=16384, ge=1024, le=32768)
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_model: str = "openai/gpt-oss-20b"
    groq_api_key: SecretStr | None = Field(default=None, validation_alias="GROQ_API_KEY")
    llm_timeout_seconds: float = Field(default=30, gt=0)
    llm_max_retries: int = Field(default=2, ge=0, le=2)
    llm_retry_backoff_seconds: float = Field(default=0.5, ge=0, le=10)
    attribute_match_threshold: float = Field(default=0.90, ge=0, le=1)
    verification_confidence_threshold: float = Field(default=0.80, ge=0, le=1)

    def resolve_data_path(self, path: Path) -> Path:
        return path if path.is_absolute() else BACKEND_ROOT / path


@lru_cache
def get_settings() -> Settings:
    return Settings()
