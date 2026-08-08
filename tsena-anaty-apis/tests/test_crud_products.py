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
"""Tests for CRUD operations on Products model."""


def test_create_products(db: Session):
    """Test create operation for Products."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='1dblhT',
        name='T',
        description='nMVg9ClPBByeee25QY2DiBMLDClYGuTa8bDf2XpvNVzTpohNnFDjl2jZfr0pez3B',
        image='DHWV',
        category_id=1,
        cost_price=57.4,
        selling_price=62.23,
        unit='DA6YFx90',
        low_stock_alert=1,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Assertions
    assert products.id is not None
    assert products.category_id == products_data.category_id
    assert products.sku == products_data.sku
    assert products.name == products_data.name
    assert products.description == products_data.description
    assert products.image == products_data.image
    assert products.selling_price == products_data.selling_price
    assert products.unit == products_data.unit
    assert products.low_stock_alert == products_data.low_stock_alert
    assert products.status == products_data.status


def test_update_products(db: Session):
    """Test update operation for Products."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='Agk',
        name='Gw1ezLrwa2',
        description='50q1YfwrOZIpSGOPr5TIqD5vPxRvjXgMVttraN0DLPTtmsSe1c',
        image='9aJqCrg5Do',
        category_id=1,
        cost_price=54.0,
        selling_price=28.65,
        unit='XOa731',
        low_stock_alert=9,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Precompute enum values for update
    enum_values_map = {}
    enum_values_map['status'] = ['active', 'inactive']

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
    sku_value = products.sku
    name_value = products.name
    description_value = products.description
    image_value = products.image
    selling_price_value = products.selling_price
    unit_value = products.unit
    low_stock_alert_value = products.low_stock_alert
    status_value = products.status
    # Fields to exclude from update: ['id', 'hashed_password', 'category_id']
    update_data = schemas.ProductsUpdate(**{
        k: _updated_value(k, v)
        for k, v in products_data.model_dump().items()
        if k not in ['id', 'hashed_password', 'category_id'] and v is not None and not isinstance(v, dict)
    })
    updated_products = crud.products.update(
        db=db, db_obj=products, obj_in=update_data
    )

    # Assertions
    assert updated_products.id == products.id
    assert updated_products.sku != sku_value
    assert updated_products.name != name_value
    assert updated_products.description != description_value
    assert updated_products.image != image_value
    assert updated_products.selling_price != selling_price_value
    assert updated_products.unit != unit_value
    assert updated_products.low_stock_alert != low_stock_alert_value
    assert updated_products.status != status_value


def test_get_products(db: Session):
    """Test get operation for Products."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='tKj9OprLG',
        name='LgdW3Ky',
        description='fXvDUpRhRzeWl4GKlGV',
        image='70fbVCX2',
        category_id=1,
        cost_price=14.19,
        selling_price=28.98,
        unit='z8f',
        low_stock_alert=1,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Get all records
    records = crud.products.get_multi_where_array(
        db=db,
        where=[
            {'key': 'deleted_at', 'operator': 'isNull'},
            {'key': 'created_at', 'operator': 'isNotNull'}
        ],
        base_columns=['id', 'sku']
    )

    # Assertions
    assert len(records) > 0
    assert any(r.id == products.id for r in records)


def test_get_by_id_products(db: Session):
    """Test get_by_id operation for Products."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='AF2C8LwMb',
        name='8hV2VWi',
        description='x0NJAESnEE66Jpp0qocgXbX2JNrEiAB3RtLzWBz0w2jLfknFoQkSEpdlgn4zp7GYADmdd',
        image='FcHKO',
        category_id=1,
        cost_price=82.08,
        selling_price=26.84,
        unit='s6Ik0jfiZ',
        low_stock_alert=10,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Get by ID
    retrieved_products = crud.products.get(
        db=db,
        id=products.id
    )

    # Assertions
    assert retrieved_products is not None
    assert retrieved_products.id == products.id
    assert retrieved_products.category_id == products.category_id
    assert retrieved_products.sku == products.sku
    assert retrieved_products.name == products.name
    assert retrieved_products.description == products.description
    assert retrieved_products.image == products.image
    assert retrieved_products.selling_price == products.selling_price
    assert retrieved_products.unit == products.unit
    assert retrieved_products.low_stock_alert == products.low_stock_alert
    assert retrieved_products.status == products.status


def test_delete_products(db: Session):
    """Test delete operation for Products."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='4ODQ96U',
        name='3Eiae',
        description='X2nZ7th',
        image='U88',
        category_id=1,
        cost_price=40.78,
        selling_price=23.35,
        unit='C',
        low_stock_alert=20,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Delete record
    deleted_products = crud.products.remove(db=db, id=products.id)

    # Assertions
    assert deleted_products is not None
    assert deleted_products.id == products.id

    # Verify deletion
    assert crud.products.get(db=db, id=products.id) is None

# begin #
# ---write your code here--- #
# end #
