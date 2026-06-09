from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.schemas.lots import LotCreate, LotUpdate, Lot, ResponseLots

router = APIRouter()


@router.get("/", response_model=ResponseLots)
def read_lots(
    *,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """List all lots, newest first."""
    lots = crud.lots.get_multi_where_array(db=db, skip=offset, limit=limit)
    count = crud.lots.get_count_where_array(db=db, where=[])
    return ResponseLots(count=count, data=jsonable_encoder(lots))


@router.post("/", response_model=Lot)
def create_lot(
    *,
    db: Session = Depends(deps.get_db),
    lot_in: LotCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Create a new lot (purchase batch)."""
    if lot_in.total_expense < 0:
        raise HTTPException(status_code=422, detail="La dépense totale ne peut pas être négative")
    lot = crud.lots.create(db=db, obj_in=lot_in)
    return lot


@router.get("/{lot_id}", response_model=Lot)
def read_lot(
    *,
    lot_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Get a lot by id."""
    lot = crud.lots.get(db=db, id=lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    return lot


@router.put("/{lot_id}", response_model=Lot)
def update_lot(
    *,
    lot_id: int,
    lot_in: LotUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Update a lot."""
    lot = crud.lots.get(db=db, id=lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    if lot_in.total_expense is not None and lot_in.total_expense < 0:
        raise HTTPException(status_code=422, detail="La dépense totale ne peut pas être négative")
    return crud.lots.update(db=db, db_obj=lot, obj_in=lot_in)


@router.delete("/{lot_id}", response_model=schemas.Msg)
def delete_lot(
    *,
    lot_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Delete a lot."""
    lot = crud.lots.get(db=db, id=lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail="Lot introuvable")
    crud.lots.remove(db=db, id=lot_id)
    return schemas.Msg(msg="Lot supprimé")
