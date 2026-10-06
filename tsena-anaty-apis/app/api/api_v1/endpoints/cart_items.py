from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.api.api_v1.endpoints.notifications import notify_order_created
from app.crud.crud_promo_codes import InvalidPromoCode
from app.enum.product_status import ProductStatusEnum
from app.schemas.customers import clean_phone
from app.schemas.orders import OrderMovementPayload
from app.api.api_v1.endpoints.orders import (
    _apply_order_stock_out,
    _generate_order_number,
    _note_with_pending_lines,
)

router = APIRouter()


PHONE_REQUIRED_DETAIL = 'customer_phone is required to place an order'


def _clean_customer_phone(value: str | None, *, required: bool = True) -> str:
    """Normalise un numero saisi par l'utilisateur au format `+261XXXXXXXXX`.

    La colonne `customers.phone` est unique : sans normalisation, la meme
    fiche serait dupliquee par deux saisies differentes (+261 34 12 345 67 vs
    +261341234567).
    """
    if not value or not value.strip():
        if required:
            raise HTTPException(status_code=422, detail=PHONE_REQUIRED_DETAIL)
        return ''
    try:
        return clean_phone(value.strip()) or ''
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _resolve_customer(
    *,
    db: Session,
    customer_id: int | None,
    customer_name: str | None,
    customer_phone: str | None,
    delivery_address: str | None,
    require_phone: bool = False,
) -> models.Customers:
    """Resolve the customer for an order.

    A customer account is created with an email only, so the phone number is
    collected when the order is placed (``require_phone=True``). It is stored
    on the customer record and reused for their next orders.
    """
    name = (customer_name or '').strip()
    address = (delivery_address or '').strip()

    if customer_id is not None:
        customer = crud.customers.get(db=db, id=customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail='Customer not found')

        phone = _clean_customer_phone(customer_phone, required=False)

        if phone and customer.phone != phone:
            customer = crud.customers.update(
                db=db, db_obj=customer, obj_in={'phone': phone}, commit=False,
            )
            db.flush()
        elif not phone:
            phone = (customer.phone or '').strip()

        if require_phone and not phone:
            raise HTTPException(status_code=422, detail=PHONE_REQUIRED_DETAIL)

        update_payload = {}
        if name and customer.name != name:
            update_payload['name'] = name
        if address and customer.delivery_address != address:
            update_payload['delivery_address'] = address
        if update_payload:
            customer = crud.customers.update(
                db=db, db_obj=customer, obj_in=update_payload, commit=False,
            )
            db.flush()
        return customer

    phone = _clean_customer_phone(customer_phone)

    customer = crud.customers.get_by_field(db=db, field='phone', value=phone)
    if customer is not None:
        update_payload = {}
        if name and customer.name != name:
            update_payload['name'] = name
        if address and customer.delivery_address != address:
            update_payload['delivery_address'] = address
        if update_payload:
            customer = crud.customers.update(
                db=db,
                db_obj=customer,
                obj_in=update_payload,
                commit=False,
            )
            db.flush()
        return customer

    if not name:
        raise HTTPException(
            status_code=422,
            detail='customer_name is required when customer_phone does not exist',
        )

    try:
        customer = crud.customers.create(
            db=db,
            obj_in=schemas.CustomersCreate(
                name=name,
                phone=phone,
                delivery_address=address or None,
            ),
            commit=False,
            refresh=False,
        )
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors())
    db.flush()
    return customer


# Alias sans slash final : sans lui, Starlette repond 307 vers une URL
# absolue et le navigateur retire l'en-tete Authorization sur la redirection.
@router.get('', include_in_schema=False)
@router.get('/', response_model=schemas.ResponseCartItems)
def read_cart_items(
    *,
    offset: int = 0,
    limit: int = 100,
    customer_id: int | None = None,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    where = []
    if customer_id is not None:
        where.append({'key': 'customer_id', 'operator': '==', 'value': customer_id})

    cart_items = crud.cart_items.get_multi_where_array(
        db=db,
        relations=[
            'customer{id,name,phone,delivery_address}',
            'product{id,name,sku,image}',
            'variant{id,name,sku,image}',
        ],
        skip=offset,
        limit=limit,
        where=where,
    )
    count = crud.cart_items.get_count_where_array(db=db, where=where)
    return schemas.ResponseCartItems(count=count, data=jsonable_encoder(cart_items))


@router.post('/', response_model=schemas.CartItems)
def create_cart_item(
    *,
    db: Session = Depends(deps.get_db),
    item_in: schemas.CartItemsCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    if item_in.quantity <= 0:
        raise HTTPException(status_code=422, detail='quantity must be greater than 0')

    customer = _resolve_customer(
        db=db,
        customer_id=item_in.customer_id,
        customer_name=item_in.customer_name,
        customer_phone=item_in.customer_phone,
        delivery_address=item_in.delivery_address,
    )

    product = crud.products.get(db=db, id=item_in.product_id)
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')

    variant = None
    if item_in.variant_id is not None:
        variant = crud.product_variants.get(db=db, id=item_in.variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail='Variant not found')
        if variant.product_id != product.id:
            raise HTTPException(status_code=422, detail='Variant does not belong to this product')
        if crud.product_variants.has_children(db=db, variant_id=variant.id):
            raise HTTPException(
                status_code=422,
                detail=f'Impossible de commander la variante « {variant.name} », choisissez une sous-variante',
            )
        available = crud.product_variants.effective_quantity(db, variant_id=variant.id)
        if item_in.quantity > available:
            raise HTTPException(
                status_code=409,
                detail=f'Stock insuffisant pour la variante « {variant.name} » (disponible: {available})',
            )

    try:
        existing_item = crud.cart_items.get_by_customer_and_product(
            db=db,
            customer_id=customer.id,
            product_id=item_in.product_id,
            variant_id=item_in.variant_id,
        )

        if existing_item:
            combined_quantity = (existing_item.quantity or 0) + item_in.quantity
            if variant is not None:
                available = crud.product_variants.effective_quantity(
                    db, variant_id=variant.id
                )
                if combined_quantity > available:
                    raise HTTPException(
                        status_code=409,
                        detail=f'Stock insuffisant pour la variante « {variant.name} » (disponible: {available})',
                    )

            update_payload: dict[str, Any] = {
                'quantity': combined_quantity,
            }
            if item_in.unit_cost is not None:
                update_payload['unit_cost'] = item_in.unit_cost
            if item_in.another_price is not None:
                update_payload['another_price'] = item_in.another_price
            if item_in.other_price_reason is not None:
                update_payload['other_price_reason'] = item_in.other_price_reason

            item = crud.cart_items.update(
                db=db,
                db_obj=existing_item,
                obj_in=update_payload,
                commit=False,
            )
            db.commit()
            db.refresh(item)
            return item

        item = models.CartItems(
            customer_id=customer.id,
            product_id=item_in.product_id,
            variant_id=item_in.variant_id,
            quantity=item_in.quantity,
            unit_cost=item_in.unit_cost,
            another_price=item_in.another_price,
            other_price_reason=item_in.other_price_reason,
        )
        db.add(item)
        db.flush()
        db.commit()
        db.refresh(item)
        return item
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Cart item creation conflict')


@router.put('/{item_id}', response_model=schemas.CartItems)
def update_cart_item(
    *,
    db: Session = Depends(deps.get_db),
    item_id: int,
    item_in: schemas.CartItemsUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    item = crud.cart_items.get(db=db, id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Cart item not found')

    if item_in.quantity is not None and item_in.quantity <= 0:
        raise HTTPException(status_code=422, detail='quantity must be greater than 0')

    try:
        return crud.cart_items.update(db=db, db_obj=item, obj_in=item_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Cart item update conflict')


@router.delete('/{item_id}', response_model=schemas.Msg)
def delete_cart_item(
    *,
    db: Session = Depends(deps.get_db),
    item_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    item = crud.cart_items.get(db=db, id=item_id)
    if not item:
        raise HTTPException(status_code=404, detail='Cart item not found')

    crud.cart_items.remove(db=db, id=item_id)
    return schemas.Msg(msg='Cart item deleted successfully')


def _build_promo_discount(
    *,
    db: Session,
    promo_code: str | None,
    subtotal: float,
) -> tuple[models.PromoCodes | None, float, str | None]:
    """Valide un code promo contre le sous-total et retourne (code, remise, code normalise)."""
    promo_code_str = (promo_code or "").strip().upper()
    if not promo_code_str:
        return None, 0.0, None

    try:
        promo_code_obj, discount_amount = crud.promo_codes.validate_for_subtotal(
            db=db,
            code=promo_code_str,
            subtotal=subtotal,
        )
    except InvalidPromoCode as exc:
        raise HTTPException(status_code=422, detail=f'Promo code invalide: {exc.reason}')
    return promo_code_obj, discount_amount, promo_code_str


def _price_order(
    *,
    db: Session,
    customer: models.Customers,
    lines: list[dict[str, Any]],
    user_id: int | None,
    promo_code: str | None,
    status: ProductStatusEnum,
    note: str | None,
    order_number: str | None = None,
    another_price: float | None = None,
    other_price_reason: str | None = None,
    current_user: models.Users | None = None,
) -> models.Orders:
    """Cree la commande, applique (ou differe) le stock et notifie le back-office.

    `lines` porte des prix deja resolus cote serveur (`unit_cost`) : c'est la
    seule source de verite pour la valorisation.
    """
    promo_code_obj, discount_amount, promo_code_str = _build_promo_discount(
        db=db,
        promo_code=promo_code,
        subtotal=sum(float(line['quantity']) * float(line['unit_cost']) for line in lines),
    )

    order_status = status or ProductStatusEnum.draft
    order_payload = schemas.OrdersCreateRequest(
        order_number=order_number or _generate_order_number(),
        user_id=user_id,
        customer_id=customer.id,
        customer_name=customer.name,
        customer_phone=customer.phone,
        delivery_address=customer.delivery_address,
        another_price=another_price,
        other_price_reason=other_price_reason,
        promo_code=promo_code_str if discount_amount > 0 else None,
        discount=discount_amount,
        status=order_status,
        note=note,
        movements=[
            OrderMovementPayload(
                product_id=line['product_id'],
                variant_id=line.get('variant_id'),
                quantity=line['quantity'],
                unit_cost=line['unit_cost'],
                another_price=line.get('another_price') or 0,
                other_price_reason=line.get('other_price_reason'),
            )
            for line in lines
        ],
    )

    try:
        order = crud.orders.create(
            db=db,
            obj_in=schemas.OrdersCreate(
                **order_payload.model_dump(exclude={'customer', 'movement', 'movements'})
            ),
            commit=False,
            refresh=False,
        )
        db.flush()

        if order_status in (ProductStatusEnum.confirmed, ProductStatusEnum.delivered):
            movement_user_id = order.user_id or (current_user.id if current_user else None)
            for movement in order_payload.movements or []:
                _apply_order_stock_out(
                    db=db,
                    order=order,
                    product_id=movement.product_id,
                    variant_id=movement.variant_id,
                    quantity=movement.quantity,
                    movement_user_id=movement_user_id,
                    unit_cost=movement.unit_cost,
                    another_price=movement.another_price,
                    other_price_reason=movement.other_price_reason,
                )
        else:
            # Statut non valide : les lignes sont stockees dans la note pour que
            # la confirmation puisse plus tard sortir le stock.
            pending_lines = [
                {
                    'product_id': line['product_id'],
                    'product_name': line.get('product_name'),
                    'variant_id': line.get('variant_id'),
                    'variant_name': line.get('variant_name'),
                    'quantity': line['quantity'],
                    'unit_cost': line['unit_cost'],
                    'another_price': line.get('another_price') or 0,
                    'other_price_reason': line.get('other_price_reason'),
                }
                for line in lines
            ]
            if pending_lines:
                order.note = _note_with_pending_lines(order.note, pending_lines)

        db.commit()
        db.refresh(order)

        if promo_code_obj is not None and discount_amount > 0:
            promo_code_obj.used_count = (promo_code_obj.used_count or 0) + 1
            db.commit()

        notify_order_created(
            db,
            order,
            customer=customer,
            total=max(
                0.0,
                sum(
                    float(line['quantity']) * float(line['unit_cost'])
                    + float(line.get('another_price') or 0)
                    for line in lines
                )
                + float(another_price or 0)
                - float(discount_amount or 0),
            ),
        )
        return order
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Cart checkout conflict')


def _cart_items_to_lines(cart_items: list[Any]) -> list[dict[str, Any]]:
    """Aplatit des lignes de panier enregistrees en lignes valorisees."""
    return [
        {
            'product_id': item.product_id,
            'product_name': item.product.name if item.product else None,
            'variant_id': item.variant_id,
            'variant_name': item.variant.name if item.variant else None,
            'quantity': item.quantity,
            'unit_cost': float(item.unit_cost or 0),
            'another_price': float(item.another_price or 0),
            'other_price_reason': item.other_price_reason,
        }
        for item in cart_items
    ]


@router.post('/checkout/{customer_id}', response_model=schemas.Orders)
def checkout_cart(
    *,
    db: Session = Depends(deps.get_db),
    customer_id: int,
    checkout_in: schemas.CartCheckoutRequest,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    customer = _resolve_customer(
        db=db,
        customer_id=checkout_in.customer_id or customer_id,
        customer_name=checkout_in.customer_name,
        customer_phone=checkout_in.customer_phone,
        delivery_address=checkout_in.delivery_address,
        require_phone=True,
    )

    cart_items = crud.cart_items.get_multi_by_customer_id(db=db, customer_id=customer.id)
    if len(cart_items) == 0:
        raise HTTPException(status_code=422, detail='Cart is empty for this customer')

    lines = _cart_items_to_lines(cart_items)

    # Sans `user_id` explicite, la commande revient a l'utilisateur connecte :
    # l'application ne connait plus que les roles admin et client.
    order_user_id = checkout_in.user_id
    if order_user_id is None:
        order_user_id = current_user.id if current_user else None

    try:
        order = _price_order(
            db=db,
            customer=customer,
            lines=lines,
            user_id=order_user_id,
            promo_code=checkout_in.promo_code,
            order_number=(checkout_in.order_number or "").strip() or None,
            status=checkout_in.status or ProductStatusEnum.draft,
            note=checkout_in.note,
            another_price=checkout_in.another_price,
            other_price_reason=checkout_in.other_price_reason,
            current_user=current_user,
        )

        # Le panier est vide apres commande, quel que soit le statut : les lignes
        # en attente sont conservees dans la note de la commande.
        for item in cart_items:
            db.delete(item)
        db.commit()
        return order
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Cart checkout conflict')


@router.post('/checkout-guest', response_model=schemas.Orders)
def checkout_guest(
    *,
    db: Session = Depends(deps.get_db),
    checkout_in: schemas.GuestCartCheckoutRequest,
    _throttle: None = Depends(deps.rate_limit(limit=5, window_s=60)),
) -> Any:
    """Commande sans compte. Endpoint public.

    Le panier d'un invite n'a jamais ete enregistre : les lignes arrivent avec
    la commande. Chaque prix est resolu depuis le catalogue (variante en
    priorite, produit en repli) et le stock est verifie avant acceptation, donc
    le navigateur ne peut pas imposer son tarif.

    Public ne veut pas dire sans garde-fou : la commande cree une fiche client
    et des lignes de stock, d'ou le plafond par IP. C'est aussi pourquoi rien
    n'est attribue a un utilisateur : la commande n'a pas d'auteur, seulement
    un client, et `orders.user_id` reste NULL.
    """
    if not checkout_in.items:
        raise HTTPException(status_code=422, detail='Cart is empty')

    lines: list[dict[str, Any]] = []
    for item in checkout_in.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=422, detail='quantity must be greater than 0')

        product = crud.products.get(db=db, id=item.product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')

        variant = None
        if item.variant_id is not None:
            variant = crud.product_variants.get(db=db, id=item.variant_id)
            if not variant:
                raise HTTPException(status_code=404, detail='Variant not found')
            if variant.product_id != product.id:
                raise HTTPException(
                    status_code=422, detail='Variant does not belong to this product'
                )
            if crud.product_variants.has_children(db=db, variant_id=variant.id):
                raise HTTPException(
                    status_code=422,
                    detail=f'Impossible de commander la variante « {variant.name} », choisissez une sous-variante',
                )
            available = crud.product_variants.effective_quantity(db, variant_id=variant.id)
            if item.quantity > available:
                raise HTTPException(
                    status_code=409,
                    detail=f'Stock insuffisant pour la variante « {variant.name} » (disponible: {available})',
                )
        else:
            # Sans variante, le stock vit dans la table `stock` du produit.
            stock_row = crud.stock.get_by_product_id(db=db, product_id=product.id)
            available = int(stock_row.quantity or 0) if stock_row else 0
            if item.quantity > available:
                raise HTTPException(
                    status_code=409,
                    detail=f'Stock insuffisant pour « {product.name} » (disponible: {available})',
                )

        # Prix catalogue : la remise variante prime, sinon celle du produit.
        selling = float((variant.selling_price if variant else None) or product.selling_price or 0)
        discount = float((variant.discount_price if variant else product.discount_price) or 0)
        unit_cost = discount if 0 < discount < selling else selling
        if unit_cost <= 0:
            raise HTTPException(
                status_code=422,
                detail=f'Le produit « {product.name} » n\'a pas de prix de vente defini',
            )

        lines.append({
            'product_id': product.id,
            'product_name': product.name,
            'variant_id': variant.id if variant else None,
            'variant_name': variant.name if variant else None,
            'quantity': item.quantity,
            'unit_cost': unit_cost,
            'another_price': 0,
            'other_price_reason': None,
        })

    # Aucun `customer_id` : la fiche est retrouvee par telephone, ou creee.
    customer = _resolve_customer(
        db=db,
        customer_id=None,
        customer_name=checkout_in.customer_name,
        customer_phone=checkout_in.customer_phone,
        delivery_address=checkout_in.delivery_address,
        require_phone=True,
    )

    return _price_order(
        db=db,
        customer=customer,
        lines=lines,
        user_id=None,
        promo_code=checkout_in.promo_code,
        status=checkout_in.status or ProductStatusEnum.draft,
        note=checkout_in.note,
    )
