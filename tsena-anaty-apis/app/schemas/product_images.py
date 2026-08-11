from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict


class ProductImagesBase(BaseModel):
    product_id: Optional[int] = None
    image: Optional[str] = None
    position: Optional[int] = None


class ProductImagesCreate(ProductImagesBase):
    product_id: int
    image: str
    position: int = 0


class ProductImagesUpdate(ProductImagesBase):
    pass


class ProductImagesInDBBase(ProductImagesBase):
    id: Optional[int]
    product_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ProductImages(ProductImagesInDBBase):
    pass


class ProductImagesInDB(ProductImagesInDBBase):
    pass


class ResponseProductImages(BaseModel):
    count: int
    data: Optional[List[ProductImages]]
