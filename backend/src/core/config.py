"""
Configurações centralizadas da aplicação AuraLUX.

Carrega todas as variáveis do arquivo .env e fornece
type hints para toda a aplicação.

Uso:
    from src.core.config import settings
    print(settings.DATABASE_URL)
    print(settings.REDIS_HOST)
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configurações centralizadas do AuraLUX.
    """

    # ── Ambiente ───────────────────────────────────────────────────────────
    ENVIRONMENT: str = "development"  # development | staging | production
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # ── API ────────────────────────────────────────────────────────────────
    API_TITLE: str = "AuraLUX API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Smart Luminary — Ciclo Circadiano & Produtividade"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_RELOAD: bool = True

    # ── Banco de Dados ─────────────────────────────────────────────────────
    # SQLite para dev: sqlite:///./auralux.db
    # PostgreSQL para prod: postgresql://user:pass@host:5432/dbname?sslmode=require
    DATABASE_URL: str = "sqlite:///./auralux.db"

    # ── JWT ────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "auralux-mude-esta-chave-em-producao"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Redis ──────────────────────────────────────────────────────────────
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str | None = None
    REDIS_DB: int = 0

    # ── CORS ───────────────────────────────────────────────────────────────
    # Em dev: http://localhost:5173
    # Em prod: https://seu-frontend.com (separado por vírgula se múltiplos)
    CORS_ORIGINS: str = "http://localhost:5173"

    # ── Microsoft Outlook OAuth ────────────────────────────────────────────
    OUTLOOK_CLIENT_ID: str = "your-azure-app-client-id"
    OUTLOOK_CLIENT_SECRET: str = "your-azure-app-client-secret"
    OUTLOOK_TENANT_ID: str = "common"
    OUTLOOK_REDIRECT_URI: str = "http://localhost:5173/auth/outlook/callback"

    # ── Google Gemini AI ───────────────────────────────────────────────────
    GEMINI_API_KEY: str = "your-gemini-api-key"

    class Config:
        """Configuração do Pydantic para carregar variáveis de ambiente"""

        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """
    Retorna instância singleton de Settings.

    Uso:
        settings = get_settings()
        print(settings.GEMINI_API_KEY)
    """
    return Settings()  # type: ignore


# Exportar instância default para uso direto
settings = get_settings()
