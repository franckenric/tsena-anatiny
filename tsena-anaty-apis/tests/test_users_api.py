# begin #
# ---write your code here--- #
# end #

from fastapi import status
from app import crud, schemas
from datetime import datetime, timedelta, date, time
import random
import json
from app.core import security


def test_create_users_api(client, db):
    """Create Users via API."""
    # Auth setup
    user_data = {
        'email': 'qPV3c@uutel.com',
        'password': '01biq',
        'is_active': True,
        'role_id': 88,
        'phone_numer': 'Yq6bR',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    users_data = {
        'email': 'Ouwan@gkjz9.com',
        'password': 'z6OMM',
        'is_active': True,
        'role_id': 2,
        'phone_numer': 'XYXiEkoKZC',
        'address': 'corThnSHKznv0PaIgjP4ReFyltPQQm7eLS4XkxWOf7LdYgUGk161azNrxLAZb',
    }

    resp = client.post('/api/v1/users/', json=users_data, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    created = resp.json()
    assert created['id'] is not None
    assert created['email'] == users_data['email']
    assert created['is_active'] == users_data['is_active']
    assert created['role_id'] == users_data['role_id']
    assert created['phone_numer'] == users_data['phone_numer']
    assert created['address'] == users_data['address']


def test_update_users_api(client, db):
    """Update Users via API."""
    # Auth setup
    user_data = {
        'email': 'Tkv2Q@8e2tg.com',
        'password': 'DaYti',
        'is_active': True,
        'role_id': 73,
        'phone_numer': '94V',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    users_data = {
        'email': 'di1Lv@zygrw.com',
        'password': 'XnUUB',
        'is_active': False,
        'role_id': 2,
        'phone_numer': 'wF5br53Ew',
        'address': 'z9PG7FEQ004WYI9HJ8EVBCczotaXNxBduOxUbWFwVwxQmDFblSrzvjDdX4q6C3YpiVOH0GtA2fbQlNeqUcdWQ7lfCmw',
    }

    # Precompute enum values for update
    enum_values_map = {}

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

    resp_c = client.post('/api/v1/users/', json=users_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_c.status_code == status.HTTP_200_OK
    created = resp_c.json()

    # Handle self-reference updates if needed
    fk_fields = ['role_id']
    self_ref_fields = []

    # Build update_data for API
    update_data = {
        k: _updated_value(k, v)
        for k, v in users_data.items()
        if k not in ('id', 'hashed_password') and k not in fk_fields and k not in self_ref_fields and v is not None and not isinstance(v, dict)
    }

    resp_u = client.put(f'/api/v1/users/{created["id"]}', json=update_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_u.status_code == status.HTTP_200_OK, resp_u.json()
    updated = resp_u.json()
    assert updated['id'] == created['id']
    assert updated['email'] == update_data['email']
    assert updated['is_active'] == update_data['is_active']
    assert updated['phone_numer'] == update_data['phone_numer']
    assert updated['address'] == update_data['address']


def test_get_users_api(client, db):
    """Get Users via API."""
    # Auth setup
    user_data = {
        'email': 'rHBxS@6kwqb.com',
        'password': '8GbkR',
        'is_active': True,
        'role_id': 10,
        'phone_numer': 'sA',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    users_data = {
        'email': '9aspv@iz09p.com',
        'password': 'FeRcc',
        'is_active': True,
        'role_id': 2,
        'phone_numer': 'inpX',
        'address': 'ulT9tIsGNykGt87bbUrLuTHGeBD8xvAPD9RuwCAFYtgk',
    }


    base_ep = '/api/v1/users'

    # Query parameters for GET endpoint
    relation = []
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = []
    base_columns = ['id', 'email', 'hashed_password', 'is_active', 'role_id', 'phone_numer']

    # Build URL with query parameters
    query_params = []
    if where:
        query_params.append(f'where={json.dumps(where)}')
    if base_columns:
        query_params.append(f'base_columns={json.dumps(base_columns)}')
    query_string = '&'.join(query_params)
    url = f'{base_ep}/?{query_string}' if query_string else f'{base_ep}/'

    # Create test data
    client.post('/api/v1/users/', json=users_data, headers={"Authorization": f"Bearer {token}"})

    # GET with parameters
    resp_g = client.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resp_g.status_code == status.HTTP_200_OK
    items = resp_g.json()['data']
    assert any(item.get('id') for item in items)


def test_get_by_id_users_api(client, db):
    """Get_by_id Users via API."""
    # Auth setup
    user_data = {
        'email': 'KsZ2H@ti6wm.com',
        'password': '39XWK',
        'is_active': True,
        'role_id': 65,
        'phone_numer': 'T4T4z',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    users_data = {
        'email': 'NbUWZ@er8ev.com',
        'password': 'yr2t5',
        'is_active': True,
        'role_id': 2,
        'phone_numer': 'M3tlPW',
        'address': 'IFzJIkWUjegLqbGGYTXxLPtEyL7hbvDamqHd2ZuvPIMAwN4QUz4nlpL8TqHZrtiACV',
    }


    base_ep = '/api/v1/users'

    # Query parameters for GET_BY_ID endpoint
    relation = []
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = []
    base_columns = ['id', 'email', 'hashed_password', 'is_active', 'role_id', 'phone_numer']

    # Build URL with query parameters
    query_params = []
    if where:
        query_params.append(f'where={json.dumps(where)}')
    if base_columns:
        query_params.append(f'base_columns={json.dumps(base_columns)}')
    query_string = '&'.join(query_params)

    resp_c = client.post('/api/v1/users/', json=users_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()

    # GET by ID with parameters
    url = f'/api/v1/users/{created["id"]}?{query_string}' if query_string else f'/api/v1/users/{created["id"]}'
    resp_g = client.get(url, headers={"Authorization": f"Bearer {token}"})
    assert resp_g.status_code == status.HTTP_200_OK
    retrieved = resp_g.json()
    assert retrieved['id'] == created['id']


def test_delete_users_api(client, db):
    """Delete Users via API."""
    # Auth setup
    user_data = {
        'email': 'QhIWL@vo7cu.com',
        'password': 'NTkUs',
        'is_active': True,
        'role_id': 14,
        'phone_numer': 'WHxaos',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    users_data = {
        'email': 'bZ4Kz@2dfzb.com',
        'password': 'brcjx',
        'is_active': False,
        'role_id': 2,
        'phone_numer': 'hM',
        'address': 'o4Q4uyD7zgiYP15OLI3TYqmglMHCjgdAyd1MzGsoTiHowYkr2aU8k25bn7f9HxhHm',
    }

    resp_c = client.post('/api/v1/users/', json=users_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()
    resp_d = client.delete(f'/api/v1/users/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_d.status_code == status.HTTP_200_OK
    deleted = resp_d.json()
    assert deleted['msg'] == 'Users deleted successfully'
    resp_chk = client.get(f'/api/v1/users/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_chk.status_code == status.HTTP_404_NOT_FOUND

# begin #
# ---write your code here--- #
# end #
