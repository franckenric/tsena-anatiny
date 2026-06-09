from typing import Any
import ast

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=schemas.ResponseRoles)
def read_roles(
    *,
    offset: int = 0,
    limit: int = 100,
    relation: str = "[]",
    where: str = "[]",
    where_relation: str = "[]",
    base_columns: str = "[]",
    db: Session = Depends(deps.get_db),
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Retrieve roles."""
    relations = []
    if relation not in (None, "", [], "[]"):
        relations += ast.literal_eval(relation)

    wheres = []
    if where not in (None, "", [], "[]"):
        wheres += ast.literal_eval(where)

    where_relations = []
    if where_relation not in (None, "", [], "[]"):
        where_relations += ast.literal_eval(where_relation)

    bases_columns = []
    if base_columns not in (None, "", [], "[]"):
        bases_columns += ast.literal_eval(base_columns)

    roles = crud.roles.get_multi_where_array(
        db=db,
        relations=relations,
        skip=offset,
        limit=limit,
        where=wheres,
        where_relation=where_relations,
        base_columns=bases_columns,
    )
    count = crud.roles.get_count_where_array(db=db, where=wheres)
    return schemas.ResponseRoles(count=count, data=jsonable_encoder(roles))
