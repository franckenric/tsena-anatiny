from pydantic import BaseModel, field_validator
from .customers import PHONE_FORMAT_PATTERN


class OtpRequest(BaseModel):
    phone: str

    @field_validator('phone')
    @classmethod
    def validate_phone_format(cls, value: str) -> str:
        cleaned = value.replace(' ', '').strip()
        if not PHONE_FORMAT_PATTERN.match(cleaned):
            raise ValueError('Phone must match format +261 XX XX XXX XX')
        return cleaned


class OtpVerifyRequest(OtpRequest):
    code: str

    @field_validator('code')
    @classmethod
    def validate_code(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned.isdigit() or len(cleaned) != 6:
            raise ValueError('Code must be a 6-digit number')
        return cleaned


class OtpVerifyResponse(BaseModel):
    success: bool = True
    phone: str
