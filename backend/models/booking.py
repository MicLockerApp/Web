"""
Venue Booking Models

Models for venue calendar and booking request system.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


class BookingStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class BookingCreate(BaseModel):
    venue_id: str  # User ID of the venue
    event_date: datetime
    event_time: str  # e.g., "8:00 PM"
    duration_hours: float = 2.0
    event_name: str = Field(..., min_length=1, max_length=200)
    event_description: Optional[str] = Field(None, max_length=2000)
    expected_attendance: Optional[int] = None
    genre: Optional[str] = None
    special_requests: Optional[str] = Field(None, max_length=1000)


class BookingInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str  # User ID of the venue
    venue_username: str
    artist_id: str  # User ID of the artist/requester
    artist_username: str
    event_date: datetime
    event_time: str
    duration_hours: float
    event_name: str
    event_description: Optional[str] = None
    expected_attendance: Optional[int] = None
    genre: Optional[str] = None
    special_requests: Optional[str] = None
    status: BookingStatus = BookingStatus.PENDING
    # Documents attached by both parties
    venue_documents: List[str] = []  # URLs to uploaded documents
    artist_documents: List[str] = []  # URLs to uploaded documents
    # Response from venue
    venue_response: Optional[str] = None
    responded_at: Optional[datetime] = None
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BookingResponse(BaseModel):
    id: str
    venue_id: str
    venue_username: str
    artist_id: str
    artist_username: str
    event_date: datetime
    event_time: str
    duration_hours: float
    event_name: str
    event_description: Optional[str] = None
    expected_attendance: Optional[int] = None
    genre: Optional[str] = None
    special_requests: Optional[str] = None
    status: BookingStatus
    venue_documents: List[str] = []
    artist_documents: List[str] = []
    venue_response: Optional[str] = None
    responded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class BookingUpdate(BaseModel):
    status: Optional[BookingStatus] = None
    venue_response: Optional[str] = None
    venue_documents: Optional[List[str]] = None
    artist_documents: Optional[List[str]] = None


class CalendarEvent(BaseModel):
    """Represents an event on the venue calendar"""
    id: str
    event_name: str
    event_date: datetime
    event_time: str
    duration_hours: float
    artist_username: str
    artist_id: str
    status: BookingStatus
    genre: Optional[str] = None
