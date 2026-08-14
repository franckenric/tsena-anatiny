from typing import Any
import ast
import json
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app import crud, models, schemas
from app.api import deps
from app.api.api_v1.endpoints.notifications import (
    notify_order_created,
    notify_order_status_changed,
)
from app.enum.product_status import ProductStatusEnum
from app.enum.type import TypeEnum
from app.schemas.orders import OrderMovementPayload

router = APIRouter()

_PENDING_LINES_MARKER = "__pending_lines__"


def _pending_lines_from_note(note: str | None) -> list[dict[str, Any]]:
    if not note:
        return []
    marker_idx = note.find(_PENDING_LINES_MARKER)
    if marker_idx < 0:
        return []
    raw = note[marker_idx + len(_PENDING_LINES_MARKER):]
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    return parsed if isinstance(parsed, list) else []


def _strip_pending_lines(note: str | None) -> str | None:
    if not note:
        return note
    marker_idx = note.find(_PENDING_LINES_MARKER)
    if marker_idx < 0:
        return note
    return note[:marker_idx].rstrip("\n") or None


def _note_with_pending_lines(
    note: str | None,
    lines: list[dict[str, Any]],
) -> str:
    base = (note or "").rstrip("\n")
    marker = f"\n{_PENDING_LINES_MARKER}{json.dumps(lines, ensure_ascii=False)}"
    return base + marker


def _generate_order_number() -> str:
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    suffix = uuid4().hex[:6].upper()
    return f"{timestamp}-{suffix}"


def _sanitize_removed_order_columns(columns: list[str]) -> list[str]:
    removed = {"product_id", "quantity", "unit_cost"}
    return [column for column in columns if column not in removed]


def _sanitize_removed_order_relations(relations: list[str]) -> list[str]:
    return [relation for relation in relations if relation.split("{")[0] != "product"]


def _sanitize_removed_order_where_relations(
    where_relations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sanitized: list[dict[str, Any]] = []
    for condition in where_relations:
        key = condition.get("key")
        if isinstance(key, str) and key.startswith("product."):
            continue
        sanitized.append(condition)
    return sanitized


def _resolve_movement_user_id(
    *,
    order_user_id: int | None,
    current_user: models.Users,
) -> int:
    movement_user_id = order_user_id or getattr(current_user, 'id', None)
    if movement_user_id is None:
        raise HTTPException(status_code=400, detail='User id is required for stock movement')
    return int(movement_user_id)


def _is_validated_status(status: ProductStatusEnum | None) -> bool:
    return status in (ProductStatusEnum.confirmed, ProductStatusEnum.delivered)


def _resolve_or_create_customer_for_order(
    *,
    db: Session,
    orders_in: schemas.OrdersCreateRequest | schemas.OrdersUpdateRequest,
) -> models.Customers:
    if not orders_in.customer_id:
        raise HTTPException(
            status_code=422,
            detail='customer_id is required',
        )
    
    customer = crud.customers.get(db=db, id=orders_in.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail='Customer not found')
    return customer

def _get_out_movements_for_order(
    *,
    db: Session,
    order_id: int,
) -> list[models.StockMovements]:
    return (
        db.query(models.StockMovements)
        .filter(models.StockMovements.type == TypeEnum.out_stock)
        .filter(models.StockMovements.commande_id == order_id)
        .order_by(models.StockMovements.created_at.asc(), models.StockMovements.id.asc())
        .all()
    )


def _rollback_order_stock_out(
    *,
    db: Session,
    out_movements: list[models.StockMovements],
) -> None:
    if len(out_movements) == 0:
        return

    quantity_by_product: dict[int, int] = {}
    quantity_by_variant: dict[int, int] = {}
    for movement in out_movements:
        if movement.variant_id is not None:
            quantity_by_variant[movement.variant_id] = (
                quantity_by_variant.get(movement.variant_id, 0)
                + int(movement.quantity or 0)
            )
        elif movement.product_id:
            quantity_by_product[movement.product_id] = (
                quantity_by_product.get(movement.product_id, 0)
                + int(movement.quantity or 0)
            )

    for variant_id, qty_to_restore in quantity_by_variant.items():
        variant = crud.product_variants.get(db=db, id=variant_id)
        if not variant:
            raise HTTPException(
                status_code=409,
                detail=f'Variant {variant_id} not found while rolling back order',
            )
        restored_qty = int(variant.quantity or 0) + int(qty_to_restore or 0)
        crud.product_variants.update(
            db=db,
            db_obj=variant,
            obj_in={'quantity': restored_qty},
            commit=False,
        )

    for product_id, qty_to_restore in quantity_by_product.items():
        stock_row = crud.stock.get_by_product_id(db=db, product_id=product_id)
        if not stock_row:
            raise HTTPException(
                status_code=409,
                detail=f'No stock found for product {product_id} while rolling back order',
            )

        restored_qty = int(stock_row.quantity or 0) + int(qty_to_restore or 0)
        crud.stock.update(
            db=db,
            db_obj=stock_row,
            obj_in={'quantity': restored_qty},
            commit=False,
        )

    for movement in out_movements:
        db.delete(movement)


def _compute_available_quantities_by_lot(
    *,
    db: Session,
    product_id: int,
    variant_id: int | None = None,
) -> list[tuple[int, int]]:
    """Return FIFO lot availability as (lot_id, remaining_qty)."""
    in_query = db.query(models.StockMovements).filter(
        models.StockMovements.product_id == product_id,
        models.StockMovements.type == TypeEnum.in_stock,
        models.StockMovements.lot_id.isnot(None),
    )
    if variant_id is not None:
        in_query = in_query.filter(models.StockMovements.variant_id == variant_id)
    in_movements = (
        in_query.order_by(models.StockMovements.created_at.asc(), models.StockMovements.id.asc())
        .all()
    )

    out_query = db.query(models.StockMovements).filter(
        models.StockMovements.product_id == product_id,
        models.StockMovements.type == TypeEnum.out_stock,
        models.StockMovements.lot_id.isnot(None),
    )
    if variant_id is not None:
        out_query = out_query.filter(models.StockMovements.variant_id == variant_id)
    out_movements = out_query.all()

    consumed_by_lot: dict[int, int] = {}
    for movement in out_movements:
        if movement.lot_id is None:
            continue
        consumed_by_lot[movement.lot_id] = (
            consumed_by_lot.get(movement.lot_id, 0) + int(movement.quantity or 0)
        )

    availability: list[tuple[int, int]] = []
    for movement in in_movements:
        lot_id = movement.lot_id
        if lot_id is None:
            continue
        remaining = int(movement.quantity or 0) - consumed_by_lot.get(lot_id, 0)
        if remaining > 0:
            availability.append((lot_id, remaining))

    return availability


def _apply_order_stock_out(
    *,
    db: Session,
    order: models.Orders,
    product_id: int,
    quantity: int,
    movement_user_id: int,
    unit_cost: float | None = None,
    another_price: float | None = None,
    other_price_reason: str | None = None,
    variant_id: int | None = None,
) -> None:
    if quantity <= 0:
        raise HTTPException(status_code=422, detail='Order quantity must be greater than 0')

    product = crud.products.get(db=db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail='Product not found')

    variant = None
    if variant_id is not None:
        variant = crud.product_variants.get(db=db, id=variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail='Variant not found')
        if variant.product_id != product.id:
            raise HTTPException(status_code=422, detail='Variant does not belong to this product')
        if crud.product_variants.has_children(db=db, variant_id=variant.id):
            raise HTTPException(
                status_code=409,
                detail=f'Sélectionnez une sous-variante de « {variant.name} »',
            )
        stock_before = variant.quantity or 0
        if stock_before < quantity:
            raise HTTPException(
                status_code=409,
                detail=f'Stock insuffisant pour la variante « {variant.name} » (disponible: {stock_before})',
            )
        stock_after = stock_before - quantity
    else:
        stock_row = crud.stock.get_by_product_id(db=db, product_id=product_id)
        if not stock_row:
            raise HTTPException(status_code=409, detail='No stock found for this product')
        stock_before = stock_row.quantity or 0
        if stock_before < quantity:
            raise HTTPException(status_code=409, detail='Insufficient stock for this order')
        stock_after = stock_before - quantity

    total_another_price = float(another_price or 0)
    normalized_other_price_reason = (other_price_reason or '').strip()
    if total_another_price > 0 and not normalized_other_price_reason:
        raise HTTPException(
            status_code=422,
            detail='other_price_reason is required when another_price is greater than 0',
        )

    available_by_lot = _compute_available_quantities_by_lot(
        db=db,
        product_id=product_id,
        variant_id=variant_id,
    )

    allocations: list[tuple[int | None, int]] = []
    remaining_to_allocate = quantity
    for lot_id, available_qty in available_by_lot:
        if remaining_to_allocate <= 0:
            break
        take_qty = min(remaining_to_allocate, available_qty)
        if take_qty > 0:
            allocations.append((lot_id, take_qty))
            remaining_to_allocate -= take_qty

    # Fallback for old histories where previous out_stock were not linked to lots.
    if remaining_to_allocate > 0:
        allocations.append((None, remaining_to_allocate))

    running_before = stock_before
    for idx, (movement_lot_id, movement_qty) in enumerate(allocations):
        movement_stock_after = running_before - movement_qty
        movement_another_price = total_another_price if idx == 0 else 0.0
        movement_other_price_reason = normalized_other_price_reason if idx == 0 and movement_another_price > 0 else None
        movement_total_cost = (
            float(movement_qty) * float(unit_cost) + movement_another_price
            if unit_cost is not None and unit_cost > 0
            else None
        )

        crud.stock_movements.create(
            db=db,
            obj_in=schemas.StockMovementsCreate(
                product_id=product_id,
                user_id=movement_user_id,
                lot_id=movement_lot_id,
                variant_id=variant_id,
                commande_id=order.id,
                type=TypeEnum.out_stock,
                quantity=movement_qty,
                unit_cost=unit_cost,
                another_price=movement_another_price,
                other_price_reason=movement_other_price_reason,
                total_cost=movement_total_cost,
                stock_before=running_before,
                stock_after=movement_stock_after,
                reference=order.order_number,
            ),
            commit=False,
            refresh=False,
        )
        running_before = movement_stock_after

    if variant is not None:
        crud.product_variants.update(
            db=db,
            db_obj=variant,
            obj_in={'quantity': stock_after},
            commit=False,
        )
    else:
        crud.stock.update(
            db=db,
            db_obj=stock_row,
            obj_in={'quantity': stock_after},
            commit=False,
        )
    print(f"Applied stock out for order {order.id}: product {product_id}, variant {variant_id}, quantity {quantity}, stock before {stock_before}, stock after {stock_after}")


@router.get('/', response_model=schemas.ResponseOrders)
def read_orders(
    *,
    offset: int = 0,
    limit: int = 20,
    relation: str = "[]",
    where: str = "[]",
    where_relation: str = "[]",
    base_columns: str = "[]",
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve orders."""
    relations = []
    if relation is not None and relation != "" and relation != []:
        relations += ast.literal_eval(relation)

    wheres = []
    if where is not None and where != "" and where != []:
        wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation is not None and where_relation != "" and where_relation != []:
        where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns is not None and base_columns != "" and base_columns != []:
        bases_columns += ast.literal_eval(base_columns)

    if len(bases_columns) > 0:
        bases_columns = _sanitize_removed_order_columns(bases_columns)
    if len(relations) > 0:
        relations = _sanitize_removed_order_relations(relations)
    if len(where_relations) > 0:
        where_relations = _sanitize_removed_order_where_relations(where_relations)

    orders = crud.orders.get_multi_where_array(
        db=db,
        relations=relations,
        skip=offset,
        limit=limit,
        where=wheres,
        where_relation=where_relations,
        base_columns=bases_columns,
    )
    count = crud.orders.get_count_where_array(db=db, where=wheres)
    response = schemas.ResponseOrders(**{'count': count, 'data': jsonable_encoder(orders)})
    return response


@router.post('/', response_model=schemas.Orders)
def create_orders(
    *,
    db: Session = Depends(deps.get_db),
    orders_in: schemas.OrdersCreateRequest,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Create new orders and consume stock only for validated statuses."""
    movements = orders_in.movements or []
    if len(movements) == 0:
        raise HTTPException(
            status_code=422,
            detail='movements is required to create stock out for an order',
        )

    payload = orders_in.model_dump(exclude={
        "customer",
        "movement",
        "movements",
        "product_id",
        "quantity",
        "unit_cost",
    })
    if not (payload.get("order_number") or "").strip():
        payload["order_number"] = _generate_order_number()

    try:
        customer = _resolve_or_create_customer_for_order(db=db, orders_in=orders_in)
        payload['customer_id'] = customer.id

        orders = crud.orders.create(
            db=db,
            obj_in=schemas.OrdersCreate(**payload),
            commit=False,
            refresh=False,
        )
        db.flush()

        if _is_validated_status(orders.status):
            movement_user_id = _resolve_movement_user_id(
                order_user_id=orders.user_id,
                current_user=current_user,
            )

            for movement in movements:
                _apply_order_stock_out(
                    db=db,
                    order=orders,
                    product_id=movement.product_id,
                    quantity=movement.quantity,
                    movement_user_id=movement_user_id,
                    unit_cost=movement.unit_cost,
                    another_price=movement.another_price,
                    other_price_reason=movement.other_price_reason,
                    variant_id=movement.variant_id,
                )

        db.commit()
        db.refresh(orders)
        notify_order_created(
            db,
            orders,
            customer=customer,
            total=sum(
                float(m.quantity or 0) * float(m.unit_cost or 0)
                + float(m.another_price or 0)
                for m in movements
            )
            + float(orders_in.another_price or 0),
        )
        return orders
    except HTTPException as e:
        print(f"Error creating order: {e.detail}")
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Order creation conflict')


@router.put('/{orders_id}', response_model=schemas.Orders)
def update_orders(
    *,
    db: Session = Depends(deps.get_db),
    orders_id: int,
    orders_in: schemas.OrdersUpdateRequest,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Update an order and replace stock-out lines when movements are provided."""
    orders = crud.orders.get(db=db, id=orders_id)
    if not orders:
        raise HTTPException(status_code=404, detail='Orders not found')

    previous_status = orders.status
    next_status = orders_in.status if orders_in.status is not None else previous_status
    previous_is_validated = _is_validated_status(previous_status)
    next_is_validated = _is_validated_status(next_status)

    try:
        customer = _resolve_or_create_customer_for_order(db=db, orders_in=orders_in)
        update_payload = orders_in.model_dump(
            exclude={'customer', 'movement', 'movements'},
            exclude_unset=True,
        )
        if customer is not None:
            update_payload['customer_id'] = customer.id

        orders = crud.orders.update(
            db=db,
            db_obj=orders,
            obj_in=update_payload,
            commit=False,
        )

        existing_out_movements = _get_out_movements_for_order(
            db=db,
            order_id=orders.id,
        )

        if previous_is_validated and not next_is_validated and len(existing_out_movements) > 0:
            _rollback_order_stock_out(
                db=db,
                out_movements=existing_out_movements,
            )
            existing_out_movements = []

        if next_is_validated:
            movements = orders_in.movements or []
            cart_items_for_confirmation: list[models.CartItems] = []

            if len(movements) == 0 and not previous_is_validated:
                pending_lines = _pending_lines_from_note(orders.note)

                if len(pending_lines) > 0:
                    movements = [
                        OrderMovementPayload(
                            product_id=line['product_id'],
                            variant_id=line.get('variant_id'),
                            quantity=line['quantity'],
                            unit_cost=line.get('unit_cost'),
                            another_price=line.get('another_price'),
                            other_price_reason=line.get('other_price_reason'),
                        )
                        for line in pending_lines
                        if line.get('product_id') is not None
                        and line.get('quantity') is not None
                    ]
                elif not orders.customer_id:
                    raise HTTPException(
                        status_code=422,
                        detail='customer_id is required to confirm order from cart',
                    )
                else:
                    cart_items_for_confirmation = crud.cart_items.get_multi_by_customer_id(
                        db=db,
                        customer_id=orders.customer_id,
                    )
                    if len(cart_items_for_confirmation) == 0:
                        raise HTTPException(
                            status_code=422,
                            detail='Cart is empty for this customer',
                        )

                    movements = [
                        OrderMovementPayload(
                            product_id=item.product_id,
                            variant_id=item.variant_id,
                            quantity=item.quantity,
                            unit_cost=item.unit_cost,
                            another_price=item.another_price,
                            other_price_reason=item.other_price_reason,
                        )
                        for item in cart_items_for_confirmation
                    ]

            if len(movements) > 0:
                movement_user_id = _resolve_movement_user_id(
                    order_user_id=orders.user_id,
                    current_user=current_user,
                )

                if len(existing_out_movements) > 0:
                    _rollback_order_stock_out(
                        db=db,
                        out_movements=existing_out_movements,
                    )

                for movement in movements:
                    _apply_order_stock_out(
                        db=db,
                        order=orders,
                        product_id=movement.product_id,
                        quantity=movement.quantity,
                        movement_user_id=movement_user_id,
                        unit_cost=movement.unit_cost,
                        another_price=movement.another_price,
                        other_price_reason=movement.other_price_reason,
                        variant_id=movement.variant_id,
                    )

                if len(cart_items_for_confirmation) > 0:
                    for item in cart_items_for_confirmation:
                        db.delete(item)

            if len(_pending_lines_from_note(orders.note)) > 0:
                orders.note = _strip_pending_lines(orders.note)

        db.commit()
        db.refresh(orders)
        if next_status != previous_status:
            notify_order_status_changed(
                db,
                orders,
                previous_status=previous_status,
                customer=customer,
            )
        return orders
    except HTTPException as e:
        print(f"Error updating order: {e.detail}")
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Order update conflict')


@router.get('/{orders_id}', response_model=schemas.Orders)
def read_order_by_id(
    *,
    relation: str = "[]",
    where: str = "[]",
    where_relation: str = "[]",
    base_columns: str = "[]",
    db: Session = Depends(deps.get_db),
    orders_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Get order by ID."""
    relations = []
    if relation is not None and relation != "" and relation != [] and relation != "[]":
        relations += ast.literal_eval(relation)

    wheres = [{'key': 'id', 'value': orders_id, 'operator': '=='}]
    if where is not None and where != "" and where != []:
        wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation is not None and where_relation != "" and where_relation != []:
        where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns is not None and base_columns != "" and base_columns != []:
        bases_columns += ast.literal_eval(base_columns)

    if len(bases_columns) > 0:
        bases_columns = _sanitize_removed_order_columns(bases_columns)
    if len(relations) > 0:
        relations = _sanitize_removed_order_relations(relations)
    if len(where_relations) > 0:
        where_relations = _sanitize_removed_order_where_relations(where_relations)

    orders = crud.orders.get_first_where_array(
        db=db,
        relations=relations,
        where=wheres,
        where_relation=where_relations,
        base_columns=bases_columns,
    )
    if not orders:
        raise HTTPException(status_code=404, detail='Orders not found')
    return orders


@router.delete('/{orders_id}', response_model=schemas.Msg)
def delete_orders(
    *,
    db: Session = Depends(deps.get_db),
    orders_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Delete an order."""
    orders = crud.orders.get(db=db, id=orders_id)
    if not orders:
        raise HTTPException(status_code=404, detail='Orders not found')
    crud.orders.remove(db=db, id=orders_id)
    return schemas.Msg(msg='Orders deleted successfully')
