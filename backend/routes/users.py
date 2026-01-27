from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from models.user import UserResponse, UserPublicProfile, UserProfileUpdate
from services.auth import get_current_user, get_current_user_optional, pwd_context
from services.storage import storage_service
from database import get_database
from utils.helpers import serialize_docs, serialize_doc
from analytics.services.event_emitter import emit_event, EventTypes, ActorType
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
import logging

router = APIRouter(prefix="/users", tags=["Users"])
logger = logging.getLogger(__name__)

@router.get("/profile/{user_id}", response_model=UserPublicProfile)
async def get_user_profile(
    user_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get public profile of a user, respecting privacy settings"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if it's the user's own profile
    is_own_profile = current_user and current_user.get("id") == user_id
    
    # Create profile response
    profile_data = dict(user)
    
    # Set is_founder flag for James McDougall
    profile_data["is_founder"] = user.get("email") == "james.mcdougall@miclockerapp.com"
    
    # If not own profile, apply privacy settings
    if not is_own_profile:
        # Hide email unless show_email is true
        if not user.get("show_email", False):
            profile_data["email"] = None
        
        # Hide phone unless show_phone is true
        if not user.get("show_phone", False):
            profile_data["phone"] = None
        
        # Hide address unless show_address is true
        if not user.get("show_address", False):
            profile_data["shipping_address"] = None
        
        # Hide physical address unless show_physical_address is true
        if not user.get("show_physical_address", False):
            profile_data["physical_address"] = None
        
        # Hide music platforms unless show_social is true
        if not user.get("show_social", True):
            profile_data["apple_music"] = None
            profile_data["spotify"] = None
            profile_data["soundcloud"] = None
            profile_data["spotify_embed_url"] = None
    
    return UserPublicProfile(**profile_data)

@router.get("/profile/by-username/{username}", response_model=UserPublicProfile)
async def get_user_profile_by_username(username: str):
    """Get public profile by username"""
    db = get_database()
    
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserPublicProfile(**user)

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    db = get_database()
    
    update_data = {"updated_at": datetime.utcnow()}
    old_username = current_user["username"]
    new_username = None
    
    # Handle username change with validation
    if profile_data.username is not None:
        new_username = profile_data.username.lower().strip()
        
        # Validate username format
        import re
        if not re.match(r'^[a-z0-9_.-]{3,30}$', new_username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username must be 3-30 characters and contain only lowercase letters, numbers, underscores, dots, and hyphens"
            )
        
        # Check if username is already taken by another user
        if new_username != old_username:
            existing_user = await db.users.find_one({"username": new_username})
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username is already taken"
                )
            update_data["username"] = new_username
        else:
            new_username = None  # No change needed
    
    for field, value in profile_data.model_dump(exclude_unset=True).items():
        if value is not None and field != "username":  # username handled above
            update_data[field] = value
    
    # Update the user
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    # If username changed, propagate to all related content
    if new_username and new_username != old_username:
        user_id = current_user["id"]
        
        # Update listings
        await db.listings.update_many(
            {"seller_id": user_id},
            {"$set": {"seller_username": new_username}}
        )
        
        # Update orders (as buyer)
        await db.orders.update_many(
            {"buyer_id": user_id},
            {"$set": {"buyer_username": new_username}}
        )
        
        # Update order items (as seller)
        await db.orders.update_many(
            {"items.seller_id": user_id},
            {"$set": {"items.$[elem].seller_username": new_username}},
            array_filters=[{"elem.seller_id": user_id}]
        )
        
        # Update trades (as initiator)
        await db.trades.update_many(
            {"initiator_id": user_id},
            {"$set": {"initiator_username": new_username}}
        )
        
        # Update trades (as recipient)
        await db.trades.update_many(
            {"recipient_id": user_id},
            {"$set": {"recipient_username": new_username}}
        )
        
        # Update offers (as buyer)
        await db.offers.update_many(
            {"buyer_id": user_id},
            {"$set": {"buyer_username": new_username}}
        )
        
        # Update offers (as seller)
        await db.offers.update_many(
            {"seller_id": user_id},
            {"$set": {"seller_username": new_username}}
        )
        
        # Update reviews (as reviewer)
        await db.reviews.update_many(
            {"reviewer_id": user_id},
            {"$set": {"reviewer_username": new_username}}
        )
        
        # Update reviews (as reviewee)
        await db.reviews.update_many(
            {"reviewee_id": user_id},
            {"$set": {"reviewee_username": new_username}}
        )
        
        logger.info(f"Username changed from '{old_username}' to '{new_username}' - propagated to all content")
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    return UserResponse(**updated_user)

@router.post("/profile/image", response_model=UserResponse)
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload profile image"""
    db = get_database()
    
    # Validate file type
    content_type = file.content_type or "application/octet-stream"
    if not content_type.startswith("image"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    if not storage_service.validate_file_type(content_type, "image"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Allowed: JPEG, PNG, GIF, WebP"
        )
    
    # Read and validate size
    content = await file.read()
    if not storage_service.validate_file_size(len(content), "image"):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image too large. Maximum size is 10MB"
        )
    
    # Upload file
    file_key = storage_service.generate_file_key(
        "profiles",
        current_user["id"],
        file.filename
    )
    success, url = await storage_service.upload_file(content, file_key, content_type)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image"
        )
    
    # Update user profile
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"profile_image": url, "updated_at": datetime.utcnow()}}
    )
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    return UserResponse(**updated_user)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


class EmailChangeRequest(BaseModel):
    new_email: EmailStr
    password: str  # Require password to change email


@router.put("/profile/password")
async def change_password(
    data: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change user's password"""
    db = get_database()
    
    # Verify current password
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not pwd_context.verify(data.current_password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(data.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # Hash and update new password
    hashed_password = pwd_context.hash(data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password": hashed_password, "updated_at": datetime.utcnow()}}
    )
    
    logger.info(f"Password changed for user {current_user['username']}")
    return {"message": "Password changed successfully"}


@router.put("/profile/email")
async def change_email(
    data: EmailChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change user's email address"""
    db = get_database()
    
    # Verify password
    user = await db.users.find_one({"id": current_user["id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not pwd_context.verify(data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is incorrect"
        )
    
    # Check if email already exists
    new_email = data.new_email.lower().strip()
    existing = await db.users.find_one({"email": new_email})
    if existing and existing["id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already in use"
        )
    
    # Update email
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"email": new_email, "updated_at": datetime.utcnow()}}
    )
    
    logger.info(f"Email changed for user {current_user['username']} to {new_email}")
    return {"message": "Email changed successfully", "new_email": new_email}


@router.get("/search")
async def search_users(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Search users"""
    db = get_database()
    
    filter_query = {}
    
    if q:
        filter_query["$or"] = [
            {"username": {"$regex": q, "$options": "i"}},
            {"bio": {"$regex": q, "$options": "i"}}
        ]
    
    if category:
        filter_query["category"] = category
    
    skip = (page - 1) * limit
    
    total = await db.users.count_documents(filter_query)
    cursor = db.users.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    users = await cursor.to_list(length=limit)
    
    return {
        "users": [UserPublicProfile(**user) for user in users],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/{user_id}/listings")
async def get_user_listings(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get listings by a specific user"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    filter_query = {"seller_id": user_id, "status": "active"}
    skip = (page - 1) * limit
    
    total = await db.listings.count_documents(filter_query)
    cursor = db.listings.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    listings = await cursor.to_list(length=limit)
    
    return {
        "listings": serialize_docs(listings),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/{user_id}/reviews")
async def get_user_reviews(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get reviews for a seller"""
    db = get_database()
    
    filter_query = {"seller_id": user_id}
    skip = (page - 1) * limit
    
    total = await db.reviews.count_documents(filter_query)
    cursor = db.reviews.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    reviews = await cursor.to_list(length=limit)
    
    return {
        "reviews": serialize_docs(reviews),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

# Favorites endpoints
@router.get("/favorites/list")
async def get_favorites(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's favorite listings"""
    db = get_database()
    
    user = await db.users.find_one({"id": current_user["id"]})
    favorites = user.get("favorites", []) or []
    
    if not favorites:
        return {
            "listings": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "pages": 0
        }
    
    # Pagination on favorites list
    total = len(favorites)
    start = (page - 1) * limit
    end = start + limit
    paginated_favorites = favorites[start:end]
    
    # Get listings for these IDs
    cursor = db.listings.find({"id": {"$in": paginated_favorites}})
    listings = await cursor.to_list(length=limit)
    
    return {
        "listings": serialize_docs(listings),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.post("/favorites/{listing_id}")
async def add_to_favorites(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a listing to favorites"""
    db = get_database()
    
    # Check if listing exists
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Add to favorites (avoid duplicates)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$addToSet": {"favorites": listing_id}}
    )
    
    # Emit analytics event for favoriting
    emit_event(
        EventTypes.LISTING_FAVORITED,
        actor_type=ActorType.BUYER,
        actor_id=current_user["id"],
        actor_username=current_user["username"],
        listing_id=listing_id,
        target_user_id=listing["seller_id"],
        metadata={
            "listing_price": listing.get("price"),
            "category": listing.get("category")
        }
    )
    
    return {"message": "Added to favorites", "listing_id": listing_id}

@router.delete("/favorites/{listing_id}")
async def remove_from_favorites(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a listing from favorites"""
    db = get_database()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$pull": {"favorites": listing_id}}
    )
    
    # Emit analytics event for unfavoriting
    emit_event(
        EventTypes.LISTING_UNFAVORITED,
        actor_type=ActorType.BUYER,
        actor_id=current_user["id"],
        actor_username=current_user["username"],
        listing_id=listing_id,
        metadata={}
    )
    
    return {"message": "Removed from favorites", "listing_id": listing_id}

@router.get("/favorites/check/{listing_id}")
async def check_favorite(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if a listing is in favorites"""
    db = get_database()
    
    user = await db.users.find_one({"id": current_user["id"]})
    favorites = user.get("favorites", []) or []
    
    return {"is_favorite": listing_id in favorites}
