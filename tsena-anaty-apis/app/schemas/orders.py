# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from app.enum.product_status import ProductStatusEnum
from .customers import Customers
from .users import Users
from .stock_movements import StockMovementsWithRelation


class OrderMovementPayload(BaseModel):
    product_id: int
    quantity: int
    unit_cost: Optional[float] = None
    another_price: Optional[float] = 0
    other_price_reason: Optional[str] = None
    variant_id: Optional[int] = None


class OrdersBase(BaseModel):
    order_number: Optional[str] = None
    user_id: Optional[int] = None
    customer_id: int
    another_price: Optional[float] = 0
    other_price_reason: Optional[str] = None
    promo_code: Optional[str] = None
    discount: Optional[float] = 0
    status: Optional[ProductStatusEnum] = None
    note: Optional[str] = None


class OrdersCreate(OrdersBase):
    user_id: int


class OrdersUpdate(OrdersBase):
    pass


class OrdersCreateRequest(OrdersCreate):
    movements: Optional[List[OrderMovementPayload]] = None
    movement: Optional[OrderMovementPayload] = None

    # Legacy support: old clients can still send product/qty/prices at root level.
    product_id: Optional[int] = None
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    another_price: Optional[float] = None
    other_price_reason: Optional[str] = None

    @model_validator(mode="after")
    def inject_legacy_movement(self):
        if self.movements is not None and len(self.movements) > 0:
            return self

        if self.movement is not None:
            self.movements = [self.movement]
            return self

        if self.product_id is None:
            return self

        qty = self.quantity if self.quantity is not None else 1
        self.movement = OrderMovementPayload(
            product_id=self.product_id,
            quantity=qty,
            unit_cost=self.unit_cost,
            another_price=self.another_price,
            other_price_reason=self.other_price_reason,
        )
        self.movements = [self.movement]
        return self


    @model_validator(mode="after")
    def validate_order_level_price_reason(self):
        if (self.another_price or 0) > 0 and not (self.other_price_reason or "").strip():
            raise ValueError('other_price_reason is required when another_price is greater than 0')
        return self


class OrdersUpdateRequest(OrdersUpdate):
    movements: Optional[List[OrderMovementPayload]] = None
    movement: Optional[OrderMovementPayload] = None

    # Legacy support for update payloads.
    product_id: Optional[int] = None
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    another_price: Optional[float] = None
    other_price_reason: Optional[str] = None

    @model_validator(mode="after")
    def inject_legacy_movement(self):
        if self.movements is not None and len(self.movements) > 0:
            return self

        if self.movement is not None:
            self.movements = [self.movement]
            return self

        if self.product_id is None:
            return self

        qty = self.quantity if self.quantity is not None else 1
        self.movement = OrderMovementPayload(
            product_id=self.product_id,
            quantity=qty,
            unit_cost=self.unit_cost,
            another_price=self.another_price,
            other_price_reason=self.other_price_reason,
        )
        self.movements = [self.movement]
        return self


    @model_validator(mode="after")
    def validate_order_level_price_reason(self):
        if (self.another_price or 0) > 0 and not (self.other_price_reason or "").strip():
            raise ValueError('other_price_reason is required when another_price is greater than 0')
        return self


class OrdersInDBBase(OrdersBase):
    id: Optional[int]
    user_id: Optional[int] = None
    customer_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Orders(OrdersInDBBase):
    pass


class OrdersWithRelation(OrdersInDBBase):
    user: Optional[Users] = None
    customer: Optional[Customers] = None
    stock_movements: Optional[List[StockMovementsWithRelation]] = None
    promo_code: Optional[str] = None


class OrdersInDB(OrdersInDBBase):
    pass


class ResponseOrders(BaseModel):
    count: int
    data: Optional[List[OrdersWithRelation]]


# begin #
# ---write your code here--- #
# end #
