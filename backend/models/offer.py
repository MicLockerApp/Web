from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class NegotiationEntry(BaseModel):
    """Single entry in the negotiation history"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    role: str  # "buyer" or "seller"
    price: float
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class OfferCreate(BaseModel):
    listing_id: str
    offer_price: float = Field(..., gt=0)
    message: Optional[str] = None

class OfferCounter(BaseModel):
    counter_price: float = Field(..., gt=0)
    message: Optional[str] = None

class OfferInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    listing_id: str
    listing_title: str
    listing_price: float  # Original listing price
    listing_image: Optional[str] = None
    
    buyer_id: str
    buyer_username: str
    seller_id: str
    seller_username: str
    
    offer_price: float  # Initial offer from buyer
    counter_price: Optional[float] = None  # Latest counter price (for backwards compatibility)
    final_price: Optional[float] = None  # Accepted price
    
    message: Optional[str] = None  # Initial message
    counter_message: Optional[str] = None  # Latest counter message (for backwards compatibility)
    
    # Negotiation history - stores all back-and-forth offers
    negotiation_history: List[dict] = Field(default_factory=list)
    
    # Whose turn to respond: "buyer" or "seller"
    pending_action_from: str = "seller"  # Starts with seller (they respond to buyer's initial offer)
    
    # Status: pending, countered, accepted, declined, expired, withdrawn
    status: str = "pending"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = None  # Offers expire in 48 hours

class OfferResponse(BaseModel):
    id: str
    listing_id: str
    listing_title: str
    listing_price: float
    listing_image: Optional[str] = None
    buyer_id: str
    buyer_username: str
    seller_id: str
    seller_username: str
    offer_price: float
    counter_price: Optional[float] = None
    final_price: Optional[float] = None
    message: Optional[str] = None
    counter_message: Optional[str] = None
    negotiation_history: List[dict] = []
    pending_action_from: str = "seller"
    status: str
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
