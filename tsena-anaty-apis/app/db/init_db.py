"""
Database seed data generated in correct order.
"""
import logging
from sqlalchemy.orm import Session
from app import crud, schemas
from app.db.session import SessionLocal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_db(db: Session) -> None:
    """Initialize database with tables and seed data."""
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next line
    # Base.metadata.create_all(bind=engine)

    # Skip Users

    # Skip Products

    # Skip CommercialAssignments

    # Skip StockMovements

    # Skip Orders
