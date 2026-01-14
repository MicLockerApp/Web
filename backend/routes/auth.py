from fastapi import APIRouter, HTTPException, status, Depends
from datetime import timedelta
from models.user import (
    UserCreate, UserResponse, UserInDB, Token,
    UserCategoryUpdate, USER_CATEGORIES
)
from services.auth import (
    get_password_hash, verify_password, create_access_token, get_current_user
)
from database import get_database
from config import settings
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
    user_count = await db.users.count_documents({})
    is_first_user = user_count == 0
    
    # Create user
    user = UserInDB(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        is_admin=is_first_user,
        is_first_user=is_first_user,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    await db.users.insert_one(user.model_dump())
    
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
    
    if not verify_password(password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["id"]},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes)
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
    
    update_data = {
        "category": category_data.category,
        "profile_completed": True,
        "updated_at": datetime.utcnow()
    }
    
    # Add category-specific data
    if category_data.category == "musician":
        if category_data.genre:
            update_data["genre"] = category_data.genre
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
        RECORDING_STUDIO_OFFERINGS, MUSIC_GENRES
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
        }
    }
