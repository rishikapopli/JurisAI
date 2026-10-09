import os
from typing import List
from pydantic import BaseModel, Field

class Settings(BaseModel):
    PROJECT_NAME: str = "JURISAI"
    VERSION: str = "1.1.0"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "jurisai-development-secret-key-32chars-long-min!")
    SESSION_COOKIE_NAME: str = "jurisai_session"
    CSRF_COOKIE_NAME: str = "jurisai_csrf"
    SESSION_MAX_AGE_SECONDS: int = 86400 * 30
    IDLE_TIMEOUT_SECONDS: int = 1800

    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./jurisai.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "./storage")

    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "local")

    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

    CORS_ORIGINS: List[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "*"
    ]

    SMTP_HOST: str = os.getenv("SMTP_HOST", "localhost")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "1025"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "no-reply@jurisai.example")

settings = Settings()
