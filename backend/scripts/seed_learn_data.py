"""
Seed script for Learn section - Creates channels, playlists, and videos across all categories
"""
import sys
import os
sys.path.insert(0, '/app/backend')

from pymongo import MongoClient
from datetime import datetime, timedelta
import uuid
import random

# Connect to MongoDB
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'miclocker_prod')  # Match the backend config
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Sample video URLs (using public domain videos)
SAMPLE_VIDEO_URLS = [
    "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
    "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_2mb.mp4",
    "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_5mb.mp4",
]

# Categories with their subcategories and content templates
CATEGORY_CONTENT = {
    "musician": {
        "subcategories": ["Guitar", "Piano", "Drums", "Bass", "Vocals", "Violin", "Saxophone"],
        "playlists": [
            {"title": "Guitar Mastery Course", "description": "Complete guitar training from beginner to advanced", "price": 49.99, "is_free": False},
            {"title": "Piano Fundamentals", "description": "Learn piano from scratch", "price": 39.99, "is_free": False},
            {"title": "Drum Techniques", "description": "Master essential drum patterns", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Basic Chord Progressions", "duration": 600, "is_free": True},
            {"title": "Fingerpicking Techniques", "duration": 720, "is_free": False, "price": 9.99},
            {"title": "Scale Patterns for Improvisation", "duration": 540, "is_free": True},
            {"title": "Music Theory Essentials", "duration": 900, "is_free": False, "price": 14.99},
            {"title": "Rhythm and Timing Exercises", "duration": 480, "is_free": True},
            {"title": "Stage Performance Tips", "duration": 660, "is_free": False, "price": 12.99},
            {"title": "Song Structure Analysis", "duration": 720, "is_free": True},
            {"title": "Ear Training Basics", "duration": 540, "is_free": False, "price": 7.99},
            {"title": "Playing with a Band", "duration": 600, "is_free": True},
            {"title": "Advanced Soloing Techniques", "duration": 840, "is_free": False, "price": 19.99},
        ]
    },
    "audio_engineer": {
        "subcategories": ["Mixing Engineers", "Mastering Engineers", "Live Sound", "Producers", "Sound Design"],
        "playlists": [
            {"title": "Professional Mixing Masterclass", "description": "Industry-standard mixing techniques", "price": 79.99, "is_free": False},
            {"title": "Mastering Fundamentals", "description": "Complete mastering workflow", "price": 59.99, "is_free": False},
            {"title": "Free Mixing Tips", "description": "Quick tips to improve your mixes", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "EQ Fundamentals", "duration": 720, "is_free": True},
            {"title": "Compression Deep Dive", "duration": 840, "is_free": False, "price": 14.99},
            {"title": "Reverb and Delay Techniques", "duration": 660, "is_free": True},
            {"title": "Vocal Processing Chain", "duration": 780, "is_free": False, "price": 19.99},
            {"title": "Drum Mixing Secrets", "duration": 900, "is_free": False, "price": 24.99},
            {"title": "Bass Treatment Guide", "duration": 540, "is_free": True},
            {"title": "Stereo Width and Imaging", "duration": 600, "is_free": False, "price": 12.99},
            {"title": "Automation Techniques", "duration": 720, "is_free": True},
            {"title": "Reference Track Workflow", "duration": 480, "is_free": True},
            {"title": "Finalizing Your Mix", "duration": 660, "is_free": False, "price": 9.99},
        ]
    },
    "recording_studio": {
        "subcategories": ["Recording Studios", "Rehearsal Rooms", "Equipment", "Acoustics"],
        "playlists": [
            {"title": "Studio Setup Guide", "description": "Build your professional studio", "price": 99.99, "is_free": False},
            {"title": "Acoustic Treatment 101", "description": "Perfect your room acoustics", "price": 49.99, "is_free": False},
            {"title": "Free Recording Tips", "description": "Essential recording basics", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Microphone Selection Guide", "duration": 600, "is_free": True},
            {"title": "Preamp and Interface Setup", "duration": 540, "is_free": False, "price": 11.99},
            {"title": "Room Acoustics Basics", "duration": 720, "is_free": True},
            {"title": "Recording Vocals Professionally", "duration": 840, "is_free": False, "price": 19.99},
            {"title": "Drum Recording Techniques", "duration": 960, "is_free": False, "price": 29.99},
            {"title": "Guitar Recording Methods", "duration": 600, "is_free": True},
            {"title": "Bass DI vs Amp Recording", "duration": 480, "is_free": True},
            {"title": "Multi-track Session Management", "duration": 720, "is_free": False, "price": 14.99},
            {"title": "Headphone Mixes Setup", "duration": 540, "is_free": True},
            {"title": "Signal Flow Explained", "duration": 660, "is_free": False, "price": 9.99},
        ]
    },
    "comedian": {
        "subcategories": ["Stand-up", "Improv", "Sketch Comedy", "Musical Comedy"],
        "playlists": [
            {"title": "Stand-up Comedy Masterclass", "description": "From open mic to headliner", "price": 69.99, "is_free": False},
            {"title": "Improv Fundamentals", "description": "Yes, and... your way to success", "price": 49.99, "is_free": False},
            {"title": "Free Comedy Tips", "description": "Quick lessons for beginners", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Writing Your First Set", "duration": 720, "is_free": True},
            {"title": "Stage Presence Techniques", "duration": 600, "is_free": False, "price": 12.99},
            {"title": "Timing and Delivery", "duration": 540, "is_free": True},
            {"title": "Crowd Work Basics", "duration": 660, "is_free": False, "price": 14.99},
            {"title": "Handling Hecklers", "duration": 480, "is_free": False, "price": 9.99},
            {"title": "Building Your Comedy Brand", "duration": 720, "is_free": True},
            {"title": "Open Mic Strategy", "duration": 540, "is_free": True},
            {"title": "Finding Your Voice", "duration": 600, "is_free": False, "price": 11.99},
            {"title": "Physical Comedy Basics", "duration": 480, "is_free": True},
            {"title": "Recording Your Special", "duration": 840, "is_free": False, "price": 24.99},
        ]
    },
    "actor": {
        "subcategories": ["Film Actor", "Theater Actor", "Voice Actor", "Commercial Actor"],
        "playlists": [
            {"title": "Acting for Camera", "description": "Master on-screen performance", "price": 79.99, "is_free": False},
            {"title": "Audition Techniques", "description": "Land more roles", "price": 59.99, "is_free": False},
            {"title": "Free Acting Basics", "description": "Foundation skills for actors", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Cold Reading Techniques", "duration": 600, "is_free": True},
            {"title": "Emotional Preparation", "duration": 720, "is_free": False, "price": 14.99},
            {"title": "Scene Analysis Methods", "duration": 660, "is_free": True},
            {"title": "Self-Tape Best Practices", "duration": 540, "is_free": False, "price": 12.99},
            {"title": "Working with Directors", "duration": 600, "is_free": False, "price": 11.99},
            {"title": "Voice and Diction", "duration": 480, "is_free": True},
            {"title": "Physicality in Performance", "duration": 720, "is_free": True},
            {"title": "Building Your Reel", "duration": 600, "is_free": False, "price": 19.99},
            {"title": "Agent and Manager Relationships", "duration": 540, "is_free": False, "price": 9.99},
            {"title": "Industry Networking", "duration": 660, "is_free": True},
        ]
    },
    "photographer": {
        "subcategories": ["Concert Photographer", "Portrait Photographer", "Event Photographer", "Product Photographer"],
        "playlists": [
            {"title": "Concert Photography Mastery", "description": "Capture live music perfectly", "price": 89.99, "is_free": False},
            {"title": "Portrait Lighting Essentials", "description": "Professional portrait techniques", "price": 69.99, "is_free": False},
            {"title": "Free Photography Basics", "description": "Getting started with your camera", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Camera Settings for Live Shows", "duration": 720, "is_free": True},
            {"title": "Low Light Photography", "duration": 660, "is_free": False, "price": 14.99},
            {"title": "Composition Techniques", "duration": 540, "is_free": True},
            {"title": "Working with Stage Lighting", "duration": 600, "is_free": False, "price": 12.99},
            {"title": "Photo Editing Workflow", "duration": 840, "is_free": False, "price": 19.99},
            {"title": "Building Your Portfolio", "duration": 480, "is_free": True},
            {"title": "Getting Press Passes", "duration": 420, "is_free": True},
            {"title": "Lens Selection Guide", "duration": 600, "is_free": False, "price": 9.99},
            {"title": "Flash Photography Basics", "duration": 540, "is_free": True},
            {"title": "Delivering to Clients", "duration": 480, "is_free": False, "price": 7.99},
        ]
    },
    "videographer": {
        "subcategories": ["Music Video Director", "Live Stream Operator", "Documentary Filmmaker", "Video Editor"],
        "playlists": [
            {"title": "Music Video Production", "description": "From concept to final cut", "price": 99.99, "is_free": False},
            {"title": "Live Streaming Mastery", "description": "Professional live broadcasts", "price": 79.99, "is_free": False},
            {"title": "Free Video Basics", "description": "Essential videography skills", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Camera Movement Techniques", "duration": 720, "is_free": True},
            {"title": "Lighting for Video", "duration": 660, "is_free": False, "price": 14.99},
            {"title": "Audio Recording for Video", "duration": 540, "is_free": True},
            {"title": "Color Grading Basics", "duration": 780, "is_free": False, "price": 19.99},
            {"title": "Multi-Camera Setup", "duration": 600, "is_free": False, "price": 16.99},
            {"title": "Editing Workflow Tips", "duration": 840, "is_free": True},
            {"title": "Drone Videography", "duration": 720, "is_free": False, "price": 24.99},
            {"title": "Interview Techniques", "duration": 480, "is_free": True},
            {"title": "B-Roll Strategies", "duration": 420, "is_free": True},
            {"title": "Delivering Final Projects", "duration": 540, "is_free": False, "price": 9.99},
        ]
    },
    "show_pro": {
        "subcategories": ["Lighting Designer", "Stage Manager", "Sound Technician", "Technical Director"],
        "playlists": [
            {"title": "Stage Lighting Design", "description": "Create stunning light shows", "price": 89.99, "is_free": False},
            {"title": "Live Sound Engineering", "description": "Mix live shows like a pro", "price": 79.99, "is_free": False},
            {"title": "Free Stage Tech Basics", "description": "Introduction to show production", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Lighting Console Basics", "duration": 720, "is_free": True},
            {"title": "Creating Light Scenes", "duration": 660, "is_free": False, "price": 14.99},
            {"title": "DMX Protocol Explained", "duration": 540, "is_free": True},
            {"title": "Moving Head Programming", "duration": 780, "is_free": False, "price": 19.99},
            {"title": "FOH Mixing Techniques", "duration": 840, "is_free": False, "price": 24.99},
            {"title": "Monitor Engineering", "duration": 600, "is_free": True},
            {"title": "Stage Plot Creation", "duration": 480, "is_free": True},
            {"title": "Rigging Safety", "duration": 540, "is_free": False, "price": 12.99},
            {"title": "Show Calling Basics", "duration": 600, "is_free": True},
            {"title": "Tour Preparation", "duration": 720, "is_free": False, "price": 16.99},
        ]
    },
    "manager": {
        "subcategories": ["Artist Manager", "Tour Manager", "Business Manager", "Booking Agent"],
        "playlists": [
            {"title": "Artist Management 101", "description": "Build and manage artist careers", "price": 149.99, "is_free": False},
            {"title": "Tour Management Guide", "description": "Plan and execute successful tours", "price": 99.99, "is_free": False},
            {"title": "Free Management Tips", "description": "Essential industry knowledge", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Finding and Signing Artists", "duration": 720, "is_free": True},
            {"title": "Contract Negotiation", "duration": 840, "is_free": False, "price": 29.99},
            {"title": "Building Artist Brand", "duration": 600, "is_free": True},
            {"title": "Tour Routing Strategies", "duration": 660, "is_free": False, "price": 19.99},
            {"title": "Budget Management", "duration": 540, "is_free": False, "price": 14.99},
            {"title": "Industry Relationships", "duration": 480, "is_free": True},
            {"title": "Social Media Strategy", "duration": 600, "is_free": True},
            {"title": "Sync Licensing Basics", "duration": 720, "is_free": False, "price": 24.99},
            {"title": "PR and Publicity", "duration": 540, "is_free": False, "price": 12.99},
            {"title": "Day-to-Day Operations", "duration": 480, "is_free": True},
        ]
    },
    "services": {
        "subcategories": ["Hair Stylist", "Makeup Artist", "Wardrobe Stylist", "Personal Trainer"],
        "playlists": [
            {"title": "Entertainment Styling", "description": "Style artists for stage and screen", "price": 79.99, "is_free": False},
            {"title": "Stage Makeup Mastery", "description": "Professional makeup techniques", "price": 69.99, "is_free": False},
            {"title": "Free Styling Tips", "description": "Basic styling for performers", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Quick Stage Hairstyles", "duration": 600, "is_free": True},
            {"title": "Makeup Under Stage Lights", "duration": 720, "is_free": False, "price": 14.99},
            {"title": "Wardrobe Planning", "duration": 540, "is_free": True},
            {"title": "Quick Changes Backstage", "duration": 480, "is_free": False, "price": 9.99},
            {"title": "Working with Artists", "duration": 600, "is_free": True},
            {"title": "Photo Shoot Prep", "duration": 660, "is_free": False, "price": 12.99},
            {"title": "Video Styling Tips", "duration": 540, "is_free": True},
            {"title": "Kit Essentials", "duration": 420, "is_free": True},
            {"title": "Emergency Fixes", "duration": 480, "is_free": False, "price": 7.99},
            {"title": "Building Client Relationships", "duration": 600, "is_free": False, "price": 11.99},
        ]
    },
    "venue": {
        "subcategories": ["Concert Hall", "Club", "Theater", "Festival Grounds"],
        "playlists": [
            {"title": "Venue Management Essentials", "description": "Run a successful venue", "price": 129.99, "is_free": False},
            {"title": "Event Planning Guide", "description": "Plan and execute events", "price": 89.99, "is_free": False},
            {"title": "Free Venue Tips", "description": "Basics for venue operators", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Venue Layout Planning", "duration": 720, "is_free": True},
            {"title": "Sound System Setup", "duration": 840, "is_free": False, "price": 19.99},
            {"title": "Lighting Installation", "duration": 660, "is_free": True},
            {"title": "Booking and Promotion", "duration": 600, "is_free": False, "price": 14.99},
            {"title": "Security Planning", "duration": 540, "is_free": False, "price": 12.99},
            {"title": "Staff Management", "duration": 480, "is_free": True},
            {"title": "Customer Experience", "duration": 600, "is_free": True},
            {"title": "Legal Requirements", "duration": 720, "is_free": False, "price": 24.99},
            {"title": "Technical Rider Review", "duration": 540, "is_free": True},
            {"title": "Revenue Optimization", "duration": 660, "is_free": False, "price": 16.99},
        ]
    },
    "merchant": {
        "subcategories": ["Clothing", "Vinyl Records", "Instruments", "Accessories"],
        "playlists": [
            {"title": "Merch Business Masterclass", "description": "Build a merch empire", "price": 99.99, "is_free": False},
            {"title": "Product Photography", "description": "Photograph merch professionally", "price": 59.99, "is_free": False},
            {"title": "Free Selling Tips", "description": "Basic ecommerce strategies", "price": 0, "is_free": True},
        ],
        "videos": [
            {"title": "Product Sourcing", "duration": 600, "is_free": True},
            {"title": "Pricing Strategies", "duration": 540, "is_free": False, "price": 12.99},
            {"title": "Online Store Setup", "duration": 720, "is_free": True},
            {"title": "Tour Merch Operations", "duration": 660, "is_free": False, "price": 19.99},
            {"title": "Inventory Management", "duration": 480, "is_free": False, "price": 9.99},
            {"title": "Shipping and Fulfillment", "duration": 540, "is_free": True},
            {"title": "Custom Design Tips", "duration": 600, "is_free": True},
            {"title": "Limited Edition Drops", "duration": 480, "is_free": False, "price": 14.99},
            {"title": "Fan Engagement", "duration": 420, "is_free": True},
            {"title": "Scaling Your Business", "duration": 720, "is_free": False, "price": 24.99},
        ]
    }
}

def create_channel(category, user_id, username):
    """Create a channel for a category"""
    category_labels = {
        "musician": "Music Academy",
        "audio_engineer": "Audio Engineering School",
        "recording_studio": "Studio Masters",
        "comedian": "Comedy Academy",
        "actor": "Acting School",
        "photographer": "Photography Institute",
        "videographer": "Film School",
        "show_pro": "Stage Production Academy",
        "manager": "Music Business School",
        "services": "Entertainment Services Academy",
        "venue": "Venue Management Institute",
        "merchant": "Merch Business Academy"
    }
    
    channel = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": category_labels.get(category, f"{category.title()} Academy"),
        "description": f"Professional {category.replace('_', ' ')} education - learn from industry experts",
        "intro_video_url": None,
        "intro_video_thumbnail": None,
        "category": category,
        "subcategories": CATEGORY_CONTENT[category]["subcategories"][:3],
        "banner_image": None,
        "subscriber_count": random.randint(100, 5000),
        "total_views": random.randint(1000, 50000),
        "average_rating": round(random.uniform(4.0, 5.0), 1),
        "review_count": random.randint(10, 200),
        "is_featured": random.choice([True, False]),
        "created_at": datetime.utcnow() - timedelta(days=random.randint(30, 365)),
        "updated_at": datetime.utcnow()
    }
    
    # Check if channel for this category already exists
    existing = db.learn_channels.find_one({"category": category})
    if existing:
        print(f"  Channel for {category} already exists, skipping...")
        return existing["id"]
    
    db.learn_channels.insert_one(channel)
    print(f"  Created channel: {channel['name']}")
    return channel["id"]

def create_playlists(channel_id, category, user_id):
    """Create playlists for a channel"""
    playlist_ids = []
    for playlist_data in CATEGORY_CONTENT[category]["playlists"]:
        playlist = {
            "id": str(uuid.uuid4()),
            "channel_id": channel_id,
            "user_id": user_id,
            "title": playlist_data["title"],
            "description": playlist_data["description"],
            "thumbnail_url": None,
            "category": category,
            "subcategories": CATEGORY_CONTENT[category]["subcategories"][:2],
            "price_usd": playlist_data["price"],
            "is_free": playlist_data["is_free"],
            "unlocked_for_subscribers": not playlist_data["is_free"],
            "video_count": 0,
            "total_duration_seconds": 0,
            "view_count": random.randint(100, 5000),
            "average_rating": round(random.uniform(4.0, 5.0), 1) if not playlist_data["is_free"] else 0.0,
            "review_count": random.randint(5, 50) if not playlist_data["is_free"] else 0,
            "is_published": True,
            "created_at": datetime.utcnow() - timedelta(days=random.randint(7, 180)),
            "updated_at": datetime.utcnow()
        }
        
        # Check if playlist already exists
        existing = db.learn_playlists.find_one({"title": playlist["title"], "channel_id": channel_id})
        if existing:
            playlist_ids.append(existing["id"])
            continue
            
        db.learn_playlists.insert_one(playlist)
        playlist_ids.append(playlist["id"])
        print(f"    Created playlist: {playlist['title']} (${playlist['price_usd']})")
    
    return playlist_ids

def create_videos(channel_id, playlist_ids, category, user_id):
    """Create videos for playlists and standalone"""
    video_templates = CATEGORY_CONTENT[category]["videos"]
    
    for i, video_data in enumerate(video_templates):
        # Distribute videos across playlists (first 3 in each playlist)
        playlist_id = None
        if i < 3 and len(playlist_ids) > 0:
            playlist_id = playlist_ids[0]  # First playlist
        elif i < 6 and len(playlist_ids) > 1:
            playlist_id = playlist_ids[1]  # Second playlist
        elif i < 9 and len(playlist_ids) > 2:
            playlist_id = playlist_ids[2]  # Third playlist
        # Rest are standalone videos
        
        video = {
            "id": str(uuid.uuid4()),
            "channel_id": channel_id,
            "playlist_id": playlist_id,
            "user_id": user_id,
            "title": video_data["title"],
            "description": f"Learn {video_data['title'].lower()} in this comprehensive lesson",
            "video_url": random.choice(SAMPLE_VIDEO_URLS),
            "thumbnail_url": None,
            "duration_seconds": video_data["duration"],
            "category": category,
            "subcategories": CATEGORY_CONTENT[category]["subcategories"][:1],
            "price_usd": video_data.get("price", 0),
            "is_free": video_data["is_free"],
            "is_preview": False,
            "preview_duration_seconds": 60 if not video_data["is_free"] else None,  # 60 sec preview for paid
            "view_count": random.randint(50, 3000),
            "average_rating": round(random.uniform(4.0, 5.0), 1),
            "review_count": random.randint(2, 30),
            "is_published": True,
            "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 90)),
            "updated_at": datetime.utcnow()
        }
        
        # Check if video already exists
        existing = db.learn_videos.find_one({"title": video["title"], "channel_id": channel_id})
        if existing:
            continue
            
        db.learn_videos.insert_one(video)
        status = "FREE" if video["is_free"] else f"PAID ${video['price_usd']}"
        print(f"      Created video: {video['title']} ({status})")
    
    # Update playlist video counts
    for playlist_id in playlist_ids:
        if playlist_id:
            video_count = db.learn_videos.count_documents({"playlist_id": playlist_id})
            total_duration = sum(v["duration_seconds"] for v in db.learn_videos.find({"playlist_id": playlist_id}))
            db.learn_playlists.update_one(
                {"id": playlist_id},
                {"$set": {"video_count": video_count, "total_duration_seconds": total_duration}}
            )

def create_reviews(category):
    """Create sample reviews for playlists and channels"""
    sample_reviews = [
        "Excellent content! Learned so much.",
        "Very professional and well-organized.",
        "Worth every penny. Highly recommend!",
        "Great for beginners and intermediate learners.",
        "The instructor explains everything clearly.",
        "Practical tips I can use immediately.",
        "Best course I've taken in this field.",
        "Some of the best content available online.",
        "Really helped improve my skills.",
        "Professional quality instruction.",
    ]
    
    sample_usernames = ["musicfan123", "studioguru", "creativepro", "soundmaster", "learnfast", 
                        "skillbuilder", "protechnician", "artisticmind", "productionpro", "talentseeker"]
    
    # Get playlists for this category that are paid (would have reviews)
    playlists = list(db.learn_playlists.find({"category": category, "is_free": False}))
    
    for playlist in playlists:
        # Create 3-5 reviews per paid playlist
        num_reviews = random.randint(3, 5)
        for _ in range(num_reviews):
            review = {
                "id": str(uuid.uuid4()),
                "user_id": f"user-{uuid.uuid4().hex[:8]}",
                "reviewer_username": random.choice(sample_usernames),
                "reviewer_avatar": None,
                "target_type": "playlist",
                "target_id": playlist["id"],
                "rating": random.randint(4, 5),
                "content": random.choice(sample_reviews),
                "is_verified_purchase": True,
                "helpful_count": random.randint(0, 20),
                "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
                "updated_at": datetime.utcnow()
            }
            
            # Check if review already exists
            existing = db.learn_reviews.find_one({
                "target_id": playlist["id"],
                "reviewer_username": review["reviewer_username"]
            })
            if not existing:
                db.learn_reviews.insert_one(review)

def main():
    user_id = "admin-miclocker-support"
    username = "miclocker.support"
    
    print("=" * 60)
    print("SEEDING LEARN SECTION DATA")
    print("=" * 60)
    
    for category in CATEGORY_CONTENT.keys():
        print(f"\n[{category.upper()}]")
        
        # Create channel
        channel_id = create_channel(category, user_id, username)
        
        # Create playlists
        playlist_ids = create_playlists(channel_id, category, user_id)
        
        # Create videos
        create_videos(channel_id, playlist_ids, category, user_id)
        
        # Create reviews
        create_reviews(category)
    
    print("\n" + "=" * 60)
    print("SEED DATA COMPLETE")
    print("=" * 60)
    
    # Print summary
    print(f"\nChannels: {db.learn_channels.count_documents({})}")
    print(f"Playlists: {db.learn_playlists.count_documents({})}")
    print(f"Videos: {db.learn_videos.count_documents({})}")
    print(f"Reviews: {db.learn_reviews.count_documents({})}")

if __name__ == "__main__":
    main()
