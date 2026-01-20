from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging
import os

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

def get_database_name_from_url(mongo_url: str) -> str:
    """Extract database name from MongoDB URL or use settings"""
    # For Atlas URLs like: mongodb+srv://user:pass@cluster.mongodb.net/dbname?...
    # Try to extract database name from URL
    if '/' in mongo_url:
        # Get the part after the last / and before any ?
        path_part = mongo_url.split('/')[-1]
        if '?' in path_part:
            db_name = path_part.split('?')[0]
        else:
            db_name = path_part
        
        # If we got a valid db name from URL, use it
        if db_name and db_name not in ['', 'admin', 'local']:
            return db_name
    
    # Fall back to settings
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
        db.client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=30000,  # 30 second timeout
            connectTimeoutMS=30000,
            socketTimeoutMS=30000,
            retryWrites=True,
            w='majority'
        )
        
        # Get database name
        db_name = get_database_name_from_url(mongo_url)
        db.db = db.client[db_name]
        
        # Test connection
        await db.client.admin.command('ping')
        logger.info(f"Connected to MongoDB database: {db_name}")
        
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
