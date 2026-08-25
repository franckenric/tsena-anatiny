from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ProductVariantBase(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[int] = 0
    unit_cost: Optional[float] = None
    selling_price: Optional[float] = None
    discount_price: Optional[float] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None


class ProductVariantCreate(BaseModel):
    product_id: Optional[int] = None
    name: str
    sku: Optional[str] = None
    quantity: Optional[int] = 0
    unit_cost: Optional[float] = None
    selling_price: Optional[float] = None
    discount_price: Optional[float] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None


class ProductVariantUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[int] = None
    unit_cost: Optional[float] = None
    selling_price: Optional[float] = None
    discount_price: Optional[float] = None
    image: Optional[str] = None
    parent_id: Optional[int] = None


class ProductVariantInDBBase(ProductVariantBase):
    id: Optional[int] = None
    product_id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProductVariant(ProductVariantInDBBase):
    pass


class ProductVariantNode(ProductVariantInDBBase):
    children: List["ProductVariantNode"] = []


class ProductVariantInDB(ProductVariantInDBBase):
    pass
