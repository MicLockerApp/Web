"""
Seed script for creating test user profiles for the auditions feature.
Run this script to populate the database with test users that match the sample audition data.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "miclocker")

# Test users data matching the sample auditions
TEST_USERS = [
    {
        "id": "user1",
        "username": "dj_beats",
        "email": "dj_beats@test.com",
        "first_name": "DJ",
        "last_name": "Beats",
        "bio": "Late night studio sessions are my thing. Producer and beat maker based in LA. Let's create something amazing together!",
        "category": "musician",
        "instruments": ["Beat Makers", "Keyboards Synths"],
        "genres": ["Electronic", "Hip Hop"],
        "location": "Los Angeles, CA",
        "profile_image": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400",
        "cover_image": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800",
        "is_verified": True,
        "is_approved_seller": True,
        "followers_count": 12400,
        "following_count": 234,
        "social_links": {
            "instagram": "https://instagram.com/dj_beats",
            "spotify": "https://open.spotify.com/artist/djbeats",
            "soundcloud": "https://soundcloud.com/djbeats"
        }
    },
    {
        "id": "user2",
        "username": "guitar_hero",
        "email": "guitar_hero@test.com",
        "first_name": "Alex",
        "last_name": "Riffmaster",
        "bio": "Shredding electric guitar since I was 12. Rock and metal is in my blood. Available for sessions and live gigs!",
        "category": "musician",
        "instruments": ["Electric Guitar"],
        "genres": ["Rock", "Metal"],
        "location": "Austin, TX",
        "profile_image": "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400",
        "cover_image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
        "is_verified": False,
        "is_approved_seller": False,
        "followers_count": 8700,
        "following_count": 156,
        "social_links": {
            "instagram": "https://instagram.com/guitar_hero",
            "youtube": "https://youtube.com/@guitarhero"
        }
    },
    {
        "id": "user3",
        "username": "vocal_queen",
        "email": "vocal_queen@test.com",
        "first_name": "Maya",
        "last_name": "Songbird",
        "bio": "Singer and vocal coach with 10+ years experience. Pop and R&B specialist. Let me bring your songs to life!",
        "category": "musician",
        "instruments": ["Singer Female"],
        "genres": ["Pop", "R&B"],
        "location": "Nashville, TN",
        "profile_image": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
        "cover_image": "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800",
        "is_verified": True,
        "is_approved_seller": True,
        "followers_count": 24500,
        "following_count": 567,
        "social_links": {
            "instagram": "https://instagram.com/vocal_queen",
            "spotify": "https://open.spotify.com/artist/vocalqueen",
            "tiktok": "https://tiktok.com/@vocal_queen"
        }
    },
    {
        "id": "user4",
        "username": "mix_master",
        "email": "mix_master@test.com",
        "first_name": "Marcus",
        "last_name": "Mixwell",
        "bio": "Professional mixing and mastering engineer with 15+ years in the industry. Grammy-nominated. Let's make your tracks shine!",
        "category": "audio_engineer",
        "specializations": ["Mixing Engineers", "Mastering Engineers"],
        "genres": ["Rock", "Metal", "Electronic"],
        "location": "New York, NY",
        "profile_image": "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=400",
        "cover_image": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800",
        "is_verified": False,
        "is_approved_seller": True,
        "followers_count": 5600,
        "following_count": 89,
        "hourly_rate": 150,
        "social_links": {
            "instagram": "https://instagram.com/mix_master",
            "linkedin": "https://linkedin.com/in/mixmaster"
        }
    },
    {
        "id": "user5",
        "username": "piano_vibes",
        "email": "piano_vibes@test.com",
        "first_name": "Elena",
        "last_name": "Keys",
        "bio": "Classical pianist turned jazz improviser. Juilliard trained. Available for studio sessions, live performances, and lessons.",
        "category": "musician",
        "instruments": ["Piano"],
        "genres": ["Classical", "Jazz"],
        "location": "Chicago, IL",
        "profile_image": "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=400",
        "cover_image": "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800",
        "is_verified": True,
        "is_approved_seller": True,
        "followers_count": 45200,
        "following_count": 890,
        "social_links": {
            "instagram": "https://instagram.com/piano_vibes",
            "spotify": "https://open.spotify.com/artist/pianovibes",
            "youtube": "https://youtube.com/@pianovibes"
        }
    },
    {
        "id": "user6",
        "username": "metal_shredder",
        "email": "metal_shredder@test.com",
        "first_name": "Jake",
        "last_name": "Thunderfist",
        "bio": "Metal guitarist and songwriter. Toured with major bands. Ready to bring the heavy riffs to your project!",
        "category": "musician",
        "instruments": ["Electric Guitar"],
        "genres": ["Metal", "Rock"],
        "location": "Seattle, WA",
        "profile_image": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400",
        "cover_image": "https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800",
        "is_verified": True,
        "is_approved_seller": True,
        "followers_count": 18900,
        "following_count": 445,
        "social_links": {
            "instagram": "https://instagram.com/metal_shredder",
            "bandcamp": "https://metalshredder.bandcamp.com",
            "youtube": "https://youtube.com/@metalshredder"
        }
    }
]


async def seed_users():
    """Insert test users into the database."""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Connected to MongoDB: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    print("-" * 50)
    
    for user_data in TEST_USERS:
        # Add common fields
        user_data["created_at"] = datetime.now(timezone.utc)
        user_data["updated_at"] = datetime.now(timezone.utc)
        user_data["password_hash"] = "test_password_hash"  # Not a real password
        user_data["is_active"] = True
        user_data["is_admin"] = False
        
        # Check if user already exists
        existing = await db.users.find_one({"id": user_data["id"]})
        
        if existing:
            # Update existing user
            await db.users.update_one(
                {"id": user_data["id"]},
                {"$set": user_data}
            )
            print(f"✓ Updated user: @{user_data['username']} ({user_data['id']})")
        else:
            # Insert new user
            await db.users.insert_one(user_data)
            print(f"✓ Created user: @{user_data['username']} ({user_data['id']})")
    
    print("-" * 50)
    print(f"✓ Seeded {len(TEST_USERS)} test users successfully!")
    
    # Close connection
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_users())
