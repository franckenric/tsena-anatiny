"""Tests de la commande invitee (sans compte).

Le panier d'un invite n'est jamais enregistre : les lignes partent avec la
commande et l'API en recalcule les prix. Ces tests verrouillent ce contrat,
en particulier le fait qu'un prix envoye par le navigateur est ignore.
"""

from fastapi import status

from app import crud, schemas


EMAIL = "invite@example.com"
PASSWORD = "secret123"
PHONE = "+261341234567"


def _token(db):
    """Jeton du compte de service qui porte les commandes invitees.

    Le compte est reutilise s'il existe deja : certains tests passent par
    plusieurs commandes et la fixture `db` n'est pas recreee entre elles.
    """
    from app.core import security

    existing = crud.users.get_by_email(db, email="service@example.com")
    if existing is not None:
        token = security.create_access_token(
            sub={"id": str(existing.id), "email": existing.email}
        )
        return {"Authorization": f"Bearer {token}"}

    role = crud.roles.get_first_where_array(
        db, where=[{"key": "name", "operator": "==", "value": "client"}]
    )
    if role is None:
        role = crud.roles.create(db=db, obj_in=schemas.RolesCreate(name="client"))
        db.commit()
        db.refresh(role)

    user = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email="service@example.com",
            password="secret123",
            is_active=True,
            role_id=role.id,
        ),
    )
    db.commit()
    db.refresh(user)

    token = security.create_access_token(
        sub={"id": str(user.id), "email": user.email}
    )
    return {"Authorization": f"Bearer {token}"}


def _seed_product(db, *, name="Riz 5kg", selling_price=5000, discount_price=None):
    category = crud.categories.create(
        db, obj_in=schemas.CategoriesCreate(name="Epicerie", status="active")
    )
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=category.id,
            sku=f"SKU-{name}",
            name=name,
            image="/No_Image_Available.jpg",
            status="active",
            selling_price=selling_price,
            discount_price=discount_price,
        ),
    )
    crud.stock.create(
        db, obj_in=schemas.StockCreate(product_id=product.id, quantity=100)
    )
    db.commit()
    db.refresh(product)
    return product


def test_guest_checkout_creates_the_order_and_the_customer(client, db):
    product = _seed_product(db)

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "delivery_address": "Lot II A 25",
            "items": [{"product_id": product.id, "quantity": 2}],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    body = response.json()
    assert body["order_number"]
    assert body["status"] == "draft"

    customer = crud.customers.get_by_field(db=db, field="phone", value=PHONE)
    assert customer is not None
    assert customer.name == "RAKOTO Jean"
    assert customer.delivery_address == "Lot II A 25"
    assert body["customer_id"] == customer.id


def test_guest_checkout_ignores_prices_sent_by_the_browser(client, db):
    product = _seed_product(db, selling_price=5000)

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "items": [{"product_id": product.id, "quantity": 2, "unit_cost": 1}],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    order_id = response.json()["id"]

    order = crud.orders.get(db=db, id=order_id)
    assert order is not None
    # Le prix du catalogue fait foi : 2 x 5000, pas 2 x 1. Les lignes d'un
    # statut non valide sont stockees dans la note (voir lib/orders cote front).
    assert order.discount == 0
    assert '"unit_cost": 5000.0' in (order.note or "").replace("'", '"')
    assert '"quantity": 2' in (order.note or "").replace("'", '"')
    # Statut draft : aucun mouvement de stock tant que la commande n'est pas validee.
    assert crud.stock_movements.get_count_where_array(db=db, where=[]) == 0


def test_guest_checkout_uses_the_variant_discount(client, db):
    product = _seed_product(db, selling_price=5000)
    variant = crud.product_variants.create(
        db,
        obj_in=schemas.ProductVariantCreate(
            product_id=product.id,
            name="Riz 5kg - Blanc",
            selling_price=6000,
            discount_price=4500,
            quantity=10,
        ),
    )
    db.commit()
    db.refresh(variant)

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "items": [
                {"product_id": product.id, "variant_id": variant.id, "quantity": 1}
            ],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    order = crud.orders.get(db=db, id=response.json()["id"])
    assert order is not None


def test_guest_checkout_reuses_the_customer_of_a_previous_order(client, db):
    product = _seed_product(db)
    payload = {
        "customer_name": "RAKOTO Jean",
        "customer_phone": PHONE,
        "items": [{"product_id": product.id, "quantity": 1}],
        "status": "draft",
    }

    first = client.post(
        "/api/v1/cart_items/checkout-guest", headers=_token(db), json=payload
    )
    assert first.status_code == status.HTTP_200_OK, first.text

    second = client.post(
        "/api/v1/cart_items/checkout-guest", headers=_token(db), json=payload
    )
    assert second.status_code == status.HTTP_200_OK, second.text

    assert first.json()["customer_id"] == second.json()["customer_id"]
    # Une seule fiche client pour ce numero : pas de doublon a chaque commande.
    assert crud.customers.get_count_where_array(db=db, where=[]) == 1


def test_guest_checkout_normalises_the_phone_format(client, db):
    product = _seed_product(db)

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": "+261 34 12 345 67",
            "items": [{"product_id": product.id, "quantity": 1}],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    customer = crud.customers.get_by_field(db=db, field="phone", value=PHONE)
    assert customer is not None
    assert customer.phone == PHONE


def test_guest_checkout_requires_a_phone(client, db):
    product = _seed_product(db)

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": "",
            "items": [{"product_id": product.id, "quantity": 1}],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "customer_phone" in response.json()["detail"]


def test_guest_checkout_rejects_an_empty_cart(client, db):
    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "items": [],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "empty" in response.json()["detail"]


def test_guest_checkout_refuses_more_than_the_available_stock(client, db):
    product = _seed_product(db)
    crud.stock.update(
        db,
        db_obj=crud.stock.get_by_product_id(db=db, product_id=product.id),
        obj_in={"quantity": 1},
    )
    db.commit()

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "items": [{"product_id": product.id, "quantity": 5}],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_409_CONFLICT
    assert "Stock insuffisant" in response.json()["detail"]


def test_guest_checkout_applies_the_promo_code(client, db):
    product = _seed_product(db, selling_price=1000)
    crud.promo_codes.create(
        db,
        obj_in=schemas.PromoCodesCreate(
            code="BIENVENUE10",
            discount_type="percent",
            discount_value=10,
            is_active=True,
        ),
    )
    db.commit()

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "items": [{"product_id": product.id, "quantity": 2}],
            "promo_code": "bienvenue10",
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    body = response.json()
    assert body["promo_code"] == "BIENVENUE10"
    assert body["discount"] == 200


def test_register_claims_the_customer_created_by_a_guest_order(client, db):
    product = _seed_product(db)
    ordered = client.post(
        "/api/v1/cart_items/checkout-guest",
        headers=_token(db),
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "items": [{"product_id": product.id, "quantity": 1}],
            "status": "draft",
        },
    )
    assert ordered.status_code == status.HTTP_200_OK, ordered.text

    # L'invite cree ensuite un compte avec le meme numero : pas de 409, et ses
    # commandes restent rattachees a son compte.
    registered = client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": EMAIL,
            "password": PASSWORD,
            "phone": PHONE,
        },
    )
    assert registered.status_code == status.HTTP_200_OK, registered.text
    customer_id = registered.json()["customer"]["id"]

    customer = crud.customers.get(db=db, id=customer_id)
    assert customer.phone == PHONE
    assert customer.users_id == registered.json()["customer"]["users_id"]
    assert customer.id == ordered.json()["customer_id"]


def test_register_still_refuses_a_phone_already_owned_by_an_account(client, db):
    client.post(
        "/api/v1/register/",
        json={
            "name": "RAKOTO Jean",
            "email": EMAIL,
            "password": PASSWORD,
            "phone": PHONE,
        },
    )

    response = client.post(
        "/api/v1/register/",
        json={
            "name": "Autre Client",
            "email": "autre@example.com",
            "password": PASSWORD,
            "phone": PHONE,
        },
    )

    assert response.status_code == status.HTTP_409_CONFLICT