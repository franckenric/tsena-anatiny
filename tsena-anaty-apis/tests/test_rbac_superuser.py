"""Regression tests pour le durcissement RBAC.

Les endpoints de gestion back-office exigent desormais le role `super_admin`.
Un jeton de role `client` doit etre refuse (400 privileges), un jeton
`super_admin` accepte, et les endpoints que le front-office consomme
(lectures commandes/panier/profil) restent accessibles avec un role `client`.

Ces tests verrouillent le correctif de l'escalade de privileges : avant,
`get_current_active_user` suffisait pour creer des produits, codes promo,
modifier des utilisateurs, etc.
"""

from fastapi import status

from app import crud, schemas
from app.core import security


def _make_user(db, *, email, role_id, phone):
    user = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email=email,
            password="secret123",
            is_active=True,
            role_id=role_id,
            phone_numer=phone,
        ),
    )
    db.commit()
    token = security.create_access_token(sub={"id": str(user.id), "email": user.email})
    return user, token


def _client_token(db):
    """Jeton d'un utilisateur lambda (role client, comme un visiteur inscrit)."""
    _, token = _make_user(
        db,
        email="client-rbac@test.com",
        role_id=2,
        phone="0340000991",
    )
    return {"Authorization": f"Bearer {token}"}


def _admin_token(db):
    """Jeton d'un super_admin de back-office."""
    _, token = _make_user(
        db,
        email="admin-rbac@test.com",
        role_id=1,
        phone="0340000992",
    )
    return {"Authorization": f"Bearer {token}"}


# Endpoints de gestion back-office a durcir. (methode, chemin, payload)
# Les payloads sont ceux d'un appel *valide* realise par un super_admin.
HARDENED_ENDPOINTS = [
    ("GET", "/api/v1/users/", None),
    ("POST", "/api/v1/users/", {"email": "cible@test.com", "password": "x", "is_active": True, "role_id": 2, "phone_numer": "0340000993"}),
    ("GET", "/api/v1/lots/", None),
    ("POST", "/api/v1/lots/", {"reference": "LOT-RBAC"}),
    ("GET", "/api/v1/stock_movements/", None),
    ("GET", "/api/v1/visits/summary", None),
    ("GET", "/api/v1/products/1/variants", None),
    ("POST", "/api/v1/categories/", {"name": "CatRBAC", "status": "active"}),
    ("POST", "/api/v1/promo_codes/", {"code": "RBAC10", "discount_type": "percent", "discount_value": 10}),
    ("POST", "/api/v1/customers/", {"name": "ClientNoir", "phone": "+261330000001"}),
    ("POST", "/api/v1/orders/", {
        "customer_id": None,
        "user_id": None,
        "movements": [],
        "status": "draft",
        "customer_name": "Client",
        "customer_phone": "+261330000002",
    }),
]


def test_client_role_denied_on_management_endpoints(client, db):
    """Un jeton `client` ne peut plus toucher aux endpoints de gestion."""
    headers = _client_token(db)
    for method, path, payload in HARDENED_ENDPOINTS:
        res = client.request(method, path, json=payload, headers=headers)
        assert res.status_code == status.HTTP_400_BAD_REQUEST, (
            f"{method} {path} attendu 400 privileges, obtenu {res.status_code}: {res.text}"
        )
        assert "enough privileges" in res.json().get("detail", "")


def test_superadmin_allowed_on_management_endpoints(client, db):
    """Un jeton `super_admin` garde l'acces aux memes endpoints."""
    headers = _admin_token(db)

    res = client.get("/api/v1/users/", headers=headers)
    assert res.status_code == status.HTTP_200_OK, res.text

    res = client.post(
        "/api/v1/lots/",
        json={"reference": "LOT-RBAC-OK"},
        headers=headers,
    )
    assert res.status_code == status.HTTP_200_OK, res.text

    res = client.get("/api/v1/visits/summary", headers=headers)
    assert res.status_code == status.HTTP_200_OK, res.text

    res = client.post(
        "/api/v1/promo_codes/",
        json={"code": "RBAC-OK", "discount_type": "percent", "discount_value": 5},
        headers=headers,
    )
    assert res.status_code == status.HTTP_200_OK, res.text

    res = client.post(
        "/api/v1/categories/",
        json={"name": "CatOK", "status": "active"},
        headers=headers,
    )
    assert res.status_code == status.HTTP_200_OK, res.text

    res = client.post(
        "/api/v1/users/",
        json={"email": "cible-ok@test.com", "password": "x", "is_active": True, "role_id": 2, "phone_numer": "0340000994"},
        headers=headers,
    )
    assert res.status_code == status.HTTP_200_OK, res.text


def test_client_role_keeps_front_office_reads(client, db):
    """Les lectures consommees par le front-office restent ouvertes au client."""
    headers = _client_token(db)

    res = client.get("/api/v1/customers/?limit=1", headers=headers)
    assert res.status_code == status.HTTP_200_OK, res.text

    res = client.get("/api/v1/orders/?limit=1", headers=headers)
    assert res.status_code == status.HTTP_200_OK, res.text

    res = client.get("/api/v1/notifications/", headers=headers)
    assert res.status_code == status.HTTP_200_OK, res.text

    res = client.get("/api/v1/products/?limit=1", headers=headers)
    assert res.status_code == status.HTTP_200_OK, res.text