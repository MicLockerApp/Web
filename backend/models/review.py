from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

class ReviewCreate(BaseModel):
    order_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)

class ReviewInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    listing_id: str
    listing_title: str
    
    buyer_id: str
    buyer_username: str
    seller_id: str
    seller_username: str
    
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewResponse(BaseModel):
    id: str
    order_id: str
    listing_id: str
    listing_title: str
    buyer_id: str
    buyer_username: str
    seller_id: str
    rating: int
    comment: Optional[str] = None
    created_at: datetime

# Admin Analytics Models
class AdminAnalytics(BaseModel):
    total_gmv: float  # Gross Merchandise Value
    total_fees_collected: float
    active_listings: int
    total_users: int
    orders_by_status: dict
    recent_orders: int
    recent_signups: int
