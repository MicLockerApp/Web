"""
Notification Models

Models for user notification system.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


class NotificationType(str, Enum):
    BOOKING_ACCEPTED = "booking_accepted"
    BOOKING_DECLINED = "booking_declined"
    BOOKING_REQUEST = "booking_request"
    BOOKING_CANCELLED = "booking_cancelled"
    NEW_MESSAGE = "new_message"
    NEW_OFFER = "new_offer"
    OFFER_ACCEPTED = "offer_accepted"
    OFFER_DECLINED = "offer_declined"
    ORDER_UPDATE = "order_update"
    SYSTEM = "system"


class NotificationCreate(BaseModel):
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[dict] = None


class NotificationInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[dict] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    notification_type: NotificationType
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[dict] = None
    is_read: bool
    created_at: datetime


class NotificationBulkUpdate(BaseModel):
    notification_ids: Optional[List[str]] = None
    mark_all_read: bool = False
