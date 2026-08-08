from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
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


def _create_movement(
    *,
    db: Session,
    product_id: int,
    variant_id: int,
    user_id: int,
    movement_type: TypeEnum,
    quantity: int,
    stock_before: int,
    stock_after: int,
    reference: str,
) -> None:
    movement_in = schemas.StockMovementsCreate(
        product_id=product_id,
        user_id=user_id,
        variant_id=variant_id,
        type=movement_type,
        quantity=quantity,
        stock_before=stock_before,
        stock_after=stock_after,
        reference=reference,
    )
    crud.stock_movements.create(db=db, obj_in=movement_in, commit=False, refresh=False)


def _build_tree(nodes: List[models.ProductVariants], parent_id: int | None = None) -> List[dict]:
    result = []
    for node in nodes:
        if node.parent_id == parent_id:
            result.append(
                {
                    "id": node.id,
                    "product_id": node.product_id,
                    "parent_id": node.parent_id,
                    "name": node.name,
                    "sku": node.sku,
                    "quantity": node.quantity or 0,
                    "unit_cost": node.unit_cost,
                    "selling_price": node.selling_price,
                    "image": node.image,
                    "children": _build_tree(nodes, node.id),
                }
            )
    return result


def _descendant_ids(db: Session, node_id: int) -> set:
    result = set()
    stack = [node_id]
    while stack:
        nid = stack.pop()
        children = db.query(models.ProductVariants.id).filter(
            models.ProductVariants.parent_id == nid
        ).all()
        for (cid,) in children:
            if cid not in result:
                result.add(cid)
                stack.append(cid)
    return result


def _get_variant(db: Session, *, product_id: int, variant_id: int) -> models.ProductVariants:
    variant = crud.product_variants.get(db=db, id=variant_id)
    if not variant or variant.product_id != product_id:
        raise HTTPException(status_code=404, detail="Variante introuvable")
    return variant


@router.get("/products/{product_id}/variants", response_model=List[schemas.ProductVariantNode])
def read_variants(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Arborescence des variantes d'un produit."""
    product = crud.products.get(db=db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    nodes = crud.product_variants.get_multi_by_product(db=db, product_id=product_id)
    return _build_tree(nodes)


@router.post("/products/{product_id}/variants", response_model=schemas.ProductVariant)
def create_variant(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    variant_in: schemas.ProductVariantCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Créer une variante (ou sous-variante) d'un produit."""
    user_id = _require_user_id(current_user)

    product = crud.products.get(db=db, id=product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    parent_id = variant_in.parent_id
    if parent_id is not None:
        parent = crud.product_variants.get(db=db, id=parent_id)
        if not parent or parent.product_id != product_id:
            raise HTTPException(
                status_code=422,
                detail="Le parent doit appartenir au même produit",
            )

    name = (variant_in.name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="Nom de variante requis")

    existing = crud.product_variants.get_by_name(
        db=db, product_id=product_id, parent_id=parent_id, name=name
    )
    if existing:
        raise HTTPException(status_code=409, detail="Cette variante existe déjà")

    quantity = int(variant_in.quantity or 0)
    if quantity < 0:
        raise HTTPException(status_code=422, detail="La quantité ne peut pas être négative")

    variant = crud.product_variants.create(
        db=db,
        obj_in=schemas.ProductVariantCreate(
            product_id=product_id,
            parent_id=parent_id,
            name=name,
            sku=(variant_in.sku or "").strip() or None,
            quantity=quantity,
            unit_cost=variant_in.unit_cost,
            selling_price=variant_in.selling_price,
            image=variant_in.image,
        ),
        commit=False,
        refresh=False,
    )
    db.flush()

    if quantity > 0:
        _create_movement(
            db=db,
            product_id=product_id,
            variant_id=variant.id,
            user_id=user_id,
            movement_type=TypeEnum.in_stoct,
            quantity=quantity,
            stock_before=0,
            stock_after=quantity,
            reference=f"Variante créée - {name}",
        )

    db.commit()
    db.refresh(variant)
    return variant


@router.put("/products/{product_id}/variants/{variant_id}", response_model=schemas.ProductVariant)
def update_variant(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    variant_id: int,
    variant_in: schemas.ProductVariantUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Modifier une variante (nom, sku, quantité, parent)."""
    user_id = _require_user_id(current_user)
    variant = _get_variant(db=db, product_id=product_id, variant_id=variant_id)
    old_quantity = variant.quantity or 0

    payload = variant_in.model_dump(exclude_unset=True)

    if "name" in payload and payload["name"]:
        new_name = payload["name"].strip()
        existing = crud.product_variants.get_by_name(
            db=db, product_id=product_id, parent_id=variant.parent_id, name=new_name
        )
        if existing and existing.id != variant_id:
            raise HTTPException(status_code=409, detail="Cette variante existe déjà")
        payload["name"] = new_name

    if "parent_id" in payload:
        new_parent = payload["parent_id"]
        if new_parent is not None:
            if new_parent == variant_id:
                raise HTTPException(status_code=422, detail="Parent invalide (cycle)")
            parent = crud.product_variants.get(db=db, id=new_parent)
            if not parent or parent.product_id != product_id:
                raise HTTPException(
                    status_code=422,
                    detail="Le parent doit appartenir au même produit",
                )
            if new_parent in _descendant_ids(db, variant_id):
                raise HTTPException(status_code=422, detail="Parent invalide (cycle)")
        else:
            payload["parent_id"] = None

    new_quantity = payload.get("quantity", old_quantity)
    if new_quantity is not None and new_quantity < 0:
        raise HTTPException(status_code=422, detail="La quantité ne peut pas être négative")

    if "quantity" in payload and payload["quantity"] is None:
        payload.pop("quantity")
    if "sku" in payload and payload["sku"] is not None:
        payload["sku"] = payload["sku"].strip() or None

    updated = crud.product_variants.update(db=db, db_obj=variant, obj_in=payload, commit=False)

    next_quantity = int(updated.quantity or 0)
    diff = next_quantity - old_quantity
    if diff != 0:
        movement_type = TypeEnum.in_stoct if diff > 0 else TypeEnum.out_stock
        _create_movement(
            db=db,
            product_id=product_id,
            variant_id=variant_id,
            user_id=user_id,
            movement_type=movement_type,
            quantity=abs(diff),
            stock_before=old_quantity,
            stock_after=next_quantity,
            reference=f"Ajustement variante - {updated.name}",
        )

    db.commit()
    db.refresh(updated)
    return updated


@router.delete("/products/{product_id}/variants/{variant_id}", response_model=schemas.Msg)
def delete_variant(
    *,
    db: Session = Depends(deps.get_db),
    product_id: int,
    variant_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Supprimer une variante (sans enfants)."""
    variant = _get_variant(db=db, product_id=product_id, variant_id=variant_id)
    if crud.product_variants.has_children(db=db, variant_id=variant_id):
        raise HTTPException(
            status_code=409,
            detail="Supprimez d'abord les sous-variantes",
        )
    crud.product_variants.remove(db=db, id=variant_id)
    return schemas.Msg(msg="Variante supprimée")
