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
@router.get('/', response_model=schemas.ResponseCommercialAssignments)
def read_commercial_assignments(
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
    Retrieve commercial_assignments.
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

    commercial_assignments = crud.commercial_assignments.get_multi_where_array(
      db=db, relations=relations, skip=offset, limit=limit, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    count = crud.commercial_assignments.get_count_where_array(db=db, where=wheres)
    response = schemas.ResponseCommercialAssignments(**{'count': count, 'data': jsonable_encoder(commercial_assignments)})
    return response


@router.post('/', response_model=schemas.CommercialAssignments)
def create_commercial_assignments(
        *,
        db: Session = Depends(deps.get_db),
        commercial_assignments_in: schemas.CommercialAssignmentsCreate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Create new commercial_assignments.
    """
    commercial_assignments = crud.commercial_assignments.create(db=db, obj_in=commercial_assignments_in)
    return commercial_assignments


@router.put('/{commercial_assignments_id}', response_model=schemas.CommercialAssignments)
def update_commercial_assignments(
        *,
        db: Session = Depends(deps.get_db),
        commercial_assignments_id: UUID,
        commercial_assignments_in: schemas.CommercialAssignmentsUpdate,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Update an commercial_assignments.
    """
    commercial_assignments = crud.commercial_assignments.get(db=db, id=commercial_assignments_id)
    if not commercial_assignments:
        raise HTTPException(status_code=404, detail='CommercialAssignments not found')
    commercial_assignments = crud.commercial_assignments.update(db=db, db_obj=commercial_assignments, obj_in=commercial_assignments_in)
    return commercial_assignments


@router.get('/{commercial_assignments_id}', response_model=schemas.CommercialAssignments)
def read_commercial_assignments(
        *,
        relation: str = "[]",
        where: str = "[]",
        where_relation: str = "[]",
        base_columns: str = "[]",
        db: Session = Depends(deps.get_db),
        commercial_assignments_id: UUID,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Get commercial_assignments by ID.
    """
    relations = []
    if relation is not None and relation != "" and relation != [] and relation != "[]":
       relations += ast.literal_eval(relation)

    wheres = [{'key': 'id', 'value': commercial_assignments_id, 'operator': '=='}]
    if where is not None and where != "" and where != []:
       wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation is not None and where_relation != "" and where_relation != []:
       where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns is not None and base_columns != "" and base_columns != []:
       bases_columns += ast.literal_eval(base_columns)


    commercial_assignments = crud.commercial_assignments.get_first_where_array(db=db, relations=relations, where=wheres, where_relation=where_relations, base_columns=bases_columns)
    if not commercial_assignments:
        raise HTTPException(status_code=404, detail='CommercialAssignments not found')
    return commercial_assignments


@router.delete('/{commercial_assignments_id}', response_model=schemas.Msg)
def delete_commercial_assignments(
        *,
        db: Session = Depends(deps.get_db),
        commercial_assignments_id: UUID,
        current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """
    Delete an commercial_assignments.
    """
    commercial_assignments = crud.commercial_assignments.get(db=db, id=commercial_assignments_id)
    if not commercial_assignments:
        raise HTTPException(status_code=404, detail='CommercialAssignments not found')
    commercial_assignments = crud.commercial_assignments.remove(db=db, id=commercial_assignments_id)
    return schemas.Msg(msg='CommercialAssignments deleted successfully')
