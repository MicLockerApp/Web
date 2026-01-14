from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class MessageCreate(BaseModel):
    recipient_id: str
    content: str = Field(..., min_length=1, max_length=5000)
    listing_id: Optional[str] = None  # Optional reference to a listing

class MessageInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    thread_id: str
    sender_id: str
    sender_username: str
    content: str
    listing_id: Optional[str] = None
    listing_title: Optional[str] = None
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MessageThreadInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participants: List[str]  # List of user IDs
    participant_usernames: List[str]
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    last_sender_id: Optional[str] = None
    unread_count: dict = {}  # {user_id: count}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MessageResponse(BaseModel):
    id: str
    thread_id: str
    sender_id: str
    sender_username: str
    content: str
    listing_id: Optional[str] = None
    listing_title: Optional[str] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

class MessageThreadResponse(BaseModel):
    id: str
    participants: List[str]
    participant_usernames: List[str]
    other_user_id: Optional[str] = None
    other_username: Optional[str] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime

class ThreadWithMessages(BaseModel):
    thread: MessageThreadResponse
    messages: List[MessageResponse]
