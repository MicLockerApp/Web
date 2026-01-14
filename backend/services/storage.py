import boto3
from botocore.exceptions import ClientError
from config import settings
from typing import Optional, Tuple
import os
import uuid
import logging
from pathlib import Path
import aiofiles
import mimetypes

logger = logging.getLogger(__name__)

class StorageService:
    """Unified storage service with S3 and local fallback"""
    
    def __init__(self):
        self.use_s3 = settings.use_s3
        self.s3_client = None
        
        if self.use_s3:
            self.s3_client = boto3.client(
                's3',
                region_name=settings.s3_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key
            )
            logger.info("Using AWS S3 for storage")
        else:
            # Ensure local storage directory exists
            Path(settings.local_storage_path).mkdir(parents=True, exist_ok=True)
            for subdir in ["images", "videos", "profiles"]:
                Path(f"{settings.local_storage_path}/{subdir}").mkdir(parents=True, exist_ok=True)
            logger.info(f"Using local storage at {settings.local_storage_path}")
    
    def generate_file_key(self, file_type: str, user_id: str, original_filename: str) -> str:
        """Generate a unique file key/path"""
        ext = os.path.splitext(original_filename)[1].lower()
        file_id = str(uuid.uuid4())
        return f"{file_type}/{user_id}/{file_id}{ext}"
    
    async def upload_file(self, file_content: bytes, file_key: str, content_type: str) -> Tuple[bool, str]:
        """Upload file to storage (S3 or local)"""
        try:
            if self.use_s3:
                self.s3_client.put_object(
                    Bucket=settings.s3_bucket_name,
                    Key=file_key,
                    Body=file_content,
                    ContentType=content_type
                )
                url = f"https://{settings.s3_bucket_name}.s3.{settings.s3_region}.amazonaws.com/{file_key}"
                return True, url
            else:
                # Local storage
                file_path = Path(settings.local_storage_path) / file_key
                file_path.parent.mkdir(parents=True, exist_ok=True)
                
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(file_content)
                
                # Return relative URL for local files
                url = f"/api/files/{file_key}"
                return True, url
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            return False, str(e)
    
    def get_presigned_upload_url(self, file_key: str, content_type: str, expiration: int = 3600) -> Optional[dict]:
        """Generate presigned URL for S3 upload (S3 only)"""
        if not self.use_s3:
            return None
        
        try:
            response = self.s3_client.generate_presigned_post(
                Bucket=settings.s3_bucket_name,
                Key=file_key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 0, settings.max_image_size_mb * 1024 * 1024]
                ],
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            return None
    
    def get_presigned_download_url(self, file_key: str, expiration: int = 3600) -> Optional[str]:
        """Generate presigned URL for S3 download (S3 only)"""
        if not self.use_s3:
            return f"/api/files/{file_key}"
        
        try:
            url = self.s3_client.generate_presigned_url(
                ClientMethod='get_object',
                Params={
                    'Bucket': settings.s3_bucket_name,
                    'Key': file_key
                },
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            logger.error(f"Error generating presigned download URL: {e}")
            return None
    
    async def delete_file(self, file_key: str) -> bool:
        """Delete file from storage"""
        try:
            if self.use_s3:
                self.s3_client.delete_object(
                    Bucket=settings.s3_bucket_name,
                    Key=file_key
                )
            else:
                file_path = Path(settings.local_storage_path) / file_key
                if file_path.exists():
                    file_path.unlink()
            return True
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False
    
    def get_local_file_path(self, file_key: str) -> Optional[str]:
        """Get local file path (for serving local files)"""
        if self.use_s3:
            return None
        file_path = Path(settings.local_storage_path) / file_key
        if file_path.exists():
            return str(file_path)
        return None
    
    def validate_file_type(self, content_type: str, file_type: str) -> bool:
        """Validate file MIME type"""
        if file_type == "image":
            return content_type in settings.allowed_image_types
        elif file_type == "video":
            return content_type in settings.allowed_video_types
        return False
    
    def validate_file_size(self, size: int, file_type: str) -> bool:
        """Validate file size"""
        if file_type == "image":
            return size <= settings.max_image_size_mb * 1024 * 1024
        elif file_type == "video":
            return size <= settings.max_video_size_mb * 1024 * 1024
        return False

# Global storage service instance
storage_service = StorageService()
