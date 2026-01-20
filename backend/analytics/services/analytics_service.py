"""Analytics Query Service

Provides methods for querying analytics data for dashboards.
Reads from rollups for historical data, queries raw events for real-time.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from database import get_database
from ..models.rollups import (
    RevenueRollup, OfferFunnelRollup, SearchFunnelRollup,
    MarketplaceHealthRollup, TrustSafetyRollup, UserActivityRollup,
    RealtimeMetrics, RollupPeriod
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for querying analytics data"""
    
    @staticmethod
    async def get_realtime_metrics() -> RealtimeMetrics:
        """Get real-time metrics computed from raw events"""
        db = get_database()
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_start = today_start - timedelta(days=1)
        one_hour_ago = now - timedelta(hours=1)
        
        # Today's orders
        orders_today = await db.analytics_events.count_documents({
            "event_type": "purchase.completed",
            "timestamp": {"$gte": today_start}
        })
        
        # Today's GMV
        gmv_pipeline = [
            {"$match": {"event_type": "purchase.completed", "timestamp": {"$gte": today_start}}},
            {"$group": {"_id": None, "total": {"$sum": "$metadata.subtotal"}}}
        ]
        gmv_result = await db.analytics_events.aggregate(gmv_pipeline).to_list(length=1)
        gmv_today = gmv_result[0]["total"] if gmv_result else 0
        
        # New users today
        new_users_today = await db.analytics_events.count_documents({
            "event_type": "user.registered",
            "timestamp": {"$gte": today_start}
        })
        
        # New listings today
        new_listings_today = await db.analytics_events.count_documents({
            "event_type": "listing.created",
            "timestamp": {"$gte": today_start}
        })
        
        # Orders last hour
        orders_last_hour = await db.analytics_events.count_documents({
            "event_type": "purchase.completed",
            "timestamp": {"$gte": one_hour_ago}
        })
        
        # Searches last hour
        searches_last_hour = await db.analytics_events.count_documents({
            "event_type": "search.performed",
            "timestamp": {"$gte": one_hour_ago}
        })
        
        # Unique visitors today (count unique session_ids from page.view events)
        visitors_pipeline = [
            {"$match": {"event_type": "page.view", "timestamp": {"$gte": today_start}}},
            {"$group": {"_id": "$session_id"}},
            {"$count": "unique_visitors"}
        ]
        visitors_result = await db.analytics_events.aggregate(visitors_pipeline).to_list(length=1)
        visitors_today = visitors_result[0]["unique_visitors"] if visitors_result else 0
        
        # Yesterday same time comparison
        yesterday_same_time = now - timedelta(days=1)
        orders_yesterday = await db.analytics_events.count_documents({
            "event_type": "purchase.completed",
            "timestamp": {"$gte": yesterday_start, "$lt": yesterday_same_time}
        })
        
        orders_delta = ((orders_today - orders_yesterday) / max(orders_yesterday, 1)) * 100
        
        return RealtimeMetrics(
            computed_at=now,
            orders_today=orders_today,
            gmv_today=gmv_today,
            new_users_today=new_users_today,
            new_listings_today=new_listings_today,
            orders_last_hour=orders_last_hour,
            searches_last_hour=searches_last_hour,
            orders_delta_pct=round(orders_delta, 2),
            visitors_today=visitors_today
        )
    
    @staticmethod
    async def get_revenue_rollup(
        start_date: datetime,
        end_date: datetime,
        period: RollupPeriod = RollupPeriod.DAILY
    ) -> List[Dict[str, Any]]:
        """Get revenue rollups for date range"""
        db = get_database()
        
        cursor = db.analytics_rollups.find(
            {
                "rollup_type": "revenue",
                "period": period.value,
                "period_start": {"$gte": start_date},
                "period_end": {"$lte": end_date}
            },
            {"_id": 0}  # Exclude MongoDB _id
        ).sort("period_start", 1)
        
        rollups = await cursor.to_list(length=1000)
        return rollups
    
    @staticmethod
    async def get_offer_funnel(
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get offer funnel metrics"""
        db = get_database()
        
        # Aggregate all daily rollups in range
        pipeline = [
            {
                "$match": {
                    "rollup_type": "offer_funnel",
                    "period": "daily",
                    "period_start": {"$gte": start_date},
                    "period_end": {"$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "offers_created": {"$sum": "$offers_created"},
                    "offers_countered": {"$sum": "$offers_countered"},
                    "offers_accepted": {"$sum": "$offers_accepted"},
                    "offers_declined": {"$sum": "$offers_declined"},
                    "offers_withdrawn": {"$sum": "$offers_withdrawn"},
                    "offers_converted_to_purchase": {"$sum": "$offers_converted_to_purchase"}
                }
            }
        ]
        
        result = await db.analytics_rollups.aggregate(pipeline).to_list(length=1)
        if not result:
            return {
                "offers_created": 0,
                "offers_countered": 0,
                "offers_accepted": 0,
                "offers_declined": 0,
                "offers_withdrawn": 0,
                "offers_converted_to_purchase": 0,
                "created_to_accepted_rate": 0,
                "accepted_to_purchase_rate": 0
            }
        
        data = result[0]
        data.pop("_id", None)
        
        # Calculate conversion rates
        if data["offers_created"] > 0:
            data["created_to_accepted_rate"] = round(
                data["offers_accepted"] / data["offers_created"] * 100, 2
            )
        else:
            data["created_to_accepted_rate"] = 0
        
        if data["offers_accepted"] > 0:
            data["accepted_to_purchase_rate"] = round(
                data["offers_converted_to_purchase"] / data["offers_accepted"] * 100, 2
            )
        else:
            data["accepted_to_purchase_rate"] = 0
        
        return data
    
    @staticmethod
    async def get_search_funnel(
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get search funnel metrics"""
        db = get_database()
        
        pipeline = [
            {
                "$match": {
                    "rollup_type": "search_funnel",
                    "period": "daily",
                    "period_start": {"$gte": start_date},
                    "period_end": {"$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total_searches": {"$sum": "$total_searches"},
                    "zero_result_searches": {"$sum": "$zero_result_searches"},
                    "listing_views_from_search": {"$sum": "$listing_views_from_search"},
                    "cart_adds_from_search": {"$sum": "$cart_adds_from_search"},
                    "purchases_from_search": {"$sum": "$purchases_from_search"}
                }
            }
        ]
        
        result = await db.analytics_rollups.aggregate(pipeline).to_list(length=1)
        if not result:
            return {
                "total_searches": 0,
                "zero_result_searches": 0,
                "listing_views_from_search": 0,
                "cart_adds_from_search": 0,
                "purchases_from_search": 0,
                "zero_result_rate": 0,
                "search_to_purchase_rate": 0
            }
        
        data = result[0]
        data.pop("_id", None)
        
        # Calculate rates
        if data["total_searches"] > 0:
            data["zero_result_rate"] = round(
                data["zero_result_searches"] / data["total_searches"] * 100, 2
            )
            data["search_to_purchase_rate"] = round(
                data["purchases_from_search"] / data["total_searches"] * 100, 2
            )
        else:
            data["zero_result_rate"] = 0
            data["search_to_purchase_rate"] = 0
        
        return data
    
    @staticmethod
    async def get_marketplace_health(
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get marketplace health metrics"""
        db = get_database()
        
        # Get latest rollup in range
        rollup = await db.analytics_rollups.find_one(
            {
                "rollup_type": "marketplace_health",
                "period": "daily",
                "period_start": {"$gte": start_date},
                "period_end": {"$lte": end_date}
            },
            sort=[("period_start", -1)]
        )
        
        if not rollup:
            return {
                "active_listings": 0,
                "active_buyers": 0,
                "active_sellers": 0,
                "buyer_to_seller_ratio": 0,
                "inventory_turnover_rate": 0
            }
        
        # Extract only the health metrics fields
        return {
            "active_listings": rollup.get("active_listings", 0),
            "active_buyers": rollup.get("active_buyers", 0),
            "active_sellers": rollup.get("active_sellers", 0),
            "buyer_to_seller_ratio": rollup.get("buyer_to_seller_ratio", 0),
            "inventory_turnover_rate": rollup.get("inventory_turnover_rate", 0)
        }
    
    @staticmethod
    async def get_trust_safety(
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get trust and safety metrics"""
        db = get_database()
        
        pipeline = [
            {
                "$match": {
                    "rollup_type": "trust_safety",
                    "period": "daily",
                    "period_start": {"$gte": start_date},
                    "period_end": {"$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "refunds_initiated": {"$sum": "$refunds_initiated"},
                    "refunds_completed": {"$sum": "$refunds_completed"},
                    "disputes_opened": {"$sum": "$disputes_opened"},
                    "disputes_resolved": {"$sum": "$disputes_resolved"},
                    "listings_flagged": {"$sum": "$listings_flagged"},
                    "users_suspended": {"$sum": "$users_suspended"}
                }
            }
        ]
        
        result = await db.analytics_rollups.aggregate(pipeline).to_list(length=1)
        if not result:
            return {
                "refunds_initiated": 0,
                "refunds_completed": 0,
                "disputes_opened": 0,
                "disputes_resolved": 0,
                "listings_flagged": 0,
                "users_suspended": 0,
                "refund_rate": 0,
                "dispute_rate": 0
            }
        
        return result[0]
    
    @staticmethod
    async def get_event_timeline(
        event_types: List[str],
        start_date: datetime,
        end_date: datetime,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get recent events for drill-down"""
        db = get_database()
        
        cursor = db.analytics_events.find(
            {
                "event_type": {"$in": event_types},
                "timestamp": {"$gte": start_date, "$lte": end_date}
            },
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    @staticmethod
    async def get_top_search_terms(
        start_date: datetime,
        end_date: datetime,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get top search terms"""
        db = get_database()
        
        pipeline = [
            {
                "$match": {
                    "event_type": "search.performed",
                    "timestamp": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": "$metadata.query",
                    "count": {"$sum": 1},
                    "avg_results": {"$avg": "$metadata.result_count"}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        
        result = await db.analytics_events.aggregate(pipeline).to_list(length=limit)
        return [{"term": r["_id"], "count": r["count"], "avg_results": r.get("avg_results", 0)} for r in result if r["_id"]]

    @staticmethod
    async def get_daily_visitors(
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get daily unique visitor counts"""
        db = get_database()
        
        # Get daily unique visitors from page.view events
        pipeline = [
            {
                "$match": {
                    "event_type": "page.view",
                    "timestamp": {"$gte": start_date, "$lte": end_date}
                }
            },
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                        "session_id": "$session_id"
                    }
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "unique_visitors": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        result = await db.analytics_events.aggregate(pipeline).to_list(length=100)
        
        # Calculate totals
        total_visitors = sum(r["unique_visitors"] for r in result)
        avg_daily = total_visitors / len(result) if result else 0
        
        # Format timeline
        timeline = [
            {"date": r["_id"], "visitors": r["unique_visitors"]}
            for r in result
        ]
        
        return {
            "total_visitors": total_visitors,
            "avg_daily_visitors": round(avg_daily, 1),
            "days_with_data": len(result),
            "timeline": timeline
        }
