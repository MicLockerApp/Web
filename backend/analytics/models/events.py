"""Analytics Event Taxonomy and Schemas

This module defines the complete event taxonomy for MicLocker analytics.
All events are immutable, schema-validated, and append-only.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime
from enum import Enum
import uuid


class ActorType(str, Enum):
    """Types of actors that can emit events"""
    BUYER = "buyer"
    SELLER = "seller"
    ADMIN = "admin"
    SYSTEM = "system"
    ANONYMOUS = "anonymous"


class EventCategory(str, Enum):
    """High-level event categories"""
    USER_SESSION = "user_session"
    SEARCH_DISCOVERY = "search_discovery"
    COMMERCE = "commerce"
    OFFERS = "offers"
    MESSAGING = "messaging"
    ADMIN_MODERATION = "admin_moderation"
    SYSTEM = "system"


class EventTypes:
    """Strict event type constants - the single source of truth for event names"""
    
    # User & Session Events
    USER_REGISTERED = "user.registered"
    USER_LOGGED_IN = "user.logged_in"
    USER_LOGGED_OUT = "user.logged_out"
    SESSION_STARTED = "session.started"
    SESSION_ENDED = "session.ended"
    PROFILE_UPDATED = "user.profile_updated"
    
    # Search & Discovery Events
    SEARCH_PERFORMED = "search.performed"
    SEARCH_ZERO_RESULTS = "search.zero_results"
    LISTING_VIEWED = "listing.viewed"
    LISTING_FAVORITED = "listing.favorited"
    LISTING_UNFAVORITED = "listing.unfavorited"
    LISTING_SHARED = "listing.shared"
    CATEGORY_VIEWED = "category.viewed"
    
    # Commerce Events
    LISTING_CREATED = "listing.created"
    LISTING_UPDATED = "listing.updated"
    LISTING_DELETED = "listing.deleted"
    CART_ITEM_ADDED = "cart.item_added"
    CART_ITEM_REMOVED = "cart.item_removed"
    CART_ITEM_UPDATED = "cart.item_updated"
    CHECKOUT_STARTED = "checkout.started"
    CHECKOUT_COMPLETED = "checkout.completed"
    CHECKOUT_ABANDONED = "checkout.abandoned"
    PURCHASE_COMPLETED = "purchase.completed"
    PAYMENT_FAILED = "payment.failed"
    ORDER_STATUS_CHANGED = "order.status_changed"
    REFUND_INITIATED = "refund.initiated"
    REFUND_COMPLETED = "refund.completed"
    
    # Offer Events
    OFFER_CREATED = "offer.created"
    OFFER_COUNTERED = "offer.countered"
    OFFER_ACCEPTED = "offer.accepted"
    OFFER_DECLINED = "offer.declined"
    OFFER_WITHDRAWN = "offer.withdrawn"
    OFFER_EXPIRED = "offer.expired"
    OFFER_CONVERTED = "offer.converted_to_purchase"
    
    # Messaging Events
    MESSAGE_SENT = "message.sent"
    MESSAGE_READ = "message.read"
    CONVERSATION_STARTED = "conversation.started"
    
    # Admin & Moderation Events
    LISTING_FLAGGED = "moderation.listing_flagged"
    LISTING_REMOVED = "moderation.listing_removed"
    USER_FLAGGED = "moderation.user_flagged"
    USER_SUSPENDED = "moderation.user_suspended"
    USER_UNSUSPENDED = "moderation.user_unsuspended"
    DISPUTE_OPENED = "moderation.dispute_opened"
    DISPUTE_RESOLVED = "moderation.dispute_resolved"
    
    # System Events
    SYSTEM_ERROR = "system.error"
    API_REQUEST = "system.api_request"


class BaseAnalyticsEvent(BaseModel):
    """Base schema for all analytics events - immutable and append-only"""
    
    # Event identification
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: str = Field(..., description="Event type from EventTypes")
    event_category: EventCategory
    event_version: str = Field(default="1.0", description="Schema version for evolution")
    
    # Temporal
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    
    # Actor information
    actor_type: ActorType
    actor_id: Optional[str] = Field(None, description="User ID if authenticated")
    actor_username: Optional[str] = None
    
    # Session/Attribution
    session_id: Optional[str] = None
    device_type: Optional[str] = None  # mobile, tablet, desktop
    user_agent: Optional[str] = None
    ip_hash: Optional[str] = None  # Hashed for privacy
    referrer: Optional[str] = None
    
    # UTM Attribution (for marketing)
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_term: Optional[str] = None
    utm_content: Optional[str] = None
    ga_client_id: Optional[str] = None  # GA4 client ID
    
    # Entity references
    listing_id: Optional[str] = None
    order_id: Optional[str] = None
    offer_id: Optional[str] = None
    message_thread_id: Optional[str] = None
    target_user_id: Optional[str] = None  # For events involving another user
    
    # Structured metadata payload
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        extra = "forbid"  # Strict schema validation


# ============= Specific Event Types =============

class UserRegisteredEvent(BaseAnalyticsEvent):
    """User completed registration"""
    event_type: Literal["user.registered"] = EventTypes.USER_REGISTERED
    event_category: EventCategory = EventCategory.USER_SESSION
    # metadata should include: category (musician/engineer/etc), has_lifetime_free_fees


class UserLoggedInEvent(BaseAnalyticsEvent):
    """User logged in"""
    event_type: Literal["user.logged_in"] = EventTypes.USER_LOGGED_IN
    event_category: EventCategory = EventCategory.USER_SESSION


class SearchPerformedEvent(BaseAnalyticsEvent):
    """User performed a search"""
    event_type: Literal["search.performed"] = EventTypes.SEARCH_PERFORMED
    event_category: EventCategory = EventCategory.SEARCH_DISCOVERY
    # metadata should include: query, filters, result_count, categories


class ListingViewedEvent(BaseAnalyticsEvent):
    """User viewed a listing detail page"""
    event_type: Literal["listing.viewed"] = EventTypes.LISTING_VIEWED
    event_category: EventCategory = EventCategory.SEARCH_DISCOVERY
    listing_id: str
    # metadata should include: listing_price, category, seller_id, source (search/browse/direct)


class CartItemAddedEvent(BaseAnalyticsEvent):
    """User added item to cart"""
    event_type: Literal["cart.item_added"] = EventTypes.CART_ITEM_ADDED
    event_category: EventCategory = EventCategory.COMMERCE
    listing_id: str
    # metadata should include: listing_price, quantity, category


class CheckoutStartedEvent(BaseAnalyticsEvent):
    """User started checkout process"""
    event_type: Literal["checkout.started"] = EventTypes.CHECKOUT_STARTED
    event_category: EventCategory = EventCategory.COMMERCE
    # metadata should include: cart_total, item_count, from_offer


class PurchaseCompletedEvent(BaseAnalyticsEvent):
    """Purchase was successfully completed"""
    event_type: Literal["purchase.completed"] = EventTypes.PURCHASE_COMPLETED
    event_category: EventCategory = EventCategory.COMMERCE
    order_id: str
    # metadata should include: subtotal, shipping, platform_fee, total, items, payment_method, from_offer


class OfferCreatedEvent(BaseAnalyticsEvent):
    """Buyer created an offer"""
    event_type: Literal["offer.created"] = EventTypes.OFFER_CREATED
    event_category: EventCategory = EventCategory.OFFERS
    offer_id: str
    listing_id: str
    target_user_id: str  # Seller
    # metadata should include: offer_price, listing_price, discount_percent


class OfferAcceptedEvent(BaseAnalyticsEvent):
    """Offer was accepted"""
    event_type: Literal["offer.accepted"] = EventTypes.OFFER_ACCEPTED
    event_category: EventCategory = EventCategory.OFFERS
    offer_id: str
    listing_id: str
    # metadata should include: final_price, original_price, negotiation_rounds


class MessageSentEvent(BaseAnalyticsEvent):
    """User sent a message"""
    event_type: Literal["message.sent"] = EventTypes.MESSAGE_SENT
    event_category: EventCategory = EventCategory.MESSAGING
    message_thread_id: str
    target_user_id: str
    # metadata should include: is_first_message, has_listing_context


# ============= Event Factory =============

def create_event(event_type: str, **kwargs) -> BaseAnalyticsEvent:
    """Factory function to create properly typed events"""
    event_map = {
        EventTypes.USER_REGISTERED: UserRegisteredEvent,
        EventTypes.USER_LOGGED_IN: UserLoggedInEvent,
        EventTypes.SEARCH_PERFORMED: SearchPerformedEvent,
        EventTypes.LISTING_VIEWED: ListingViewedEvent,
        EventTypes.CART_ITEM_ADDED: CartItemAddedEvent,
        EventTypes.CHECKOUT_STARTED: CheckoutStartedEvent,
        EventTypes.PURCHASE_COMPLETED: PurchaseCompletedEvent,
        EventTypes.OFFER_CREATED: OfferCreatedEvent,
        EventTypes.OFFER_ACCEPTED: OfferAcceptedEvent,
        EventTypes.MESSAGE_SENT: MessageSentEvent,
    }
    
    event_class = event_map.get(event_type, BaseAnalyticsEvent)
    return event_class(event_type=event_type, **kwargs)
