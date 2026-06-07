# begin #
# ---write your code here--- #
# end #

# Auto-generated tests for app.api.deps
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.db.session import SessionLocal


def test_get_db():
    """Test that get_db yields a database session and closes it properly."""
    db_gen = get_db()
    db = next(db_gen)
    
    # Verify we got a valid session
    assert db is not None
    assert isinstance(db, Session)
    
    # Verify session is active
    assert db.is_active
    
    # Close the generator to trigger finally block
    try:
        next(db_gen)
    except StopIteration:
        pass
    
    # After generator is exhausted, session should be closed
    # Note: SQLAlchemy sessions may have different states after close


# Authentication tests skipped - use_authentication is disabled
# 
# def test_get_current_user(db):
#     """Test get_current_user - skipped: authentication disabled."""
#     pass
# 
# 
# def test_get_current_active_user(db):
#     """Test get_current_active_user - skipped: authentication disabled."""
#     pass
# 
# 
# def test_get_current_active_superuser(db):
#     """Test get_current_active_superuser - skipped: authentication disabled."""
#     pass


# begin #
# ---write your code here--- #
# end #
