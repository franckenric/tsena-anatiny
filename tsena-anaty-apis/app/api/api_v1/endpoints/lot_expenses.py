from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.utils import parse_query_array

router = APIRouter()


def _sync_lot_total_expense(*, db: Session, lot_id: int) -> None:
    expenses = crud.lot_expenses.get_multi_where_array(
        db=db,
        where=[{"key": "lot_id", "operator": "==", "value": lot_id}],
        limit=10000,
    )
    total = sum(float(e.amount or 0) for e in expenses)
    lot = crud.lots.get(db=db, id=lot_id)
    if lot:
        crud.lots.update(
            db=db,
            db_obj=lot,
            obj_in={"total_expense": total},
            commit=False,
        )


@router.get("/", response_model=schemas.ResponseLotExpenses)
def read_lot_expenses(
    *,
    offset: int = 0,
    limit: int = 100,
    where: str = "[]",
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    wheres = parse_query_array(where, default=[]) or []

    expenses = crud.lot_expenses.get_multi_where_array(
        db=db,
        skip=offset,
        limit=limit,
        where=wheres,
    )
    count = crud.lot_expenses.get_count_where_array(db=db, where=wheres)
    return schemas.ResponseLotExpenses(count=count, data=jsonable_encoder(expenses))


@router.post("/", response_model=schemas.LotExpense)
def create_lot_expense(
    *,
    db: Session = Depends(deps.get_db),
    lot_expense_in: schemas.LotExpenseCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    if lot_expense_in.amount is None or lot_expense_in.amount < 0:
        raise HTTPException(status_code=422, detail="Le montant doit etre >= 0")

    lot = crud.lots.get(db=db, id=lot_expense_in.lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    expense = crud.lot_expenses.create(
        db=db,
        obj_in=lot_expense_in,
        commit=False,
        refresh=False,
    )
    _sync_lot_total_expense(db=db, lot_id=lot_expense_in.lot_id)
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/{lot_expense_id}", response_model=schemas.LotExpense)
def update_lot_expense(
    *,
    lot_expense_id: int,
    lot_expense_in: schemas.LotExpenseUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    expense = crud.lot_expenses.get(db=db, id=lot_expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Depense introuvable")

    old_lot_id = int(expense.lot_id)
    target_lot_id = int(lot_expense_in.lot_id or expense.lot_id)
    lot = crud.lots.get(db=db, id=target_lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")

    if lot_expense_in.amount is not None and lot_expense_in.amount < 0:
        raise HTTPException(status_code=422, detail="Le montant doit etre >= 0")

    updated = crud.lot_expenses.update(
        db=db,
        db_obj=expense,
        obj_in=lot_expense_in,
        commit=False,
    )

    _sync_lot_total_expense(db=db, lot_id=target_lot_id)
    if target_lot_id != old_lot_id:
        _sync_lot_total_expense(db=db, lot_id=old_lot_id)

    db.commit()
    db.refresh(updated)
    return updated


@router.delete("/{lot_expense_id}", response_model=schemas.Msg)
def delete_lot_expense(
    *,
    lot_expense_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    expense = crud.lot_expenses.get(db=db, id=lot_expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Depense introuvable")

    lot_id = int(expense.lot_id)
    crud.lot_expenses.remove(db=db, id=lot_expense_id, commit=False)
    _sync_lot_total_expense(db=db, lot_id=lot_id)
    db.commit()
    return schemas.Msg(msg="Depense supprimee")
