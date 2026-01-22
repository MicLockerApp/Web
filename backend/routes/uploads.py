"""
Upload Routes for MicLocker
Handles file uploads to AWS S3 for listing images and videos
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import logging
import os
import uuid
from services.s3_service import s3_service
from services.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["Uploads"])


# Allowed file types
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}
ALLOWED_VIDEO_TYPES = {'video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES

# Max file sizes (in bytes)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB


class PresignedUrlRequest(BaseModel):
    filename: str
    content_type: str
    listing_id: Optional[str] = None


class PresignedUrlResponse(BaseModel):
    upload_url: str
    fields: dict
    key: str
    public_url: str
    expires_in: int


class DirectUploadResponse(BaseModel):
    success: bool
    key: str
    url: str
    filename: str
    content_type: str
    size: int


class UploadStatusResponse(BaseModel):
    s3_enabled: bool
    bucket_name: Optional[str]
    region: Optional[str]
    local_fallback: bool


def validate_content_type(content_type: str) -> bool:
    """Validate that the content type is allowed"""
    return content_type in ALLOWED_TYPES


def get_max_size_for_type(content_type: str) -> int:
    """Get the maximum allowed file size for a content type"""
    if content_type in ALLOWED_VIDEO_TYPES:
        return MAX_VIDEO_SIZE
    return MAX_IMAGE_SIZE


@router.get("/status", response_model=UploadStatusResponse)
async def get_upload_status():
    """
    Check the status of the upload service.
    Returns whether S3 is enabled and configured.
    """
    return UploadStatusResponse(
        s3_enabled=s3_service.is_enabled(),
        bucket_name=os.environ.get("S3_BUCKET_NAME") if s3_service.is_enabled() else None,
        region=os.environ.get("S3_REGION") if s3_service.is_enabled() else None,
        local_fallback=not s3_service.is_enabled()
    )


@router.post("/presigned-url", response_model=PresignedUrlResponse)
async def get_presigned_upload_url(
    request: PresignedUrlRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a presigned URL for uploading a file directly to S3.
    The frontend will use this URL to upload files without passing through the backend.
    """
    # Validate content type
    if not validate_content_type(request.content_type):
        raise HTTPException(
            status_code=400,
            detail=f"File type '{request.content_type}' is not allowed. Allowed types: images (jpeg, png, webp, gif) and videos (mp4, mov, webm)"
        )
    
    # Check if S3 is enabled
    if not s3_service.is_enabled():
        raise HTTPException(
            status_code=503,
            detail="S3 storage is not configured. Please use local upload instead."
        )
    
    # Generate object key
    folder = "listings" if request.listing_id else "temp"
    object_key = s3_service.generate_object_key(
        folder=folder,
        filename=request.filename,
        listing_id=request.listing_id
    )
    
    # Generate presigned URL
    presigned_data = s3_service.generate_presigned_upload_url(
        object_key=object_key,
        content_type=request.content_type
    )
    
    if not presigned_data:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate presigned upload URL"
        )
    
    return PresignedUrlResponse(
        upload_url=presigned_data['url'],
        fields=presigned_data['fields'],
        key=object_key,
        public_url=s3_service.get_public_url(object_key),
        expires_in=3600
    )


@router.post("/presigned-put-url")
async def get_presigned_put_url(
    request: PresignedUrlRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a simple presigned PUT URL for direct upload.
    This is simpler than POST but requires proper headers from client.
    """
    # Validate content type
    if not validate_content_type(request.content_type):
        raise HTTPException(
            status_code=400,
            detail=f"File type '{request.content_type}' is not allowed"
        )
    
    if not s3_service.is_enabled():
        raise HTTPException(
            status_code=503,
            detail="S3 storage is not configured"
        )
    
    folder = "listings" if request.listing_id else "temp"
    object_key = s3_service.generate_object_key(
        folder=folder,
        filename=request.filename,
        listing_id=request.listing_id
    )
    
    upload_url = s3_service.generate_presigned_put_url(
        object_key=object_key,
        content_type=request.content_type
    )
    
    if not upload_url:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate presigned URL"
        )
    
    return {
        "upload_url": upload_url,
        "key": object_key,
        "public_url": s3_service.get_public_url(object_key),
        "content_type": request.content_type,
        "expires_in": 3600
    }


@router.post("/direct", response_model=DirectUploadResponse)
async def direct_upload(
    file: UploadFile = File(...),
    listing_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload a file directly through the backend to S3.
    Use this for smaller files or when presigned URLs aren't suitable.
    Falls back to local storage if S3 is not configured.
    """
    # Validate content type
    if not validate_content_type(file.content_type):
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' is not allowed"
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Validate file size
    max_size = get_max_size_for_type(file.content_type)
    if file_size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {max_size // (1024*1024)}MB"
        )
    
    if s3_service.is_enabled():
        # Upload to S3
        folder = "listings" if listing_id else "uploads"
        object_key = s3_service.generate_object_key(
            folder=folder,
            filename=file.filename,
            listing_id=listing_id
        )
        
        url = s3_service.upload_file(
            file_data=content,
            object_key=object_key,
            content_type=file.content_type,
            metadata={
                'original-filename': file.filename,
                'uploader-id': current_user['id']
            }
        )
        
        if not url:
            raise HTTPException(
                status_code=500,
                detail="Failed to upload file to S3"
            )
        
        return DirectUploadResponse(
            success=True,
            key=object_key,
            url=url,
            filename=file.filename,
            content_type=file.content_type,
            size=file_size
        )
    else:
        # Fallback to local storage
        local_storage_path = os.environ.get("LOCAL_STORAGE_PATH", "/app/uploads")
        os.makedirs(local_storage_path, exist_ok=True)
        
        # Generate unique filename
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in '._-')
        local_filename = f"{timestamp}_{unique_id}_{safe_filename}"
        
        if listing_id:
            listing_folder = os.path.join(local_storage_path, "listings", listing_id)
            os.makedirs(listing_folder, exist_ok=True)
            file_path = os.path.join(listing_folder, local_filename)
            relative_path = f"/uploads/listings/{listing_id}/{local_filename}"
        else:
            file_path = os.path.join(local_storage_path, local_filename)
            relative_path = f"/uploads/{local_filename}"
        
        # Write to disk
        with open(file_path, 'wb') as f:
            f.write(content)
        
        return DirectUploadResponse(
            success=True,
            key=relative_path,
            url=relative_path,
            filename=file.filename,
            content_type=file.content_type,
            size=file_size
        )


@router.delete("/{key:path}")
async def delete_upload(
    key: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an uploaded file from S3 or local storage.
    """
    # Validate key to prevent directory traversal
    if ".." in key or key.startswith("/"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file key"
        )
    
    if s3_service.is_enabled():
        success = s3_service.delete_object(key)
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete file from S3"
            )
    else:
        # Delete from local storage
        local_storage_path = os.environ.get("LOCAL_STORAGE_PATH", "/app/uploads")
        file_path = os.path.join(local_storage_path, key.lstrip('/uploads/'))
        
        if os.path.exists(file_path):
            os.remove(file_path)
        else:
            raise HTTPException(
                status_code=404,
                detail="File not found"
            )
    
    return {"success": True, "message": f"File {key} deleted"}


@router.get("/listing/{listing_id}")
async def get_listing_files(listing_id: str):
    """
    Get all files associated with a listing.
    Works with both S3 and local storage.
    """
    if s3_service.is_enabled():
        prefix = f"listings/{listing_id}/"
        files = s3_service.list_objects(prefix)
        return {
            "listing_id": listing_id,
            "files": files,
            "storage": "s3"
        }
    else:
        # List from local storage
        local_storage_path = os.environ.get("LOCAL_STORAGE_PATH", "/app/uploads")
        listing_folder = os.path.join(local_storage_path, "listings", listing_id)
        
        files = []
        if os.path.exists(listing_folder):
            for filename in os.listdir(listing_folder):
                file_path = os.path.join(listing_folder, filename)
                if os.path.isfile(file_path):
                    files.append({
                        'key': f"listings/{listing_id}/{filename}",
                        'url': f"/uploads/listings/{listing_id}/{filename}",
                        'size': os.path.getsize(file_path),
                        'filename': filename
                    })
        
        return {
            "listing_id": listing_id,
            "files": files,
            "storage": "local"
        }


@router.post("/move-temp-to-listing")
async def move_temp_files_to_listing(
    temp_keys: List[str],
    listing_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Move files from temp storage to listing folder.
    Used when a listing is finalized after upload.
    """
    if not s3_service.is_enabled():
        # For local storage, just return the same paths
        return {
            "success": True,
            "moved_files": [{"old_key": k, "new_key": k, "url": k} for k in temp_keys]
        }
    
    moved_files = []
    
    for temp_key in temp_keys:
        # Extract filename from temp key
        filename = temp_key.split('/')[-1]
        
        # Generate new key in listings folder
        new_key = f"listings/{listing_id}/{filename}"
        
        # Copy to new location
        if s3_service.copy_object(temp_key, new_key):
            # Delete old file
            s3_service.delete_object(temp_key)
            
            moved_files.append({
                "old_key": temp_key,
                "new_key": new_key,
                "url": s3_service.get_public_url(new_key)
            })
        else:
            logger.error(f"Failed to move file {temp_key} to {new_key}")
    
    return {
        "success": True,
        "moved_files": moved_files
    }
