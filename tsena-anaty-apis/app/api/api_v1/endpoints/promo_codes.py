from typing import Any
import ast

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.crud.crud_promo_codes import InvalidPromoCode

router = APIRouter()


@router.get("/", response_model=schemas.ResponsePromoCodes)
def read_promo_codes(
    *,
    offset: int = 0,
    limit: int = 100,
    relation: str = "[]",
    where: str = "[]",
    where_relation: str = "[]",
    base_columns: str = "[]",
    db: Session = Depends(deps.get_db),
) -> Any:
    """Retrieve promo codes."""
    relations = []
    if relation not in (None, "", [], "[]"):
        relations += ast.literal_eval(relation)

    wheres = []
    if where not in (None, "", [], "[]"):
        wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation not in (None, "", [], "[]"):
        where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns not in (None, "", [], "[]"):
        bases_columns += ast.literal_eval(base_columns)

    promo_codes = crud.promo_codes.get_multi_where_array(
        db=db,
        relations=relations,
        skip=offset,
        limit=limit,
        where=wheres,
        where_relation=where_relations,
        base_columns=bases_columns,
    )
    count = crud.promo_codes.get_count_where_array(db=db, where=wheres)
    return schemas.ResponsePromoCodes(count=count, data=jsonable_encoder(promo_codes))


@router.post("/", response_model=schemas.PromoCodes)
def create_promo_code(
    *,
    db: Session = Depends(deps.get_db),
    promo_code_in: schemas.PromoCodesCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Create new promo code."""
    existing = crud.promo_codes.get_by_code(db=db, code=promo_code_in.code)
    if existing:
        raise HTTPException(status_code=409, detail="Promo code already exists")
    return crud.promo_codes.create(db=db, obj_in=promo_code_in)


@router.put("/{promo_code_id}", response_model=schemas.PromoCodes)
def update_promo_code(
    *,
    db: Session = Depends(deps.get_db),
    promo_code_id: int,
    promo_code_in: schemas.PromoCodesUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Update a promo code."""
    promo_code = crud.promo_codes.get(db=db, id=promo_code_id)
    if not promo_code:
        raise HTTPException(status_code=404, detail="Promo code not found")
    if promo_code_in.code is not None:
        normalized = promo_code_in.code.strip().upper()
        existing = crud.promo_codes.get_by_code(db=db, code=normalized)
        if existing and existing.id != promo_code.id:
            raise HTTPException(status_code=409, detail="Promo code already exists")
    return crud.promo_codes.update(db=db, db_obj=promo_code, obj_in=promo_code_in)


@router.delete("/{promo_code_id}", response_model=schemas.Msg)
def delete_promo_code(
    *,
    db: Session = Depends(deps.get_db),
    promo_code_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Delete a promo code."""
    promo_code = crud.promo_codes.get(db=db, id=promo_code_id)
    if not promo_code:
        raise HTTPException(status_code=404, detail="Promo code not found")
    crud.promo_codes.remove(db=db, id=promo_code_id)
    return schemas.Msg(msg="Promo code deleted successfully")


@router.post("/validate", response_model=schemas.PromoCodeValidateResponse)
def validate_promo_code(
    *,
    db: Session = Depends(deps.get_db),
    request: schemas.PromoCodeValidateRequest,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Validate a promo code against an optional order subtotal."""
    try:
        promo_code, discount_amount = crud.promo_codes.validate_for_subtotal(
            db=db,
            code=request.code,
            subtotal=request.subtotal,
        )
    except InvalidPromoCode as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return schemas.PromoCodeValidateResponse(
        valid=True,
        code=promo_code.code,
        discount_type=promo_code.discount_type,
        discount_value=float(promo_code.discount_value or 0),
        discount_amount=discount_amount,
        description=promo_code.description,
    )
