from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging
import os

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

def get_database_name() -> str:
    """
    Get database name:
    1. If DB_NAME is set (Emergent production), use it
    2. Otherwise use DB_DEVELOP (local) or DB_PROD (production) based on ENVIRONMENT
    """
    # First check if Emergent provided a DB_NAME (production Atlas)
    db_name = os.getenv("DB_NAME")
    if db_name:
        logger.info(f"Using Emergent-provided database: {db_name}")
        return db_name
    
    # Fall back to our naming convention
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env in ["production", "prod"]:
        db_name = "DB_PROD"
    else:
        db_name = "DB_DEVELOP"
    
    logger.info(f"Using database: {db_name} (environment: {env})")
    return db_name

async def connect_to_mongo():
    """Connect to MongoDB"""
    mongo_url = settings.mongo_url
    
    # Log connection attempt (mask credentials)
    if '@' in mongo_url:
        masked_url = mongo_url.split('@')[1] if '@' in mongo_url else mongo_url
        logger.info(f"Connecting to MongoDB at ...@{masked_url}")
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
        
        db_name = get_database_name()
        db.db = db.client[db_name]
        
        # Test connection
        try:
            collections = await db.db.list_collection_names()
            logger.info(f"Connected to MongoDB database: {db_name} (collections: {len(collections)})")
        except Exception as ping_error:
            logger.error(f"Database connection failed for '{db_name}': {ping_error}")
            raise
        
        await create_indexes()
        
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise

async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        logger.info("Closed MongoDB connection")

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
