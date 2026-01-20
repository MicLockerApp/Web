import os
from pydantic_settings import BaseSettings
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Application
    app_name: str = "MicLocker API"
    environment: str = os.getenv("ENVIRONMENT", "development")
    secret_key: str = os.getenv("SECRET_KEY", "")  # Must be set in production
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
    
    # CORS Settings - Read from environment or use defaults
    cors_origins: List[str] = []
    
    @property
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins from environment or use defaults"""
        env_origins = os.getenv("CORS_ORIGINS", "")
        if env_origins:
            return [origin.strip() for origin in env_origins.split(",")]
        # Default origins for development and production
        return [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "https://miclockerapp.com",
            "https://www.miclockerapp.com",
            os.getenv("FRONTEND_URL", ""),
        ]
    
    # MongoDB - Read database name from env
    mongo_url: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    database_name: str = os.getenv("DATABASE_NAME", "miclocker")
    
    # AWS S3
    aws_access_key_id: Optional[str] = os.getenv("AWS_ACCESS_KEY_ID") or None
    aws_secret_access_key: Optional[str] = os.getenv("AWS_SECRET_ACCESS_KEY") or None
    s3_bucket_name: Optional[str] = os.getenv("S3_BUCKET_NAME") or None
    s3_region: str = os.getenv("S3_REGION", "us-east-1")
    s3_presigned_url_expiration: int = 3600
    
    # AWS SES (Email)
    ses_region: str = os.getenv("SES_REGION", "us-east-2")
    ses_sender_email: str = os.getenv("SES_SENDER_EMAIL", "info@miclockerapp.com")
    
    # Local Storage
    local_storage_path: str = os.getenv("LOCAL_STORAGE_PATH", "/app/uploads")
    
    # Platform Settings
    platform_fee_percent: float = float(os.getenv("PLATFORM_FEE_PERCENT", "3"))
    
    # Payment Processing Fee (Stripe-like: 3.19% + $0.49)
    payment_processing_percent: float = float(os.getenv("PAYMENT_PROCESSING_PERCENT", "3.19"))
    payment_processing_fixed: float = float(os.getenv("PAYMENT_PROCESSING_FIXED", "0.49"))
    
    # AI Chatbot (Emergent LLM Key)
    emergent_llm_key: Optional[str] = os.getenv("EMERGENT_LLM_KEY") or None
    
    # Stripe Payment Settings
    stripe_api_key: Optional[str] = os.getenv("STRIPE_API_KEY") or None
    stripe_publishable_key: Optional[str] = os.getenv("STRIPE_PUBLISHABLE_KEY") or None
    stripe_webhook_secret: Optional[str] = os.getenv("STRIPE_WEBHOOK_SECRET") or None
    
    # Stripe Connect (for seller payouts)
    stripe_connect_enabled: bool = os.getenv("STRIPE_CONNECT_ENABLED", "true").lower() == "true"
    
    # Auto-delivery confirmation (days)
    auto_delivery_days: int = int(os.getenv("AUTO_DELIVERY_DAYS", "14"))
    
    # Frontend URL for webhooks - read from environment
    frontend_url: str = os.getenv("FRONTEND_URL", "")
    
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
