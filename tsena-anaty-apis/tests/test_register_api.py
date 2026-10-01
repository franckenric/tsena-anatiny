from fastapi import status
from app import crud


def test_register_creates_user_and_customer(client, db):
    response = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": "rakoto.jean@example.com",
            "password": "secret123",
            "delivery_address": "Antananarivo",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"
    assert body["customer"]["name"] == "RAKOTO Jean"
    assert body["customer"]["phone"] is None
    assert body["customer"]["delivery_address"] == "Antananarivo"

    customer_id = body["customer"]["id"]
    customer = crud.customers.get(db=db, id=customer_id)
    assert customer is not None
    assert customer.users_id is not None

    user = crud.users.get(db=db, id=customer.users_id)
    assert user is not None
    assert user.email == "rakoto.jean@example.com"
    assert user.phone_numer is None
    assert user.is_active is True
    assert user.full_name == "RAKOTO Jean"


def test_register_rejects_duplicate_email(client, db):
    payload = {
        "name": "RAKOTO Jean",
        "email": "rakoto.jean@example.com",
        "password": "secret123",
    }
    first = client.post("/api/v1/register/", json=payload)
    assert first.status_code == status.HTTP_200_OK

    second = client.post("/api/v1/register/", json=payload)
    assert second.status_code == status.HTTP_409_CONFLICT


def test_register_normalizes_email(client, db):
    response = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": "  RAKOTO.Jean@Example.COM ",
            "password": "secret123",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    user = crud.users.get_by_email(db=db, email="rakoto.jean@example.com")
    assert user is not None
    assert user.email == "rakoto.jean@example.com"


def test_register_rejects_invalid_email(client):
    response = client.post(
        "/api/v1/register/",
        json={"name": "Test", "email": "not-an-email", "password": "secret123"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_register_rejects_short_password(client):
    response = client.post(
        "/api/v1/register/",
        json={"name": "Test", "email": "short@example.com", "password": "123"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_register_stores_normalized_phone(client, db):
    response = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": "rakoto.jean@example.com",
            "password": "secret123",
            "phone": "+261 34 12 345 67",
        },
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["customer"]["phone"] == "+261341234567"

    customer = crud.customers.get(db=db, id=body["customer"]["id"])
    assert customer is not None
    assert customer.phone == "+261341234567"


def test_register_rejects_duplicate_phone(client, db):
    payload = {
        "name": "RAKOTO Jean",
        "email": "rakoto.jean@example.com",
        "password": "secret123",
        "phone": "+261341234567",
    }
    assert client.post("/api/v1/register/", json=payload).status_code == status.HTTP_200_OK

    second = client.post(
        "/api/v1/register/",
        json={**payload, "email": "autre.client@example.com"},
    )

    assert second.status_code == status.HTTP_409_CONFLICT
    # Le controle est fait avant toute ecriture : aucun compte parasite cree.
    assert crud.users.get_by_email(db=db, email="autre.client@example.com") is None


def test_register_duplicate_phone_ignores_spacing(client, db):
    assert (
        client.post(
            "/api/v1/register/",
            json={
                "name": "RAKOTO Jean",
                "email": "rakoto.jean@example.com",
                "password": "secret123",
                "phone": "+261 34 12 345 67",
            },
        ).status_code
        == status.HTTP_200_OK
    )

    response = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": "autre.client@example.com",
            "password": "secret123",
            "phone": "+261341234567",
        },
    )

    assert response.status_code == status.HTTP_409_CONFLICT


def test_register_rejects_invalid_phone_format(client):
    response = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": "rakoto.jean@example.com",
            "password": "secret123",
            "phone": "0341234567",
        },
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_register_treats_blank_phone_as_absent(client, db):
    """Deux inscriptions sans numero ne doivent pas se concurrencer sur la colonne unique."""
    first = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": "rakoto.jean@example.com",
            "password": "secret123",
            "phone": "   ",
        },
    )
    second = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Marie",
            "email": "rakoto.marie@example.com",
            "password": "secret123",
            "phone": "",
        },
    )

    assert first.status_code == status.HTTP_200_OK
    assert second.status_code == status.HTTP_200_OK
    assert first.json()["customer"]["phone"] is None
    assert second.json()["customer"]["phone"] is None


def test_login_with_email(client, db):
    client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": "rakoto.jean@example.com",
            "password": "secret123",
        },
    )

    response = client.post(
        "/api/v1/login/access-token",
        data={
            "username": "RAKOTO.JEAN@example.com",
            "password": "secret123",
            "grant_type": "password",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert "access_token" in response.json()


def test_login_rejects_wrong_password(client, db):
    client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": "rakoto.jean@example.com",
            "password": "secret123",
        },
    )

    response = client.post(
        "/api/v1/login/access-token",
        data={
            "username": "rakoto.jean@example.com",
            "password": "wrong-password",
            "grant_type": "password",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
