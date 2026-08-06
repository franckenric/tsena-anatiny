from typing import Any

import ast
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.enum.type import TypeEnum

router = APIRouter()


def _require_user_id(current_user: models.Users) -> int:
    user_id = getattr(current_user, "id", None)
    if user_id is None:
        raise HTTPException(status_code=400, detail="Current user id is missing")
    return int(user_id)


def _create_stock_movement(
    *,
    db: Session,
    product_id: int,
    user_id: int,
    movement_type: TypeEnum,
    quantity: int,
    stock_before: int,
    stock_after: int,
    reference: str,
    lot_id: int | None = None,
    unit_cost: float | None = None,
    another_price: float | None = None,
) -> None:
    another = float(another_price or 0)
    total_cost = (
        float(quantity) * float(unit_cost) + another
        if unit_cost is not None
        else None
    )
    movement_in = schemas.StockMovementsCreate(
        product_id=product_id,
        user_id=user_id,
        lot_id=lot_id,
        type=movement_type,
        quantity=quantity,
        unit_cost=unit_cost,
        another_price=another,
        total_cost=total_cost,
        stock_before=stock_before,
        stock_after=stock_after,
        reference=reference,
    )
    crud.stock_movements.create(db=db, obj_in=movement_in, commit=False, refresh=False)


@router.get("/", response_model=schemas.ResponseStock)
def read_stock(
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
    """Retrieve stock rows."""
    relations = []
    if relation not in (None, "", []):
        relations += ast.literal_eval(relation)

    wheres = []
    if where not in (None, "", []):
        wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation not in (None, "", []):
        where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns not in (None, "", []):
        bases_columns += ast.literal_eval(base_columns)

    stock_rows = crud.stock.get_multi_where_array(
        db=db,
        relations=relations,
        skip=offset,
        limit=limit,
        where=wheres,
        where_relation=where_relations,
        base_columns=bases_columns,
    )
    count = crud.stock.get_count_where_array(db=db, where=wheres)

    return schemas.ResponseStock(
        **{"count": count, "data": jsonable_encoder(stock_rows)}
    )


@router.post("/", response_model=schemas.Stock)
def create_stock(
    *,
    db: Session = Depends(deps.get_db),
    stock_in: schemas.StockCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Create stock row."""
    raise HTTPException(
        status_code=422,
        detail="Use /stock/arrivals with lot_id to create stock entries",
    )

    user_id = _require_user_id(current_user)

    if stock_in.quantity <= 0:
        raise HTTPException(status_code=422, detail="Stock quantity must be greater than 0")

    product = crud.products.get(db=db, id=stock_in.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing_stock = crud.stock.get_by_product_id(db=db, product_id=stock_in.product_id)
    if existing_stock:
        raise HTTPException(
            status_code=409,
            detail="Stock already exists for this product",
        )

    try:
        stock_row = crud.stock.create(db=db, obj_in=stock_in, commit=False, refresh=False)
        _create_stock_movement(
            db=db,
            product_id=stock_in.product_id,
            user_id=user_id,
            movement_type=TypeEnum.in_stoct,
            quantity=stock_in.quantity,
            stock_before=0,
            stock_after=stock_in.quantity,
            reference=f"Stock created for product #{stock_in.product_id}",
        )
        db.commit()
        db.refresh(stock_row)
        return stock_row
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Stock already exists for this product",
        )


@router.post("/arrivals", response_model=schemas.Stock)
def register_stock_arrival(
    *,
    db: Session = Depends(deps.get_db),
    arrival_in: schemas.StockArrival,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Register an arriving lot: increment existing stock or create a new stock row."""
    user_id = _require_user_id(current_user)

    if arrival_in.quantity <= 0:
        raise HTTPException(status_code=422, detail="Arrival quantity must be greater than 0")

    if arrival_in.unit_cost <= 0:
        raise HTTPException(status_code=422, detail="Unit cost must be greater than 0")

    product = crud.products.get(db=db, id=arrival_in.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    lot = crud.lots.get(db=db, id=arrival_in.lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    existing_stock = crud.stock.get_by_product_id(db=db, product_id=arrival_in.product_id)

    try:
        if existing_stock:
            stock_before = existing_stock.quantity or 0
            stock_after = stock_before + arrival_in.quantity
            stock_row = crud.stock.update(
                db=db,
                db_obj=existing_stock,
                obj_in={"quantity": stock_after},
                commit=False,
            )
        else:
            stock_before = 0
            stock_after = arrival_in.quantity
            stock_row = crud.stock.create(
                db=db,
                obj_in=schemas.StockCreate(
                    product_id=arrival_in.product_id,
                    quantity=arrival_in.quantity,
                ),
                commit=False,
                refresh=False,
            )

        lot_reference = arrival_in.reference or lot.reference or f"Lot #{arrival_in.lot_id}"
        movement_reference = f"LOT#{arrival_in.lot_id} - {lot_reference}"

        _create_stock_movement(
            db=db,
            product_id=arrival_in.product_id,
            user_id=user_id,
            movement_type=TypeEnum.in_stoct,
            quantity=arrival_in.quantity,
            stock_before=stock_before,
            stock_after=stock_after,
            reference=movement_reference,
            lot_id=arrival_in.lot_id,
            unit_cost=arrival_in.unit_cost,
            another_price=float(arrival_in.another_price or 0),
        )

        db.commit()
        db.refresh(stock_row)
        return stock_row
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Stock update conflict")


@router.put("/{stock_id}", response_model=schemas.Stock)
def update_stock(
    *,
    db: Session = Depends(deps.get_db),
    stock_id: int,
    stock_in: schemas.StockUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Update stock row."""
    user_id = _require_user_id(current_user)

    stock_row = crud.stock.get(db=db, id=stock_id)
    if not stock_row:
        raise HTTPException(status_code=404, detail="Stock not found")

    if stock_in.product_id is not None:
        product = crud.products.get(db=db, id=stock_in.product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        duplicate = crud.stock.get_by_product_id(db=db, product_id=stock_in.product_id)
        if duplicate and duplicate.id != stock_id:
            raise HTTPException(
                status_code=409,
                detail="Stock already exists for this product",
            )

    old_quantity = stock_row.quantity or 0
    next_quantity = old_quantity
    payload = stock_in.model_dump(exclude_unset=True)
    if "quantity" in payload and payload["quantity"] is not None:
        if payload["quantity"] < 0:
            raise HTTPException(status_code=422, detail="Stock quantity cannot be negative")
        next_quantity = payload["quantity"]

    try:
        updated_row = crud.stock.update(
            db=db,
            db_obj=stock_row,
            obj_in=stock_in,
            commit=False,
        )

        diff = next_quantity - old_quantity
        if diff != 0:
            movement_type = TypeEnum.in_stoct if diff > 0 else TypeEnum.out_stock
            _create_stock_movement(
                db=db,
                product_id=updated_row.product_id,
                user_id=user_id,
                movement_type=movement_type,
                quantity=abs(diff),
                stock_before=old_quantity,
                stock_after=next_quantity,
                reference=f"Stock adjusted for product #{updated_row.product_id}",
            )

        db.commit()
        db.refresh(updated_row)
        return updated_row
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Stock already exists for this product",
        )








@router.get("/{stock_id}", response_model=schemas.Stock)
def read_stock_by_id(
    *,
    relation: str = "[]",
    where: str = "[]",
    where_relation: str = "[]",
    base_columns: str = "[]",
    db: Session = Depends(deps.get_db),
    stock_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Get stock row by ID."""
    relations = []
    if relation not in (None, "", [], "[]"):
        relations += ast.literal_eval(relation)

    wheres = [{"key": "id", "value": stock_id, "operator": "=="}]
    if where not in (None, "", []):
        wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation not in (None, "", []):
        where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns not in (None, "", []):
        bases_columns += ast.literal_eval(base_columns)

    stock_row = crud.stock.get_first_where_array(
        db=db,
        relations=relations,
        where=wheres,
        where_relation=where_relations,
        base_columns=bases_columns,
    )
    if not stock_row:
        raise HTTPException(status_code=404, detail="Stock not found")
    return stock_row


@router.delete("/{stock_id}", response_model=schemas.Msg)
def delete_stock(
    *,
    db: Session = Depends(deps.get_db),
    stock_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Delete stock row."""
    stock_row = crud.stock.get(db=db, id=stock_id)
    if not stock_row:
        raise HTTPException(status_code=404, detail="Stock not found")
    crud.stock.remove(db=db, id=stock_id)
    return schemas.Msg(msg="Stock deleted successfully")
