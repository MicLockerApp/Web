"""Analytics Dashboard API Routes

Provides endpoints for the admin analytics dashboard.
Reads from rollups for historical data, computes real-time for current period.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from services.auth import get_admin_user
from datetime import datetime, timedelta
from typing import Optional, List

from ..services.analytics_service import AnalyticsService
from ..services.aggregation_service import AggregationService
from ..models.rollups import RollupPeriod

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/realtime")
async def get_realtime_metrics(admin_user: dict = Depends(get_admin_user)):
    """Get real-time metrics (today/last hour)"""
    metrics = await AnalyticsService.get_realtime_metrics()
    return metrics.model_dump()


@router.get("/revenue")
async def get_revenue_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    period: str = Query("daily", regex="^(hourly|daily|weekly|monthly)$"),
    admin_user: dict = Depends(get_admin_user)
):
    """Get revenue analytics for date range"""
    # Default to last 30 days
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    rollup_period = RollupPeriod(period)
    rollups = await AnalyticsService.get_revenue_rollup(start, end, rollup_period)
    
    # Calculate totals
    totals = {
        "gross_merchandise_value": sum(r.get("gross_merchandise_value", 0) for r in rollups),
        "platform_fees_collected": sum(r.get("platform_fees_collected", 0) for r in rollups),
        "processing_fees_collected": sum(r.get("processing_fees_collected", 0) for r in rollups),
        "net_platform_revenue": sum(r.get("net_platform_revenue", 0) for r in rollups),
        "order_count": sum(r.get("order_count", 0) for r in rollups),
    }
    totals["average_order_value"] = totals["gross_merchandise_value"] / totals["order_count"] if totals["order_count"] > 0 else 0
    
    return {
        "period": period,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "totals": totals,
        "timeline": rollups
    }


@router.get("/offer-funnel")
async def get_offer_funnel(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get offer funnel analytics"""
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    funnel = await AnalyticsService.get_offer_funnel(start, end)
    
    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "funnel": funnel
    }


@router.get("/search-funnel")
async def get_search_funnel(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get search funnel analytics"""
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    funnel = await AnalyticsService.get_search_funnel(start, end)
    
    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "funnel": funnel
    }


@router.get("/marketplace-health")
async def get_marketplace_health(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get marketplace health metrics"""
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    health = await AnalyticsService.get_marketplace_health(start, end)
    
    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "health": health
    }


@router.get("/trust-safety")
async def get_trust_safety(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get trust and safety metrics"""
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    safety = await AnalyticsService.get_trust_safety(start, end)
    
    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "metrics": safety
    }


@router.get("/search-terms")
async def get_top_search_terms(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    admin_user: dict = Depends(get_admin_user)
):
    """Get top search terms"""
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    terms = await AnalyticsService.get_top_search_terms(start, end, limit)
    
    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "terms": terms
    }


@router.get("/daily-visitors")
async def get_daily_visitors(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get daily unique visitor counts"""
    if not start_date:
        start = datetime.utcnow() - timedelta(days=30)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    visitors = await AnalyticsService.get_daily_visitors(start, end)
    
    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        **visitors
    }


@router.get("/events")
async def get_event_timeline(
    event_types: str = Query(..., description="Comma-separated event types"),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    admin_user: dict = Depends(get_admin_user)
):
    """Get event timeline for drill-down"""
    if not start_date:
        start = datetime.utcnow() - timedelta(days=7)
    else:
        start = datetime.strptime(start_date, "%Y-%m-%d")
    
    if not end_date:
        end = datetime.utcnow()
    else:
        end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    types = [t.strip() for t in event_types.split(",")]
    events = await AnalyticsService.get_event_timeline(types, start, end, limit)
    
    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "count": len(events),
        "events": events
    }


@router.post("/reprocess")
async def reprocess_rollups(
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    admin_user: dict = Depends(get_admin_user)
):
    """Reprocess rollups for a date range (when business rules change)"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
    
    count = await AggregationService.reprocess_date_range(start, end)
    
    return {
        "message": f"Reprocessed {count} days of rollups",
        "start_date": start_date,
        "end_date": end_date
    }


@router.post("/run-aggregation")
async def trigger_aggregation(
    aggregation_type: str = Query("daily", regex="^(hourly|daily)$"),
    date: Optional[str] = Query(None, description="Date for daily (YYYY-MM-DD)"),
    admin_user: dict = Depends(get_admin_user)
):
    """Manually trigger aggregation job"""
    if aggregation_type == "hourly":
        count = await AggregationService.run_hourly_aggregation()
    else:
        target_date = datetime.strptime(date, "%Y-%m-%d") if date else None
        count = await AggregationService.run_daily_aggregation(target_date)
    
    return {
        "message": f"Aggregation completed",
        "type": aggregation_type,
        "rollups_created": count
    }
