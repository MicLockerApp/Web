import os
from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Application
    app_name: str = "MicLocker API"
    environment: str = os.getenv("ENVIRONMENT", "development")
    secret_key: str = os.getenv("SECRET_KEY", "miclocker-secret-key")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
    
    # MongoDB
    mongo_url: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    database_name: str = "miclocker"
    
    # AWS S3
    aws_access_key_id: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID") or None
    aws_secret_access_key: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY") or None
    s3_bucket_name: Optional[str] = os.getenv("S3_BUCKET_NAME") or None
    s3_region: str = os.getenv("S3_REGION", "us-east-1")
    s3_presigned_url_expiration: int = 3600
    
    # Local Storage
    local_storage_path: str = os.getenv("LOCAL_STORAGE_PATH", "/app/uploads")
    
    # Platform Settings
    platform_fee_percent: float = float(os.getenv("PLATFORM_FEE_PERCENT", "3"))
    
    # Payment Processing Fee (Stripe-like: 3.19% + $0.49)
    payment_processing_percent: float = float(os.getenv("PAYMENT_PROCESSING_PERCENT", "3.19"))
    payment_processing_fixed: float = float(os.getenv("PAYMENT_PROCESSING_FIXED", "0.49"))
    
    # File Upload Restrictions
    max_image_size_mb: int = 10
    max_video_size_mb: int = 100
    allowed_image_types: list = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    allowed_video_types: list = ["video/mp4", "video/quicktime", "video/webm"]
    
    @property
    def use_s3(self) -> bool:
        return all([
            self.aws_access_key_id,
            self.aws_secret_access_key,
            self.s3_bucket_name
        ])
    
    class Config:
        env_file = ".env"

settings = Settings()
