"""Zones de livraison et code promo « livraison offerte »."""

from fastapi import status
from app import crud, schemas
from app.enum.discount_type import DiscountTypeEnum

from tests.test_promo_codes_api import AUTH, _make_user


def _seed_catalogue(db):
    """Client + produit en stock, pour pouvoir passer une commande."""
    customer = crud.customers.create(
        db, obj_in=schemas.CustomersCreate(name="Zone Test", phone="+261 34 11 122 34")
    )
    category = crud.categories.create(db, obj_in=schemas.CategoriesCreate(name="Cat Z"))
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            sku="ZP1",
            name="Produit zone",
            category_id=category.id,
            unit="kg",
            image="/No_Image_Available.jpg",
        ),
    )
    crud.stock.create(
        db, obj_in=schemas.StockCreate(product_id=product.id, quantity=100)
    )
    db.commit()
    return customer, product


def _add_to_cart(client, db, customer, product, token):
    resp = client.post(
        "/api/v1/cart_items/",
        json={
            "customer_id": customer.id,
            "product_id": product.id,
            "quantity": 2,
            "unit_cost": 10000,
        },
        headers=AUTH(token),
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text


def test_delivery_zone_crud_and_public_options(client, db):
    """CRUD admin + options publiques : seules les zones actives sont exposees."""
    _user, token = _make_user(db)

    resp = client.post(
        "/api/v1/delivery_zones/",
        json={"name": "Antananarivo Urbain", "fee": 5000},
        headers=AUTH(token),
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text
    zone = resp.json()
    assert zone["name"] == "Antananarivo Urbain"
    assert zone["fee"] == 5000

    # Doublon refuse
    resp_dup = client.post(
        "/api/v1/delivery_zones/",
        json={"name": "Antananarivo Urbain", "fee": 7000},
        headers=AUTH(token),
    )
    assert resp_dup.status_code == 409

    # Tarif negatif refuse
    resp_bad = client.post(
        "/api/v1/delivery_zones/",
        json={"name": "Zone negative", "fee": -1},
        headers=AUTH(token),
    )
    assert resp_bad.status_code == 422

    # Les options sont publiques (le visiteur doit voir le tarif)
    resp_options = client.get("/api/v1/delivery_zones/options")
    assert resp_options.status_code == status.HTTP_200_OK, resp_options.text
    options = resp_options.json()
    assert [o["name"] for o in options] == ["Antananarivo Urbain"]
    # L'option publique n'expose que le necessaire
    assert set(options[0]) == {"id", "name", "fee"}

    # Mise a jour du tarif
    resp_upd = client.put(
        f"/api/v1/delivery_zones/{zone['id']}",
        json={"fee": 6500},
        headers=AUTH(token),
    )
    assert resp_upd.status_code == status.HTTP_200_OK, resp_upd.text
    assert resp_upd.json()["fee"] == 6500

    # Suppression logique : la zone disparait des options, mais reste lisible
    # pour l'historique des commandes.
    resp_del = client.delete(
        f"/api/v1/delivery_zones/{zone['id']}", headers=AUTH(token)
    )
    assert resp_del.status_code == status.HTTP_200_OK, resp_del.text
    assert client.get("/api/v1/delivery_zones/options").json() == []

    # Les options restent sans authentification
    assert (
        client.get("/api/v1/delivery_zones/").status_code
        == status.HTTP_401_UNAUTHORIZED
    )


def test_free_shipping_promo_waives_delivery_fee(client, db):
    """Un code « livraison offerte » annule le tarif de la zone, pas le panier."""
    # On lit l'id tout de suite : chaque requete ferme la session et detachera
    # l'objet, ce qui rendrait `user.id` illisible plus bas.
    user, token = _make_user(db)
    user_id = user.id

    resp_zone = client.post(
        "/api/v1/delivery_zones/",
        json={"name": "Ivato", "fee": 5000},
        headers=AUTH(token),
    )
    assert resp_zone.status_code == status.HTTP_200_OK, resp_zone.text
    zone_id = resp_zone.json()["id"]

    # discount_value vaut 0 : ce code ne retire rien du sous-total.
    promo = crud.promo_codes.create(
        db,
        obj_in=schemas.PromoCodesCreate(
            code="PORTOFFERT",
            discount_type=DiscountTypeEnum.free_shipping,
            discount_value=0,
        ),
    )
    db.commit()
    db.refresh(promo)
    assert promo.discount_type == DiscountTypeEnum.free_shipping

    # Valide sans zone (le client ne l'a pas encore choisie) et signalé comme
    # « livraison offerte » : l'interface sait deja quoi afficher.
    resp_v = client.post(
        "/api/v1/promo_codes/validate",
        json={"code": "PORTOFFERT", "subtotal": 20000},
    )
    assert resp_v.status_code == status.HTTP_200_OK, resp_v.text
    body = resp_v.json()
    assert body["valid"] is True
    assert body["free_shipping"] is True
    assert body["discount_amount"] == 0

    customer, product = _seed_catalogue(db)
    _add_to_cart(client, db, customer, product, token)

    # Sans code : le tarif de la zone est facture
    resp_plain = client.post(
        f"/api/v1/cart_items/checkout/{customer.id}",
        json={
            "user_id": user_id,
            "status": "draft",
            "delivery_zone_id": zone_id,
        },
        headers=AUTH(token),
    )
    assert resp_plain.status_code == status.HTTP_200_OK, resp_plain.text
    plain_order = resp_plain.json()
    assert plain_order["delivery_zone_id"] == zone_id
    assert plain_order["delivery_fee"] == 5000
    assert plain_order["discount"] == 0

    # Re-remplir le panier pour la commande avec code
    _add_to_cart(client, db, customer, product, token)
    resp_free = client.post(
        f"/api/v1/cart_items/checkout/{customer.id}",
        json={
            "user_id": user_id,
            "status": "draft",
            "delivery_zone_id": zone_id,
            "promo_code": "PORTOFFERT",
        },
        headers=AUTH(token),
    )
    assert resp_free.status_code == status.HTTP_200_OK, resp_free.text
    free_order = resp_free.json()
    # La livraison est annulee, mais le sous-total des produits intact.
    assert free_order["delivery_fee"] == 0
    assert free_order["delivery_zone_id"] == zone_id
    assert free_order["discount"] == 0
    assert free_order["promo_code"] == "PORTOFFERT"

    # Un code cree en brouillon ne consomme rien tant qu'il n'est pas confirme.
    db.expire_all()
    fresh = crud.promo_codes.get_by_code(db, code="PORTOFFERT")
    assert fresh.used_count == 0


def test_free_shipping_promo_can_be_limited_to_a_zone(client, db):
    """Le rayon : un code ne couvre que les zones declarees."""
    _user, token = _make_user(db)

    zone_ids = []
    for name, fee in (("Zone A", 4000), ("Zone B", 9000)):
        resp = client.post(
            "/api/v1/delivery_zones/",
            json={"name": name, "fee": fee},
            headers=AUTH(token),
        )
        assert resp.status_code == status.HTTP_200_OK, resp.text
        zone_ids.append(resp.json()["id"])
    zone_a, zone_b = zone_ids

    resp_promo = client.post(
        "/api/v1/promo_codes/",
        json={
            "code": "PORTA",
            "discount_type": "free_shipping",
            "discount_value": 0,
            # Limite a la zone A : B ne doit pas en beneficier.
            "free_shipping_zone_ids": [zone_a],
        },
        headers=AUTH(token),
    )
    assert resp_promo.status_code == status.HTTP_200_OK, resp_promo.text
    created = resp_promo.json()
    assert created["free_shipping_zone_ids"] == [zone_a]

    # Zone couverte : accepte et signale
    resp_ok = client.post(
        "/api/v1/promo_codes/validate",
        json={"code": "PORTA", "subtotal": 20000, "delivery_zone_id": zone_a},
    )
    assert resp_ok.status_code == status.HTTP_200_OK, resp_ok.text
    assert resp_ok.json()["free_shipping"] is True

    # Zone hors rayon : rejete avec une explication
    resp_ko = client.post(
        "/api/v1/promo_codes/validate",
        json={"code": "PORTA", "subtotal": 20000, "delivery_zone_id": zone_b},
    )
    assert resp_ko.status_code == 422, resp_ko.text
    assert "delivery zone" in resp_ko.json()["detail"]

    # Un code sans zone associee couvre toutes les zones
    resp_all = client.post(
        "/api/v1/promo_codes/",
        json={
            "code": "PORTALL",
            "discount_type": "free_shipping",
            "discount_value": 0,
        },
        headers=AUTH(token),
    )
    assert resp_all.status_code == status.HTTP_200_OK, resp_all.text
    assert resp_all.json()["free_shipping_zone_ids"] == []

    resp_all_v = client.post(
        "/api/v1/promo_codes/validate",
        json={"code": "PORTALL", "subtotal": 20000, "delivery_zone_id": zone_b},
    )
    assert resp_all_v.status_code == status.HTTP_200_OK, resp_all_v.text
    assert resp_all_v.json()["free_shipping"] is True


def test_promo_list_returns_zone_ids(client, db):
    """La liste des codes doit porter `free_shipping_zone_ids`.

    Sinon, rouvrir un code restreint a des zones affichait « toutes les
    zones » dans le formulaire : une simple sauvegarde effaçait la
    restriction sans que personne ne la voie.
    """
    _user, token = _make_user(db)

    resp_zone = client.post(
        "/api/v1/delivery_zones/",
        json={"name": "Zone List", "fee": 3000},
        headers=AUTH(token),
    )
    assert resp_zone.status_code == status.HTTP_200_OK, resp_zone.text
    zone_id = resp_zone.json()["id"]

    client.post(
        "/api/v1/promo_codes/",
        json={
            "code": "LISTRESTREINT",
            "discount_type": "free_shipping",
            "discount_value": 0,
            "free_shipping_zone_ids": [zone_id],
        },
        headers=AUTH(token),
    )

    resp_list = client.get("/api/v1/promo_codes/?offset=0&limit=100")
    assert resp_list.status_code == status.HTTP_200_OK, resp_list.text
    by_code = {item["code"]: item for item in resp_list.json()["data"]}

    assert by_code["LISTRESTREINT"]["free_shipping_zone_ids"] == [zone_id]
    # Un code « classique » ne doit pas apparaitre en null : le formulaire
    # distingue « aucune zone (= toutes) » de « inconnu ».
    assert by_code["LISTRESTREINT"]["discount_type"] == "free_shipping"


def test_checkout_rejects_unknown_zone(client, db):
    """Le tarif vient de la base : un client ne peut pas choisir une zone inexistante."""
    user, token = _make_user(db)
    user_id = user.id
    customer, product = _seed_catalogue(db)
    _add_to_cart(client, db, customer, product, token)

    resp = client.post(
        f"/api/v1/cart_items/checkout/{customer.id}",
        json={
            "user_id": user_id,
            "status": "draft",
            "delivery_zone_id": 999999,
        },
        headers=AUTH(token),
    )
    assert resp.status_code == 422, resp.text
    assert "inconnue" in resp.json()["detail"]
