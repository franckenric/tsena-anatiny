# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


class RolesBase(BaseModel):
    name: Optional[str] = None


class RolesCreate(RolesBase):
    pass


class RolesUpdate(RolesBase):
    pass


class RolesInDBBase(RolesBase):
    id: Optional[int]

    model_config = ConfigDict(from_attributes=True)


class Roles(RolesInDBBase):
    pass


class RolesWithRelation(RolesInDBBase):
    pass


class RolesInDB(RolesInDBBase):
    pass


class ResponseRoles(BaseModel):
    count: int
    data: Optional[List[RolesWithRelation]]


# begin #
# ---write your code here--- #
# end #
