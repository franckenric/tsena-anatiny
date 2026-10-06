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

    first = client.post("/api/v1/cart_items/checkout-guest", json=payload)
    assert first.status_code == status.HTTP_200_OK, first.text

    second = client.post("/api/v1/cart_items/checkout-guest", json=payload)
    assert second.status_code == status.HTTP_200_OK, second.text

    assert first.json()["customer_id"] == second.json()["customer_id"]
    # Une seule fiche client pour ce numero : pas de doublon a chaque commande.
    assert crud.customers.get_count_where_array(db=db, where=[]) == 1


def test_guest_checkout_normalises_the_phone_format(client, db):
    product = _seed_product(db)

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
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


def test_guest_checkout_needs_no_token(client, db):
    """Aucun `Authorization`, aucun jeton de service : la commande passe.

    C'est tout l'interet de rendre l'endpoint public : le navigateur n'a pas
    de credentials a lui faire porter pour qu'un invite puisse commander.
    """
    product = _seed_product(db)

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "items": [{"product_id": product.id, "quantity": 1}],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    order = crud.orders.get(db=db, id=response.json()["id"])
    assert order is not None
    # Aucune commande invitee n'est portee par un compte de service : le champ
    # reste vide, et le back-office la voit sans auteur.
    assert order.user_id is None


def test_guest_checkout_stays_read_only_on_prices(client, db):
    """Meme sans jeton, le prix du catalogue reste la seule source de verite.

    Un endpoint public ne doit pas devenir un point d'entree pour imposer un
    tarif : c'est le risque principal quand on retire l'authentification.
    """
    product = _seed_product(db, selling_price=5000)

    response = client.post(
        "/api/v1/cart_items/checkout-guest",
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "items": [
                {"product_id": product.id, "quantity": 2, "unit_cost": 1},
                {"product_id": product.id, "quantity": 1, "unit_cost": -99999},
            ],
            "status": "draft",
        },
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    note = (crud.orders.get(db=db, id=response.json()["id"]).note or "").replace(
        "'", '"'
    )
    assert '"unit_cost": 5000.0' in note
    assert '"unit_cost": 1,' not in note
    assert "-99999" not in note


def test_guest_checkout_is_rate_limited(client, db):
    """Plafond par IP : l'endpoint cree des lignes de stock, il doit borner."""
    product = _seed_product(db)
    payload = {
        "customer_name": "RAKOTO Jean",
        "customer_phone": PHONE,
        "items": [{"product_id": product.id, "quantity": 1}],
        "status": "draft",
    }

    codes = [
        client.post("/api/v1/cart_items/checkout-guest", json=payload).status_code
        for _ in range(7)
    ]

    assert codes[:5] == [status.HTTP_200_OK] * 5, codes
    assert codes[5:] == [status.HTTP_429_TOO_MANY_REQUESTS] * 2, codes


def test_promo_code_validation_needs_no_token(client, db):
    """Un invite doit pouvoir tester un code avant de commander."""
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
        "/api/v1/promo_codes/validate",
        json={"code": "bienvenue10", "subtotal": 2000},
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    body = response.json()
    assert body["valid"] is True
    assert body["discount_amount"] == 200


def _guest_order_ref(client, db):
    product = _seed_product(db)
    ordered = client.post(
        "/api/v1/cart_items/checkout-guest",
        json={
            "customer_name": "RAKOTO Jean",
            "customer_phone": PHONE,
            "delivery_address": "Lot II A 25",
            "items": [{"product_id": product.id, "quantity": 1}],
            "status": "draft",
        },
    )
    assert ordered.status_code == status.HTTP_200_OK, ordered.text
    body = ordered.json()
    return body["order_number"], body["id"]


def test_guest_lookup_needs_no_token(client, db):
    """Le success page d'un invite relit la commande sans aucun jeton.

    C'est le corollaire du checkout public : si la page de confirmation
    rappelait l'endpoint authentifie `/orders/`, un visiteur sans session
    recevrait 401 « Not authenticated » juste apres avoir commande.
    """
    order_number, order_id = _guest_order_ref(client, db)

    response = client.get(
        "/api/v1/orders/guest-lookup",
        params={"order_number": order_number, "phone": PHONE},
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    body = response.json()
    assert body["id"] == order_id
    assert body["order_number"] == order_number
    assert body["customer"]["phone"] == PHONE
    assert body["customer"]["delivery_address"] == "Lot II A 25"
    assert body["user_id"] is None


def test_guest_lookup_normalises_both_the_phone_and_the_format(client, db):
    """La saisie avec espaces + le numero non nettoye sont acceptes."""
    order_number, order_id = _guest_order_ref(client, db)

    response = client.get(
        "/api/v1/orders/guest-lookup",
        params={"order_number": order_number, "phone": "+261 34 12 345 67"},
    )

    assert response.status_code == status.HTTP_200_OK, response.text
    assert response.json()["id"] == order_id


def test_guest_lookup_rejects_a_wrong_phone(client, db):
    """Le telephone sert de cle : un autre numero ne revele pas la commande."""
    order_number, order_id = _guest_order_ref(client, db)

    response = client.get(
        "/api/v1/orders/guest-lookup",
        params={"order_number": order_number, "phone": "+261333333333"},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_guest_lookup_hides_orders_that_have_an_author(client, db):
    """Le lookup public est reserve aux commandes invitees (`user_id` NULL).

    Une commande creee depuis un compte reste visibile par l'endpoint
    authentifie : le pseudo-lookup ne doit pas la fuiter.
    """
    order_number, order_id = _guest_order_ref(client, db)
    crud.orders.update(
        db,
        db_obj=crud.orders.get(db=db, id=order_id),
        obj_in={"user_id": 1},
    )
    db.commit()

    response = client.get(
        "/api/v1/orders/guest-lookup",
        params={"order_number": order_number, "phone": PHONE},
    )

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_guest_lookup_is_rate_limited(client, db):
    """Plafond par IP : un numero n'est pas devinable en force brute."""
    order_number, order_id = _guest_order_ref(client, db)

    codes = [
        client.get(
            "/api/v1/orders/guest-lookup",
            params={"order_number": order_number, "phone": PHONE},
        ).status_code
        for _ in range(11)
    ]

    # Le budget est partage par IP avec le checkout public : le POST du helper
    # consomme 1 frappe, il reste 9 lookups avant le plafond de 10.
    assert codes[:9] == [status.HTTP_200_OK] * 9, codes
    assert codes[9:] == [status.HTTP_429_TOO_MANY_REQUESTS] * 2, codes