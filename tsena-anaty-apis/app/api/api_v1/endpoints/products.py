from typing import Any
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.api import deps
from app import crud, models, schemas
import ast

router = APIRouter()
from app.api import deps


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
