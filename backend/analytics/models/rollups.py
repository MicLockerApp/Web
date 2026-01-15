"""Analytics Rollup/Aggregation Schemas

These models represent pre-computed aggregations stored for fast dashboard queries.
Rollups are computed from raw events by background jobs.
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime, date
from enum import Enum
import uuid


class RollupPeriod(str, Enum):
    """Time period for rollups"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class BaseRollup(BaseModel):
    """Base schema for all rollup documents"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rollup_type: str
    period: RollupPeriod
    period_start: datetime
    period_end: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    reprocessed_at: Optional[datetime] = None
    
    class Config:
        extra = "allow"


# ============= Revenue & Commerce Rollups =============

class RevenueRollup(BaseRollup):
    """Revenue metrics rollup"""
    rollup_type: str = "revenue"
    
    # Core revenue metrics
    gross_merchandise_value: float = 0.0  # GMV - total value of goods sold
    platform_fees_collected: float = 0.0  # 3% take
    processing_fees_collected: float = 0.0  # Payment processor fees
    net_platform_revenue: float = 0.0  # Total fees
    seller_payouts: float = 0.0  # GMV - fees
    
    # Order metrics
    order_count: int = 0
    average_order_value: float = 0.0
    
    # Breakdown by category
    revenue_by_category: Dict[str, float] = Field(default_factory=dict)
    orders_by_category: Dict[str, int] = Field(default_factory=dict)
    
    # Shipping
    total_shipping_revenue: float = 0.0


class OfferFunnelRollup(BaseRollup):
    """Offer funnel metrics rollup"""
    rollup_type: str = "offer_funnel"
    
    # Funnel stages
    offers_created: int = 0
    offers_countered: int = 0
    offers_accepted: int = 0
    offers_declined: int = 0
    offers_withdrawn: int = 0
    offers_expired: int = 0
    offers_converted_to_purchase: int = 0
    
    # Conversion rates (stored as decimals 0-1)
    created_to_countered_rate: float = 0.0
    created_to_accepted_rate: float = 0.0
    accepted_to_purchase_rate: float = 0.0
    
    # Timing metrics (in hours)
    avg_time_to_first_response: Optional[float] = None
    avg_time_to_acceptance: Optional[float] = None
    avg_negotiation_rounds: float = 0.0
    
    # Value metrics
    avg_discount_from_listing: float = 0.0  # Percentage
    total_offer_value: float = 0.0
    total_accepted_value: float = 0.0


class SearchFunnelRollup(BaseRollup):
    """Search to purchase funnel rollup"""
    rollup_type: str = "search_funnel"
    
    # Funnel stages
    total_searches: int = 0
    zero_result_searches: int = 0
    searches_with_clicks: int = 0
    listing_views_from_search: int = 0
    cart_adds_from_search: int = 0
    purchases_from_search: int = 0
    
    # Conversion rates
    search_to_view_rate: float = 0.0
    view_to_cart_rate: float = 0.0
    cart_to_purchase_rate: float = 0.0
    overall_search_conversion_rate: float = 0.0
    zero_result_rate: float = 0.0
    
    # Top queries
    top_search_terms: List[Dict[str, Any]] = Field(default_factory=list)
    top_zero_result_terms: List[Dict[str, Any]] = Field(default_factory=list)
    top_converting_terms: List[Dict[str, Any]] = Field(default_factory=list)


class MarketplaceHealthRollup(BaseRollup):
    """Marketplace liquidity and health metrics"""
    rollup_type: str = "marketplace_health"
    
    # Inventory metrics
    active_listings: int = 0
    new_listings: int = 0
    listings_sold: int = 0
    listings_removed: int = 0
    
    # User metrics
    active_buyers: int = 0  # Users who viewed listings
    active_sellers: int = 0  # Users with active listings
    new_users: int = 0
    
    # Engagement
    buyer_to_seller_ratio: float = 0.0
    avg_listing_views: float = 0.0
    avg_favorites_per_listing: float = 0.0
    
    # Velocity metrics
    avg_time_to_sale_hours: Optional[float] = None
    inventory_turnover_rate: float = 0.0
    
    # Stale inventory
    listings_no_views_7d: int = 0
    listings_no_engagement_30d: int = 0
    
    # By category
    health_by_category: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


class TrustSafetyRollup(BaseRollup):
    """Trust and safety metrics"""
    rollup_type: str = "trust_safety"
    
    # Refund metrics
    refunds_initiated: int = 0
    refunds_completed: int = 0
    refund_rate: float = 0.0
    total_refund_value: float = 0.0
    
    # Dispute metrics
    disputes_opened: int = 0
    disputes_resolved: int = 0
    dispute_rate: float = 0.0
    
    # Moderation metrics
    listings_flagged: int = 0
    listings_removed: int = 0
    users_flagged: int = 0
    users_suspended: int = 0
    
    # Repeat offenders (anonymized counts)
    repeat_flag_users: int = 0
    
    # Alert indicators
    abnormal_activity_alerts: List[Dict[str, Any]] = Field(default_factory=list)


class UserActivityRollup(BaseRollup):
    """User engagement and activity rollup"""
    rollup_type: str = "user_activity"
    
    # Session metrics
    total_sessions: int = 0
    unique_users: int = 0
    avg_session_duration_seconds: float = 0.0
    
    # Page metrics
    total_page_views: int = 0
    listing_views: int = 0
    search_count: int = 0
    
    # Engagement
    messages_sent: int = 0
    favorites_added: int = 0
    shares: int = 0
    
    # Device breakdown
    by_device_type: Dict[str, int] = Field(default_factory=dict)
    
    # Source breakdown
    by_referrer: Dict[str, int] = Field(default_factory=dict)
    by_utm_source: Dict[str, int] = Field(default_factory=dict)


# ============= Real-time Metrics (for "today" queries) =============

class RealtimeMetrics(BaseModel):
    """Real-time metrics computed on demand for current period"""
    computed_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Today's numbers
    orders_today: int = 0
    gmv_today: float = 0.0
    new_users_today: int = 0
    new_listings_today: int = 0
    active_sessions: int = 0
    
    # Last hour
    orders_last_hour: int = 0
    searches_last_hour: int = 0
    
    # Comparison to yesterday same time
    orders_delta_pct: float = 0.0
    gmv_delta_pct: float = 0.0
    users_delta_pct: float = 0.0
