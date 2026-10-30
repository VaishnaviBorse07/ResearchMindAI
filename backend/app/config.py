from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # Application
    app_name: str = "ResearchMind AI"
    debug: bool = True
    secret_key: str = "change-this-secret-key-in-production-min-32-chars"

    # Database
    database_url: str = "sqlite+aiosqlite:///./research_mind.db"

    # Storage
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50

    # LLM
    openai_api_key: str = ""
    gemini_api_key: str = ""
    llm_provider: str = "local"  # "openai", "gemini", or "local"
    huggingface_token: str = ""

    # CORS
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # Models
    summarization_model: str = "facebook/bart-large-cnn"
    embedding_model: str = "all-MiniLM-L6-v2"
    ner_model: str = "en_core_web_sm"

    # Vector DB
    vector_db_type: str = "faiss"
    chroma_persist_dir: str = "./chroma_db"
    faiss_index_dir: str = "./faiss_indexes"

    # Processing
    max_chunk_size: int = 512
    chunk_overlap: int = 50

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Ensure required directories exist
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.faiss_index_dir, exist_ok=True)
os.makedirs(settings.chroma_persist_dir, exist_ok=True)
