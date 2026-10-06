import sys
from pathlib import Path

# Ajoute le répertoire parent au chemin Python
sys.path.append(str(Path(__file__).parent.parent))
from typing import Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from main import app
from app.db.base_class import Base
from app.db.session import SessionLocal
from app.db import session as db_session
from app.db import base
from app.api import deps

# Create an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 2. Patch global
db_session.SessionLocal = TestingSessionLocal

# Create tables
Base.metadata.create_all(bind=engine)


def get_db() -> Generator:
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()


# 5. Fixtures
@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        # Les endpoints de gestion back-office exigent le role super_admin.
        # On seede les deux roles de reference pour que `is_superuser` puisse
        # resoudre `user.role` en test (idem init_db.py en production).
        from app.models.roles import Roles
        if not db.query(Roles).filter(Roles.id == 1).first():
            db.add(Roles(id=1, name="super_admin"))
        if not db.query(Roles).filter(Roles.id == 2).first():
            db.add(Roles(id=2, name="client"))
        db.commit()
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def reset_rate_limiters():
    """Vide les compteurs de debit entre deux tests.

    Le limiteur est un store en memoire de processus partage par toute la
    session de test : sans cette remise a zero, le budget d'une IP (toujours
    `testclient`) serait consomme par les premiers tests et les suivants
    recevraient un 429.
    """
    deps.reset_rate_limits()
    yield
    deps.reset_rate_limits()


@pytest.fixture
def client(db):
    from main import app  # après le patch
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[deps.get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides = {}
