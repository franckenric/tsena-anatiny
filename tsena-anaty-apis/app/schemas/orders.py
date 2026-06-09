# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.enum.product_status import ProductStatusEnum
from .products import Products
from .users import Users


class OrdersBase(BaseModel):
    order_number: Optional[str] = None
    user_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    product_id: Optional[int] = None
    quantity: Optional[int] = None
    status: Optional[ProductStatusEnum] = None
    note: Optional[str] = None


class OrdersCreate(OrdersBase):
    user_id: int
    customer_name: str
    product_id: int


class OrdersUpdate(OrdersBase):
    pass


class OrdersInDBBase(OrdersBase):
    id: Optional[int]
    user_id: Optional[int] = None
    product_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class Orders(OrdersInDBBase):
    pass


class OrdersWithRelation(OrdersInDBBase):
    user: Optional[Users] = None
    product: Optional[Products] = None


class OrdersInDB(OrdersInDBBase):
    pass


class ResponseOrders(BaseModel):
    count: int
    data: Optional[List[OrdersWithRelation]]


# begin #
# ---write your code here--- #
# end #
