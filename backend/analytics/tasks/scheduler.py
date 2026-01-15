"""Analytics Background Tasks

Background jobs for computing rollups using APScheduler.
For higher volume, this can be migrated to Celery + Redis.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from ..services.aggregation_service import AggregationService
from database import connect_to_mongo, close_mongo_connection

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = AsyncIOScheduler()


async def hourly_aggregation_job():
    """Job that runs every hour to compute hourly rollups"""
    try:
        logger.info("Starting hourly aggregation job")
        count = await AggregationService.run_hourly_aggregation()
        logger.info(f"Hourly aggregation completed: {count} rollups")
    except Exception as e:
        logger.error(f"Hourly aggregation failed: {e}")


async def daily_aggregation_job():
    """Job that runs daily at 1 AM to compute daily rollups for yesterday"""
    try:
        logger.info("Starting daily aggregation job")
        yesterday = datetime.utcnow() - timedelta(days=1)
        count = await AggregationService.run_daily_aggregation(yesterday)
        logger.info(f"Daily aggregation completed: {count} rollups")
    except Exception as e:
        logger.error(f"Daily aggregation failed: {e}")


async def cleanup_old_events_job():
    """Job that runs weekly to clean up old raw events (retention policy)"""
    try:
        from database import get_database
        db = get_database()
        
        # Keep raw events for 90 days
        cutoff = datetime.utcnow() - timedelta(days=90)
        
        result = await db.analytics_events.delete_many({
            "timestamp": {"$lt": cutoff}
        })
        
        logger.info(f"Cleaned up {result.deleted_count} old analytics events")
    except Exception as e:
        logger.error(f"Event cleanup failed: {e}")


def start_scheduler():
    """Start the analytics background scheduler"""
    if scheduler.running:
        logger.info("Scheduler already running")
        return
    
    # Hourly aggregation - every hour at minute 5
    scheduler.add_job(
        hourly_aggregation_job,
        CronTrigger(minute=5),
        id="hourly_aggregation",
        replace_existing=True
    )
    
    # Daily aggregation - every day at 1:00 AM UTC
    scheduler.add_job(
        daily_aggregation_job,
        CronTrigger(hour=1, minute=0),
        id="daily_aggregation",
        replace_existing=True
    )
    
    # Weekly cleanup - every Sunday at 3 AM UTC
    scheduler.add_job(
        cleanup_old_events_job,
        CronTrigger(day_of_week=0, hour=3, minute=0),
        id="weekly_cleanup",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("Analytics scheduler started with hourly and daily aggregation jobs")


def stop_scheduler():
    """Stop the analytics background scheduler"""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Analytics scheduler stopped")


async def run_initial_aggregation():
    """Run aggregation for the past 30 days on startup (if needed)"""
    from database import get_database
    db = get_database()
    
    # Check if we have any rollups
    rollup_count = await db.analytics_rollups.count_documents({})
    
    if rollup_count == 0:
        logger.info("No rollups found, running initial aggregation for past 30 days")
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()
        await AggregationService.reprocess_date_range(start_date, end_date)
        logger.info("Initial aggregation complete")
    else:
        logger.info(f"Found {rollup_count} existing rollups, skipping initial aggregation")
