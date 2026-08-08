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
"""Tests for CRUD operations on Orders model."""

CUSTOMER_PHONE = '+261 33 12 345 67'


def _create_customer(db: Session) -> schemas.Customers:
    customer_data = schemas.CustomersCreate(
        name='Client Test',
        phone=CUSTOMER_PHONE,
        delivery_address='Antananarivo',
    )
    customer = crud.customers.create(db=db, obj_in=customer_data)
    db.commit()
    db.refresh(customer)
    return customer


def test_create_orders(db: Session):
    """Test create operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='F8JQo@gypfi.com',
        password='10Uf4',
        is_active=False,
        role_id=1,
        phone_numer='1gPI7R6fRT',
        address='uecDBh6FvUOcyy9QM1hguS7eGTrqMG11zF6skF85HVWN1jhAtFx31zXYGMWGfMdqzeLqizgRe1O05w5U7aC0S4WkJELzh9Xv',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='4z4a',
        name='SH',
        description='kPYAcW5RJXHYn',
        image='7I',
        category_id=1,
        selling_price=66.85,
        unit='Q',
        low_stock_alert=11,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Customers
    customers = _create_customer(db)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='VaTm8D3',
        user_id=users.id,
        customer_id=customers.id,
        another_price=500,
        other_price_reason='livraison spéciale',
        status='draft',
        note='jEp5eLkOH23JUsUQW1Nzr110yUXb0vJZYcK9Mnx',
    )

    orders = crud.orders.create(db=db, obj_in=orders_data)
    db.commit()
    db.refresh(orders)

    # Assertions
    assert orders.id is not None
    assert orders.order_number == orders_data.order_number
    assert orders.user_id == orders_data.user_id
    assert orders.customer_id == orders_data.customer_id
    assert orders.status == orders_data.status
    assert orders.note == orders_data.note


def test_update_orders(db: Session):
    """Test update operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='LTYM4@0q1xy.com',
        password='5oUI3',
        is_active=True,
        role_id=1,
        phone_numer='MHe3RtAeR',
        address='rGw9742wYC747IyeteG8xIzTbtvwPhe0b5BmO7vrDMLFcPlbnCpVJou6j7h0Z52vQkYoIsjkL6TgI2gSOB8Gcm7TMoAxpIYYmaP',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='lmqr',
        name='1',
        description='rfyHGXvvzGPLIt6iogK',
        image='JcBXm',
        category_id=1,
        selling_price=92.82,
        unit='g5',
        low_stock_alert=12,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Customers
    customers = _create_customer(db)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='MLviG',
        user_id=users.id,
        customer_id=customers.id,
        another_price=0,
        status='draft',
        note='AZouWg0yRH8AJU77NnOlq2yy5lX94',
    )

    orders = crud.orders.create(db=db, obj_in=orders_data)
    db.commit()
    db.refresh(orders)

    # Precompute enum values for update
    enum_values_map = {}
    enum_values_map['status'] = ['draft', 'confirmed', 'delivered', 'cancelled']

    # Helper to compute a new value different from the current one
    def _updated_value(k, v):
        from decimal import Decimal

        if v is None:
            return None

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

        return f'updated_{v}'

    # Update data
    order_number_value = orders.order_number
    status_value = orders.status
    note_value = orders.note
    # Fields to exclude from update: ['id', 'hashed_password', 'user_id']
    # customer_id is required by OrdersUpdate, so keep it unchanged
    _update_fields = {
        k: _updated_value(k, v)
        for k, v in orders_data.model_dump().items()
        if k not in ['id', 'hashed_password', 'user_id']
        and v is not None
        and not isinstance(v, dict)
    }
    _update_fields['customer_id'] = customers.id
    update_data = schemas.OrdersUpdate(**_update_fields)
    updated_orders = crud.orders.update(
        db=db, db_obj=orders, obj_in=update_data
    )

    # Assertions
    assert updated_orders.id == orders.id
    assert updated_orders.order_number != order_number_value
    assert updated_orders.status != status_value
    assert updated_orders.note != note_value


def test_get_orders(db: Session):
    """Test get operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='X1ozD@cywej.com',
        password='Po6sy',
        is_active=True,
        role_id=1,
        phone_numer='6agp2InY',
        address='apMrBE5SbOPmExK1D0l01X7v11',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='MYMXx',
        name='EG',
        description='5td0E9EUvSt2mjYJyL1',
        image='mmUEssmcli',
        category_id=1,
        selling_price=74.58,
        unit='Z6r',
        low_stock_alert=3,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Customers
    customers = _create_customer(db)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='QJwPTuK9l',
        user_id=users.id,
        customer_id=customers.id,
        another_price=250,
        other_price_reason='emballage',
        status='draft',
        note='3Ad7Rfi985Mn82BVkgiYxobECwPQDxw3CWQMWlApWFJ1nmdTaqyFE1tu',
    )

    orders = crud.orders.create(db=db, obj_in=orders_data)
    db.commit()
    db.refresh(orders)

    # Get all records with relations
    records = crud.orders.get_multi_where_array(
        db=db,
        where=[
            {'key': 'deleted_at', 'operator': 'isNull'},
            {'key': 'created_at', 'operator': 'isNotNull'}
        ],
        relations=['user{email}'],
        where_relation=[{'key': 'user.deleted_at', 'operator': 'isNull'}],
        base_columns=['id', 'order_number']
    )

    # Assertions
    assert len(records) > 0
    assert any(r.id == orders.id for r in records)


def test_get_by_id_orders(db: Session):
    """Test get_by_id operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='r3IVd@2jv3z.com',
        password='V0k4H',
        is_active=True,
        role_id=1,
        phone_numer='BriY',
        address='DC7ao6MfOqQClllzbbXCw75xpZXcbbXRAO2dyVQBq9YQThArUtX0Bu9FQvZIyu2YIZmtmWlEi9NHilPRXKZKavlqxyqQD7SeeEr',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='SijBb',
        name='0t9HAC9',
        description='dhJK5OAgWFcJdkF79Aur0lgBaA1oXO07ATEaWg36nXcw3zhzshwS6Qjicv8v',
        image='VJPNy',
        category_id=1,
        selling_price=54.49,
        unit='kc8Zye7NwV',
        low_stock_alert=20,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Customers
    customers = _create_customer(db)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='vnyQ',
        user_id=users.id,
        customer_id=customers.id,
        another_price=1000,
        other_price_reason='frais spéciaux',
        status='draft',
        note='gVuIjqsSjCVdOlVspW6gyEvdus0uLZb0GgzxX',
    )

    orders = crud.orders.create(db=db, obj_in=orders_data)
    db.commit()
    db.refresh(orders)

    # Get by ID with relations
    retrieved_orders = crud.orders.get_first_where_array(
        db=db,
        where=[
            {'key': 'deleted_at', 'operator': 'isNull'},
            {'key': 'created_at', 'operator': 'isNotNull'},
            {'key': 'id', 'operator': '==', 'value': orders.id}
        ],
        relations=['user{email}'],
        where_relation=[{'key': 'user.deleted_at', 'operator': 'isNull'}],
        base_columns=['id', 'order_number']
    )

    # Assertions
    assert retrieved_orders is not None
    assert retrieved_orders.id == orders.id
    assert retrieved_orders.order_number == orders.order_number
    assert retrieved_orders.user_id == orders.user_id
    assert retrieved_orders.customer_id == orders.customer_id
    assert retrieved_orders.status == orders.status
    assert retrieved_orders.note == orders.note


def test_delete_orders(db: Session):
    """Test delete operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='LbvBB@wykyw.com',
        password='I8y3u',
        is_active=True,
        role_id=1,
        phone_numer='FT10A0wg0D',
        address='NjcMAizHwWjydW6',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='VC0TJu',
        name='1fQ',
        description='k11S',
        image='h1NKZ0Pt',
        category_id=1,
        selling_price=21.81,
        unit='GKHhg',
        low_stock_alert=10,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Customers
    customers = _create_customer(db)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='u',
        user_id=users.id,
        customer_id=customers.id,
        another_price=750,
        other_price_reason='livraison',
        status='draft',
        note='D8WpPK7u2Tty9i44vsd8KJkE9Xwvzqwdbwn0G5L6vuOf8yEpqa26PWzIM4M0QyA',
    )

    orders = crud.orders.create(db=db, obj_in=orders_data)
    db.commit()
    db.refresh(orders)

    # Delete record
    deleted_orders = crud.orders.remove(db=db, id=orders.id)

    # Assertions
    assert deleted_orders is not None
    assert deleted_orders.id == orders.id

    # Verify deletion
    assert crud.orders.get(db=db, id=orders.id) is None

# begin #
# ---write your code here--- #
# end #
