"""
Gig Service Layer

Business logic for gig operations, separated from HTTP routing concerns.
This module handles validation, data transformation, and database operations
for the Gig Board feature.

Design Principles:
- Each function has a single, clear purpose
- Functions are named to describe their action
- All business rules are documented
- Database operations are explicit, not hidden

Usage:
    from services.gig_service import validate_gig_data, create_gig_document
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException

from models.gig import (
    GigCreate, GigUpdate, GigInDB,
    GIG_TYPES, GIG_CATEGORIES, GIG_SUBCATEGORIES, MUSIC_GENRES
)


def normalize_gig_type(gig_type: str) -> str:
    """
    Normalize legacy gig type values to current format.
    
    The legacy "can_provide" value is now called "services".
    This function ensures consistency across the codebase.
    
    Args:
        gig_type: The gig type string (could be legacy or current format)
    
    Returns:
        Normalized gig type string ("looking_for" or "services")
    """
    if gig_type == "can_provide":
        return "services"
    return gig_type


def validate_gig_type(gig_type: str) -> None:
    """
    Validate that the gig type is one of the allowed values.
    
    Args:
        gig_type: The gig type to validate (should be normalized first)
    
    Raises:
        HTTPException: If gig type is invalid
    """
    if gig_type not in GIG_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid gig type. Must be one of: {GIG_TYPES}"
        )


def validate_category(category: str) -> None:
    """
    Validate that the category is one of the allowed values.
    
    Args:
        category: The category to validate
    
    Raises:
        HTTPException: If category is invalid
    """
    if category not in GIG_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category. Must be one of: {GIG_CATEGORIES}"
        )


def validate_subcategories(subcategories: List[str], category: str) -> None:
    """
    Validate that all subcategories belong to the specified category.
    
    Each category has its own set of valid subcategories defined in
    GIG_SUBCATEGORIES. This function ensures all provided subcategories
    are valid for the given category.
    
    Args:
        subcategories: List of subcategory strings to validate
        category: The parent category these subcategories belong to
    
    Raises:
        HTTPException: If any subcategory is invalid for the category
    """
    valid_subcategories = GIG_SUBCATEGORIES.get(category, [])
    
    for subcat in subcategories:
        if subcat not in valid_subcategories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid subcategory '{subcat}' for category '{category}'"
            )


def validate_genres(genres: Optional[List[str]]) -> None:
    """
    Validate that all genres are from the allowed list.
    
    Args:
        genres: List of genre strings to validate (can be None or empty)
    
    Raises:
        HTTPException: If any genre is invalid
    """
    if not genres:
        return
    
    for genre in genres:
        if genre not in MUSIC_GENRES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid genre '{genre}'. Must be one of: {MUSIC_GENRES}"
            )


def validate_media_limits(media: Optional[List[Any]]) -> None:
    """
    Validate that media uploads don't exceed limits and meet requirements.
    
    Business rules: 
    - Minimum 1 photo or video required
    - Maximum 5 photos and 5 videos per gig.
    
    Args:
        media: List of media objects with 'media_type' field
    
    Raises:
        HTTPException: If media requirements are not met
    """
    if not media or len(media) == 0:
        raise HTTPException(
            status_code=400,
            detail="At least one photo or video is required"
        )
    
    photos = [m for m in media if m.media_type == "image"]
    videos = [m for m in media if m.media_type == "video"]
    
    if len(photos) > 5:
        raise HTTPException(
            status_code=400, 
            detail="Maximum 5 photos allowed"
        )
    
    if len(videos) > 5:
        raise HTTPException(
            status_code=400, 
            detail="Maximum 5 videos allowed"
        )


def validate_gig_data(gig_data: GigCreate) -> str:
    """
    Run all validations on gig creation data.
    
    This is the main validation entry point that runs all individual
    validations in sequence. Returns the normalized gig type.
    
    Args:
        gig_data: The GigCreate model with user input
    
    Returns:
        Normalized gig type string
    
    Raises:
        HTTPException: If any validation fails
    """
    gig_type = normalize_gig_type(gig_data.gig_type)
    
    validate_gig_type(gig_type)
    validate_category(gig_data.category)
    validate_subcategories(gig_data.subcategories, gig_data.category)
    validate_genres(gig_data.genres)
    validate_media_limits(gig_data.media)
    
    # Validate that genres are required for non-comedian/actor categories
    genre_optional_categories = ['comedian', 'actor']
    if gig_data.category not in genre_optional_categories:
        if not gig_data.genres or len(gig_data.genres) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"At least one music genre is required for {gig_data.category} category"
            )
    
    return gig_type


def create_gig_document(gig_data: GigCreate, user: dict, gig_type: str) -> dict:
    """
    Create a gig document ready for database insertion.
    
    Transforms the validated input data into a MongoDB document format,
    adding user information and timestamps.
    
    Args:
        gig_data: Validated GigCreate model
        user: Current user dictionary with id, username, profile_image
        gig_type: Normalized gig type string
    
    Returns:
        Dictionary ready for MongoDB insertion
    """
    gig = GigInDB(
        user_id=user["id"],
        username=user.get("username"),
        user_profile_image=user.get("profile_image"),
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
    
    return gig.model_dump()


def format_gig_for_response(gig: dict) -> dict:
    """
    Format a gig document for API response.
    
    Handles:
    - Removing MongoDB _id field
    - Converting datetime objects to ISO strings
    - Normalizing legacy gig_type values
    - Ensuring required fields exist
    
    Args:
        gig: Raw gig document from MongoDB
    
    Returns:
        Formatted gig dictionary safe for JSON serialization
    """
    # Remove MongoDB internal ID
    gig.pop("_id", None)
    
    # Convert datetime objects to ISO strings
    if isinstance(gig.get("created_at"), datetime):
        gig["created_at"] = gig["created_at"].isoformat()
    
    if isinstance(gig.get("updated_at"), datetime):
        gig["updated_at"] = gig["updated_at"].isoformat()
    
    # Normalize legacy gig type
    if gig.get("gig_type") == "can_provide":
        gig["gig_type"] = "services"
    
    # Ensure genres field exists (for older documents)
    if "genres" not in gig:
        gig["genres"] = []
    
    return gig


def build_gig_query(
    gig_type: Optional[str] = None,
    categories: Optional[str] = None,
    subcategories: Optional[str] = None,
    genres: Optional[str] = None,
    search: Optional[str] = None,
    user_id: Optional[str] = None,
    include_inactive: bool = False
) -> dict:
    """
    Build a MongoDB query for fetching gigs.
    
    Constructs a query dictionary based on the provided filter parameters.
    Handles comma-separated lists and search text.
    
    Args:
        gig_type: Filter by gig type (looking_for or services)
        categories: Comma-separated list of categories
        subcategories: Comma-separated list of subcategories
        genres: Comma-separated list of genres
        search: Text to search in title and description
        user_id: Filter by specific user
        include_inactive: Whether to include inactive gigs
    
    Returns:
        MongoDB query dictionary
    """
    query = {}
    
    # Active status filter
    if not include_inactive:
        query["is_active"] = True
    
    # Gig type filter (with legacy support)
    if gig_type:
        normalized_type = normalize_gig_type(gig_type)
        
        if normalized_type not in GIG_TYPES:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid gig_type. Must be one of: {GIG_TYPES}"
            )
        
        # Include legacy values in query for "services" type
        if normalized_type == "services":
            query["gig_type"] = {"$in": ["services", "can_provide"]}
        else:
            query["gig_type"] = normalized_type
    
    # Category filter
    if categories:
        category_list = [c.strip() for c in categories.split(",")]
        query["category"] = {"$in": category_list}
    
    # Subcategory filter
    if subcategories:
        subcategory_list = [s.strip() for s in subcategories.split(",")]
        query["subcategories"] = {"$in": subcategory_list}
    
    # Genre filter
    if genres:
        genre_list = [g.strip() for g in genres.split(",")]
        query["genres"] = {"$in": genre_list}
    
    # Text search (case-insensitive)
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    # User filter
    if user_id:
        query["user_id"] = user_id
    
    return query


def check_gig_ownership(gig: dict, user: dict) -> None:
    """
    Verify that a user owns a gig or is an admin.
    
    Args:
        gig: The gig document to check
        user: The current user dictionary
    
    Raises:
        HTTPException: If user is not authorized
    """
    is_owner = gig["user_id"] == user["id"]
    is_admin = user.get("is_admin", False)
    
    if not is_owner and not is_admin:
        raise HTTPException(
            status_code=403, 
            detail="Not authorized to modify this gig"
        )


def build_gig_update_data(gig_update: GigUpdate, current_gig: dict) -> dict:
    """
    Build the update data dictionary for a gig update operation.
    
    Validates all provided fields and constructs the $set data
    for MongoDB update.
    
    Args:
        gig_update: The GigUpdate model with fields to update
        current_gig: The current gig document (for context)
    
    Returns:
        Dictionary of fields to update
    
    Raises:
        HTTPException: If any validation fails
    """
    update_data = {}
    update_dict = gig_update.model_dump(exclude_unset=True)
    
    for field_name, value in update_dict.items():
        if value is None:
            continue
        
        # Validate category changes
        if field_name == "category":
            validate_category(value)
        
        # Validate subcategory changes
        if field_name == "subcategories" and gig_update.category:
            validate_subcategories(value, gig_update.category)
        
        # Validate genre changes
        if field_name == "genres":
            validate_genres(value)
            update_data[field_name] = value
            continue
        
        # Validate media limits
        if field_name == "media":
            photos = [m for m in value if m.get("media_type") == "image"]
            videos = [m for m in value if m.get("media_type") == "video"]
            
            if len(photos) > 5:
                raise HTTPException(
                    status_code=400, 
                    detail="Maximum 5 photos allowed"
                )
            if len(videos) > 5:
                raise HTTPException(
                    status_code=400, 
                    detail="Maximum 5 videos allowed"
                )
            
            # Convert Pydantic models to dicts if needed
            update_data[field_name] = [
                m.model_dump() if hasattr(m, 'model_dump') else m 
                for m in value
            ]
            continue
        
        # Handle social links
        if field_name == "social_links" and value:
            update_data[field_name] = (
                value.model_dump() if hasattr(value, 'model_dump') else value
            )
            continue
        
        # All other fields
        update_data[field_name] = value
    
    # Always update the timestamp
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    return update_data
