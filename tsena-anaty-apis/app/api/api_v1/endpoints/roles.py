from typing import Any

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.utils import parse_query_array

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
    relations = parse_query_array(relation, default=[]) or []

    wheres = parse_query_array(where, default=[]) or []

    where_relations = parse_query_array(where_relation, default=[]) or []

    bases_columns = parse_query_array(base_columns, default=[]) or []

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
