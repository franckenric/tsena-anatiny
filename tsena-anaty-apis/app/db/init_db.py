"""
Database seed data generated in correct order.
"""
import json
import logging
from pathlib import Path
from sqlalchemy.orm import Session
from app import crud, schemas
from app.models.roles import Roles
from app.enum.status import StatusEnum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ADMIN_PHONE = "0381759193"
ADMIN_PASSWORD = "Azerty123"
ADMIN_EMAIL = "admin@tsena.mg"
ADMIN_ROLE_ID = 1
CLIENT_ROLE_ID = 2

# --- Donnees seed du catalogue ---
# Les categories vivent dans `seed_data/categories.json` : ajouter une
# categorie ne demande aucune modification de code, il suffit d'editer le
# fichier puis de relancer l'init (idempotent, aucune creation en doublon).
SEED_DATA_DIR = Path(__file__).resolve().parent / "seed_data"
CATEGORIES_FILE = SEED_DATA_DIR / "categories.json"


def _ensure_role(db: Session, *, role_id: int, name: str) -> Roles:
    """Cree le role `name` s'il n'existe pas encore.

    La recherche se fait par nom (et non par id) : un role ayant bouge ou un
    residuel ne doit jamais provoquer de doublon, la cle unique `roles.name`
    le rejetterait. L'id canonique est conserve quand il est libre, sinon on
    laisse l'auto-increment choisir.
    """
    role = db.query(Roles).filter(Roles.name == name).first()
    if role:
        logger.info("Role '%s' déjà existant (id=%s)", name, role.id)
        return role

    if db.query(Roles).filter(Roles.id == role_id).first() is None:
        role = Roles(id=role_id, name=name)
    else:
        role = Roles(name=name)
    db.add(role)
    db.commit()
    db.refresh(role)
    logger.info("Role '%s' créé (id=%s)", name, role.id)
    return role


def _ensure_category(db: Session, *, name: str, description: str) -> None:
    """Cree une categorie active si elle n'existe pas deja (cle unique `name`)."""
    category = crud.categories.get_by_field(db, field="name", value=name)
    if category:
        logger.info("Categorie '%s' déjà existante (id=%s)", name, category.id)
        return
    crud.categories.create(
        db,
        obj_in=schemas.CategoriesCreate(
            name=name,
            description=description,
            status=StatusEnum.active,
        ),
    )
    logger.info("Categorie '%s' créée", name)


def load_seed_categories() -> list[dict[str, str]]:
    """Charge la liste des categories depuis `seed_data/categories.json`.

    Le plus robuste pour une base qui va grossir : un fichier de donnees
    editable sans toucher au code. Retourne une liste vide (et log un
    avertissement) si le fichier est absent ou malforme, pour que l'init ne
    casse jamais l'application.
    """
    try:
        with CATEGORIES_FILE.open(encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning(
            "Fichier de categories introuvable ou invalide (%s): %s",
            CATEGORIES_FILE,
            exc,
        )
        return []

    if not isinstance(data, list):
        logger.warning(
            "%s doit contenir une liste d'objets {name, description}", CATEGORIES_FILE
        )
        return []

    return [
        {
            "name": entry["name"].strip(),
            "description": (entry.get("description") or "").strip(),
        }
        for entry in data
        if isinstance(entry, dict)
        and isinstance(entry.get("name"), str)
        and entry["name"].strip()
    ]


def init_db(db: Session) -> None:
    """Initialize database with tables and seed data."""
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next line
    # Base.metadata.create_all(bind=engine)

    # --- Roles --- (admin et client uniquement)
    admin_role = _ensure_role(db, role_id=ADMIN_ROLE_ID, name="super_admin")
    _ensure_role(db, role_id=CLIENT_ROLE_ID, name="client")

    # --- Admin user ---
    user = crud.users.get_by_phone(db, phone=ADMIN_PHONE)
    if not user:
        user_in = schemas.UsersCreate(
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            is_active=True,
            role_id=admin_role.id,
            phone_numer=ADMIN_PHONE,
        )
        user = crud.users.create(db, obj_in=user_in)
        logger.info("Utilisateur admin créé (phone=%s)", ADMIN_PHONE)
    else:
        logger.info("Utilisateur admin déjà existant (phone=%s)", ADMIN_PHONE)

    # --- Categories ---
    for entry in load_seed_categories():
        _ensure_category(db, name=entry["name"], description=entry["description"])

    # Skip Products

    # Skip StockMovements

    # Skip Orders
