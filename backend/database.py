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
    Get database name based on ENVIRONMENT only.
    
    IMPORTANT: We IGNORE the DB_NAME environment variable because Emergent's 
    production was pointing to an old database with seed data.
    
    PRODUCTION = DB_PROD (clean database)
    DEVELOPMENT = DB_DEVELOP (local testing)
    """
    env = os.getenv("ENVIRONMENT", "development").lower()
    
    if env in ["production", "prod"]:
        db_name = "DB_PROD"
        logger.info(f"PRODUCTION MODE: Using database DB_PROD")
    else:
        db_name = "DB_DEVELOP"
        logger.info(f"DEVELOPMENT MODE: Using database DB_DEVELOP")
    
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
        
        # Get database name (DB_PROD or DB_DEVELOP based on ENVIRONMENT)
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
