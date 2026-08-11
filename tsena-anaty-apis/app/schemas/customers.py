from datetime import datetime
import re
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator

from .users import Users


PHONE_FORMAT_PATTERN = re.compile(r"^\+261\d{9}$")


class CustomersBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    delivery_address: Optional[str] = None
    users_id: Optional[int] = None

    @field_validator('phone')
    @classmethod
    def validate_phone_format(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value

        cleaned = value.replace(' ', '').strip()
        if cleaned == '':
            return cleaned

        if not PHONE_FORMAT_PATTERN.match(cleaned):
            raise ValueError('Phone must match format +261 XX XX XXX XX')
        return cleaned


class CustomersCreate(CustomersBase):
    name: str
    phone: str


class CustomersUpdate(CustomersBase):
    pass


class CustomersInDBBase(CustomersBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Customers(CustomersInDBBase):
    pass


class CustomersWithRelation(CustomersInDBBase):
    user: Optional[Users] = None


class CustomersInDB(CustomersInDBBase):
    pass


class ResponseCustomers(BaseModel):
    count: int
    data: Optional[List[CustomersWithRelation]] = None
