from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging
import os
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

def extract_db_name_from_url(mongo_url: str) -> str:
    """
    Extract database name from MongoDB connection string.
    
    Examples:
    - mongodb+srv://user:pass@cluster.mongodb.net/mydb?... -> mydb
    - mongodb://localhost:27017/testdb -> testdb
    - mongodb://localhost:27017 -> None (use default)
    
    Also extracts appName parameter as fallback (common in Emergent deployments)
    """
    try:
        # Parse the URL
        parsed = urlparse(mongo_url.replace("mongodb+srv://", "mongodb://"))
        
        # Get the path (database name is after the /)
        path = parsed.path
        if path and path.startswith("/"):
            db_name = path[1:].split("?")[0]  # Remove leading / and query params
            if db_name:
                return db_name
        
        # Fallback: Try to extract appName from query string (Emergent convention)
        # The appName often matches the database name in Emergent's setup
        if "appName=" in mongo_url:
            import re
            match = re.search(r'appName=([^&]+)', mongo_url)
            if match:
                app_name = match.group(1)
                logger.info(f"Extracted appName from URL: {app_name}")
                return app_name
                
    except Exception as e:
        logger.warning(f"Could not parse database name from URL: {e}")
    
    return None

def get_database_name() -> str:
    """
    Get database name with the following priority:
    1. DB_NAME environment variable (set by Emergent platform)
    2. Database name extracted from MONGO_URL connection string
    3. Default to 'test' for Atlas (MongoDB default) or environment-based for local
    
    This ensures compatibility with Emergent's managed MongoDB Atlas.
    """
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    # Priority 1: Check for explicit DB_NAME env var (set by Emergent platform)
    db_name_env = os.getenv("DB_NAME")
    if db_name_env:
        logger.info(f"Using database from DB_NAME env var: {db_name_env}")
        return db_name_env
    
    # Priority 2: Extract from MONGO_URL connection string
    db_from_url = extract_db_name_from_url(mongo_url)
    if db_from_url:
        logger.info(f"Using database from MONGO_URL: {db_from_url}")
        return db_from_url
    
    # Priority 3: For Atlas/production, use 'test' (MongoDB default database)
    # For local development, use environment-based name
    is_atlas = "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url
    
    if is_atlas:
        # Use MongoDB's default database 'test' for Atlas
        # This is the database Emergent's MongoDB user has access to
        db_name = "test"
        logger.info(f"Using default Atlas database: {db_name}")
    else:
        # Local development
        env = os.getenv("ENVIRONMENT", "development").lower()
        db_name = "miclocker_dev"
        logger.info(f"Using local database: {db_name} (environment: {env})")
    
    return db_name

async def connect_to_mongo():
    """Connect to MongoDB"""
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    
    # Log connection (mask credentials)
    if '@' in mongo_url:
        masked = mongo_url.split('@')[1]
        logger.info(f"Connecting to MongoDB at ...@{masked}")
    else:
        logger.info(f"Connecting to MongoDB at {mongo_url}")
    
    try:
        db.client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=30000,
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            retryWrites=True
        )
        
        # Get database name (DB_PROD for Atlas, DB_DEVELOP for local)
        db_name = get_database_name()
        db.db = db.client[db_name]
        
        # Test connection
        try:
            collections = await db.db.list_collection_names()
            logger.info(f"Connected to database: {db_name} ({len(collections)} collections)")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            raise
        
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed")

async def create_indexes():
    """Create database indexes"""
    await db.db.users.create_index("username", unique=True)
    await db.db.users.create_index("email", unique=True)
    await db.db.listings.create_index([("title", "text"), ("description", "text"), ("brand", "text"), ("model", "text")])
    await db.db.listings.create_index("seller_id")
    await db.db.listings.create_index("category")
    await db.db.listings.create_index("status")
    await db.db.listings.create_index("price")
    await db.db.listings.create_index("created_at")
    await db.db.orders.create_index("buyer_id")
    await db.db.orders.create_index("seller_id")
    await db.db.orders.create_index("status")
    await db.db.offers.create_index("listing_id")
    await db.db.offers.create_index("buyer_id")
    await db.db.offers.create_index("seller_id")
    await db.db.messages.create_index("thread_id")
    await db.db.message_threads.create_index("participants")
    await db.db.reviews.create_index("seller_id")
    await db.db.reviews.create_index("reviewee_id")
    await db.db.reviews.create_index("reviewer_id")
    await db.db.reviews.create_index([("order_id", 1), ("review_type", 1)], unique=True)
    await db.db.cart_items.create_index("user_id")
    logger.info("Database indexes created")

def get_database():
    return db.db
