from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    """Connect to MongoDB"""
    logger.info(f"Connecting to MongoDB at {settings.mongo_url}")
    db.client = AsyncIOMotorClient(settings.mongo_url)
    db.db = db.client[settings.database_name]
    
    # Create indexes
    await create_indexes()
    logger.info("Connected to MongoDB")

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
