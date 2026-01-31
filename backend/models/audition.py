"""
Audition/Video Content Models

Models for user-uploaded video content in the audition.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


class AuditionItemType(str, Enum):
    VIDEO = "video"
    IMAGE = "image"


class AuditionItemCreate(BaseModel):
    media_url: str
    thumbnail_url: Optional[str] = None
    item_type: AuditionItemType = AuditionItemType.VIDEO
    description: Optional[str] = Field(None, max_length=500)
    song_name: Optional[str] = Field(None, max_length=200)


class AuditionItemInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    user_category: Optional[str] = None  # musician, audio_engineer, etc.
    user_subcategories: List[str] = []   # instruments, specializations, etc.
    user_genres: List[str] = []          # music genres
    user_is_verified: bool = False
    media_url: str
    thumbnail_url: Optional[str] = None
    item_type: AuditionItemType = AuditionItemType.VIDEO
    description: Optional[str] = None
    song_name: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    views_count: int = 0
    is_featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AuditionItemResponse(BaseModel):
    id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    user_category: Optional[str] = None
    user_subcategories: List[str] = []
    user_genres: List[str] = []
    user_is_verified: bool = False
    media_url: str
    thumbnail_url: Optional[str] = None
    item_type: AuditionItemType = AuditionItemType.VIDEO
    description: Optional[str] = None
    song_name: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    views_count: int = 0
    is_featured: bool = False
    created_at: Optional[datetime] = None
    profile_media_id: Optional[str] = None  # Link back to profile media


class AuditionItemUpdate(BaseModel):
    description: Optional[str] = None
    song_name: Optional[str] = None
    is_featured: Optional[bool] = None


class AuditionLike(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    audition_item_id: str
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
