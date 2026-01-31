"""
Profile Media Routes

API endpoints for user profile photos and videos.
Users can upload photos/videos to their profile to showcase their work.
Videos can optionally be shown in the Auditions feed.
"""

from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
from services.auth import get_current_user, get_current_user_optional
from services.s3_service import s3_service
from database import get_database
import uuid
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/profile/media", tags=["Profile Media"])

# Allowed file types
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
ALLOWED_VIDEO_TYPES = {'video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'}

# Max file sizes
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB

# Max items per type
MAX_PHOTOS = 20
MAX_VIDEOS = 10
MAX_AUDITION_VIDEOS = 5


class MediaItem(BaseModel):
    id: str
    url: str
    thumbnail_url: Optional[str] = None
    type: str  # 'photo' or 'video'
    filename: str
    size: int
    uploaded_at: datetime
    # Video-specific fields for auditions
    category: Optional[str] = None
    subcategory: Optional[str] = None
    genre: Optional[str] = None
    description: Optional[str] = None
    song_name: Optional[str] = None
    show_in_auditions: bool = False


class MediaUploadResponse(BaseModel):
    success: bool
    item: MediaItem


class MediaListResponse(BaseModel):
    photos: List[MediaItem]
    videos: List[MediaItem]


class VideoUpdateRequest(BaseModel):
    show_in_auditions: Optional[bool] = None
    description: Optional[str] = None
    song_name: Optional[str] = None


class AuditionSelectionRequest(BaseModel):
    video_ids: List[str]  # List of video IDs to show in auditions (max 5)


@router.get("/{user_id}", response_model=MediaListResponse)
async def get_user_media(
    user_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get all photos and videos for a user's profile.
    Public endpoint - anyone can view.
    """
    db = get_database()
    
    # Verify user exists
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get photos
    photos_cursor = db.profile_media.find({
        "user_id": user_id,
        "type": "photo"
    }).sort("uploaded_at", -1)
    photos = await photos_cursor.to_list(length=MAX_PHOTOS)
    
    # Get videos
    videos_cursor = db.profile_media.find({
        "user_id": user_id,
        "type": "video"
    }).sort("uploaded_at", -1)
    videos = await videos_cursor.to_list(length=MAX_VIDEOS)
    
    return MediaListResponse(
        photos=[MediaItem(**{k: v for k, v in p.items() if k != '_id'}) for p in photos],
        videos=[MediaItem(**{k: v for k, v in v.items() if k != '_id'}) for v in videos]
    )


@router.post("/photo", response_model=MediaUploadResponse)
async def upload_photo(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a photo to the user's profile.
    Max 20 photos allowed per user.
    """
    db = get_database()
    
    # Check content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: jpeg, png, webp, gif"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Check file size
    if file_size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_IMAGE_SIZE // (1024*1024)}MB"
        )
    
    # Check current photo count
    photo_count = await db.profile_media.count_documents({
        "user_id": current_user["id"],
        "type": "photo"
    })
    
    if photo_count >= MAX_PHOTOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_PHOTOS} photos allowed. Delete some to upload more."
        )
    
    # Generate unique ID and upload
    media_id = str(uuid.uuid4())
    
    if s3_service.is_enabled():
        # Upload to S3
        object_key = s3_service.generate_object_key(
            folder=f"profiles/{current_user['id']}/photos",
            filename=file.filename
        )
        
        url = s3_service.upload_file(
            file_data=content,
            object_key=object_key,
            content_type=file.content_type,
            metadata={
                'user-id': current_user['id'],
                'media-id': media_id
            }
        )
        
        if not url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
    else:
        # Local fallback
        local_storage_path = os.environ.get("LOCAL_STORAGE_PATH", "/app/uploads")
        user_folder = os.path.join(local_storage_path, "profiles", current_user["id"], "photos")
        os.makedirs(user_folder, exist_ok=True)
        
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in '._-')
        local_filename = f"{media_id}_{safe_filename}"
        file_path = os.path.join(user_folder, local_filename)
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        url = f"/uploads/profiles/{current_user['id']}/photos/{local_filename}"
    
    # Save to database
    media_item = {
        "id": media_id,
        "user_id": current_user["id"],
        "url": url,
        "thumbnail_url": url,  # For photos, thumbnail is same as original
        "type": "photo",
        "filename": file.filename,
        "size": file_size,
        "uploaded_at": datetime.now(timezone.utc)
    }
    
    await db.profile_media.insert_one(media_item)
    
    logger.info(f"User {current_user['username']} uploaded photo {media_id}")
    
    return MediaUploadResponse(
        success=True,
        item=MediaItem(**{k: v for k, v in media_item.items() if k != '_id'})
    )


@router.post("/video", response_model=MediaUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    category: str = Form(..., description="Main category (musician, audio_engineer, etc.)"),
    subcategory: str = Form(None, description="Subcategory (Electric Guitar, Mixing, etc.)"),
    genre: str = Form(None, description="Music genre (Rock, Jazz, etc.)"),
    description: str = Form(None, description="Video description"),
    song_name: str = Form(None, description="Song name if applicable"),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a video to the user's profile with category metadata.
    Max 10 videos allowed per user.
    Videos are automatically added to Auditions if user has less than 5 videos.
    """
    db = get_database()
    
    # Check content type
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: mp4, mov, webm, mpeg"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Check file size
    if file_size > MAX_VIDEO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_VIDEO_SIZE // (1024*1024)}MB"
        )
    
    # Check current video count
    video_count = await db.profile_media.count_documents({
        "user_id": current_user["id"],
        "type": "video"
    })
    
    if video_count >= MAX_VIDEOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_VIDEOS} videos allowed. Delete some to upload more."
        )
    
    # Check how many videos are already in auditions
    audition_count = await db.profile_media.count_documents({
        "user_id": current_user["id"],
        "type": "video",
        "show_in_auditions": True
    })
    
    # Auto-add to auditions if under the limit
    show_in_auditions = audition_count < MAX_AUDITION_VIDEOS
    
    # Generate unique ID and upload
    media_id = str(uuid.uuid4())
    
    if s3_service.is_enabled():
        # Upload to S3
        object_key = s3_service.generate_object_key(
            folder=f"profiles/{current_user['id']}/videos",
            filename=file.filename
        )
        
        url = s3_service.upload_file(
            file_data=content,
            object_key=object_key,
            content_type=file.content_type,
            metadata={
                'user-id': current_user['id'],
                'media-id': media_id
            }
        )
        
        if not url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file"
            )
    else:
        # Local fallback
        local_storage_path = os.environ.get("LOCAL_STORAGE_PATH", "/app/uploads")
        user_folder = os.path.join(local_storage_path, "profiles", current_user["id"], "videos")
        os.makedirs(user_folder, exist_ok=True)
        
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in '._-')
        local_filename = f"{media_id}_{safe_filename}"
        file_path = os.path.join(user_folder, local_filename)
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        url = f"/uploads/profiles/{current_user['id']}/videos/{local_filename}"
    
    # Get user's full profile for audition entry
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    # Save to database
    media_item = {
        "id": media_id,
        "user_id": current_user["id"],
        "url": url,
        "thumbnail_url": None,
        "type": "video",
        "filename": file.filename,
        "size": file_size,
        "category": category,
        "subcategory": subcategory,
        "genre": genre,
        "description": description,
        "song_name": song_name,
        "show_in_auditions": show_in_auditions,
        "uploaded_at": datetime.now(timezone.utc)
    }
    
    await db.profile_media.insert_one(media_item)
    
    # If showing in auditions, create audition entry
    if show_in_auditions:
        await _sync_video_to_auditions(db, media_item, user)
    
    logger.info(f"User {current_user['username']} uploaded video {media_id} (auditions: {show_in_auditions})")
    
    return MediaUploadResponse(
        success=True,
        item=MediaItem(**{k: v for k, v in media_item.items() if k != '_id'})
    )


@router.patch("/video/{media_id}", response_model=MediaItem)
async def update_video(
    media_id: str,
    update_data: VideoUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a video's metadata or auditions visibility.
    """
    db = get_database()
    
    # Find the video
    media = await db.profile_media.find_one({"id": media_id, "type": "video"})
    
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )
    
    # Check ownership
    if media["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own videos"
        )
    
    update_fields = {}
    
    if update_data.description is not None:
        update_fields["description"] = update_data.description
    if update_data.song_name is not None:
        update_fields["song_name"] = update_data.song_name
    
    # Handle auditions visibility toggle
    if update_data.show_in_auditions is not None:
        if update_data.show_in_auditions and not media.get("show_in_auditions"):
            # Trying to add to auditions - check limit
            audition_count = await db.profile_media.count_documents({
                "user_id": current_user["id"],
                "type": "video",
                "show_in_auditions": True
            })
            
            if audition_count >= MAX_AUDITION_VIDEOS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Maximum {MAX_AUDITION_VIDEOS} videos can be shown in Auditions. Deselect one first."
                )
            
            update_fields["show_in_auditions"] = True
            
            # Add to auditions collection
            user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
            updated_media = {**media, **update_fields}
            await _sync_video_to_auditions(db, updated_media, user)
            
        elif not update_data.show_in_auditions and media.get("show_in_auditions"):
            # Removing from auditions
            update_fields["show_in_auditions"] = False
            
            # Remove from auditions collection
            await db.auditions.delete_one({"profile_media_id": media_id})
    
    if update_fields:
        await db.profile_media.update_one({"id": media_id}, {"$set": update_fields})
        
        # Also update auditions entry if it exists
        if media.get("show_in_auditions") and "description" in update_fields or "song_name" in update_fields:
            await db.auditions.update_one(
                {"profile_media_id": media_id},
                {"$set": {k: v for k, v in update_fields.items() if k in ["description", "song_name"]}}
            )
    
    updated = await db.profile_media.find_one({"id": media_id}, {"_id": 0})
    return MediaItem(**updated)


@router.post("/auditions/select", response_model=dict)
async def select_audition_videos(
    request: AuditionSelectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Select which videos to show in the Auditions feed.
    Max 5 videos can be selected.
    """
    db = get_database()
    
    if len(request.video_ids) > MAX_AUDITION_VIDEOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_AUDITION_VIDEOS} videos can be shown in Auditions"
        )
    
    # Verify all videos belong to the user
    videos = await db.profile_media.find({
        "id": {"$in": request.video_ids},
        "user_id": current_user["id"],
        "type": "video"
    }).to_list(length=MAX_VIDEOS)
    
    found_ids = {v["id"] for v in videos}
    if len(found_ids) != len(request.video_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some video IDs are invalid or don't belong to you"
        )
    
    # Get user profile for auditions entries
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    
    # First, unselect all current videos and remove from auditions
    await db.profile_media.update_many(
        {"user_id": current_user["id"], "type": "video"},
        {"$set": {"show_in_auditions": False}}
    )
    await db.auditions.delete_many({"user_id": current_user["id"]})
    
    # Then, select the new ones and add to auditions
    for video_id in request.video_ids:
        await db.profile_media.update_one(
            {"id": video_id},
            {"$set": {"show_in_auditions": True}}
        )
        
        video = next(v for v in videos if v["id"] == video_id)
        await _sync_video_to_auditions(db, video, user)
    
    logger.info(f"User {current_user['username']} selected {len(request.video_ids)} videos for Auditions")
    
    return {
        "success": True,
        "selected_count": len(request.video_ids),
        "message": f"{len(request.video_ids)} videos now showing in Auditions"
    }


@router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a photo or video from the user's profile.
    Only the owner can delete their media.
    """
    db = get_database()
    
    # Find the media item
    media = await db.profile_media.find_one({"id": media_id})
    
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Check ownership
    if media["user_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own media"
        )
    
    # Delete from storage
    if s3_service.is_enabled():
        # Extract key from URL
        url = media["url"]
        if url.startswith("https://"):
            # Extract key from S3 URL
            key = url.split(".amazonaws.com/")[-1] if ".amazonaws.com/" in url else url.split("/", 3)[-1]
            s3_service.delete_object(key)
    else:
        # Delete local file
        local_storage_path = os.environ.get("LOCAL_STORAGE_PATH", "/app/uploads")
        file_path = os.path.join(local_storage_path, media["url"].lstrip('/uploads/'))
        if os.path.exists(file_path):
            os.remove(file_path)
    
    # Remove from database
    await db.profile_media.delete_one({"id": media_id})
    
    # If video was in auditions, remove from auditions collection
    if media.get("type") == "video" and media.get("show_in_auditions"):
        await db.auditions.delete_one({"profile_media_id": media_id})
    
    logger.info(f"User {current_user['username']} deleted media {media_id}")
    
    return {"success": True, "message": "Media deleted successfully"}


async def _sync_video_to_auditions(db, video: dict, user: dict):
    """
    Helper to sync a profile video to the auditions collection.
    """
    # Build subcategories list
    user_subcategories = []
    category = video.get("category") or user.get("category")
    
    # Add the video's specific subcategory
    if video.get("subcategory"):
        user_subcategories.append(video["subcategory"])
    
    # Also include user's profile subcategories
    if category == "musician":
        user_subcategories.extend(user.get("instruments", []))
    elif category == "audio_engineer":
        user_subcategories.extend(user.get("specializations", []))
    elif category == "recording_studio":
        user_subcategories.extend(user.get("offerings", []))
    elif category == "venue":
        user_subcategories.extend(user.get("venue_types", []))
    
    if user.get("sub_categories"):
        user_subcategories.extend(user.get("sub_categories", []))
    
    # Build genres list
    user_genres = []
    if video.get("genre"):
        user_genres.append(video["genre"])
    if user.get("genres"):
        user_genres.extend(user.get("genres", []))
    
    audition_entry = {
        "id": str(uuid.uuid4()),
        "profile_media_id": video["id"],  # Link back to profile media
        "user_id": user["id"],
        "username": user["username"],
        "user_avatar": user.get("profile_image") or user.get("profile_picture"),
        "user_category": category,
        "user_subcategories": list(set(user_subcategories)),
        "user_genres": list(set(user_genres)),
        "user_is_verified": user.get("is_verified", False) or user.get("is_approved_seller", False),
        "media_url": video["url"],
        "thumbnail_url": video.get("thumbnail_url"),
        "item_type": "video",
        "description": video.get("description"),
        "song_name": video.get("song_name"),
        "likes_count": 0,
        "comments_count": 0,
        "shares_count": 0,
        "views_count": 0,
        "is_featured": False,
        "created_at": video.get("uploaded_at") or datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Remove any existing entry for this video
    await db.auditions.delete_one({"profile_media_id": video["id"]})
    
    # Insert new entry
    await db.auditions.insert_one(audition_entry)
