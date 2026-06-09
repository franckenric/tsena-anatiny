from typing import Any
import ast

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=schemas.ResponseCategories)
def read_categories(
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
    """Retrieve categories."""
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

    categories = crud.categories.get_multi_where_array(
        db=db,
        relations=relations,
        skip=offset,
        limit=limit,
        where=wheres,
        where_relation=where_relations,
        base_columns=bases_columns,
    )
    count = crud.categories.get_count_where_array(db=db, where=wheres)
    return schemas.ResponseCategories(count=count, data=jsonable_encoder(categories))


@router.post("/", response_model=schemas.Categories)
def create_category(
    *,
    db: Session = Depends(deps.get_db),
    category_in: schemas.CategoriesCreate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Create new category."""
    category = crud.categories.create(db=db, obj_in=category_in)
    return category


@router.put("/{category_id}", response_model=schemas.Categories)
def update_category(
    *,
    db: Session = Depends(deps.get_db),
    category_id: int,
    category_in: schemas.CategoriesUpdate,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Update a category."""
    category = crud.categories.get(db=db, id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category = crud.categories.update(db=db, db_obj=category, obj_in=category_in)
    return category


@router.delete("/{category_id}", response_model=schemas.Msg)
def delete_category(
    *,
    db: Session = Depends(deps.get_db),
    category_id: int,
    current_user: models.Users = Depends(deps.get_current_active_user),
) -> Any:
    """Delete a category."""
    category = crud.categories.get(db=db, id=category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    crud.categories.remove(db=db, id=category_id)
    return schemas.Msg(msg="Category deleted successfully")
