"""Regression tests for the trailing-slash redirects on collection endpoints.

Starlette answers `/api/v1/customers` with a 307 whose Location is an
absolute URL built from the request Host. Behind the Vite dev proxy the Host
is the proxy target, so the browser follows a cross-origin redirect, drops
the `Authorization` header and the retry comes back 401. Both spellings must
therefore answer directly, without any 3xx.
"""

from fastapi import status
from app import crud, schemas
from app.core import security


def _auth(db) -> tuple:
    user = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email="slash-check@test.com",
            password="test123",
            is_active=True,
            role_id=1,
            phone_numer="slash-check",
        ),
    )
    db.commit()
    token = security.create_access_token(sub={"id": str(user.id), "email": user.email})
    return user, {"Authorization": f"Bearer {token}"}


def _seed_customer(db) -> None:
    crud.customers.create(
        db,
        obj_in=schemas.CustomersCreate(name="Client Slash", phone="+261 33 00 000 01"),
    )
    db.commit()


def test_collection_endpoints_answer_without_redirecting(client, db):
    _user, headers = _auth(db)
    _seed_customer(db)

    # Path prefixes that used to answer 307 when the trailing slash was
    # missing (the front-office called them without it).
    for prefix in ["customers", "products", "orders", "categories"]:
        with_slash = client.get(
            f"/api/v1/{prefix}/?limit=1", headers=headers, follow_redirects=False
        )
        without_slash = client.get(
            f"/api/v1/{prefix}?limit=1", headers=headers, follow_redirects=False
        )

        assert without_slash.status_code == status.HTTP_200_OK, (
            f"/api/v1/{prefix} -> {without_slash.status_code} "
            f"Location={without_slash.headers.get('location')}"
        )
        assert "location" not in without_slash.headers
        assert without_slash.json() == with_slash.json()


def test_alias_stays_out_of_the_openapi_schema(client, db):
    resp = client.get("/api/v1/openapi.json")
    assert resp.status_code == status.HTTP_200_OK, resp.text
    paths = resp.json()["paths"]
    assert "/api/v1/customers/" in paths
    assert "/api/v1/customers" not in paths