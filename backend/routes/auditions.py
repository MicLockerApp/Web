"""
Auditions Routes

API endpoints for the video auditions system with filtering by category and subcategory.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.audition import (
    AuditionItemCreate, AuditionItemInDB, AuditionItemResponse, AuditionItemUpdate,
    AuditionItemType, AuditionLike
)
from services.auth import get_current_user, get_current_user_optional
from database import get_database
from datetime import datetime, timezone
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auditions", tags=["Auditions"])


@router.get("", response_model=List[AuditionItemResponse])
async def get_auditions(
    category: Optional[str] = Query(None, description="Filter by user category (musician, audio_engineer, etc.)"),
    subcategory: Optional[str] = Query(None, description="Filter by user subcategory (Electric Guitar, Mixing Engineers, etc.)"),
    genre: Optional[str] = Query(None, description="Filter by music genre (Rock, Metal, Jazz, etc.)"),
    featured_only: bool = Query(False, description="Only show featured content"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get audition items with optional filtering by category, subcategory, and genre.
    
    - If no filters: returns featured content or all content
    - If category filter: returns content from users with that category
    - If subcategory filter: returns content from users with that specific subcategory
    - If genre filter: returns content from users with that genre in their profile
    """
    db = get_database()
    
    # Build query
    query = {}
    
    if featured_only or (not category and not subcategory and not genre):
        # Default to featured content when no filters
        query["is_featured"] = True
    
    if category and category != "featured":
        query["user_category"] = category
    
    if subcategory:
        # Match users who have this subcategory in their list
        query["user_subcategories"] = {"$in": [subcategory]}
    
    if genre:
        # Match users who have this genre in their list
        query["user_genres"] = {"$in": [genre]}
    
    # Fetch audition items sorted by recency
    cursor = db.auditions.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    items = await cursor.to_list(length=limit)
    
    # If no items found with filters, return empty list (frontend will show appropriate message)
    if not items:
        return []
    
    return [AuditionItemResponse(**item) for item in items]


@router.post("", response_model=AuditionItemResponse)
async def create_auditions_item(
    item_data: AuditionItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new auditions item (upload video/image).
    The item is automatically tagged with the user's category and subcategories.
    """
    db = get_database()
    
    # Get user's full profile to include category info
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Extract user's subcategories based on their category
    user_subcategories = []
    category = user.get("category")
    
    if category == "musician":
        user_subcategories = user.get("instruments", []) + user.get("genres", [])
    elif category == "audio_engineer":
        user_subcategories = user.get("specializations", [])
    elif category == "recording_studio":
        user_subcategories = user.get("offerings", [])
    elif category == "venue":
        user_subcategories = user.get("venue_types", [])
    elif category == "merchant":
        user_subcategories = user.get("product_types", [])
    elif category == "comedian":
        user_subcategories = user.get("comedy_styles", [])
    elif category == "actor":
        user_subcategories = user.get("acting_specialties", [])
    
    # Also check sub_categories field (multi-category users)
    if user.get("sub_categories"):
        user_subcategories.extend(user.get("sub_categories", []))
    
    # Create auditions item
    auditions_item = AuditionItemInDB(
        user_id=current_user["id"],
        username=current_user["username"],
        user_avatar=user.get("profile_image") or user.get("profile_picture"),
        user_category=category,
        user_subcategories=list(set(user_subcategories)),  # Remove duplicates
        user_is_verified=user.get("is_verified", False) or user.get("is_approved_seller", False),
        media_url=item_data.media_url,
        thumbnail_url=item_data.thumbnail_url,
        item_type=item_data.item_type,
        description=item_data.description,
        song_name=item_data.song_name
    )
    
    await db.auditions_items.insert_one(auditions_item.model_dump())
    
    logger.info(f"Auditions item created by {current_user['username']}: {auditions_item.id}")
    
    return AuditionItemResponse(**auditions_item.model_dump())


# ===== STATIC ROUTES MUST COME BEFORE DYNAMIC /{item_id} ROUTES =====

@router.get("/favorites", response_model=List[AuditionItemResponse])
async def get_video_favorites(
    current_user: dict = Depends(get_current_user)
):
    """Get all favorited videos for the current user."""
    db = get_database()
    
    # Get all favorites for this user
    favorites_cursor = db.video_favorites.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1)
    favorites = await favorites_cursor.to_list(length=100)
    
    # Get the audition items for these favorites
    audition_ids = [f["audition_id"] for f in favorites]
    
    if not audition_ids:
        return []
    
    # First try auditions collection, then auditions_items
    cursor = db.auditions.find(
        {"id": {"$in": audition_ids}},
        {"_id": 0}
    )
    items = await cursor.to_list(length=100)
    
    # If no items in auditions, try auditions_items
    if not items:
        cursor = db.auditions_items.find(
            {"id": {"$in": audition_ids}},
            {"_id": 0}
        )
        items = await cursor.to_list(length=100)
    
    return [AuditionItemResponse(**item) for item in items]


@router.get("/user/{user_id}", response_model=List[AuditionItemResponse])
async def get_user_auditions_items(
    user_id: str,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0)
):
    """Get all auditions items from a specific user."""
    db = get_database()
    
    cursor = db.auditions_items.find(
        {"user_id": user_id}, 
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit)
    
    items = await cursor.to_list(length=limit)
    
    return [AuditionItemResponse(**item) for item in items]


# ===== DYNAMIC ROUTES =====

@router.get("/{item_id}", response_model=AuditionItemResponse)
async def get_auditions_item(item_id: str):
    """Get a specific auditions item."""
    db = get_database()
    
    item = await db.auditions_items.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Auditions item not found")
    
    return AuditionItemResponse(**item)


@router.patch("/{item_id}", response_model=AuditionItemResponse)
async def update_auditions_item(
    item_id: str,
    update_data: AuditionItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a auditions item. Only the owner can update."""
    db = get_database()
    
    item = await db.auditions_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Auditions item not found")
    
    # Check ownership (or admin)
    if item["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to update this item")
    
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    
    if update_data.description is not None:
        update_fields["description"] = update_data.description
    if update_data.song_name is not None:
        update_fields["song_name"] = update_data.song_name
    if update_data.is_featured is not None and current_user.get("is_admin"):
        update_fields["is_featured"] = update_data.is_featured
    
    await db.auditions_items.update_one({"id": item_id}, {"$set": update_fields})
    
    updated_item = await db.auditions_items.find_one({"id": item_id}, {"_id": 0})
    return AuditionItemResponse(**updated_item)


@router.delete("/{item_id}")
async def delete_auditions_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a auditions item. Only the owner or admin can delete."""
    db = get_database()
    
    item = await db.auditions_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Auditions item not found")
    
    # Check ownership (or admin)
    if item["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
    
    await db.auditions_items.delete_one({"id": item_id})
    
    # Also delete associated likes
    await db.auditions_likes.delete_many({"auditions_item_id": item_id})
    
    logger.info(f"Auditions item {item_id} deleted by {current_user['username']}")
    
    return {"message": "Auditions item deleted successfully"}


@router.post("/{item_id}/like")
async def like_auditions_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Like a auditions item."""
    db = get_database()
    
    item = await db.auditions_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Auditions item not found")
    
    # Check if already liked
    existing_like = await db.auditions_likes.find_one({
        "auditions_item_id": item_id,
        "user_id": current_user["id"]
    })
    
    if existing_like:
        raise HTTPException(status_code=400, detail="Already liked this item")
    
    # Create like
    like = AuditionLike(auditions_item_id=item_id, user_id=current_user["id"])
    await db.auditions_likes.insert_one(like.model_dump())
    
    # Increment likes count
    await db.auditions_items.update_one(
        {"id": item_id},
        {"$inc": {"likes_count": 1}}
    )
    
    return {"message": "Liked successfully", "likes_count": item["likes_count"] + 1}


@router.delete("/{item_id}/like")
async def unlike_auditions_item(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Unlike a auditions item."""
    db = get_database()
    
    item = await db.auditions_items.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Auditions item not found")
    
    # Check if liked
    result = await db.auditions_likes.delete_one({
        "auditions_item_id": item_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="Not liked yet")
    
    # Decrement likes count
    await db.auditions_items.update_one(
        {"id": item_id},
        {"$inc": {"likes_count": -1}}
    )
    
    return {"message": "Unliked successfully", "likes_count": max(0, item["likes_count"] - 1)}


@router.post("/{item_id}/view")
async def record_view(
    item_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Record a view on a auditions item."""
    db = get_database()
    
    result = await db.auditions_items.update_one(
        {"id": item_id},
        {"$inc": {"views_count": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Auditions item not found")
    
    return {"message": "View recorded"}


@router.post("/{item_id}/favorite")
async def add_video_favorite(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a video to favorites."""
    db = get_database()
    
    # Check if audition exists (in either collection)
    item = await db.auditions.find_one({"id": item_id})
    if not item:
        item = await db.auditions_items.find_one({"id": item_id})
    
    if not item:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Check if already favorited
    existing = await db.video_favorites.find_one({
        "user_id": current_user["id"],
        "audition_id": item_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")
    
    # Add to favorites
    from datetime import datetime, timezone
    import uuid
    
    favorite = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "audition_id": item_id,
        "category": item.get("user_category"),
        "subcategory": item.get("user_subcategories", [None])[0] if item.get("user_subcategories") else None,
        "genre": item.get("user_genres", [None])[0] if item.get("user_genres") else None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.video_favorites.insert_one(favorite)
    
    logger.info(f"User {current_user['username']} added video {item_id} to favorites")
    
    return {"success": True, "message": "Added to favorites"}


@router.delete("/{item_id}/favorite")
async def remove_video_favorite(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a video from favorites."""
    db = get_database()
    
    result = await db.video_favorites.delete_one({
        "user_id": current_user["id"],
        "audition_id": item_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not in favorites")
    
    logger.info(f"User {current_user['username']} removed video {item_id} from favorites")
    
    return {"success": True, "message": "Removed from favorites"}


@router.get("/{item_id}/favorite/check")
async def check_video_favorite(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if a video is in the user's favorites."""
    db = get_database()
    
    existing = await db.video_favorites.find_one({
        "user_id": current_user["id"],
        "audition_id": item_id
    })
    
    return {"is_favorite": existing is not None}

