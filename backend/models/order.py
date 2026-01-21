from pydantic import BaseModel, Field
from typing import Optional, List, Literal
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
    stripe_session_id: Optional[str] = None
    stripe_payment_intent_id: Optional[str] = None
    funds_status: str = "pending"  # pending, held, released, refunded

class TrackingInfo(BaseModel):
    carrier: Optional[str] = None  # USPS, UPS, FedEx, DHL, etc.
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    shipped_at: Optional[datetime] = None
    estimated_delivery: Optional[str] = None

class ItemConditionReport(BaseModel):
    """Buyer's report on item condition upon receipt"""
    received_as_described: bool = True
    condition_notes: Optional[str] = None
    has_issues: bool = False
    issue_type: Optional[str] = None  # damaged, not_as_described, missing_parts, other
    reported_at: Optional[datetime] = None

class OrderCreate(BaseModel):
    shipping_address: ShippingAddress
    payment_method: str = "card"
    offer_id: Optional[str] = None  # If ordering from accepted offer
    is_trade: bool = False  # If this is a trade transaction

class OrderInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"ML-{str(uuid.uuid4())[:8].upper()}")
    buyer_id: str
    buyer_username: str
    buyer_email: Optional[str] = None
    
    items: List[OrderItem]
    shipping_address: ShippingAddress
    payment_info: PaymentInfo
    tracking_info: Optional[TrackingInfo] = None
    
    # Pricing
    subtotal: float
    shipping_total: float
    platform_fee: float  # 3% of subtotal (goes to MicLocker) - 0% for trades
    payment_processing_fee: float = 0.0  # 2.9% + $0.30 (goes to payment processor)
    total: float
    
    # Trade order flag
    is_trade: bool = False
    trade_id: Optional[str] = None
    
    # Seller payout info
    seller_payout_amount: float = 0.0  # Amount seller receives after fees
    seller_payout_status: str = "pending"  # pending, held, released, paid
    
    # Status tracking
    status: str = "pending"  # pending, awaiting_payment, paid, shipped, delivered, completed, cancelled, refunded
    
    # Stripe session for checkout
    stripe_session_id: Optional[str] = None
    
    # Offer reference if applicable
    offer_id: Optional[str] = None
    
    # Notifications sent
    seller_notified: bool = False
    buyer_notified: bool = False
    five_day_reminder_sent: bool = False  # Track if 5-day reminder was sent
    
    # Item condition report from buyer
    item_condition_report: Optional[ItemConditionReport] = None
    
    # Review tracking
    buyer_review_submitted: bool = False
    seller_review_submitted: bool = False
    
    # Auto-confirmation tracking
    auto_confirmed: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    paid_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    funds_released_at: Optional[datetime] = None

class OrderResponse(BaseModel):
    id: str
    order_number: str
    buyer_id: str
    buyer_username: str
    items: List[OrderItem]
    shipping_address: ShippingAddress
    tracking_info: Optional[TrackingInfo] = None
    subtotal: float
    shipping_total: float
    platform_fee: float
    payment_processing_fee: float = 0.0
    total: float
    is_trade: bool = False
    seller_payout_amount: float = 0.0
    seller_payout_status: str = "pending"
    status: str
    stripe_session_id: Optional[str] = None
    offer_id: Optional[str] = None
    item_condition_report: Optional[ItemConditionReport] = None
    buyer_review_submitted: bool = False
    seller_review_submitted: bool = False
    auto_confirmed: bool = False
    created_at: datetime
    updated_at: datetime
    paid_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    funds_released_at: Optional[datetime] = None

class OrderStatusUpdate(BaseModel):
    status: str
    tracking_number: Optional[str] = None
    tracking_carrier: Optional[str] = None

class TrackingUpdate(BaseModel):
    carrier: str  # USPS, UPS, FedEx, DHL, Other
    tracking_number: str
    estimated_delivery: Optional[str] = None

class ConditionReportCreate(BaseModel):
    """Create a condition report when confirming delivery"""
    received_as_described: bool
    condition_notes: Optional[str] = None
    has_issues: bool = False
    issue_type: Optional[str] = None  # damaged, not_as_described, missing_parts, other

