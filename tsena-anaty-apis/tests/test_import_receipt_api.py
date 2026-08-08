import zlib
from pathlib import Path

from fastapi import status


def _text_ops(lines):
    ops = []
    for y, parts in lines:
        for x, text in parts:
            escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            ops.append(f"BT /F2 10.5 Tf 1 0 0 1 {x} {y} Tm ({escaped}) Tj ET")
    return "\n".join(ops)


def _make_pdf(text_ops_str):
    content = f"q\n{text_ops_str}\nQ\n".encode("latin-1")
    compressed = zlib.compress(content)
    pdf = b"%PDF-1.5\n"
    pdf += f"1 0 obj\n<< /Filter /FlateDecode /Length {len(compressed)} >>\nstream\n".encode()
    pdf += compressed
    pdf += b"\nendstream\nendobj\n%%EOF\n"
    return pdf


def _sample_layout():
    return [
        (1167.04, [(36.0, "Receipt number:"), (118.31, "#307498410501020665")]),
        (1147.54, [(36.0, "Receipt date:"), (103.13, "9:11 AM, Aug 6th, 2026 (PDT)")]),
        (1074.04, [(36.0, "Sold by:")]),
        (1055.18, [(36.0, "Shenzhen L&y Technology Co., Ltd.")]),
        (884.02, [(42.56, "Item description"), (528.0, "Qty")]),
        (890.77, [(648.56, "Unit price"), (782.36, "Total amount")]),
        (851.14, [
            (42.56, "Candy Color Soft Frosted TPU Back Cover Case for iPhone"),
            (519.23, "10.00"),
            (639.79, "USD 0.7900"),
            (802.76, "USD 7.90"),
        ]),
        (837.64, [(42.56, "14 Pro Max Xr Xs")]),
        (807.64, [(464.1, "Subtotal"), (802.76, "USD 7.90")]),
        (776.14, [(464.1, "Shipping fee"), (802.76, "USD 2.50")]),
        (744.52, [(464.1, "Order total"), (796.91, "USD 10.40")]),
        (636.45, [(467.63, "Payment processing fee"), (804.6, "USD 0.32")]),
        (608.59, [(467.63, "Amount paid"), (798.75, "USD 10.72")]),
    ]


def _auth_headers(client, db):
    from app import crud, schemas
    from app.core import security

    user_data = {
        'email': 'import@test.com',
        'password': 'test123',
        'is_active': True,
        'role_id': 2,
        'phone_numer': '4321',
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


def test_import_receipt_creates_products_and_stock(client, db):
    from app import crud, schemas

    headers = _auth_headers(client, db)
    category, lot = _category_and_lot(db)
    category_id = category.id
    lot_id = lot.id

    payload = {
        'receipt_number': 'REC-001',
        'file_name': 'recu.pdf',
        'seller': 'Vendeur Test',
        'currency': 'USD',
        'category_id': category_id,
        'lot_id': lot_id,
        'items': [
            {
                'name': 'Coque iPhone 14 Pro',
                'quantity': 5,
                'unit_cost': 4600.0,
                'another_price': 750.0,
            },
            {
                'name': 'Coque iPhone 15',
                'quantity': 2,
                'unit_cost': 5000.0,
                'another_price': 400.0,
            },
        ],
    }

    resp = client.post(
        '/api/v1/products/import-receipt',
        json=payload,
        headers=headers,
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    products = resp.json()
    assert len(products) == 2

    created_ids = [p['id'] for p in products]
    for product_id in created_ids:
        stock_row = crud.stock.get_by_product_id(db=db, product_id=product_id)
        assert stock_row is not None
        assert stock_row.quantity > 0

        movements = crud.stock_movements.get_by_field(
            db=db, field='product_id', value=product_id
        )
        assert movements is not None
        assert movements.lot_id == lot_id
        assert movements.type.value == 'in_stock'

    receipt = crud.receipts.get_by_receipt_number(db=db, receipt_number='REC-001')
    assert receipt is not None
    assert receipt.items_count == 2

    # Re-import must be blocked
    resp2 = client.post(
        '/api/v1/products/import-receipt',
        json=payload,
        headers=headers,
    )
    assert resp2.status_code == status.HTTP_409_CONFLICT


def test_import_receipt_duplicate_blocked_without_products(client, db):
    from app import crud, schemas

    headers = _auth_headers(client, db)
    category, lot = _category_and_lot(db)
    category_id = category.id
    lot_id = lot.id

    payload = {
        'receipt_number': 'REC-002',
        'category_id': category_id,
        'lot_id': lot_id,
        'items': [
            {
                'name': 'Coque iPhone 16',
                'quantity': 3,
                'unit_cost': 5200.0,
                'another_price': 0.0,
            }
        ],
    }

    resp = client.post('/api/v1/products/import-receipt', json=payload, headers=headers)
    assert resp.status_code == status.HTTP_200_OK, resp.text

    # Simulate the receipt already registered without products (edge case)
    resp2 = client.post('/api/v1/products/import-receipt', json=payload, headers=headers)
    assert resp2.status_code == status.HTTP_409_CONFLICT

    # No extra product created on the failed import
    products = crud.products.get_multi_where_array(db=db, where=[])
    matching = [p for p in products if p.name == 'Coque iPhone 16']
    assert len(matching) == 1


def test_extract_receipt_marks_already_imported(client, db):
    from app import crud, schemas

    headers = _auth_headers(client, db)
    category, lot = _category_and_lot(db)
    category_id = category.id
    lot_id = lot.id
    pdf = _make_pdf(_text_ops(_sample_layout()))

    # First extraction: not imported yet
    resp1 = client.post(
        '/api/v1/products/extract-receipt',
        files={'file': ('recu.pdf', pdf, 'application/pdf')},
        headers=headers,
    )
    assert resp1.status_code == status.HTTP_200_OK
    assert resp1.json()['already_imported'] is False

    # Import the receipt
    import_payload = {
        'receipt_number': '307498410501020665',
        'category_id': category_id,
        'lot_id': lot_id,
        'items': [
            {
                'name': 'Coque iPhone',
                'quantity': 10,
                'unit_cost': 4600.0,
                'another_price': 0.0,
            }
        ],
    }
    resp_import = client.post(
        '/api/v1/products/import-receipt',
        json=import_payload,
        headers=headers,
    )
    assert resp_import.status_code == status.HTTP_200_OK

    # Second extraction: already imported
    resp2 = client.post(
        '/api/v1/products/extract-receipt',
        files={'file': ('recu.pdf', pdf, 'application/pdf')},
        headers=headers,
    )
    assert resp2.status_code == status.HTTP_200_OK
    assert resp2.json()['already_imported'] is True


def test_import_receipt_requires_items(client, db):
    from app import crud, schemas

    headers = _auth_headers(client, db)
    category, lot = _category_and_lot(db)
    category_id = category.id
    lot_id = lot.id

    payload = {
        'receipt_number': 'REC-003',
        'category_id': category_id,
        'lot_id': lot_id,
        'items': [],
    }
    resp = client.post('/api/v1/products/import-receipt', json=payload, headers=headers)
    assert resp.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_import_receipt_requires_auth(client, db):
    resp = client.post(
        '/api/v1/products/import-receipt',
        json={
            'category_id': 1,
            'lot_id': 1,
            'items': [{'name': 'X', 'quantity': 1, 'unit_cost': 10}],
        },
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
