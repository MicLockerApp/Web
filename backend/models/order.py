from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

class OrderItem(BaseModel):
    listing_id: str
    listing_title: str
    listing_price: float
    listing_image: Optional[str] = None
    quantity: int = 1
    shipping_cost: float = 0.0
    seller_id: str
    seller_username: str

class ShippingAddress(BaseModel):
    full_name: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "USA"
    phone: Optional[str] = None

class PaymentInfo(BaseModel):
    method: str = "card"  # card, paypal, etc.
    card_last_four: Optional[str] = None
    transaction_id: Optional[str] = None

class OrderCreate(BaseModel):
    shipping_address: ShippingAddress
    payment_method: str = "card"
    offer_id: Optional[str] = None  # If ordering from accepted offer

class OrderInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ML-{str(uuid.uuid4())[:8].upper()}")
    buyer_id: str
    buyer_username: str
    
    items: List[OrderItem]
    shipping_address: ShippingAddress
    payment_info: PaymentInfo
    
    # Pricing
    subtotal: float
    shipping_total: float
    platform_fee: float  # 3% of subtotal (goes to MicLocker)
    payment_processing_fee: float = 0.0  # 3.19% + $0.49 (goes to payment processor)
    total: float
    
    # Status tracking
    status: str = "pending"  # pending, paid, shipped, delivered, completed, cancelled, refunded
    
    # Offer reference if applicable
    offer_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class OrderResponse(BaseModel):
    id: str
    order_number: str
    buyer_id: str
    buyer_username: str
    items: List[OrderItem]
    shipping_address: ShippingAddress
    subtotal: float
    shipping_total: float
    platform_fee: float
    payment_processing_fee: float = 0.0
    total: float
    status: str
    offer_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    paid_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
