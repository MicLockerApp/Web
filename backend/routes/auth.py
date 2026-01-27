from fastapi import APIRouter, HTTPException, status, Depends, Request
from datetime import timedelta, datetime
from pydantic import BaseModel, EmailStr
from models.user import (
    UserCreate, UserResponse, UserInDB, Token,
    UserCategoryUpdate, USER_CATEGORIES,
    PasswordResetRequest, PasswordResetVerify, PasswordResetCode
)
from services.auth import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from database import get_database
from config import settings
from analytics.services.event_emitter import emit_event, EventTypes, ActorType
import random
import string
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

def generate_reset_code():
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))


# ============================================
# Email Verification Models
# ============================================

class EmailVerificationRequest(BaseModel):
    """Request to start email verification during signup"""
    username: str
    email: EmailStr
    password: str
    first_name: str
    last_name: str

class EmailVerificationVerify(BaseModel):
    """Request to verify email code and complete registration"""
    email: EmailStr
    code: str

class ResendVerificationRequest(BaseModel):
    """Request to resend verification code"""
    email: EmailStr


# ============================================
# Email Verification Endpoints (Signup Flow)
# ============================================

@router.post("/register/send-verification")
async def send_registration_verification(data: EmailVerificationRequest):
    """
    Step 1 of registration: Validate credentials and send verification email
    
    This stores the pending registration temporarily and sends a verification code.
    The user must verify their email before the account is created.
    """
    from services.email import send_email_verification_code
    
    db = get_database()
    
    # Validate username
    if len(data.username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters"
        )
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters"
        )
    
    # Check if username already exists in users
    existing_user = await db.users.find_one({"username": data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Check if email already exists in users
    existing_email = await db.users.find_one({"email": data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username is taken in pending registrations (by another pending user)
    existing_pending_username = await db.pending_registrations.find_one({
        "username": data.username,
        "email": {"$ne": data.email}
    })
    if existing_pending_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Generate verification code
    code = generate_reset_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)  # Code valid for 15 minutes
    
    # Delete any existing pending registration for this email
    await db.pending_registrations.delete_many({"email": data.email})
    
    # Store pending registration with hashed password
    pending_registration = {
        "id": str(uuid.uuid4()),
        "username": data.username,
        "email": data.email,
        "first_name": data.first_name,
        "last_name": data.last_name,
        "hashed_password": get_password_hash(data.password),
        "verification_code": code,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    }
    await db.pending_registrations.insert_one(pending_registration)
    
    # Create TTL index for automatic cleanup (if not exists)
    try:
        await db.pending_registrations.create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="ttl_pending_registrations"
        )
    except Exception:
        pass  # Index may already exist
    
    # Send verification email
    email_sent = await send_email_verification_code(data.email, code)
    
    if email_sent:
        logger.info(f"Email verification code sent to {data.email}")
    else:
        # Fallback: log the code if email fails
        logger.warning(f"[FALLBACK] Email verification code for {data.email}: {code}")
    
    return {
        "message": "Verification code sent to your email",
        "email": data.email
    }


@router.post("/register/verify-email")
async def verify_registration_email(data: EmailVerificationVerify):
    """
    Step 2 of registration: Verify email code and create user account
    
    Once the code is verified, the user account is created and a token is returned.
    """
    db = get_database()
    
    # Find the pending registration
    pending = await db.pending_registrations.find_one({
        "email": data.email,
        "verification_code": data.code
    })
    
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Check if code has expired
    if datetime.utcnow() > pending["expires_at"]:
        # Clean up expired pending registration
        await db.pending_registrations.delete_one({"id": pending["id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )
    
    # Double-check username and email are still available
    existing_user = await db.users.find_one({"username": pending["username"]})
    if existing_user:
        await db.pending_registrations.delete_one({"id": pending["id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username was taken while verifying. Please start over."
        )
    
    existing_email = await db.users.find_one({"email": pending["email"]})
    if existing_email:
        await db.pending_registrations.delete_one({"id": pending["id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email was registered while verifying. Please start over."
        )
    
    # Count users for promo eligibility
    user_count = await db.users.count_documents({"is_employee": {"$ne": True}})
    is_first_user = user_count == 0
    has_lifetime_free_fees = user_count < 300
    is_gold_member = user_count < 300  # First 300 users get Gold Member badge
    signup_number = user_count + 1
    
    # Create the actual user account - all new users are normal "user" role
    user = UserInDB(
        username=pending["username"],
        email=pending["email"],
        first_name=pending.get("first_name"),
        last_name=pending.get("last_name"),
        hashed_password=pending["hashed_password"],
        email_verified=True,
        role="user",  # All new signups are normal users
        is_admin=False,  # Only owners set this manually
        is_first_user=is_first_user,
        has_lifetime_free_fees=has_lifetime_free_fees,
        is_gold_member=is_gold_member,
        signup_number=signup_number,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Delete the pending registration
    await db.pending_registrations.delete_one({"id": pending["id"]})
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    # Emit analytics event for user registration
    emit_event(
        EventTypes.USER_REGISTERED,
        actor_type=ActorType.BUYER,
        actor_id=user.id,
        actor_username=user.username,
        metadata={
            "category": None,  # Will be set in complete-profile
            "has_lifetime_free_fees": has_lifetime_free_fees,
            "is_gold_member": is_gold_member,
            "signup_number": signup_number,
            "user_number": user_count + 1,
            "is_first_user": is_first_user,
            "email_verified": True
        }
    )
    
    logger.info(f"User {user.username} registered with verified email {user.email}")
    
    return {
        "message": "Email verified successfully! Account created.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(**user.model_dump())
    }


@router.post("/register/resend-verification")
async def resend_registration_verification(data: ResendVerificationRequest):
    """Resend verification code for pending registration"""
    from services.email import send_email_verification_code
    
    db = get_database()
    
    # Find existing pending registration
    pending = await db.pending_registrations.find_one({"email": data.email})
    
    if not pending:
        # Don't reveal if email exists or not for security
        return {
            "message": "If a pending registration exists for this email, a new code has been sent.",
            "email": data.email
        }
    
    # Generate new code
    code = generate_reset_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Update the pending registration with new code
    await db.pending_registrations.update_one(
        {"id": pending["id"]},
        {"$set": {
            "verification_code": code,
            "expires_at": expires_at
        }}
    )
    
    # Send new verification email
    email_sent = await send_email_verification_code(data.email, code)
    
    if email_sent:
        logger.info(f"Resent email verification code to {data.email}")
    else:
        logger.warning(f"[FALLBACK] Resent email verification code for {data.email}: {code}")
    
    return {
        "message": "If a pending registration exists for this email, a new code has been sent.",
        "email": data.email
    }


@router.get("/register/check-verification")
async def check_verification_code(email: str, code: str):
    """Check if a verification code is valid without using it"""
    db = get_database()
    
    pending = await db.pending_registrations.find_one({
        "email": email,
        "verification_code": code
    })
    
    if not pending:
        return {"valid": False, "message": "Invalid verification code"}
    
    if datetime.utcnow() > pending["expires_at"]:
        return {"valid": False, "message": "Code has expired"}
    
    return {"valid": True, "message": "Code is valid"}


# ============================================
# Original Registration (kept for backwards compatibility)
# ============================================

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    db = get_database()
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Check if email exists
    existing_email = await db.users.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if this is the first user (will be admin)
    # Count only regular users (not employees) for promo eligibility
    user_count = await db.users.count_documents({"is_employee": {"$ne": True}})
    is_first_user = user_count == 0
    
    # First 300 users get lifetime 0% platform fees and Gold Member badge
    has_lifetime_free_fees = user_count < 300
    is_gold_member = user_count < 300
    signup_number = user_count + 1
    
    # Create user
    user = UserInDB(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        is_admin=is_first_user,
        is_first_user=is_first_user,
        has_lifetime_free_fees=has_lifetime_free_fees,
        is_gold_member=is_gold_member,
        signup_number=signup_number,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Emit analytics event for user registration
    emit_event(
        EventTypes.USER_REGISTERED,
        actor_type=ActorType.BUYER,
        actor_id=user.id,
        actor_username=user.username,
        metadata={
            "category": None,  # Will be set in complete-profile
            "has_lifetime_free_fees": has_lifetime_free_fees,
            "is_gold_member": is_gold_member,
            "signup_number": signup_number,
            "user_number": user_count + 1,
            "is_first_user": is_first_user
        }
    )
    
    return UserResponse(**user.model_dump())

@router.post("/login", response_model=Token)
async def login(username: str, password: str):
    """Login user and return JWT token"""
    db = get_database()
    
    # Find user by username or email
    user = await db.users.find_one({
        "$or": [{"username": username}, {"email": username}]
    })
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Check if employee needs to set up password
    if user.get("password_setup_required") and not user.get("hashed_password"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please check your email to set up your password before logging in."
        )
    
    if not user.get("hashed_password") or not verify_password(password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["id"]},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
    )
    
    # Emit analytics event for user login
    emit_event(
        EventTypes.USER_LOGGED_IN,
        actor_type=ActorType.BUYER if not user.get("is_admin") else ActorType.ADMIN,
        actor_id=user["id"],
        actor_username=user.get("username"),
        metadata={
            "category": user.get("category"),
            "has_lifetime_free_fees": user.get("has_lifetime_free_fees", False),
            "is_gold_member": user.get("is_gold_member", False)
        }
    )
    
    return Token(access_token=access_token, token_type="bearer")

@router.post("/login/form", response_model=Token)
async def login_form(username: str = None, password: str = None):
    """Login via form data"""
    return await login(username, password)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    return UserResponse(**current_user)

@router.post("/complete-profile", response_model=UserResponse)
async def complete_profile(
    category_data: UserCategoryUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Complete user profile with category selection"""
    db = get_database()
    
    if category_data.category not in USER_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {USER_CATEGORIES}"
        )
    
    # Validate sub-categories if provided
    if category_data.sub_categories:
        for sub_cat in category_data.sub_categories:
            if sub_cat not in USER_CATEGORIES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid sub-category: {sub_cat}. Must be one of: {USER_CATEGORIES}"
                )
    
    update_data = {
        "category": category_data.category,
        "profile_completed": True,
        "updated_at": datetime.utcnow()
    }
    
    # Add sub-categories if provided
    if category_data.sub_categories:
        update_data["sub_categories"] = category_data.sub_categories
    
    # Add category-specific data
    if category_data.category == "musician":
        if category_data.genre:
            update_data["genre"] = category_data.genre
        if category_data.genres:
            update_data["genres"] = category_data.genres
        if category_data.instruments:
            update_data["instruments"] = category_data.instruments
    elif category_data.category == "audio_engineer":
        if category_data.specializations:
            update_data["specializations"] = category_data.specializations
    elif category_data.category == "recording_studio":
        if category_data.studio_offerings:
            update_data["studio_offerings"] = category_data.studio_offerings
    elif category_data.category == "venue":
        if category_data.venue_name:
            update_data["venue_name"] = category_data.venue_name
        if category_data.venue_city:
            update_data["venue_city"] = category_data.venue_city
        if category_data.venue_capacity:
            update_data["venue_capacity"] = category_data.venue_capacity
    elif category_data.category == "merchant":
        if category_data.merchant_products:
            update_data["merchant_products"] = category_data.merchant_products
        if category_data.business_name:
            update_data["business_name"] = category_data.business_name
    
    # Add contact info if provided
    if category_data.phone:
        update_data["phone"] = category_data.phone
    if category_data.shipping_address:
        update_data["shipping_address"] = category_data.shipping_address
    if category_data.physical_address:
        update_data["physical_address"] = category_data.physical_address
    if category_data.same_as_mailing is not None:
        update_data["same_as_mailing"] = category_data.same_as_mailing
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"id": current_user["id"]})
    return UserResponse(**updated_user)

@router.get("/categories")
async def get_categories():
    """Get available user categories and their options"""
    from models.user import (
        MUSICIAN_INSTRUMENTS, AUDIO_ENGINEER_SPECS,
        RECORDING_STUDIO_OFFERINGS, MUSIC_GENRES, MERCHANT_PRODUCT_TYPES,
        COMEDIAN_SPECIALTIES, ACTOR_SPECIALTIES
    )
    
    return {
        "categories": USER_CATEGORIES,
        "musician_options": {
            "genres": MUSIC_GENRES,
            "instruments": MUSICIAN_INSTRUMENTS
        },
        "audio_engineer_options": {
            "specializations": AUDIO_ENGINEER_SPECS
        },
        "recording_studio_options": {
            "offerings": RECORDING_STUDIO_OFFERINGS
        },
        "merchant_options": {
            "product_types": MERCHANT_PRODUCT_TYPES
        },
        "comedian_options": {
            "specialties": COMEDIAN_SPECIALTIES
        },
        "actor_options": {
            "specialties": ACTOR_SPECIALTIES
        }
    }



@router.post("/forgot-password")
async def request_password_reset(data: PasswordResetRequest):
    """Request a password reset code - sends to email if exists"""
    from services.email import send_password_reset_email
    
    db = get_database()
    
    # Check if email exists (don't reveal if it doesn't for security)
    user = await db.users.find_one({"email": data.email})
    
    if user:
        # Generate a 6-digit code
        code = generate_reset_code()
        expires_at = datetime.utcnow() + timedelta(minutes=15)  # Code valid for 15 minutes
        
        # Delete any existing codes for this email
        await db.password_reset_codes.delete_many({"email": data.email})
        
        # Store the reset code
        reset_code = PasswordResetCode(
            email=data.email,
            code=code,
            expires_at=expires_at
        )
        await db.password_reset_codes.insert_one(reset_code.model_dump())
        
        # Send email via AWS SES
        email_sent = await send_password_reset_email(data.email, code)
        
        if email_sent:
            logger.info(f"Password reset email sent to {data.email}")
        else:
            # Fallback: log the code if email fails
            logger.warning(f"[FALLBACK] Password reset code for {data.email}: {code}")
    
    # Always return success to prevent email enumeration attacks
    return {
        "message": "If an account with that email exists, a verification code has been sent.",
        "email": data.email
    }

@router.post("/verify-reset-code")
async def verify_reset_code(data: PasswordResetVerify):
    """Verify reset code and change password"""
    db = get_database()
    
    # Find the reset code
    reset_record = await db.password_reset_codes.find_one({
        "email": data.email,
        "code": data.code,
        "used": False
    })
    
    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Check if code has expired
    if datetime.utcnow() > reset_record["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )
    
    # Find the user
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update password
    hashed_password = get_password_hash(data.new_password)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "hashed_password": hashed_password,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Mark code as used
    await db.password_reset_codes.update_one(
        {"id": reset_record["id"]},
        {"$set": {"used": True}}
    )
    
    # Delete all reset codes for this email
    await db.password_reset_codes.delete_many({"email": data.email})
    
    return {"message": "Password has been reset successfully. You can now log in with your new password."}

@router.get("/check-reset-code")
async def check_reset_code(email: str, code: str):
    """Check if a reset code is valid without using it"""
    db = get_database()
    
    reset_record = await db.password_reset_codes.find_one({
        "email": email,
        "code": code,
        "used": False
    })
    
    if not reset_record:
        return {"valid": False, "message": "Invalid verification code"}
    
    if datetime.utcnow() > reset_record["expires_at"]:
        return {"valid": False, "message": "Code has expired"}
    
    return {"valid": True, "message": "Code is valid"}


# Employee password setup via token
from pydantic import Field

class EmployeePasswordSetup(PasswordResetVerify):
    """Used for employee password setup via email token"""
    token: str = Field(..., description="Setup token from email link")


@router.post("/setup-employee-password")
async def setup_employee_password(email: str, token: str, new_password: str):
    """Set up password for new employee account using token from email"""
    db = get_database()
    
    # Validate password
    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters"
        )
    
    # Find the user with this email and token
    user = await db.users.find_one({
        "email": email,
        "is_employee": True
    })
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired setup link"
        )
    
    # Check for valid token in password_reset_codes array
    valid_token = None
    password_reset_codes = user.get("password_reset_codes", [])
    
    for reset_code in password_reset_codes:
        if reset_code.get("code") == token and reset_code.get("is_setup"):
            # Check if expired
            expires_at = reset_code.get("expires_at")
            if isinstance(expires_at, datetime) and datetime.utcnow() > expires_at:
                continue
            if reset_code.get("used"):
                continue
            valid_token = reset_code
            break
    
    if not valid_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired setup link. Please contact your administrator to resend the invitation."
        )
    
    # Hash the password and update user
    hashed_password = get_password_hash(new_password)
    
    # Mark all setup tokens as used and update password
    updated_codes = []
    for code in password_reset_codes:
        if code.get("code") == token:
            code["used"] = True
        updated_codes.append(code)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "hashed_password": hashed_password,
            "password_setup_required": False,
            "password_reset_codes": updated_codes,
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"Employee {user['username']} ({email}) set up their password successfully")
    
    return {
        "message": "Password set successfully! You can now log in.",
        "username": user["username"]
    }


@router.get("/verify-setup-token")
async def verify_setup_token(email: str, token: str):
    """Verify if a password setup token is valid"""
    db = get_database()
    
    user = await db.users.find_one({
        "email": email,
        "is_employee": True
    })
    
    if not user:
        return {"valid": False, "message": "Invalid setup link"}
    
    # Check for valid token
    password_reset_codes = user.get("password_reset_codes", [])
    
    for reset_code in password_reset_codes:
        if reset_code.get("code") == token and reset_code.get("is_setup"):
            expires_at = reset_code.get("expires_at")
            if isinstance(expires_at, datetime) and datetime.utcnow() > expires_at:
                return {"valid": False, "message": "Setup link has expired. Please contact your administrator."}
            if reset_code.get("used"):
                return {"valid": False, "message": "This setup link has already been used."}
            return {
                "valid": True, 
                "message": "Setup link is valid",
                "username": user.get("username"),
                "email": user.get("email"),
                "role": user.get("employee_role")
            }
    
    return {"valid": False, "message": "Invalid setup link"}


# ============================================
# Account Settings (Change Username/Email/Password)
# ============================================

class ChangeUsernameRequest(BaseModel):
    """Request to change username"""
    new_username: str
    password: str  # Current password for verification

class ChangeEmailRequest(BaseModel):
    """Request to initiate email change - sends verification to new email"""
    new_email: EmailStr
    password: str  # Current password for verification

class VerifyEmailChangeRequest(BaseModel):
    """Request to verify new email and complete change"""
    code: str

class ChangePasswordRequest(BaseModel):
    """Request to change password"""
    current_password: str
    new_password: str


@router.post("/account/change-username")
async def change_username(
    data: ChangeUsernameRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change username - requires password verification"""
    db = get_database()
    
    # Validate new username length
    if len(data.new_username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters"
        )
    
    # Check if username is the same
    if data.new_username == current_user.get("username"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New username must be different from current username"
        )
    
    # Verify password
    if not verify_password(data.password, current_user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Check if new username is taken
    existing = await db.users.find_one({"username": data.new_username})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Update username
    old_username = current_user.get("username")
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "username": data.new_username,
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"User changed username from '{old_username}' to '{data.new_username}'")
    
    return {
        "message": "Username changed successfully",
        "new_username": data.new_username
    }


@router.post("/account/change-email/request")
async def request_email_change(
    data: ChangeEmailRequest,
    current_user: dict = Depends(get_current_user)
):
    """Request email change - sends verification code to NEW email"""
    from services.email import send_email_verification_code
    
    db = get_database()
    
    # Check if email is the same
    if data.new_email == current_user.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New email must be different from current email"
        )
    
    # Verify password
    if not verify_password(data.password, current_user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Check if new email is already registered
    existing = await db.users.find_one({"email": data.new_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered to another account"
        )
    
    # Generate verification code
    code = generate_reset_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Store pending email change
    await db.pending_email_changes.delete_many({"user_id": current_user["id"]})
    await db.pending_email_changes.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "current_email": current_user.get("email"),
        "new_email": data.new_email,
        "verification_code": code,
        "expires_at": expires_at,
        "created_at": datetime.utcnow()
    })
    
    # Create TTL index for automatic cleanup
    try:
        await db.pending_email_changes.create_index(
            "expires_at",
            expireAfterSeconds=0,
            name="ttl_pending_email_changes"
        )
    except Exception:
        pass
    
    # Send verification email to new address
    email_sent = await send_email_verification_code(data.new_email, code)
    
    if email_sent:
        logger.info(f"Email change verification sent to {data.new_email} for user {current_user['id']}")
    else:
        logger.warning(f"[FALLBACK] Email change verification code for {data.new_email}: {code}")
    
    return {
        "message": "Verification code sent to your new email address",
        "new_email": data.new_email
    }


@router.post("/account/change-email/verify")
async def verify_email_change(
    data: VerifyEmailChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Verify code and complete email change"""
    db = get_database()
    
    # Find pending email change
    pending = await db.pending_email_changes.find_one({
        "user_id": current_user["id"],
        "verification_code": data.code
    })
    
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Check if expired
    if datetime.utcnow() > pending["expires_at"]:
        await db.pending_email_changes.delete_one({"id": pending["id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )
    
    # Double-check new email is still available
    existing = await db.users.find_one({"email": pending["new_email"]})
    if existing:
        await db.pending_email_changes.delete_one({"id": pending["id"]})
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email was registered by another account. Please try a different email."
        )
    
    # Update user email
    old_email = current_user.get("email")
    new_email = pending["new_email"]
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "email": new_email,
            "email_verified": True,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Delete pending email change
    await db.pending_email_changes.delete_one({"id": pending["id"]})
    
    logger.info(f"User {current_user['id']} changed email from '{old_email}' to '{new_email}'")
    
    return {
        "message": "Email changed successfully",
        "new_email": new_email
    }


@router.post("/account/change-email/resend")
async def resend_email_change_code(current_user: dict = Depends(get_current_user)):
    """Resend verification code for pending email change"""
    from services.email import send_email_verification_code
    
    db = get_database()
    
    # Find pending email change
    pending = await db.pending_email_changes.find_one({"user_id": current_user["id"]})
    
    if not pending:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending email change found. Please start a new request."
        )
    
    # Generate new code
    code = generate_reset_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    await db.pending_email_changes.update_one(
        {"id": pending["id"]},
        {"$set": {
            "verification_code": code,
            "expires_at": expires_at
        }}
    )
    
    # Send verification email
    email_sent = await send_email_verification_code(pending["new_email"], code)
    
    if email_sent:
        logger.info(f"Resent email change verification to {pending['new_email']}")
    else:
        logger.warning(f"[FALLBACK] Resent email change verification code: {code}")
    
    return {
        "message": "Verification code resent to your new email address",
        "new_email": pending["new_email"]
    }


@router.get("/account/pending-email-change")
async def get_pending_email_change(current_user: dict = Depends(get_current_user)):
    """Check if there's a pending email change"""
    db = get_database()
    
    pending = await db.pending_email_changes.find_one({"user_id": current_user["id"]})
    
    if not pending:
        return {"has_pending": False}
    
    # Check if expired
    if datetime.utcnow() > pending["expires_at"]:
        await db.pending_email_changes.delete_one({"id": pending["id"]})
        return {"has_pending": False}
    
    return {
        "has_pending": True,
        "new_email": pending["new_email"],
        "expires_at": pending["expires_at"].isoformat()
    }


@router.delete("/account/pending-email-change")
async def cancel_email_change(current_user: dict = Depends(get_current_user)):
    """Cancel pending email change"""
    db = get_database()
    
    result = await db.pending_email_changes.delete_many({"user_id": current_user["id"]})
    
    return {
        "message": "Email change request cancelled" if result.deleted_count > 0 else "No pending email change found"
    }


@router.post("/account/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change password - requires current password verification"""
    db = get_database()
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )
    
    # Verify current password
    if not verify_password(data.current_password, current_user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )
    
    # Check if new password is same as current
    if verify_password(data.new_password, current_user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Update password
    hashed_password = get_password_hash(data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "hashed_password": hashed_password,
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"User {current_user['id']} changed their password")
    
    return {"message": "Password changed successfully"}