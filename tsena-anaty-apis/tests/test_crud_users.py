# begin #
# ---write your code here--- #
# end #

from fastapi import status
from app import crud, schemas
from sqlalchemy.orm import Session
from typing import Any, Dict
import pytest
from datetime import datetime, date, time, timedelta
import uuid
import random
"""Tests for CRUD operations on Users model."""


def test_create_users(db: Session):
    """Test create operation for Users."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='jbyL3@rytxp.com',
        password='kmPvQ',
        is_active=False,
        role_id=1,
        phone_numer='3b8AzlKx',
        address='rpS',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Assertions
    assert users.id is not None
    assert users.email == users_data.email
    assert users.is_active == users_data.is_active
    assert users.role_id == users_data.role_id
    assert users.phone_numer == users_data.phone_numer
    assert users.address == users_data.address


def test_update_users(db: Session):
    """Test update operation for Users."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='z0yjt@kyqvl.com',
        password='Ha3yd',
        is_active=False,
        role_id=1,
        phone_numer='i4HN6KVf',
        address='zxvLbOvg6bwWsu7mK130b4TLEifdBuq4tEQ50YEvXa5Sc8FPd18qt',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Precompute enum values for update
    enum_values_map = {}

    # Helper to compute a new value different from the current one
    def _updated_value(k, v):
        from decimal import Decimal

        if v is None:
            return 'updated_value'

        if isinstance(v, bool):
            return not v

        if isinstance(v, (int, float, Decimal)):
            return v + 1

        if k in enum_values_map:
            current = v.value if hasattr(v, 'value') else v
            values = enum_values_map[k]
            try:
                idx = values.index(current)
                if len(values) > 1:
                    return values[(idx + 1) % len(values)]
                else:
                    return current
            except ValueError:
                return values[0] if values else v

        if k in [] and isinstance(v, str):
            return (datetime.fromisoformat(v) + timedelta(days=1)).isoformat()
        if k in [] and isinstance(v, datetime):
            return v + timedelta(days=1)

        if k in [] and isinstance(v, str):
            return (date.fromisoformat(v) + timedelta(days=1)).isoformat()
        if k in [] and isinstance(v, date):
            return v + timedelta(days=1)

        if k in [] and isinstance(v, str):
            return (datetime.strptime(v, '%H:%M:%S') + timedelta(hours=1)).time().strftime('%H:%M:%S')
        if k in [] and isinstance(v, time):
            return (datetime.combine(date.today(), v) + timedelta(hours=1)).time()

        return f'updated_{v}'

    # Update data
    email_value = users.email
    is_active_value = users.is_active
    phone_numer_value = users.phone_numer
    address_value = users.address
    # Fields to exclude from update: ['id', 'hashed_password', 'role_id']
    update_data = schemas.UsersUpdate(**{
        k: _updated_value(k, v)
        for k, v in users_data.model_dump().items()
        if k not in ['id', 'hashed_password', 'role_id'] and v is not None and not isinstance(v, dict)
    })
    updated_users = crud.users.update(
        db=db, db_obj=users, obj_in=update_data
    )

    # Assertions
    assert updated_users.id == users.id
    assert updated_users.email != email_value
    assert updated_users.is_active != is_active_value
    assert updated_users.phone_numer != phone_numer_value
    assert updated_users.address != address_value


def test_get_users(db: Session):
    """Test get operation for Users."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='QXkBr@ryl55.com',
        password='9fMNw',
        is_active=True,
        role_id=1,
        phone_numer='o5t8ymU1kh',
        address='pcrJXgwJh0rateJ1rcjTfQNi8prd0qKV1S6y0oQFgHjuEUesh4K',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Get all records
    records = crud.users.get_multi_where_array(
        db=db,
        where=[
            {'key': 'deleted_at', 'operator': 'isNull'},
            {'key': 'created_at', 'operator': 'isNotNull'}
        ],
        base_columns=['id', 'email', 'hashed_password']
    )

    # Assertions
    assert len(records) > 0
    assert any(r.id == users.id for r in records)


def test_get_by_id_users(db: Session):
    """Test get_by_id operation for Users."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='8yqII@h1u4l.com',
        password='QIL2e',
        is_active=True,
        role_id=1,
        phone_numer='I7KPapSBss',
        address='nV19GQnBdxkrsbe2DmTYZIEakOw5u9pJEHWlO7wsA4aFME',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Get by ID
    retrieved_users = crud.users.get(
        db=db,
        id=users.id
    )

    # Assertions
    assert retrieved_users is not None
    assert retrieved_users.id == users.id
    assert retrieved_users.email == users.email
    assert retrieved_users.is_active == users.is_active
    assert retrieved_users.role_id == users.role_id
    assert retrieved_users.phone_numer == users.phone_numer
    assert retrieved_users.address == users.address


def test_delete_users(db: Session):
    """Test delete operation for Users."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='ETx6v@o1ip7.com',
        password='KvHsd',
        is_active=True,
        role_id=1,
        phone_numer='1RBvjpY',
        address='IFMGw9816NxMOWXyQqX0FhgwbV3j2fkgsgwCZCAvEd9FiwQzkf',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Delete record
    deleted_users = crud.users.remove(db=db, id=users.id)

    # Assertions
    assert deleted_users is not None
    assert deleted_users.id == users.id

    # Verify deletion
    assert crud.users.get(db=db, id=users.id) is None

# begin #
# ---write your code here--- #
# end #
