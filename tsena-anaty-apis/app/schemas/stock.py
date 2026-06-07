# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from uuid import UUID
from .products import Products


class StockBase(BaseModel):
    product_id: Optional[int] = None
    quantity: Optional[int] = None
    reserved: Optional[bool] = None


class StockCreate(StockBase):
    product_id: int
    quantity: int


class StockUpdate(StockBase):
    pass


class StockInDBBase(StockBase):
    id: Optional[UUID]
    product_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class Stock(StockInDBBase):
    pass


class StockWithRelation(StockInDBBase):
    product: Optional[Products] = None


class StockInDB(StockInDBBase):
    pass


class ResponseStock(BaseModel):
    count: int
    data: Optional[List[StockWithRelation]]


# begin #
# ---write your code here--- #
# end #
