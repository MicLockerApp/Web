"""
Learn Section Routes

API endpoints for the educational content platform including:
- Channel management
- Playlist and video management
- Subscriptions and purchases
- Reviews
- Admin banners
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
from database import get_database
from services.auth import get_current_user, get_current_user_optional
from models.learn import (
    ChannelCreate, ChannelUpdate, ChannelInDB, ChannelResponse,
    SubscriptionTierCreate, SubscriptionTierUpdate, SubscriptionTierInDB, SubscriptionTierResponse,
    PlaylistCreate, PlaylistUpdate, PlaylistInDB, PlaylistResponse,
    LearnVideoCreate, LearnVideoUpdate, LearnVideoInDB, LearnVideoResponse,
    ReviewCreate, ReviewInDB, ReviewResponse, ReviewTargetType,
    LearnBannerCreate, LearnBannerUpdate, LearnBannerInDB, LearnBannerResponse,
    ChannelSubscriptionInDB, FavoriteInDB, PurchaseInDB, PurchaseType
)
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learn", tags=["Learn"])


# ============== Helper Functions ==============

async def get_user_info(db, user_id: str) -> dict:
    """Get basic user info for responses"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "username": 1, "profile_image": 1, "avatar": 1, "is_verified": 1})
    if user:
        return {
            "username": user.get("username"),
            "avatar": user.get("avatar") or user.get("profile_image"),
            "is_verified": user.get("is_verified", False)
        }
    return {"username": None, "avatar": None, "is_verified": False}


async def check_channel_owner(db, channel_id: str, user_id: str) -> dict:
    """Check if user owns the channel and return channel"""
    channel = await db.learn_channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    if channel["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="You don't own this channel")
    return channel


# ============== Channel Endpoints ==============

@router.post("/channels", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_channel(
    channel_data: ChannelCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a teaching channel for the current user"""
    db = get_database()
    
    # Check if user already has a channel
    existing = await db.learn_channels.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a channel")
    
    channel = ChannelInDB(
        user_id=current_user["id"],
        **channel_data.model_dump()
    )
    
    await db.learn_channels.insert_one(channel.model_dump())
    
    user_info = await get_user_info(db, current_user["id"])
    return ChannelResponse(
        **channel.model_dump(),
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        owner_is_verified=user_info["is_verified"]
    )


@router.get("/channels", response_model=List[ChannelResponse])
async def get_channels(
    category: Optional[str] = Query(None, description="Filter by category"),
    subcategory: Optional[str] = Query(None, description="Filter by subcategory"),
    search: Optional[str] = Query(None, description="Search by name"),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: str = Query("newest", description="Sort by: newest, popular, rating"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get all channels with optional filters"""
    db = get_database()
    
    query = {}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategories"] = {"$in": [subcategory]}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if min_rating is not None:
        query["average_rating"] = {"$gte": min_rating}
    
    # Sorting
    sort_field = "created_at"
    sort_order = -1
    if sort_by == "popular":
        sort_field = "subscriber_count"
    elif sort_by == "rating":
        sort_field = "average_rating"
    
    cursor = db.learn_channels.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(offset).limit(limit)
    channels = await cursor.to_list(length=limit)
    
    # Add owner info
    result = []
    for channel in channels:
        user_info = await get_user_info(db, channel["user_id"])
        result.append(ChannelResponse(
            **channel,
            owner_username=user_info["username"],
            owner_avatar=user_info["avatar"],
            owner_is_verified=user_info["is_verified"]
        ))
    
    return result


@router.get("/channels/trending", response_model=List[ChannelResponse])
async def get_trending_channels(
    limit: int = Query(10, ge=1, le=20),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get trending channels based on recent activity"""
    db = get_database()
    
    # Trending = combination of views, subscribers, and recency
    cursor = db.learn_channels.find({}, {"_id": 0}).sort([
        ("total_views", -1),
        ("subscriber_count", -1),
        ("created_at", -1)
    ]).limit(limit)
    channels = await cursor.to_list(length=limit)
    
    result = []
    for channel in channels:
        user_info = await get_user_info(db, channel["user_id"])
        result.append(ChannelResponse(
            **channel,
            owner_username=user_info["username"],
            owner_avatar=user_info["avatar"],
            owner_is_verified=user_info["is_verified"]
        ))
    
    return result


@router.get("/channels/my", response_model=Optional[ChannelResponse])
async def get_my_channel(current_user: dict = Depends(get_current_user)):
    """Get the current user's channel"""
    db = get_database()
    
    channel = await db.learn_channels.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not channel:
        return None
    
    user_info = await get_user_info(db, current_user["id"])
    return ChannelResponse(
        **channel,
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        owner_is_verified=user_info["is_verified"]
    )


@router.get("/channels/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get a specific channel"""
    db = get_database()
    
    channel = await db.learn_channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Increment view count
    await db.learn_channels.update_one(
        {"id": channel_id},
        {"$inc": {"total_views": 1}}
    )
    
    user_info = await get_user_info(db, channel["user_id"])
    return ChannelResponse(
        **channel,
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        owner_is_verified=user_info["is_verified"]
    )


@router.put("/channels/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: str,
    channel_data: ChannelUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a channel (owner only)"""
    db = get_database()
    
    await check_channel_owner(db, channel_id, current_user["id"])
    
    update_data = {k: v for k, v in channel_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.learn_channels.update_one({"id": channel_id}, {"$set": update_data})
    
    updated = await db.learn_channels.find_one({"id": channel_id}, {"_id": 0})
    user_info = await get_user_info(db, current_user["id"])
    
    return ChannelResponse(
        **updated,
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        owner_is_verified=user_info["is_verified"]
    )


# ============== Subscription Tier Endpoints ==============

@router.post("/channels/{channel_id}/tiers", response_model=SubscriptionTierResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription_tier(
    channel_id: str,
    tier_data: SubscriptionTierCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a subscription tier for a channel"""
    db = get_database()
    
    await check_channel_owner(db, channel_id, current_user["id"])
    
    tier = SubscriptionTierInDB(
        channel_id=channel_id,
        **tier_data.model_dump()
    )
    
    await db.learn_subscription_tiers.insert_one(tier.model_dump())
    return SubscriptionTierResponse(**tier.model_dump())


@router.get("/channels/{channel_id}/tiers", response_model=List[SubscriptionTierResponse])
async def get_channel_tiers(
    channel_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get all subscription tiers for a channel"""
    db = get_database()
    
    cursor = db.learn_subscription_tiers.find(
        {"channel_id": channel_id, "is_active": True},
        {"_id": 0}
    ).sort("order", 1)
    tiers = await cursor.to_list(length=100)
    
    return [SubscriptionTierResponse(**tier) for tier in tiers]


@router.put("/channels/{channel_id}/tiers/{tier_id}", response_model=SubscriptionTierResponse)
async def update_subscription_tier(
    channel_id: str,
    tier_id: str,
    tier_data: SubscriptionTierUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a subscription tier"""
    db = get_database()
    
    await check_channel_owner(db, channel_id, current_user["id"])
    
    tier = await db.learn_subscription_tiers.find_one({"id": tier_id, "channel_id": channel_id}, {"_id": 0})
    if not tier:
        raise HTTPException(status_code=404, detail="Tier not found")
    
    update_data = {k: v for k, v in tier_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.learn_subscription_tiers.update_one({"id": tier_id}, {"$set": update_data})
    
    updated = await db.learn_subscription_tiers.find_one({"id": tier_id}, {"_id": 0})
    return SubscriptionTierResponse(**updated)


@router.delete("/channels/{channel_id}/tiers/{tier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription_tier(
    channel_id: str,
    tier_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete (deactivate) a subscription tier"""
    db = get_database()
    
    await check_channel_owner(db, channel_id, current_user["id"])
    
    await db.learn_subscription_tiers.update_one(
        {"id": tier_id, "channel_id": channel_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )


# ============== Playlist Endpoints ==============

@router.post("/playlists", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
async def create_playlist(
    playlist_data: PlaylistCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new playlist"""
    db = get_database()
    
    # Get or create user's channel
    channel = await db.learn_channels.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not channel:
        # Auto-create channel
        user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
        channel = ChannelInDB(
            user_id=current_user["id"],
            name=f"{user.get('username', 'User')}'s Channel",
            category=user.get("category", "musician"),
            subcategories=user.get("subcategories", [])
        ).model_dump()
        await db.learn_channels.insert_one(channel)
    
    playlist = PlaylistInDB(
        channel_id=channel["id"],
        user_id=current_user["id"],
        **playlist_data.model_dump()
    )
    
    await db.learn_playlists.insert_one(playlist.model_dump())
    
    user_info = await get_user_info(db, current_user["id"])
    return PlaylistResponse(
        **playlist.model_dump(),
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        channel_name=channel["name"]
    )


@router.get("/playlists", response_model=List[PlaylistResponse])
async def get_playlists(
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None),
    free_only: bool = Query(False),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    sort_by: str = Query("newest", description="Sort by: newest, popular, rating, price_low, price_high"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get playlists with filters"""
    db = get_database()
    
    query = {"is_published": True}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}}
        ]
    if free_only:
        query["is_free"] = True
    else:
        if min_price is not None:
            query["price_usd"] = {"$gte": min_price}
        if max_price is not None:
            query.setdefault("price_usd", {})["$lte"] = max_price
    if min_rating is not None:
        query["average_rating"] = {"$gte": min_rating}
    
    # Sorting
    sort_options = {
        "newest": ("created_at", -1),
        "popular": ("view_count", -1),
        "rating": ("average_rating", -1),
        "price_low": ("price_usd", 1),
        "price_high": ("price_usd", -1)
    }
    sort_field, sort_order = sort_options.get(sort_by, ("created_at", -1))
    
    cursor = db.learn_playlists.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(offset).limit(limit)
    playlists = await cursor.to_list(length=limit)
    
    result = []
    for playlist in playlists:
        user_info = await get_user_info(db, playlist["user_id"])
        channel = await db.learn_channels.find_one({"id": playlist["channel_id"]}, {"_id": 0, "name": 1})
        result.append(PlaylistResponse(
            **playlist,
            owner_username=user_info["username"],
            owner_avatar=user_info["avatar"],
            channel_name=channel["name"] if channel else None
        ))
    
    return result


@router.get("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get a specific playlist"""
    db = get_database()
    
    playlist = await db.learn_playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Increment view count
    await db.learn_playlists.update_one({"id": playlist_id}, {"$inc": {"view_count": 1}})
    
    user_info = await get_user_info(db, playlist["user_id"])
    channel = await db.learn_channels.find_one({"id": playlist["channel_id"]}, {"_id": 0, "name": 1})
    
    return PlaylistResponse(
        **playlist,
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        channel_name=channel["name"] if channel else None
    )


@router.put("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: str,
    playlist_data: PlaylistUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a playlist (owner only)"""
    db = get_database()
    
    playlist = await db.learn_playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You don't own this playlist")
    
    update_data = {k: v for k, v in playlist_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.learn_playlists.update_one({"id": playlist_id}, {"$set": update_data})
    
    updated = await db.learn_playlists.find_one({"id": playlist_id}, {"_id": 0})
    user_info = await get_user_info(db, current_user["id"])
    channel = await db.learn_channels.find_one({"id": updated["channel_id"]}, {"_id": 0, "name": 1})
    
    return PlaylistResponse(
        **updated,
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        channel_name=channel["name"] if channel else None
    )


@router.delete("/playlists/{playlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_playlist(
    playlist_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a playlist"""
    db = get_database()
    
    playlist = await db.learn_playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    if playlist["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You don't own this playlist")
    
    # Delete playlist and its videos
    await db.learn_playlists.delete_one({"id": playlist_id})
    await db.learn_videos.delete_many({"playlist_id": playlist_id})


# ============== Video Endpoints ==============

@router.post("/videos", response_model=LearnVideoResponse, status_code=status.HTTP_201_CREATED)
async def create_video(
    video_data: LearnVideoCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create/upload a new video"""
    db = get_database()
    
    # Get or create user's channel
    channel = await db.learn_channels.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not channel:
        user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
        channel = ChannelInDB(
            user_id=current_user["id"],
            name=f"{user.get('username', 'User')}'s Channel",
            category=user.get("category", "musician"),
            subcategories=user.get("subcategories", [])
        ).model_dump()
        await db.learn_channels.insert_one(channel)
    
    # Validate playlist if provided
    playlist = None
    if video_data.playlist_id:
        playlist = await db.learn_playlists.find_one({"id": video_data.playlist_id}, {"_id": 0})
        if not playlist:
            raise HTTPException(status_code=404, detail="Playlist not found")
        if playlist["user_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="You don't own this playlist")
    
    video = LearnVideoInDB(
        channel_id=channel["id"],
        user_id=current_user["id"],
        **video_data.model_dump()
    )
    
    await db.learn_videos.insert_one(video.model_dump())
    
    # Update playlist video count if applicable
    if playlist:
        await db.learn_playlists.update_one(
            {"id": video_data.playlist_id},
            {
                "$inc": {"video_count": 1, "total_duration_seconds": video_data.duration_seconds},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    user_info = await get_user_info(db, current_user["id"])
    return LearnVideoResponse(
        **video.model_dump(),
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        channel_name=channel["name"],
        playlist_title=playlist["title"] if playlist else None
    )


@router.get("/videos", response_model=List[LearnVideoResponse])
async def get_videos(
    channel_id: Optional[str] = Query(None),
    playlist_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    free_only: bool = Query(False),
    standalone_only: bool = Query(False, description="Only videos not in playlists"),
    sort_by: str = Query("newest"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get videos with filters"""
    db = get_database()
    
    query = {"is_published": True}
    if channel_id:
        query["channel_id"] = channel_id
    if playlist_id:
        query["playlist_id"] = playlist_id
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}}
        ]
    if free_only:
        query["is_free"] = True
    if standalone_only:
        query["playlist_id"] = None
    
    sort_options = {
        "newest": ("created_at", -1),
        "popular": ("view_count", -1),
        "rating": ("average_rating", -1)
    }
    sort_field, sort_order = sort_options.get(sort_by, ("created_at", -1))
    
    cursor = db.learn_videos.find(query, {"_id": 0}).sort(sort_field, sort_order).skip(offset).limit(limit)
    videos = await cursor.to_list(length=limit)
    
    result = []
    for video in videos:
        user_info = await get_user_info(db, video["user_id"])
        channel = await db.learn_channels.find_one({"id": video["channel_id"]}, {"_id": 0, "name": 1})
        playlist = None
        if video.get("playlist_id"):
            playlist = await db.learn_playlists.find_one({"id": video["playlist_id"]}, {"_id": 0, "title": 1})
        
        result.append(LearnVideoResponse(
            **video,
            owner_username=user_info["username"],
            owner_avatar=user_info["avatar"],
            channel_name=channel["name"] if channel else None,
            playlist_title=playlist["title"] if playlist else None
        ))
    
    return result


@router.get("/videos/{video_id}", response_model=LearnVideoResponse)
async def get_video(
    video_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get a specific video"""
    db = get_database()
    
    video = await db.learn_videos.find_one({"id": video_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Increment view count
    await db.learn_videos.update_one({"id": video_id}, {"$inc": {"view_count": 1}})
    
    user_info = await get_user_info(db, video["user_id"])
    channel = await db.learn_channels.find_one({"id": video["channel_id"]}, {"_id": 0, "name": 1})
    playlist = None
    if video.get("playlist_id"):
        playlist = await db.learn_playlists.find_one({"id": video["playlist_id"]}, {"_id": 0, "title": 1})
    
    return LearnVideoResponse(
        **video,
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        channel_name=channel["name"] if channel else None,
        playlist_title=playlist["title"] if playlist else None
    )


@router.put("/videos/{video_id}", response_model=LearnVideoResponse)
async def update_video(
    video_id: str,
    video_data: LearnVideoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a video"""
    db = get_database()
    
    video = await db.learn_videos.find_one({"id": video_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You don't own this video")
    
    # Handle moving video to a playlist
    old_playlist_id = video.get("playlist_id")
    new_playlist_id = video_data.playlist_id
    
    update_data = {k: v for k, v in video_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.learn_videos.update_one({"id": video_id}, {"$set": update_data})
    
    # Update playlist counts if playlist changed
    if new_playlist_id != old_playlist_id:
        if old_playlist_id:
            await db.learn_playlists.update_one(
                {"id": old_playlist_id},
                {"$inc": {"video_count": -1, "total_duration_seconds": -video.get("duration_seconds", 0)}}
            )
        if new_playlist_id:
            await db.learn_playlists.update_one(
                {"id": new_playlist_id},
                {"$inc": {"video_count": 1, "total_duration_seconds": video.get("duration_seconds", 0)}}
            )
    
    updated = await db.learn_videos.find_one({"id": video_id}, {"_id": 0})
    user_info = await get_user_info(db, current_user["id"])
    channel = await db.learn_channels.find_one({"id": updated["channel_id"]}, {"_id": 0, "name": 1})
    playlist = None
    if updated.get("playlist_id"):
        playlist = await db.learn_playlists.find_one({"id": updated["playlist_id"]}, {"_id": 0, "title": 1})
    
    return LearnVideoResponse(
        **updated,
        owner_username=user_info["username"],
        owner_avatar=user_info["avatar"],
        channel_name=channel["name"] if channel else None,
        playlist_title=playlist["title"] if playlist else None
    )


@router.delete("/videos/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a video"""
    db = get_database()
    
    video = await db.learn_videos.find_one({"id": video_id}, {"_id": 0})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You don't own this video")
    
    # Update playlist count if applicable
    if video.get("playlist_id"):
        await db.learn_playlists.update_one(
            {"id": video["playlist_id"]},
            {"$inc": {"video_count": -1, "total_duration_seconds": -video.get("duration_seconds", 0)}}
        )
    
    await db.learn_videos.delete_one({"id": video_id})


# ============== Channel Content Endpoints ==============

@router.get("/channels/{channel_id}/content")
async def get_channel_content(
    channel_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get all content for a channel (free videos and playlists)"""
    db = get_database()
    
    channel = await db.learn_channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Get free standalone videos
    free_videos = await db.learn_videos.find(
        {"channel_id": channel_id, "playlist_id": None, "is_published": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    # Get all playlists
    playlists = await db.learn_playlists.find(
        {"channel_id": channel_id, "is_published": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(length=100)
    
    # Get subscription tiers
    tiers = await db.learn_subscription_tiers.find(
        {"channel_id": channel_id, "is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(length=20)
    
    return {
        "free_videos": free_videos,
        "playlists": playlists,
        "subscription_tiers": tiers
    }


# ============== Search Endpoint ==============

@router.get("/search")
async def search_learn(
    q: str = Query(..., min_length=1, description="Search query"),
    type: Optional[str] = Query(None, description="Filter by type: channel, playlist, video"),
    category: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Search across channels, playlists, and videos"""
    db = get_database()
    
    results = {
        "channels": [],
        "playlists": [],
        "videos": []
    }
    
    search_regex = {"$regex": q, "$options": "i"}
    
    if not type or type == "channel":
        channel_query = {"$or": [{"name": search_regex}, {"description": search_regex}]}
        if category:
            channel_query["category"] = category
        channels = await db.learn_channels.find(channel_query, {"_id": 0}).limit(limit).to_list(length=limit)
        for ch in channels:
            user_info = await get_user_info(db, ch["user_id"])
            results["channels"].append({**ch, **user_info})
    
    if not type or type == "playlist":
        playlist_query = {
            "is_published": True,
            "$or": [{"title": search_regex}, {"description": search_regex}, {"tags": {"$in": [q]}}]
        }
        if category:
            playlist_query["category"] = category
        playlists = await db.learn_playlists.find(playlist_query, {"_id": 0}).limit(limit).to_list(length=limit)
        results["playlists"] = playlists
    
    if not type or type == "video":
        video_query = {
            "is_published": True,
            "$or": [{"title": search_regex}, {"description": search_regex}, {"tags": {"$in": [q]}}]
        }
        if category:
            video_query["category"] = category
        videos = await db.learn_videos.find(video_query, {"_id": 0}).limit(limit).to_list(length=limit)
        results["videos"] = videos
    
    return results


# ============== Review Endpoints ==============

@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for a channel, playlist, or video"""
    db = get_database()
    
    # Verify target exists
    collection_map = {
        ReviewTargetType.CHANNEL: "learn_channels",
        ReviewTargetType.PLAYLIST: "learn_playlists",
        ReviewTargetType.VIDEO: "learn_videos"
    }
    collection = collection_map[review_data.target_type]
    target = await db[collection].find_one({"id": review_data.target_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail=f"{review_data.target_type.value.title()} not found")
    
    # Check if user already reviewed
    existing = await db.learn_reviews.find_one({
        "user_id": current_user["id"],
        "target_type": review_data.target_type.value,
        "target_id": review_data.target_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this content")
    
    # Check if user purchased (for verified purchase badge)
    is_verified = False
    if review_data.target_type in [ReviewTargetType.PLAYLIST, ReviewTargetType.VIDEO]:
        purchase = await db.learn_purchases.find_one({
            "user_id": current_user["id"],
            "item_id": review_data.target_id
        })
        is_verified = purchase is not None
    
    review = ReviewInDB(
        user_id=current_user["id"],
        is_verified_purchase=is_verified,
        **review_data.model_dump()
    )
    
    await db.learn_reviews.insert_one(review.model_dump())
    
    # Update target's average rating
    reviews = await db.learn_reviews.find(
        {"target_type": review_data.target_type.value, "target_id": review_data.target_id},
        {"_id": 0, "rating": 1}
    ).to_list(length=1000)
    
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        await db[collection].update_one(
            {"id": review_data.target_id},
            {"$set": {"average_rating": round(avg_rating, 2), "review_count": len(reviews)}}
        )
    
    user_info = await get_user_info(db, current_user["id"])
    return ReviewResponse(
        **review.model_dump(),
        reviewer_username=user_info["username"],
        reviewer_avatar=user_info["avatar"]
    )


@router.get("/reviews/{target_type}/{target_id}", response_model=List[ReviewResponse])
async def get_reviews(
    target_type: ReviewTargetType,
    target_id: str,
    sort_by: str = Query("newest", description="Sort by: newest, helpful, rating_high, rating_low"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get reviews for a channel, playlist, or video"""
    db = get_database()
    
    sort_options = {
        "newest": ("created_at", -1),
        "helpful": ("helpful_count", -1),
        "rating_high": ("rating", -1),
        "rating_low": ("rating", 1)
    }
    sort_field, sort_order = sort_options.get(sort_by, ("created_at", -1))
    
    cursor = db.learn_reviews.find(
        {"target_type": target_type.value, "target_id": target_id, "reported": False},
        {"_id": 0}
    ).sort(sort_field, sort_order).skip(offset).limit(limit)
    
    reviews = await cursor.to_list(length=limit)
    
    result = []
    for review in reviews:
        user_info = await get_user_info(db, review["user_id"])
        result.append(ReviewResponse(
            **review,
            reviewer_username=user_info["username"],
            reviewer_avatar=user_info["avatar"]
        ))
    
    return result


# ============== Subscription Endpoints ==============

@router.post("/channels/{channel_id}/subscribe", status_code=status.HTTP_201_CREATED)
async def subscribe_to_channel(
    channel_id: str,
    tier_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Subscribe to a channel (free follow or paid tier)"""
    db = get_database()
    
    channel = await db.learn_channels.find_one({"id": channel_id}, {"_id": 0})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    if channel["user_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot subscribe to your own channel")
    
    # Check existing subscription
    existing = await db.learn_subscriptions.find_one({
        "user_id": current_user["id"],
        "channel_id": channel_id
    })
    
    if existing and not tier_id:
        raise HTTPException(status_code=400, detail="Already subscribed")
    
    subscription = ChannelSubscriptionInDB(
        user_id=current_user["id"],
        channel_id=channel_id,
        tier_id=tier_id,
        is_paid=tier_id is not None
    )
    
    if existing:
        await db.learn_subscriptions.update_one(
            {"id": existing["id"]},
            {"$set": {"tier_id": tier_id, "is_paid": tier_id is not None}}
        )
    else:
        await db.learn_subscriptions.insert_one(subscription.model_dump())
        await db.learn_channels.update_one({"id": channel_id}, {"$inc": {"subscriber_count": 1}})
    
    return {"message": "Subscribed successfully", "subscription": subscription.model_dump()}


@router.delete("/channels/{channel_id}/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe_from_channel(
    channel_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Unsubscribe from a channel"""
    db = get_database()
    
    result = await db.learn_subscriptions.delete_one({
        "user_id": current_user["id"],
        "channel_id": channel_id
    })
    
    if result.deleted_count:
        await db.learn_channels.update_one({"id": channel_id}, {"$inc": {"subscriber_count": -1}})


@router.get("/subscriptions", response_model=List[ChannelResponse])
async def get_my_subscriptions(
    current_user: dict = Depends(get_current_user)
):
    """Get channels the user is subscribed to"""
    db = get_database()
    
    subs = await db.learn_subscriptions.find(
        {"user_id": current_user["id"]},
        {"_id": 0, "channel_id": 1}
    ).to_list(length=100)
    
    channel_ids = [s["channel_id"] for s in subs]
    channels = await db.learn_channels.find(
        {"id": {"$in": channel_ids}},
        {"_id": 0}
    ).to_list(length=100)
    
    result = []
    for channel in channels:
        user_info = await get_user_info(db, channel["user_id"])
        result.append(ChannelResponse(
            **channel,
            owner_username=user_info["username"],
            owner_avatar=user_info["avatar"],
            owner_is_verified=user_info["is_verified"]
        ))
    
    return result


# ============== Favorites Endpoints ==============

@router.post("/favorites/{target_type}/{target_id}", status_code=status.HTTP_201_CREATED)
async def add_favorite(
    target_type: str,
    target_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a playlist or video to favorites"""
    db = get_database()
    
    if target_type not in ["playlist", "video"]:
        raise HTTPException(status_code=400, detail="Invalid target type")
    
    existing = await db.learn_favorites.find_one({
        "user_id": current_user["id"],
        "target_type": target_type,
        "target_id": target_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")
    
    favorite = FavoriteInDB(
        user_id=current_user["id"],
        target_type=target_type,
        target_id=target_id
    )
    
    await db.learn_favorites.insert_one(favorite.model_dump())
    return {"message": "Added to favorites"}


@router.delete("/favorites/{target_type}/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    target_type: str,
    target_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove from favorites"""
    db = get_database()
    
    await db.learn_favorites.delete_one({
        "user_id": current_user["id"],
        "target_type": target_type,
        "target_id": target_id
    })


@router.get("/favorites")
async def get_favorites(
    current_user: dict = Depends(get_current_user)
):
    """Get user's favorite playlists and videos"""
    db = get_database()
    
    favorites = await db.learn_favorites.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(length=100)
    
    result = {"playlists": [], "videos": []}
    
    for fav in favorites:
        if fav["target_type"] == "playlist":
            playlist = await db.learn_playlists.find_one({"id": fav["target_id"]}, {"_id": 0})
            if playlist:
                result["playlists"].append(playlist)
        elif fav["target_type"] == "video":
            video = await db.learn_videos.find_one({"id": fav["target_id"]}, {"_id": 0})
            if video:
                result["videos"].append(video)
    
    return result


# ============== Admin Banner Endpoints ==============

@router.get("/banners", response_model=List[LearnBannerResponse])
async def get_banners(
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get active banners for Learn homepage"""
    db = get_database()
    
    cursor = db.learn_banners.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("order", 1).limit(5)
    
    banners = await cursor.to_list(length=5)
    return [LearnBannerResponse(**banner) for banner in banners]


@router.post("/banners", response_model=LearnBannerResponse, status_code=status.HTTP_201_CREATED)
async def create_banner(
    banner_data: LearnBannerCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a banner (admin only)"""
    db = get_database()
    
    # Check if user is admin
    if not current_user.get("is_admin") and current_user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check banner limit
    count = await db.learn_banners.count_documents({"is_active": True})
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 active banners allowed")
    
    banner = LearnBannerInDB(
        created_by=current_user["id"],
        **banner_data.model_dump()
    )
    
    await db.learn_banners.insert_one(banner.model_dump())
    return LearnBannerResponse(**banner.model_dump())


@router.put("/banners/{banner_id}", response_model=LearnBannerResponse)
async def update_banner(
    banner_id: str,
    banner_data: LearnBannerUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a banner (admin only)"""
    db = get_database()
    
    if not current_user.get("is_admin") and current_user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    banner = await db.learn_banners.find_one({"id": banner_id}, {"_id": 0})
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    update_data = {k: v for k, v in banner_data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.learn_banners.update_one({"id": banner_id}, {"$set": update_data})
    
    updated = await db.learn_banners.find_one({"id": banner_id}, {"_id": 0})
    return LearnBannerResponse(**updated)


@router.delete("/banners/{banner_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_banner(
    banner_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a banner (admin only)"""
    db = get_database()
    
    if not current_user.get("is_admin") and current_user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.learn_banners.delete_one({"id": banner_id})


# ============== Admin: Get All Banners ==============

@router.get("/admin/banners", response_model=List[LearnBannerResponse])
async def get_all_banners_admin(
    current_user: dict = Depends(get_current_user)
):
    """Get all banners including inactive (admin only)"""
    db = get_database()
    
    if not current_user.get("is_admin") and current_user.get("role") not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cursor = db.learn_banners.find({}, {"_id": 0}).sort("order", 1)
    banners = await cursor.to_list(length=100)
    
    return [LearnBannerResponse(**banner) for banner in banners]
