# begin #
# ---write your code here--- #
# end #

from fastapi import status
from app import crud, schemas
from datetime import datetime, timedelta, date, time
import random
import json
from app.core import security


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
        cost_price=79.68,
        selling_price=49.86,
        unit='f',
        low_stock_alert=9,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    orders_data = {
        'order_number': 'IBdb2WhJpf',
        'user_id': users.id,
        'customer_name': 'CBZnbnRYd4',
        'customer_phone': 'NW',
        'delivery_address': 'wEK3wTjJgayYd4Nbr3aTgKBGDWnTWRFZs4OeIoN9phFi',
        'product_id': products.id,
        'quantity': 4,
        'status': 'delivered',
        'note': 'fCvIYNSQN7VjPpjGE3UOhKcSrYpz152H67nVQF1K1UlmVKyOJS31B8mT8wRJPLC6Nrp',
    }

    resp = client.post('/api/v1/orders/', json=orders_data, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    created = resp.json()
    assert created['id'] is not None
    assert created['order_number'] == orders_data['order_number']
    assert created['user_id'] == orders_data['user_id']
    assert created['customer_name'] == orders_data['customer_name']
    assert created['customer_phone'] == orders_data['customer_phone']
    assert created['delivery_address'] == orders_data['delivery_address']
    assert created['product_id'] == orders_data['product_id']
    assert created['quantity'] == orders_data['quantity']
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
        cost_price=39.97,
        selling_price=51.52,
        unit='N',
        low_stock_alert=6,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    orders_data = {
        'order_number': '8T',
        'user_id': users.id,
        'customer_name': 'z8hiUT2Xu',
        'customer_phone': 'xXNtyeDD',
        'delivery_address': 'cul2lwwZS4U7eswLDPcwia',
        'product_id': products.id,
        'quantity': 19,
        'status': 'confirmed',
        'note': 'gqC7uf61DvgEYA3hDyAtlOuxFg4RzbAayzn1XYmTc47LlLUXe66pMuTx',
    }

    # Precompute enum values for update
    enum_values_map = {}
    enum_values_map['status'] = ['draft', 'confirmed', 'delivered', 'cancelled']

    # Helper to compute a new value different from the current one (for API payload)
    def _updated_value(k, v):
        from decimal import Decimal

        # None handling
        if v is None:
            return 'updated_value'

        # bool -> invert
        if isinstance(v, bool):
            return not v

        # numeric -> +1 (int, float, Decimal)
        if isinstance(v, (int, float, Decimal)):
            return v + 1

        # enum -> next value from enum_values_map
        if k in enum_values_map:
            current = v
            values = enum_values_map[k]
            try:
                idx = values.index(current)
                if len(values) > 1:
                    return values[(idx + 1) % len(values)]
                else:
                    return current
            except ValueError:
                return values[0] if values else v

        # datetime +1 jour
        if k in []:
            if isinstance(v, str):
                return (datetime.fromisoformat(v) + timedelta(days=1)).isoformat()
            return v

        # date +1 jour
        if k in []:
            if isinstance(v, str):
                return (date.fromisoformat(v) + timedelta(days=1)).isoformat()
            return v

        # time +1 heure
        if k in []:
            if isinstance(v, str):
                return (datetime.strptime(v, '%H:%M:%S') + timedelta(hours=1)).time().strftime('%H:%M:%S')
            return v

        # fallback -> prefix 'updated_'
        return f'updated_{v}'

    resp_c = client.post('/api/v1/orders/', json=orders_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_c.status_code == status.HTTP_200_OK
    created = resp_c.json()

    # Handle self-reference updates if needed
    fk_fields = ['user_id', 'product_id']
    self_ref_fields = []

    # Build update_data for API
    update_data = {
        k: _updated_value(k, v)
        for k, v in orders_data.items()
        if k not in ('id', 'hashed_password') and k not in fk_fields and k not in self_ref_fields and not isinstance(v, dict)
    }

    resp_u = client.put(f'/api/v1/orders/{created["id"]}', json=update_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_u.status_code == status.HTTP_200_OK, resp_u.json()
    updated = resp_u.json()
    assert updated['id'] == created['id']
    assert updated['order_number'] == update_data['order_number']
    assert updated['customer_name'] == update_data['customer_name']
    assert updated['customer_phone'] == update_data['customer_phone']
    assert updated['delivery_address'] == update_data['delivery_address']
    assert updated['quantity'] == update_data['quantity']
    assert updated['status'] == update_data['status']
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
        cost_price=26.52,
        selling_price=26.09,
        unit='0bdur',
        low_stock_alert=20,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    orders_data = {
        'order_number': '0rjVK2O0Gq',
        'user_id': users.id,
        'customer_name': '39ZgzLuP',
        'customer_phone': 'OUsDfzRGB',
        'delivery_address': 'qcNwYwAlOH7tmIubslMFyjXIPLNmWTtsoLOxtG4DC3qe30GOF',
        'product_id': products.id,
        'quantity': 8,
        'status': 'delivered',
        'note': 'K',
    }


    base_ep = '/api/v1/orders'

    # Query parameters for GET endpoint
    relation = ['user{id}', 'product{id}']
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = [{'key': 'user.deleted_at', 'operator': 'isNull'}, {'key': 'product.deleted_at', 'operator': 'isNull'}]
    base_columns = ['id', 'user_id', 'customer_name', 'product_id']

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
    for item in items:
        if item.get('product') is not None:
            assert isinstance(item['product'], dict)
            assert 'id' in item['product']


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
        cost_price=36.8,
        selling_price=79.6,
        unit='aKnSKw',
        low_stock_alert=6,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    orders_data = {
        'order_number': 'OTz9Y3ZAg',
        'user_id': users.id,
        'customer_name': 'q7',
        'customer_phone': 'YFP6rjzKRj',
        'delivery_address': 'ggkQrhWQAW9jYZIgmymmxtSHKL6kwSlorvPeLwGqNCv4F8jKm93LTmTc0',
        'product_id': products.id,
        'quantity': 4,
        'status': 'confirmed',
        'note': 'EzIT',
    }


    base_ep = '/api/v1/orders'

    # Query parameters for GET_BY_ID endpoint
    relation = ['user{id}', 'product{id}']
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = [{'key': 'user.deleted_at', 'operator': 'isNull'}, {'key': 'product.deleted_at', 'operator': 'isNull'}]
    base_columns = ['id', 'user_id', 'customer_name', 'product_id']

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
    if retrieved.get('product') is not None:
        assert isinstance(retrieved['product'], dict)
        assert 'id' in retrieved['product']


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
        cost_price=63.66,
        selling_price=90.17,
        unit='5TQ9',
        low_stock_alert=0,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    orders_data = {
        'order_number': 'tlib',
        'user_id': users.id,
        'customer_name': '3bsw',
        'customer_phone': 'XCL8Q8',
        'delivery_address': 'TP7vzv0OOidJw',
        'product_id': products.id,
        'quantity': 19,
        'status': 'confirmed',
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
