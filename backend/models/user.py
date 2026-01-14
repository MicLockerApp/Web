from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

# User Categories
USER_CATEGORIES = ["musician", "audio_engineer", "recording_studio", "venue"]

# Musician Instruments
MUSICIAN_INSTRUMENTS = [
    "Accordion", "Acoustic Guitar", "Bagpipe", "Banjo", "Bass Electric", "Bass Fretless",
    "Bass Upright", "Bassoon", "Beat Makers", "Cello", "Clarinet", "Classical Guitar",
    "Composer Orchestral", "Dobro", "Electric Guitar", "Fiddle", "Flutes", "French Horn",
    "Harmonica", "Harp", "Horns", "Keyboards Synths", "Mandolin", "Oboe", "Pedal Steel",
    "Percussion", "Piano", "Rapper", "Saxophone", "Singer Female", "Singer Male",
    "Timpani", "Trombone", "Trumpet", "Tuba", "Ukulele", "Viola", "Violin"
]

# Audio Engineer Specializations
AUDIO_ENGINEER_SPECS = [
    "Boom Operator", "Cello", "Dialogue Editing", "Dolby Atmos & Immersive Audio",
    "Editing", "Film Composers", "Full Instrumental Productions", "Game Audio",
    "Ghost Producers", "Live Drum Tracks", "Live Sound", "Mastering Engineers",
    "Mixing Engineers", "Podcast Editing & Mastering", "Pop Rock Arranger",
    "Post Editing", "Post Mixing", "Producers", "Production Sound Mixer",
    "Programmed Drums", "Remixing", "Restoration", "Session Conversion",
    "Songwriter Lyrics", "Songwriter Music", "Sound Design", "String Arranger",
    "Surround 5.1 Mixing", "Time Alignment Quantizing", "Top Line Writer (Vocal Melody)",
    "Track Minus Top Line", "Vocal Comping", "Vocal Tuning", "You Tube Cover Recording"
]

# Recording Studio Offerings
RECORDING_STUDIO_OFFERINGS = [
    "Beat Makers", "Boom Operator", "Composer Orchestral", "Dialogue Editing",
    "Dolby Atmos & Immersive Audio", "Editing", "Film Composers",
    "Full Instrumental Productions", "Game Audio", "Ghost Producers",
    "Live Drum Tracks", "Mastering Engineers", "Mixing Engineers",
    "Podcast Editing & Mastering", "Pop Rock Arranger", "Post Editing",
    "Post Mixing", "Producers", "Production Sound Mixer", "Programmed Drums",
    "Recording Studios", "Rehearsal Rooms", "Remixing", "Restoration",
    "Session Conversion", "Session Dj", "Singer Female", "Singer Male",
    "Songwriter Lyrics", "Songwriter Music", "Sound Design", "String Arranger",
    "String Section", "Surround 5.1 Mixing", "Time Alignment Quantizing",
    "Top Line Writer (Vocal Melody)", "Track Minus Top Line", "Vocal Comping",
    "Vocal Tuning", "You Tube Cover Recording"
]

# Music Genres
MUSIC_GENRES = [
    "Rock", "Pop", "Hip Hop", "R&B", "Jazz", "Blues", "Country", "Electronic",
    "Classical", "Folk", "Reggae", "Metal", "Punk", "Soul", "Funk", "Latin",
    "World Music", "Gospel", "Indie", "Alternative", "Other"
]

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserCategoryUpdate(BaseModel):
    category: str
    # Musician fields
    genre: Optional[str] = None
    instruments: Optional[List[str]] = None
    # Audio Engineer fields
    specializations: Optional[List[str]] = None
    # Recording Studio fields
    studio_offerings: Optional[List[str]] = None
    # Venue fields
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[str] = None

class UserProfileUpdate(BaseModel):
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    category: Optional[str] = None
    genre: Optional[str] = None
    instruments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    studio_offerings: Optional[List[str]] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[str] = None

class UserInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    hashed_password: str
    category: Optional[str] = None
    is_admin: bool = False
    is_first_user: bool = False
    profile_completed: bool = False
    
    # Profile fields
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    
    # Category-specific fields
    genre: Optional[str] = None
    instruments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    studio_offerings: Optional[List[str]] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[str] = None
    
    # Stats
    rating: float = 0.0
    review_count: int = 0
    total_sales: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    category: Optional[str] = None
    is_admin: bool = False
    profile_completed: bool = False
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    genre: Optional[str] = None
    instruments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    studio_offerings: Optional[List[str]] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    venue_capacity: Optional[str] = None
    rating: float = 0.0
    review_count: int = 0
    total_sales: int = 0
    created_at: datetime

class UserPublicProfile(BaseModel):
    id: str
    username: str
    category: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    profile_image: Optional[str] = None
    genre: Optional[str] = None
    instruments: Optional[List[str]] = None
    specializations: Optional[List[str]] = None
    studio_offerings: Optional[List[str]] = None
    venue_name: Optional[str] = None
    venue_city: Optional[str] = None
    rating: float = 0.0
    review_count: int = 0
    total_sales: int = 0
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
