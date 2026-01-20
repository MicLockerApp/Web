"""
Seed data script for reviews and sample orders
Run with: python seed_reviews.py
"""
import asyncio
from datetime import datetime, timedelta
import uuid
import random
import sys
sys.path.insert(0, '/app/backend')

# Sample review comments for buyers reviewing sellers
BUYER_TO_SELLER_COMMENTS = [
    "Fantastic seller! The guitar arrived in perfect condition, exactly as described. Fast shipping and great communication throughout. Would definitely buy from again!",
    "Excellent transaction. The amp was even better than expected. Seller was very helpful answering my questions before purchase.",
    "Super fast shipping and item was packed incredibly well. The mic sounds amazing. Highly recommend this seller!",
    "Great experience! Seller was very responsive and the item arrived quickly. The bass is in pristine condition.",
    "Item exactly as described. Quick shipping. Very professional seller. The keyboard works perfectly!",
    "Amazing seller! Went above and beyond to ensure the package arrived safely. The mixer is in great shape.",
    "Smooth transaction from start to finish. The pedal works great and was shipped quickly. Thanks!",
    "Very happy with my purchase. The synth is exactly what I was looking for. Seller provided great photos and description.",
    "Perfect condition item, fast shipping, and excellent communication. Would buy from this seller again in a heartbeat.",
    "The drum kit arrived safely and sounds incredible. Seller was patient with all my questions. Highly recommended!",
    "Couldn't be happier! The monitor speakers are crystal clear. Seller is a true professional.",
    "Quick and easy transaction. Item was well-packaged and arrived on time. Great seller!",
    "The vintage guitar is stunning! Seller provided detailed history and condition report. 5 stars!",
    "Responsive seller with fast shipping. The audio interface works perfectly. Thank you!",
    "Exactly as pictured. Arrived quickly and securely packaged. Would definitely recommend.",
]

# Sample review comments for sellers reviewing buyers
SELLER_TO_BUYER_COMMENTS = [
    "Excellent buyer! Payment was immediate and communication was great. Would love to sell to again.",
    "Great transaction. Buyer was very responsive and payment was prompt. Highly recommended!",
    "Perfect buyer - fast payment and clear communication throughout. Thank you!",
    "Wonderful buyer to work with. Payment processed quickly and they were very understanding.",
    "A+ buyer! Quick payment and easy to work with. Would gladly sell to again.",
    "Fantastic buyer. Prompt payment and great communication. Smooth transaction!",
    "Excellent experience. Buyer paid quickly and was very courteous. Highly recommend!",
    "Great buyer - fast payment, great communication. Made selling easy!",
    "Perfect transaction. Buyer was patient and payment was immediate. Thank you!",
    "Wonderful to deal with. Payment was prompt and buyer confirmed receipt quickly.",
    "Smooth sale! Buyer was communicative and payment was fast. 5 stars!",
    "Excellent buyer. Very professional and easy to work with. Would sell to again!",
    "Great experience selling to this buyer. Quick payment and pleasant communication.",
    "A pleasure to deal with! Payment was immediate and communication was excellent.",
    "Fantastic buyer. Everything went smoothly. Highly recommended!",
]

async def seed_all():
    """Main function to seed all review data"""
    from database import get_database, connect_to_mongo
    
    await connect_to_mongo()
    db = get_database()
    
    print("Starting review seeding process...")
    
    # Get existing users
    users = await db.users.find({"is_employee": {"$ne": True}}).to_list(length=100)
    
    if len(users) < 2:
        print("Not enough users in database. Please create users first.")
        return False
    
    print(f"Found {len(users)} users")
    
    # Get existing listings
    listings = await db.listings.find({"status": "active"}).to_list(length=100)
    
    if len(listings) < 3:
        print("Not enough active listings. Please create listings first.")
        return False
    
    print(f"Found {len(listings)} active listings")
    
    # Get existing completed orders or create sample ones
    existing_orders = await db.orders.find({
        "status": {"$in": ["delivered", "completed"]}
    }).to_list(length=100)
    
    if len(existing_orders) < 5:
        print("Creating sample completed orders...")
        orders = await create_sample_orders(db, users, listings)
    else:
        orders = existing_orders
        print(f"Using {len(orders)} existing completed orders")
    
    # Create reviews for those orders
    reviews_created = await create_sample_reviews(db, orders)
    
    # Update user ratings
    await update_all_user_ratings(db)
    
    print(f"\n✅ Seed data complete!")
    print(f"   - Used {len(orders)} orders")
    print(f"   - Created {reviews_created} reviews")
    
    return True


async def create_sample_orders(db, users, listings):
    """Create sample completed orders"""
    orders = []
    
    # Create 15-20 sample orders
    num_orders = min(20, len(listings) * 2)
    
    for i in range(num_orders):
        listing = random.choice(listings)
        
        # Find a buyer that's not the seller
        potential_buyers = [u for u in users if u["id"] != listing.get("seller_id")]
        if not potential_buyers:
            continue
        buyer = random.choice(potential_buyers)
        
        order_id = str(uuid.uuid4())
        order = {
            "id": order_id,
            "order_number": f"ORD-{100000 + i}",
            "buyer_id": buyer["id"],
            "buyer_username": buyer.get("username", "Unknown"),
            "status": random.choice(["delivered", "completed"]),
            "items": [{
                "listing_id": listing["id"],
                "listing_title": listing.get("title", "Unknown Item"),
                "listing_price": listing.get("price", 0),
                "listing_image": listing.get("images", [None])[0] if listing.get("images") else None,
                "seller_id": listing.get("seller_id"),
                "seller_username": listing.get("seller_username", "Unknown"),
                "quantity": 1,
                "shipping_cost": listing.get("shipping_price", 0),
            }],
            "subtotal": listing.get("price", 0),
            "shipping_total": listing.get("shipping_price", 0),
            "total": listing.get("price", 0) + listing.get("shipping_price", 0),
            "shipping_address": {
                "full_name": buyer.get("username", "Test User"),
                "address_line1": "123 Main Street",
                "city": "Los Angeles",
                "state": "CA",
                "postal_code": "90001",
                "country": "US"
            },
            "created_at": datetime.utcnow() - timedelta(days=random.randint(5, 90)),
        }
        
        await db.orders.insert_one(order)
        orders.append(order)
        print(f"  Created order: {order['order_number']} - {listing.get('title', 'Unknown')[:50]}")
    
    return orders


async def create_sample_reviews(db, orders):
    """Create bidirectional reviews for completed orders"""
    reviews_created = 0
    
    for order in orders:
        if not order.get("items"):
            continue
            
        item = order["items"][0]
        
        # Check if reviews already exist for this order
        existing = await db.reviews.find_one({"order_id": order["id"]})
        if existing:
            continue
        
        # Buyer reviews seller (80% chance)
        if random.random() < 0.8:
            buyer_review = {
                "id": str(uuid.uuid4()),
                "order_id": order["id"],
                "listing_id": item.get("listing_id"),
                "listing_title": item.get("listing_title", "Unknown"),
                "reviewer_id": order["buyer_id"],
                "reviewer_username": order.get("buyer_username", "Unknown"),
                "reviewer_role": "buyer",
                "reviewee_id": item.get("seller_id"),
                "reviewee_username": item.get("seller_username", "Unknown"),
                "reviewee_role": "seller",
                "buyer_id": order["buyer_id"],
                "buyer_username": order.get("buyer_username", "Unknown"),
                "seller_id": item.get("seller_id"),
                "seller_username": item.get("seller_username", "Unknown"),
                "rating": random.choices([5, 5, 5, 4, 4, 3], weights=[40, 25, 15, 10, 7, 3])[0],
                "comment": random.choice(BUYER_TO_SELLER_COMMENTS),
                "review_type": "buyer_to_seller",
                "is_public": True,
                "created_at": order.get("created_at", datetime.utcnow()) + timedelta(days=random.randint(1, 7)),
            }
            await db.reviews.insert_one(buyer_review)
            reviews_created += 1
        
        # Seller reviews buyer (60% chance)
        if random.random() < 0.6:
            seller_review = {
                "id": str(uuid.uuid4()),
                "order_id": order["id"],
                "listing_id": item.get("listing_id"),
                "listing_title": item.get("listing_title", "Unknown"),
                "reviewer_id": item.get("seller_id"),
                "reviewer_username": item.get("seller_username", "Unknown"),
                "reviewer_role": "seller",
                "reviewee_id": order["buyer_id"],
                "reviewee_username": order.get("buyer_username", "Unknown"),
                "reviewee_role": "buyer",
                "buyer_id": order["buyer_id"],
                "buyer_username": order.get("buyer_username", "Unknown"),
                "seller_id": item.get("seller_id"),
                "seller_username": item.get("seller_username", "Unknown"),
                "rating": random.choices([5, 5, 5, 4, 4, 3], weights=[45, 25, 15, 8, 5, 2])[0],
                "comment": random.choice(SELLER_TO_BUYER_COMMENTS),
                "review_type": "seller_to_buyer",
                "is_public": True,
                "created_at": order.get("created_at", datetime.utcnow()) + timedelta(days=random.randint(1, 7)),
            }
            await db.reviews.insert_one(seller_review)
            reviews_created += 1
    
    print(f"  Created {reviews_created} reviews")
    return reviews_created


async def update_all_user_ratings(db):
    """Update ratings for all users based on their reviews"""
    users = await db.users.find({}).to_list(length=1000)
    updated = 0
    
    for user in users:
        reviews = await db.reviews.find({"reviewee_id": user["id"]}).to_list(length=1000)
        
        if not reviews:
            continue
        
        # Calculate overall rating
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        
        # Separate by role
        seller_reviews = [r for r in reviews if r.get("reviewee_role") == "seller"]
        buyer_reviews = [r for r in reviews if r.get("reviewee_role") == "buyer"]
        
        update_data = {
            "rating": round(avg_rating, 2),
            "review_count": len(reviews)
        }
        
        if seller_reviews:
            update_data["seller_rating"] = round(sum(r["rating"] for r in seller_reviews) / len(seller_reviews), 2)
            update_data["seller_review_count"] = len(seller_reviews)
        
        if buyer_reviews:
            update_data["buyer_rating"] = round(sum(r["rating"] for r in buyer_reviews) / len(buyer_reviews), 2)
            update_data["buyer_review_count"] = len(buyer_reviews)
        
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": update_data}
        )
        updated += 1
        print(f"  Updated ratings for {user.get('username', 'Unknown')}: {avg_rating:.1f} ({len(reviews)} reviews)")
    
    print(f"  Updated {updated} user ratings")


if __name__ == "__main__":
    asyncio.run(seed_all())
