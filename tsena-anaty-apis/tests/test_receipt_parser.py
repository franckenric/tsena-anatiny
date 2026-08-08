import zlib
from pathlib import Path

import pytest
from fastapi import status

from app.receipt_parser import parse_receipt_pdf

SAMPLE_PDF = (
    Path(__file__).resolve().parent.parent.parent
    / "invoice_test"
    / "Receipt_307498410501020665_1786032714091.pdf"
)


def _text_ops(lines):
    """Construit les opérateurs PDF texte (BT/ET, Tm, Tj) pour chaque (y, [(x, text)])."""
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
        (658.95, [(467.63, "Order total"), (798.75, "USD 10.40")]),
        (636.45, [(467.63, "Payment processing fee"), (804.6, "USD 0.32")]),
        (608.59, [(467.63, "Amount paid"), (798.75, "USD 10.72")]),
    ]


def test_parse_receipt_synthetic():
    pdf = _make_pdf(_text_ops(_sample_layout()))
    data = parse_receipt_pdf(pdf)

    assert data["receipt_number"] == "307498410501020665"
    assert data["currency"] == "USD"
    assert data["seller"] == "Shenzhen L&y Technology Co., Ltd."
    assert len(data["items"]) == 1
    item = data["items"][0]
    assert item["name"] == (
        "Candy Color Soft Frosted TPU Back Cover Case for iPhone 14 Pro Max Xr Xs"
    )
    assert item["quantity"] == 10.0
    assert item["unit_price"] == 0.79
    assert item["total_price"] == 7.9
    assert data["subtotal"] == 7.9
    assert data["shipping_fee"] == 2.5
    assert data["order_total"] == 10.4
    assert data["payment_fee"] == 0.32
    assert data["amount_paid"] == 10.72
    assert data["total_fees"] == 2.82


def test_parse_receipt_real_sample():
    if not SAMPLE_PDF.exists():
        pytest.skip("Fichier exemple du reçu absent")
    with open(SAMPLE_PDF, "rb") as fh:
        data = parse_receipt_pdf(fh.read())

    assert data["receipt_number"] == "307498410501020665"
    assert data["currency"] == "USD"
    assert data["items"][0]["quantity"] == 10.0
    assert data["items"][0]["unit_price"] == 0.79
    assert data["shipping_fee"] == 2.5
    assert data["payment_fee"] == 0.32


def test_parse_receipt_adaptive_columns():
    """Le vendeur (colonne de gauche) ne doit pas absorber la colonne du milieu."""
    layout = [
        (1167.04, [(36.0, "Receipt number:"), (118.31, "#123456")]),
        (1074.04, [(36.0, "Sold by:")]),
        (1055.18, [
            (36.0, "Shenzhen L&y Technology Co., Ltd."),
            (321.49, "Buyer's company address:"),
        ]),
        (1039.54, [(321.49, "HenriFranck RALAITSIMANOLAKAVANA")]),
        (884.02, [(42.56, "Item description"), (528.0, "Qty")]),
        (890.77, [(648.56, "Unit price"), (782.36, "Total amount")]),
        (851.14, [
            (42.56, "Sample Item"),
            (519.23, "3.00"),
            (639.79, "USD 5.00"),
            (802.76, "USD 15.00"),
        ]),
        (807.64, [(464.1, "Subtotal"), (802.76, "USD 15.00")]),
        (776.14, [(464.1, "Shipping fee"), (802.76, "USD 3.00")]),
        (744.52, [(464.1, "Order total"), (796.91, "USD 18.00")]),
        (636.45, [(467.63, "Payment processing fee"), (804.6, "USD 0.50")]),
        (608.59, [(467.63, "Amount paid"), (798.75, "USD 18.50")]),
    ]
    pdf = _make_pdf(_text_ops(layout))
    data = parse_receipt_pdf(pdf)

    assert data["seller"] == "Shenzhen L&y Technology Co., Ltd."
    assert data["items"][0]["quantity"] == 3.0
    assert data["items"][0]["unit_price"] == 5.0
    assert data["shipping_fee"] == 3.0
    assert data["payment_fee"] == 0.5


def test_parse_receipt_invalid_pdf():
    with pytest.raises(ValueError):
        parse_receipt_pdf(b"pas un pdf")


def test_extract_receipt_api(client, db):
    from app import crud, schemas
    from app.core import security

    user_data = {
        'email': 'receipt@test.com',
        'password': 'test123',
        'is_active': True,
        'role_id': 2,
        'phone_numer': '1234',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    pdf = _make_pdf(_text_ops(_sample_layout()))
    resp = client.post(
        '/api/v1/products/extract-receipt',
        files={'file': ('recu.pdf', pdf, 'application/pdf')},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    data = resp.json()
    assert data['currency'] == 'USD'
    assert data['items'][0]['quantity'] == 10.0
    assert data['items'][0]['unit_price'] == 0.79
    assert data['shipping_fee'] == 2.5
    assert data['payment_fee'] == 0.32


def test_extract_receipt_api_invalid_file(client, db):
    from app import crud, schemas
    from app.core import security

    user_data = {
        'email': 'receipt2@test.com',
        'password': 'test123',
        'is_active': True,
        'role_id': 2,
        'phone_numer': '5678',
    }
    user = crud.users.create(db, obj_in=schemas.UsersCreate(**user_data))
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})

    resp = client.post(
        '/api/v1/products/extract-receipt',
        files={'file': ('note.txt', b'hello', 'text/plain')},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_extract_receipt_api_requires_auth(client, db):
    resp = client.post(
        '/api/v1/products/extract-receipt',
        files={'file': ('recu.pdf', b'%PDF-1.5', 'application/pdf')},
    )
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
