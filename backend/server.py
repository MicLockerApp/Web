from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
from datetime import datetime, timezone

from config import settings
from database import connect_to_mongo, close_mongo_connection, get_database
from routes import (
    auth_router, users_router, listings_router, cart_router,
    orders_router, offers_router, messages_router, reviews_router,
    admin_router, files_router
)
from routes.search import router as search_router
from routes.tickets import router as tickets_router
from routes.payments import router as payments_router
from routes.trades import router as trades_router
from routes.stats import router as stats_router
from routes.stripe_connect_v2_sample import router as stripe_connect_v2_sample_router

# Delivery tasks import
from tasks.delivery_tasks import start_delivery_scheduler

# Analytics imports
from analytics.routes import analytics_router, events_router
from analytics.tasks import start_scheduler, stop_scheduler, run_initial_aggregation

# Chatbot imports
from chatbot.routes import chatbot_router

# Password hashing
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def ensure_admin_user_exists():
    """
    CRITICAL: Ensure the admin user exists in the database.
    This runs on EVERY startup to guarantee the admin user exists
    on ANY MongoDB server (local development OR production Atlas).
    
    Admin credentials:
    - Username: miclocker.support
    - Email: info@miclockerapp.com
    - Password: Eisenhower1212!!
    - Role: owner
    """
    db = get_database()
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    # Detect if we're on Atlas (production) - ignore ENVIRONMENT variable
    is_production = "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url
    
    # In PRODUCTION (Atlas), check if there's seed data and clear it
    if is_production:
        user_count = await db.users.count_documents({})
        listing_count = await db.listings.count_documents({})
        
        logger.info(f"PRODUCTION CHECK: {user_count} users, {listing_count} listings")
        
        # If there are multiple users or any listings, this is seed data - CLEAR IT
        if user_count > 1 or listing_count > 0:
            logger.warning(f"SEED DATA DETECTED ON PRODUCTION: {user_count} users, {listing_count} listings")
            logger.warning("CLEARING ALL SEED DATA NOW...")
            
            # Get all collection names and clear them
            collections = await db.list_collection_names()
            for coll_name in collections:
                await db[coll_name].delete_many({})
                logger.info(f"Cleared collection: {coll_name}")
            
            logger.info("ALL SEED DATA CLEARED - Database is now clean")
    
    # Check if admin user exists
    existing_user = await db.users.find_one({"username": "miclocker.support"})
    
    if existing_user:
        logger.info("Admin user miclocker.support already exists")
        return
    
    # Create admin user
    admin_password = "Eisenhower1212!!"
    hashed_password = pwd_context.hash(admin_password)
    
    admin_user = {
        "id": "admin-miclocker-support",
        "username": "miclocker.support",
        "email": "info@miclockerapp.com",
        "hashed_password": hashed_password,
        "full_name": "MicLocker Support",
        "bio": "Official MicLocker Support Account",
        "location": "United States",
        "profile_picture": None,
        "role": "owner",
        "is_active": True,
        "is_verified": True,
        "is_approved_seller": True,
        "seller_verified_at": datetime.now(timezone.utc),
        "rating": 5.0,
        "total_reviews": 0,
        "total_sales": 0,
        "member_since": datetime.now(timezone.utc),
        "last_login": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "stripe_connect_account_id": None,
        "stripe_customer_id": None,
        "pending_review_for_order_id": None,
        "preferences": {
            "email_notifications": True,
            "push_notifications": True
        }
    }
    
    await db.users.insert_one(admin_user)
    logger.info("CREATED admin user: miclocker.support (owner)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info(f"Starting {settings.app_name}")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Storage mode: {'S3' if settings.use_s3 else 'Local'}")
    
    try:
        await connect_to_mongo()
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        # Continue startup even if DB connection fails initially
        # The connection might recover
    
    # Create analytics indexes
    try:
        await create_analytics_indexes()
    except Exception as e:
        logger.warning(f"Failed to create analytics indexes: {e}")
    
    # CRITICAL: Create admin user if it doesn't exist
    # This ensures the admin user exists on ANY MongoDB server (local or production Atlas)
    try:
        await ensure_admin_user_exists()
    except Exception as e:
        logger.error(f"Failed to create admin user: {e}")
    
    # Ensure support system user exists for in-app messaging
    try:
        from services.message_service import ensure_support_user_exists
        await ensure_support_user_exists()
    except Exception as e:
        logger.warning(f"Failed to create support user: {e}")
    
    logger.info(f"Using database: {settings.database_name} (environment: {settings.environment})")
    
    # Start analytics background scheduler
    try:
        start_scheduler()
        logger.info("Analytics scheduler started")
    except Exception as e:
        logger.warning(f"Failed to start analytics scheduler: {e}")
    
    # Start delivery confirmation scheduler (checks every hour for auto-delivery)
    try:
        start_delivery_scheduler()
        logger.info("Delivery confirmation scheduler started")
    except Exception as e:
        logger.warning(f"Failed to start delivery scheduler: {e}")
    
    # Run initial aggregation if needed (in background)
    try:
        await run_initial_aggregation()
    except Exception as e:
        logger.warning(f"Initial aggregation skipped: {e}")
    
    logger.info("Application startup complete")
    
    yield
    
    # Shutdown
    try:
        stop_scheduler()
    except Exception as e:
        logger.warning(f"Error stopping scheduler: {e}")
    
    try:
        await close_mongo_connection()
    except Exception as e:
        logger.warning(f"Error closing MongoDB connection: {e}")
    
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
    allow_origins=settings.get_cors_origins,
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
app.include_router(trades_router, prefix="/api")
app.include_router(stats_router, prefix="/api")

# Analytics routes
app.include_router(analytics_router, prefix="/api")
app.include_router(events_router, prefix="/api")

# Chatbot routes
app.include_router(chatbot_router, prefix="/api")

# Stripe Connect V2 Sample routes (demonstration integration)
app.include_router(stripe_connect_v2_sample_router, prefix="/api")

# Health check endpoints
@app.get("/api/health")
async def api_health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment,
        "storage": "S3" if settings.use_s3 else "Local",
        "analytics": "enabled"
    }

# Root health check for Kubernetes/deployment health probes
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "environment": settings.environment
    }

@app.get("/")
async def root():
    return {"message": "Welcome to MicLocker API", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
