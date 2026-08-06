from typing import Any
import ast

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get('/', response_model=schemas.ResponseCustomers)
def read_customers(
    *,
    offset: int = 0,
    limit: int = 100,
    relation: str = '[]',
    where: str = '[]',
    where_relation: str = '[]',
    base_columns: str = '[]',
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    relations = []
    if relation not in (None, '', [], '[]'):
        relations += ast.literal_eval(relation)

    wheres = []
    if where not in (None, '', [], '[]'):
        wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation not in (None, '', [], '[]'):
        where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns not in (None, '', [], '[]'):
        bases_columns += ast.literal_eval(base_columns)

    customers = crud.customers.get_multi_where_array(
        db=db,
        relations=relations,
        skip=offset,
        limit=limit,
        where=wheres,
        where_relation=where_relations,
        base_columns=bases_columns,
    )
    count = crud.customers.get_count_where_array(db=db, where=wheres)
    return schemas.ResponseCustomers(count=count, data=jsonable_encoder(customers))


@router.post('/', response_model=schemas.Customers)
def create_customer(
    *,
    db: Session = Depends(deps.get_db),
    customer_in: schemas.CustomersCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    try:
        return crud.customers.create(db=db, obj_in=customer_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Customer phone already exists')


@router.put('/{customer_id}', response_model=schemas.Customers)
def update_customer(
    *,
    db: Session = Depends(deps.get_db),
    customer_id: int,
    customer_in: schemas.CustomersUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    customer = crud.customers.get(db=db, id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail='Customer not found')
    try:
        return crud.customers.update(db=db, db_obj=customer, obj_in=customer_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail='Customer phone already exists')


@router.delete('/{customer_id}', response_model=schemas.Msg)
def delete_customer(
    *,
    db: Session = Depends(deps.get_db),
    customer_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    customer = crud.customers.get(db=db, id=customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail='Customer not found')
    crud.customers.remove(db=db, id=customer_id)
    return schemas.Msg(msg='Customer deleted successfully')
