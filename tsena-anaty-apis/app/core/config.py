import os
import secrets
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from dotenv import load_dotenv
from pydantic import AnyHttpUrl, EmailStr, HttpUrl, field_validator
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    model_config = {"case_sensitive": True}  # ← Double accolades pour échapper
    
    API_V1_STR: str = "/api/v1"

    # BACKEND_CORS_ORIGINS is a JSON-formatted list of origins
    # e.g: '["http://localhost", "http://localhost:4200", "http://localhost:3000", \
    # "http://localhost:8080", "http://local.dockertoolbox.tiangolo.com"]'
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = os.getenv("BACKEND_CORS_ORIGINS", [])

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "FastAPI Project")

    SQLITE_DATABASE: str = os.getenv("SQLITE_DATABASE", "app.db")
    SQLALCHEMY_DATABASE_URI: str = f"sqlite:///./{SQLITE_DATABASE}"

    # Authentication settings
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * 7 days = 7 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    EMAIL_TEST_USER: EmailStr = "test@example.com"  # type: ignore
    FIRST_SUPERUSER: EmailStr = os.getenv("FIRST_SUPERUSER", "admin@example.com")
    LAST_NAME_SUPERUSER: str = os.getenv("LAST_NAME_SUPERUSER", "Admin")
    FIRST_NAME_SUPERUSER: str = os.getenv("FIRST_NAME_SUPERUSER", "Super")
    FIRST_SUPERUSER_PASSWORD: str = os.getenv("FIRST_SUPERUSER_PASSWORD", "admin123")


settings = Settings()
