import asyncio
from database import get_database, db
from services.auth import get_password_hash
from models.user import UserInDB
from models.listing import ListingInDB, ListingMedia, ShippingOption, PaymentPlan
from datetime import datetime, timedelta
import uuid
import random
import logging

logger = logging.getLogger(__name__)

# Sample data
SAMPLE_USERS = [
    {
        "username": "admin",
        "email": "admin@miclocker.com",
        "password": "admin123",
        "is_admin": True,
        "category": "musician",
        "bio": "MicLocker Platform Administrator",
        "location": "Los Angeles, CA",
        "genre": "All Genres",
        "instruments": ["Electric Guitar", "Bass Electric"]
    },
    {
        "username": "guitarking",
        "email": "guitarking@example.com",
        "password": "password123",
        "category": "musician",
        "bio": "Professional guitarist with 15 years of experience. Specializing in blues and rock.",
        "location": "Nashville, TN",
        "genre": "Blues",
        "instruments": ["Electric Guitar", "Acoustic Guitar", "Classical Guitar"]
    },
    {
        "username": "studiopromax",
        "email": "studio@example.com",
        "password": "password123",
        "category": "recording_studio",
        "bio": "Full-service recording studio with state-of-the-art equipment.",
        "location": "Austin, TX",
        "studio_offerings": ["Mixing Engineers", "Mastering Engineers", "Recording Studios"]
    },
    {
        "username": "beatmaker2024",
        "email": "beats@example.com",
        "password": "password123",
        "category": "audio_engineer",
        "bio": "Hip-hop producer with over 500 placements.",
        "location": "Atlanta, GA",
        "specializations": ["Beat Makers", "Producers", "Mixing Engineers"]
    },
    {
        "username": "vintagegear",
        "email": "vintage@example.com",
        "password": "password123",
        "category": "musician",
        "bio": "Collector of vintage musical equipment. Quality gear at fair prices.",
        "location": "New York, NY",
        "genre": "Rock",
        "instruments": ["Electric Guitar", "Keyboards Synths"]
    },
    {
        "username": "drumcircle",
        "email": "drums@example.com",
        "password": "password123",
        "category": "musician",
        "bio": "Professional drummer and drum instructor.",
        "location": "Chicago, IL",
        "genre": "Jazz",
        "instruments": ["Percussion", "Timpani"]
    }
]

SAMPLE_LISTINGS = [
    {
        "title": "Fender American Professional II Stratocaster",
        "description": "Beautiful Olympic White finish, rosewood fingerboard. In excellent condition with minimal play wear. Includes original hardshell case, all documentation, and trem arm. This guitar plays like a dream with the new V-Mod II pickups that deliver that classic Strat tone.",
        "brand": "Fender",
        "model": "American Professional II Stratocaster",
        "category": "Guitars",
        "condition": "Excellent",
        "price": 1499.00,
        "tags": ["fender", "stratocaster", "electric guitar", "american"],
        "seller_index": 1
    },
    {
        "title": "Gibson Les Paul Standard '50s Heritage Cherry Sunburst",
        "description": "2022 Gibson Les Paul Standard with the classic '50s neck profile. AAA flame maple top in gorgeous Heritage Cherry Sunburst. Burstbucker pickups deliver that legendary Les Paul tone. Comes with original hardshell case.",
        "brand": "Gibson",
        "model": "Les Paul Standard '50s",
        "category": "Guitars",
        "condition": "Mint",
        "price": 2299.00,
        "tags": ["gibson", "les paul", "electric guitar", "humbucker"],
        "seller_index": 4
    },
    {
        "title": "Shure SM7B Dynamic Microphone",
        "description": "Industry standard broadcast and podcast microphone. Perfect for vocals, voiceovers, and streaming. Includes windscreen and close-talk windscreen. Very light use, like new condition.",
        "brand": "Shure",
        "model": "SM7B",
        "category": "Microphones",
        "condition": "Excellent",
        "price": 349.00,
        "tags": ["shure", "microphone", "dynamic", "broadcast", "podcast"],
        "seller_index": 2
    },
    {
        "title": "Neumann U87 Ai Condenser Microphone",
        "description": "The legendary studio vocal microphone. This U87 Ai is in pristine condition with original wooden box, shock mount, and windscreen. A true investment piece that will last a lifetime.",
        "brand": "Neumann",
        "model": "U87 Ai",
        "category": "Microphones",
        "condition": "Excellent",
        "price": 2899.00,
        "tags": ["neumann", "condenser", "studio", "vocal mic"],
        "seller_index": 2
    },
    {
        "title": "Roland JUNO-106 Vintage Synthesizer",
        "description": "Classic 80s analog synthesizer in great working condition. All voice chips recently serviced. Rich, warm sound that's been used on countless recordings. Includes power cable.",
        "brand": "Roland",
        "model": "JUNO-106",
        "category": "Keyboards & Synths",
        "condition": "Very Good",
        "price": 1899.00,
        "tags": ["roland", "synthesizer", "analog", "vintage", "80s"],
        "seller_index": 4
    },
    {
        "title": "Yamaha HS8 Studio Monitors (Pair)",
        "description": "Pair of Yamaha HS8 8-inch powered studio monitors. White cone woofers with distinct Yamaha sound. Perfect for mixing and mastering. Includes power cables.",
        "brand": "Yamaha",
        "model": "HS8",
        "category": "Studio Monitors",
        "condition": "Excellent",
        "price": 549.00,
        "tags": ["yamaha", "studio monitors", "powered", "mixing"],
        "seller_index": 2
    },
    {
        "title": "Akai MPC Live II Standalone Sampler",
        "description": "Standalone beat making powerhouse. Built-in speakers, battery powered option, 7-inch touchscreen. Loaded with sounds and expansions. Light use, like new.",
        "brand": "Akai",
        "model": "MPC Live II",
        "category": "DJ Equipment",
        "condition": "Mint",
        "price": 999.00,
        "tags": ["akai", "mpc", "sampler", "beat maker", "standalone"],
        "seller_index": 3
    },
    {
        "title": "DW Collector's Series Maple Drum Kit",
        "description": "5-piece DW Collector's Series in Natural Satin finish. Includes 22x18 kick, 10x8 and 12x9 rack toms, 14x14 and 16x16 floor toms. Shells are pristine. Hardware not included.",
        "brand": "DW",
        "model": "Collector's Series Maple",
        "category": "Drums & Percussion",
        "condition": "Excellent",
        "price": 3499.00,
        "tags": ["dw", "drums", "maple", "collector's", "kit"],
        "seller_index": 5
    },
    {
        "title": "Universal Audio Apollo Twin X DUO",
        "description": "Premium desktop audio interface with UAD-2 DUO Core processing. Thunderbolt 3 connectivity. Includes Realtime Analog Classics plugin bundle. Pristine condition with original box.",
        "brand": "Universal Audio",
        "model": "Apollo Twin X DUO",
        "category": "Recording Equipment",
        "condition": "Mint",
        "price": 899.00,
        "tags": ["universal audio", "interface", "apollo", "thunderbolt"],
        "seller_index": 2
    },
    {
        "title": "Boss Katana-100 MkII Guitar Amplifier",
        "description": "100-watt 1x12 combo amp with Boss's acclaimed Tube Logic design. 5 amp types, 60+ Boss effects. Power control for home practice to stage. Mint condition.",
        "brand": "Boss",
        "model": "Katana-100 MkII",
        "category": "Amplifiers",
        "condition": "Mint",
        "price": 399.00,
        "tags": ["boss", "amplifier", "modeling", "combo"],
        "seller_index": 1
    },
    {
        "title": "Strymon Timeline Delay Pedal",
        "description": "The ultimate delay pedal with 12 delay machines. MIDI capable, stereo I/O, preset system. Light studio use only. Includes power supply and original box.",
        "brand": "Strymon",
        "model": "Timeline",
        "category": "Effects Pedals",
        "condition": "Excellent",
        "price": 379.00,
        "tags": ["strymon", "delay", "pedal", "effects"],
        "seller_index": 4
    },
    {
        "title": "Sennheiser HD 650 Open-Back Headphones",
        "description": "Reference-class open-back headphones. Legendary sound quality for mixing and critical listening. Includes 6.35mm adapter and original box.",
        "brand": "Sennheiser",
        "model": "HD 650",
        "category": "Headphones",
        "condition": "Excellent",
        "price": 299.00,
        "tags": ["sennheiser", "headphones", "open-back", "reference"],
        "seller_index": 2
    },
    {
        "title": "Martin D-28 Acoustic Guitar",
        "description": "2020 Martin D-28 reimagined with forward-shifted bracing. Sitka spruce top with East Indian rosewood back and sides. Rich, full tone. Includes original hardshell case.",
        "brand": "Martin",
        "model": "D-28",
        "category": "Guitars",
        "condition": "Excellent",
        "price": 2799.00,
        "tags": ["martin", "acoustic", "dreadnought", "rosewood"],
        "seller_index": 1
    },
    {
        "title": "Moog Subsequent 37 Synthesizer",
        "description": "Paraphonic analog synthesizer with that unmistakable Moog sound. Duo mode, arpeggiator, sequencer. Excellent condition with dust cover.",
        "brand": "Moog",
        "model": "Subsequent 37",
        "category": "Keyboards & Synths",
        "condition": "Excellent",
        "price": 1599.00,
        "tags": ["moog", "synthesizer", "analog", "monophonic"],
        "seller_index": 4
    },
    {
        "title": "Pioneer DJ DDJ-1000 Controller",
        "description": "Professional 4-channel DJ controller for rekordbox. Full-size jog wheels, built-in sound card. Light club use, in great condition.",
        "brand": "Pioneer DJ",
        "model": "DDJ-1000",
        "category": "DJ Equipment",
        "condition": "Very Good",
        "price": 899.00,
        "tags": ["pioneer", "dj", "controller", "rekordbox"],
        "seller_index": 3
    }
]

# Placeholder image URLs for different categories
CATEGORY_IMAGES = {
    "Guitars": [
        "https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=800",
        "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800"
    ],
    "Microphones": [
        "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800",
        "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800"
    ],
    "Keyboards & Synths": [
        "https://images.unsplash.com/photo-1552422535-c45813c61732?w=800",
        "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=800"
    ],
    "Studio Monitors": [
        "https://images.unsplash.com/photo-1558662337-86a32df24e15?w=800"
    ],
    "DJ Equipment": [
        "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800"
    ],
    "Drums & Percussion": [
        "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800"
    ],
    "Recording Equipment": [
        "https://images.unsplash.com/photo-1598653222000-6b7b7a552625?w=800"
    ],
    "Amplifiers": [
        "https://images.unsplash.com/photo-1535587566541-97121a128dc5?w=800"
    ],
    "Effects Pedals": [
        "https://images.unsplash.com/photo-1558662337-86a32df24e15?w=800"
    ],
    "Headphones": [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800"
    ]
}

async def seed_database():
    """Seed the database with sample data"""
    database = get_database()
    
    # Check if already seeded
    user_count = await database.users.count_documents({})
    if user_count > 0:
        logger.info("Database already has data, skipping seed")
        return
    
    logger.info("Seeding database with sample data...")
    
    # Create users
    user_ids = []
    for i, user_data in enumerate(SAMPLE_USERS):
        user = UserInDB(
            username=user_data["username"],
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            is_admin=user_data.get("is_admin", False),
            is_first_user=i == 0,
            category=user_data.get("category"),
            profile_completed=True,
            bio=user_data.get("bio"),
            location=user_data.get("location"),
            genre=user_data.get("genre"),
            instruments=user_data.get("instruments"),
            specializations=user_data.get("specializations"),
            studio_offerings=user_data.get("studio_offerings"),
            rating=round(random.uniform(4.0, 5.0), 1) if i > 0 else 0,
            review_count=random.randint(5, 50) if i > 0 else 0,
            total_sales=random.randint(10, 100) if i > 0 else 0
        )
        await database.users.insert_one(user.model_dump())
        user_ids.append(user.id)
        logger.info(f"Created user: {user.username}")
    
    # Create listings
    for listing_data in SAMPLE_LISTINGS:
        seller_index = listing_data["seller_index"]
        seller_id = user_ids[seller_index]
        seller = await database.users.find_one({"id": seller_id})
        
        # Get image for category
        category_images = CATEGORY_IMAGES.get(listing_data["category"], [])
        image_url = random.choice(category_images) if category_images else "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800"
        
        listing = ListingInDB(
            seller_id=seller_id,
            seller_username=seller["username"],
            title=listing_data["title"],
            description=listing_data["description"],
            brand=listing_data.get("brand"),
            model=listing_data.get("model"),
            category=listing_data["category"],
            condition=listing_data["condition"],
            price=listing_data["price"],
            quantity=random.randint(1, 3),
            tags=listing_data.get("tags", []),
            media=[ListingMedia(
                url=image_url,
                media_type="image",
                is_primary=True,
                order=0
            ).model_dump()],
            shipping=ShippingOption(
                method="Standard",
                price=round(random.uniform(10, 50), 2),
                estimated_days="3-5 business days"
            ).model_dump(),
            payment_plan=PaymentPlan(
                enabled=random.choice([True, False]),
                num_payments=4,
                down_payment_percent=25.0
            ).model_dump(),
            view_count=random.randint(50, 500),
            favorite_count=random.randint(5, 50),
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
        )
        await database.listings.insert_one(listing.model_dump())
        logger.info(f"Created listing: {listing.title}")
    
    logger.info(f"Database seeded with {len(SAMPLE_USERS)} users and {len(SAMPLE_LISTINGS)} listings")
