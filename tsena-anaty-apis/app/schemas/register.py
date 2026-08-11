from typing import Optional
from pydantic import BaseModel, field_validator
from .customers import Customers, PHONE_FORMAT_PATTERN


class RegisterRequest(BaseModel):
    name: str
    phone: str
    password: str
    delivery_address: Optional[str] = None
    email: Optional[str] = None

    @field_validator('phone')
    @classmethod
    def validate_phone_format(cls, value: str) -> str:
        cleaned = value.replace(' ', '').strip()
        if not PHONE_FORMAT_PATTERN.match(cleaned):
            raise ValueError('Phone must match format +261 XX XX XXX XX')
        return cleaned

    @field_validator('password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError('Password must be at least 6 characters')
        return value


class RegisterResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    customer: Customers
