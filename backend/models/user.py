from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

# User Categories
USER_CATEGORIES = ["musician", "audio_engineer", "recording_studio", "venue", "merchant"]

# Musician Instruments
MUSICIAN_INSTRUMENTS = [
    "Accordion", "Acoustic Guitar", "Bagpipe", "Banjo", "Bass Electric", "Bass Fretless",
    "Bass Upright", "Bassoon", "Beat Makers", "Cello", "Clarinet", "Classical Guitar",
    "Composer Orchestral", "Dobro", "Electric Guitar", "Fiddle", "Flutes", "French Horn",
    "Harmonica", "Harp", "Horns", "Keyboards Synths", "Mandolin", "Oboe", "Pedal Steel",
    "Percussion", "Piano", "Rapper", "Saxophone", "Singer Female", "Singer Male",
    "Timpani", "Trombone", "Trumpet", "Tuba", "Ukulele", "Viola", "Violin"
]

# Audio Engineer Specializations (Cello removed per user request)
AUDIO_ENGINEER_SPECS = [
    "Boom Operator", "Dialogue Editing", "Dolby Atmos & Immersive Audio",
    "Editing", "Film Composers", "Full Instrumental Productions", "Game Audio",
    "Ghost Producers", "Live Drum Tracks", "Live Sound", "Mastering Engineers",
    "Mixing Engineers", "Podcast Editing & Mastering", "Pop Rock Arranger",
    "Post Editing", "Post Mixing", "Producers", "Production Sound Mixer",
    "Programmed Drums", "Remixing", "Restoration", "Session Conversion",
    "Songwriter Lyrics", "Songwriter Music", "Sound Design", "String Arranger",
    "Surround 5.1 Mixing", "Time Alignment Quantizing", "Top Line Writer (Vocal Melody)",
    "Track Minus Top Line", "Vocal Comping", "Vocal Tuning", "You Tube Cover Recording"
]

# Recording Studio Offerings
RECORDING_STUDIO_OFFERINGS = [
    "Beat Makers", "Boom Operator", "Composer Orchestral", "Dialogue Editing",
    "Dolby Atmos & Immersive Audio", "Editing", "Film Composers",
    "Full Instrumental Productions", "Game Audio", "Ghost Producers",
    "Live Drum Tracks", "Mastering Engineers", "Mixing Engineers",
    "Podcast Editing & Mastering", "Pop Rock Arranger", "Post Editing",
    "Post Mixing", "Producers", "Production Sound Mixer", "Programmed Drums",
    "Recording Studios", "Rehearsal Rooms", "Remixing", "Restoration",
    "Session Conversion", "Session Dj", "Singer Female", "Singer Male",
    "Songwriter Lyrics", "Songwriter Music", "Sound Design", "String Arranger",
    "String Section", "Surround 5.1 Mixing", "Time Alignment Quantizing",
    "Top Line Writer (Vocal Melody)", "Track Minus Top Line", "Vocal Comping",
    "Vocal Tuning", "You Tube Cover Recording"
]

# Music Genres
MUSIC_GENRES = [
    "Rock", "Pop", "Hip Hop", "R&B", "Jazz", "Blues", "Country", "Electronic",
    "Classical", "Folk", "Reggae", "Metal", "Punk", "Soul", "Funk", "Latin",
    "World Music", "Gospel", "Indie", "Alternative", "Other"
]

# Merchant Product Types
MERCHANT_PRODUCT_TYPES = [
    "Shirts", "Pants", "Shorts", "Jackets", "Hoodies", "Hats", "Caps",
    "Shoes", "Boots", "Socks", "Accessories", "Bags", "Backpacks",
    "Vinyl Records", "CDs", "Posters", "Stickers", "Patches", "Pins",
    "Guitar Picks", "Drumsticks", "Straps", "Cases", "Stands",
    "Cables", "Strings", "Picks", "Capos", "Tuners", "Other Merchandise"
]

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    first_name: str = Field(..., min_length=1, max_length=50, description="First name is required")
    last_name: str = Field(..., min_length=1, max_length=50, description="Last name is required")

class UserCategoryUpdate(BaseModel):
    category: str
    # Sub-categories - users can have secondary roles
    sub_categories: Optional[List[str]] = None
    # Musician fields
    genre: Optional[str] = None  # Keep for backward compatibility
    genres: Optional[List[str]] = None  # New multi-select genres
    instruments: Optional[List[str]] = None
    # Audio Engineer fields
    specializations: Optional[List[str]] = None
    # Recording Studio fields
    studio_offerings: Optional[List[str]] = None
    # Venue fields
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[str] = None
    # Merchant fields
    merchant_products: Optional[List[str]] = None
    business_name: Optional[str] = None
    # Contact info (optional during registration)
    phone: Optional[str] = None
    shipping_address: Optional[dict] = None
    physical_address: Optional[dict] = None  # Physical/business address
    same_as_mailing: Optional[bool] = None  # Whether physical = mailing

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    category: Optional[str] = None
    sub_categories: Optional[List[str]] = None
    genre: Optional[str] = None
    genres: Optional[List[str]] = None
    instruments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    studio_offerings: Optional[List[str]] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[str] = None
    merchant_products: Optional[List[str]] = None
    business_name: Optional[str] = None
    # Contact information
    phone: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    soundcloud: Optional[str] = None
    spotify: Optional[str] = None
    # Shipping address (mailing)
    shipping_address: Optional[dict] = None
    # Physical address
    physical_address: Optional[dict] = None
    same_as_mailing: Optional[bool] = None
    # Privacy settings
    show_email: Optional[bool] = None
    show_phone: Optional[bool] = None
    show_address: Optional[bool] = None
    show_social: Optional[bool] = None
    show_physical_address: Optional[bool] = None

class UserInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    category: Optional[str] = None
    sub_categories: Optional[List[str]] = None
    is_admin: bool = False
    is_first_user: bool = False
    is_suspended: bool = False
    profile_completed: bool = False
    email_verified: bool = False  # Email verification status
    # Lifetime 0% platform fee for first 300 users
    has_lifetime_free_fees: bool = False
    # Gold Member badge for first 300 users
    is_gold_member: bool = False
    signup_number: Optional[int] = None  # Track signup order
    # Employee system - employees don't count toward user count
    is_employee: bool = False
    # Employee role: 'admin', 'manager', 'employee' (only applies if is_admin or is_employee)
    employee_role: Optional[str] = None
    
    # Profile fields
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    
    # Contact information
    phone: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    soundcloud: Optional[str] = None
    spotify: Optional[str] = None
    
    # Category-specific fields
    genre: Optional[str] = None  # Keep for backward compatibility
    genres: Optional[List[str]] = None  # New multi-select genres
    instruments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    studio_offerings: Optional[List[str]] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[str] = None
    merchant_products: Optional[List[str]] = None
    business_name: Optional[str] = None
    
    # Favorites
    favorites: Optional[List[str]] = None  # List of listing IDs
    
    # Shipping address
    shipping_address: Optional[dict] = None  # {address_line1, address_line2, city, state, postal_code, country}
    
    # Physical address
    physical_address: Optional[dict] = None  # Same structure as shipping_address
    same_as_mailing: bool = False  # Whether physical address is same as mailing
    
    # Privacy settings
    show_email: bool = False
    show_phone: bool = False
    show_address: bool = False
    show_social: bool = True  # Default to showing social media
    show_physical_address: bool = False  # Default to NOT showing physical address
    
    # Role hierarchy: owner > admin > manager > employee > user
    role: str = "user"  # owner, admin, manager, employee, user
    
    # Stats
    rating: float = 0.0
    review_count: int = 0
    total_sales: int = 0
    total_purchases: int = 0  # Track completed purchases
    
    # Special badges
    is_founder: bool = False
    is_gold_member: bool = False
    
    # Review Gating - Enhanced system
    pending_review_order_id: Optional[str] = None  # Order that needs review
    pending_review_type: Optional[str] = None  # "buyer" or "seller"
    pending_review_locked: bool = False  # Site functionality locked until review
    must_submit_ticket_order_id: Optional[str] = None  # Order requiring support ticket (14-day non-receipt)
    first_purchase_completed: bool = False
    first_sale_completed: bool = False
    
    # Trading System - 1 free trade per month
    last_trade_date: Optional[datetime] = None
    trades_this_month: int = 0
    has_seen_trade_rules: bool = False
    
    # Stripe Connect for seller payouts
    stripe_connect_account_id: Optional[str] = None
    stripe_connect_status: Optional[str] = None  # pending, complete, disabled
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    category: Optional[str] = None
    sub_categories: Optional[List[str]] = None
    role: str = "user"  # owner, admin, manager, employee, user
    is_admin: bool = False
    is_employee: bool = False
    employee_role: Optional[str] = None
    profile_completed: bool = False
    email_verified: bool = False
    has_lifetime_free_fees: bool = False
    is_gold_member: bool = False
    is_founder: bool = False
    signup_number: Optional[int] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    # Contact info
    phone: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    soundcloud: Optional[str] = None
    spotify: Optional[str] = None
    # Category fields
    genre: Optional[str] = None  # Backward compatibility
    genres: Optional[List[str]] = None  # New multi-select genres
    instruments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    studio_offerings: Optional[List[str]] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[str] = None
    merchant_products: Optional[List[str]] = None
    business_name: Optional[str] = None
    # Favorites
    favorites: Optional[List[str]] = None
    # Shipping address
    shipping_address: Optional[dict] = None
    # Physical address
    physical_address: Optional[dict] = None
    same_as_mailing: bool = False
    # Privacy settings
    show_email: bool = False
    show_phone: bool = False
    show_address: bool = False
    show_social: bool = True
    show_physical_address: bool = False
    # Stats
    rating: float = 0.0
    review_count: int = 0
    total_sales: int = 0
    total_purchases: int = 0
    # Review gating
    pending_review_order_id: Optional[str] = None
    pending_review_type: Optional[str] = None
    first_purchase_completed: bool = False
    first_sale_completed: bool = False
    # Trading
    last_trade_date: Optional[datetime] = None
    trades_this_month: int = 0
    has_seen_trade_rules: bool = False
    # Stripe Connect
    stripe_connect_account_id: Optional[str] = None
    stripe_connect_status: Optional[str] = None
    created_at: datetime

class UserPublicProfile(BaseModel):
    id: str
    username: str
    email: Optional[str] = None  # Show email on profile
    category: Optional[str] = None
    sub_categories: Optional[List[str]] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    # Contact info (public)
    phone: Optional[str] = None
    website: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    youtube: Optional[str] = None
    soundcloud: Optional[str] = None
    spotify: Optional[str] = None
    # Shipping address
    shipping_address: Optional[dict] = None
    # Physical address
    physical_address: Optional[dict] = None
    same_as_mailing: bool = False
    # Category fields
    genre: Optional[str] = None  # Backward compatibility
    genres: Optional[List[str]] = None  # New multi-select genres
    instruments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    studio_offerings: Optional[List[str]] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    merchant_products: Optional[List[str]] = None
    business_name: Optional[str] = None
    # Privacy settings
    show_email: bool = False
    show_phone: bool = False
    show_address: bool = False
    show_social: bool = True
    show_physical_address: bool = False
    # Stats
    rating: float = 0.0
    review_count: int = 0
    total_sales: int = 0
    total_purchases: int = 0
    # Special badges
    is_founder: bool = False
    is_gold_member: bool = False
    # Review gating
    pending_review_order_id: Optional[str] = None
    pending_review_type: Optional[str] = None
    first_purchase_completed: bool = False
    first_sale_completed: bool = False
    # Trading
    last_trade_date: Optional[datetime] = None
    trades_this_month: int = 0
    has_seen_trade_rules: bool = False
    # Stripe Connect
    stripe_connect_account_id: Optional[str] = None
    stripe_connect_status: Optional[str] = None
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetVerify(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class PasswordResetCode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    used: bool = False
