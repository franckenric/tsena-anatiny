from typing import Optional, Any

from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    id: Optional[Any] = None
    email: Optional[EmailStr]
