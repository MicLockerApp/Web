from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse
from services.auth import get_current_user
from services.storage import storage_service
from config import settings
import os

router = APIRouter(prefix="/files", tags=["Files"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    file_type: str = Query(..., regex="^(image|video|profile)$"),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file (image or video)"""
    content_type = file.content_type or "application/octet-stream"
    
    # Validate file type
    validation_type = "image" if file_type in ["image", "profile"] else "video"
    if not storage_service.validate_file_type(content_type, validation_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file format. Allowed types: {settings.allowed_image_types if validation_type == 'image' else settings.allowed_video_types}"
        )
    
    # Read content
    content = await file.read()
    
    # Validate size
    if not storage_service.validate_file_size(len(content), validation_type):
        max_size = settings.max_image_size_mb if validation_type == "image" else settings.max_video_size_mb
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {max_size}MB"
        )
    
    # Generate file key
    folder = "profiles" if file_type == "profile" else f"{file_type}s"
    file_key = storage_service.generate_file_key(folder, current_user["id"], file.filename)
    
    # Upload
    success, url = await storage_service.upload_file(content, file_key, content_type)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )
    
    return {
        "url": url,
        "file_key": file_key,
        "file_type": file_type,
        "size": len(content)
    }

@router.get("/{file_path:path}")
async def serve_file(file_path: str):
    """Serve a file from local storage"""
    if storage_service.use_s3:
        # Redirect to S3 presigned URL
        url = storage_service.get_presigned_download_url(file_path)
        if url:
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=url)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Serve from local storage
    local_path = storage_service.get_local_file_path(file_path)
    if not local_path or not os.path.exists(local_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    return FileResponse(local_path)
