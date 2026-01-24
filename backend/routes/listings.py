from fastapi import APIRouter, HTTPException, status, Depends, Query, UploadFile, File, Request
from models.listing import (
    ListingCreate, ListingUpdate, ListingInDB, ListingResponse,
    ListingMedia, LISTING_CATEGORIES, LISTING_CONDITIONS
)
from services.auth import get_current_user, get_current_user_optional
from services.storage import storage_service
from database import get_database
from utils.helpers import build_listing_search_filter, build_sort_options, serialize_doc, serialize_docs
from analytics.services.event_emitter import emit_event, EventTypes, ActorType
from datetime import datetime
from typing import Optional, List
import uuid

router = APIRouter(prefix="/listings", tags=["Listings"])

@router.get("/categories")
async def get_listing_categories():
    """Get available listing categories and conditions"""
    return {
        "categories": LISTING_CATEGORIES,
        "conditions": LISTING_CONDITIONS
    }

@router.post("", response_model=ListingResponse)
async def create_listing(
    listing_data: ListingCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new listing"""
    db = get_database()
    
    # Review Gating Check: If user has made a sale before and has a pending review, block listing
    if current_user.get("first_sale_completed") and current_user.get("pending_review_order_id"):
        pending_order = await db.orders.find_one({"id": current_user["pending_review_order_id"]})
        if pending_order and pending_order.get("status") in ["delivered", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "review_required",
                    "message": "You must review your buyer from your last sale before creating a new listing.",
                    "order_id": current_user["pending_review_order_id"],
                    "order_number": pending_order.get("order_number")
                }
            )
    
    if listing_data.category not in LISTING_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {LISTING_CATEGORIES}"
        )
    
    if listing_data.condition not in LISTING_CONDITIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid condition. Must be one of: {LISTING_CONDITIONS}"
        )
    
    # Convert S3 media to ListingMedia format
    media_items = []
    if listing_data.media:
        for i, item in enumerate(listing_data.media):
            media_items.append(ListingMedia(
                url=item.url,
                media_type=item.type,
                is_primary=(i == 0 or item.is_primary),
                order=i
            ))
    
    # Create listing data without the S3 media field and None values
    listing_dict = {k: v for k, v in listing_data.model_dump(exclude={'media'}).items() if v is not None}
    
    listing = ListingInDB(
        seller_id=current_user["id"],
        seller_username=current_user["username"],
        media=media_items,  # Add converted media
        **listing_dict
    )
    
    await db.listings.insert_one(listing.model_dump())
    
    # Emit analytics event for listing creation
    emit_event(
        EventTypes.LISTING_CREATED,
        actor_type=ActorType.SELLER,
        actor_id=current_user["id"],
        actor_username=current_user["username"],
        listing_id=listing.id,
        metadata={
            "listing_price": listing.price,
            "category": listing.category,
            "condition": listing.condition,
            "brand": listing_data.brand,
            "quantity": listing.quantity,
            "accepts_offers": listing_data.accepts_offers
        }
    )
    
    result = listing.model_dump()
    result["seller_rating"] = current_user.get("rating", 0)
    result["seller_review_count"] = current_user.get("review_count", 0)
    result["seller_profile_image"] = current_user.get("profile_image")
    return serialize_doc(result)

@router.get("", response_model=dict)
async def search_listings(
    q: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    condition: Optional[str] = Query(None),
    brand: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    seller_id: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Search and filter listings"""
    db = get_database()
    
    filter_query = build_listing_search_filter({
        "q": q,
        "category": category,
        "condition": condition,
        "brand": brand,
        "min_price": min_price,
        "max_price": max_price,
        "seller_id": seller_id
    })
    
    skip = (page - 1) * limit
    sort_options = build_sort_options(sort_by, sort_order)
    
    # Get total count
    total = await db.listings.count_documents(filter_query)
    
    # Build aggregation pipeline for efficient seller rating lookup
    pipeline = [
        {"$match": filter_query},
    ]
    
    # Add sorting
    sort_stage = {}
    for sort_field, sort_dir in sort_options:
        sort_stage[sort_field] = sort_dir
    if sort_stage:
        pipeline.append({"$sort": sort_stage})
    
    # Add pagination
    pipeline.append({"$skip": skip})
    pipeline.append({"$limit": limit})
    
    # Join with users collection to get seller ratings (avoids N+1 queries)
    pipeline.append({
        "$lookup": {
            "from": "users",
            "localField": "seller_id",
            "foreignField": "id",
            "as": "seller_info"
        }
    })
    
    # Extract seller rating, review count, and profile image from the lookup result
    pipeline.append({
        "$addFields": {
            "seller_rating": {
                "$ifNull": [
                    {"$arrayElemAt": ["$seller_info.rating", 0]},
                    0
                ]
            },
            "seller_review_count": {
                "$ifNull": [
                    {"$arrayElemAt": ["$seller_info.review_count", 0]},
                    0
                ]
            },
            "seller_profile_image": {
                "$arrayElemAt": ["$seller_info.profile_image", 0]
            }
        }
    })
    
    # Remove the seller_info array (we only needed the rating, review_count, and profile_image)
    pipeline.append({"$project": {"seller_info": 0}})
    
    listings = await db.listings.aggregate(pipeline).to_list(length=limit)
    
    return {
        "listings": serialize_docs(listings),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/featured")
async def get_featured_listings(limit: int = Query(8, ge=1, le=20)):
    """Get featured/trending listings"""
    db = get_database()
    
    # Get listings with most views/favorites
    cursor = db.listings.find({"status": "active"}).sort([
        ("view_count", -1),
        ("created_at", -1)
    ]).limit(limit)
    
    listings = await cursor.to_list(length=limit)
    return {"listings": serialize_docs(listings)}

@router.get("/recent")
async def get_recent_listings(limit: int = Query(12, ge=1, le=50)):
    """Get most recent listings"""
    db = get_database()
    
    cursor = db.listings.find({"status": "active"}).sort("created_at", -1).limit(limit)
    listings = await cursor.to_list(length=limit)
    return {"listings": serialize_docs(listings)}

@router.get("/stats/count")
async def get_listing_count():
    """Get total count of active listings and platform stats"""
    db = get_database()
    
    active_count = await db.listings.count_documents({"status": "active"})
    total_count = await db.listings.count_documents({})
    
    # Get total user count for display and promo eligibility (excluding employees)
    total_users = await db.users.count_documents({"is_employee": {"$ne": True}})
    
    # Promo: First 300 users get 0% platform fees for life
    promo_limit = 300
    promo_eligible = total_users < promo_limit
    promo_spots_remaining = max(0, promo_limit - total_users)
    
    return {
        "active_listings": active_count,
        "total_listings": total_count,
        "total_users": total_users,
        "promo_eligible": promo_eligible,
        "promo_spots_remaining": promo_spots_remaining,
        "promo_limit": promo_limit
    }

@router.get("/{listing_id}")
async def get_listing(
    listing_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Get a single listing by ID"""
    db = get_database()
    
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Increment view count (only if viewer is not the seller)
    if not current_user or current_user["id"] != listing["seller_id"]:
        await db.listings.update_one(
            {"id": listing_id},
            {"$inc": {"view_count": 1}}
        )
        
        # Emit analytics event for listing view
        emit_event(
            EventTypes.LISTING_VIEWED,
            actor_type=ActorType.BUYER if current_user else ActorType.ANONYMOUS,
            actor_id=current_user["id"] if current_user else None,
            actor_username=current_user.get("username") if current_user else None,
            listing_id=listing_id,
            target_user_id=listing["seller_id"],
            metadata={
                "listing_price": listing["price"],
                "category": listing.get("category"),
                "condition": listing.get("condition"),
                "seller_username": listing["seller_username"],
                "view_count": listing.get("view_count", 0) + 1
            }
        )
    
    # Get seller rating, review count, and profile image
    seller = await db.users.find_one({"id": listing["seller_id"]})
    listing["seller_rating"] = seller.get("rating", 0) if seller else 0
    listing["seller_review_count"] = seller.get("review_count", 0) if seller else 0
    listing["seller_profile_image"] = seller.get("profile_image") if seller else None
    
    return serialize_doc(listing)

@router.put("/{listing_id}")
async def update_listing(
    listing_id: str,
    listing_data: ListingUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a listing"""
    db = get_database()
    
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    if listing["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this listing"
        )
    
    # Enforce minimum price of $5
    if listing_data.price is not None and listing_data.price < 5.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum listing price is $5.00"
        )
    
    update_data = {"updated_at": datetime.utcnow()}
    for field, value in listing_data.model_dump(exclude_unset=True).items():
        if value is not None:
            update_data[field] = value
    
    await db.listings.update_one(
        {"id": listing_id},
        {"$set": update_data}
    )
    
    updated_listing = await db.listings.find_one({"id": listing_id})
    updated_listing["seller_rating"] = current_user.get("rating", 0)
    updated_listing["seller_review_count"] = current_user.get("review_count", 0)
    updated_listing["seller_profile_image"] = current_user.get("profile_image")
    return serialize_doc(updated_listing)

@router.delete("/{listing_id}")
async def delete_listing(
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a listing"""
    db = get_database()
    
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    if listing["seller_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this listing"
        )
    
    # Soft delete - change status to removed
    await db.listings.update_one(
        {"id": listing_id},
        {"$set": {"status": "removed", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Listing deleted successfully"}

@router.post("/{listing_id}/media")
async def add_listing_media(
    listing_id: str,
    file: UploadFile = File(...),
    is_primary: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """Add media to a listing"""
    db = get_database()
    
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    if listing["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this listing"
        )
    
    # Determine file type
    content_type = file.content_type or "application/octet-stream"
    if content_type.startswith("image"):
        file_type = "image"
    elif content_type.startswith("video"):
        file_type = "video"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only images and videos allowed."
        )
    
    # Validate file
    if not storage_service.validate_file_type(content_type, file_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format"
        )
    
    # Read and validate size
    content = await file.read()
    if not storage_service.validate_file_size(len(content), file_type):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File too large"
        )
    
    # Upload file
    file_key = storage_service.generate_file_key(
        f"listings/{file_type}s",
        current_user["id"],
        file.filename
    )
    success, url = await storage_service.upload_file(content, file_key, content_type)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )
    
    # Create media record
    media = ListingMedia(
        url=url,
        media_type=file_type,
        is_primary=is_primary,
        order=len(listing.get("media", []))
    )
    
    # If setting as primary, unset other primaries
    if is_primary:
        existing_media = listing.get("media", [])
        for m in existing_media:
            m["is_primary"] = False
        await db.listings.update_one(
            {"id": listing_id},
            {"$set": {"media": existing_media}}
        )
    
    await db.listings.update_one(
        {"id": listing_id},
        {
            "$push": {"media": media.model_dump()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Media added successfully", "media": media.model_dump()}

@router.delete("/{listing_id}/media/{media_id}")
async def remove_listing_media(
    listing_id: str,
    media_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove media from a listing"""
    db = get_database()
    
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    if listing["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this listing"
        )
    
    await db.listings.update_one(
        {"id": listing_id},
        {
            "$pull": {"media": {"id": media_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Media removed successfully"}
