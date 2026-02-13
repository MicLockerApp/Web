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
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get audition items with optional filtering by category, subcategory, and genre.
    
    Featured view logic:
    - Prioritizes users with the most recent uploads
    - Groups videos by user and picks their latest video first
    - Randomizes within time buckets for variety while keeping recent content at top
    """
    import random
    from datetime import timedelta
    db = get_database()
    
    # Determine if this is the featured view (no category filter or explicitly featured)
    is_featured_view = featured_only or not category or category == "featured"
    
    # Build query for profile_media videos - get ALL videos for featured
    video_query = {"type": "video"}
    
    # Only apply category/subcategory/genre filters if NOT featured view
    if not is_featured_view:
        if category:
            video_query["category"] = category
        if subcategory:
            video_query["subcategory"] = subcategory
        if genre:
            video_query["genre"] = genre
    
    # Get ALL videos from profile_media, sorted by upload date (newest first)
    videos = await db.profile_media.find(video_query, {"_id": 0}).sort("uploaded_at", -1).to_list(length=500)
    
    # Deduplicate by video ID and track latest video per user
    seen_ids = set()
    user_latest_video = {}  # user_id -> latest video
    all_unique_videos = []
    
    for v in videos:
        video_id = v.get("id")
        user_id = v.get("user_id")
        
        if video_id and video_id not in seen_ids:
            seen_ids.add(video_id)
            all_unique_videos.append(v)
            
            # Track the latest video per user (first one we see since sorted by date)
            if user_id and user_id not in user_latest_video:
                user_latest_video[user_id] = v
    
    videos = all_unique_videos
    logger.info(f"Found {len(videos)} unique videos in profile_media (featured={is_featured_view}, category={category})")
    
    # For featured view, prioritize users with latest content
    if is_featured_view and videos:
        now = datetime.now(timezone.utc)
        
        # Get the latest videos (one per user) and sort by upload date
        latest_per_user = list(user_latest_video.values())
        latest_per_user.sort(key=lambda x: x.get("uploaded_at", datetime.min.replace(tzinfo=timezone.utc)), reverse=True)
        
        # Split into time buckets for randomization
        # Bucket 1: Last 24 hours (most recent, randomized among themselves)
        # Bucket 2: Last 7 days
        # Bucket 3: Older content
        bucket_24h = []
        bucket_7d = []
        bucket_older = []
        
        for video in latest_per_user:
            upload_time = video.get("uploaded_at")
            if upload_time:
                if isinstance(upload_time, str):
                    try:
                        upload_time = datetime.fromisoformat(upload_time.replace('Z', '+00:00'))
                    except (ValueError, TypeError):
                        upload_time = datetime.min.replace(tzinfo=timezone.utc)
                elif upload_time.tzinfo is None:
                    upload_time = upload_time.replace(tzinfo=timezone.utc)
                    
                age = now - upload_time
                if age <= timedelta(hours=24):
                    bucket_24h.append(video)
                elif age <= timedelta(days=7):
                    bucket_7d.append(video)
                else:
                    bucket_older.append(video)
            else:
                bucket_older.append(video)
        
        # Randomize within each bucket
        random.shuffle(bucket_24h)
        random.shuffle(bucket_7d)
        random.shuffle(bucket_older)
        
        # Combine: newest first, then recent, then older
        videos = bucket_24h + bucket_7d + bucket_older
        logger.info(f"Featured sort: {len(bucket_24h)} in last 24h, {len(bucket_7d)} in last 7d, {len(bucket_older)} older")
    
    if videos:
        # Convert profile_media format to audition format
        audition_items = []
        for video in videos[offset:offset+limit]:
            # Get user info
            user = await db.users.find_one({"id": video.get("user_id")}, {"_id": 0})
            if user:
                # Build user_subcategories list
                user_subcategories = []
                if video.get("subcategory"):
                    user_subcategories = [video.get("subcategory")]
                elif user.get("subcategories"):
                    user_subcategories = user.get("subcategories")
                
                # Build user_genres list
                user_genres = []
                if video.get("genre"):
                    user_genres = [video.get("genre")]
                elif user.get("genres"):
                    user_genres = user.get("genres")
                
                audition_item = {
                    "id": video.get("id"),
                    "media_url": video.get("url"),
                    "thumbnail_url": video.get("thumbnail_url"),
                    "user_id": video.get("user_id"),
                    "username": user.get("username", "unknown"),
                    "user_avatar": user.get("avatar") or user.get("profile_image"),
                    "user_is_verified": user.get("is_verified", False),
                    "user_category": video.get("category") or user.get("category"),
                    "user_subcategories": user_subcategories,
                    "user_genres": user_genres,
                    "description": video.get("description", ""),
                    "song_name": video.get("song_name") or f"Original Sound - {user.get('username', 'unknown')}",
                    "likes_count": video.get("likes_count", 0),
                    "comments_count": video.get("comments_count", 0),
                    "shares_count": video.get("shares_count", 0),
                    "is_featured": True,
                    "created_at": video.get("uploaded_at", datetime.now(timezone.utc))
                }
                audition_items.append(audition_item)
        
        if audition_items:
            return [AuditionItemResponse(**item) for item in audition_items]
    
    # Also check auditions_items collection (videos synced from profile uploads)
    auditions_query = {}
    if not is_featured_view:
        if category:
            auditions_query["user_category"] = category
        if subcategory:
            auditions_query["user_subcategories"] = {"$in": [subcategory]}
        if genre:
            auditions_query["user_genres"] = {"$in": [genre]}
    
    items = await db.auditions_items.find(auditions_query, {"_id": 0}).to_list(length=limit)
    
    if is_featured_view and items:
        random.shuffle(items)
    
    if items:
        logger.info(f"Found {len(items)} items in auditions_items")
        return [AuditionItemResponse(**item) for item in items[offset:offset+limit]]
    
    # Finally check legacy auditions collection
    legacy_query = {}
    if is_featured_view:
        legacy_query["is_featured"] = True
    else:
        if category:
            legacy_query["user_category"] = category
        if subcategory:
            legacy_query["user_subcategories"] = {"$in": [subcategory]}
        if genre:
            legacy_query["user_genres"] = {"$in": [genre]}
    
    cursor = db.auditions.find(legacy_query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    legacy_items = await cursor.to_list(length=limit)
    
    if legacy_items:
        logger.info(f"Found {len(legacy_items)} items in auditions collection")
        return [AuditionItemResponse(**item) for item in legacy_items]
    
    logger.info("No videos found in any collection")
    return []


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
    
    # Get the video IDs
    video_ids = [f["audition_id"] for f in favorites]
    
    if not video_ids:
        return []
    
    # First check profile_media collection
    videos = await db.profile_media.find(
        {"id": {"$in": video_ids}},
        {"_id": 0}
    ).to_list(length=100)
    
    audition_items = []
    
    if videos:
        for video in videos:
            # Get user info
            user = await db.users.find_one({"id": video.get("user_id")}, {"_id": 0})
            if user:
                # Build user_subcategories list
                user_subcategories = []
                if video.get("subcategory"):
                    user_subcategories = [video.get("subcategory")]
                elif user.get("subcategories"):
                    user_subcategories = user.get("subcategories") or []
                
                # Build user_genres list
                user_genres = []
                if video.get("genre"):
                    user_genres = [video.get("genre")]
                elif user.get("genres"):
                    user_genres = user.get("genres") or []
                
                audition_item = {
                    "id": video.get("id"),
                    "media_url": video.get("url"),
                    "thumbnail_url": video.get("thumbnail_url"),
                    "user_id": video.get("user_id"),
                    "username": user.get("username", "unknown"),
                    "user_avatar": user.get("avatar") or user.get("profile_image"),
                    "user_is_verified": user.get("is_verified", False),
                    "user_category": video.get("category") or user.get("category"),
                    "user_subcategories": user_subcategories,
                    "user_genres": user_genres,
                    "description": video.get("description", ""),
                    "song_name": video.get("song_name") or f"Original Sound - {user.get('username', 'unknown')}",
                    "likes_count": video.get("likes_count", 0),
                    "comments_count": video.get("comments_count", 0),
                    "shares_count": video.get("shares_count", 0),
                    "is_featured": True,
                    "created_at": video.get("uploaded_at", datetime.now(timezone.utc))
                }
                audition_items.append(audition_item)
    
    if audition_items:
        return [AuditionItemResponse(**item) for item in audition_items]
    
    # Fallback: check auditions and auditions_items collections
    cursor = db.auditions.find(
        {"id": {"$in": video_ids}},
        {"_id": 0}
    )
    items = await cursor.to_list(length=100)
    
    if not items:
        cursor = db.auditions_items.find(
            {"id": {"$in": video_ids}},
            {"_id": 0}
        )
        items = await cursor.to_list(length=100)
    
    return [AuditionItemResponse(**item) for item in items]


@router.get("/user/{user_id}", response_model=List[AuditionItemResponse])
async def get_user_auditions_items(
    user_id: str,
    limit: int = Query(5, ge=1, le=5),
    offset: int = Query(0, ge=0)
):
    """Get all auditions items from a specific user - max 5 videos."""
    db = get_database()
    
    # First check profile_media for this user's videos
    videos = await db.profile_media.find(
        {"user_id": user_id, "type": "video"}, 
        {"_id": 0}
    ).sort("uploaded_at", -1).limit(limit).to_list(length=limit)
    
    if videos:
        # Get user info
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user:
            audition_items = []
            for video in videos:
                # Build user_subcategories list
                user_subcategories = []
                if video.get("subcategory"):
                    user_subcategories = [video.get("subcategory")]
                elif user.get("subcategories"):
                    user_subcategories = user.get("subcategories") or []
                
                # Build user_genres list
                user_genres = []
                if video.get("genre"):
                    user_genres = [video.get("genre")]
                elif user.get("genres"):
                    user_genres = user.get("genres") or []
                
                audition_item = {
                    "id": video.get("id"),
                    "media_url": video.get("url"),
                    "thumbnail_url": video.get("thumbnail_url"),
                    "user_id": video.get("user_id"),
                    "username": user.get("username", "unknown"),
                    "user_avatar": user.get("avatar") or user.get("profile_image"),
                    "user_is_verified": user.get("is_verified", False),
                    "user_category": video.get("category") or user.get("category"),
                    "user_subcategories": user_subcategories,
                    "user_genres": user_genres,
                    "description": video.get("description", ""),
                    "song_name": video.get("song_name") or f"Original Sound - {user.get('username', 'unknown')}",
                    "likes_count": video.get("likes_count", 0),
                    "comments_count": video.get("comments_count", 0),
                    "shares_count": video.get("shares_count", 0),
                    "is_featured": True,
                    "created_at": video.get("uploaded_at", datetime.now(timezone.utc))
                }
                audition_items.append(audition_item)
            
            if audition_items:
                return [AuditionItemResponse(**item) for item in audition_items]
    
    # Fallback to auditions_items collection
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
    
    # Check if video exists (check all possible collections)
    item = await db.profile_media.find_one({"id": item_id})
    if not item:
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
    
    # Get category info from the video or user
    video_category = item.get("category") or item.get("user_category")
    video_subcategory = item.get("subcategory")
    if not video_subcategory and item.get("user_subcategories"):
        video_subcategory = item.get("user_subcategories", [None])[0]
    video_genre = item.get("genre")
    if not video_genre and item.get("user_genres"):
        video_genre = item.get("user_genres", [None])[0]
    
    favorite = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "audition_id": item_id,
        "video_owner_id": item.get("user_id"),
        "category": video_category,
        "subcategory": video_subcategory,
        "genre": video_genre,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.video_favorites.insert_one(favorite)
    
    # Also increment the likes_count on the video
    await db.profile_media.update_one(
        {"id": item_id},
        {"$inc": {"likes_count": 1}}
    )
    
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
    
    # Decrement the likes_count on the video
    await db.profile_media.update_one(
        {"id": item_id},
        {"$inc": {"likes_count": -1}}
    )
    
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

