from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.user import UserResponse, UserPublicProfile, UserProfileUpdate
from services.auth import get_current_user
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
