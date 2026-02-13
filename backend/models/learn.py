"""
Learn Section Models

Models for the educational content platform including:
- Teaching channels
- Playlists and videos
- Subscription tiers
- Reviews
- Admin banners
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


class ContentType(str, Enum):
    VIDEO = "video"
    PLAYLIST = "playlist"


class ReviewTargetType(str, Enum):
    CHANNEL = "channel"
    PLAYLIST = "playlist"
    VIDEO = "video"


# ============== Channel Models ==============

class ChannelCreate(BaseModel):
    """Create a teaching channel"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    intro_video_url: Optional[str] = None
    intro_video_thumbnail: Optional[str] = None
    category: str  # Primary category (musician, audio_engineer, etc.)
    subcategories: List[str] = []
    banner_image: Optional[str] = None


class ChannelUpdate(BaseModel):
    """Update a teaching channel"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    intro_video_url: Optional[str] = None
    intro_video_thumbnail: Optional[str] = None
    category: Optional[str] = None
    subcategories: Optional[List[str]] = None
    banner_image: Optional[str] = None


class ChannelInDB(BaseModel):
    """Channel stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Owner of the channel
    name: str
    description: Optional[str] = None
    intro_video_url: Optional[str] = None
    intro_video_thumbnail: Optional[str] = None
    category: str
    subcategories: List[str] = []
    banner_image: Optional[str] = None
    subscriber_count: int = 0
    total_views: int = 0
    average_rating: float = 0.0
    review_count: int = 0
    is_featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ChannelResponse(BaseModel):
    """Channel response with owner info"""
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    intro_video_url: Optional[str] = None
    intro_video_thumbnail: Optional[str] = None
    category: str
    subcategories: List[str] = []
    banner_image: Optional[str] = None
    subscriber_count: int = 0
    total_views: int = 0
    average_rating: float = 0.0
    review_count: int = 0
    is_featured: bool = False
    created_at: datetime
    updated_at: datetime
    # Owner info (populated from users collection)
    owner_username: Optional[str] = None
    owner_avatar: Optional[str] = None
    owner_is_verified: bool = False


# ============== Subscription Tier Models ==============

class TierBenefit(BaseModel):
    """A benefit included in a subscription tier"""
    description: str
    is_included: bool = True


class SubscriptionTierCreate(BaseModel):
    """Create a subscription tier for a channel"""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    price_usd: float = Field(..., ge=0)  # Price in USD (will be converted for display)
    benefits: List[TierBenefit] = []
    includes_all_content: bool = False  # If true, unlocks all playlists/videos
    order: int = 0  # Display order


class SubscriptionTierUpdate(BaseModel):
    """Update a subscription tier"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=500)
    price_usd: Optional[float] = Field(None, ge=0)
    benefits: Optional[List[TierBenefit]] = None
    includes_all_content: Optional[bool] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class SubscriptionTierInDB(BaseModel):
    """Subscription tier stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    channel_id: str
    name: str
    description: Optional[str] = None
    price_usd: float
    benefits: List[TierBenefit] = []
    includes_all_content: bool = False
    order: int = 0
    is_active: bool = True
    subscriber_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SubscriptionTierResponse(SubscriptionTierInDB):
    """Subscription tier response"""
    pass


# ============== Playlist Models ==============

class PlaylistCreate(BaseModel):
    """Create a playlist"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    thumbnail_url: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    is_free: bool = False  # If true, entire playlist is free
    price_usd: float = Field(0, ge=0)  # Price if not free
    tags: List[str] = []


class PlaylistUpdate(BaseModel):
    """Update a playlist"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    thumbnail_url: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    is_free: Optional[bool] = None
    price_usd: Optional[float] = Field(None, ge=0)
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None


class PlaylistInDB(BaseModel):
    """Playlist stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    channel_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    category: str
    subcategory: Optional[str] = None
    is_free: bool = False
    price_usd: float = 0
    tags: List[str] = []
    video_count: int = 0
    total_duration_seconds: int = 0
    view_count: int = 0
    purchase_count: int = 0
    average_rating: float = 0.0
    review_count: int = 0
    is_published: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlaylistResponse(PlaylistInDB):
    """Playlist response with additional info"""
    owner_username: Optional[str] = None
    owner_avatar: Optional[str] = None
    channel_name: Optional[str] = None


# ============== Video Models ==============

class LearnVideoCreate(BaseModel):
    """Create a video for Learn section"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    video_url: str
    thumbnail_url: Optional[str] = None
    duration_seconds: int = 0
    category: str
    subcategory: Optional[str] = None
    playlist_id: Optional[str] = None  # If part of a playlist
    is_free: bool = True  # Singular videos default to free
    price_usd: float = Field(0, ge=0)
    is_preview: bool = False  # If this is a preview video in a paid playlist
    preview_duration_seconds: Optional[int] = None  # How much of the video to show as preview
    order_in_playlist: int = 0
    tags: List[str] = []


class LearnVideoUpdate(BaseModel):
    """Update a video"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    playlist_id: Optional[str] = None
    is_free: Optional[bool] = None
    price_usd: Optional[float] = Field(None, ge=0)
    is_preview: Optional[bool] = None
    preview_duration_seconds: Optional[int] = None
    order_in_playlist: Optional[int] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None


class LearnVideoInDB(BaseModel):
    """Video stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    channel_id: str
    user_id: str
    playlist_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    video_url: str
    thumbnail_url: Optional[str] = None
    duration_seconds: int = 0
    category: str
    subcategory: Optional[str] = None
    is_free: bool = True
    price_usd: float = 0
    is_preview: bool = False
    preview_duration_seconds: Optional[int] = None
    order_in_playlist: int = 0
    tags: List[str] = []
    view_count: int = 0
    purchase_count: int = 0
    average_rating: float = 0.0
    review_count: int = 0
    is_published: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class LearnVideoResponse(LearnVideoInDB):
    """Video response with additional info"""
    owner_username: Optional[str] = None
    owner_avatar: Optional[str] = None
    channel_name: Optional[str] = None
    playlist_title: Optional[str] = None


# ============== Review Models ==============

class ReviewCreate(BaseModel):
    """Create a review"""
    target_type: ReviewTargetType
    target_id: str  # channel_id, playlist_id, or video_id
    rating: int = Field(..., ge=1, le=5)
    title: Optional[str] = Field(None, max_length=200)
    content: Optional[str] = Field(None, max_length=2000)


class ReviewInDB(BaseModel):
    """Review stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    target_type: ReviewTargetType
    target_id: str
    rating: int
    title: Optional[str] = None
    content: Optional[str] = None
    is_verified_purchase: bool = False  # True if user purchased the content
    helpful_count: int = 0
    reported: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ReviewResponse(ReviewInDB):
    """Review response with user info"""
    reviewer_username: Optional[str] = None
    reviewer_avatar: Optional[str] = None


# ============== Purchase Models ==============

class PurchaseType(str, Enum):
    VIDEO = "video"
    PLAYLIST = "playlist"
    SUBSCRIPTION = "subscription"


class PurchaseCreate(BaseModel):
    """Create a purchase record"""
    purchase_type: PurchaseType
    item_id: str  # video_id, playlist_id, or tier_id
    price_paid: float
    currency: str = "USD"


class PurchaseInDB(BaseModel):
    """Purchase stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Buyer
    seller_id: str  # Content owner
    channel_id: str
    purchase_type: PurchaseType
    item_id: str
    price_paid: float
    currency: str = "USD"
    stripe_payment_id: Optional[str] = None
    is_active: bool = True  # For subscriptions
    expires_at: Optional[datetime] = None  # For subscriptions
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PurchaseResponse(PurchaseInDB):
    """Purchase response"""
    item_title: Optional[str] = None


# ============== Channel Subscription Models ==============

class ChannelSubscriptionInDB(BaseModel):
    """Channel subscription (free follow)"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    channel_id: str
    tier_id: Optional[str] = None  # If paid subscription
    is_paid: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============== Favorite Models ==============

class FavoriteInDB(BaseModel):
    """User's favorite playlist or video"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    target_type: str  # "playlist" or "video"
    target_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ============== Admin Banner Models ==============

class LearnBannerCreate(BaseModel):
    """Create an admin banner for Learn section"""
    title: str = Field(..., min_length=1, max_length=100)
    subtitle: Optional[str] = Field(None, max_length=200)
    image_url: str
    link_type: str = "channel"  # "channel", "playlist", "external"
    link_id: Optional[str] = None  # channel_id or playlist_id
    external_url: Optional[str] = None
    order: int = 0
    is_active: bool = True


class LearnBannerUpdate(BaseModel):
    """Update a banner"""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    subtitle: Optional[str] = Field(None, max_length=200)
    image_url: Optional[str] = None
    link_type: Optional[str] = None
    link_id: Optional[str] = None
    external_url: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


class LearnBannerInDB(BaseModel):
    """Banner stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    subtitle: Optional[str] = None
    image_url: str
    link_type: str = "channel"
    link_id: Optional[str] = None
    external_url: Optional[str] = None
    order: int = 0
    is_active: bool = True
    created_by: str  # Admin user_id
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class LearnBannerResponse(LearnBannerInDB):
    """Banner response"""
    pass
