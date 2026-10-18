from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=8, max_length=255)
    auth: str = Field(min_length=8, max_length=255)


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(min_length=8, max_length=2048)
    keys: PushSubscriptionKeys
    user_agent: Optional[str] = Field(default=None, max_length=255)


class PushSubscriptionUpdate(PushSubscriptionCreate):
    pass


class PushSubscriptionInDBBase(BaseModel):
    id: int
    user_id: int
    endpoint: str
    p256dh: str
    auth: str
    user_agent: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PushSubscription(PushSubscriptionInDBBase):
    pass


class ResponseVapidKey(BaseModel):
    public_key: str
