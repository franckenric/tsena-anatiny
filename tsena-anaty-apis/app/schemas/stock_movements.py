# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.enum.type import TypeEnum
from .products import Products
from .users import Users
from .lots import Lot


class StockMovementsBase(BaseModel):
    product_id: Optional[int] = None
    user_id: Optional[int] = None
    lot_id: Optional[int] = None
    commande_id: Optional[int] = None
    type: Optional[TypeEnum] = None
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    another_price: Optional[float] = None
    other_price_reason: Optional[str] = None
    total_cost: Optional[float] = None
    stock_before: Optional[int] = None
    stock_after: Optional[int] = None
    reference: Optional[str] = None


class StockMovementsCreate(StockMovementsBase):
    product_id: int
    user_id: int
    type: TypeEnum
    quantity: int


class StockMovementsUpdate(StockMovementsBase):
    pass


class StockMovementsInDBBase(StockMovementsBase):
    id: Optional[int]
    product_id: Optional[int] = None
    user_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StockMovements(StockMovementsInDBBase):
    pass


class StockMovementsWithRelation(StockMovementsInDBBase):
    product: Optional[Products] = None
    user: Optional[Users] = None
    lot: Optional[Lot] = None


class StockMovementsInDB(StockMovementsInDBBase):
    pass


class ResponseStockMovements(BaseModel):
    count: int
    data: Optional[List[StockMovementsWithRelation]]


# begin #
# ---write your code here--- #
# end #
