from pydantic import BaseModel, EmailStr, field_validator


class OtpRequest(BaseModel):
    email: EmailStr

    @field_validator('email')
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


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
    email: str
