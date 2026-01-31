"""
Two-Factor Authentication Routes

API endpoints for TOTP and SMS-based 2FA.
"""

from fastapi import APIRouter, HTTPException, status, Depends
from models.two_factor import (
    TwoFactorMethod, TwoFactorSetupRequest, TwoFactorSetupResponse,
    TwoFactorVerifyRequest, TwoFactorVerifyResponse, TwoFactorStatusResponse,
    TwoFactorDisableRequest, TwoFactorChallengeRequest, TwoFactorChallengeResponse,
    TwoFactorValidateRequest, TwoFactorInDB, TwoFactorChallenge
)
from services.auth import get_current_user, verify_password, get_password_hash
from database import get_database
from datetime import datetime, timezone, timedelta
from typing import Optional
import pyotp
import qrcode
import qrcode.image.svg
import base64
import io
import secrets
import hashlib
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/2fa", tags=["Two-Factor Authentication"])

# Twilio configuration (optional - only if SMS is enabled)
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_VERIFY_SERVICE = os.environ.get("TWILIO_VERIFY_SERVICE")

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client
        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized for SMS 2FA")
    except Exception as e:
        logger.warning(f"Failed to initialize Twilio client: {e}")


def generate_backup_codes(count: int = 10) -> list:
    """Generate backup codes for recovery"""
    return [secrets.token_hex(4).upper() for _ in range(count)]


def hash_code(code: str) -> str:
    """Hash a verification code"""
    return hashlib.sha256(code.encode()).hexdigest()


def generate_qr_code_base64(uri: str) -> str:
    """Generate a QR code as base64 PNG"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"


@router.get("/status", response_model=TwoFactorStatusResponse)
async def get_2fa_status(current_user: dict = Depends(get_current_user)):
    """Get current 2FA status for the user"""
    db = get_database()
    
    two_factor = await db.two_factor.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not two_factor:
        return TwoFactorStatusResponse(
            enabled=False,
            methods=[],
            totp_enabled=False,
            sms_enabled=False
        )
    
    methods = []
    if two_factor.get("totp_enabled"):
        methods.append(TwoFactorMethod.TOTP)
    if two_factor.get("sms_enabled"):
        methods.append(TwoFactorMethod.SMS)
    
    phone_last_four = None
    if two_factor.get("sms_phone"):
        phone_last_four = two_factor["sms_phone"][-4:]
    
    return TwoFactorStatusResponse(
        enabled=len(methods) > 0,
        methods=methods,
        totp_enabled=two_factor.get("totp_enabled", False),
        sms_enabled=two_factor.get("sms_enabled", False),
        phone_last_four=phone_last_four
    )


@router.post("/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(
    request: TwoFactorSetupRequest,
    current_user: dict = Depends(get_current_user)
):
    """Initialize 2FA setup - returns secret/QR code for TOTP or sends SMS"""
    db = get_database()
    
    # Get or create 2FA record
    two_factor = await db.two_factor.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if request.method == TwoFactorMethod.TOTP:
        # Generate TOTP secret
        secret = pyotp.random_base32()
        
        # Create provisioning URI for QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=current_user.get("email", current_user["username"]),
            issuer_name="MicLocker"
        )
        
        # Generate QR code
        qr_code_url = generate_qr_code_base64(provisioning_uri)
        
        # Store pending secret (not enabled until verified)
        if two_factor:
            await db.two_factor.update_one(
                {"user_id": current_user["id"]},
                {"$set": {
                    "totp_secret": secret,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        else:
            await db.two_factor.insert_one({
                "user_id": current_user["id"],
                "totp_secret": secret,
                "totp_enabled": False,
                "sms_phone": None,
                "sms_enabled": False,
                "backup_codes": [],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
        
        return TwoFactorSetupResponse(
            method=TwoFactorMethod.TOTP,
            secret=secret,
            qr_code_url=qr_code_url
        )
    
    elif request.method == TwoFactorMethod.SMS:
        if not request.phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number is required for SMS 2FA"
            )
        
        if not twilio_client or not TWILIO_VERIFY_SERVICE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SMS 2FA is not configured. Please use authenticator app instead."
            )
        
        try:
            # Send verification via Twilio Verify
            twilio_client.verify.services(TWILIO_VERIFY_SERVICE) \
                .verifications.create(to=request.phone_number, channel="sms")
            
            # Store pending phone number
            if two_factor:
                await db.two_factor.update_one(
                    {"user_id": current_user["id"]},
                    {"$set": {
                        "sms_phone": request.phone_number,
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
            else:
                await db.two_factor.insert_one({
                    "user_id": current_user["id"],
                    "totp_secret": None,
                    "totp_enabled": False,
                    "sms_phone": request.phone_number,
                    "sms_enabled": False,
                    "backup_codes": [],
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                })
            
            return TwoFactorSetupResponse(
                method=TwoFactorMethod.SMS,
                phone_number=request.phone_number[-4:],  # Only return last 4 digits
                verification_sent=True
            )
        except Exception as e:
            logger.error(f"Failed to send SMS verification: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send verification SMS. Please try again."
            )


@router.post("/verify", response_model=TwoFactorVerifyResponse)
async def verify_2fa_setup(
    request: TwoFactorVerifyRequest,
    current_user: dict = Depends(get_current_user)
):
    """Verify 2FA code and enable the method"""
    db = get_database()
    
    two_factor = await db.two_factor.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not two_factor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup not initiated. Please start setup first."
        )
    
    if request.method == TwoFactorMethod.TOTP:
        secret = two_factor.get("totp_secret")
        if not secret:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="TOTP not set up. Please initiate setup first."
            )
        
        # Verify the code
        totp = pyotp.TOTP(secret)
        if not totp.verify(request.code, valid_window=1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code. Please try again."
            )
        
        # Generate backup codes on first setup
        backup_codes = None
        if not two_factor.get("totp_enabled"):
            backup_codes = generate_backup_codes()
            hashed_codes = [hash_code(code) for code in backup_codes]
            
            await db.two_factor.update_one(
                {"user_id": current_user["id"]},
                {"$set": {
                    "totp_enabled": True,
                    "backup_codes": hashed_codes,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        else:
            await db.two_factor.update_one(
                {"user_id": current_user["id"]},
                {"$set": {"updated_at": datetime.now(timezone.utc)}}
            )
        
        return TwoFactorVerifyResponse(verified=True, backup_codes=backup_codes)
    
    elif request.method == TwoFactorMethod.SMS:
        phone = two_factor.get("sms_phone")
        if not phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="SMS not set up. Please initiate setup first."
            )
        
        if not twilio_client or not TWILIO_VERIFY_SERVICE:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SMS 2FA is not configured"
            )
        
        try:
            check = twilio_client.verify.services(TWILIO_VERIFY_SERVICE) \
                .verification_checks.create(to=phone, code=request.code)
            
            if check.status != "approved":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid verification code"
                )
            
            # Generate backup codes on first setup
            backup_codes = None
            if not two_factor.get("sms_enabled"):
                backup_codes = generate_backup_codes()
                hashed_codes = [hash_code(code) for code in backup_codes]
                
                await db.two_factor.update_one(
                    {"user_id": current_user["id"]},
                    {"$set": {
                        "sms_enabled": True,
                        "backup_codes": hashed_codes,
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
            
            return TwoFactorVerifyResponse(verified=True, backup_codes=backup_codes)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"SMS verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification failed. Please try again."
            )


@router.post("/disable")
async def disable_2fa(
    request: TwoFactorDisableRequest,
    current_user: dict = Depends(get_current_user)
):
    """Disable 2FA (requires password and current 2FA code)"""
    db = get_database()
    
    # Verify password
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user or not verify_password(request.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )
    
    # Verify 2FA code
    two_factor = await db.two_factor.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not two_factor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )
    
    # Check TOTP code
    code_valid = False
    if two_factor.get("totp_enabled") and two_factor.get("totp_secret"):
        totp = pyotp.TOTP(two_factor["totp_secret"])
        code_valid = totp.verify(request.code, valid_window=1)
    
    # Check backup codes
    if not code_valid:
        hashed = hash_code(request.code.upper())
        if hashed in two_factor.get("backup_codes", []):
            code_valid = True
            # Remove used backup code
            await db.two_factor.update_one(
                {"user_id": current_user["id"]},
                {"$pull": {"backup_codes": hashed}}
            )
    
    if not code_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Disable 2FA
    await db.two_factor.delete_one({"user_id": current_user["id"]})
    
    return {"success": True, "message": "Two-factor authentication has been disabled"}


@router.post("/challenge", response_model=TwoFactorChallengeResponse)
async def create_2fa_challenge(
    request: TwoFactorChallengeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a 2FA challenge for sensitive actions"""
    db = get_database()
    
    two_factor = await db.two_factor.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not two_factor or (not two_factor.get("totp_enabled") and not two_factor.get("sms_enabled")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled for this account"
        )
    
    # Determine method to use
    method = request.preferred_method
    if not method:
        # Default to TOTP if available, then SMS
        if two_factor.get("totp_enabled"):
            method = TwoFactorMethod.TOTP
        else:
            method = TwoFactorMethod.SMS
    
    # Validate requested method is enabled
    if method == TwoFactorMethod.TOTP and not two_factor.get("totp_enabled"):
        method = TwoFactorMethod.SMS
    if method == TwoFactorMethod.SMS and not two_factor.get("sms_enabled"):
        method = TwoFactorMethod.TOTP
    
    # Create challenge
    challenge = TwoFactorChallenge(
        user_id=current_user["id"],
        action=request.action,
        method=method,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5)
    )
    
    # For SMS, send the code
    phone_last_four = None
    if method == TwoFactorMethod.SMS:
        phone = two_factor.get("sms_phone")
        if phone and twilio_client and TWILIO_VERIFY_SERVICE:
            try:
                twilio_client.verify.services(TWILIO_VERIFY_SERVICE) \
                    .verifications.create(to=phone, channel="sms")
                phone_last_four = phone[-4:]
            except Exception as e:
                logger.error(f"Failed to send SMS challenge: {e}")
                # Fall back to TOTP if available
                if two_factor.get("totp_enabled"):
                    method = TwoFactorMethod.TOTP
                    challenge.method = method
                else:
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to send verification code"
                    )
    
    # Store challenge
    await db.two_factor_challenges.insert_one(challenge.model_dump())
    
    return TwoFactorChallengeResponse(
        challenge_id=challenge.id,
        method=method,
        expires_at=challenge.expires_at,
        phone_last_four=phone_last_four
    )


@router.post("/validate")
async def validate_2fa_challenge(
    request: TwoFactorValidateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Validate a 2FA challenge"""
    db = get_database()
    
    # Get challenge
    challenge = await db.two_factor_challenges.find_one({
        "id": request.challenge_id,
        "user_id": current_user["id"],
        "verified": False
    }, {"_id": 0})
    
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found or already used"
        )
    
    # Check expiry
    expires_at = challenge["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge has expired"
        )
    
    # Get 2FA config
    two_factor = await db.two_factor.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not two_factor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not configured"
        )
    
    code_valid = False
    
    # Verify based on method
    if challenge["method"] == TwoFactorMethod.TOTP:
        if two_factor.get("totp_secret"):
            totp = pyotp.TOTP(two_factor["totp_secret"])
            code_valid = totp.verify(request.code, valid_window=1)
    elif challenge["method"] == TwoFactorMethod.SMS:
        if twilio_client and TWILIO_VERIFY_SERVICE and two_factor.get("sms_phone"):
            try:
                check = twilio_client.verify.services(TWILIO_VERIFY_SERVICE) \
                    .verification_checks.create(to=two_factor["sms_phone"], code=request.code)
                code_valid = check.status == "approved"
            except Exception as e:
                logger.error(f"SMS verification check failed: {e}")
    
    # Check backup codes as fallback
    if not code_valid:
        hashed = hash_code(request.code.upper())
        if hashed in two_factor.get("backup_codes", []):
            code_valid = True
            await db.two_factor.update_one(
                {"user_id": current_user["id"]},
                {"$pull": {"backup_codes": hashed}}
            )
    
    if not code_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )
    
    # Mark challenge as verified
    await db.two_factor_challenges.update_one(
        {"id": request.challenge_id},
        {"$set": {"verified": True}}
    )
    
    return {"success": True, "action": challenge["action"]}


@router.post("/resend-sms")
async def resend_sms_code(current_user: dict = Depends(get_current_user)):
    """Resend SMS verification code"""
    db = get_database()
    
    two_factor = await db.two_factor.find_one({"user_id": current_user["id"]}, {"_id": 0})
    
    if not two_factor or not two_factor.get("sms_phone"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No phone number configured"
        )
    
    if not twilio_client or not TWILIO_VERIFY_SERVICE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SMS service not configured"
        )
    
    try:
        twilio_client.verify.services(TWILIO_VERIFY_SERVICE) \
            .verifications.create(to=two_factor["sms_phone"], channel="sms")
        
        return {"success": True, "message": "Verification code sent"}
    except Exception as e:
        logger.error(f"Failed to resend SMS: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code"
        )
