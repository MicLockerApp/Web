from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
from datetime import datetime, timezone

from config import settings
from database import connect_to_mongo, close_mongo_connection, get_database
from middleware import setup_error_handlers
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
from routes.reports import router as reports_router
from routes.uploads import router as uploads_router
from routes.gigs import router as gigs_router

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
    Ensure the admin user exists in the database.
    This runs on EVERY startup to guarantee the admin user exists.
    
    Admin credentials are read from environment variables:
    - ADMIN_USERNAME (default: miclocker.support)
    - ADMIN_EMAIL (default: info@miclockerapp.com)
    - ADMIN_PASSWORD (default: changeme123!)
    """
    try:
        db = get_database()
        
        # Get admin credentials from environment (with safe defaults for dev)
        admin_username = os.getenv("ADMIN_USERNAME", "miclocker.support")
        admin_email = os.getenv("ADMIN_EMAIL", "info@miclockerapp.com")
        admin_password = os.getenv("ADMIN_PASSWORD", "changeme123!")
        
        logger.info("=" * 60)
        logger.info("ADMIN USER CHECK - STARTING")
        logger.info(f"Admin username: {admin_username}")
        logger.info("=" * 60)
        
        # Check if admin user exists
        existing_user = await db.users.find_one({"username": admin_username})
        
        if existing_user:
            # Ensure admin has is_admin flag set to True
            if not existing_user.get("is_admin"):
                await db.users.update_one(
                    {"username": admin_username},
                    {"$set": {"is_admin": True, "role": "owner"}}
                )
                logger.info(f"Updated admin user {admin_username} with is_admin=True")
            logger.info(f"Admin user {admin_username} ALREADY EXISTS")
            logger.info("=" * 60)
            return
        
        # Create admin user
        logger.info(f"Creating admin user {admin_username}...")
        hashed_password = pwd_context.hash(admin_password)
        
        admin_user = {
            "id": f"admin-{admin_username.replace('.', '-')}",
            "username": admin_username,
            "email": admin_email,
            "hashed_password": hashed_password,
            "full_name": "MicLocker Support",
            "bio": "Official MicLocker Support Account",
            "location": "United States",
            "profile_picture": None,
            "role": "owner",
            "is_admin": True,  # CRITICAL: This allows access to admin pages
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
        
        result = await db.users.insert_one(admin_user)
        logger.info(f"ADMIN USER CREATED: {admin_username} (inserted_id: {result.inserted_id})")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Error in ensure_admin_user_exists: {e}")
        # Don't raise - app should still start even if admin creation fails
        logger.warning("Admin user may not have been created - please create manually if needed")


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
    description="""
## MicLocker Marketplace API

A comprehensive API for the MicLocker creative professionals marketplace.

### Features:
- **Authentication**: User registration, login, 2FA, Google OAuth
- **Users**: Profile management, search, favorites
- **Listings**: Create, manage, and browse marketplace listings
- **Orders**: Shopping cart, checkout, order management
- **Messages**: Direct messaging with media attachments
- **Gig Board**: Post and browse gigs (Looking For, Services, Show Trades)
- **Auditions**: TikTok-style video feed for discovering talent
- **Admin**: User management, analytics, role management
- **Bookings**: Venue booking system

### Authentication
Most endpoints require a Bearer token. Obtain a token via `/api/auth/login`.

### Base URL
Production: `https://eventsphere-21.preview.emergentagent.com/api`
    """,
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,  # Disabled - use Swagger UI instead
    openapi_url="/api/openapi.json",
    openapi_tags=[
        {"name": "Authentication", "description": "User authentication and registration"},
        {"name": "Users", "description": "User profile and search operations"},
        {"name": "Listings", "description": "Marketplace listing operations"},
        {"name": "Orders", "description": "Shopping cart and order management"},
        {"name": "Messages", "description": "Direct messaging system"},
        {"name": "Gigs", "description": "Gig board operations"},
        {"name": "Auditions", "description": "Video auditions feed"},
        {"name": "Admin", "description": "Administrative operations"},
        {"name": "Bookings", "description": "Venue booking system"},
    ]
)

# Setup centralized error handling (request ID tracking + standardized errors)
setup_error_handlers(app)

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

# Google OAuth routes
from routes.google_oauth import router as google_oauth_router
app.include_router(google_oauth_router, prefix="/api")

# Two-Factor Authentication routes
from routes.two_factor import router as two_factor_router
app.include_router(two_factor_router, prefix="/api")

# Analytics routes
app.include_router(analytics_router, prefix="/api")
app.include_router(events_router, prefix="/api")

# Chatbot routes
app.include_router(chatbot_router, prefix="/api")

# Stripe Connect V2 Sample routes (demonstration integration)
app.include_router(stripe_connect_v2_sample_router, prefix="/api")

# Reports routes (listing flagging system)
app.include_router(reports_router, prefix="/api")

# File uploads routes (S3 integration)
app.include_router(uploads_router, prefix="/api")

# Gig Board routes
app.include_router(gigs_router, prefix="/api")

# Profile visits routes (Top 8 Fans feature)
from routes.profile_visits import router as profile_visits_router
app.include_router(profile_visits_router, prefix="/api")

# Map routes
from routes.map import router as map_router
app.include_router(map_router, prefix="/api")

# Presence/Status routes
from routes.presence import router as presence_router
app.include_router(presence_router)

# Venue Booking routes
from routes.bookings import router as bookings_router
app.include_router(bookings_router, prefix="/api")

# Notifications routes
from routes.notifications import router as notifications_router
app.include_router(notifications_router, prefix="/api")

# Auditions routes (video content)
from routes.auditions import router as auditions_router
app.include_router(auditions_router, prefix="/api")

# Profile Media routes (photos and videos on profiles)
from routes.profile_media import router as profile_media_router
app.include_router(profile_media_router, prefix="/api")

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
