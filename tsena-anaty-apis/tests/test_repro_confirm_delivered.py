"""Reproduction du 409 quand le back-office envoie user_id inexistant (0)
sur une commande invitee (user_id NULL) en passant delivered.
"""
from fastapi import status
from app import crud, schemas
from app.core import security


def _admin_headers(db):
    user = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email='repro-guest-dl@test.com',
            password='test123',
            is_active=True,
            role_id=1,
            phone_numer='repro-3',
        ),
    )
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})
    return {'Authorization': f'Bearer {token}'}, user.id


def test_guest_order_put_delivered_user_id_0(client, db):
    headers, user_id = _admin_headers(db)
    _ = user_id

    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=1,
            sku='SKU-GUEST-DL',
            name='Produit Guest',
            image='/No_Image_Available.jpg',
            selling_price=1000,
            status='active',
        ),
    )
    db.commit()
    db.refresh(product)
    crud.stock.create(db, obj_in=schemas.StockCreate(product_id=product.id, quantity=10))
    db.commit()

    # Commande creee via checkout-guest (user_id NULL, statut draft)
    resp = client.post(
        '/api/v1/cart_items/checkout-guest',
        json={
            'customer_name': 'Invite',
            'customer_phone': '+261 34 000 0003',
            'delivery_address': 'Tana',
            'items': [{'product_id': product.id, 'quantity': 2}],
            'status': 'draft',
        },
    )
    assert resp.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED), resp.text
    order = resp.json()
    order_id = order['id']
    assert order['user_id'] is None

    # 1. Confirmation sans user_id (comme handleConfirm du back-office)
    resp_c = client.put(
        f'/api/v1/orders/{order_id}',
        headers=headers,
        json={'customer_id': order['customer_id'], 'status': 'confirmed'},
    )
    assert resp_c.status_code == status.HTTP_200_OK, resp_c.text

    # 2. Passage en livre via le formulaire: user_id tombe a 0 si la liste des
    #    users est vide (fallback `|| 0` dans OrderFormComponent).
    resp_d = client.put(
        f'/api/v1/orders/{order_id}',
        headers=headers,
        json={'customer_id': order['customer_id'], 'user_id': 0, 'status': 'delivered'},
    )
    assert resp_d.status_code == status.HTTP_200_OK, resp_d.text
    assert resp_d.json()['user_id'] != 0