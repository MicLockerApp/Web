"""
Gig Board Routes for MicLocker

HTTP routing layer for gig operations. Business logic is delegated
to the gig_service module to maintain thin route handlers.

Endpoints:
    GET  /gig-board/categories - Get filter options
    POST /gig-board/           - Create a new gig
    GET  /gig-board/           - List gigs with filters
    GET  /gig-board/my-gigs    - Get current user's gigs
    GET  /gig-board/{gig_id}   - Get single gig details
    PUT  /gig-board/{gig_id}   - Update a gig
    DELETE /gig-board/{gig_id} - Delete a gig
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
import logging

from database import get_database
from routes.auth import get_current_user
from models.gig import (
    GigCreate, GigUpdate, GigResponse,
    GIG_SUBCATEGORIES, MUSIC_GENRES, PLACEHOLDER_IMAGES
)
from services.gig_service import (
    validate_gig_data,
    create_gig_document,
    format_gig_for_response,
    build_gig_query,
    check_gig_ownership,
    build_gig_update_data
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/gig-board", tags=["Gig Board"])


@router.get("/categories")
async def get_gig_categories():
    """
    Get all available gig categories, subcategories, and genres.
    
    Used by the frontend to populate filter dropdowns and
    category selection in the gig creation form.
    """
    return {
        "gig_types": [
            {
                "value": "looking_for", 
                "label": "Looking For", 
                "description": "Post what you're looking for"
            },
            {
                "value": "services", 
                "label": "Services", 
                "description": "Post what you can offer"
            }
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
    """
    Create a new gig posting.
    
    Validates all input data, creates the gig document,
    and inserts it into the database.
    """
    db = get_database()
    
    # Validate input and get normalized gig type
    gig_type = validate_gig_data(gig_data)
    
    # Create the document
    gig_dict = create_gig_document(gig_data, current_user, gig_type)
    
    # Insert into database
    await db.gigs.insert_one(gig_dict)
    
    # Format for response
    response = format_gig_for_response(gig_dict)
    
    logger.info(f"Gig created: {gig_dict['id']} by user {current_user['id']}")
    
    return response


@router.get("")
async def get_gigs(
    gig_type: Optional[str] = Query(
        None, 
        description="Filter by gig type: looking_for or services"
    ),
    categories: Optional[str] = Query(
        None, 
        description="Comma-separated list of categories"
    ),
    subcategories: Optional[str] = Query(
        None, 
        description="Comma-separated list of subcategories"
    ),
    genres: Optional[str] = Query(
        None, 
        description="Comma-separated list of music genres"
    ),
    search: Optional[str] = Query(
        None, 
        description="Search in title and description"
    ),
    user_id: Optional[str] = Query(
        None, 
        description="Filter by user ID"
    ),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Get all gigs with optional filters and pagination.
    
    Returns a paginated list of active gigs matching the
    provided filter criteria, with up-to-date user profile images.
    """
    db = get_database()
    
    # Build query from filter parameters
    query = build_gig_query(
        gig_type=gig_type,
        categories=categories,
        subcategories=subcategories,
        genres=genres,
        search=search,
        user_id=user_id
    )
    
    # Calculate pagination
    skip = (page - 1) * limit
    
    # Get total count for pagination info
    total = await db.gigs.count_documents(query)
    
    # Use aggregation to join with users for latest profile image
    pipeline = [
        {"$match": query},
        {"$sort": {"created_at": -1}},
        {"$skip": skip},
        {"$limit": limit},
        # Join with users to get current profile image
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "id",
                "as": "user_info"
            }
        },
        # Update user_profile_image with latest from users collection
        {
            "$addFields": {
                "user_profile_image": {
                    "$arrayElemAt": ["$user_info.profile_image", 0]
                },
                "user_rating": {
                    "$ifNull": [{"$arrayElemAt": ["$user_info.rating", 0]}, 0]
                },
                "user_review_count": {
                    "$ifNull": [{"$arrayElemAt": ["$user_info.review_count", 0]}, 0]
                }
            }
        },
        {"$project": {"user_info": 0}}
    ]
    
    gigs = await db.gigs.aggregate(pipeline).to_list(length=limit)
    
    # Format each gig for response
    formatted_gigs = [format_gig_for_response(gig) for gig in gigs]
    
    # Calculate total pages
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    
    return {
        "gigs": formatted_gigs,
        "total": total,
        "page": page,
        "pages": total_pages,
        "limit": limit
    }


@router.get("/my-gigs")
async def get_my_gigs(
    gig_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the current user's gig postings.
    
    Returns all gigs (including inactive) created by the authenticated user.
    """
    db = get_database()
    
    # Build query for user's gigs
    query = build_gig_query(
        gig_type=gig_type,
        user_id=current_user["id"],
        include_inactive=True
    )
    
    # Fetch gigs (newest first)
    cursor = db.gigs.find(query).sort("created_at", -1)
    gigs = await cursor.to_list(length=100)
    
    # Format each gig for response
    formatted_gigs = [format_gig_for_response(gig) for gig in gigs]
    
    return {"gigs": formatted_gigs}


@router.get("/{gig_id}")
async def get_gig(gig_id: str):
    """
    Get a specific gig by ID and increment its view count.
    """
    db = get_database()
    
    # Find the gig
    gig = await db.gigs.find_one({"id": gig_id})
    
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    
    # Increment view count
    await db.gigs.update_one(
        {"id": gig_id},
        {"$inc": {"view_count": 1}}
    )
    
    return format_gig_for_response(gig)


@router.put("/{gig_id}")
async def update_gig(
    gig_id: str,
    gig_update: GigUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update an existing gig posting.
    
    Only the gig owner or an admin can update a gig.
    """
    db = get_database()
    
    # Find the gig
    gig = await db.gigs.find_one({"id": gig_id})
    
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    
    # Verify ownership
    check_gig_ownership(gig, current_user)
    
    # Build and validate update data
    update_data = build_gig_update_data(gig_update, gig)
    
    # Apply update
    await db.gigs.update_one(
        {"id": gig_id},
        {"$set": update_data}
    )
    
    # Fetch and return updated gig
    updated_gig = await db.gigs.find_one({"id": gig_id})
    
    logger.info(f"Gig updated: {gig_id} by user {current_user['id']}")
    
    return format_gig_for_response(updated_gig)


@router.delete("/{gig_id}")
async def delete_gig(
    gig_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a gig posting.
    
    Only the gig owner or an admin can delete a gig.
    """
    db = get_database()
    
    # Find the gig
    gig = await db.gigs.find_one({"id": gig_id})
    
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    
    # Verify ownership
    check_gig_ownership(gig, current_user)
    
    # Delete the gig
    await db.gigs.delete_one({"id": gig_id})
    
    logger.info(f"Gig deleted: {gig_id} by user {current_user['id']}")
    
    return {"message": "Gig deleted successfully"}
