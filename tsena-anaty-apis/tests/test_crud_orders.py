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


def test_create_orders(db: Session):
    """Test create operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='F8JQo@gypfi.com',
        password='10Uf4',
        is_active=False,
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
        cost_price=45.66,
        selling_price=66.85,
        unit='Q',
        low_stock_alert=11,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='VaTm8D3',
        user_id=users.id,
        customer_name='VGJCHNzTms',
        customer_phone='b',
        delivery_address='psRliQ2xjQPSuiCQHUbTLl8Ccl0B81VvqSW3N99pW8STAVWZXQ7vqhwZ5OKaVc9sQC1dLYqha3pFFpHgUeuPYUlVncivd45y6IJk',
        product_id=products.id,
        quantity=10,
        unit_cost=15000,
        another_price=500,
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
    assert orders.customer_name == orders_data.customer_name
    assert orders.customer_phone == orders_data.customer_phone
    assert orders.delivery_address == orders_data.delivery_address
    assert orders.product_id == orders_data.product_id
    assert orders.quantity == orders_data.quantity
    assert orders.status == orders_data.status
    assert orders.note == orders_data.note


def test_update_orders(db: Session):
    """Test update operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='LTYM4@0q1xy.com',
        password='5oUI3',
        is_active=True,
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
        cost_price=38.81,
        selling_price=92.82,
        unit='g5',
        low_stock_alert=12,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='MLviG',
        user_id=users.id,
        customer_name='Vyu',
        customer_phone='upX5RM0Wxy',
        delivery_address='FrYzVOHFUeWqDSjvKrRouN8BjABoN431VNA7U8DpRXwj0CufX258tDISi8iFEDBRpZ2UBbrEWNBeedbH',
        product_id=products.id,
        quantity=0,
        unit_cost=12000,
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
    order_number_value = orders.order_number
    customer_name_value = orders.customer_name
    customer_phone_value = orders.customer_phone
    delivery_address_value = orders.delivery_address
    quantity_value = orders.quantity
    status_value = orders.status
    note_value = orders.note
    # Fields to exclude from update: ['id', 'hashed_password', 'user_id', 'product_id']
    update_data = schemas.OrdersUpdate(**{
        k: _updated_value(k, v)
        for k, v in orders_data.model_dump().items()
        if k not in ['id', 'hashed_password', 'user_id', 'product_id'] and not isinstance(v, dict)
    })
    updated_orders = crud.orders.update(
        db=db, db_obj=orders, obj_in=update_data
    )

    # Assertions
    assert updated_orders.id == orders.id
    assert updated_orders.order_number != order_number_value
    assert updated_orders.customer_name != customer_name_value
    assert updated_orders.customer_phone != customer_phone_value
    assert updated_orders.delivery_address != delivery_address_value
    assert updated_orders.quantity != quantity_value
    assert updated_orders.status != status_value
    assert updated_orders.note != note_value


def test_get_orders(db: Session):
    """Test get operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='X1ozD@cywej.com',
        password='Po6sy',
        is_active=True,
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
        cost_price=30.57,
        selling_price=74.58,
        unit='Z6r',
        low_stock_alert=3,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='QJwPTuK9l',
        user_id=users.id,
        customer_name='A',
        customer_phone='paGa',
        delivery_address='T2kiuOXPYceu9J9Oe4UjOJVNYkBXHBECvXm07tUBGD2xEguDXe9itvO9ipQF6dQpS5soT4jjjJWZXlWed',
        product_id=products.id,
        quantity=3,
        unit_cost=10000,
        another_price=250,
        status='confirmed',
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
        relations=['user{email}', 'product{name}'],
        where_relation=[{'key': 'user.deleted_at', 'operator': 'isNull'}, {'key': 'product.deleted_at', 'operator': 'isNull'}],
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
        cost_price=86.35,
        selling_price=54.49,
        unit='kc8Zye7NwV',
        low_stock_alert=20,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='vnyQ',
        user_id=users.id,
        customer_name='zk',
        customer_phone='q',
        delivery_address='rExYKcdo7vZKBXvleszBKu2q1qsXWOYyyfRUN8K',
        product_id=products.id,
        quantity=15,
        unit_cost=20000,
        another_price=1000,
        status='cancelled',
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
        relations=['user{email}', 'product{name}'],
        where_relation=[{'key': 'user.deleted_at', 'operator': 'isNull'}, {'key': 'product.deleted_at', 'operator': 'isNull'}],
        base_columns=['id', 'order_number']
    )

    # Assertions
    assert retrieved_orders is not None
    assert retrieved_orders.id == orders.id
    assert retrieved_orders.order_number == orders.order_number
    assert retrieved_orders.user_id == orders.user_id
    assert retrieved_orders.customer_name == orders.customer_name
    assert retrieved_orders.customer_phone == orders.customer_phone
    assert retrieved_orders.delivery_address == orders.delivery_address
    assert retrieved_orders.product_id == orders.product_id
    assert retrieved_orders.quantity == orders.quantity
    assert retrieved_orders.status == orders.status
    assert retrieved_orders.note == orders.note


def test_delete_orders(db: Session):
    """Test delete operation for Orders."""
    # Test data for Users
    users_data = schemas.UsersCreate(
        email='LbvBB@wykyw.com',
        password='I8y3u',
        is_active=True,
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
        cost_price=43.92,
        selling_price=21.81,
        unit='GKHhg',
        low_stock_alert=10,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Orders
    orders_data = schemas.OrdersCreate(
        order_number='u',
        user_id=users.id,
        customer_name='h8R',
        customer_phone='tDyFaMwBds',
        delivery_address='mC2VsG5WDDUzNZznFIX2bIbaFRjzFfg4AGyosHtyuadk972zg7sKkbg43Qf2z',
        product_id=products.id,
        quantity=15,
        unit_cost=17500,
        another_price=750,
        status='delivered',
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
