# begin #
# ---write your code here--- #
# end #

from fastapi import status
from app import crud, schemas
from datetime import datetime, timedelta, date, time
import random
import json
from app.core import security


def test_create_stock_movements_api(client, db):
    """Create StockMovements via API."""
    # Auth setup
    user_data = {
        'email': 'STswr@7mkax.com',
        'password': 'YkUbB',
        'is_active': True,
        'role_id': 56,
        'phone_numer': 'cx6ZLTG',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='c7XzGydOS',
        name='DPVHt0r',
        description='xtzB4rW2',
        image='fmych',
        cost_price=5.5,
        selling_price=37.38,
        unit='fY',
        low_stock_alert=9,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='QDZqW@t3izc.com',
        password='YQ7R1',
        is_active=False,
        phone_numer='XhzSZEfQ1w',
        address='VvEm4gSYX',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    stock_movements_data = {
        'product_id': products.id,
        'user_id': users.id,
        'type': 'in_stock',
        'quantity': 15,
        'stock_before': 8,
        'stock_after': 15,
        'reference': '7s',
    }

    resp = client.post('/api/v1/stock_movements/', json=stock_movements_data, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    created = resp.json()
    assert created['id'] is not None
    assert created['product_id'] == stock_movements_data['product_id']
    assert created['user_id'] == stock_movements_data['user_id']
    assert created['type'] == stock_movements_data['type']
    assert created['quantity'] == stock_movements_data['quantity']
    assert created['stock_before'] == stock_movements_data['stock_before']
    assert created['stock_after'] == stock_movements_data['stock_after']
    assert created['reference'] == stock_movements_data['reference']


def test_update_stock_movements_api(client, db):
    """Update StockMovements via API."""
    # Auth setup
    user_data = {
        'email': '65gsM@d5xjj.com',
        'password': 'V8U9v',
        'is_active': True,
        'role_id': 55,
        'phone_numer': 'O',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='YaTOi85',
        name='N0DND',
        description='tn0KtKZlGnZSa08HnJRzffU8JkOAh7e4eYOYN8fwPQ',
        image='1N85',
        cost_price=38.49,
        selling_price=70.65,
        unit='9qwVDMnA89',
        low_stock_alert=7,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='jRuAH@1fnml.com',
        password='y5fj3',
        is_active=True,
        phone_numer='J2ERPqFa',
        address='MYfawpJvL6KBy9fR5ZKXdZWaOo8ZXFkKbjd5mJkTzvC6icBmr4w9EpPXMQ2',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    stock_movements_data = {
        'product_id': products.id,
        'user_id': users.id,
        'type': 'out_stock',
        'quantity': 3,
        'stock_before': 14,
        'stock_after': 19,
        'reference': 'hoIOvS',
    }

    # Precompute enum values for update
    enum_values_map = {}
    enum_values_map['type'] = ['in_stock', 'out_stock']

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

    resp_c = client.post('/api/v1/stock_movements/', json=stock_movements_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_c.status_code == status.HTTP_200_OK
    created = resp_c.json()

    # Handle self-reference updates if needed
    fk_fields = ['product_id', 'user_id']
    self_ref_fields = []

    # Build update_data for API
    update_data = {
        k: _updated_value(k, v)
        for k, v in stock_movements_data.items()
        if k not in ('id', 'hashed_password') and k not in fk_fields and k not in self_ref_fields and not isinstance(v, dict)
    }

    resp_u = client.put(f'/api/v1/stock_movements/{created["id"]}', json=update_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_u.status_code == status.HTTP_200_OK, resp_u.json()
    updated = resp_u.json()
    assert updated['id'] == created['id']
    assert updated['type'] == update_data['type']
    assert updated['quantity'] == update_data['quantity']
    assert updated['stock_before'] == update_data['stock_before']
    assert updated['stock_after'] == update_data['stock_after']
    assert updated['reference'] == update_data['reference']


def test_get_stock_movements_api(client, db):
    """Get StockMovements via API."""
    # Auth setup
    user_data = {
        'email': 'BhMbH@rxvon.com',
        'password': 'IAOXJ',
        'is_active': True,
        'role_id': 5,
        'phone_numer': '3gg7',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='OPbrDggcY',
        name='YUKzo',
        description='uc0yreat6ThAfFPBnAw10pG1T66bADvHa9Ba',
        image='0DeH8cn',
        cost_price=41.08,
        selling_price=65.33,
        unit='RfVS5uP',
        low_stock_alert=1,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='1tKQz@ignty.com',
        password='NGDaQ',
        is_active=False,
        phone_numer='bz',
        address='q4v4FHEEdiQpONuGdoByxNufidh5C5FA8wUbvxpKHWplFufDosktcc0tEx',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    stock_movements_data = {
        'product_id': products.id,
        'user_id': users.id,
        'type': 'in_stock',
        'quantity': 10,
        'stock_before': 11,
        'stock_after': 8,
        'reference': 'gMvs',
    }


    base_ep = '/api/v1/stock_movements'

    # Query parameters for GET endpoint
    relation = ['product{id}', 'user{id}']
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = [{'key': 'product.deleted_at', 'operator': 'isNull'}, {'key': 'user.deleted_at', 'operator': 'isNull'}]
    base_columns = ['id', 'product_id', 'user_id', 'type', 'quantity']

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
    client.post('/api/v1/stock_movements/', json=stock_movements_data, headers={"Authorization": f"Bearer {token}"})

    # GET with parameters
    resp_g = client.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resp_g.status_code == status.HTTP_200_OK
    items = resp_g.json()['data']
    assert any(item.get('id') for item in items)

    # Verify that relations are populated
    for item in items:
        if item.get('product') is not None:
            assert isinstance(item['product'], dict)
            assert 'id' in item['product']
    for item in items:
        if item.get('user') is not None:
            assert isinstance(item['user'], dict)
            assert 'id' in item['user']


def test_get_by_id_stock_movements_api(client, db):
    """Get_by_id StockMovements via API."""
    # Auth setup
    user_data = {
        'email': 't0fzf@07jcv.com',
        'password': 'pwS8H',
        'is_active': True,
        'role_id': 83,
        'phone_numer': 'yWweE6qHj',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='huOAemOf',
        name='5d1YGV2N',
        description='QZ4Mgz1fWx87lVIADbuDzVDjtbmDw674ZZdg7TxKX59cLMWcJHiKFpAfI1X',
        image='TYCiMu',
        cost_price=30.52,
        selling_price=32.97,
        unit='oOO252',
        low_stock_alert=6,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='0UJk6@zdlxq.com',
        password='OoY84',
        is_active=True,
        phone_numer='1W6pImYWm',
        address='1sHQlobKNh1TBWP',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    stock_movements_data = {
        'product_id': products.id,
        'user_id': users.id,
        'type': 'out_stock',
        'quantity': 1,
        'stock_before': 1,
        'stock_after': 8,
        'reference': 'tp',
    }


    base_ep = '/api/v1/stock_movements'

    # Query parameters for GET_BY_ID endpoint
    relation = ['product{id}', 'user{id}']
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = [{'key': 'product.deleted_at', 'operator': 'isNull'}, {'key': 'user.deleted_at', 'operator': 'isNull'}]
    base_columns = ['id', 'product_id', 'user_id', 'type', 'quantity']

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

    resp_c = client.post('/api/v1/stock_movements/', json=stock_movements_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()

    # GET by ID with parameters
    url = f'/api/v1/stock_movements/{created["id"]}?{query_string}' if query_string else f'/api/v1/stock_movements/{created["id"]}'
    resp_g = client.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resp_g.status_code == status.HTTP_200_OK
    retrieved = resp_g.json()
    assert retrieved['id'] == created['id']

    # Verify that relations are populated
    if retrieved.get('product') is not None:
        assert isinstance(retrieved['product'], dict)
        assert 'id' in retrieved['product']
    if retrieved.get('user') is not None:
        assert isinstance(retrieved['user'], dict)
        assert 'id' in retrieved['user']


def test_delete_stock_movements_api(client, db):
    """Delete StockMovements via API."""
    # Auth setup
    user_data = {
        'email': 'xWmRm@gplhz.com',
        'password': '1oU76',
        'is_active': True,
        'role_id': 77,
        'phone_numer': 'a',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='qjAUkL2ad',
        name='I3Uo',
        description='uUvnAYsUEFTeZPMhWUw8z1XkHBJfZkEKw1gBdUjDndpWrOFjbDjR5RWyLYCrA7bgjY1bRgme7z7hx2',
        image='cQ',
        cost_price=31.47,
        selling_price=82.02,
        unit='8pV',
        low_stock_alert=6,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='SWRfD@gpim1.com',
        password='vVXyG',
        is_active=False,
        phone_numer='zs',
        address='GFC3eKpLECNavnibmex6kYcCiVNyOEr9QPCDitvfff3bsdrTakqfB64TE5ZUWpkaucwtFb2ii40sIi7Oe8X61rKxHlTp1uNhPI',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    stock_movements_data = {
        'product_id': products.id,
        'user_id': users.id,
        'type': 'out_stock',
        'quantity': 2,
        'stock_before': 1,
        'stock_after': 18,
        'reference': 'Rj',
    }

    resp_c = client.post('/api/v1/stock_movements/', json=stock_movements_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()
    resp_d = client.delete(f'/api/v1/stock_movements/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_d.status_code == status.HTTP_200_OK
    deleted = resp_d.json()
    assert deleted['msg'] == 'StockMovements deleted successfully'
    resp_chk = client.get(f'/api/v1/stock_movements/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_chk.status_code == status.HTTP_404_NOT_FOUND

# begin #
# ---write your code here--- #
# end #
