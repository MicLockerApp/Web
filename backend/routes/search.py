from fastapi import APIRouter, Query, Depends
from database import get_database
from services.auth import get_current_user_optional
from utils.helpers import serialize_docs
from typing import Optional

router = APIRouter(prefix="/search", tags=["Search"])

@router.get("/global")
async def global_search(
    q: Optional[str] = Query(None, min_length=1),
    limit: int = Query(5, ge=1, le=20),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Global search across listings and users.
    Returns quick results for search-as-you-type functionality.
    Note: User search results are only returned for authenticated users.
    """
    if not q or len(q.strip()) < 1:
        return {
            "listings": [],
            "users": [],
            "query": q,
            "authenticated": current_user is not None
        }
    
    db = get_database()
    search_term = q.strip()
    
    # Search listings (available to everyone)
    listing_filter = {
        "status": "active",
        "$or": [
            {"title": {"$regex": search_term, "$options": "i"}},
            {"brand": {"$regex": search_term, "$options": "i"}},
            {"model": {"$regex": search_term, "$options": "i"}},
            {"description": {"$regex": search_term, "$options": "i"}},
            {"category": {"$regex": search_term, "$options": "i"}}
        ]
    }
    
    listings_cursor = db.listings.find(
        listing_filter,
        {"id": 1, "title": 1, "price": 1, "images": 1, "brand": 1, "model": 1, "seller_username": 1}
    ).limit(limit).sort("created_at", -1)
    listings = await listings_cursor.to_list(length=limit)
    
    # Search users - ONLY if authenticated
    formatted_users = []
    if current_user is not None:
        user_filter = {
            "$or": [
                {"username": {"$regex": search_term, "$options": "i"}},
                {"bio": {"$regex": search_term, "$options": "i"}}
            ]
        }
        
        users_cursor = db.users.find(
            user_filter,
            {"id": 1, "username": 1, "profile_image": 1, "category": 1, "rating": 1, "bio": 1}
        ).limit(limit).sort("created_at", -1)
        users = await users_cursor.to_list(length=limit)
        
        # Format user results
        for user in users:
            formatted_users.append({
                "id": user.get("id"),
                "username": user.get("username"),
                "profile_image": user.get("profile_image"),
                "category": user.get("category"),
                "rating": user.get("rating", 0),
                "bio": user.get("bio", "")[:100] if user.get("bio") else ""
            })
    
    return {
        "listings": serialize_docs(listings),
        "users": formatted_users,
        "query": search_term,
        "authenticated": current_user is not None
    }
