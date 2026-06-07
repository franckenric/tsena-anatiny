# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from uuid import UUID
from app.enum.status import StatusEnum


class CategoriesBase(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[StatusEnum] = None


class CategoriesCreate(CategoriesBase):
    pass


class CategoriesUpdate(CategoriesBase):
    pass


class CategoriesInDBBase(CategoriesBase):
    id: Optional[UUID]

    model_config = ConfigDict(from_attributes=True)


class Categories(CategoriesInDBBase):
    pass


class CategoriesWithRelation(CategoriesInDBBase):
    pass


class CategoriesInDB(CategoriesInDBBase):
    pass


class ResponseCategories(BaseModel):
    count: int
    data: Optional[List[CategoriesWithRelation]]


# begin #
# ---write your code here--- #
# end #
