"""Attribution de lot des ventes (Total vendu).

Une arrivee de lot enregistree au niveau produit (variante NULL) doit
pouvoir alimenter les ventes d'une variante : sans repli, la sortie de
stock etait creee avec lot_id NULL et la vente n'apparaissait pas dans
le "Total vendu" du lot.
"""
from fastapi import status
from app import crud, models, schemas
from app.core import security
from app.enum.type import TypeEnum


def _admin_headers(db, email: str):
    user = crud.users.create(
        db,
        obj_in=schemas.UsersCreate(
            email=email,
            password='test123',
            is_active=True,
            role_id=1,
            phone_numer=None,
        ),
    )
    db.commit()
    token = security.create_access_token(sub={'id': str(user.id), 'email': user.email})
    return {'Authorization': f'Bearer {token}'}


def _create_customer_id(db, phone: str) -> int:
    customer = crud.customers.create(
        db,
        obj_in=schemas.CustomersCreate(name='Client Attrib', phone=phone),
    )
    db.commit()
    # La session est fermee en fin de requete HTTP : on ne garde que l'id.
    return int(customer.id)


def _create_product_id(db, sku: str) -> int:
    product = crud.products.create(
        db,
        obj_in=schemas.ProductsCreate(
            category_id=1,
            sku=sku,
            name='Produit Attrib',
            image='/No_Image_Available.jpg',
            selling_price=1000,
            status='active',
        ),
    )
    db.commit()
    return int(product.id)


def _create_lot_id(db, reference: str) -> int:
    lot = crud.lots.create(db, obj_in=schemas.LotCreate(reference=reference))
    db.commit()
    return int(lot.id)


def _create_variant_id(db, product_id: int, name: str, quantity: int) -> int:
    variant = crud.product_variants.create(
        db,
        obj_in=schemas.ProductVariantCreate(
            product_id=product_id, name=name, quantity=quantity
        ),
    )
    db.commit()
    return int(variant.id)


def _order_out_movements(db, order_id: int):
    return (
        db.query(models.StockMovements)
        .filter(
            models.StockMovements.commande_id == order_id,
            models.StockMovements.type == TypeEnum.out_stock,
        )
        .all()
    )


def test_variant_sale_attributes_product_level_lot(client, db):
    """Repli sur le pool produit : l'arrivee etait sans variante."""
    headers = _admin_headers(db, 'attrib-fallback@test.com')
    customer_id = _create_customer_id(db, '+261 34000 0011')
    product_id = _create_product_id(db, 'SKU-ATTR-FALLBACK')
    lot_id = _create_lot_id(db, 'LOT-ATTR-FALLBACK')

    resp = client.post(
        '/api/v1/stock/arrivals',
        headers=headers,
        json={
            'product_id': product_id,
            'quantity': 10,
            'lot_id': lot_id,
            'unit_cost': 100,
        },
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text

    # Stock variante cree sans mouvement rattache au lot (split historique).
    variant_id = _create_variant_id(db, product_id, 'Rouge', quantity=5)

    resp = client.post(
        '/api/v1/orders/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'status': 'confirmed',
            'movements': [
                {
                    'product_id': product_id,
                    'variant_id': variant_id,
                    'quantity': 2,
                    'unit_cost': 100,
                }
            ],
        },
    )
    assert resp.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED), resp.text

    out_movements = _order_out_movements(db, resp.json()['id'])
    assert len(out_movements) == 1
    assert out_movements[0].lot_id == lot_id
    variant = crud.product_variants.get(db=db, id=variant_id)
    assert variant.quantity == 3


def test_variant_sale_uses_variant_level_lot(client, db):
    """Sans repli : une arrivee rattachee a la variante reste prioritaire."""
    headers = _admin_headers(db, 'attrib-variant@test.com')
    customer_id = _create_customer_id(db, '+261 34000 0012')
    product_id = _create_product_id(db, 'SKU-ATTR-VARIANT')
    lot_id = _create_lot_id(db, 'LOT-ATTR-VARIANT')
    variant_id = _create_variant_id(db, product_id, 'Bleu', quantity=0)

    resp = client.post(
        '/api/v1/stock/arrivals',
        headers=headers,
        json={
            'product_id': product_id,
            'variant_id': variant_id,
            'quantity': 6,
            'lot_id': lot_id,
            'unit_cost': 100,
        },
    )
    assert resp.status_code == status.HTTP_200_OK, resp.text

    resp = client.post(
        '/api/v1/orders/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'status': 'confirmed',
            'movements': [
                {
                    'product_id': product_id,
                    'variant_id': variant_id,
                    'quantity': 2,
                    'unit_cost': 100,
                }
            ],
        },
    )
    assert resp.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED), resp.text

    out_movements = _order_out_movements(db, resp.json()['id'])
    assert len(out_movements) == 1
    assert out_movements[0].lot_id == lot_id


def test_order_without_lot_history_keeps_null_lot(client, db):
    """Histoire sans lot : la sortie reste lot_id NULL (comportement conserve)."""
    headers = _admin_headers(db, 'attrib-null@test.com')
    customer_id = _create_customer_id(db, '+261 34000 0013')
    product_id = _create_product_id(db, 'SKU-ATTR-NULL')

    crud.stock.create(
        db, obj_in=schemas.StockCreate(product_id=product_id, quantity=10)
    )
    db.commit()

    resp = client.post(
        '/api/v1/orders/',
        headers=headers,
        json={
            'customer_id': customer_id,
            'status': 'confirmed',
            'movements': [
                {'product_id': product_id, 'quantity': 2, 'unit_cost': 100}
            ],
        },
    )
    assert resp.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED), resp.text

    out_movements = _order_out_movements(db, resp.json()['id'])
    assert len(out_movements) == 1
    assert out_movements[0].lot_id is None
