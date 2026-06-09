# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from .products import Products
from .users import Users


class CommercialAssignmentsBase(BaseModel):
    user_id: Optional[int] = None
    product_id: Optional[int] = None
    quantity: Optional[int] = None


class CommercialAssignmentsCreate(CommercialAssignmentsBase):
    user_id: int
    product_id: int
    quantity: int


class CommercialAssignmentsUpdate(CommercialAssignmentsBase):
    pass


class CommercialAssignmentsInDBBase(CommercialAssignmentsBase):
    id: Optional[int]
    user_id: Optional[int] = None
    product_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class CommercialAssignments(CommercialAssignmentsInDBBase):
    pass


class CommercialAssignmentsWithRelation(CommercialAssignmentsInDBBase):
    user: Optional[Users] = None
    product: Optional[Products] = None


class CommercialAssignmentsInDB(CommercialAssignmentsInDBBase):
    pass


class ResponseCommercialAssignments(BaseModel):
    count: int
    data: Optional[List[CommercialAssignmentsWithRelation]]


# begin #
# ---write your code here--- #
# end #
