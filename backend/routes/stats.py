"""
Public Stats Routes for MicLocker

Provides public statistics about the platform without requiring authentication.
"""

from fastapi import APIRouter
from database import get_database
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stats", tags=["Stats"])


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
        # Count users (exclude system users)
        total_users = await db.users.count_documents({
            "is_system_user": {"$ne": True}
        })
        
        # Count all listings ever created (active, sold, traded, etc.)
        total_listings = await db.listings.count_documents({})
        
        # Get unique countries from users
        # Users store location as a string, we need to extract unique values
        pipeline = [
            {"$match": {"is_system_user": {"$ne": True}}},
            {"$match": {"country": {"$exists": True, "$ne": None, "$ne": ""}}},
            {"$group": {"_id": "$country"}},
            {"$count": "total"}
        ]
        
        countries_result = await db.users.aggregate(pipeline).to_list(length=1)
        total_countries = countries_result[0]["total"] if countries_result else 0
        
        # If no countries tracked yet, also check shipping addresses for country data
        if total_countries == 0:
            # Try to get countries from shipping_address.country field
            pipeline_shipping = [
                {"$match": {"is_system_user": {"$ne": True}}},
                {"$match": {"shipping_address.country": {"$exists": True, "$ne": None, "$ne": ""}}},
                {"$group": {"_id": "$shipping_address.country"}},
                {"$count": "total"}
            ]
            shipping_result = await db.users.aggregate(pipeline_shipping).to_list(length=1)
            total_countries = shipping_result[0]["total"] if shipping_result else 0
        
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
