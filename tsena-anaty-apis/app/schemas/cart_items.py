from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.enum.product_status import ProductStatusEnum


class CartItemsBase(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    product_id: int
    quantity: int
    unit_cost: Optional[float] = None
    another_price: Optional[float] = 0
    other_price_reason: Optional[str] = None


class CartItemsCreate(CartItemsBase):
    pass


class CartItemsUpdate(BaseModel):
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    another_price: Optional[float] = None
    other_price_reason: Optional[str] = None


class CartItemsInDBBase(BaseModel):
    id: Optional[int] = None
    customer_id: int
    product_id: int
    quantity: int
    unit_cost: Optional[float] = None
    another_price: Optional[float] = 0
    other_price_reason: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CartItems(CartItemsInDBBase):
    pass


class ResponseCartItems(BaseModel):
    count: int
    data: Optional[List[CartItems]] = None


class CartCheckoutRequest(BaseModel):
    user_id: int
    order_number: Optional[str] = None
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    another_price: Optional[float] = 0
    other_price_reason: Optional[str] = None
    status: Optional[ProductStatusEnum] = ProductStatusEnum.draft
    note: Optional[str] = None
