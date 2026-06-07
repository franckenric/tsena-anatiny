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
@router.get('/', response_model=schemas.ResponseOrders)
def read_orders(
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
    Retrieve orders.
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

    orders = crud.orders.get_multi_where_array(
      db=db, relations=relations, skip=offset, limit=limit, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    count = crud.orders.get_count_where_array(db=db, where=wheres)
    response = schemas.ResponseOrders(**{'count': count, 'data': jsonable_encoder(orders)})
    return response


@router.post('/', response_model=schemas.Orders)
def create_orders(
        *,
        db: Session = Depends(deps.get_db),
        orders_in: schemas.OrdersCreate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new orders.
    """
    orders = crud.orders.create(db=db, obj_in=orders_in)
    return orders


@router.put('/{orders_id}', response_model=schemas.Orders)
def update_orders(
        *,
        db: Session = Depends(deps.get_db),
        orders_id: UUID,
        orders_in: schemas.OrdersUpdate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update an orders.
    """
    orders = crud.orders.get(db=db, id=orders_id)
    if not orders:
        raise HTTPException(status_code=404, detail='Orders not found')
    orders = crud.orders.update(db=db, db_obj=orders, obj_in=orders_in)
    return orders


@router.get('/{orders_id}', response_model=schemas.Orders)
def read_orders(
        *,
        relation: str = "[]",
        where: str = "[]",
        where_relation: str = "[]",
        base_columns: str = "[]",
        db: Session = Depends(deps.get_db),
        orders_id: UUID,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get orders by ID.
    """
    relations = []
    if relation is not None and relation != "" and relation != [] and relation != "[]":
       relations += ast.literal_eval(relation)

    wheres = [{'key': 'id', 'value': orders_id, 'operator': '=='}]
    if where is not None and where != "" and where != []:
       wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation is not None and where_relation != "" and where_relation != []:
       where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns is not None and base_columns != "" and base_columns != []:
       bases_columns += ast.literal_eval(base_columns)


    orders = crud.orders.get_first_where_array(db=db, relations=relations, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    if not orders:
        raise HTTPException(status_code=404, detail='Orders not found')
    return orders


@router.delete('/{orders_id}', response_model=schemas.Msg)
def delete_orders(
        *,
        db: Session = Depends(deps.get_db),
        orders_id: UUID,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an orders.
    """
    orders = crud.orders.get(db=db, id=orders_id)
    if not orders:
        raise HTTPException(status_code=404, detail='Orders not found')
    orders = crud.orders.remove(db=db, id=orders_id)
    return schemas.Msg(msg='Orders deleted successfully')
