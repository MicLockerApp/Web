from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
import uuid

# Item condition options for buyers reporting item state
ITEM_CONDITION_OPTIONS = [
    "as_described",      # Item exactly as described
    "minor_issues",      # Small cosmetic or minor functional differences
    "significantly_different",  # Major differences from description
    "damaged"            # Item arrived damaged
]


class ItemConditionReport(BaseModel):
    """Buyer's report on item condition during review"""
    condition: str = "as_described"  # One of ITEM_CONDITION_OPTIONS
    notes: Optional[str] = None  # Optional details about condition


class ReviewCreate(BaseModel):
    order_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)
    review_type: Literal["buyer_to_seller", "seller_to_buyer"] = "buyer_to_seller"
    # Item condition (only for buyer_to_seller reviews)
    item_condition: Optional[str] = None  # as_described, minor_issues, significantly_different, damaged
    condition_notes: Optional[str] = None

class ReviewInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    listing_id: str
    listing_title: str
    
    # The reviewer (who wrote the review)
    reviewer_id: str
    reviewer_username: str
    reviewer_role: str  # "buyer" or "seller"
    
    # The reviewee (who is being reviewed)
    reviewee_id: str
    reviewee_username: str
    reviewee_role: str  # "buyer" or "seller"
    
    # Legacy fields for backwards compatibility
    buyer_id: str
    buyer_username: str
    seller_id: str
    seller_username: str
    
    rating: int  # 1-5 stars
    comment: Optional[str] = None
    review_type: str = "buyer_to_seller"  # "buyer_to_seller" or "seller_to_buyer"
    
    # Item condition reporting (only for buyer_to_seller reviews)
    item_condition: Optional[str] = None  # as_described, minor_issues, significantly_different, damaged
    condition_notes: Optional[str] = None
    
    # Reviews are always public and cannot be hidden
    is_public: bool = True
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewResponse(BaseModel):
    id: str
    order_id: str
    listing_id: str
    listing_title: str
    reviewer_id: str
    reviewer_username: str
    reviewer_role: str
    reviewee_id: str
    reviewee_username: str
    reviewee_role: str
    buyer_id: str
    buyer_username: str
    seller_id: str
    seller_username: str
    rating: int
    comment: Optional[str] = None
    review_type: str
    item_condition: Optional[str] = None
    condition_notes: Optional[str] = None
    is_public: bool = True
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
