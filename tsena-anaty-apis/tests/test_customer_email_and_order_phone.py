"""Tests for the email-signup + phone-at-order-time flow."""

from fastapi import status
from app import crud, schemas
from app.core import security


EMAIL = "client.email@example.com"
PASSWORD = "secret123"
PHONE = "+261341234567"


def _register(client):
    response = client.post(
        "/api/v1/register/",
        json={"name": "RAKOTO Jean", "email": EMAIL, "password": PASSWORD},
    )
    assert response.status_code == status.HTTP_200_OK, response.text
    return response.json()


def _token():
    token = security.create_access_token(sub={"id": "1", "email": EMAIL})
    return {"Authorization": f"Bearer {token}"}


def _seed_product(db):
    category = crud.categories.create(
        db, obj_in=schemas.CategoriesCreate(name="Epicerie", status="active")
    )
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=category.id,
            sku="SKU-EMAIL-001",
            name="Riz 5kg",
            image="/No_Image_Available.jpg",
            status="active",
        ),
    )
    db.commit()
    db.refresh(product)
    return product


def test_email_only_customer_can_fill_the_cart_without_a_phone(client, db):
    body = _register(client)
    customer_id = body["customer"]["id"]
    assert body["customer"]["phone"] is None

    customer = crud.customers.get(db=db, id=customer_id)
    assert customer.phone is None

    product = _seed_product(db)

    response = client.post(
        "/api/v1/cart_items/",
        headers=_token(),
        json={
            "customer_id": customer_id,
            "product_id": product.id,
            "quantity": 2,
            "unit_cost": 1000,
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text


def test_checkout_requires_a_phone_number(client, db):
    body = _register(client)
    customer_id = body["customer"]["id"]

    product = _seed_product(db)
    client.post(
        "/api/v1/cart_items/",
        headers=_token(),
        json={
            "customer_id": customer_id,
            "product_id": product.id,
            "quantity": 2,
            "unit_cost": 1000,
        },
    )

    response = client.post(
        f"/api/v1/cart_items/checkout/{customer_id}",
        headers=_token(),
        json={"user_id": 1, "customer_id": customer_id, "status": "draft"},
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY, response.text
    assert "customer_phone" in response.json()["detail"]


def test_checkout_stores_the_phone_on_the_customer(client, db):
    body = _register(client)
    customer_id = body["customer"]["id"]

    product = _seed_product(db)
    client.post(
        "/api/v1/cart_items/",
        headers=_token(),
        json={
            "customer_id": customer_id,
            "product_id": product.id,
            "quantity": 2,
            "unit_cost": 1000,
        },
    )

    response = client.post(
        f"/api/v1/cart_items/checkout/{customer_id}",
        headers=_token(),
        json={
            "user_id": 1,
            "customer_id": customer_id,
            "customer_phone": PHONE,
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    assert response.json()["customer_id"] == customer_id

    customer = crud.customers.get(db=db, id=customer_id)
    assert customer.phone == PHONE


def test_checkout_reuses_the_stored_phone_on_the_next_order(client, db):
    body = _register(client)
    customer_id = body["customer"]["id"]

    product = _seed_product(db)
    for _ in range(2):
        client.post(
            "/api/v1/cart_items/",
            headers=_token(),
            json={
                "customer_id": customer_id,
                "product_id": product.id,
                "quantity": 1,
                "unit_cost": 1000,
            },
        )
        response = client.post(
            f"/api/v1/cart_items/checkout/{customer_id}",
            headers=_token(),
            json={
                "user_id": 1,
                "customer_id": customer_id,
                "customer_phone": PHONE if _ == 0 else None,
                "status": "draft",
            },
        )
        assert response.status_code == status.HTTP_200_OK, response.text

    customer = crud.customers.get(db=db, id=customer_id)
    assert customer.phone == PHONE
