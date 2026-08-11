from fastapi import status
from app import crud


def test_register_creates_user_and_customer(client, db):
    response = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "phone": "+261 34 12 345 67",
            "password": "secret123",
            "delivery_address": "Antananarivo",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["customer"]["name"] == "RAKOTO Jean"
    assert body["customer"]["phone"] == "+261341234567"
    assert body["customer"]["delivery_address"] == "Antananarivo"

    customer_id = body["customer"]["id"]
    customer = crud.customers.get(db=db, id=customer_id)
    assert customer is not None
    assert customer.users_id is not None

    user = crud.users.get(db=db, id=customer.users_id)
    assert user is not None
    assert user.phone_numer == "+261341234567"
    assert user.is_active is True
    assert user.full_name == "RAKOTO Jean"


def test_register_rejects_duplicate_phone(client, db):
    payload = {
        "name": "RAKOTO Jean",
        "phone": "+261 34 12 345 67",
        "password": "secret123",
    }
    first = client.post("/api/v1/register/", json=payload)
    assert first.status_code == status.HTTP_200_OK

    second = client.post("/api/v1/register/", json=payload)
    assert second.status_code == status.HTTP_409_CONFLICT


def test_register_rejects_invalid_phone(client):
    response = client.post(
        "/api/v1/register/",
        json={"name": "Test", "phone": "12345", "password": "secret123"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
