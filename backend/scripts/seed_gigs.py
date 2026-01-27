"""
Seed script for Gig Board - Creates 50 diverse gig posts across all categories
"""

import asyncio
import random
from datetime import datetime, timezone
import uuid

# Connect to MongoDB
import sys
sys.path.insert(0, '/app/backend')

from database import connect_to_mongo, get_database

# Sample data for realistic gig posts
SAMPLE_GIGS = [
    # ==================== MUSICIANS - Looking For ====================
    {
        "gig_type": "looking_for",
        "title": "Seeking Lead Guitarist for Original Rock Band",
        "description": "We're a 4-piece rock band based in Austin, TX looking for a lead guitarist to complete our lineup. We play a mix of alternative and classic rock with original material. Must be comfortable with both rhythm and lead parts. We rehearse twice a week and have several gigs booked for the next few months. Looking for someone who is committed, reliable, and has their own gear.",
        "category": "musician",
        "subcategories": ["Electric Guitar"],
        "location": "Austin, TX",
        "budget_range": "$200-400 per gig"
    },
    {
        "gig_type": "looking_for",
        "title": "Wedding Band Needs Drummer for June Events",
        "description": "Professional wedding band seeking an experienced drummer for our June wedding season. Must be able to play various genres including pop, rock, R&B, and jazz standards. Chart reading ability is a plus. We provide all PA equipment. Professional attire required. Multiple dates available throughout the month.",
        "category": "musician",
        "subcategories": ["Percussion"],
        "location": "San Diego, CA",
        "budget_range": "$300-500 per event"
    },
    {
        "gig_type": "looking_for",
        "title": "Jazz Trio Seeking Upright Bass Player",
        "description": "Established jazz trio looking for an upright bass player for weekly residency at a downtown jazz club. We play standards and original compositions. Must have experience with walking bass lines and be comfortable with improvisation. Gig is every Thursday evening, 8pm-11pm.",
        "category": "musician",
        "subcategories": ["Bass Upright"],
        "location": "Chicago, IL",
        "budget_range": "$150 per night + tips"
    },
    {
        "gig_type": "looking_for",
        "title": "Looking for Female Vocalist for Pop Cover Band",
        "description": "High-energy cover band seeking a talented female vocalist to join our team. We play current top 40 hits, 80s, 90s, and 2000s classics. Must have strong stage presence and be comfortable engaging with audiences. We perform at corporate events, weddings, and clubs throughout the region.",
        "category": "musician",
        "subcategories": ["Singer Female"],
        "location": "Miami, FL",
        "budget_range": "$250-600 per show"
    },
    {
        "gig_type": "looking_for",
        "title": "Church Seeking Keyboard Player for Sunday Services",
        "description": "Growing church community looking for a skilled keyboard player to join our worship team. Must be comfortable playing contemporary Christian music and traditional hymns. Services are every Sunday morning with one rehearsal mid-week. We have a Nord Stage 3 available for use.",
        "category": "musician",
        "subcategories": ["Keyboards Synths", "Piano"],
        "location": "Nashville, TN",
        "budget_range": "$100-150 per service"
    },
    {
        "gig_type": "looking_for",
        "title": "Country Band Needs Pedal Steel Player",
        "description": "Traditional country band seeking a pedal steel player for upcoming recording sessions and live performances. We play honky-tonk and classic country styles. Must own your own instrument and have reliable transportation. Recording sessions in February, followed by regional tour dates.",
        "category": "musician",
        "subcategories": ["Pedal Steel"],
        "location": "Dallas, TX",
        "budget_range": "$500-1000 for recording, $200 per show"
    },
    {
        "gig_type": "looking_for",
        "title": "Seeking Violinist for String Quartet",
        "description": "Professional string quartet looking for a second violinist. We perform at weddings, corporate events, and private parties throughout the New England area. Must be classically trained with sight-reading ability. Repertoire includes classical, pop arrangements, and film scores.",
        "category": "musician",
        "subcategories": ["Violin"],
        "location": "Boston, MA",
        "budget_range": "$200-400 per event"
    },
    {
        "gig_type": "looking_for",
        "title": "Hip-Hop Producer Looking for Session Rapper",
        "description": "Independent hip-hop producer seeking talented rappers for upcoming mixtape project. Looking for artists with unique flows and strong lyrical content. This is a collaborative project with potential for ongoing work. Must be able to record at my home studio in Brooklyn.",
        "category": "musician",
        "subcategories": ["Rapper"],
        "location": "Brooklyn, NY",
        "budget_range": "Revenue share + exposure"
    },
    {
        "gig_type": "looking_for",
        "title": "Folk Band Seeking Mandolin Player",
        "description": "Americana/folk band looking for a mandolin player to add to our sound. We play a mix of traditional folk, bluegrass, and original songs. Experience with harmony vocals is a big plus. We have an album release show coming up and need someone to fill in and potentially join permanently.",
        "category": "musician",
        "subcategories": ["Mandolin"],
        "location": "Portland, OR",
        "budget_range": "$100-200 per show"
    },
    {
        "gig_type": "looking_for",
        "title": "Theater Production Needs Pit Orchestra Musicians",
        "description": "Community theater seeking musicians for spring musical production of 'Chicago'. Need trumpet, trombone, saxophone, and clarinet players. Rehearsals begin in March with performances in April. Must be able to read charts and follow conductor. Union rates apply.",
        "category": "musician",
        "subcategories": ["Trumpet", "Trombone", "Saxophone", "Clarinet"],
        "location": "Denver, CO",
        "budget_range": "Union scale"
    },
    
    # ==================== MUSICIANS - Can Provide ====================
    {
        "gig_type": "can_provide",
        "title": "Experienced Session Guitarist Available",
        "description": "Professional guitarist with 15+ years of experience available for studio sessions and live performances. Proficient in rock, blues, country, jazz, and pop styles. I have a home studio for remote recording with quick turnaround times. Credits include work with indie labels and touring acts. Rates negotiable for larger projects.",
        "category": "musician",
        "subcategories": ["Electric Guitar", "Acoustic Guitar"],
        "location": "Los Angeles, CA",
        "budget_range": "$100/hour studio, $300+ live"
    },
    {
        "gig_type": "can_provide",
        "title": "Professional Cellist for Hire",
        "description": "Classically trained cellist available for weddings, events, recording sessions, and private performances. Juilliard graduate with 10 years of professional experience. I can provide elegant solo cello, duo with violin, or full quartet arrangements. Extensive repertoire including classical, pop covers, and film music.",
        "category": "musician",
        "subcategories": ["Cello"],
        "location": "New York, NY",
        "budget_range": "$300-800 per event"
    },
    {
        "gig_type": "can_provide",
        "title": "Versatile Drummer for Sessions and Live Shows",
        "description": "Hard-hitting drummer with experience in rock, metal, pop, and country genres. I have my own professional kit and can provide backing tracks if needed. Available for studio sessions, live shows, and tours. I'm known for being reliable, easy to work with, and always prepared. Check out my YouTube channel for performance videos.",
        "category": "musician",
        "subcategories": ["Percussion"],
        "location": "Seattle, WA",
        "budget_range": "$150/hour studio, $250+ live"
    },
    {
        "gig_type": "can_provide",
        "title": "Professional Pianist for Events",
        "description": "Experienced pianist specializing in cocktail hour music, wedding ceremonies, and corporate events. I provide my own digital piano when needed. Repertoire includes jazz standards, classical pieces, pop hits, and custom requests. Background music or featured performance available.",
        "category": "musician",
        "subcategories": ["Piano", "Keyboards Synths"],
        "location": "Phoenix, AZ",
        "budget_range": "$200-500 per event"
    },
    {
        "gig_type": "can_provide",
        "title": "Male Vocalist Available for Recording",
        "description": "Professional male vocalist with a 3-octave range available for recording projects. Styles include R&B, pop, soul, and rock. I have a home studio setup for high-quality remote recordings. Fast turnaround and unlimited revisions included. Perfect for demos, albums, or commercial jingles.",
        "category": "musician",
        "subcategories": ["Singer Male"],
        "location": "Atlanta, GA",
        "budget_range": "$75-200 per song"
    },
    
    # ==================== AUDIO ENGINEERS - Looking For ====================
    {
        "gig_type": "looking_for",
        "title": "Need Mixing Engineer for Indie Rock Album",
        "description": "Indie rock band with 12 tracked songs looking for an experienced mixing engineer. We're going for a raw, authentic sound similar to The Strokes meets Arctic Monkeys. All tracks are recorded and edited. Looking for someone who understands the genre and can bring out the energy in our recordings.",
        "category": "audio_engineer",
        "subcategories": ["Mixing Engineers"],
        "location": "Remote OK",
        "budget_range": "$200-400 per song"
    },
    {
        "gig_type": "looking_for",
        "title": "Seeking Mastering Engineer for Hip-Hop EP",
        "description": "Independent rapper with a 6-track EP ready for mastering. Looking for an engineer experienced with modern hip-hop and trap music. Need someone who can get tracks loud and punchy while maintaining dynamics. Quick turnaround needed - release date is next month.",
        "category": "audio_engineer",
        "subcategories": ["Mastering Engineers"],
        "location": "Remote OK",
        "budget_range": "$50-100 per track"
    },
    {
        "gig_type": "looking_for",
        "title": "Podcast Needs Audio Editor",
        "description": "Weekly interview podcast looking for a reliable audio editor. Episodes are typically 60-90 minutes and need noise reduction, level balancing, and basic editing. We record remotely so audio quality varies. Looking for someone who can deliver consistent quality and meet weekly deadlines.",
        "category": "audio_engineer",
        "subcategories": ["Podcast Editing & Mastering", "Editing"],
        "location": "Remote",
        "budget_range": "$50-100 per episode"
    },
    {
        "gig_type": "looking_for",
        "title": "Film Production Seeking Sound Designer",
        "description": "Independent feature film in post-production seeking a sound designer. The film is a psychological thriller, 95 minutes long. Need original sound design, Foley, and ambient sound work. Experience with film is required. Will work with our composer on final mix.",
        "category": "audio_engineer",
        "subcategories": ["Sound Design", "Post Editing", "Post Mixing"],
        "location": "Los Angeles, CA",
        "budget_range": "$3,000-5,000 for project"
    },
    {
        "gig_type": "looking_for",
        "title": "Video Game Studio Needs Audio Designer",
        "description": "Indie game studio developing a roguelike RPG seeking audio designer for sound effects and ambient audio. We need approximately 200 sound effects and 5 ambient soundscapes. Experience with game audio implementation (FMOD/Wwise) is preferred but not required.",
        "category": "audio_engineer",
        "subcategories": ["Game Audio", "Sound Design"],
        "location": "Remote",
        "budget_range": "$2,000-4,000"
    },
    {
        "gig_type": "looking_for",
        "title": "Live Sound Engineer Needed for Tour",
        "description": "Regional touring act seeking FOH engineer for upcoming 3-week tour. Must have experience with medium-sized venues (500-2000 capacity). We carry our own console (X32) and IEM system. Tour covers the Southeast US. All travel and accommodations provided.",
        "category": "audio_engineer",
        "subcategories": ["Live Sound"],
        "location": "Southeast US Tour",
        "budget_range": "$300/day + expenses"
    },
    
    # ==================== AUDIO ENGINEERS - Can Provide ====================
    {
        "gig_type": "can_provide",
        "title": "Grammy-Nominated Mixing Engineer",
        "description": "Award-winning mixing engineer with 20+ years of experience and credits on platinum records. Specializing in rock, pop, and country. My mixes have been featured on Billboard charts and major streaming playlists. Studio equipped with analog summing, vintage outboard gear, and Dolby Atmos capability.",
        "category": "audio_engineer",
        "subcategories": ["Mixing Engineers", "Dolby Atmos & Immersive Audio"],
        "location": "Nashville, TN",
        "budget_range": "$500-1500 per song"
    },
    {
        "gig_type": "can_provide",
        "title": "Professional Music Producer Available",
        "description": "Full-service music producer specializing in pop, R&B, and electronic genres. I handle everything from songwriting and arrangement to final mix. My productions have been placed on TV shows, commercials, and streaming playlists. Collaborative approach - I work closely with artists to achieve their vision.",
        "category": "audio_engineer",
        "subcategories": ["Producers", "Full Instrumental Productions", "Mixing Engineers"],
        "location": "Miami, FL",
        "budget_range": "$1,000-5,000 per song"
    },
    {
        "gig_type": "can_provide",
        "title": "Vocal Tuning and Editing Specialist",
        "description": "Expert vocal editor offering professional tuning, timing, and comping services. I use Melodyne and manual techniques for natural-sounding results. Fast turnaround - most projects completed within 24-48 hours. Specializing in pop, R&B, and country vocals.",
        "category": "audio_engineer",
        "subcategories": ["Vocal Tuning", "Vocal Comping", "Editing"],
        "location": "Remote",
        "budget_range": "$30-75 per song"
    },
    {
        "gig_type": "can_provide",
        "title": "Live Recording and Remote Session Services",
        "description": "Professional drummer offering remote drum tracking services. My studio features a treated room with multiple mic options for various sounds. I can play any style from jazz brushes to heavy metal double bass. Quick turnaround and unlimited revisions. Video of session included.",
        "category": "audio_engineer",
        "subcategories": ["Live Drum Tracks", "Programmed Drums"],
        "location": "Remote",
        "budget_range": "$100-250 per song"
    },
    {
        "gig_type": "can_provide",
        "title": "Film Composer and Score Producer",
        "description": "Experienced film composer available for indie films, documentaries, and commercials. I compose orchestral, electronic, and hybrid scores. My work has been featured at Sundance and SXSW film festivals. Full production included - no need for separate orchestration or mixing.",
        "category": "audio_engineer",
        "subcategories": ["Film Composers", "Composer Orchestral", "Sound Design"],
        "location": "Los Angeles, CA",
        "budget_range": "$5,000-25,000 per project"
    },
    
    # ==================== RECORDING STUDIOS - Looking For ====================
    {
        "gig_type": "looking_for",
        "title": "Band Seeking Recording Studio for Full Album",
        "description": "5-piece rock band looking for a professional recording studio to track our debut album. Need a space that can accommodate live tracking of the full band. Looking for about 2 weeks of studio time including mixing. Experienced engineer preferred but we can bring our own.",
        "category": "recording_studio",
        "subcategories": ["Recording Studios"],
        "location": "Chicagoland Area",
        "budget_range": "$5,000-10,000"
    },
    {
        "gig_type": "looking_for",
        "title": "Need Rehearsal Space for Band",
        "description": "4-piece indie band looking for a rehearsal space to rent monthly. Need room for drums, bass, two guitars, and vocal PA. Ideally 24/7 access or at least late-night availability. Climate controlled is a must. Would prefer a space where we can leave gear set up.",
        "category": "recording_studio",
        "subcategories": ["Rehearsal Rooms"],
        "location": "Brooklyn, NY",
        "budget_range": "$500-800/month"
    },
    {
        "gig_type": "looking_for",
        "title": "Podcast Looking for Recording Space",
        "description": "Popular podcast seeking a professional recording space in Manhattan for in-person interviews. Need a quiet, acoustically treated room with multiple mic setups. Will need space about 2-3 times per month for 3-hour sessions. Video capability is a plus.",
        "category": "recording_studio",
        "subcategories": ["Podcast Editing & Mastering", "Recording Studios"],
        "location": "Manhattan, NY",
        "budget_range": "$100-200/hour"
    },
    
    # ==================== RECORDING STUDIOS - Can Provide ====================
    {
        "gig_type": "can_provide",
        "title": "Professional Recording Studio - Hourly/Daily Rates",
        "description": "State-of-the-art recording studio available for booking. Features include SSL console, ProTools HDX, iso booth, live room (fits 8 musicians), and extensive mic collection. Located in a creative arts district with easy parking. Engineer included or bring your own. Backline available.",
        "category": "recording_studio",
        "subcategories": ["Recording Studios"],
        "location": "Austin, TX",
        "budget_range": "$75/hour, $500/day"
    },
    {
        "gig_type": "can_provide",
        "title": "Affordable Home Studio for Indie Artists",
        "description": "Home studio available for singer-songwriters and small projects. Comfortable, creative environment with quality gear including Neumann mics, Universal Audio interfaces, and treated room. I provide engineering services included in the rate. Perfect for demos, EPs, and single releases.",
        "category": "recording_studio",
        "subcategories": ["Recording Studios", "Producers"],
        "location": "Portland, OR",
        "budget_range": "$50/hour with engineer"
    },
    {
        "gig_type": "can_provide",
        "title": "Rehearsal Rooms Available - Monthly Rental",
        "description": "Multiple rehearsal rooms available for monthly rental in converted warehouse space. Rooms range from 200-500 sq ft. All rooms are soundproofed and climate controlled. 24/7 access with security system. Common area with lounge and vending machines. Long-term rates available.",
        "category": "recording_studio",
        "subcategories": ["Rehearsal Rooms"],
        "location": "Denver, CO",
        "budget_range": "$400-800/month"
    },
    {
        "gig_type": "can_provide",
        "title": "Dolby Atmos Mixing Studio",
        "description": "Certified Dolby Atmos mixing room available for immersive audio projects. Full 7.1.4 speaker system with calibrated room. Ideal for music, film, and gaming projects. Experienced Atmos mixer on staff. Can accommodate stem delivery or full mix from scratch.",
        "category": "recording_studio",
        "subcategories": ["Dolby Atmos & Immersive Audio", "Mixing Engineers", "Surround 5.1 Mixing"],
        "location": "Los Angeles, CA",
        "budget_range": "$200/hour, $1500/day"
    },
    
    # ==================== VENUES - Looking For ====================
    {
        "gig_type": "looking_for",
        "title": "Band Seeking Venue for Album Release Show",
        "description": "Local rock band looking for a venue to host our album release party. Expecting 150-200 guests. Need a stage, PA system, and bar service. Ideal date is Saturday in late March. We can provide our own sound engineer. Looking for a venue that supports original music.",
        "category": "venue",
        "subcategories": ["Club", "Bar"],
        "location": "San Francisco, CA",
        "budget_range": "Door deal or reasonable rental"
    },
    {
        "gig_type": "looking_for",
        "title": "Seeking Venue for Private Corporate Event",
        "description": "Tech company looking for a unique venue for annual holiday party. Need space for 300 guests with room for a live band, dance floor, and catering setup. Prefer industrial or modern aesthetic. Date is December 15th, evening event running 7pm-midnight.",
        "category": "venue",
        "subcategories": ["Private Event Space", "Warehouse"],
        "location": "Seattle, WA",
        "budget_range": "$5,000-10,000"
    },
    {
        "gig_type": "looking_for",
        "title": "Classical Ensemble Needs Concert Hall",
        "description": "Chamber music ensemble seeking a small concert hall or church for a spring recital series. Need excellent acoustics, seating for 100-150, and a quality piano. Would like to book 3 consecutive Sundays in April for afternoon performances.",
        "category": "venue",
        "subcategories": ["Concert Hall", "Church"],
        "location": "Philadelphia, PA",
        "budget_range": "$500-1000 per date"
    },
    {
        "gig_type": "looking_for",
        "title": "Outdoor Wedding Venue Needed",
        "description": "Couple seeking an outdoor venue for September wedding ceremony and reception. Need space for 120 guests, beautiful natural scenery, and ability to bring in catering and a live band. Backup indoor option for weather is preferred.",
        "category": "venue",
        "subcategories": ["Outdoor Amphitheater", "Private Event Space"],
        "location": "Napa Valley, CA",
        "budget_range": "$3,000-8,000"
    },
    
    # ==================== VENUES - Can Provide ====================
    {
        "gig_type": "can_provide",
        "title": "Historic Theater Available for Events",
        "description": "Beautiful 1920s theater available for concerts, film screenings, corporate events, and private parties. Seating capacity of 450 with original art deco details. Full stage, professional sound and lighting, green rooms, and lobby space for receptions. Technical staff included.",
        "category": "venue",
        "subcategories": ["Theater", "Concert Hall"],
        "location": "Detroit, MI",
        "budget_range": "$2,000-5,000 per event"
    },
    {
        "gig_type": "can_provide",
        "title": "Intimate Jazz Club - Now Booking",
        "description": "Renowned jazz club seeking artists for our nightly programming. Capacity 80, excellent acoustics, quality house PA and backline. We feature local and touring jazz, blues, and acoustic acts. Door deal plus guarantee available for established artists.",
        "category": "venue",
        "subcategories": ["Club", "Bar"],
        "location": "New Orleans, LA",
        "budget_range": "Door deal + $200-500 guarantee"
    },
    {
        "gig_type": "can_provide",
        "title": "Rooftop Event Space with City Views",
        "description": "Stunning rooftop venue available for private events, album releases, and fashion shows. 360-degree city views, retractable cover for weather, built-in bar, and DJ booth. Capacity 200 standing, 100 seated. Full event coordination available.",
        "category": "venue",
        "subcategories": ["Rooftop", "Private Event Space"],
        "location": "Chicago, IL",
        "budget_range": "$3,000-7,000"
    },
    {
        "gig_type": "can_provide",
        "title": "Community Arts Center - Affordable Rental",
        "description": "Non-profit community center with performance space, art gallery, and meeting rooms. Main hall seats 150, full stage with basic sound and lighting. We support local artists with affordable rates. Technical assistance available. On-site parking.",
        "category": "venue",
        "subcategories": ["Community Center", "Gallery"],
        "location": "Minneapolis, MN",
        "budget_range": "$200-600 per event"
    },
    
    # ==================== MERCHANTS - Looking For ====================
    {
        "gig_type": "looking_for",
        "title": "Band Looking for Merch Designer",
        "description": "Touring rock band seeking a graphic designer to create our merchandise line. Need designs for t-shirts, hoodies, posters, and stickers. Looking for a bold, modern aesthetic that fits our heavy rock sound. This would be an ongoing relationship as we release new designs seasonally.",
        "category": "merchant",
        "subcategories": ["Shirts", "Hoodies", "Posters", "Stickers"],
        "location": "Remote",
        "budget_range": "$500-1000 for initial collection"
    },
    {
        "gig_type": "looking_for",
        "title": "Seeking Vinyl Pressing Plant Recommendations",
        "description": "Independent record label looking for reliable vinyl pressing plant for upcoming releases. Need someone who can handle small runs (300-500 units) with quality control. Interested in colored vinyl options. Looking for competitive pricing and reasonable turnaround times.",
        "category": "merchant",
        "subcategories": ["Vinyl Records"],
        "location": "Remote",
        "budget_range": "Market rate"
    },
    {
        "gig_type": "looking_for",
        "title": "Guitar Tech Supplies Needed",
        "description": "Guitar repair shop looking for wholesale suppliers of guitar parts and accessories. Need reliable source for tuning machines, bridges, pickups, nuts, and saddles. Prefer domestic supplier with quick shipping. Looking to establish ongoing business relationship.",
        "category": "merchant",
        "subcategories": ["Strings", "Accessories", "Other Merchandise"],
        "location": "USA",
        "budget_range": "Wholesale pricing"
    },
    
    # ==================== MERCHANTS - Can Provide ====================
    {
        "gig_type": "can_provide",
        "title": "Custom Band Merchandise Printing",
        "description": "Full-service merch company specializing in bands and musicians. We handle design, printing, and fulfillment. High-quality screen printing and DTG options. No minimum orders. We've worked with indie artists and major label acts. Quick turnaround and competitive pricing.",
        "category": "merchant",
        "subcategories": ["Shirts", "Hoodies", "Hats", "Accessories"],
        "location": "Nationwide shipping",
        "budget_range": "Starting at $8/shirt for bulk orders"
    },
    {
        "gig_type": "can_provide",
        "title": "Vintage Guitar Shop - Rare Finds",
        "description": "Curated collection of vintage and rare guitars available. Specializing in 1950s-1980s American guitars. All instruments professionally set up and documented. Consignment services available for sellers. Located in historic music district with showroom.",
        "category": "merchant",
        "subcategories": ["Other Merchandise", "Accessories"],
        "location": "Nashville, TN",
        "budget_range": "$500-50,000"
    },
    {
        "gig_type": "can_provide",
        "title": "Independent Record Store - Vinyl Distribution",
        "description": "Established independent record store offering consignment and distribution for local artists. We stock vinyl, CDs, and cassettes. Strong community presence with regular in-store performances. Fair terms for artists. Get your music in front of real music lovers.",
        "category": "merchant",
        "subcategories": ["Vinyl Records", "CDs"],
        "location": "Portland, OR",
        "budget_range": "60/40 consignment split"
    },
    {
        "gig_type": "can_provide",
        "title": "Premium Guitar Straps - Handmade",
        "description": "Artisan leather workshop creating custom guitar straps for musicians. Each strap is handmade from full-grain leather with premium hardware. Custom tooling, embossing, and color options available. Perfect for the discerning player who wants something unique.",
        "category": "merchant",
        "subcategories": ["Straps", "Accessories"],
        "location": "Ships worldwide",
        "budget_range": "$75-300 per strap"
    },
    {
        "gig_type": "can_provide",
        "title": "Music Festival Merchandise Services",
        "description": "Complete festival merch solutions from booth setup to point-of-sale. We handle inventory, staffing, and cash/card processing. Experience with festivals of all sizes from 500 to 50,000 attendees. Let us handle the merch so you can focus on the music.",
        "category": "merchant",
        "subcategories": ["Shirts", "Accessories", "Posters", "Other Merchandise"],
        "location": "Nationwide",
        "budget_range": "Commission-based or flat fee"
    },
]

async def seed_gigs():
    """Seed the database with sample gigs"""
    await connect_to_mongo()
    db = get_database()
    
    # Get a sample user to associate gigs with
    # First try to find the admin user
    admin_user = await db.users.find_one({"username": "miclocker.support"})
    
    if not admin_user:
        print("Admin user not found, creating temporary user for seed data")
        admin_user = {
            "id": str(uuid.uuid4()),
            "username": "demo_user",
            "profile_image": None
        }
    
    # Also try to find some other users for variety
    other_users = await db.users.find({"username": {"$ne": "miclocker.support"}}).to_list(length=10)
    all_users = [admin_user] + other_users if other_users else [admin_user]
    
    print(f"Found {len(all_users)} users for seed data")
    
    # Clear existing seed gigs (optional - comment out to append)
    # await db.gigs.delete_many({})
    
    created_count = 0
    
    for i, gig_data in enumerate(SAMPLE_GIGS):
        # Rotate through available users
        user = all_users[i % len(all_users)]
        
        gig = {
            "id": str(uuid.uuid4()),
            "user_id": user.get("id", user.get("_id")),
            "username": user.get("username", "demo_user"),
            "user_profile_image": user.get("profile_image"),
            "gig_type": gig_data["gig_type"],
            "title": gig_data["title"],
            "description": gig_data["description"],
            "category": gig_data["category"],
            "subcategories": gig_data["subcategories"],
            "media": [],
            "social_links": gig_data.get("social_links"),
            "contact_email": f"contact{i}@example.com",
            "contact_phone": f"555-{100+i:03d}-{1000+i:04d}" if random.random() > 0.3 else None,
            "location": gig_data["location"],
            "budget_range": gig_data["budget_range"],
            "is_active": True,
            "view_count": random.randint(0, 150),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.gigs.insert_one(gig)
        created_count += 1
        print(f"Created gig {created_count}: {gig['title'][:50]}...")
    
    print(f"\n✅ Successfully created {created_count} seed gigs!")
    
    # Print summary by category
    for cat in ["musician", "audio_engineer", "recording_studio", "venue", "merchant"]:
        count = await db.gigs.count_documents({"category": cat})
        print(f"  - {cat}: {count} gigs")
    
    # Print summary by type
    looking_for = await db.gigs.count_documents({"gig_type": "looking_for"})
    can_provide = await db.gigs.count_documents({"gig_type": "can_provide"})
    print(f"\n  - Looking For: {looking_for}")
    print(f"  - Can Provide: {can_provide}")

if __name__ == "__main__":
    asyncio.run(seed_gigs())
