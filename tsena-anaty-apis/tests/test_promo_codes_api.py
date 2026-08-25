from datetime import datetime, timedelta

from fastapi import status
from app import crud, schemas, models
from app.core import security
from app.enum.discount_type import DiscountTypeEnum
from app.enum.status import StatusEnum


def _make_user(client_user_db):
    user = crud.users.create(
        client_user_db,
        obj_in=schemas.UsersCreate(
            email="promo@test.com",
            password="secret123",
            is_active=True,
            role_id=1,
            phone_numer="0340000001",
        ),
    )
    client_user_db.commit()
    token = security.create_access_token(
        sub={"id": str(user.id), "email": user.email}
    )
    return user, token


AUTH = lambda tok: {"Authorization": f"Bearer {tok}"}


def test_promo_crud_and_validate(client, db):
    user, token = _make_user(db)

    # Create promo code (percent)
    resp = client.post(
        "/api/v1/promo_codes/",
        json={
            "code": "bienvenue10",
            "description": "Remise bienvenue",
            "discount_type": "percent",
            "discount_value": 10,
            "min_order_amount": 5000,
        },
        headers=AUTH(token),
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    created = resp.json()
    assert created["code"] == "BIENVENUE10"  # uppercased
    assert created["status"] == "active"

    # Duplicate code rejected
    resp_dup = client.post(
        "/api/v1/promo_codes/",
        json={"code": "BIENVENUE10", "discount_type": "fixed", "discount_value": 100},
        headers=AUTH(token),
    )
    assert resp_dup.status_code == 409

    # List
    resp_list = client.get("/api/v1/promo_codes/", headers=AUTH(token))
    assert resp_list.status_code == 200
    payload = resp_list.json()
    assert payload["count"] == 1

    # Validate without subtotal: valid, amount 0
    resp_v = client.post(
        "/api/v1/promo_codes/validate",
        json={"code": "bienvenue10"},
        headers=AUTH(token),
    )
    assert resp_v.status_code == 200, resp_v.text
    body = resp_v.json()
    assert body["valid"] is True
    assert body["code"] == "BIENVENUE10"
    assert body["discount_amount"] == 0

    # Validate with subtotal 20_000 -> 10% = 2_000
    resp_v2 = client.post(
        "/api/v1/promo_codes/validate",
        json={"code": "bienvenue10", "subtotal": 20000},
        headers=AUTH(token),
    )
    assert resp_v2.json()["discount_amount"] == 2000

    # Min order amount not reached
    resp_min = client.post(
        "/api/v1/promo_codes/validate",
        json={"code": "bienvenue10", "subtotal": 1000},
        headers=AUTH(token),
    )
    assert resp_min.status_code == 422

    # Unknown code
    resp_unk = client.post(
        "/api/v1/promo_codes/validate",
        json={"code": "NOPE"},
        headers=AUTH(token),
    )
    assert resp_unk.status_code == 422


def test_promo_expiry_and_usage_limit(client, db):
    user, token = _make_user(db)

    expired = crud.promo_codes.create(
        db,
        obj_in=schemas.PromoCodesCreate(
            code="EXPIRED",
            discount_type=DiscountTypeEnum.fixed,
            discount_value=1000,
            expires_at=datetime.now() - timedelta(days=1),
        ),
    )
    db.commit()
    limited = crud.promo_codes.create(
        db,
        obj_in=schemas.PromoCodesCreate(
            code="LIMITED",
            discount_type=DiscountTypeEnum.percent,
            discount_value=5,
            max_uses=1,
        ),
    )
    limited.used_count = 1
    inactive = crud.promo_codes.create(
        db,
        obj_in=schemas.PromoCodesCreate(
            code="OFF",
            discount_type=DiscountTypeEnum.percent,
            discount_value=5,
            status=StatusEnum.inactive,
        ),
    )
    db.commit()

    for code in ("EXPIRED", "LIMITED", "OFF"):
        r = client.post(
            "/api/v1/promo_codes/validate",
            json={"code": code},
            headers=AUTH(token),
        )
        assert r.status_code == 422, (code, r.text)


def test_checkout_applies_discount_and_updates_used_count(client, db):
    from tests.conftest import TestingSessionLocal

    user, token = _make_user(db)

    promo = crud.promo_codes.create(
        db,
        obj_in=schemas.PromoCodesCreate(
            code="PROMO50",
            discount_type=DiscountTypeEnum.fixed,
            discount_value=5000,
        ),
    )
    db.commit()

    customer = crud.customers.create(
        db, obj_in=schemas.CustomersCreate(name="Test", phone="+261 34 11 122 33")
    )
    category = crud.categories.create(db, obj_in=schemas.CategoriesCreate(name="Cat"))
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            sku="P1",
            name="Produit 1",
            category_id=category.id,
            unit="kg",
            image="/No_Image_Available.jpg",
        ),
    )
    crud.stock.create(db, obj_in=schemas.StockCreate(product_id=product.id, quantity=100))
    db.commit()
    user_id, customer_id, product_id = user.id, customer.id, product.id

    # add to cart: 3 x 10_000 = 30_000 subtotal
    resp_cart = client.post(
        "/api/v1/cart_items/",
        json={
            "customer_id": customer_id,
            "product_id": product_id,
            "quantity": 3,
            "unit_cost": 10000,
        },
        headers=AUTH(token),
    )
    assert resp_cart.status_code == 200, resp_cart.text

    resp_checkout = client.post(
        f"/api/v1/cart_items/checkout/{customer_id}",
        json={
            "user_id": user_id,
            "promo_code": "promo50",
            "status": "draft",
        },
        headers=AUTH(token),
    )
    assert resp_checkout.status_code == 200, resp_checkout.text
    order = resp_checkout.json()
    assert order["promo_code"] == "PROMO50"
    assert order["discount"] == 5000

    # Admin notification mentions the promo code
    notif = (
        db.query(models.Notifications)
        .filter_by(type="order.created")
        .first()
    )
    assert notif is not None and "PROMO50" in (notif.message or "")

    # used_count incremented
    fresh = TestingSessionLocal()
    p = fresh.query(models.PromoCodes).filter_by(code="PROMO50").first()
    assert p.used_count == 1
    fresh.close()

    # Cart cleared
    remaining = (
        db.query(models.CartItems).filter_by(customer_id=customer_id).count()
    )
    assert remaining == 0
