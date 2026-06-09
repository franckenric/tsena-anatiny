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


def init_db(db: Session) -> None:
    """Initialize database with tables and seed data."""
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next line
    # Base.metadata.create_all(bind=engine)

    # --- Roles ---
    role = db.query(Roles).filter(Roles.id == ADMIN_ROLE_ID).first()
    if not role:
        role = Roles(id=ADMIN_ROLE_ID, name="super_admin")
        db.add(role)
        db.commit()
        db.refresh(role)
        logger.info("Role 'super_admin' créé (id=%s)", role.id)
    else:
        logger.info("Role 'super_admin' déjà existant")

    # --- Admin user ---
    user = crud.users.get_by_phone(db, phone=ADMIN_PHONE)
    if not user:
        user_in = schemas.UsersCreate(
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            is_active=True,
            role_id=ADMIN_ROLE_ID,
            phone_numer=ADMIN_PHONE,
        )
        user = crud.users.create(db, obj_in=user_in)
        logger.info("Utilisateur admin créé (phone=%s)", ADMIN_PHONE)
    else:
        logger.info("Utilisateur admin déjà existant (phone=%s)", ADMIN_PHONE)

    # Skip Products

    # Skip CommercialAssignments

    # Skip StockMovements

    # Skip Orders
