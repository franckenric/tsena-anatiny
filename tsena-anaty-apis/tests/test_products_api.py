# begin #
# ---write your code here--- #
# end #

from fastapi import status
from app import crud, schemas
from datetime import datetime, timedelta, date, time
import random
import json
from app.core import security


def test_create_products_api(client, db):
    """Create Products via API."""
    # Auth setup
    user_data = {
        'email': 'wv0yx@cku2e.com',
        'password': 'aexNq',
        'is_active': True,
        'role_id': 2,
        'phone_numer': 'SFhprSwea',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    products_data = {
        'sku': 'J7lPgVn5Ju',
        'name': 'fPkT',
        'description': 'RYkmNhmho5CiYtTfdmfph',
        'image': 'YBvJz5QXHR',
        'cost_price': 57.73,
        'selling_price': 11.69,
        'unit': 'b3GD',
        'low_stock_alert': 7,
        'status': 'inactive',
    }

    resp = client.post('/api/v1/products/', json=products_data, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    created = resp.json()
    assert created['id'] is not None
    assert created['category_id'] == products_data['category_id']
    assert created['sku'] == products_data['sku']
    assert created['name'] == products_data['name']
    assert created['description'] == products_data['description']
    assert created['image'] == products_data['image']
    assert created['cost_price'] == products_data['cost_price']
    assert created['selling_price'] == products_data['selling_price']
    assert created['unit'] == products_data['unit']
    assert created['low_stock_alert'] == products_data['low_stock_alert']
    assert created['status'] == products_data['status']


def test_update_products_api(client, db):
    """Update Products via API."""
    # Auth setup
    user_data = {
        'email': '9LLh4@peowo.com',
        'password': 'nsES0',
        'is_active': True,
        'role_id': 90,
        'phone_numer': '1vFQ8',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    products_data = {
        'sku': 'NoJZTz7R',
        'name': 'nfxrcWclnK',
        'description': 'FHTh4up2JqW0uDyhMMBYHB1WY3ajdgjwoHMxD',
        'image': '9',
        'cost_price': 55.67,
        'selling_price': 48.98,
        'unit': '9S',
        'low_stock_alert': 8,
        'status': 'inactive',
    }

    # Precompute enum values for update
    enum_values_map = {}
    enum_values_map['status'] = ['active', 'inactive']

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

    resp_c = client.post('/api/v1/products/', json=products_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_c.status_code == status.HTTP_200_OK
    created = resp_c.json()

    # Handle self-reference updates if needed
    fk_fields = ['category_id']
    self_ref_fields = []

    # Build update_data for API
    update_data = {
        k: _updated_value(k, v)
        for k, v in products_data.items()
        if k not in ('id', 'hashed_password') and k not in fk_fields and k not in self_ref_fields and not isinstance(v, dict)
    }

    resp_u = client.put(f'/api/v1/products/{created["id"]}', json=update_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_u.status_code == status.HTTP_200_OK, resp_u.json()
    updated = resp_u.json()
    assert updated['id'] == created['id']
    assert updated['sku'] == update_data['sku']
    assert updated['name'] == update_data['name']
    assert updated['description'] == update_data['description']
    assert updated['image'] == update_data['image']
    assert updated['cost_price'] == update_data['cost_price']
    assert updated['selling_price'] == update_data['selling_price']
    assert updated['unit'] == update_data['unit']
    assert updated['low_stock_alert'] == update_data['low_stock_alert']
    assert updated['status'] == update_data['status']


def test_get_products_api(client, db):
    """Get Products via API."""
    # Auth setup
    user_data = {
        'email': '1yeRn@7a4hk.com',
        'password': 'AvJeP',
        'is_active': True,
        'role_id': 20,
        'phone_numer': 'BVvXJt6hL0',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    products_data = {
        'sku': 'Hhx8',
        'name': 'qgTk1Jp',
        'description': 'VKU8UN6oJnrIeeJIkMFhNFnhIsSQ4ZhjfATtAbZZBAeIJKcQFaOEBNvIVJuSLtDmE3YOuzfsjzSsKau',
        'image': 'R',
        'cost_price': 14.45,
        'selling_price': 49.57,
        'unit': 'xTQRLw6',
        'low_stock_alert': 6,
        'status': 'inactive',
    }


    base_ep = '/api/v1/products'

    # Query parameters for GET endpoint
    relation = []
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = []
    base_columns = ['id', 'category_id', 'sku', 'name', 'image']

    # Build URL with query parameters
    query_params = []
    if where:
        query_params.append(f'where={json.dumps(where)}')
    if base_columns:
        query_params.append(f'base_columns={json.dumps(base_columns)}')
    query_string = '&'.join(query_params)
    url = f'{base_ep}/?{query_string}' if query_string else f'{base_ep}/'

    # Create test data
    client.post('/api/v1/products/', json=products_data, headers={"Authorization": f"Bearer {token}"})

    # GET with parameters
    resp_g = client.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resp_g.status_code == status.HTTP_200_OK
    items = resp_g.json()['data']
    assert any(item.get('id') for item in items)


def test_get_by_id_products_api(client, db):
    """Get_by_id Products via API."""
    # Auth setup
    user_data = {
        'email': 'j5DjZ@ltfuh.com',
        'password': '2VMHy',
        'is_active': True,
        'role_id': 7,
        'phone_numer': 'q',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    products_data = {
        'sku': '7IV9',
        'name': 'q',
        'description': 'nLyILof383CQOTICGfqXh1HeFutMmVwrGV3aaMO4RIey',
        'image': '6MZ3FTPXde',
        'cost_price': 71.93,
        'selling_price': 26.68,
        'unit': 'ZJ78S',
        'low_stock_alert': 2,
        'status': 'active',
    }


    base_ep = '/api/v1/products'

    # Query parameters for GET_BY_ID endpoint
    relation = []
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = []
    base_columns = ['id', 'category_id', 'sku', 'name', 'image']

    # Build URL with query parameters
    query_params = []
    if where:
        query_params.append(f'where={json.dumps(where)}')
    if base_columns:
        query_params.append(f'base_columns={json.dumps(base_columns)}')
    query_string = '&'.join(query_params)

    resp_c = client.post('/api/v1/products/', json=products_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()

    # GET by ID with parameters
    url = f'/api/v1/products/{created["id"]}?{query_string}' if query_string else f'/api/v1/products/{created["id"]}'
    resp_g = client.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resp_g.status_code == status.HTTP_200_OK
    retrieved = resp_g.json()
    assert retrieved['id'] == created['id']


def test_delete_products_api(client, db):
    """Delete Products via API."""
    # Auth setup
    user_data = {
        'email': 'OC629@t7kaa.com',
        'password': '5f7iX',
        'is_active': True,
        'role_id': 60,
        'phone_numer': 's5R1yC',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    products_data = {
        'sku': 'VDa1ADZpTg',
        'name': '2a9',
        'description': 'PLt4TqDgAR5ixou0tKXwfGP9uDh36vAjGXVhy2EW9k2CQxLwbV7rLdfGrsxhpDzI3VHBrdsx1PwF4Yei5ZWQ3yxVZ',
        'image': '6ykzXuY',
        'cost_price': 84.08,
        'selling_price': 66.83,
        'unit': 'XMEyFBYa5g',
        'low_stock_alert': 7,
        'status': 'active',
    }

    resp_c = client.post('/api/v1/products/', json=products_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()
    resp_d = client.delete(f'/api/v1/products/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_d.status_code == status.HTTP_200_OK
    deleted = resp_d.json()
    assert deleted['msg'] == 'Products deleted successfully'
    resp_chk = client.get(f'/api/v1/products/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_chk.status_code == status.HTTP_404_NOT_FOUND

# begin #
# ---write your code here--- #
# end #
