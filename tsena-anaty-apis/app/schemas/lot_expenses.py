from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class LotExpenseBase(BaseModel):
    lot_id: Optional[int] = None
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None


class LotExpenseCreate(LotExpenseBase):
    lot_id: int
    name: str
    amount: float


class LotExpenseUpdate(LotExpenseBase):
    pass


class LotExpenseInDBBase(LotExpenseBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LotExpense(LotExpenseInDBBase):
    pass


class ResponseLotExpenses(BaseModel):
    count: int
    data: Optional[List[LotExpense]]
