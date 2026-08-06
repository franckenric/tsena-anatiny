from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.api import deps
from app import crud, models, schemas
from app.enum.type import TypeEnum
import ast

router = APIRouter()


@router.get('/', response_model=schemas.ResponseStockMovements)
def read_stock_movements(
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
    """
    Retrieve stock_movements.
    """
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

    stock_movements = crud.stock_movements.get_multi_where_array(
      db=db, relations=relations, skip=offset, limit=limit, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    count = crud.stock_movements.get_count_where_array(db=db, where=wheres)
    response = schemas.ResponseStockMovements(**{'count': count, 'data': jsonable_encoder(stock_movements)})
    return response


@router.post('/', response_model=schemas.StockMovements)
def create_stock_movements(
        *,
        db: Session = Depends(deps.get_db),
        stock_movements_in: schemas.StockMovementsCreate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new stock_movements and update product stock accordingly.
    """
    product = crud.products.get(db=db, id=stock_movements_in.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if stock_movements_in.quantity <= 0:
        raise HTTPException(status_code=422, detail="Quantity must be greater than 0")

    existing_stock = crud.stock.get_by_product_id(db=db, product_id=stock_movements_in.product_id)
    stock_before = existing_stock.quantity if existing_stock else 0

    if stock_movements_in.type == TypeEnum.in_stoct:
        stock_after = stock_before + stock_movements_in.quantity
    else:
        if stock_movements_in.commande_id is None:
            raise HTTPException(
                status_code=422,
                detail="commande_id is required for out_stock movement",
            )
        order = crud.orders.get(db=db, id=stock_movements_in.commande_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if not existing_stock:
            raise HTTPException(status_code=409, detail="No stock found for this product")
        if stock_before < stock_movements_in.quantity:
            raise HTTPException(status_code=409, detail="Insufficient stock for out movement")
        stock_after = stock_before - stock_movements_in.quantity

    movement_unit_cost = stock_movements_in.unit_cost
    movement_another_price = float(stock_movements_in.another_price or 0)
    movement_other_price_reason = (stock_movements_in.other_price_reason or "").strip()
    if stock_movements_in.type == TypeEnum.in_stoct and (movement_unit_cost is None or movement_unit_cost <= 0):
        raise HTTPException(
            status_code=422,
            detail="Unit cost must be greater than 0 for lot arrivals",
        )
    if (
        stock_movements_in.type == TypeEnum.in_stoct
        and movement_another_price > 0
        and not movement_other_price_reason
    ):
        raise HTTPException(
            status_code=422,
            detail="other_price_reason is required when another_price is greater than 0",
        )

    if stock_movements_in.type == TypeEnum.in_stoct and stock_movements_in.lot_id is not None:
        lot = crud.lots.get(db=db, id=stock_movements_in.lot_id)
        if not lot:
            raise HTTPException(status_code=404, detail="Lot introuvable")

    # Patch stock_before / stock_after into the payload
    create_data = stock_movements_in.model_dump()
    create_data["unit_cost"] = movement_unit_cost
    create_data["another_price"] = movement_another_price
    create_data["other_price_reason"] = (
        movement_other_price_reason or None
        if stock_movements_in.type == TypeEnum.in_stoct and movement_another_price > 0
        else None
    )
    create_data["total_cost"] = (
        float(stock_movements_in.quantity) * float(movement_unit_cost)
        + movement_another_price
        if movement_unit_cost is not None and movement_unit_cost > 0
        else None
    )
    create_data["stock_before"] = stock_before
    create_data["stock_after"] = stock_after

    # Update or create the stock row
    if existing_stock:
        crud.stock.update(
            db=db,
            db_obj=existing_stock,
            obj_in={"quantity": stock_after},
            commit=False,
        )
    else:
        crud.stock.create(
            db=db,
            obj_in=schemas.StockCreate(
                product_id=stock_movements_in.product_id,
                quantity=stock_after,
            ),
            commit=False,
            refresh=False,
        )

    movement = crud.stock_movements.create(
        db=db,
        obj_in=schemas.StockMovementsCreate(**create_data),
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(movement)
    return movement


@router.put('/{stock_movements_id}', response_model=schemas.StockMovements)
def update_stock_movements(
        *,
        db: Session = Depends(deps.get_db),
   stock_movements_id: int,
        stock_movements_in: schemas.StockMovementsUpdate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update stock movement and keep stock quantities consistent.
    """
    movement = crud.stock_movements.get(db=db, id=stock_movements_id)
    if not movement:
        raise HTTPException(status_code=404, detail='StockMovements not found')

    old_product_id = int(movement.product_id)
    old_type = movement.type
    old_qty = int(movement.quantity or 0)
    old_effect = old_qty if old_type == TypeEnum.in_stoct else -old_qty

    new_product_id = int(stock_movements_in.product_id or old_product_id)
    new_type = stock_movements_in.type or old_type
    new_qty = int(stock_movements_in.quantity or old_qty)
    if new_qty <= 0:
        raise HTTPException(status_code=422, detail='Quantity must be greater than 0')

    new_effect = new_qty if new_type == TypeEnum.in_stoct else -new_qty
    new_lot_id = stock_movements_in.lot_id
    if stock_movements_in.lot_id is None:
        new_lot_id = movement.lot_id
    if new_type != TypeEnum.in_stoct:
        new_lot_id = None

    current_unit_cost = movement.unit_cost
    current_another_price = float(movement.another_price or 0)
    new_unit_cost = stock_movements_in.unit_cost
    new_another_price = stock_movements_in.another_price
    new_other_price_reason = stock_movements_in.other_price_reason
    if new_unit_cost is None:
        new_unit_cost = current_unit_cost
    if new_another_price is None:
        new_another_price = current_another_price
    new_another_price = float(new_another_price or 0)
    if new_other_price_reason is None:
        new_other_price_reason = movement.other_price_reason
    new_other_price_reason = (new_other_price_reason or '').strip()

    if new_type == TypeEnum.in_stoct:
        if not new_lot_id:
            raise HTTPException(status_code=422, detail='Lot requis pour une entree')
        if new_unit_cost is None or new_unit_cost <= 0:
            raise HTTPException(status_code=422, detail='Unit cost must be greater than 0 for lot arrivals')
        if new_another_price > 0 and not new_other_price_reason:
            raise HTTPException(
                status_code=422,
                detail='other_price_reason is required when another_price is greater than 0',
            )

        lot = crud.lots.get(db=db, id=new_lot_id)
        if not lot:
            raise HTTPException(status_code=404, detail='Lot introuvable')

    old_stock = crud.stock.get_by_product_id(db=db, product_id=old_product_id)
    old_current_qty = int(old_stock.quantity or 0) if old_stock else 0

    if new_product_id == old_product_id:
        base_qty_before_new = old_current_qty - old_effect
        if base_qty_before_new < 0:
            raise HTTPException(status_code=409, detail='Stock inconsistant pour corriger le mouvement existant')
        final_qty = base_qty_before_new + new_effect
        if final_qty < 0:
            raise HTTPException(status_code=422, detail='Stock insuffisant pour cette mise a jour de mouvement')

        if old_stock:
            crud.stock.update(
                db=db,
                db_obj=old_stock,
                obj_in={'quantity': final_qty},
                commit=False,
            )
        else:
            crud.stock.create(
                db=db,
                obj_in=schemas.StockCreate(product_id=old_product_id, quantity=final_qty),
                commit=False,
                refresh=False,
            )

        stock_before = base_qty_before_new
        stock_after = final_qty
    else:
        base_old_qty = old_current_qty - old_effect
        if base_old_qty < 0:
            raise HTTPException(status_code=409, detail='Stock source inconsistant pour corriger le mouvement')

        if old_stock:
            crud.stock.update(
                db=db,
                db_obj=old_stock,
                obj_in={'quantity': base_old_qty},
                commit=False,
            )

        new_stock = crud.stock.get_by_product_id(db=db, product_id=new_product_id)
        new_current_qty = int(new_stock.quantity or 0) if new_stock else 0
        final_new_qty = new_current_qty + new_effect
        if final_new_qty < 0:
            raise HTTPException(status_code=422, detail='Stock insuffisant pour le produit cible')

        if new_stock:
            crud.stock.update(
                db=db,
                db_obj=new_stock,
                obj_in={'quantity': final_new_qty},
                commit=False,
            )
        else:
            crud.stock.create(
                db=db,
                obj_in=schemas.StockCreate(product_id=new_product_id, quantity=final_new_qty),
                commit=False,
                refresh=False,
            )

        stock_before = new_current_qty
        stock_after = final_new_qty

    update_data = stock_movements_in.model_dump(exclude_unset=True)
    update_data['product_id'] = new_product_id
    update_data['type'] = new_type
    update_data['quantity'] = new_qty
    update_data['lot_id'] = new_lot_id
    update_data['stock_before'] = stock_before
    update_data['stock_after'] = stock_after
    update_data['unit_cost'] = new_unit_cost if new_type == TypeEnum.in_stoct else None
    update_data['another_price'] = new_another_price if new_type == TypeEnum.in_stoct else 0
    update_data['other_price_reason'] = (
        new_other_price_reason or None
        if new_type == TypeEnum.in_stoct and new_another_price > 0
        else None
    )
    update_data['total_cost'] = (
        float(new_qty) * float(new_unit_cost) + float(new_another_price)
        if new_type == TypeEnum.in_stoct and new_unit_cost is not None and new_unit_cost > 0
        else None
    )

    movement = crud.stock_movements.update(
        db=db,
        db_obj=movement,
        obj_in=update_data,
        commit=False,
    )
    db.commit()
    db.refresh(movement)
    return movement


@router.get('/{stock_movements_id}', response_model=schemas.StockMovements)
def read_stock_movements(
        *,
        relation: str = "[]",
        where: str = "[]",
        where_relation: str = "[]",
        base_columns: str = "[]",
        db: Session = Depends(deps.get_db),
      stock_movements_id: int,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get stock_movements by ID.
    """
    relations = []
    if relation is not None and relation != "" and relation != [] and relation != "[]":
       relations += ast.literal_eval(relation)

    wheres = [{'key': 'id', 'value': stock_movements_id, 'operator': '=='}]
    if where is not None and where != "" and where != []:
       wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation is not None and where_relation != "" and where_relation != []:
       where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns is not None and base_columns != "" and base_columns != []:
       bases_columns += ast.literal_eval(base_columns)


    stock_movements = crud.stock_movements.get_first_where_array(db=db, relations=relations, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    if not stock_movements:
        raise HTTPException(status_code=404, detail='StockMovements not found')
    return stock_movements


@router.delete('/{stock_movements_id}', response_model=schemas.Msg)
def delete_stock_movements(
        *,
        db: Session = Depends(deps.get_db),
   stock_movements_id: int,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an stock_movements.
    """
    stock_movements = crud.stock_movements.get(db=db, id=stock_movements_id)
    if not stock_movements:
        raise HTTPException(status_code=404, detail='StockMovements not found')
    stock_movements = crud.stock_movements.remove(db=db, id=stock_movements_id)
    return schemas.Msg(msg='StockMovements deleted successfully')
