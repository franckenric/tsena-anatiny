import os
import secrets
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from dotenv import load_dotenv
from pydantic import AnyHttpUrl, EmailStr, HttpUrl, field_validator
from pydantic_settings import BaseSettings


def _load_shared_env() -> None:
    """Charge le .env commun a la racine du depot.

    Un seul fichier .env est partage par l'API et les deux fronts. On remonte
    depuis ce fichier jusqu'au premier .env trouve : en local il s'agit de
    <racine>/.env. Dans Docker, la source est montee sous /app et les variables
    sont deja injectees par docker-compose, donc rien n'est trouve (no-op).
    """
    for parent in Path(__file__).resolve().parents:
        candidate = parent / ".env"
        if candidate.is_file():
            load_dotenv(candidate)
            return


_load_shared_env()


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

    # Nom du projet, pilote par la variable d'environnement PROJECT_NAME.
    # Utilise par le titre Swagger (docs), la facture (ticket 58mm) et les
    # emails transactionnels.
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Tsena Anatiny")

    # URL publique du front-office : lien "Acceder a la boutique" et signature
    # des emails transactionnels. Vide = pas de lien dans les emails.
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://gabbieboutique.com")

    SQLITE_DATABASE: str = os.getenv("SQLITE_DATABASE", "app.db")

    # MySQL configuration
    MYSQL_SERVER: str = os.getenv("MYSQL_SERVER", "localhost")
    MYSQL_PORT: int = int(os.getenv("MYSQL_PORT", "3306"))
    MYSQL_USER: str = os.getenv("MYSQL_USER", "root")
    MYSQL_PASSWORD: str = os.getenv("MYSQL_PASSWORD", "")
    MYSQL_DATABASE: str = os.getenv("MYSQL_DATABASE", "")

    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_SERVER}:{MYSQL_PORT}/{MYSQL_DATABASE}?charset=utf8mb4",
    )

    # Authentication settings
    SECRET_KEY: str = secrets.token_urlsafe(32)
    # 60 minutes * 24 hours * 7 days = 7 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7
    
    EMAIL_TEST_USER: EmailStr = "test@example.com"  # type: ignore
    FIRST_SUPERUSER: EmailStr = os.getenv("FIRST_SUPERUSER", "admin@example.com")
    LAST_NAME_SUPERUSER: str = os.getenv("LAST_NAME_SUPERUSER", "Admin")
    FIRST_NAME_SUPERUSER: str = os.getenv("FIRST_NAME_SUPERUSER", "Super")
    FIRST_SUPERUSER_PASSWORD: str = os.getenv("FIRST_SUPERUSER_PASSWORD", "admin123")

    # Facebook OAuth
    FACEBOOK_APP_ID: str = os.getenv("FACEBOOK_APP_ID", "")
    FACEBOOK_APP_SECRET: str = os.getenv("FACEBOOK_APP_SECRET", "")

    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")

    # Gmail SMTP: envoi du code de verification par email.
    # SMTP_USER = adresse Gmail, SMTP_PASSWORD = mot de passe d'application
    # Google (16 caracteres), PAS le mot de passe du compte.
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    # Adresse d'expedition affichee; retombe sur SMTP_USER si vide.
    SMTP_FROM: str = os.getenv("SMTP_FROM", "")
    SMTP_STARTTLS: bool = os.getenv("SMTP_STARTTLS", "1").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    # ── Web Push (VAPID) ─────────────────────────────────────────────────────
    # Notifications et badge sur l'icone de l'application, meme app fermee.
    # Ca n'a RIEN a voir avec le SMTP : le push passe par le service de push
    # du navigateur (FCM pour Android/Chrome, APNs pour iOS/Safari). Une
    # erreur de configuration ici n'empeche jamais l'envoi d'un email.
    #
    # Les cles se generent UNE fois puis ne changent plus : regenerer la cle
    # privee invalide tous les abonnements existants. Voir
    # `docs/push.md` (script `scripts/generate_vapid_keys.py`).
    # Sans ces variables, l'API repond 503 sur /push/vapid-public-key et le
    # badge reste un simple compteur affiche dans l'application ouverte.
    VAPID_PUBLIC_KEY: str = os.getenv("VAPID_PUBLIC_KEY", "")
    VAPID_PRIVATE_KEY: str = os.getenv("VAPID_PRIVATE_KEY", "")
    # Contact obligatoire (RFC 8292) : une URL https ou un mailto.
    VAPID_SUBJECT: str = os.getenv("VAPID_SUBJECT", "mailto:contact@gabbieboutique.com")


settings = Settings()
