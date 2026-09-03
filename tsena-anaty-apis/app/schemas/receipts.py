from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


class ReceiptsBase(BaseModel):
    receipt_number: str
    file_name: Optional[str] = None
    seller: Optional[str] = None
    currency: Optional[str] = None
    photo: Optional[str] = None
    items_count: Optional[int] = 0
    user_id: Optional[int] = None


class ReceiptsCreate(ReceiptsBase):
    pass


class ReceiptsUpdate(ReceiptsBase):
    pass


class ReceiptsInDBBase(ReceiptsBase):
    id: Optional[int]
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Receipts(ReceiptsInDBBase):
    pass


class ReceiptsInDB(ReceiptsInDBBase):
    pass


class ReceiptImportItem(BaseModel):
    name: str
    quantity: int
    unit_cost: float
    another_price: float = 0.0
    unit: Optional[str] = None
    sku: Optional[str] = None
    attributes: Optional[dict] = None


class ReceiptImportRequest(BaseModel):
    receipt_number: Optional[str] = None
    file_name: Optional[str] = None
    seller: Optional[str] = None
    currency: Optional[str] = None
    category_id: int
    lot_id: int
    variant_levels: List[str] = []
    items: List[ReceiptImportItem]
