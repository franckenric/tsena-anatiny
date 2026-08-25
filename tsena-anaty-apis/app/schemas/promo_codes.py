# begin #
# ---write your code here--- #
# end #

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator
from app.enum.discount_type import DiscountTypeEnum
from app.enum.status import StatusEnum


class PromoCodesBase(BaseModel):
    code: Optional[str] = None
    description: Optional[str] = None
    discount_type: Optional[DiscountTypeEnum] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[float] = None
    max_uses: Optional[int] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    status: Optional[StatusEnum] = None

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        return stripped.upper() if stripped else None


class PromoCodesCreate(PromoCodesBase):
    code: str
    discount_type: DiscountTypeEnum
    discount_value: float

    @field_validator("discount_value")
    @classmethod
    def validate_discount_value(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("discount_value must be greater than 0")
        return v

    @field_validator("min_order_amount", "max_uses")
    @classmethod
    def validate_positive_optional(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("must be greater than or equal to 0")
        return v


class PromoCodesUpdate(PromoCodesBase):
    pass


class PromoCodesInDBBase(PromoCodesBase):
    id: Optional[int]
    used_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PromoCodes(PromoCodesInDBBase):
    pass


class PromoCodesWithRelation(PromoCodesInDBBase):
    pass


class PromoCodesInDB(PromoCodesInDBBase):
    pass


class ResponsePromoCodes(BaseModel):
    count: int
    data: Optional[List[PromoCodesWithRelation]]


class PromoCodeValidateRequest(BaseModel):
    code: str
    subtotal: Optional[float] = None

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return (v or "").strip().upper()


class PromoCodeValidateResponse(BaseModel):
    valid: bool
    code: str
    discount_type: DiscountTypeEnum
    discount_value: float
    discount_amount: float = 0
    description: Optional[str] = None


# begin #
# ---write your code here--- #
# end #
