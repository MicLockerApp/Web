"""
AWS S3 Service for MicLocker
Handles file uploads, downloads, and deletions for listing images and videos
"""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config
import logging
import os
from datetime import datetime
import uuid
from typing import Optional, List, Dict

logger = logging.getLogger(__name__)


class S3Service:
    """Service class for AWS S3 operations"""
    
    def __init__(self):
        self.access_key = os.environ.get("AWS_ACCESS_KEY_ID")
        self.secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY")
        self.bucket_name = os.environ.get("S3_BUCKET_NAME")
        self.region = os.environ.get("S3_REGION", "us-east-2")
        self.presigned_url_expiration = 3600  # 1 hour
        
        self.enabled = bool(self.access_key and self.secret_key and self.bucket_name)
        self.s3_client = None
        
        if self.enabled:
            try:
                # Configure for faster uploads
                config = Config(
                    region_name=self.region,
                    signature_version='s3v4',
                    retries={'max_attempts': 3, 'mode': 'standard'}
                )
                
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region,
                    config=config
                )
                logger.info(f"S3 Service initialized for bucket: {self.bucket_name} in {self.region}")
            except Exception as e:
                logger.error(f"Failed to initialize S3 client: {e}")
                self.enabled = False
        else:
            logger.warning("S3 Service disabled - missing AWS credentials or bucket name")
    
    def is_enabled(self) -> bool:
        """Check if S3 service is properly configured"""
        return self.enabled
    
    def generate_presigned_upload_url(
        self, 
        object_key: str, 
        content_type: str,
        expiration: int = None
    ) -> Optional[Dict]:
        """
        Generate a presigned URL for uploading a file to S3.
        Returns both the URL and the fields needed for the upload.
        """
        if not self.enabled:
            logger.error("S3 service not enabled")
            return None
        
        try:
            expiration = expiration or self.presigned_url_expiration
            
            # Generate presigned POST URL (better for browser uploads)
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=object_key,
                Fields={
                    'Content-Type': content_type,
                    'x-amz-meta-uploaded-by': 'miclocker'
                },
                Conditions=[
                    {'Content-Type': content_type},
                    ['content-length-range', 1, 100 * 1024 * 1024],  # Max 100MB
                ],
                ExpiresIn=expiration
            )
            
            logger.info(f"Generated presigned upload URL for {object_key}")
            return response
            
        except ClientError as e:
            logger.error(f"Error generating presigned upload URL: {e}")
            return None
    
    def generate_presigned_put_url(
        self,
        object_key: str,
        content_type: str,
        expiration: int = None
    ) -> Optional[str]:
        """
        Generate a simple presigned PUT URL for direct uploads.
        Simpler than POST but requires proper headers from client.
        """
        if not self.enabled:
            return None
        
        try:
            expiration = expiration or self.presigned_url_expiration
            
            url = self.s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_key,
                    'ContentType': content_type
                },
                ExpiresIn=expiration,
                HttpMethod='PUT'
            )
            
            return url
            
        except ClientError as e:
            logger.error(f"Error generating presigned PUT URL: {e}")
            return None
    
    def generate_presigned_download_url(
        self, 
        object_key: str,
        expiration: int = None
    ) -> Optional[str]:
        """Generate a presigned URL for downloading a file from S3"""
        if not self.enabled:
            return None
        
        try:
            expiration = expiration or self.presigned_url_expiration
            
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_key
                },
                ExpiresIn=expiration,
                HttpMethod='GET'
            )
            
            return url
            
        except ClientError as e:
            logger.error(f"Error generating presigned download URL: {e}")
            return None
    
    def get_public_url(self, object_key: str) -> str:
        """
        Get the public URL for an object.
        Note: Only works if the object/bucket has public read permissions.
        """
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{object_key}"
    
    def upload_file(
        self, 
        file_data: bytes, 
        object_key: str, 
        content_type: str,
        metadata: dict = None
    ) -> Optional[str]:
        """
        Upload a file directly from the backend.
        Returns the S3 URL if successful.
        """
        if not self.enabled:
            logger.error("S3 service not enabled")
            return None
        
        try:
            extra_args = {
                'ContentType': content_type
                # Note: ACL removed - bucket uses bucket policy for public access
            }
            
            if metadata:
                extra_args['Metadata'] = metadata
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_data,
                **extra_args
            )
            
            url = self.get_public_url(object_key)
            logger.info(f"Uploaded file to S3: {object_key}")
            return url
            
        except ClientError as e:
            logger.error(f"Error uploading file to S3: {e}")
            return None
    
    def delete_object(self, object_key: str) -> bool:
        """Delete a file from S3"""
        if not self.enabled:
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            logger.info(f"Deleted object from S3: {object_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error deleting object from S3: {e}")
            return False
    
    def delete_objects(self, object_keys: List[str]) -> bool:
        """Delete multiple files from S3 in a single request"""
        if not self.enabled or not object_keys:
            return False
        
        try:
            delete_objects = {'Objects': [{'Key': key} for key in object_keys]}
            
            response = self.s3_client.delete_objects(
                Bucket=self.bucket_name,
                Delete=delete_objects
            )
            
            deleted = len(response.get('Deleted', []))
            errors = len(response.get('Errors', []))
            
            logger.info(f"Deleted {deleted} objects from S3, {errors} errors")
            return errors == 0
            
        except ClientError as e:
            logger.error(f"Error batch deleting objects from S3: {e}")
            return False
    
    def list_objects(self, prefix: str = "") -> List[Dict]:
        """List objects in the S3 bucket with optional prefix"""
        if not self.enabled:
            return []
        
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            objects = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    objects.append({
                        'key': obj['Key'],
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        'url': self.get_public_url(obj['Key'])
                    })
            
            return objects
            
        except ClientError as e:
            logger.error(f"Error listing objects from S3: {e}")
            return []
    
    def object_exists(self, object_key: str) -> bool:
        """Check if an object exists in S3"""
        if not self.enabled:
            return False
        
        try:
            self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            return True
        except ClientError:
            return False
    
    def generate_object_key(
        self, 
        folder: str, 
        filename: str, 
        listing_id: str = None
    ) -> str:
        """
        Generate a unique S3 object key for a file.
        Structure: {folder}/{listing_id or uuid}/{timestamp}_{filename}
        """
        # Clean filename
        safe_filename = "".join(c for c in filename if c.isalnum() or c in '._-')
        if not safe_filename:
            safe_filename = "file"
        
        # Generate unique identifier
        identifier = listing_id or str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        unique_id = str(uuid.uuid4())[:8]
        
        return f"{folder}/{identifier}/{timestamp}_{unique_id}_{safe_filename}"
    
    def copy_object(self, source_key: str, dest_key: str) -> bool:
        """Copy an object within the same bucket"""
        if not self.enabled:
            return False
        
        try:
            self.s3_client.copy_object(
                Bucket=self.bucket_name,
                CopySource={'Bucket': self.bucket_name, 'Key': source_key},
                Key=dest_key
                # Note: ACL removed - bucket uses bucket policy for public access
            )
            logger.info(f"Copied S3 object from {source_key} to {dest_key}")
            return True
            
        except ClientError as e:
            logger.error(f"Error copying S3 object: {e}")
            return False


# Create singleton instance
s3_service = S3Service()
