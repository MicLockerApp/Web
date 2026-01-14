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
    total_fees_collected: float  # Platform fees (3%)
    total_processing_fees_collected: float  # Payment processing fees (3.19% + $0.49)
    active_listings: int
    total_users: int
    orders_by_status: dict
    recent_orders: int
    recent_signups: int
    platform_fee_percent: float = 3.0
    payment_processing_percent: float = 3.19
    payment_processing_fixed: float = 0.49
