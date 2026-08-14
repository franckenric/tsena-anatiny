from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class NotificationsBase(BaseModel):
    user_id: Optional[int] = None
    type: Optional[str] = None
    order_id: Optional[int] = None
    order_number: Optional[str] = None
    title: Optional[str] = None
    message: Optional[str] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    total: Optional[float] = None
    previous_status: Optional[str] = None
    status: Optional[str] = None
    read: Optional[bool] = None


class NotificationsCreate(NotificationsBase):
    user_id: int
    type: str


class NotificationsUpdate(NotificationsBase):
    pass


class NotificationsInDBBase(NotificationsBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Notifications(NotificationsInDBBase):
    pass


class NotificationsWithRelation(NotificationsInDBBase):
    pass


class NotificationsInDB(NotificationsInDBBase):
    pass


class ResponseNotifications(BaseModel):
    count: int
    unread_count: int = 0
    data: Optional[List[Notifications]] = None
