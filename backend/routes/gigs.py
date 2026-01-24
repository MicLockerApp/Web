"""
Gig Board Routes for MicLocker

Handles gig postings for users looking for services or offering their services.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
from database import get_database
from routes.auth import get_current_user
from models.gig import (
    GigCreate, GigUpdate, GigInDB, GigResponse,
    GIG_TYPES, GIG_CATEGORIES, GIG_SUBCATEGORIES, MUSIC_GENRES, PLACEHOLDER_IMAGES
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gig-board", tags=["Gig Board"])


@router.get("/categories")
async def get_gig_categories():
    """Get all available gig categories and subcategories"""
    return {
        "gig_types": [
            {"value": "looking_for", "label": "Looking For", "description": "Post what you're looking for"},
            {"value": "services", "label": "Services", "description": "Post what you can offer"}
        ],
        "categories": [
            {"value": "musician", "label": "Musicians", "icon": "🎸"},
            {"value": "audio_engineer", "label": "Audio Engineers", "icon": "🎚️"},
            {"value": "recording_studio", "label": "Recording Studios", "icon": "🎙️"},
            {"value": "venue", "label": "Venues", "icon": "🏟️"},
            {"value": "merchant", "label": "Merchants", "icon": "🛍️"},
            {"value": "comedian", "label": "Comedians", "icon": "🎭"},
            {"value": "actor", "label": "Actors", "icon": "🎬"}
        ],
        "subcategories": GIG_SUBCATEGORIES,
        "genres": MUSIC_GENRES,
        "placeholder_images": PLACEHOLDER_IMAGES
    }


@router.post("", response_model=GigResponse)
async def create_gig(
    gig_data: GigCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new gig posting"""
    db = get_database()
    
    # Validate gig type (support legacy "can_provide" as alias for "services")
    gig_type = gig_data.gig_type
    if gig_type == "can_provide":
        gig_type = "services"
    
    if gig_type not in GIG_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid gig type. Must be one of: {GIG_TYPES}"
        )
    
    # Validate category
    if gig_data.category not in GIG_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {GIG_CATEGORIES}"
        )
    
    # Validate subcategories belong to the category
    valid_subcategories = GIG_SUBCATEGORIES.get(gig_data.category, [])
    for subcat in gig_data.subcategories:
        if subcat not in valid_subcategories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid subcategory '{subcat}' for category '{gig_data.category}'"
            )
    
    # Validate genres if provided
    if gig_data.genres:
        for genre in gig_data.genres:
            if genre not in MUSIC_GENRES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid genre '{genre}'. Must be one of: {MUSIC_GENRES}"
                )
    
    # Validate media limits (5 photos + 5 videos max)
    if gig_data.media:
        photos = [m for m in gig_data.media if m.media_type == "image"]
        videos = [m for m in gig_data.media if m.media_type == "video"]
        
        if len(photos) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 photos allowed")
        if len(videos) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 videos allowed")
    
    # Create gig document
    gig = GigInDB(
        user_id=current_user["id"],
        username=current_user.get("username"),
        user_profile_image=current_user.get("profile_image"),
        gig_type=gig_type,
        title=gig_data.title,
        description=gig_data.description,
        category=gig_data.category,
        subcategories=gig_data.subcategories,
        genres=gig_data.genres or [],
        media=[m.model_dump() for m in gig_data.media] if gig_data.media else [],
        social_links=gig_data.social_links.model_dump() if gig_data.social_links else None,
        contact_email=gig_data.contact_email,
        contact_phone=gig_data.contact_phone,
        location=gig_data.location,
        budget_range=gig_data.budget_range,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    gig_dict = gig.model_dump()
    await db.gigs.insert_one(gig_dict)
    
    # Remove MongoDB _id
    gig_dict.pop("_id", None)
    
    # Convert datetime to ISO string
    gig_dict["created_at"] = gig_dict["created_at"].isoformat()
    gig_dict["updated_at"] = gig_dict["updated_at"].isoformat()
    
    logger.info(f"Gig created: {gig.id} by user {current_user['id']}")
    
    return gig_dict


@router.get("")
async def get_gigs(
    gig_type: Optional[str] = Query(None, description="Filter by gig type: looking_for or services"),
    categories: Optional[str] = Query(None, description="Comma-separated list of categories"),
    subcategories: Optional[str] = Query(None, description="Comma-separated list of subcategories"),
    genres: Optional[str] = Query(None, description="Comma-separated list of music genres"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get all gigs with optional filters"""
    db = get_database()
    
    # Build query
    query = {"is_active": True}
    
    if gig_type:
        # Support legacy "can_provide" as alias
        if gig_type == "can_provide":
            gig_type = "services"
        # Also search for legacy values in database
        if gig_type == "services":
            query["gig_type"] = {"$in": ["services", "can_provide"]}
        elif gig_type in GIG_TYPES:
            query["gig_type"] = gig_type
        else:
            raise HTTPException(status_code=400, detail=f"Invalid gig_type. Must be one of: {GIG_TYPES}")
    
    if categories:
        category_list = [c.strip() for c in categories.split(",")]
        query["category"] = {"$in": category_list}
    
    if subcategories:
        subcategory_list = [s.strip() for s in subcategories.split(",")]
        query["subcategories"] = {"$in": subcategory_list}
    
    if genres:
        genre_list = [g.strip() for g in genres.split(",")]
        query["genres"] = {"$in": genre_list}
    
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    if user_id:
        query["user_id"] = user_id
    
    # Pagination
    skip = (page - 1) * limit
    
    # Get total count
    total = await db.gigs.count_documents(query)
    
    # Get gigs
    gigs_cursor = db.gigs.find(query).sort("created_at", -1).skip(skip).limit(limit)
    gigs = await gigs_cursor.to_list(length=limit)
    
    # Format response
    formatted_gigs = []
    for gig in gigs:
        gig.pop("_id", None)
        if isinstance(gig.get("created_at"), datetime):
            gig["created_at"] = gig["created_at"].isoformat()
        if isinstance(gig.get("updated_at"), datetime):
            gig["updated_at"] = gig["updated_at"].isoformat()
        # Normalize legacy gig_type
        if gig.get("gig_type") == "can_provide":
            gig["gig_type"] = "services"
        # Ensure genres field exists
        if "genres" not in gig:
            gig["genres"] = []
        formatted_gigs.append(gig)
    
    return {
        "gigs": formatted_gigs,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit if total > 0 else 1,
        "limit": limit
    }


@router.get("/my-gigs")
async def get_my_gigs(
    gig_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get current user's gig postings"""
    db = get_database()
    
    query = {"user_id": current_user["id"]}
    if gig_type:
        # Support legacy values
        if gig_type == "can_provide":
            gig_type = "services"
        if gig_type == "services":
            query["gig_type"] = {"$in": ["services", "can_provide"]}
        else:
            query["gig_type"] = gig_type
    
    gigs_cursor = db.gigs.find(query).sort("created_at", -1)
    gigs = await gigs_cursor.to_list(length=100)
    
    formatted_gigs = []
    for gig in gigs:
        gig.pop("_id", None)
        if isinstance(gig.get("created_at"), datetime):
            gig["created_at"] = gig["created_at"].isoformat()
        if isinstance(gig.get("updated_at"), datetime):
            gig["updated_at"] = gig["updated_at"].isoformat()
        # Normalize legacy gig_type
        if gig.get("gig_type") == "can_provide":
            gig["gig_type"] = "services"
        if "genres" not in gig:
            gig["genres"] = []
        formatted_gigs.append(gig)
    
    return {"gigs": formatted_gigs}


@router.get("/{gig_id}")
async def get_gig(gig_id: str):
    """Get a specific gig by ID"""
    db = get_database()
    
    gig = await db.gigs.find_one({"id": gig_id})
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    
    # Increment view count
    await db.gigs.update_one(
        {"id": gig_id},
        {"$inc": {"view_count": 1}}
    )
    
    gig.pop("_id", None)
    if isinstance(gig.get("created_at"), datetime):
        gig["created_at"] = gig["created_at"].isoformat()
    if isinstance(gig.get("updated_at"), datetime):
        gig["updated_at"] = gig["updated_at"].isoformat()
    # Normalize legacy gig_type
    if gig.get("gig_type") == "can_provide":
        gig["gig_type"] = "services"
    if "genres" not in gig:
        gig["genres"] = []
    
    return gig


@router.put("/{gig_id}")
async def update_gig(
    gig_id: str,
    gig_update: GigUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a gig posting"""
    db = get_database()
    
    # Find gig
    gig = await db.gigs.find_one({"id": gig_id})
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    
    # Check ownership
    if gig["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to update this gig")
    
    # Build update data
    update_data = {}
    update_dict = gig_update.model_dump(exclude_unset=True)
    
    for key, value in update_dict.items():
        if value is not None:
            if key == "category" and value not in GIG_CATEGORIES:
                raise HTTPException(status_code=400, detail=f"Invalid category: {value}")
            
            if key == "subcategories" and gig_update.category:
                valid_subcategories = GIG_SUBCATEGORIES.get(gig_update.category, [])
                for subcat in value:
                    if subcat not in valid_subcategories:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid subcategory '{subcat}' for category"
                        )
            
            if key == "genres":
                for genre in value:
                    if genre not in MUSIC_GENRES:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Invalid genre '{genre}'"
                        )
                update_data[key] = value
            elif key == "media":
                photos = [m for m in value if m.get("media_type") == "image"]
                videos = [m for m in value if m.get("media_type") == "video"]
                if len(photos) > 5:
                    raise HTTPException(status_code=400, detail="Maximum 5 photos allowed")
                if len(videos) > 5:
                    raise HTTPException(status_code=400, detail="Maximum 5 videos allowed")
                update_data[key] = [m.model_dump() if hasattr(m, 'model_dump') else m for m in value]
            elif key == "social_links" and value:
                update_data[key] = value.model_dump() if hasattr(value, 'model_dump') else value
            else:
                update_data[key] = value
    
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.gigs.update_one(
        {"id": gig_id},
        {"$set": update_data}
    )
    
    # Get updated gig
    updated_gig = await db.gigs.find_one({"id": gig_id})
    updated_gig.pop("_id", None)
    if isinstance(updated_gig.get("created_at"), datetime):
        updated_gig["created_at"] = updated_gig["created_at"].isoformat()
    if isinstance(updated_gig.get("updated_at"), datetime):
        updated_gig["updated_at"] = updated_gig["updated_at"].isoformat()
    if updated_gig.get("gig_type") == "can_provide":
        updated_gig["gig_type"] = "services"
    if "genres" not in updated_gig:
        updated_gig["genres"] = []
    
    logger.info(f"Gig updated: {gig_id} by user {current_user['id']}")
    
    return updated_gig


@router.delete("/{gig_id}")
async def delete_gig(
    gig_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a gig posting"""
    db = get_database()
    
    # Find gig
    gig = await db.gigs.find_one({"id": gig_id})
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    
    # Check ownership (or admin)
    if gig["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Not authorized to delete this gig")
    
    await db.gigs.delete_one({"id": gig_id})
    
    logger.info(f"Gig deleted: {gig_id} by user {current_user['id']}")
    
    return {"message": "Gig deleted successfully"}
