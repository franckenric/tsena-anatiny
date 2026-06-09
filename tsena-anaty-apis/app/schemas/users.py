# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from .roles import Roles


class UsersBase(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    role_id: Optional[int] = None
    phone_numer: Optional[str] = None
    address: Optional[str] = None


class UsersCreate(UsersBase):
    email: str
    password: str
    is_active: bool
    role_id: int
    phone_numer: str


class UsersUpdate(UsersBase):
    pass


class UsersInDBBase(UsersBase):
    id: Optional[int]
    role_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class Users(UsersInDBBase):
    pass


class UsersWithRelation(UsersInDBBase):
    role: Optional[Roles] = None


class UsersInDB(UsersInDBBase):
    pass


class ResponseUsers(BaseModel):
    count: int
    data: Optional[List[UsersWithRelation]]


# begin #
# ---write your code here--- #
# end #
