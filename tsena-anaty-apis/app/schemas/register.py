from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from .customers import Customers


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    delivery_address: Optional[str] = None

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator('name')
    @classmethod
    def strip_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError('Name is required')
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
    otp_required: Optional[bool] = True
