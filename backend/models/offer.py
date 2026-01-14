from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid

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
    
    offer_price: float
    counter_price: Optional[float] = None
    final_price: Optional[float] = None  # Accepted price
    
    message: Optional[str] = None
    counter_message: Optional[str] = None
    
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
    status: str
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
