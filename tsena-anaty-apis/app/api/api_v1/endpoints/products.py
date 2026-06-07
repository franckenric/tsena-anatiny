from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.api import deps
from app import crud, models, schemas
import ast

router = APIRouter()
from app.api import deps
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
        products_id: UUID,
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
        products_id: UUID,
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
        products_id: UUID,
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
