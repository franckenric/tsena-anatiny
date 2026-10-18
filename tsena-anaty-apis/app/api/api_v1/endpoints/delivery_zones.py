from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get("/options", response_model=list[schemas.DeliveryZoneOption])
def read_delivery_zone_options(
    *,
    db: Session = Depends(deps.get_db),
) -> Any:
    """Zones de livraison proposees au client. Endpoint public.

    Seules les zones actives sont exposees, avec uniquement l'essentiel :
    le checkout en a besoin avant toute authentification (le visiteur
    sans compte doit pouvoir voir le tarif de livraison).
    """
    return crud.delivery_zones.get_active_zones(db=db)


@router.get("/", response_model=schemas.ResponseDeliveryZones)
def read_delivery_zones(
    *,
    offset: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    _current_user: models.Users = Depends(deps.get_current_active_superuser),
) -> Any:
    """Retrieve delivery zones (back-office)."""
    zones = crud.delivery_zones.get_multi_where_array(
        db=db,
        skip=offset,
        limit=limit,
        order_by="position",
        order="ASC",
    )
    count = crud.delivery_zones.get_count_where_array(db=db)
    return schemas.ResponseDeliveryZones(count=count, data=jsonable_encoder(zones))


@router.post("/", response_model=schemas.DeliveryZones)
def create_delivery_zone(
    *,
    db: Session = Depends(deps.get_db),
    delivery_zone_in: schemas.DeliveryZonesCreate,
    _current_user: models.Users = Depends(deps.get_current_active_superuser),
) -> Any:
    """Create new delivery zone."""
    existing = (
        db.query(models.DeliveryZones)
        .filter(models.DeliveryZones.name == delivery_zone_in.name)
        .filter(models.DeliveryZones.deleted_at.is_(None))
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Delivery zone already exists")
    return crud.delivery_zones.create(db=db, obj_in=delivery_zone_in)


@router.put("/{delivery_zone_id}", response_model=schemas.DeliveryZones)
def update_delivery_zone(
    *,
    db: Session = Depends(deps.get_db),
    delivery_zone_id: int,
    delivery_zone_in: schemas.DeliveryZonesUpdate,
    _current_user: models.Users = Depends(deps.get_current_active_superuser),
) -> Any:
    """Update a delivery zone."""
    delivery_zone = crud.delivery_zones.get(db=db, id=delivery_zone_id)
    if not delivery_zone:
        raise HTTPException(status_code=404, detail="Delivery zone not found")
    if delivery_zone_in.name is not None:
        existing = (
            db.query(models.DeliveryZones)
            .filter(models.DeliveryZones.name == delivery_zone_in.name)
            .filter(models.DeliveryZones.deleted_at.is_(None))
            .first()
        )
        if existing and existing.id != delivery_zone.id:
            raise HTTPException(status_code=409, detail="Delivery zone already exists")
    return crud.delivery_zones.update(
        db=db, db_obj=delivery_zone, obj_in=delivery_zone_in
    )


@router.delete("/{delivery_zone_id}", response_model=schemas.Msg)
def delete_delivery_zone(
    *,
    db: Session = Depends(deps.get_db),
    delivery_zone_id: int,
    _current_user: models.Users = Depends(deps.get_current_active_superuser),
) -> Any:
    """Delete a delivery zone.

    Suppression logique : les commandes passées referencent la zone, un
    effacement physique laisserait l'historique (et les factures) sans
    tarif lisible.
    """
    delivery_zone = crud.delivery_zones.get(db=db, id=delivery_zone_id)
    if not delivery_zone:
        raise HTTPException(status_code=404, detail="Delivery zone not found")
    crud.delivery_zones.update(
        db=db,
        db_obj=delivery_zone,
        obj_in={"deleted_at": datetime.utcnow(), "is_active": False},
    )
    return schemas.Msg(msg="Delivery zone deleted successfully")
