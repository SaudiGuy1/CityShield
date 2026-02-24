"""Application configuration."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # OpenSearch
    opensearch_url: str = os.getenv("OPENSEARCH_URL", "http://opensearch:9200")
    opensearch_user: str = os.getenv("OPENSEARCH_USER", "admin")
    opensearch_pass: str = os.getenv("OPENSEARCH_PASS", "admin")

    # JWT
    jwt_secret: str = os.getenv("BACKEND_JWT_SECRET", "change-this-secret-key")
    jwt_algorithm: str = os.getenv("BACKEND_JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("BACKEND_ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Default Admin
    default_admin_user: str = os.getenv("DEFAULT_ADMIN_USER", "admin")
    default_admin_pass: str = os.getenv("DEFAULT_ADMIN_PASS", "admin")
    default_admin_email: str = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@cityshield.local")

    # Application
    app_name: str = "CityShield Backend API"
    app_version: str = "1.0.0"
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
