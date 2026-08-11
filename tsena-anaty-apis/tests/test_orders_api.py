# begin #
# ---write your code here--- #
# end #

from fastapi import status
from app import crud, schemas
from datetime import datetime, timedelta, date, time
import random
import json
from app.core import security


CUSTOMER_PHONE = '+261 33 12 345 67'


def _create_customer(db) -> schemas.Customers:
    customer = crud.customers.create(
        db,
        obj_in=schemas.CustomersCreate(
            name='Client Test',
            phone=CUSTOMER_PHONE,
            delivery_address='Antananarivo',
        ),
    )
    db.commit()
    db.refresh(customer)
    return customer


def test_get_orders_with_nested_product_variant_relations(client, db):
    """Front-office relation format (dot-separated) must not crash."""
    user_data = {
        'email': 'nested-relations@test.com',
        'password': 'test123',
        'is_active': True,
        'role_id': 2,
        'phone_numer': 'nested-rel',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})
    headers = {'Authorization': f'Bearer {token}'}

    products = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=1,
            sku='SKU-NESTED',
            name='Produit Nested',
            image='/No_Image_Available.jpg',
            status='active',
        ),
    )
    db.commit()
    db.refresh(products)

    customer = _create_customer(db)
    customer_id = customer.id

    crud.stock.create(db, obj_in=schemas.StockCreate(product_id=products.id, quantity=10))
    db.commit()

    client.post(
        '/api/v1/orders/',
        headers=headers,
        json={
            'user_id': user.id,
            'customer_id': customer_id,
            'movements': [{'product_id': products.id, 'quantity': 2}],
            'status': 'confirmed',
        },
    )

    relation = json.dumps([
        'customer{id,name,phone,delivery_address}',
        'stock_movements{id,product_id,variant_id,type,quantity,unit_cost,another_price}',
        'stock_movements.product{id,name,sku}',
        'stock_movements.variant{id,name,sku}',
    ])
    resp = client.get(
        f'/api/v1/orders/?relation={relation}',
        headers=headers,
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    items = resp.json()['data']
    assert items, 'expected at least one order'
    order = next(o for o in items if o['customer_id'] == customer_id)
    movement = order['stock_movements'][0]
    assert movement['product']['name'] == 'Produit Nested'


def test_create_orders_api(client, db):
    """Create Orders via API."""
    # Auth setup
    user_data = {
        'email': 'QlHjM@8ft7j.com',
        'password': 'Y7bF0',
        'is_active': True,
        'role_id': 15,
        'phone_numer': 'qu06Y',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='8rPit@ihbo5.com',
        password='efIGc',
        is_active=False,
        role_id=1,
        phone_numer='w',
        address='',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='j5ivLF',
        name='YVPmT8H',
        description='XHA9qmJEH',
        image='WcQU3vsRx',
        category_id=1,
        selling_price=49.86,
        unit='f',
        low_stock_alert=9,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    customers = _create_customer(db)

    orders_data = {
        'order_number': 'IBdb2WhJpf',
        'user_id': users.id,
        'customer_id': customers.id,
        'movements': [
            {'product_id': products.id, 'quantity': 4}
        ],
        'status': 'draft',
        'note': 'fCvIYNSQN7VjPpjGE3UOhKcSrYpz152H67nVQF1K1UlmVKyOJS31B8mT8wRJPLC6Nrp',
    }

    resp = client.post('/api/v1/orders/', json=orders_data, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    created = resp.json()
    assert created['id'] is not None
    assert created['order_number'] == orders_data['order_number']
    assert created['user_id'] == orders_data['user_id']
    assert created['customer_id'] == orders_data['customer_id']
    assert created['status'] == orders_data['status']
    assert created['note'] == orders_data['note']


def test_update_orders_api(client, db):
    """Update Orders via API."""
    # Auth setup
    user_data = {
        'email': '0q1pK@r3f0c.com',
        'password': 'dVatj',
        'is_active': True,
        'role_id': 77,
        'phone_numer': 'Al',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='plxU2@tdkyu.com',
        password='M9uxC',
        is_active=False,
        role_id=1,
        phone_numer='c1ACn0yfB',
        address='uGHL37WBIUhcVk5mrwnJFjrowuLDXo5CzuThGNvvSTzn',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='a6Y300ow6i',
        name='CMp',
        description='qsy5hPa13KAQOxboTLZOcXiAPJDkHBPKGz9CVCVMqYkBmw1FxL8vOH2waQf6rR9csBIL41OUqrAItfw',
        image='2JEtPk',
        category_id=1,
        selling_price=51.52,
        unit='N',
        low_stock_alert=6,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    customers = _create_customer(db)
    customer_id = customers.id

    orders_data = {
        'order_number': '8T',
        'user_id': users.id,
        'customer_id': customer_id,
        'movements': [
            {'product_id': products.id, 'quantity': 19}
        ],
        'status': 'draft',
        'note': 'gqC7uf61DvgEYA3hDyAtlOuxFg4RzbAayzn1XYmTc47LlLUXe66pMuTx',
    }

    resp_c = client.post('/api/v1/orders/', json=orders_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_c.status_code == status.HTTP_200_OK
    created = resp_c.json()

    # Build update_data: customer_id is required by the endpoint; keep status draft
    update_data = {
        'order_number': 'UPDATED-ORDER-NUMBER',
        'customer_id': customer_id,
        'note': 'Note mise à jour du test',
    }

    resp_u = client.put(f'/api/v1/orders/{created["id"]}', json=update_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_u.status_code == status.HTTP_200_OK, resp_u.json()
    updated = resp_u.json()
    assert updated['id'] == created['id']
    assert updated['order_number'] == update_data['order_number']
    assert updated['note'] == update_data['note']


def test_get_orders_api(client, db):
    """Get Orders via API."""
    # Auth setup
    user_data = {
        'email': '3FsFL@ubx1c.com',
        'password': '5I97E',
        'is_active': True,
        'role_id': 56,
        'phone_numer': 'hy',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='1rzmz@cgazw.com',
        password='1yaeo',
        is_active=True,
        role_id=1,
        phone_numer='wmiM936Wlj',
        address='9h9a6P7WzIZyYiQuFXwh9oquqIpCH4ZdEQphq5OVw8yYnZ7dUiCop3Lt0v3uYFaYZI3fueAAureaxpxoClsBG27',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='lQExI',
        name='fda7',
        description='yzLA1UsTXfRXSPtNwWD5wLRIHjICvSSCUxKsNap03hoQjOqMhCOuCGFHF7OA7futfZKKpAzrGW',
        image='M',
        category_id=1,
        selling_price=26.09,
        unit='0bdur',
        low_stock_alert=20,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    customers = _create_customer(db)

    orders_data = {
        'order_number': '0rjVK2O0Gq',
        'user_id': users.id,
        'customer_id': customers.id,
        'movements': [
            {'product_id': products.id, 'quantity': 8}
        ],
        'status': 'draft',
        'note': 'K',
    }

    base_ep = '/api/v1/orders'

    # Query parameters for GET endpoint
    relation = ['user{id}']
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = [{'key': 'user.deleted_at', 'operator': 'isNull'}]
    base_columns = ['id', 'order_number', 'user_id', 'customer_id']

    # Build URL with query parameters
    query_params = []
    if relation:
        query_params.append(f'relation={json.dumps(relation)}')
    if where:
        query_params.append(f'where={json.dumps(where)}')
    if where_relation:
        query_params.append(f'where_relation={json.dumps(where_relation)}')
    if base_columns:
        query_params.append(f'base_columns={json.dumps(base_columns)}')
    query_string = '&'.join(query_params)
    url = f'{base_ep}/?{query_string}' if query_string else f'{base_ep}/'

    # Create test data
    client.post('/api/v1/orders/', json=orders_data, headers={"Authorization": f"Bearer {token}"})

    # GET with parameters
    resp_g = client.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resp_g.status_code == status.HTTP_200_OK
    items = resp_g.json()['data']
    assert any(item.get('id') for item in items)

    # Verify that relations are populated
    for item in items:
        if item.get('user') is not None:
            assert isinstance(item['user'], dict)
            assert 'id' in item['user']


def test_get_by_id_orders_api(client, db):
    """Get_by_id Orders via API."""
    # Auth setup
    user_data = {
        'email': 'sKGpr@d1uvo.com',
        'password': 'OkWJD',
        'is_active': True,
        'role_id': 56,
        'phone_numer': 'iYo',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='ZvqtD@nya2r.com',
        password='1pRuD',
        is_active=False,
        role_id=1,
        phone_numer='mEdoevxJqp',
        address='BUJv8L7IUb6kFB19GjcfbefmSvJIC0SmmupenxO3cA61kzwyQTInkxrZzT8R4TstwAZM4p7Lf6rOCAama2OMZhhhu297jGyK3r',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='X',
        name='x5',
        description='0MqYX6CbW6PQOm7zCZjCu4NTgxzn',
        image='SCAM',
        category_id=1,
        selling_price=79.6,
        unit='aKnSKw',
        low_stock_alert=6,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    customers = _create_customer(db)

    orders_data = {
        'order_number': 'OTz9Y3ZAg',
        'user_id': users.id,
        'customer_id': customers.id,
        'movements': [
            {'product_id': products.id, 'quantity': 4}
        ],
        'status': 'draft',
        'note': 'EzIT',
    }

    base_ep = '/api/v1/orders'

    # Query parameters for GET_BY_ID endpoint
    relation = ['user{id}']
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = [{'key': 'user.deleted_at', 'operator': 'isNull'}]
    base_columns = ['id', 'order_number', 'user_id', 'customer_id']

    # Build URL with query parameters
    query_params = []
    if relation:
        query_params.append(f'relation={json.dumps(relation)}')
    if where:
        query_params.append(f'where={json.dumps(where)}')
    if where_relation:
        query_params.append(f'where_relation={json.dumps(where_relation)}')
    if base_columns:
        query_params.append(f'base_columns={json.dumps(base_columns)}')
    query_string = '&'.join(query_params)

    resp_c = client.post('/api/v1/orders/', json=orders_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()

    # GET by ID with parameters
    url = f'/api/v1/orders/{created["id"]}?{query_string}' if query_string else f'/api/v1/orders/{created["id"]}'
    resp_g = client.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resp_g.status_code == status.HTTP_200_OK
    retrieved = resp_g.json()
    assert retrieved['id'] == created['id']

    # Verify that relations are populated
    if retrieved.get('user') is not None:
        assert isinstance(retrieved['user'], dict)
        assert 'id' in retrieved['user']


def test_delete_orders_api(client, db):
    """Delete Orders via API."""
    # Auth setup
    user_data = {
        'email': '0Pz7O@5r0l1.com',
        'password': 'DLWBb',
        'is_active': True,
        'role_id': 20,
        'phone_numer': 'hd7nHOOUV',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='waGvS@bpo61.com',
        password='Ho4br',
        is_active=False,
        role_id=1,
        phone_numer='LyUsaNifTp',
        address='a93TxDCihZUai7GcmGTHTpcAC9QvdiollW',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='4GNYRK',
        name='rY5qPo',
        description='YsCDuoeg8If9Voa0FxLU5TnVmIRzp5FCO0DWmwLFqysMadu',
        image='EXBGPRZN',
        category_id=1,
        selling_price=90.17,
        unit='5TQ9',
        low_stock_alert=0,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    customers = _create_customer(db)

    orders_data = {
        'order_number': 'tlib',
        'user_id': users.id,
        'customer_id': customers.id,
        'movements': [
            {'product_id': products.id, 'quantity': 19}
        ],
        'status': 'draft',
        'note': '7pSixU296E8UUg9ovtrtltI6BQUFPb7pmTb1KlsZOCrlMmHZJArwI5W5TQb9X1mPy3jUQFs86sRxc4ea9m3TdtGXNNPla',
    }

    resp_c = client.post('/api/v1/orders/', json=orders_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()
    resp_d = client.delete(f'/api/v1/orders/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_d.status_code == status.HTTP_200_OK
    deleted = resp_d.json()
    assert deleted['msg'] == 'Orders deleted successfully'
    resp_chk = client.get(f'/api/v1/orders/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_chk.status_code == status.HTTP_404_NOT_FOUND

# begin #
# ---write your code here--- #
# end #
