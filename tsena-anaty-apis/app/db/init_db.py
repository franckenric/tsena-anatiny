"""
Database seed data generated in correct order.
"""
import logging
from sqlalchemy.orm import Session
from app import crud, schemas
from app.models.roles import Roles

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ADMIN_PHONE = "0381759193"
ADMIN_PASSWORD = "Azerty123"
ADMIN_EMAIL = "admin@tsena.mg"
ADMIN_ROLE_ID = 1
CLIENT_ROLE_ID = 2


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

    # Skip Products

    # Skip StockMovements

    # Skip Orders
