"""Aggregation Service

Computes rollups from raw events. Designed to be run by background jobs.
Supports reprocessing when business rules change.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from database import get_database
from ..models.rollups import (
    RevenueRollup, OfferFunnelRollup, SearchFunnelRollup,
    MarketplaceHealthRollup, TrustSafetyRollup, UserActivityRollup,
    RollupPeriod
)
from ..models.events import EventTypes

logger = logging.getLogger(__name__)


class AggregationService:
    """Service for computing analytics rollups from raw events"""
    
    @staticmethod
    async def compute_revenue_rollup(
        period_start: datetime,
        period_end: datetime,
        period: RollupPeriod = RollupPeriod.DAILY
    ) -> RevenueRollup:
        """Compute revenue metrics for a period"""
        db = get_database()
        
        # GMV from purchase events
        gmv_pipeline = [
            {
                "$match": {
                    "event_type": EventTypes.PURCHASE_COMPLETED,
                    "timestamp": {"$gte": period_start, "$lt": period_end}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "gmv": {"$sum": "$metadata.subtotal"},
                    "platform_fees": {"$sum": "$metadata.platform_fee"},
                    "processing_fees": {"$sum": "$metadata.processing_fee"},
                    "shipping": {"$sum": "$metadata.shipping_total"},
                    "order_count": {"$sum": 1}
                }
            }
        ]
        
        result = await db.analytics_events.aggregate(gmv_pipeline).to_list(length=1)
        
        if result:
            data = result[0]
            gmv = data.get("gmv", 0) or 0
            platform_fees = data.get("platform_fees", 0) or 0
            processing_fees = data.get("processing_fees", 0) or 0
            order_count = data.get("order_count", 0) or 0
            shipping = data.get("shipping", 0) or 0
        else:
            gmv = platform_fees = processing_fees = order_count = shipping = 0
        
        # Revenue by category
        category_pipeline = [
            {
                "$match": {
                    "event_type": EventTypes.PURCHASE_COMPLETED,
                    "timestamp": {"$gte": period_start, "$lt": period_end}
                }
            },
            {"$unwind": "$metadata.items"},
            {
                "$group": {
                    "_id": "$metadata.items.category",
                    "revenue": {"$sum": "$metadata.items.price"},
                    "count": {"$sum": 1}
                }
            }
        ]
        
        category_result = await db.analytics_events.aggregate(category_pipeline).to_list(length=100)
        revenue_by_category = {r["_id"]: r["revenue"] for r in category_result if r["_id"]}
        orders_by_category = {r["_id"]: r["count"] for r in category_result if r["_id"]}
        
        rollup = RevenueRollup(
            period=period,
            period_start=period_start,
            period_end=period_end,
            gross_merchandise_value=gmv,
            platform_fees_collected=platform_fees,
            processing_fees_collected=processing_fees,
            net_platform_revenue=platform_fees + processing_fees,
            seller_payouts=gmv - platform_fees,
            order_count=order_count,
            average_order_value=gmv / order_count if order_count > 0 else 0,
            revenue_by_category=revenue_by_category,
            orders_by_category=orders_by_category,
            total_shipping_revenue=shipping
        )
        
        return rollup
    
    @staticmethod
    async def compute_offer_funnel_rollup(
        period_start: datetime,
        period_end: datetime,
        period: RollupPeriod = RollupPeriod.DAILY
    ) -> OfferFunnelRollup:
        """Compute offer funnel metrics"""
        db = get_database()
        
        # Count each offer event type
        event_counts = {}
        offer_events = [
            (EventTypes.OFFER_CREATED, "offers_created"),
            (EventTypes.OFFER_COUNTERED, "offers_countered"),
            (EventTypes.OFFER_ACCEPTED, "offers_accepted"),
            (EventTypes.OFFER_DECLINED, "offers_declined"),
            (EventTypes.OFFER_WITHDRAWN, "offers_withdrawn"),
            (EventTypes.OFFER_EXPIRED, "offers_expired"),
            (EventTypes.OFFER_CONVERTED, "offers_converted_to_purchase")
        ]
        
        for event_type, field_name in offer_events:
            count = await db.analytics_events.count_documents({
                "event_type": event_type,
                "timestamp": {"$gte": period_start, "$lt": period_end}
            })
            event_counts[field_name] = count
        
        # Calculate conversion rates
        created = event_counts.get("offers_created", 0)
        accepted = event_counts.get("offers_accepted", 0)
        converted = event_counts.get("offers_converted_to_purchase", 0)
        countered = event_counts.get("offers_countered", 0)
        
        rollup = OfferFunnelRollup(
            period=period,
            period_start=period_start,
            period_end=period_end,
            **event_counts,
            created_to_countered_rate=countered / created if created > 0 else 0,
            created_to_accepted_rate=accepted / created if created > 0 else 0,
            accepted_to_purchase_rate=converted / accepted if accepted > 0 else 0
        )
        
        return rollup
    
    @staticmethod
    async def compute_search_funnel_rollup(
        period_start: datetime,
        period_end: datetime,
        period: RollupPeriod = RollupPeriod.DAILY
    ) -> SearchFunnelRollup:
        """Compute search funnel metrics"""
        db = get_database()
        
        # Total searches
        total_searches = await db.analytics_events.count_documents({
            "event_type": EventTypes.SEARCH_PERFORMED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        # Zero result searches
        zero_result_searches = await db.analytics_events.count_documents({
            "event_type": EventTypes.SEARCH_ZERO_RESULTS,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        # Listing views with search source
        listing_views_from_search = await db.analytics_events.count_documents({
            "event_type": EventTypes.LISTING_VIEWED,
            "metadata.source": "search",
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        # Cart adds with search attribution
        cart_adds_from_search = await db.analytics_events.count_documents({
            "event_type": EventTypes.CART_ITEM_ADDED,
            "metadata.from_search": True,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        # Purchases from search
        purchases_from_search = await db.analytics_events.count_documents({
            "event_type": EventTypes.PURCHASE_COMPLETED,
            "metadata.from_search": True,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        # Top search terms
        top_terms_pipeline = [
            {
                "$match": {
                    "event_type": EventTypes.SEARCH_PERFORMED,
                    "timestamp": {"$gte": period_start, "$lt": period_end}
                }
            },
            {
                "$group": {
                    "_id": "$metadata.query",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        top_terms = await db.analytics_events.aggregate(top_terms_pipeline).to_list(length=10)
        
        rollup = SearchFunnelRollup(
            period=period,
            period_start=period_start,
            period_end=period_end,
            total_searches=total_searches,
            zero_result_searches=zero_result_searches,
            listing_views_from_search=listing_views_from_search,
            cart_adds_from_search=cart_adds_from_search,
            purchases_from_search=purchases_from_search,
            search_to_view_rate=listing_views_from_search / total_searches if total_searches > 0 else 0,
            view_to_cart_rate=cart_adds_from_search / listing_views_from_search if listing_views_from_search > 0 else 0,
            cart_to_purchase_rate=purchases_from_search / cart_adds_from_search if cart_adds_from_search > 0 else 0,
            overall_search_conversion_rate=purchases_from_search / total_searches if total_searches > 0 else 0,
            zero_result_rate=zero_result_searches / total_searches if total_searches > 0 else 0,
            top_search_terms=[{"term": t["_id"], "count": t["count"]} for t in top_terms if t["_id"]]
        )
        
        return rollup
    
    @staticmethod
    async def compute_marketplace_health_rollup(
        period_start: datetime,
        period_end: datetime,
        period: RollupPeriod = RollupPeriod.DAILY
    ) -> MarketplaceHealthRollup:
        """Compute marketplace health metrics"""
        db = get_database()
        
        # Active listings (from marketplace DB)
        active_listings = await db.listings.count_documents({"status": "active"})
        
        # New listings in period
        new_listings = await db.analytics_events.count_documents({
            "event_type": EventTypes.LISTING_CREATED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        # Listings sold
        listings_sold = await db.analytics_events.count_documents({
            "event_type": EventTypes.PURCHASE_COMPLETED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        # Active buyers (unique users who viewed listings)
        buyer_pipeline = [
            {
                "$match": {
                    "event_type": EventTypes.LISTING_VIEWED,
                    "actor_id": {"$ne": None},
                    "timestamp": {"$gte": period_start, "$lt": period_end}
                }
            },
            {"$group": {"_id": "$actor_id"}},
            {"$count": "total"}
        ]
        buyer_result = await db.analytics_events.aggregate(buyer_pipeline).to_list(length=1)
        active_buyers = buyer_result[0]["total"] if buyer_result else 0
        
        # Active sellers (users with active listings)
        seller_pipeline = [
            {"$match": {"status": "active"}},
            {"$group": {"_id": "$seller_id"}},
            {"$count": "total"}
        ]
        seller_result = await db.listings.aggregate(seller_pipeline).to_list(length=1)
        active_sellers = seller_result[0]["total"] if seller_result else 0
        
        # New users
        new_users = await db.analytics_events.count_documents({
            "event_type": EventTypes.USER_REGISTERED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        rollup = MarketplaceHealthRollup(
            period=period,
            period_start=period_start,
            period_end=period_end,
            active_listings=active_listings,
            new_listings=new_listings,
            listings_sold=listings_sold,
            active_buyers=active_buyers,
            active_sellers=active_sellers,
            new_users=new_users,
            buyer_to_seller_ratio=active_buyers / active_sellers if active_sellers > 0 else 0,
            inventory_turnover_rate=listings_sold / active_listings if active_listings > 0 else 0
        )
        
        return rollup
    
    @staticmethod
    async def compute_trust_safety_rollup(
        period_start: datetime,
        period_end: datetime,
        period: RollupPeriod = RollupPeriod.DAILY
    ) -> TrustSafetyRollup:
        """Compute trust and safety metrics"""
        db = get_database()
        
        # Count moderation events
        refunds_initiated = await db.analytics_events.count_documents({
            "event_type": EventTypes.REFUND_INITIATED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        refunds_completed = await db.analytics_events.count_documents({
            "event_type": EventTypes.REFUND_COMPLETED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        listings_flagged = await db.analytics_events.count_documents({
            "event_type": EventTypes.LISTING_FLAGGED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        users_suspended = await db.analytics_events.count_documents({
            "event_type": EventTypes.USER_SUSPENDED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        # Orders for refund rate calculation
        total_orders = await db.analytics_events.count_documents({
            "event_type": EventTypes.PURCHASE_COMPLETED,
            "timestamp": {"$gte": period_start, "$lt": period_end}
        })
        
        rollup = TrustSafetyRollup(
            period=period,
            period_start=period_start,
            period_end=period_end,
            refunds_initiated=refunds_initiated,
            refunds_completed=refunds_completed,
            refund_rate=refunds_initiated / total_orders if total_orders > 0 else 0,
            listings_flagged=listings_flagged,
            users_suspended=users_suspended
        )
        
        return rollup
    
    @staticmethod
    async def save_rollup(rollup) -> str:
        """Save a rollup to the database"""
        db = get_database()
        
        # Upsert based on rollup_type + period + period_start
        result = await db.analytics_rollups.update_one(
            {
                "rollup_type": rollup.rollup_type,
                "period": rollup.period.value,
                "period_start": rollup.period_start
            },
            {"$set": rollup.model_dump()},
            upsert=True
        )
        
        logger.info(f"Saved {rollup.rollup_type} rollup for {rollup.period_start}")
        return rollup.id
    
    @staticmethod
    async def run_daily_aggregation(date: Optional[datetime] = None):
        """Run all daily aggregations for a specific date"""
        if date is None:
            date = datetime.utcnow() - timedelta(days=1)
        
        period_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        period_end = period_start + timedelta(days=1)
        
        logger.info(f"Running daily aggregation for {period_start.date()}")
        
        # Compute and save all rollups
        rollups = [
            await AggregationService.compute_revenue_rollup(period_start, period_end),
            await AggregationService.compute_offer_funnel_rollup(period_start, period_end),
            await AggregationService.compute_search_funnel_rollup(period_start, period_end),
            await AggregationService.compute_marketplace_health_rollup(period_start, period_end),
            await AggregationService.compute_trust_safety_rollup(period_start, period_end)
        ]
        
        for rollup in rollups:
            await AggregationService.save_rollup(rollup)
        
        logger.info(f"Completed daily aggregation: {len(rollups)} rollups saved")
        return len(rollups)
    
    @staticmethod
    async def run_hourly_aggregation():
        """Run hourly aggregation for the previous hour"""
        now = datetime.utcnow()
        period_end = now.replace(minute=0, second=0, microsecond=0)
        period_start = period_end - timedelta(hours=1)
        
        logger.info(f"Running hourly aggregation for {period_start}")
        
        # Only compute revenue for hourly (most important for real-time)
        rollup = await AggregationService.compute_revenue_rollup(
            period_start, period_end, RollupPeriod.HOURLY
        )
        await AggregationService.save_rollup(rollup)
        
        return 1
    
    @staticmethod
    async def reprocess_date_range(start_date: datetime, end_date: datetime):
        """Reprocess rollups for a date range (when business rules change)"""
        logger.info(f"Reprocessing rollups from {start_date} to {end_date}")
        
        current = start_date
        count = 0
        while current < end_date:
            await AggregationService.run_daily_aggregation(current)
            current += timedelta(days=1)
            count += 1
        
        logger.info(f"Reprocessed {count} days")
        return count
