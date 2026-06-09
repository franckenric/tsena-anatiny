from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
from app.api import deps
from app import crud, models, schemas
import ast

router = APIRouter()
from app.api import deps
@router.get('/', response_model=schemas.ResponseStockMovements)
def read_stock_movements(
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
    Retrieve stock_movements.
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

    stock_movements = crud.stock_movements.get_multi_where_array(
      db=db, relations=relations, skip=offset, limit=limit, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    count = crud.stock_movements.get_count_where_array(db=db, where=wheres)
    response = schemas.ResponseStockMovements(**{'count': count, 'data': jsonable_encoder(stock_movements)})
    return response


@router.post('/', response_model=schemas.StockMovements)
def create_stock_movements(
        *,
        db: Session = Depends(deps.get_db),
        stock_movements_in: schemas.StockMovementsCreate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new stock_movements.
    """
    stock_movements = crud.stock_movements.create(db=db, obj_in=stock_movements_in)
    return stock_movements


@router.put('/{stock_movements_id}', response_model=schemas.StockMovements)
def update_stock_movements(
        *,
        db: Session = Depends(deps.get_db),
   stock_movements_id: int,
        stock_movements_in: schemas.StockMovementsUpdate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update an stock_movements.
    """
    stock_movements = crud.stock_movements.get(db=db, id=stock_movements_id)
    if not stock_movements:
        raise HTTPException(status_code=404, detail='StockMovements not found')
    stock_movements = crud.stock_movements.update(db=db, db_obj=stock_movements, obj_in=stock_movements_in)
    return stock_movements


@router.get('/{stock_movements_id}', response_model=schemas.StockMovements)
def read_stock_movements(
        *,
        relation: str = "[]",
        where: str = "[]",
        where_relation: str = "[]",
        base_columns: str = "[]",
        db: Session = Depends(deps.get_db),
      stock_movements_id: int,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get stock_movements by ID.
    """
    relations = []
    if relation is not None and relation != "" and relation != [] and relation != "[]":
       relations += ast.literal_eval(relation)

    wheres = [{'key': 'id', 'value': stock_movements_id, 'operator': '=='}]
    if where is not None and where != "" and where != []:
       wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation is not None and where_relation != "" and where_relation != []:
       where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns is not None and base_columns != "" and base_columns != []:
       bases_columns += ast.literal_eval(base_columns)


    stock_movements = crud.stock_movements.get_first_where_array(db=db, relations=relations, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    if not stock_movements:
        raise HTTPException(status_code=404, detail='StockMovements not found')
    return stock_movements


@router.delete('/{stock_movements_id}', response_model=schemas.Msg)
def delete_stock_movements(
        *,
        db: Session = Depends(deps.get_db),
   stock_movements_id: int,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an stock_movements.
    """
    stock_movements = crud.stock_movements.get(db=db, id=stock_movements_id)
    if not stock_movements:
        raise HTTPException(status_code=404, detail='StockMovements not found')
    stock_movements = crud.stock_movements.remove(db=db, id=stock_movements_id)
    return schemas.Msg(msg='StockMovements deleted successfully')
