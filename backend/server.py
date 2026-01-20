from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from config import settings
from database import connect_to_mongo, close_mongo_connection
from routes import (
    auth_router, users_router, listings_router, cart_router,
    orders_router, offers_router, messages_router, reviews_router,
    admin_router, files_router
)
from routes.search import router as search_router
from routes.tickets import router as tickets_router
from routes.payments import router as payments_router
from routes.trades import router as trades_router

# Delivery tasks import
from tasks.delivery_tasks import start_delivery_scheduler

# Analytics imports
from analytics.routes import analytics_router, events_router
from analytics.tasks import start_scheduler, stop_scheduler, run_initial_aggregation

# Chatbot imports
from chatbot.routes import chatbot_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info(f"Starting {settings.app_name}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Storage mode: {'S3' if settings.use_s3 else 'Local'}")
    
    await connect_to_mongo()
    
    # Create analytics indexes
    await create_analytics_indexes()
    
    # Ensure support system user exists for in-app messaging
    from services.message_service import ensure_support_user_exists
    await ensure_support_user_exists()
    
    # Run seed data if in development
    if settings.environment == "development":
        from seed_data import seed_database
        await seed_database()
    
    # Start analytics background scheduler
    start_scheduler()
    logger.info("Analytics scheduler started")
    
    # Start delivery confirmation scheduler (checks every hour for auto-delivery)
    start_delivery_scheduler()
    logger.info("Delivery confirmation scheduler started")
    
    # Run initial aggregation if needed (in background)
    try:
        await run_initial_aggregation()
    except Exception as e:
        logger.warning(f"Initial aggregation skipped: {e}")
    
    yield
    
    # Shutdown
    stop_scheduler()
    await close_mongo_connection()
    logger.info("Application shutdown complete")


async def create_analytics_indexes():
    """Create indexes for analytics collections"""
    from database import get_database
    db = get_database()
    
    try:
        # Raw events collection indexes
        await db.analytics_events.create_index("event_type")
        await db.analytics_events.create_index("actor_id")
        await db.analytics_events.create_index("listing_id")
        await db.analytics_events.create_index("order_id")
        await db.analytics_events.create_index("session_id")
        await db.analytics_events.create_index([("event_type", 1), ("timestamp", -1)])
        
        # Try to create TTL index, drop existing timestamp index if needed
        try:
            await db.analytics_events.drop_index("timestamp_1")
        except:
            pass
        
        try:
            await db.analytics_events.create_index(
                "timestamp",
                expireAfterSeconds=90 * 24 * 60 * 60,  # 90 days
                name="ttl_cleanup"
            )
        except Exception as e:
            logger.warning(f"Could not create TTL index: {e}")
        
        # Rollups collection indexes
        await db.analytics_rollups.create_index("rollup_type")
        await db.analytics_rollups.create_index("period")
        await db.analytics_rollups.create_index("period_start")
        
        try:
            await db.analytics_rollups.create_index(
                [("rollup_type", 1), ("period", 1), ("period_start", 1)], 
                unique=True
            )
        except:
            pass
        
        logger.info("Analytics indexes created")
    except Exception as e:
        logger.warning(f"Error creating analytics indexes: {e}")


app = FastAPI(
    title="MicLocker API",
    description="Marketplace API for musical equipment",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(listings_router, prefix="/api")
app.include_router(cart_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(offers_router, prefix="/api")
app.include_router(messages_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(files_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(tickets_router, prefix="/api")
app.include_router(payments_router, prefix="/api")

# Analytics routes
app.include_router(analytics_router, prefix="/api")
app.include_router(events_router, prefix="/api")

# Chatbot routes
app.include_router(chatbot_router, prefix="/api")

# Health check
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
        "storage": "S3" if settings.use_s3 else "Local",
        "analytics": "enabled"
    }

@app.get("/")
async def root():
    return {"message": "Welcome to MicLocker API", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
