"""
Public Stats Routes for MicLocker

Provides public statistics about the platform without requiring authentication.
"""

from fastapi import APIRouter
from database import get_database, get_database_name
import logging
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/debug")
async def get_debug_info():
    """
    Debug endpoint to diagnose database connection issues.
    Returns information about database configuration and connection status.
    """
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name_env = os.getenv("DB_NAME", "NOT SET")
    
    # Mask the password in MONGO_URL for security
    if "@" in mongo_url:
        parts = mongo_url.split("@")
        masked_url = "mongodb+srv://***:***@" + parts[1] if "mongodb+srv://" in mongo_url else "mongodb://***:***@" + parts[1]
    else:
        masked_url = mongo_url
    
    db_name_used = get_database_name()
    
    # Try to list collections to verify access
    collections = []
    user_count = 0
    admin_exists = False
    error_message = None
    
    try:
        db = get_database()
        collections = await db.list_collection_names()
        user_count = await db.users.count_documents({})
        admin_user = await db.users.find_one({"username": "miclocker.support"})
        admin_exists = admin_user is not None
    except Exception as e:
        error_message = str(e)
    
    return {
        "mongo_url_masked": masked_url,
        "db_name_env_var": db_name_env,
        "db_name_used": db_name_used,
        "is_atlas": "mongodb+srv://" in mongo_url or "mongodb.net" in mongo_url,
        "collections": collections,
        "user_count": user_count,
        "admin_user_exists": admin_exists,
        "error": error_message
    }


@router.get("/public")
async def get_public_stats():
    """
    Get public platform statistics for the About page.
    
    Returns:
        - total_users: Number of registered users (excluding system users)
        - total_listings: Number of listings (all statuses for total ever listed)
        - total_countries: Number of unique countries users are from
    """
    db = get_database()
    
    try:
        # Count users (exclude system users and employees)
        total_users = await db.users.count_documents({
            "is_system_user": {"$ne": True},
            "is_employee": {"$ne": True}
        })
        
        # Count all listings ever created (active, sold, traded, etc.)
        total_listings = await db.listings.count_documents({})
        
        # Get unique countries from shipping_address.country
        pipeline_shipping = [
            {"$match": {
                "is_system_user": {"$ne": True},
                "is_employee": {"$ne": True}
            }},
            {"$match": {"shipping_address.country": {"$exists": True, "$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$shipping_address.country"}},
            {"$count": "total"}
        ]
        shipping_result = await db.users.aggregate(pipeline_shipping).to_list(length=1)
        total_countries = shipping_result[0]["total"] if shipping_result else 0
        
        # If no countries from shipping address, try to get from location field
        if total_countries == 0:
            # Get unique locations (might contain city, state, country)
            pipeline_location = [
                {"$match": {
                    "is_system_user": {"$ne": True},
                    "is_employee": {"$ne": True},
                    "location": {"$exists": True, "$ne": None, "$ne": ""}
                }},
                {"$group": {"_id": "$location"}},
                {"$count": "total"}
            ]
            location_result = await db.users.aggregate(pipeline_location).to_list(length=1)
            # Use locations as a rough proxy for geographic diversity
            total_countries = min(location_result[0]["total"] if location_result else 0, 50)
        
        # Ensure we show at least 1 if we have any users with location data
        if total_countries == 0 and total_users > 0:
            # Check if any user has any location-related data
            user_with_location = await db.users.find_one({
                "is_system_user": {"$ne": True},
                "$or": [
                    {"location": {"$exists": True, "$ne": None, "$ne": ""}},
                    {"shipping_address.country": {"$exists": True, "$ne": None, "$ne": ""}}
                ]
            })
            if user_with_location:
                total_countries = 1
        
        return {
            "total_users": total_users,
            "total_listings": total_listings,
            "total_countries": total_countries
        }
        
    except Exception as e:
        logger.error(f"Error fetching public stats: {e}")
        # Return zeros on error rather than failing
        return {
            "total_users": 0,
            "total_listings": 0,
            "total_countries": 0
        }
