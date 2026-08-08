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
"""Tests for CRUD operations on CommercialAssignments model."""


def test_create_commercial_assignments(db: Session):
    """Test create operation for CommercialAssignments."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='q1QaO@a3byi.com',
        password='oH6hA',
        is_active=True,
        role_id=1,
        phone_numer='bmPW2g8hCj',
        address='kfzvIRvbvwegRcEtn8GyuZjQxQKslSGgCur0nQ6mX8cQ6QQMODk1pSzY4tM3AgM9VkYgtLBytue5ygmzXt',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='kSh0TNHi',
        name='0T',
        description='v8LR8hOuNrV2TqUuCsUt2ECymP61fRMqpxBCUzVJ0FLuJ61z',
        image='KE7',
        category_id=1,
        cost_price=67.51,
        selling_price=25.98,
        unit='ZD',
        low_stock_alert=15,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for CommercialAssignments
    commercial_assignments_data = schemas.CommercialAssignmentsCreate(
        user_id=users.id,
        product_id=products.id,
        quantity=2,
    )

    commercial_assignments = crud.commercial_assignments.create(db=db, obj_in=commercial_assignments_data)
    db.commit()
    db.refresh(commercial_assignments)

    # Assertions
    assert commercial_assignments.id is not None
    assert commercial_assignments.user_id == commercial_assignments_data.user_id
    assert commercial_assignments.product_id == commercial_assignments_data.product_id
    assert commercial_assignments.quantity == commercial_assignments_data.quantity


def test_update_commercial_assignments(db: Session):
    """Test update operation for CommercialAssignments."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='6GM2V@z5i05.com',
        password='6XL1a',
        is_active=False,
        role_id=1,
        phone_numer='uqZc1ARKIQ',
        address='e0lb4QMDLkqtAaFuimvYMIFW2t6gOPX9Rq2zWydsvKSUvLXNm1TwSMmuXTaaW9rqrGHEvzzuYETw3cjN1DXxEY40',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='HvuwvS',
        name='RZob4u',
        description='0qScSioAjjBFCpwDPGUfXcAIB7wnaAsSPoTTB6hSZW0AJsO28svgEERrQZrnwgLwj8jtgTRs1UfcHPOuR5W6uPOUWS',
        image='5J',
        category_id=1,
        cost_price=21.71,
        selling_price=75.53,
        unit='jDDM',
        low_stock_alert=16,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for CommercialAssignments
    commercial_assignments_data = schemas.CommercialAssignmentsCreate(
        user_id=users.id,
        product_id=products.id,
        quantity=11,
    )

    commercial_assignments = crud.commercial_assignments.create(db=db, obj_in=commercial_assignments_data)
    db.commit()
    db.refresh(commercial_assignments)

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
    quantity_value = commercial_assignments.quantity
    # Fields to exclude from update: ['id', 'hashed_password', 'user_id', 'product_id']
    update_data = schemas.CommercialAssignmentsUpdate(**{
        k: _updated_value(k, v)
        for k, v in commercial_assignments_data.model_dump().items()
        if k not in ['id', 'hashed_password', 'user_id', 'product_id'] and v is not None and not isinstance(v, dict)
    })
    updated_commercial_assignments = crud.commercial_assignments.update(
        db=db, db_obj=commercial_assignments, obj_in=update_data
    )

    # Assertions
    assert updated_commercial_assignments.id == commercial_assignments.id
    assert updated_commercial_assignments.quantity != quantity_value


def test_get_commercial_assignments(db: Session):
    """Test get operation for CommercialAssignments."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='dOlpS@y08vo.com',
        password='cSvLs',
        is_active=True,
        role_id=1,
        phone_numer='ew5qml8yix',
        address='BFgJgTZIvAARHznVotIdgFuvxawX25pIAh1dMWqQbevegIO4pv23QAiakXwn9egV3JwwPhPqMkIGL',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='UN6sneZQ',
        name='XiFxZnW1e',
        description='8L2GL0zYNlWITeB2e6TB5w4XZQdENJ6vHgNKmnpx8vpQcdT9YSxMp2fN8GKV8yw6SQn3cDdVor',
        image='MWx',
        category_id=1,
        cost_price=83.76,
        selling_price=12.44,
        unit='1lY7GIJFNH',
        low_stock_alert=14,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for CommercialAssignments
    commercial_assignments_data = schemas.CommercialAssignmentsCreate(
        user_id=users.id,
        product_id=products.id,
        quantity=16,
    )

    commercial_assignments = crud.commercial_assignments.create(db=db, obj_in=commercial_assignments_data)
    db.commit()
    db.refresh(commercial_assignments)

    # Get all records with relations
    records = crud.commercial_assignments.get_multi_where_array(
        db=db,
        where=[
            {'key': 'deleted_at', 'operator': 'isNull'},
            {'key': 'created_at', 'operator': 'isNotNull'}
        ],
        relations=['user{email}', 'product{name}'],
        where_relation=[{'key': 'user.deleted_at', 'operator': 'isNull'}, {'key': 'product.deleted_at', 'operator': 'isNull'}],
        base_columns=['id']
    )

    # Assertions
    assert len(records) > 0
    assert any(r.id == commercial_assignments.id for r in records)


def test_get_by_id_commercial_assignments(db: Session):
    """Test get_by_id operation for CommercialAssignments."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='58uXv@p0qgx.com',
        password='d7eJc',
        is_active=False,
        role_id=1,
        phone_numer='L8AuFFR4vM',
        address='RZ1bWwOzR',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='F',
        name='HAjQK',
        description='BEDf3ZVRRM62npNELR8O5s7FitpPcM0KTbKDZ8PpGjGj0lcueh2E2RanNb9rP',
        image='iy',
        category_id=1,
        cost_price=23.76,
        selling_price=54.09,
        unit='SaHfsAb',
        low_stock_alert=2,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for CommercialAssignments
    commercial_assignments_data = schemas.CommercialAssignmentsCreate(
        user_id=users.id,
        product_id=products.id,
        quantity=5,
    )

    commercial_assignments = crud.commercial_assignments.create(db=db, obj_in=commercial_assignments_data)
    db.commit()
    db.refresh(commercial_assignments)

    # Get by ID with relations
    retrieved_commercial_assignments = crud.commercial_assignments.get_first_where_array(
        db=db,
        where=[
            {'key': 'deleted_at', 'operator': 'isNull'},
            {'key': 'created_at', 'operator': 'isNotNull'},
            {'key': 'id', 'operator': '==', 'value': commercial_assignments.id}
        ],
        relations=['user{email}', 'product{name}'],
        where_relation=[{'key': 'user.deleted_at', 'operator': 'isNull'}, {'key': 'product.deleted_at', 'operator': 'isNull'}],
        base_columns=['id']
    )

    # Assertions
    assert retrieved_commercial_assignments is not None
    assert retrieved_commercial_assignments.id == commercial_assignments.id
    assert retrieved_commercial_assignments.user_id == commercial_assignments.user_id
    assert retrieved_commercial_assignments.product_id == commercial_assignments.product_id
    assert retrieved_commercial_assignments.quantity == commercial_assignments.quantity


def test_delete_commercial_assignments(db: Session):
    """Test delete operation for CommercialAssignments."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='r7jKu@whjnq.com',
        password='LnME2',
        is_active=True,
        role_id=1,
        phone_numer='fhxnqQeT',
        address='whg3qgsofGRfOEAdWFkPJuhq5ZVxxWgDeQE4LkGg0qRNvaEGpcqLelrd',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='39oK3BbI4',
        name='PX',
        description='',
        image='nmdQcDey',
        category_id=1,
        cost_price=25.8,
        selling_price=83.03,
        unit='CiMUYxN3',
        low_stock_alert=6,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for CommercialAssignments
    commercial_assignments_data = schemas.CommercialAssignmentsCreate(
        user_id=users.id,
        product_id=products.id,
        quantity=9,
    )

    commercial_assignments = crud.commercial_assignments.create(db=db, obj_in=commercial_assignments_data)
    db.commit()
    db.refresh(commercial_assignments)

    # Delete record
    deleted_commercial_assignments = crud.commercial_assignments.remove(db=db, id=commercial_assignments.id)

    # Assertions
    assert deleted_commercial_assignments is not None
    assert deleted_commercial_assignments.id == commercial_assignments.id

    # Verify deletion
    assert crud.commercial_assignments.get(db=db, id=commercial_assignments.id) is None

# begin #
# ---write your code here--- #
# end #
