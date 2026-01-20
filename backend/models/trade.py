"""
Trade Model for MicLocker Marketplace

Handles direct item swaps between users with no platform fees.
Users are limited to 1 trade per month.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
import uuid


class TradeItem(BaseModel):
    """An item being offered in a trade"""
    listing_id: str
    listing_title: str
    listing_price: float  # Original listing price for reference
    listing_image: Optional[str] = None
    owner_id: str
    owner_username: str


class TradeCreate(BaseModel):
    """Request to initiate a trade"""
    my_listing_id: str  # What you're offering
    their_listing_id: str  # What you want


class TradeResponse(BaseModel):
    """Accept or counter a trade"""
    action: Literal["accept", "decline", "counter"]
    counter_listing_id: Optional[str] = None  # If countering with different item


class TradeShippingAddress(BaseModel):
    """Shipping address for a trade"""
    full_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "USA"
    phone: Optional[str] = None


class TradeTracking(BaseModel):
    """Tracking info for one side of a trade"""
    carrier: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    shipped_at: Optional[datetime] = None
    estimated_delivery: Optional[str] = None


class TradeInDB(BaseModel):
    """Trade stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    trade_number: str = Field(default_factory=lambda: f"TR-{str(uuid.uuid4())[:8].upper()}")
    
    # Initiator (user who proposed the trade)
    initiator_id: str
    initiator_username: str
    initiator_item: TradeItem
    initiator_shipping_address: Optional[TradeShippingAddress] = None
    initiator_tracking: Optional[TradeTracking] = None
    initiator_shipped: bool = False
    initiator_received: bool = False
    initiator_confirmed_receipt: bool = False
    
    # Recipient (user who received the trade proposal)
    recipient_id: str
    recipient_username: str
    recipient_item: TradeItem
    recipient_shipping_address: Optional[TradeShippingAddress] = None
    recipient_tracking: Optional[TradeTracking] = None
    recipient_shipped: bool = False
    recipient_received: bool = False
    recipient_confirmed_receipt: bool = False
    
    # Trade status
    status: str = "pending"  # pending, accepted, declined, shipped, completed, cancelled, disputed
    
    # Counters tracking
    counter_count: int = 0
    last_counter_by: Optional[str] = None
    
    # Messages/notes
    initiator_message: Optional[str] = None
    recipient_message: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Reviews
    initiator_reviewed: bool = False
    recipient_reviewed: bool = False


class TradeListResponse(BaseModel):
    """Trade response for listing"""
    id: str
    trade_number: str
    initiator_id: str
    initiator_username: str
    initiator_item: TradeItem
    recipient_id: str
    recipient_username: str
    recipient_item: TradeItem
    status: str
    created_at: datetime
    updated_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


# Trade status flow:
# 1. pending - Trade proposed, waiting for recipient response
# 2. countered - Recipient countered with different item
# 3. accepted - Both parties agreed, awaiting shipping addresses
# 4. addresses_submitted - Both submitted addresses, ready to ship
# 5. shipping - At least one party has shipped
# 6. delivered - Both items delivered, awaiting confirmations
# 7. completed - Both confirmed receipt, trade done
# 8. declined - Recipient declined
# 9. cancelled - Either party cancelled before completion
# 10. disputed - Issue raised, support ticket created
