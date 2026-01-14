from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class CartItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    listing_id: str
    quantity: int = 1
    
    # Snapshot of listing data at time of adding
    listing_title: str
    listing_price: float
    listing_image: Optional[str] = None
    seller_id: str
    seller_username: str
    shipping_cost: float = 0.0
    
    added_at: datetime = Field(default_factory=datetime.utcnow)

class CartItemCreate(BaseModel):
    listing_id: str
    quantity: int = 1

class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)

class CartResponse(BaseModel):
    items: List[CartItem]
    subtotal: float
    shipping_total: float
    total: float
    item_count: int
