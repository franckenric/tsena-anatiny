# begin #
# ---write your code here--- #
# end #

from datetime import datetime, time, date
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.enum.status import StatusEnum
from .categories import Categories
from .product_variants import ProductVariantNode
from .product_images import ProductImages


class ProductsBase(BaseModel):
    category_id: Optional[int] = None
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    unit: Optional[str] = None
    selling_price: Optional[float] = None
    low_stock_alert: Optional[int] = None
    status: Optional[StatusEnum] = None


class ProductsCreate(ProductsBase):
    category_id: int
    sku: str
    name: str
    image: str
    gallery_images: Optional[List[str]] = None


class ProductsUpdate(ProductsBase):
    gallery_images: Optional[List[str]] = None


class ProductsInDBBase(ProductsBase):
    id: Optional[int]
    category_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class Products(ProductsInDBBase):
    pass


class ProductStockLite(BaseModel):
    quantity: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ProductCommercialUserLite(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProductCommercialAssignmentLite(BaseModel):
    user_id: Optional[int] = None
    user: Optional[ProductCommercialUserLite] = None

    model_config = ConfigDict(from_attributes=True)


class ProductsWithRelation(ProductsInDBBase):
    categorie: Optional[Categories] = None
    stock: Optional[List[ProductStockLite]] = None
    variants: Optional[List[ProductVariantNode]] = None
    commercial_assignment: Optional[ProductCommercialAssignmentLite] = None
    images: Optional[List[ProductImages]] = None
    unit_cost: Optional[float] = None


class ProductsInDB(ProductsInDBBase):
    pass


class ResponseProducts(BaseModel):
    count: int
    data: Optional[List[ProductsWithRelation]]


# begin #
# ---write your code here--- #
# end #
