import json
import threading
import time
from urllib.parse import quote

from fastapi import status
from app import crud, schemas
from app.core import security


CUSTOMER_PHONE = '+261 33 12 345 67'


def _auth(db) -> tuple:
    user_data = {
        'email': 'ws-notif@test.com',
        'password': 'test123',
        'is_active': True,
        'role_id': 1,
        'phone_numer': 'ws-notif',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})
    return user, {'Authorization': f'Bearer {token}'}, token


def _customer_user(db) -> schemas.Users:
    user_data = {
        'email': 'customer-notif@test.com',
        'password': 'test123',
        'is_active': True,
        'role_id': 2,
        'phone_numer': CUSTOMER_PHONE,
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    return user


def _ws_url(token) -> str:
    return f'/ws/notifications?token={quote(token)}'


def _product(db) -> schemas.Products:
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=1,
            sku='SKU-WS-NOTIF',
            name='Produit WS',
            image='/No_Image_Available.jpg',
            status='active',
        ),
    )
    db.commit()
    db.refresh(product)
    crud.stock.create(db, obj_in=schemas.StockCreate(product_id=product.id, quantity=50))
    db.commit()
    return product


def _customer(db) -> schemas.Customers:
    customer = crud.customers.create(
        db,
        obj_in=schemas.CustomersCreate(
            name='Client WS',
            phone=CUSTOMER_PHONE,
            delivery_address='Antananarivo',
        ),
    )
    db.commit()
    db.refresh(customer)
    return customer


def test_websocket_requires_valid_token(client):
    from starlette.websockets import WebSocketDisconnect

    rejected = False
    try:
        with client.websocket_connect(
            '/ws/notifications?token=invalid-token'
        ) as ws:
            ws.receive_text()
    except WebSocketDisconnect as exc:
        rejected = exc.code == 1008
    assert rejected


def test_websocket_receives_order_created(client, db):
    user, headers, token = _auth(db)
    product = _product(db)
    customer = _customer(db)
    product_id = product.id
    customer_id = customer.id

    with client.websocket_connect(_ws_url(token)) as ws:
        resp = client.post(
            '/api/v1/orders/',
            headers=headers,
            json={
                'user_id': user.id,
                'customer_id': customer_id,
                'movements': [{'product_id': product_id, 'quantity': 2}],
                'status': 'draft',
            },
        )
        assert resp.status_code == status.HTTP_200_OK, resp.text

        raw = ws.receive_text()
        payload = json.loads(raw)
        assert payload['type'] == 'order.created'
        assert payload['data']['order_id'] == resp.json()['id']
        assert payload['data']['customer_name'] == 'Client WS'
        assert payload['data']['status'] == 'draft'
        assert payload['data']['total'] == 0


def test_websocket_receives_status_change(client, db):
    user, headers, token = _auth(db)
    product = _product(db)
    customer = _customer(db)
    product_id = product.id
    customer_id = customer.id

    resp_c = client.post(
        '/api/v1/orders/',
        headers=headers,
        json={
            'user_id': user.id,
            'customer_id': customer_id,
            'movements': [{'product_id': product_id, 'quantity': 2}],
            'status': 'draft',
        },
    )
    assert resp_c.status_code == status.HTTP_200_OK, resp_c.text
    order_id = resp_c.json()['id']

    with client.websocket_connect(_ws_url(token)) as ws:
        resp_u = client.put(
            f'/api/v1/orders/{order_id}',
            headers=headers,
            json={
                'customer_id': customer_id,
                'status': 'confirmed',
                'movements': [{'product_id': product_id, 'quantity': 2}],
            },
        )
        assert resp_u.status_code == status.HTTP_200_OK, resp_u.text

        raw = ws.receive_text()
        payload = json.loads(raw)
        assert payload['type'] == 'order.status_changed'
        assert payload['data']['order_id'] == order_id
        assert payload['data']['previous_status'] == 'draft'
        assert payload['data']['status'] == 'confirmed'


def test_websocket_no_event_when_status_unchanged(client, db):
    user, headers, token = _auth(db)
    product = _product(db)
    customer = _customer(db)
    product_id = product.id
    customer_id = customer.id

    resp_c = client.post(
        '/api/v1/orders/',
        headers=headers,
        json={
            'user_id': user.id,
            'customer_id': customer_id,
            'movements': [{'product_id': product_id, 'quantity': 2}],
            'status': 'draft',
        },
    )
    assert resp_c.status_code == status.HTTP_200_OK, resp_c.text
    order_id = resp_c.json()['id']

    with client.websocket_connect(_ws_url(token)) as ws:
        resp_u = client.put(
            f'/api/v1/orders/{order_id}',
            headers=headers,
            json={'customer_id': customer_id, 'status': 'draft'},
        )
        assert resp_u.status_code == status.HTTP_200_OK, resp_u.text

        results: list = []

        def recv() -> None:
            try:
                results.append(ws.receive_text())
            except Exception as exc:  # noqa: BLE001
                results.append(exc)

        receiver = threading.Thread(target=recv, daemon=True)
        receiver.start()
        time.sleep(0.5)
        assert receiver.is_alive(), f"unexpected message received: {results}"


def _place_order(client, headers, user_id, product_id, customer_id, status_value='draft'):
    resp = client.post(
        '/api/v1/orders/',
        headers=headers,
        json={
            'user_id': user_id,
            'customer_id': customer_id,
            'movements': [{'product_id': product_id, 'quantity': 2}],
            'status': status_value,
        },
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    return resp.json()['id']


def test_notifications_rest_list_and_read(client, db):
    user, headers, _ = _auth(db)
    user_id = user.id
    product = _product(db)
    customer = _customer(db)
    product_id = product.id
    customer_id = customer.id
    order_id = _place_order(client, headers, user_id, product_id, customer_id)

    resp = client.get('/api/v1/notifications/', headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    body = resp.json()
    assert body['count'] >= 1
    assert body['unread_count'] >= 1
    item = body['data'][0]
    assert item['type'] == 'order.created'
    assert item['order_id'] == order_id
    assert item['user_id'] == user_id
    assert item['read'] is False

    resp = client.patch(f"/api/v1/notifications/{item['id']}/read", headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    assert resp.json()['read'] is True

    resp = client.get('/api/v1/notifications/', headers=headers)
    assert resp.json()['unread_count'] == 0


def test_notifications_rest_mark_all_read(client, db):
    user, headers, _ = _auth(db)
    user_id = user.id
    product = _product(db)
    customer = _customer(db)
    product_id = product.id
    customer_id = customer.id
    _place_order(client, headers, user_id, product_id, customer_id)
    _place_order(client, headers, user_id, product_id, customer_id)

    resp = client.post('/api/v1/notifications/read-all', headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    assert resp.json()['count'] >= 2

    resp = client.get('/api/v1/notifications/', headers=headers)
    body = resp.json()
    assert body['unread_count'] == 0
    assert body['count'] >= 2
    assert all(n['read'] for n in body['data'])


def test_notifications_rest_clear(client, db):
    user, headers, _ = _auth(db)
    user_id = user.id
    product = _product(db)
    customer = _customer(db)
    product_id = product.id
    customer_id = customer.id
    _place_order(client, headers, user_id, product_id, customer_id)

    resp = client.delete('/api/v1/notifications/', headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    assert resp.json()['count'] >= 1

    resp = client.get('/api/v1/notifications/', headers=headers)
    assert resp.json()['count'] == 0


def test_notifications_rest_customer_scoped(client, db):
    admin, admin_headers, _ = _auth(db)
    admin_id = admin.id
    customer_user = _customer_user(db)
    customer_user_id = customer_user.id
    product = _product(db)
    customer = _customer(db)
    customer_id = customer.id
    product_id = product.id

    _place_order(client, admin_headers, admin_id, product_id, customer_id)
    order_id = _place_order(client, admin_headers, admin_id, product_id, customer_id)
    resp = client.put(
        f'/api/v1/orders/{order_id}',
        headers=admin_headers,
        json={'customer_id': customer_id, 'status': 'confirmed',
              'movements': [{'product_id': product_id, 'quantity': 2}]},
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text

    resp = client.get(f'/api/v1/notifications/?customer_id={customer_id}', headers=admin_headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    body = resp.json()
    assert body['count'] >= 1
    item = body['data'][0]
    assert item['user_id'] == customer_user_id
    assert item['type'] == 'order.status_changed'
    assert item['previous_status'] == 'draft'
    assert item['status'] == 'confirmed'
    assert body['unread_count'] >= 1

    resp = client.post(f'/api/v1/notifications/read-all?customer_id={customer_id}', headers=admin_headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    resp = client.get(f'/api/v1/notifications/?customer_id={customer_id}', headers=admin_headers)
    assert resp.json()['unread_count'] == 0
