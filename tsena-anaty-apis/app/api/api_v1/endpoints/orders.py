from typing import Any
import ast

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.enum.product_status import ProductStatusEnum
from app.enum.type import TypeEnum

router = APIRouter()


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
    orders_in: schemas.OrdersCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Create new orders."""
    orders = crud.orders.create(db=db, obj_in=orders_in)
    return orders


@router.put('/{orders_id}', response_model=schemas.Orders)
def update_orders(
    *,
    db: Session = Depends(deps.get_db),
    orders_id: int,
    orders_in: schemas.OrdersUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Update an order. Confirming an order consumes stock and logs out movement."""
    orders = crud.orders.get(db=db, id=orders_id)
    if not orders:
        raise HTTPException(status_code=404, detail='Orders not found')

    previous_status = orders.status
    next_status = orders_in.status if orders_in.status is not None else previous_status

    if (
        next_status == ProductStatusEnum.confirmed
        and previous_status != ProductStatusEnum.confirmed
    ):
        product_id = (
            orders_in.product_id
            if orders_in.product_id is not None
            else orders.product_id
        )
        quantity = orders_in.quantity if orders_in.quantity is not None else orders.quantity
        quantity = quantity or 1

        if quantity <= 0:
            raise HTTPException(status_code=422, detail='Order quantity must be greater than 0')

        product = crud.products.get(db=db, id=product_id)
        if not product:
            raise HTTPException(status_code=404, detail='Product not found')

        stock_row = crud.stock.get_by_product_id(db=db, product_id=product_id)
        if not stock_row:
            raise HTTPException(status_code=409, detail='No stock found for this product')

        stock_before = stock_row.quantity or 0
        if stock_before < quantity:
            raise HTTPException(status_code=409, detail='Insufficient stock for order confirmation')

        stock_after = stock_before - quantity
        movement_user_id = orders.user_id or getattr(current_user, 'id', None)
        if movement_user_id is None:
            raise HTTPException(status_code=400, detail='User id is required for stock movement')

        try:
            consumed_lots = crud.stock_lots.consume_fifo(
                db=db,
                product_id=product_id,
                quantity=quantity,
            )
        except ValueError:
            raise HTTPException(status_code=409, detail='Insufficient lot quantity for order confirmation')

        lot_reference = ", ".join(
            [f"L{entry['lot_id']}:{entry['taken']}" for entry in consumed_lots]
        )

        orders = crud.orders.update(
            db=db,
            db_obj=orders,
            obj_in=orders_in,
            commit=False,
        )
        crud.stock.update(
            db=db,
            db_obj=stock_row,
            obj_in={'quantity': stock_after},
            commit=False,
        )
        crud.stock_movements.create(
            db=db,
            obj_in=schemas.StockMovementsCreate(
                product_id=product_id,
                user_id=int(movement_user_id),
                type=TypeEnum.out_stock,
                quantity=quantity,
                stock_before=stock_before,
                stock_after=stock_after,
                reference=(orders.order_number or f'Order #{orders.id} confirmed') + f' | lots: {lot_reference}',
            ),
            commit=False,
            refresh=False,
        )
        db.commit()
        db.refresh(orders)
        return orders

    orders = crud.orders.update(db=db, db_obj=orders, obj_in=orders_in)
    return orders


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
