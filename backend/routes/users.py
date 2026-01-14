from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File
from models.user import UserResponse, UserPublicProfile, UserProfileUpdate
from services.auth import get_current_user
from services.storage import storage_service
from database import get_database
from utils.helpers import serialize_docs, serialize_doc
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/profile/{user_id}", response_model=UserPublicProfile)
async def get_user_profile(user_id: str):
    """Get public profile of a user"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserPublicProfile(**user)

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
    
    for field, value in profile_data.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
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
