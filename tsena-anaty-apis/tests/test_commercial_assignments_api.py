# begin #
# ---write your code here--- #
# end #

from fastapi import status
from app import crud, schemas
from datetime import datetime, timedelta, date, time
import random
import json
from app.core import security


def test_create_commercial_assignments_api(client, db):
    """Create CommercialAssignments via API."""
    # Auth setup
    user_data = {
        'email': 'OMfuW@re5hm.com',
        'password': 'fL27H',
        'is_active': True,
        'role_id': 62,
        'phone_numer': 'HW7JNZAPzw',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='qukUU@fqsup.com',
        password='D4mdc',
        is_active=False,
        role_id=1,
        phone_numer='Q2QM',
        address='As0Kg841YDjfcctxOOJvePo0HYFR5lhAi1K3LbBYnt0JrQwdsPCym',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='SngyOJ',
        name='Smv',
        description='XlPCew',
        image='gu5',
        category_id=1,
        cost_price=75.2,
        selling_price=34.77,
        unit='Fz',
        low_stock_alert=0,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    commercial_assignments_data = {
        'user_id': users.id,
        'product_id': products.id,
        'quantity': 7,
    }

    resp = client.post('/api/v1/commercial_assignments/', json=commercial_assignments_data, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == status.HTTP_200_OK, resp.text
    created = resp.json()
    assert created['id'] is not None
    assert created['user_id'] == commercial_assignments_data['user_id']
    assert created['product_id'] == commercial_assignments_data['product_id']
    assert created['quantity'] == commercial_assignments_data['quantity']


def test_update_commercial_assignments_api(client, db):
    """Update CommercialAssignments via API."""
    # Auth setup
    user_data = {
        'email': 'F9ub0@xyvop.com',
        'password': '6jDqC',
        'is_active': True,
        'role_id': 2,
        'phone_numer': 'Yfr9Nf',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='GfSb2@17nar.com',
        password='nh1TB',
        is_active=False,
        role_id=1,
        phone_numer='21JHNg',
        address='CCqjN2rDRBjMFNTJ16YpO4rXWa7gnDgwiQvQLHaf4IqIGnKTGjdTgCUVIfEdLBhl5',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='mgRc',
        name='UHuigp',
        description='eTlWnWp1buNEONrSWsv4rDdxJuHk4NdJAclPLJFxnx66dB2RqOp8JnaGMEImjNXYlxZMO5nk1LlUm9CzxaRNwuMk2ubZM',
        image='gnFfEpS',
        category_id=1,
        cost_price=74.44,
        selling_price=27.84,
        unit='BcKyzMB',
        low_stock_alert=0,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    commercial_assignments_data = {
        'user_id': users.id,
        'product_id': products.id,
        'quantity': 1,
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

    resp_c = client.post('/api/v1/commercial_assignments/', json=commercial_assignments_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_c.status_code == status.HTTP_200_OK
    created = resp_c.json()

    # Handle self-reference updates if needed
    fk_fields = ['user_id', 'product_id']
    self_ref_fields = []

    # Build update_data for API
    update_data = {
        k: _updated_value(k, v)
        for k, v in commercial_assignments_data.items()
        if k not in ('id', 'hashed_password') and k not in fk_fields and k not in self_ref_fields and v is not None and not isinstance(v, dict)
    }

    resp_u = client.put(f'/api/v1/commercial_assignments/{created["id"]}', json=update_data, headers={"Authorization": f"Bearer {token}"})
    assert resp_u.status_code == status.HTTP_200_OK, resp_u.json()
    updated = resp_u.json()
    assert updated['id'] == created['id']
    assert updated['quantity'] == update_data['quantity']


def test_get_commercial_assignments_api(client, db):
    """Get CommercialAssignments via API."""
    # Auth setup
    user_data = {
        'email': 'IzW7f@qotrc.com',
        'password': 'lFJxH',
        'is_active': True,
        'role_id': 90,
        'phone_numer': 'DR',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='ns8LM@xkik5.com',
        password='9MJiv',
        is_active=True,
        role_id=1,
        phone_numer='8Iasxd2GLF',
        address='X2OQeiEREmbapnrQfjVIP6Ag',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='S9UteA',
        name='WSPxUUNUk3',
        description='qAtBE4mx',
        image='2K55fZ',
        category_id=1,
        cost_price=58.89,
        selling_price=27.5,
        unit='cRn',
        low_stock_alert=2,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    commercial_assignments_data = {
        'user_id': users.id,
        'product_id': products.id,
        'quantity': 5,
    }


    base_ep = '/api/v1/commercial_assignments'

    # Query parameters for GET endpoint
    relation = ['user{id}', 'product{id}']
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = [{'key': 'user.deleted_at', 'operator': 'isNull'}, {'key': 'product.deleted_at', 'operator': 'isNull'}]
    base_columns = ['id', 'user_id', 'product_id', 'quantity']

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
    client.post('/api/v1/commercial_assignments/', json=commercial_assignments_data, headers={"Authorization": f"Bearer {token}"})

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


def test_get_by_id_commercial_assignments_api(client, db):
    """Get_by_id CommercialAssignments via API."""
    # Auth setup
    user_data = {
        'email': 'CFCNY@zscpn.com',
        'password': 'XLokw',
        'is_active': True,
        'role_id': 50,
        'phone_numer': 'BxtYPWMv',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='uSAto@avt40.com',
        password='1vAgk',
        is_active=False,
        role_id=1,
        phone_numer='DzlO',
        address='uXB7',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='3RLA544',
        name='656LNm',
        description='wlGDOYTMrqghovjlyB4t4otY0qhUvppKQqUOPGh',
        image='dNJDU1PBO',
        category_id=1,
        cost_price=66.3,
        selling_price=83.24,
        unit='WcdAz',
        low_stock_alert=10,
        status='inactive',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    commercial_assignments_data = {
        'user_id': users.id,
        'product_id': products.id,
        'quantity': 1,
    }


    base_ep = '/api/v1/commercial_assignments'

    # Query parameters for GET_BY_ID endpoint
    relation = ['user{id}', 'product{id}']
    where = [{'key': 'deleted_at', 'operator': 'isNull'}, {'key': 'created_at', 'operator': 'isNotNull'}]
    where_relation = [{'key': 'user.deleted_at', 'operator': 'isNull'}, {'key': 'product.deleted_at', 'operator': 'isNull'}]
    base_columns = ['id', 'user_id', 'product_id', 'quantity']

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

    resp_c = client.post('/api/v1/commercial_assignments/', json=commercial_assignments_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()

    # GET by ID with parameters
    url = f'/api/v1/commercial_assignments/{created["id"]}?{query_string}' if query_string else f'/api/v1/commercial_assignments/{created["id"]}'
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


def test_delete_commercial_assignments_api(client, db):
    """Delete CommercialAssignments via API."""
    # Auth setup
    user_data = {
        'email': 'HlfC2@grpcr.com',
        'password': 'h9rX7',
        'is_active': True,
        'role_id': 54,
        'phone_numer': 'BgVII5qd4H',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    # Test data for Users
    users_data = schemas.UsersCreate(
        email='2X7Ru@dno9f.com',
        password='hGx43',
        is_active=False,
        role_id=1,
        phone_numer='4jK3Xd',
        address='FDTjOJF7f0XRx4h4xsExCXmBHkeKTWC9h09v1TEjLsLMwWA4Sx5B8o5Os',
    )

    users = crud.users.create(db=db, obj_in=users_data)
    db.commit()
    db.refresh(users)

    # Test data for Products
    products_data = schemas.ProductsCreate(
        sku='9GThfHsJ',
        name='nGQ8518',
        description='FWg4FOGy1SNGeDOWd4h8LgwC4',
        image='w55i8NRFlB',
        category_id=1,
        cost_price=30.0,
        selling_price=9.23,
        unit='AeS7fKQC',
        low_stock_alert=6,
        status='active',
    )

    products = crud.products.create(db=db, obj_in=products_data)
    db.commit()
    db.refresh(products)

    commercial_assignments_data = {
        'user_id': users.id,
        'product_id': products.id,
        'quantity': 12,
    }

    resp_c = client.post('/api/v1/commercial_assignments/', json=commercial_assignments_data, headers={"Authorization": f"Bearer {token}"})
    created = resp_c.json()
    resp_d = client.delete(f'/api/v1/commercial_assignments/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_d.status_code == status.HTTP_200_OK
    deleted = resp_d.json()
    assert deleted['msg'] == 'CommercialAssignments deleted successfully'
    resp_chk = client.get(f'/api/v1/commercial_assignments/{created["id"]}', headers={"Authorization": f"Bearer {token}"})
    assert resp_chk.status_code == status.HTTP_404_NOT_FOUND

# begin #
# ---write your code here--- #
# end #
