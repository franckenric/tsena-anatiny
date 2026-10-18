from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.utils import parse_query_array
from app.crud.crud_promo_codes import InvalidPromoCode

router = APIRouter()


def _apply_free_shipping_zones(
    db: Session,
    promo_code: models.PromoCodes,
    zone_ids: list[int] | None,
) -> None:
    """Fixe les zones couvertes par un code « livraison offerte ».

    `None` = le champ n'a pas ete envoye, on ne touche a rien (mise a jour
    partielle). Une liste vide = le code s'applique a toutes les zones.
    """
    if zone_ids is None:
        return
    zones = []
    if zone_ids:
        zones = (
            db.query(models.DeliveryZones)
            .filter(models.DeliveryZones.id.in_(zone_ids))
            .filter(models.DeliveryZones.deleted_at.is_(None))
            .all()
        )
    promo_code.free_shipping_zones = zones
    db.add(promo_code)
    db.commit()
    db.refresh(promo_code)


def _zone_ids_by_code(promo_codes: list) -> dict[int, list[int]]:
    """Mappe `promo_code.id` -> ids des zones couvertes par le code.

    `free_shipping_zone_ids` est une property du modele : `jsonable_encoder`
    ne lit que l'`__dict__` de l'instance, d'ou un `null` systematique dans
    la liste des codes. La relation est chargée en `selectin`, pas de N+1 ici.
    """
    return {
        code.id: code.free_shipping_zone_ids
        for code in promo_codes
        if code is not None and code.id is not None
    }


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
    relations = parse_query_array(relation, default=[]) or []

    wheres = parse_query_array(where, default=[]) or []

    where_relations = parse_query_array(where_relation, default=[]) or []

    bases_columns = parse_query_array(base_columns, default=[]) or []

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
    data = jsonable_encoder(promo_codes)
    zone_ids_by_code = _zone_ids_by_code(promo_codes)
    for item in data:
        if isinstance(item, dict) and item.get("id") in zone_ids_by_code:
            item["free_shipping_zone_ids"] = zone_ids_by_code[item["id"]]
    return schemas.ResponsePromoCodes(count=count, data=data)


@router.post("/", response_model=schemas.PromoCodes)
def create_promo_code(
    *,
    db: Session = Depends(deps.get_db),
    promo_code_in: schemas.PromoCodesCreate,
    current_user: models.Users = Depends(deps.get_current_active_superuser),
) -> Any:
    """Create new promo code."""
    existing = crud.promo_codes.get_by_code(db=db, code=promo_code_in.code)
    if existing:
        raise HTTPException(status_code=409, detail="Promo code already exists")
    promo_code = crud.promo_codes.create(db=db, obj_in=promo_code_in)
    _apply_free_shipping_zones(db, promo_code, promo_code_in.free_shipping_zone_ids)
    return promo_code


@router.put("/{promo_code_id}", response_model=schemas.PromoCodes)
def update_promo_code(
    *,
    db: Session = Depends(deps.get_db),
    promo_code_id: int,
    promo_code_in: schemas.PromoCodesUpdate,
    current_user: models.Users = Depends(deps.get_current_active_superuser),
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
    promo_code = crud.promo_codes.update(
        db=db, db_obj=promo_code, obj_in=promo_code_in
    )
    _apply_free_shipping_zones(db, promo_code, promo_code_in.free_shipping_zone_ids)
    return promo_code


@router.delete("/{promo_code_id}", response_model=schemas.Msg)
def delete_promo_code(
    *,
    db: Session = Depends(deps.get_db),
    promo_code_id: int,
    current_user: models.Users = Depends(deps.get_current_active_superuser),
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
    _throttle: None = Depends(deps.rate_limit(limit=20, window_s=60)),
) -> Any:
    """Validate a promo code against an optional order subtotal. Endpoint public.

    Un invite doit pouvoir tester un code avant de commander. La lecture seule
    ne modifie rien, mais elle est facile a sonder : d'ou un plafond, plus large
    que sur le checkout car un panier teste plusieurs codes en boucle.

    Ce resultat n'engage rien : la remise reelle est recalculee par
    `_build_promo_discount` au moment de la commande.
    """
    try:
        result = crud.promo_codes.validate_for_subtotal(
            db=db,
            code=request.code,
            subtotal=request.subtotal,
            delivery_zone_id=request.delivery_zone_id,
        )
    except InvalidPromoCode as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    promo_code = result.promo_code
    return schemas.PromoCodeValidateResponse(
        valid=True,
        code=promo_code.code,
        discount_type=promo_code.discount_type,
        discount_value=float(promo_code.discount_value or 0),
        discount_amount=result.discount_amount,
        free_shipping=result.free_shipping,
        description=promo_code.description,
    )
