"""
Two-Factor Authentication Models

Models for TOTP and SMS-based 2FA.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


class TwoFactorMethod(str, Enum):
    TOTP = "totp"  # Authenticator app
    SMS = "sms"    # Phone number


class TwoFactorSetupRequest(BaseModel):
    """Request to set up 2FA"""
    method: TwoFactorMethod
    phone_number: Optional[str] = None  # Required for SMS method


class TwoFactorSetupResponse(BaseModel):
    """Response with setup information"""
    method: TwoFactorMethod
    # For TOTP
    secret: Optional[str] = None
    qr_code_url: Optional[str] = None
    # For SMS
    phone_number: Optional[str] = None
    verification_sent: bool = False


class TwoFactorVerifyRequest(BaseModel):
    """Request to verify 2FA code"""
    code: str
    method: TwoFactorMethod


class TwoFactorVerifyResponse(BaseModel):
    """Response after verification"""
    verified: bool
    backup_codes: Optional[List[str]] = None  # Only on first successful setup


class TwoFactorStatusResponse(BaseModel):
    """Current 2FA status for a user"""
    enabled: bool
    methods: List[TwoFactorMethod] = []
    totp_enabled: bool = False
    sms_enabled: bool = False
    phone_last_four: Optional[str] = None


class TwoFactorDisableRequest(BaseModel):
    """Request to disable 2FA"""
    password: str
    code: str  # Current 2FA code to confirm


class TwoFactorChallengeRequest(BaseModel):
    """Request to send 2FA challenge (for sensitive actions)"""
    action: str  # e.g., "withdrawal", "password_change"
    preferred_method: Optional[TwoFactorMethod] = None


class TwoFactorChallengeResponse(BaseModel):
    """Response with challenge info"""
    challenge_id: str
    method: TwoFactorMethod
    expires_at: datetime
    phone_last_four: Optional[str] = None  # If SMS


class TwoFactorValidateRequest(BaseModel):
    """Request to validate a 2FA challenge"""
    challenge_id: str
    code: str


class TwoFactorInDB(BaseModel):
    """2FA data stored in database"""
    user_id: str
    totp_secret: Optional[str] = None
    totp_enabled: bool = False
    sms_phone: Optional[str] = None
    sms_enabled: bool = False
    backup_codes: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class TwoFactorChallenge(BaseModel):
    """Active 2FA challenge"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action: str
    method: TwoFactorMethod
    code_hash: Optional[str] = None  # For SMS codes
    expires_at: datetime
    verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
