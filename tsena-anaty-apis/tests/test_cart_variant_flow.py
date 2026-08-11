"""Tests for the variant-aware cart / checkout flow."""

from fastapi import status
from app import crud, schemas
from app.core import security


def _auth_headers(client, db):
    user_data = {
        'email': 'cartvariant@test.com',
        'password': 'test123',
        'is_active': True,
        'role_id': 2,
        'phone_numer': '12345',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})
    return {'Authorization': f'Bearer {token}'}, user.id


def _create_product_with_variants(db):
    category = crud.categories.create(
        db, obj_in=schemas.CategoriesCreate(name='Coques', status='active')
    )
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=category.id,
            sku='SKU-CART-VAR',
            name='Coque Variante',
            image='/No_Image_Available.jpg',
            status='active',
        ),
    )
    db.commit()
    db.refresh(product)

    black = crud.product_variants.create(
        db,
        obj_in=schemas.ProductVariantCreate(
            product_id=product.id, name='Noir', quantity=5, selling_price=1000
        ),
    )
    red = crud.product_variants.create(
        db,
        obj_in=schemas.ProductVariantCreate(
            product_id=product.id, name='Rouge', quantity=3, selling_price=1200
        ),
    )
    db.commit()
    db.refresh(black)
    db.refresh(red)
    return product, black, red


def _create_customer(db):
    customer = crud.customers.create(
        db,
        obj_in=schemas.CustomersCreate(
            name='Client Variante',
            phone='+261 33 12 345 67',
            delivery_address='Antananarivo',
        ),
    )
    db.commit()
    db.refresh(customer)
    return customer


def _create_hierarchical_variant_product(db):
    category = crud.categories.create(
        db, obj_in=schemas.CategoriesCreate(name='Coques', status='active')
    )
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=category.id,
            sku='SKU-CART-HIER',
            name='Coque Hiérarchie',
            image='/No_Image_Available.jpg',
            status='active',
        ),
    )
    parent = crud.product_variants.create(
        db,
        obj_in=schemas.ProductVariantCreate(
            product_id=product.id, name='iPhone 12', quantity=20
        ),
    )
    noir = crud.product_variants.create(
        db,
        obj_in=schemas.ProductVariantCreate(
            product_id=product.id, parent_id=parent.id, name='Noir', quantity=10
        ),
    )
    blanc = crud.product_variants.create(
        db,
        obj_in=schemas.ProductVariantCreate(
            product_id=product.id, parent_id=parent.id, name='Blanc', quantity=10
        ),
    )
    db.commit()
    db.refresh(product)
    db.refresh(parent)
    db.refresh(noir)
    db.refresh(blanc)
    return product, parent, noir, blanc


def test_hierarchical_variant_rollup_and_checkout(client, db):
    """Le stock d'une variante = somme des sous-variantes ; seules les feuilles sont commandables."""
    headers, user_id = _auth_headers(client, db)
    product, parent, noir, blanc = _create_hierarchical_variant_product(db)
    customer = _create_customer(db)

    parent_id, noir_id, blanc_id, product_id, customer_id = (
        parent.id,
        noir.id,
        blanc.id,
        product.id,
        customer.id,
    )

    assert crud.product_variants.effective_quantity(db, variant_id=parent_id) == 20

    # 1. Une variante qui a des sous-variantes n'est pas commandable
    resp_parent = client.post(
        '/api/v1/cart_items/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'product_id': product_id,
            'variant_id': parent_id,
            'quantity': 1,
            'unit_cost': 1000,
        },
    )
    assert resp_parent.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY, resp_parent.text
    assert 'sous-variante' in resp_parent.json()['detail']

    # 2. Dépassement de la somme des feuilles -> 409 (et non 20 + 10 + 10)
    resp_over = client.post(
        '/api/v1/cart_items/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'product_id': product_id,
            'variant_id': noir_id,
            'quantity': 21,
            'unit_cost': 1000,
        },
    )
    assert resp_over.status_code == status.HTTP_409_CONFLICT, resp_over.text
    assert 'disponible: 10' in resp_over.json()['detail']

    # 3. On commande une sous-variante (feuille) : seule cette feuille décrémente
    resp = client.post(
        '/api/v1/cart_items/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'product_id': product_id,
            'variant_id': noir_id,
            'quantity': 6,
            'unit_cost': 1000,
        },
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text

    resp_ck = client.post(
        f'/api/v1/cart_items/checkout/{customer_id}',
        headers=headers,
        json={'user_id': user_id, 'status': 'delivered'},
    )
    assert resp_ck.status_code in (
        status.HTTP_200_OK,
        status.HTTP_201_CREATED,
    ), resp_ck.text
    order = resp_ck.json()

    from app.db.session import SessionLocal

    fresh = SessionLocal()
    try:
        noir_after = crud.product_variants.get(fresh, id=noir_id)
        blanc_after = crud.product_variants.get(fresh, id=blanc_id)
        assert noir_after.quantity == 10 - 6
        assert blanc_after.quantity == 10

        movements = crud.stock_movements.get_multi_where_array(
            fresh,
            where=[
                {'key': 'commande_id', 'operator': '==', 'value': order['id']}
            ],
        )
        assert {m.variant_id for m in movements} == {noir_id}
    finally:
        fresh.close()


def test_cart_item_variant_roundtrip_and_checkout(client, db):
    headers, user_id = _auth_headers(client, db)
    product, black, red = _create_product_with_variants(db)
    customer = _create_customer(db)

    # Snapshot plain ids: after each API request the shared fixture session is
    # closed, leaving SQLAlchemy objects detached and expired.
    customer_id, product_id, black_id, red_id = (
        customer.id,
        product.id,
        black.id,
        red.id,
    )

    # 1. Add to cart with variant_id
    resp = client.post(
        '/api/v1/cart_items/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'product_id': product_id,
            'variant_id': black_id,
            'quantity': 2,
            'unit_cost': 1000,
        },
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    item = resp.json()
    assert item['variant_id'] == black_id

    # 2. A second variant of the same product must not be merged with the first
    resp2 = client.post(
        '/api/v1/cart_items/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'product_id': product_id,
            'variant_id': red_id,
            'quantity': 1,
            'unit_cost': 1200,
        },
    )
    assert resp2.status_code == status.HTTP_200_OK, resp2.text
    assert resp2.json()['variant_id'] == red_id
    assert resp2.json()['id'] != item['id']

    # 3. Adding the same variant again merges quantities
    resp3 = client.post(
        '/api/v1/cart_items/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'product_id': product_id,
            'variant_id': black_id,
            'quantity': 1,
            'unit_cost': 1000,
        },
    )
    assert resp3.status_code == status.HTTP_200_OK, resp3.text
    assert resp3.json()['id'] == item['id']
    assert resp3.json()['quantity'] == 3

    # 3bis. Cart listing exposes product and variant name/image for display
    listing = client.get(
        f'/api/v1/cart_items/?limit=50&customer_id={customer_id}',
        headers=headers,
    )
    assert listing.status_code == status.HTTP_200_OK, listing.text
    listed = listing.json()['data']
    by_variant = {i['variant_id']: i for i in listed}
    black_item = by_variant[black_id]
    assert black_item['product']['name'] == 'Coque Variante'
    assert black_item['product']['image'] == '/No_Image_Available.jpg'
    assert black_item['variant']['name'] == 'Noir'
    assert black_item['variant']['sku'] is None

    # 4. Stock validation: quantity exceeds variant stock -> 409
    resp4 = client.post(
        '/api/v1/cart_items/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'product_id': product_id,
            'variant_id': red_id,
            'quantity': 99,
            'unit_cost': 1200,
        },
    )
    assert resp4.status_code == status.HTTP_409_CONFLICT, resp4.text

    # 5. Checkout
    resp_ck = client.post(
        f'/api/v1/cart_items/checkout/{customer_id}',
        headers=headers,
        json={'user_id': user_id, 'status': 'delivered'},
    )
    assert resp_ck.status_code in (
        status.HTTP_200_OK,
        status.HTTP_201_CREATED,
    ), resp_ck.text
    order = resp_ck.json()
    assert order['status'] == 'delivered'

    # 6. Variant quantities decreased accordingly (fresh session: the API
    # fixture closes the shared db session after each request)
    from app.db.session import SessionLocal

    fresh = SessionLocal()
    try:
        black_after = crud.product_variants.get(fresh, id=black_id)
        red_after = crud.product_variants.get(fresh, id=red_id)
        assert black_after.quantity == 5 - 3
        assert red_after.quantity == 3 - 1

        # 7. Movements carry variant_id
        movements = crud.stock_movements.get_multi_where_array(
            fresh,
            where=[
                {'key': 'commande_id', 'operator': '==', 'value': order['id']}
            ],
        )
        variant_ids = {m.variant_id for m in movements}
        assert variant_ids == {black_id, red_id}
    finally:
        fresh.close()
