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
"""Tests for CRUD operations on StockMovements model."""


def test_create_stock_movements(db: Session):
    """Test create operation for StockMovements."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='ZnDq0lt',
        name='6y6IFBHsLJ',
        description='I',
        image='Df1SC',
        cost_price=7.1,
        selling_price=99.83,
        unit='3R',
        low_stock_alert=0,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='MJG0F@uaq9r.com',
        password='LzSaA',
        is_active=False,
        phone_numer='OfbRrys4t',
        address='RCcjjifdd8VSEISUJbivLaMIwfddTKrUE3be8KZt6LykeZmOGfHR',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for StockMovements
    stock_movements_data = schemas.StockMovementsCreate(
        product_id=products.id,
        user_id=users.id,
        type='in_stock',
        quantity=5,
        stock_before=13,
        stock_after=20,
        reference='9XqgA65qf',
    )

    stock_movements = crud.stock_movements.create(db=db, obj_in=stock_movements_data)
    db.commit()
    db.refresh(stock_movements)

    # Assertions
    assert stock_movements.id is not None
    assert stock_movements.product_id == stock_movements_data.product_id
    assert stock_movements.user_id == stock_movements_data.user_id
    assert stock_movements.type == stock_movements_data.type
    assert stock_movements.quantity == stock_movements_data.quantity
    assert stock_movements.stock_before == stock_movements_data.stock_before
    assert stock_movements.stock_after == stock_movements_data.stock_after
    assert stock_movements.reference == stock_movements_data.reference


def test_update_stock_movements(db: Session):
    """Test update operation for StockMovements."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='YAIlk',
        name='sl0wQIOJOA',
        description='XN6IfW',
        image='yMkZ9BRUH',
        cost_price=96.51,
        selling_price=16.45,
        unit='gZw4',
        low_stock_alert=12,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='EkosC@qtd4q.com',
        password='0N3eS',
        is_active=True,
        phone_numer='QQcw',
        address='FOj9SUdEy6Q3bmmHeFG2vGzEFlnnSIrOcjNQPPqR',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for StockMovements
    stock_movements_data = schemas.StockMovementsCreate(
        product_id=products.id,
        user_id=users.id,
        type='in_stock',
        quantity=12,
        stock_before=3,
        stock_after=14,
        reference='lUR2',
    )

    stock_movements = crud.stock_movements.create(db=db, obj_in=stock_movements_data)
    db.commit()
    db.refresh(stock_movements)

    # Precompute enum values for update
    enum_values_map = {}
    enum_values_map['type'] = ['in_stock', 'out_stock']

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
    type_value = stock_movements.type
    quantity_value = stock_movements.quantity
    stock_before_value = stock_movements.stock_before
    stock_after_value = stock_movements.stock_after
    reference_value = stock_movements.reference
    # Fields to exclude from update: ['id', 'hashed_password', 'product_id', 'user_id']
    update_data = schemas.StockMovementsUpdate(**{
        k: _updated_value(k, v)
        for k, v in stock_movements_data.model_dump().items()
        if k not in ['id', 'hashed_password', 'product_id', 'user_id'] and not isinstance(v, dict)
    })
    updated_stock_movements = crud.stock_movements.update(
        db=db, db_obj=stock_movements, obj_in=update_data
    )

    # Assertions
    assert updated_stock_movements.id == stock_movements.id
    assert updated_stock_movements.type != type_value
    assert updated_stock_movements.quantity != quantity_value
    assert updated_stock_movements.stock_before != stock_before_value
    assert updated_stock_movements.stock_after != stock_after_value
    assert updated_stock_movements.reference != reference_value


def test_get_stock_movements(db: Session):
    """Test get operation for StockMovements."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='xiEf2kK5r4',
        name='ABLmVKByt',
        description='u2gVhOBDwHntZyubjfKF5ng3DJ6EthVQ9J4H6lBSXFmEH4Xz9Ta5D',
        image='H2otLX',
        cost_price=72.86,
        selling_price=55.21,
        unit='zC',
        low_stock_alert=11,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='ykeqV@ppzpe.com',
        password='fOaVy',
        is_active=True,
        phone_numer='XO',
        address='7aR1xn1C7s32o47YiqsVrwKlOylgpI7lekqyFaGooOHi8kaL3bFoTPmrxG5KGeOX1vQ2JmOCyHFq09H6nucX',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for StockMovements
    stock_movements_data = schemas.StockMovementsCreate(
        product_id=products.id,
        user_id=users.id,
        type='out_stock',
        quantity=8,
        stock_before=0,
        stock_after=13,
        reference='27',
    )

    stock_movements = crud.stock_movements.create(db=db, obj_in=stock_movements_data)
    db.commit()
    db.refresh(stock_movements)

    # Get all records with relations
    records = crud.stock_movements.get_multi_where_array(
        db=db,
        where=[
            {'key': 'deleted_at', 'operator': 'isNull'},
            {'key': 'created_at', 'operator': 'isNotNull'}
        ],
        relations=['product{name}', 'user{email}'],
        where_relation=[{'key': 'product.deleted_at', 'operator': 'isNull'}, {'key': 'user.deleted_at', 'operator': 'isNull'}],
        base_columns=['id']
    )

    # Assertions
    assert len(records) > 0
    assert any(r.id == stock_movements.id for r in records)


def test_get_by_id_stock_movements(db: Session):
    """Test get_by_id operation for StockMovements."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='yv',
        name='HPgBbZa',
        description='muRaPMA8q',
        image='sVgNsI3m9',
        cost_price=5.96,
        selling_price=35.93,
        unit='lMA6n0p6t',
        low_stock_alert=10,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='1XCI2@pmvbk.com',
        password='KsxHJ',
        is_active=False,
        phone_numer='IjsScddlch',
        address='vkMyZLaxKAhjK0YvIcjKVcaooPoI5F4x6KS3je1Ab7R3ko2Jm5yPSE',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for StockMovements
    stock_movements_data = schemas.StockMovementsCreate(
        product_id=products.id,
        user_id=users.id,
        type='out_stock',
        quantity=19,
        stock_before=15,
        stock_after=1,
        reference='MnawXzV',
    )

    stock_movements = crud.stock_movements.create(db=db, obj_in=stock_movements_data)
    db.commit()
    db.refresh(stock_movements)

    # Get by ID with relations
    retrieved_stock_movements = crud.stock_movements.get_first_where_array(
        db=db,
        where=[
            {'key': 'deleted_at', 'operator': 'isNull'},
            {'key': 'created_at', 'operator': 'isNotNull'},
            {'key': 'id', 'operator': '==', 'value': stock_movements.id}
        ],
        relations=['product{name}', 'user{email}'],
        where_relation=[{'key': 'product.deleted_at', 'operator': 'isNull'}, {'key': 'user.deleted_at', 'operator': 'isNull'}],
        base_columns=['id']
    )

    # Assertions
    assert retrieved_stock_movements is not None
    assert retrieved_stock_movements.id == stock_movements.id
    assert retrieved_stock_movements.product_id == stock_movements.product_id
    assert retrieved_stock_movements.user_id == stock_movements.user_id
    assert retrieved_stock_movements.type == stock_movements.type
    assert retrieved_stock_movements.quantity == stock_movements.quantity
    assert retrieved_stock_movements.stock_before == stock_movements.stock_before
    assert retrieved_stock_movements.stock_after == stock_movements.stock_after
    assert retrieved_stock_movements.reference == stock_movements.reference


def test_delete_stock_movements(db: Session):
    """Test delete operation for StockMovements."""
    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='OXqsD',
        name='gEb9S5VUs',
        description='dIdNecMCarqXm4I012OzfTHUrVjJhKj4tE2GbHPKBTy1g5RgdnKgJqNld6JwG6AC5mujB8qhlMF73g1vtVA7zfBaF2F',
        image='z6Y',
        cost_price=33.31,
        selling_price=47.32,
        unit='lz',
        low_stock_alert=3,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='7anbA@2w3lo.com',
        password='2RrB8',
        is_active=True,
        phone_numer='HI',
        address='D6EC36YzEBwjj0ZfbQJoow1tM0KbqlpuPd4XMq7g6iz5xdzwzkbxqYAoI6aHAfDjBlF850PJUPmm',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for StockMovements
    stock_movements_data = schemas.StockMovementsCreate(
        product_id=products.id,
        user_id=users.id,
        type='in_stock',
        quantity=1,
        stock_before=12,
        stock_after=14,
        reference='yqw7',
    )

    stock_movements = crud.stock_movements.create(db=db, obj_in=stock_movements_data)
    db.commit()
    db.refresh(stock_movements)

    # Delete record
    deleted_stock_movements = crud.stock_movements.remove(db=db, id=stock_movements.id)

    # Assertions
    assert deleted_stock_movements is not None
    assert deleted_stock_movements.id == stock_movements.id

    # Verify deletion
    assert crud.stock_movements.get(db=db, id=stock_movements.id) is None

# begin #
# ---write your code here--- #
# end #
