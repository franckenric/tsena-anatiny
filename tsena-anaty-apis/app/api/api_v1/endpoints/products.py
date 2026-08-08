from typing import Any, List
from pathlib import Path
from uuid import uuid4
import re
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.api import deps
from app import crud, models, schemas
from app.receipt_parser import parse_receipt_pdf, _split_attributes
from app.enum.type import TypeEnum
from app.enum.status import StatusEnum
import ast

router = APIRouter()
from app.api import deps


@router.post('/extract-receipt')
async def extract_receipt(
      *,
      db: Session = Depends(deps.get_db),
      current_user: models.Users = Depends(deps.get_current_active_user),
      file: UploadFile = File(...),
) -> Any:
    """Upload a receipt PDF and return extracted product data (name, qty, unit price, fees)."""
    filename = (file.filename or '').lower()
    if not filename.endswith('.pdf') or not (file.content_type in {'application/pdf', 'application/octet-stream'}):
        raise HTTPException(status_code=400, detail='Veuillez fournir un fichier PDF valide')

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail='PDF trop volumineux (max 10MB)')

    try:
        data = parse_receipt_pdf(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    receipt_number = (data.get('receipt_number') or '').strip()
    data['already_imported'] = False
    if receipt_number:
        existing = crud.receipts.get_by_receipt_number(db=db, receipt_number=receipt_number)
        data['already_imported'] = existing is not None

    return data


@router.post('/import-receipt', response_model=List[schemas.Products])
def import_receipt(
      *,
      db: Session = Depends(deps.get_db),
      import_in: schemas.ReceiptImportRequest,
      current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Import all products from a receipt in one transaction, with their stock entry.

    Les lignes qui partagent le même nom de base sont regroupées en un seul
    produit. Si `variant_levels` est fourni, les attributs correspondants
    (ex: "compatible model", "color") construisent l'arborescence de
    variantes, chaque combinaison possédant son propre stock.
    Le reçu est enregistré afin d'empêcher toute double importation.
    """
    receipt_number = (import_in.receipt_number or '').strip()
    if receipt_number:
        existing = crud.receipts.get_by_receipt_number(db=db, receipt_number=receipt_number)
        if existing:
            raise HTTPException(
                status_code=409,
                detail='Ce reçu a déjà été importé',
            )

    if not import_in.items:
        raise HTTPException(status_code=422, detail='Aucun article à importer')

    category = crud.categories.get(db=db, id=import_in.category_id)
    if not category:
        raise HTTPException(status_code=404, detail='Catégorie introuvable')

    lot = crud.lots.get(db=db, id=import_in.lot_id)
    if not lot:
        raise HTTPException(status_code=404, detail='Lot introuvable')

    variant_levels = [str(k).strip() for k in (import_in.variant_levels or []) if str(k).strip()]

    user_id = int(getattr(current_user, 'id', 0) or 0)
    lot_reference = lot.reference or f'Lot #{lot.id}'
    created_products: List[models.Products] = []
    prefix = f'IMPORT-REÇU {receipt_number}' if receipt_number else 'IMPORT-REÇU'

    def ensure_variant_chain(attrs: dict, product_id: int, unit_cost: float = 0):
        """Crée (ou retrouve) la chaîne de variantes pour les attributs donnés."""
        lookup = {str(k).strip().lower(): str(v).strip() for k, v in (attrs or {}).items()}
        parent_id = None
        leaf = None
        for level in variant_levels:
            value = lookup.get(level.lower())
            if value is None or not value:
                break
            node = crud.product_variants.get_by_name(
                db=db, product_id=product_id, parent_id=parent_id, name=value
            )
            if not node:
                node = crud.product_variants.create(
                    db=db,
                    obj_in=schemas.ProductVariantCreate(
                        product_id=product_id,
                        parent_id=parent_id,
                        name=value,
                        quantity=0,
                    ),
                    commit=False,
                    refresh=False,
                )
                db.flush()
            parent_id = node.id
            leaf = node
        if leaf is not None and leaf.unit_cost is None:
            leaf.unit_cost = unit_cost
            db.flush()
        return leaf

    try:
        groups: dict = {}
        for item in import_in.items:
            name = re.sub(r'\s+', ' ', item.name).strip()
            if not name:
                raise HTTPException(status_code=422, detail='Nom de produit vide')

            attrs = dict(item.attributes or {})
            if attrs:
                base, _ = _split_attributes(name)
            else:
                base = name
            group_key = (base or name).strip().lower()
            groups.setdefault(group_key, []).append((base or name, attrs, item))

        for _key, entries in groups.items():
            base_name = entries[0][0]
            sku = f'RC-{uuid4().hex[:12].upper()}'
            product = crud.products.create(
                db=db,
                obj_in=schemas.ProductsCreate(
                    category_id=import_in.category_id,
                    sku=sku,
                    name=base_name,
                    image='/No_Image_Available.jpg',
                    unit=(entries[0][2].unit or '').strip() or None,
                    status=StatusEnum.active,
                ),
                commit=False,
                refresh=False,
            )
            db.flush()

            for name, attrs, item in entries:
                quantity = int(item.quantity)
                unit_cost = float(item.unit_cost)
                another_price = float(item.another_price or 0)
                if quantity <= 0:
                    raise HTTPException(
                        status_code=422,
                        detail=f'Quantité invalide pour "{name[:60]}"',
                    )
                if unit_cost <= 0:
                    raise HTTPException(
                        status_code=422,
                        detail=f'Coût unitaire invalide pour "{name[:60]}"',
                    )

                leaf = ensure_variant_chain(attrs, product.id, unit_cost) if variant_levels and attrs else None

                if leaf is not None:
                    stock_before = leaf.quantity or 0
                    stock_after = stock_before + quantity
                    leaf.quantity = stock_after
                    db.flush()
                    variant_id = leaf.id
                else:
                    existing_stock = crud.stock.get_by_product_id(db=db, product_id=product.id)
                    stock_before = existing_stock.quantity if existing_stock else 0
                    stock_after = stock_before + quantity
                    if existing_stock:
                        crud.stock.update(
                            db=db,
                            db_obj=existing_stock,
                            obj_in={'quantity': stock_after},
                            commit=False,
                        )
                    else:
                        crud.stock.create(
                            db=db,
                            obj_in=schemas.StockCreate(
                                product_id=product.id,
                                quantity=stock_after,
                            ),
                            commit=False,
                            refresh=False,
                        )
                    variant_id = None

                movement_in = schemas.StockMovementsCreate(
                    product_id=product.id,
                    user_id=user_id,
                    lot_id=lot.id,
                    variant_id=variant_id,
                    type=TypeEnum.in_stoct,
                    quantity=quantity,
                    unit_cost=unit_cost,
                    another_price=another_price,
                    total_cost=float(quantity) * unit_cost + another_price,
                    stock_before=stock_before,
                    stock_after=stock_after,
                    reference=f'{prefix} - {lot_reference}',
                )
                crud.stock_movements.create(
                    db=db,
                    obj_in=movement_in,
                    commit=False,
                    refresh=False,
                )

            created_products.append(product)

        if receipt_number:
            crud.receipts.create(
                db=db,
                obj_in=schemas.ReceiptsCreate(
                    receipt_number=receipt_number,
                    file_name=import_in.file_name,
                    seller=import_in.seller,
                    currency=import_in.currency,
                    items_count=len(import_in.items),
                    user_id=user_id,
                ),
                commit=False,
                refresh=False,
            )

        db.commit()
        for product in created_products:
            db.refresh(product)
        return created_products
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Import annulé (conflit de données)')


@router.post('/upload-image')
async def upload_product_image(
      *,
      request: Request,
      image: UploadFile = File(...),
      current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
   """Upload a product image and return a public URL."""
   allowed_types = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
   if image.content_type not in allowed_types:
      raise HTTPException(status_code=400, detail='Format image non supporte')

   uploads_dir = Path('files/products')
   uploads_dir.mkdir(parents=True, exist_ok=True)

   ext = Path(image.filename or '').suffix.lower() or '.jpg'
   if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.gif'}:
      ext = '.jpg'

   filename = f"{uuid4().hex}{ext}"
   file_path = uploads_dir / filename

   content = await image.read()
   if len(content) > 5 * 1024 * 1024:
      raise HTTPException(status_code=400, detail='Image trop volumineuse (max 5MB)')

   file_path.write_bytes(content)

   public_path = f"/files/products/{filename}"
   public_url = f"{str(request.base_url).rstrip('/')}{public_path}"

   return {
      'image_path': public_path,
      'image_url': public_url,
      'filename': filename
   }


@router.get('/', response_model=schemas.ResponseProducts)
def read_products(
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
    Retrieve products.
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

    products = crud.products.get_multi_where_array(
      db=db, relations=relations, skip=offset, limit=limit, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    count = crud.products.get_count_where_array(db=db, where=wheres)
    response = schemas.ResponseProducts(**{'count': count, 'data': jsonable_encoder(products)})
    return response


@router.post('/', response_model=schemas.Products)
def create_products(
        *,
        db: Session = Depends(deps.get_db),
        products_in: schemas.ProductsCreate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new products.
    """
    products = crud.products.create(db=db, obj_in=products_in)
    return products


@router.put('/{products_id}', response_model=schemas.Products)
def update_products(
        *,
        db: Session = Depends(deps.get_db),
   products_id: int,
        products_in: schemas.ProductsUpdate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update an products.
    """
    products = crud.products.get(db=db, id=products_id)
    if not products:
        raise HTTPException(status_code=404, detail='Products not found')
    products = crud.products.update(db=db, db_obj=products, obj_in=products_in)
    return products


@router.get('/{products_id}', response_model=schemas.Products)
def read_products(
        *,
        relation: str = "[]",
        where: str = "[]",
        where_relation: str = "[]",
        base_columns: str = "[]",
        db: Session = Depends(deps.get_db),
      products_id: int,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get products by ID.
    """
    relations = []
    if relation is not None and relation != "" and relation != [] and relation != "[]":
       relations += ast.literal_eval(relation)

    wheres = [{'key': 'id', 'value': products_id, 'operator': '=='}]
    if where is not None and where != "" and where != []:
       wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation is not None and where_relation != "" and where_relation != []:
       where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns is not None and base_columns != "" and base_columns != []:
       bases_columns += ast.literal_eval(base_columns)


    products = crud.products.get_first_where_array(db=db, relations=relations, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    if not products:
        raise HTTPException(status_code=404, detail='Products not found')
    return products


@router.delete('/{products_id}', response_model=schemas.Msg)
def delete_products(
        *,
        db: Session = Depends(deps.get_db),
   products_id: int,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an products.
    """
    products = crud.products.get(db=db, id=products_id)
    if not products:
        raise HTTPException(status_code=404, detail='Products not found')
    products = crud.products.remove(db=db, id=products_id)
    return schemas.Msg(msg='Products deleted successfully')
