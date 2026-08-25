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
from app.schemas.orders import OrderMovementPayload
from app.api.api_v1.endpoints.orders import (
    _generate_order_number,
    _note_with_pending_lines,
)

router = APIRouter()


def _resolve_customer(
    *,
    db: Session,
    customer_id: int | None,
    customer_name: str | None,
    customer_phone: str | None,
    delivery_address: str | None,
) -> models.Customers:
    if customer_id is not None:
        customer = crud.customers.get(db=db, id=customer_id)
        if not customer:
            raise HTTPException(status_code=404, detail='Customer not found')
        return customer

    phone = (customer_phone or '').strip()
    name = (customer_name or '').strip()
    address = (delivery_address or '').strip()

    if not phone:
        raise HTTPException(
            status_code=422,
            detail='customer_phone is required when customer_id is not provided',
        )

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
    )

    cart_items = crud.cart_items.get_multi_by_customer_id(db=db, customer_id=customer.id)
    if len(cart_items) == 0:
        raise HTTPException(status_code=422, detail='Cart is empty for this customer')

    # Promo code validation against the cart subtotal.
    promo_code_obj = None
    promo_code_str = (checkout_in.promo_code or "").strip().upper()
    discount_amount = 0.0
    if promo_code_str:
        subtotal = sum(
            float(item.quantity or 0) * float(item.unit_cost or 0)
            for item in cart_items
        )
        try:
            promo_code_obj, discount_amount = crud.promo_codes.validate_for_subtotal(
                db=db,
                code=promo_code_str,
                subtotal=subtotal,
            )
        except InvalidPromoCode as exc:
            raise HTTPException(status_code=422, detail=f'Promo code invalide: {exc.reason}')

    order_status = checkout_in.status or ProductStatusEnum.draft
    resolved_order_number = (checkout_in.order_number or "").strip() or _generate_order_number()
    order_payload = schemas.OrdersCreateRequest(
        order_number=resolved_order_number,
        user_id=checkout_in.user_id,
        customer_id=customer.id,
        customer_name=checkout_in.customer_name or customer.name,
        customer_phone=checkout_in.customer_phone or customer.phone,
        delivery_address=checkout_in.delivery_address or customer.delivery_address,
        another_price=checkout_in.another_price,
        other_price_reason=checkout_in.other_price_reason,
        promo_code=promo_code_str if discount_amount > 0 else None,
        discount=discount_amount,
        status=order_status,
        note=checkout_in.note,
        movements=[
            OrderMovementPayload(
                product_id=item.product_id,
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                another_price=item.another_price,
                other_price_reason=item.other_price_reason,
            )
            for item in cart_items
        ],
    )

    try:
        # Reuse orders endpoint logic by calling CRUD + stock application rules here.
        order = crud.orders.create(
            db=db,
            obj_in=schemas.OrdersCreate(**order_payload.model_dump(exclude={'customer', 'movement', 'movements'})),
            commit=False,
            refresh=False,
        )
        db.flush()

        if order_status in (ProductStatusEnum.confirmed, ProductStatusEnum.delivered):
            movement_user_id = order.user_id or current_user.id
            for movement in order_payload.movements or []:
                from app.api.api_v1.endpoints.orders import _apply_order_stock_out

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
            pending_lines = [
                {
                    'product_id': item.product_id,
                    'product_name': item.product.name if item.product else None,
                    'variant_id': item.variant_id,
                    'variant_name': item.variant.name if item.variant else None,
                    'quantity': item.quantity,
                    'unit_cost': item.unit_cost,
                    'another_price': item.another_price,
                    'other_price_reason': item.other_price_reason,
                }
                for item in cart_items
            ]
            if pending_lines:
                order.note = _note_with_pending_lines(order.note, pending_lines)

        # The cart is always cleared once the order is placed. Pending lines are
        # stored on the order for non-validated statuses so confirmation can
        # still build the stock-out movements.
        for item in cart_items:
            db.delete(item)

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
                    float(item.quantity or 0) * float(item.unit_cost or 0)
                    + float(item.another_price or 0)
                    for item in cart_items
                )
                + float(checkout_in.another_price or 0)
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
