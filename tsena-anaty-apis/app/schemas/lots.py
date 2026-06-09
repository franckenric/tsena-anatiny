from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class LotBase(BaseModel):
    reference: str
    total_expense: float = 0.0
    received_at: Optional[datetime] = None


class LotCreate(LotBase):
    pass


class LotUpdate(BaseModel):
    reference: Optional[str] = None
    total_expense: Optional[float] = None
    received_at: Optional[datetime] = None


class LotInDBBase(LotBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    reference: Optional[str] = None  # allow None for legacy rows

    model_config = ConfigDict(from_attributes=True)


class Lot(LotInDBBase):
    pass


class ResponseLots(BaseModel):
    count: int
    data: Optional[List[Lot]]
