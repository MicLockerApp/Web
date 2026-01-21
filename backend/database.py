from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging
import os
import re

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

def get_database_name_from_url(mongo_url: str) -> str:
    """
    Extract database name from MongoDB URL.
    
    For Emergent deployments with Atlas, the database name is typically
    embedded in the MONGO_URL and should be extracted from there.
    The DATABASE_NAME env var is a fallback for local development.
    
    Atlas URL formats:
    - mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true
    - mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true (no db name)
    - mongodb://localhost:27017/dbname
    """
    # First, check if DATABASE_NAME is explicitly set in environment (not the default)
    env_db_name = os.getenv("DB_NAME") or os.getenv("DATABASE_NAME")
    
    # For Atlas URLs, try to extract database name from the URL path
    # This handles: mongodb+srv://user:pass@host/dbname?params
    try:
        # Handle mongodb+srv:// URLs
        if mongo_url.startswith("mongodb+srv://") or mongo_url.startswith("mongodb://"):
            # Find the part after the host and before query params
            # Pattern: ...@host/dbname?... or ...@host/dbname
            match = re.search(r'@[^/]+/([^?/]+)', mongo_url)
            if match:
                url_db_name = match.group(1)
                if url_db_name and url_db_name not in ['', 'admin', 'local', 'test']:
                    logger.info(f"Using database name from URL: {url_db_name}")
                    return url_db_name
        
        # Try simple path extraction as fallback
        if '/' in mongo_url:
            # Get the part after the last / and before any ?
            path_part = mongo_url.split('/')[-1]
            if '?' in path_part:
                db_name = path_part.split('?')[0]
            else:
                db_name = path_part
            
            # If we got a valid db name from URL, use it
            if db_name and db_name not in ['', 'admin', 'local']:
                logger.info(f"Using database name from URL path: {db_name}")
                return db_name
    except Exception as e:
        logger.warning(f"Error parsing database name from URL: {e}")
    
    # Use environment variable if set
    if env_db_name:
        logger.info(f"Using database name from environment: {env_db_name}")
        return env_db_name
    
    # Final fallback to settings (which reads from DATABASE_NAME env var)
    logger.info(f"Using database name from settings: {settings.database_name}")
    return settings.database_name

async def connect_to_mongo():
    """Connect to MongoDB"""
    mongo_url = settings.mongo_url
    
    # Mask credentials in log
    if '@' in mongo_url:
        masked_url = mongo_url.split('@')[1] if '@' in mongo_url else mongo_url
        logger.info(f"Connecting to MongoDB at ...@{masked_url}")
    else:
        logger.info(f"Connecting to MongoDB at {mongo_url}")
    
    try:
        # Create client with appropriate settings for Atlas
        # Note: Don't set w='majority' as it may not be supported on all Atlas tiers
        db.client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=30000,  # 30 second timeout
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            retryWrites=True
        )
        
        # Get database name
        db_name = get_database_name_from_url(mongo_url)
        db.db = db.client[db_name]
        
        # Test connection by listing collection names instead of admin ping
        # This works with standard user permissions on Atlas
        try:
            await db.db.list_collection_names()
            logger.info(f"Connected to MongoDB database: {db_name}")
        except Exception as ping_error:
            logger.warning(f"Could not verify connection: {ping_error}")
            # Continue anyway - the connection may still work
        
        # Create indexes
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
    """Create database indexes for better query performance"""
    # Users collection indexes
    await db.db.users.create_index("username", unique=True)
    await db.db.users.create_index("email", unique=True)
    
    # Listings collection indexes
    await db.db.listings.create_index([("title", "text"), ("description", "text"), ("brand", "text"), ("model", "text")])
    await db.db.listings.create_index("seller_id")
    await db.db.listings.create_index("category")
    await db.db.listings.create_index("status")
    await db.db.listings.create_index("price")
    await db.db.listings.create_index("created_at")
    
    # Orders collection indexes
    await db.db.orders.create_index("buyer_id")
    await db.db.orders.create_index("seller_id")
    await db.db.orders.create_index("status")
    
    # Offers collection indexes
    await db.db.offers.create_index("listing_id")
    await db.db.offers.create_index("buyer_id")
    await db.db.offers.create_index("seller_id")
    
    # Messages collection indexes
    await db.db.messages.create_index("thread_id")
    await db.db.message_threads.create_index("participants")
    
    # Reviews collection indexes - allows bidirectional reviews (buyer->seller & seller->buyer)
    await db.db.reviews.create_index("seller_id")
    await db.db.reviews.create_index("reviewee_id")
    await db.db.reviews.create_index("reviewer_id")
    await db.db.reviews.create_index([("order_id", 1), ("review_type", 1)], unique=True)
    
    # Cart items indexes
    await db.db.cart_items.create_index("user_id")
    
    logger.info("Database indexes created")

def get_database():
    return db.db
