"""
Gig Board Models for MicLocker
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


# Gig Types - "services" replaces "can_provide"
GIG_TYPES = ["looking_for", "services"]

# Main Categories (expanded with Comedians and Actors)
GIG_CATEGORIES = ["musician", "audio_engineer", "recording_studio", "venue", "merchant", "comedian", "actor"]

# Music Genres for filtering
MUSIC_GENRES = [
    "Alternative", "Blues", "Classical", "Country", "Electronic", "Folk",
    "Funk", "Gospel", "Hip-Hop", "Indie", "Jazz", "Latin", "Metal",
    "Pop", "Punk", "R&B", "Reggae", "Rock", "Soul", "World"
]

# Subcategories per main category
GIG_SUBCATEGORIES = {
    "musician": [
        "Accordion", "Acoustic Guitar", "Bagpipe", "Banjo", "Bass Electric", "Bass Fretless",
        "Bass Upright", "Bassoon", "Beat Makers", "Cello", "Clarinet", "Classical Guitar",
        "Composer Orchestral", "Dobro", "Electric Guitar", "Fiddle", "Flutes", "French Horn",
        "Harmonica", "Harp", "Horns", "Keyboards Synths", "Mandolin", "Oboe", "Pedal Steel",
        "Percussion", "Piano", "Rapper", "Saxophone", "Singer Female", "Singer Male",
        "Timpani", "Trombone", "Trumpet", "Tuba", "Ukulele", "Viola", "Violin"
    ],
    "audio_engineer": [
        "Boom Operator", "Dialogue Editing", "Dolby Atmos & Immersive Audio",
        "Editing", "Film Composers", "Full Instrumental Productions", "Game Audio",
        "Ghost Producers", "Live Drum Tracks", "Live Sound", "Mastering Engineers",
        "Mixing Engineers", "Podcast Editing & Mastering", "Pop Rock Arranger",
        "Post Editing", "Post Mixing", "Producers", "Production Sound Mixer",
        "Programmed Drums", "Remixing", "Restoration", "Session Conversion",
        "Songwriter Lyrics", "Songwriter Music", "Sound Design", "String Arranger",
        "Surround 5.1 Mixing", "Time Alignment Quantizing", "Top Line Writer (Vocal Melody)",
        "Track Minus Top Line", "Vocal Comping", "Vocal Tuning", "You Tube Cover Recording"
    ],
    "recording_studio": [
        "Beat Makers", "Boom Operator", "Composer Orchestral", "Dialogue Editing",
        "Dolby Atmos & Immersive Audio", "Editing", "Film Composers",
        "Full Instrumental Productions", "Game Audio", "Ghost Producers",
        "Live Drum Tracks", "Mastering Engineers", "Mixing Engineers",
        "Podcast Editing & Mastering", "Pop Rock Arranger", "Post Editing",
        "Post Mixing", "Producers", "Production Sound Mixer", "Programmed Drums",
        "Recording Studios", "Rehearsal Rooms", "Remixing", "Restoration",
        "Session Conversion", "Session Dj", "Sound Design", "String Arranger",
        "String Section", "Surround 5.1 Mixing", "Time Alignment Quantizing",
        "Vocal Comping", "Vocal Tuning"
    ],
    "venue": [
        "Concert Hall", "Club", "Bar", "Theater", "Arena", "Stadium",
        "Festival Grounds", "Church", "Community Center", "Private Event Space",
        "Outdoor Amphitheater", "Rooftop", "Warehouse", "Gallery", "Restaurant",
        "Hotel Ballroom", "Conference Center", "Recording Live Venue"
    ],
    "merchant": [
        "Shirts", "Pants", "Shorts", "Jackets", "Hoodies", "Hats", "Caps",
        "Shoes", "Boots", "Socks", "Accessories", "Bags", "Backpacks",
        "Vinyl Records", "CDs", "Posters", "Stickers", "Patches", "Pins",
        "Guitar Picks", "Drumsticks", "Straps", "Cases", "Stands",
        "Cables", "Strings", "Picks", "Capos", "Tuners", "Other Merchandise"
    ],
    "comedian": [
        "Stand-Up Comedy", "Improv Comedy", "Sketch Comedy", "Musical Comedy",
        "Observational Comedy", "Political Comedy", "Dark Comedy", "Physical Comedy",
        "Prop Comedy", "Character Comedy", "Roast Comedy", "Clean Comedy",
        "Adult Comedy", "Comedy Writing", "Comedy MC/Host", "Open Mic",
        "Corporate Comedy", "Comedy Podcaster", "Comedy Actor", "Comedy Duo/Group"
    ],
    "actor": [
        "Film Actor", "TV Actor", "Theater Actor", "Voice Actor", "Commercial Actor",
        "Background Actor", "Stunt Performer", "Motion Capture", "Child Actor",
        "Method Actor", "Improv Actor", "Musical Theater", "Dramatic Actor",
        "Comedy Actor", "Action Actor", "Voice Over Artist", "Narrator",
        "Audiobook Narrator", "Character Actor", "Leading Actor", "Supporting Actor",
        "Casting Director", "Acting Coach", "Dialect Coach", "Scene Partner"
    ]
}

# Placeholder images from Pexels for gigs without media
PLACEHOLDER_IMAGES = [
    "https://images.pexels.com/photos/4513456/pexels-photo-4513456.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/8040842/pexels-photo-8040842.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/228842/pexels-photo-228842.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/9010089/pexels-photo-9010089.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/8040897/pexels-photo-8040897.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/3984815/pexels-photo-3984815.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/3984817/pexels-photo-3984817.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/8197259/pexels-photo-8197259.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/7095737/pexels-photo-7095737.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/8044176/pexels-photo-8044176.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/8512406/pexels-photo-8512406.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/3984818/pexels-photo-3984818.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/15266259/pexels-photo-15266259.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/8197363/pexels-photo-8197363.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/12216201/pexels-photo-12216201.jpeg?auto=compress&cs=tinysrgb&w=600"
]


class GigMedia(BaseModel):
    url: str
    media_type: str = "image"  # "image" or "video"
    thumbnail_url: Optional[str] = None


class GigSocialLinks(BaseModel):
    website: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    twitter: Optional[str] = None
    youtube: Optional[str] = None
    tiktok: Optional[str] = None
    soundcloud: Optional[str] = None
    spotify: Optional[str] = None
    bandcamp: Optional[str] = None
    linkedin: Optional[str] = None


class GigCreate(BaseModel):
    gig_type: str = Field(..., description="Either 'looking_for' or 'services'")
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20, max_length=5000)
    category: str = Field(..., description="Main category")
    subcategories: List[str] = Field(default=[], description="Subcategories within the main category")
    genres: List[str] = Field(default=[], description="Music genres (optional)")
    media: List[GigMedia] = Field(default=[], max_length=10)
    social_links: Optional[GigSocialLinks] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    location: Optional[str] = None
    budget_range: Optional[str] = None  # e.g., "$100-500", "Negotiable", etc.


class GigUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=20, max_length=5000)
    category: Optional[str] = None
    subcategories: Optional[List[str]] = None
    genres: Optional[List[str]] = None
    media: Optional[List[GigMedia]] = None
    social_links: Optional[GigSocialLinks] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    location: Optional[str] = None
    budget_range: Optional[str] = None
    is_active: Optional[bool] = None


class GigInDB(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    user_profile_image: Optional[str] = None
    gig_type: str
    title: str
    description: str
    category: str
    subcategories: List[str] = []
    genres: List[str] = []
    media: List[GigMedia] = []
    social_links: Optional[GigSocialLinks] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    location: Optional[str] = None
    budget_range: Optional[str] = None
    is_active: bool = True
    view_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GigResponse(BaseModel):
    id: str
    user_id: str
    username: str
    user_profile_image: Optional[str] = None
    gig_type: str
    title: str
    description: str
    category: str
    subcategories: List[str] = []
    genres: List[str] = []
    media: List[dict] = []
    social_links: Optional[dict] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    location: Optional[str] = None
    budget_range: Optional[str] = None
    is_active: bool = True
    view_count: int = 0
    created_at: str
    updated_at: str
