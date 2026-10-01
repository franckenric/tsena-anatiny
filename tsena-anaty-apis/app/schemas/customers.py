from datetime import datetime
import re
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator

from .users import Users


PHONE_FORMAT_PATTERN = re.compile(r"^\+261\d{9}$")


def clean_phone(value: Optional[str]) -> Optional[str]:
    """Supprime les espaces d'un numero et verifie le format +261XXXXXXXXX.

    Une saisie vide devient None : la colonne `phone` porte une contrainte
    d'unicite, deux clients sans numero ne peuvent pas la partager.
    """
    if value is None:
        return None

    cleaned = value.replace(' ', '').strip()
    if cleaned == '':
        return None

    if not PHONE_FORMAT_PATTERN.match(cleaned):
        raise ValueError('Phone must match format +261 XX XX XXX XX')
    return cleaned


class CustomersBase(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    delivery_address: Optional[str] = None
    users_id: Optional[int] = None

    @field_validator('phone')
    @classmethod
    def validate_phone_format(cls, value: Optional[str]) -> Optional[str]:
        return clean_phone(value)


class CustomersCreate(CustomersBase):
    name: str
    phone: Optional[str] = None


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
