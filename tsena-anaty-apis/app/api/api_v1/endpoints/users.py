from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.utils import parse_query_array

router = APIRouter()


def _normalize_where_filters(where_items: list[dict]) -> list[dict]:
   normalized: list[dict] = []
   for item in where_items:
      if not isinstance(item, dict):
         continue
      key = item.get("key", item.get("column"))
      if not key:
         continue
      normalized.append(
         {
            **item,
            "key": key,
            "operator": item.get("operator", "=="),
         }
      )
   return normalized


@router.get("/", response_model=schemas.ResponseUsers)
def read_users(
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
   """Retrieve users."""
   relations = parse_query_array(relation, default=[]) or []

   wheres = parse_query_array(where, default=[]) or []
   wheres = _normalize_where_filters(wheres)

   where_relations = parse_query_array(where_relation, default=[]) or []

   bases_columns = parse_query_array(base_columns, default=[]) or []

   users = crud.users.get_multi_where_array(
      db=db,
      relations=relations,
      skip=offset,
      limit=limit,
      where=wheres,
      where_relation=where_relations,
      base_columns=bases_columns,
   )
   count = crud.users.get_count_where_array(db=db, where=wheres)
   response = schemas.ResponseUsers(**{"count": count, "data": jsonable_encoder(users)})
   return response


@router.post("/", response_model=schemas.Users)
def create_users(
   *,
   db: Session = Depends(deps.get_db),
   users_in: schemas.UsersCreate,
   current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
   """Create new users."""
   users = crud.users.create(db=db, obj_in=users_in)
   return users


@router.put("/{users_id}", response_model=schemas.Users)
def update_users(
   *,
   db: Session = Depends(deps.get_db),
   users_id: int,
   users_in: schemas.UsersUpdate,
   current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
   """Update an users."""
   users = crud.users.get(db=db, id=users_id)
   if not users:
      raise HTTPException(status_code=404, detail="Users not found")
   users = crud.users.update(db=db, db_obj=users, obj_in=users_in)
   return users


@router.get("/{users_id}", response_model=schemas.Users)
def read_user_by_id(
   *,
   relation: str = "[]",
   where: str = "[]",
   where_relation: str = "[]",
   base_columns: str = "[]",
   db: Session = Depends(deps.get_db),
   users_id: int,
   current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
   """Get users by ID."""
   relations = parse_query_array(relation, default=[]) or []

   wheres = [{"key": "id", "value": users_id, "operator": "=="}]
   wheres += parse_query_array(where, default=[]) or []
   wheres = _normalize_where_filters(wheres)

   where_relations = parse_query_array(where_relation, default=[]) or []

   bases_columns = parse_query_array(base_columns, default=[]) or []

   users = crud.users.get_first_where_array(
      db=db,
      relations=relations,
      where=wheres,
      where_relation=where_relations,
      base_columns=bases_columns,
   )
   if not users:
      raise HTTPException(status_code=404, detail="Users not found")
   return users


@router.delete("/{users_id}", response_model=schemas.Msg)
def delete_users(
   *,
   db: Session = Depends(deps.get_db),
   users_id: int,
   current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
   """Delete an users."""
   users = crud.users.get(db=db, id=users_id)
   if not users:
      raise HTTPException(status_code=404, detail="Users not found")
   users = crud.users.remove(db=db, id=users_id)
   return schemas.Msg(msg="Users deleted successfully")
