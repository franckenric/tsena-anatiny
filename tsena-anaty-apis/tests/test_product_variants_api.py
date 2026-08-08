from fastapi import status


def _auth_headers(client, db):
    from app import crud, schemas
    from app.core import security

    user_data = {
        'email': 'variant@test.com',
        'password': 'test123',
        'is_active': True,
        'role_id': 2,
        'phone_numer': '9999',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})
    return {"Authorization": f"Bearer {token}"}


def _category_and_lot(db):
    from app import crud, schemas

    category = crud.categories.create(
        db, obj_in=schemas.CategoriesCreate(name='Coques', status='active')
    )
    lot = crud.lots.create(db, obj_in=schemas.LotCreate(reference='LOT-IMPORT'))
    db.commit()
    db.refresh(category)
    db.refresh(lot)
    return category, lot


def _create_product(db, name='Coque Gertrude', category_id=1):
    from app import crud, schemas

    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=category_id,
            sku='SKU-TEST-1',
            name=name,
            image='/No_Image_Available.jpg',
            status='active',
        ),
    )
    db.commit()
    db.refresh(product)
    return product


def test_receipt_parser_extracts_attributes():
    from app.receipt_parser import _split_attributes

    base, attrs = _split_attributes(
        'Coque Gertrude, color: Black-MW15, compatible model: For iPhone12, package: Opp Bag'
    )
    assert base == 'Coque Gertrude'
    assert attrs['color'] == 'Black-MW15'
    assert attrs['compatible model'] == 'For iPhone12'
    assert attrs['package'] == 'Opp Bag'

    base2, attrs2 = _split_attributes('Simple Product')
    assert base2 == 'Simple Product'
    assert attrs2 == {}


def test_import_receipt_groups_variants(client, db):
    from app import crud

    headers = _auth_headers(client, db)
    category, lot = _category_and_lot(db)

    payload = {
        'receipt_number': 'REC-VAR-001',
        'category_id': category.id,
        'lot_id': lot.id,
        'variant_levels': ['compatible model', 'color'],
        'items': [
            {
                'name': 'Coque Gertrude, color: Black, compatible model: iPhone 15',
                'quantity': 2,
                'unit_cost': 1000.0,
                'another_price': 0.0,
                'attributes': {
                    'color': 'Black',
                    'compatible model': 'iPhone 15',
                },
            },
            {
                'name': 'Coque Gertrude, color: White, compatible model: iPhone 15',
                'quantity': 3,
                'unit_cost': 1000.0,
                'another_price': 0.0,
                'attributes': {
                    'color': 'White',
                    'compatible model': 'iPhone 15',
                },
            },
            {
                'name': 'Coque Gertrude, color: Black, compatible model: iPhone 16',
                'quantity': 1,
                'unit_cost': 1100.0,
                'another_price': 0.0,
                'attributes': {
                    'color': 'Black',
                    'compatible model': 'iPhone 16',
                },
            },
        ],
    }

    resp = client.post('/api/v1/products/import-receipt', json=payload, headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text
    products = resp.json()
    assert len(products) == 1

    product_id = products[0]['id']
    assert products[0]['name'] == 'Coque Gertrude'

    variants = crud.product_variants.get_multi_by_product(db=db, product_id=product_id)
    assert len(variants) == 5

    roots = [v for v in variants if v.parent_id is None]
    assert len(roots) == 2
    iphone15 = [v for v in roots if v.name == 'iPhone 15'][0]
    iphone16 = [v for v in roots if v.name == 'iPhone 16'][0]

    colors_15 = [v for v in variants if v.parent_id == iphone15.id]
    assert {c.name for c in colors_15} == {'Black', 'White'}
    black_15 = [v for v in colors_15 if v.name == 'Black'][0]
    white_15 = [v for v in colors_15 if v.name == 'White'][0]
    assert black_15.quantity == 2
    assert white_15.quantity == 3

    black_16 = [v for v in variants if v.parent_id == iphone16.id and v.name == 'Black'][0]
    assert black_16.quantity == 1

    # Leaf variants carry the purchase cost (unit_cost) from the receipt
    assert iphone15.unit_cost is None
    assert black_15.unit_cost == 1000.0
    assert white_15.unit_cost == 1000.0
    assert black_16.unit_cost == 1100.0

    # Product-level stock must NOT exist for variant products
    assert crud.stock.get_by_product_id(db=db, product_id=product_id) is None

    # Movements reference the leaf variants
    leaf_ids = {black_15.id, white_15.id, black_16.id}
    movements = crud.stock_movements.get_multi_where_array(
        db=db, where=[{'key': 'product_id', 'value': product_id, 'operator': '=='}]
    )
    assert len(movements) == 3
    assert {m.variant_id for m in movements} == leaf_ids


def test_variant_crud(client, db):
    from app import crud

    headers = _auth_headers(client, db)
    category, lot = _category_and_lot(db)
    product = _create_product(db, category_id=category.id)
    product_id = product.id

    # Create root variant
    resp = client.post(
        f'/api/v1/products/{product_id}/variants',
        json={
            'name': 'Pointure 40',
            'quantity': 5,
            'unit_cost': 24000.0,
            'selling_price': 25000.0,
            'image': '/files/products/variant-noir.jpg',
        },
        headers=headers,
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    root = resp.json()
    assert root['quantity'] == 5
    assert root['unit_cost'] == 24000.0
    assert root['selling_price'] == 25000.0
    assert root['image'] == '/files/products/variant-noir.jpg'

    # Create child variant
    resp = client.post(
        f'/api/v1/products/{product_id}/variants',
        json={'name': 'Noir', 'quantity': 3, 'parent_id': root['id']},
        headers=headers,
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    child = resp.json()
    assert child['parent_id'] == root['id']
    assert child['quantity'] == 3

    # Duplicate name under same parent rejected
    resp = client.post(
        f'/api/v1/products/{product_id}/variants',
        json={'name': 'Noir', 'parent_id': root['id']},
        headers=headers,
    )
    assert resp.status_code == status.HTTP_409_CONFLICT

    # Tree returned nested
    resp = client.get(f'/api/v1/products/{product_id}/variants', headers=headers)
    assert resp.status_code == status.HTTP_200_OK
    tree = resp.json()
    assert len(tree) == 1
    assert tree[0]['name'] == 'Pointure 40'
    assert tree[0]['unit_cost'] == 24000.0
    assert len(tree[0]['children']) == 1
    assert tree[0]['children'][0]['name'] == 'Noir'

    # Update quantity -> movement recorded
    resp = client.put(
        f'/api/v1/products/{product_id}/variants/{child["id"]}',
        json={'quantity': 10},
        headers=headers,
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    assert resp.json()['quantity'] == 10

    movements = crud.stock_movements.get_multi_where_array(
        db=db, where=[{'key': 'variant_id', 'value': child['id'], 'operator': '=='}]
    )
    assert len(movements) == 2
    assert movements[0].quantity == 7

    # Delete root with children rejected
    resp = client.delete(
        f'/api/v1/products/{product_id}/variants/{root["id"]}',
        headers=headers,
    )
    assert resp.status_code == status.HTTP_409_CONFLICT

    # Delete child then root
    resp = client.delete(
        f'/api/v1/products/{product_id}/variants/{child["id"]}',
        headers=headers,
    )
    assert resp.status_code == status.HTTP_200_OK
    resp = client.delete(
        f'/api/v1/products/{product_id}/variants/{root["id"]}',
        headers=headers,
    )
    assert resp.status_code == status.HTTP_200_OK


def test_stock_arrival_on_variant(client, db):
    from app import crud

    headers = _auth_headers(client, db)
    category, lot = _category_and_lot(db)
    product = _create_product(db, category_id=category.id)
    product_id = product.id
    lot_id = lot.id

    resp = client.post(
        f'/api/v1/products/{product_id}/variants',
        json={'name': 'Noir', 'quantity': 2},
        headers=headers,
    )
    variant_id = resp.json()['id']

    resp = client.post(
        '/api/v1/stock/arrivals',
        json={
            'product_id': product_id,
            'variant_id': variant_id,
            'quantity': 4,
            'lot_id': lot_id,
            'unit_cost': 1200.0,
        },
        headers=headers,
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text

    variant = crud.product_variants.get(db=db, id=variant_id)
    assert variant.quantity == 6

    movements = crud.stock_movements.get_multi_where_array(
        db=db, where=[{'key': 'variant_id', 'value': variant_id, 'operator': '=='}]
    )
    assert len(movements) == 2
    assert movements[0].lot_id == lot_id
    assert movements[0].stock_before == 2
    assert movements[0].stock_after == 6
