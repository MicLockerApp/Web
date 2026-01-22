from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

# Listing Categories
LISTING_CATEGORIES = [
    "Guitars", "Bass", "Keyboards & Synths", "Drums & Percussion",
    "Pro Audio", "Recording Equipment", "Microphones", "DJ Equipment",
    "Studio Monitors", "Headphones", "Cables & Connectors", "Effects Pedals",
    "Amplifiers", "Wind Instruments", "String Instruments", "Accessories",
    "Cases & Bags", "Stands & Mounts", "Software & Plugins", "Other"
]

# Conditions
LISTING_CONDITIONS = [
    "Brand New", "Mint", "Excellent", "Very Good", "Good", "Fair", "Poor"
]

class ListingMedia(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    media_type: str  # "image" or "video"
    is_primary: bool = False
    order: int = 0

class PaymentPlan(BaseModel):
    enabled: bool = False
    num_payments: int = 4
    down_payment_percent: float = 25.0

class ShippingOption(BaseModel):
    method: str = "Standard"
    price: float = 0.0
    estimated_days: Optional[str] = None

class S3MediaItem(BaseModel):
    """Media item from S3 upload"""
    url: str
    key: Optional[str] = None
    type: str  # "image" or "video"
    is_primary: bool = False

class ListingCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10)
    brand: Optional[str] = None
    model: Optional[str] = None
    category: str
    condition: str
    price: float = Field(..., gt=0)
    quantity: int = Field(default=1, ge=1)
    accepts_offers: bool = True
    shipping: Optional[ShippingOption] = None
    payment_plan: Optional[PaymentPlan] = None
    tags: Optional[List[str]] = None
    media: Optional[List[S3MediaItem]] = None  # S3 uploaded media

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    accepts_offers: Optional[bool] = None
    shipping: Optional[ShippingOption] = None
    payment_plan: Optional[PaymentPlan] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    media: Optional[List[dict]] = None  # Allow updating media array

class ListingInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    seller_id: str
    seller_username: str
    title: str
    description: str
    brand: Optional[str] = None
    model: Optional[str] = None
    category: str
    condition: str
    price: float
    quantity: int = 1
    sold_quantity: int = 0
    accepts_offers: bool = True
    
    media: List[ListingMedia] = []
    shipping: ShippingOption = Field(default_factory=ShippingOption)
    payment_plan: PaymentPlan = Field(default_factory=PaymentPlan)
    tags: List[str] = []
    
    status: str = "active"  # active, sold, draft, removed
    view_count: int = 0
    favorite_count: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ListingResponse(BaseModel):
    id: str
    seller_id: str
    seller_username: str
    title: str
    description: str
    brand: Optional[str] = None
    model: Optional[str] = None
    category: str
    condition: str
    price: float
    quantity: int
    sold_quantity: int = 0
    accepts_offers: bool
    media: List[ListingMedia]
    shipping: ShippingOption
    payment_plan: PaymentPlan
    tags: List[str]
    status: str
    view_count: int
    favorite_count: int
    created_at: datetime
    updated_at: datetime
    seller_rating: Optional[float] = None

class ListingSearchQuery(BaseModel):
    q: Optional[str] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    brand: Optional[str] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    seller_id: Optional[str] = None
    sort_by: str = "created_at"
    sort_order: str = "desc"
    page: int = 1
    limit: int = 20
