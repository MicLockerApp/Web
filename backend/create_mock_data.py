import asyncio
from database import get_database
from models.order import OrderInDB, OrderItem, ShippingAddress, PaymentInfo
from models.review import ReviewInDB
from models.offer import OfferInDB
from datetime import datetime, timedelta
import uuid
import random
import logging

logger = logging.getLogger(__name__)

async def create_mock_orders():
    """Create mock orders to demonstrate payment flow"""
    database = get_database()
    
    # Check if we already have orders
    order_count = await database.orders.count_documents({})
    if order_count > 0:
        logger.info("Orders already exist, skipping mock order creation")
        return
    
    logger.info("Creating mock orders and reviews...")
    
    # Get users and listings
    users = await database.users.find({}).to_list(length=100)
    listings = await database.listings.find({"status": "active"}).to_list(length=100)
    
    if len(users) < 2 or len(listings) < 2:
        logger.warning("Not enough users or listings for mock orders")
        return
    
    # Filter out admin user as buyer
    buyers = [u for u in users if not u.get("is_admin")]
    sellers_with_listings = {}
    
    for listing in listings:
        seller_id = listing["seller_id"]
        if seller_id not in sellers_with_listings:
            sellers_with_listings[seller_id] = []
        sellers_with_listings[seller_id].append(listing)
    
    order_statuses = ["paid", "shipped", "delivered", "completed"]
    
    created_orders = []
    
    # Create orders between different users
    for i, buyer in enumerate(buyers[:4]):
        # Find a listing not owned by this buyer
        available_listings = [l for l in listings if l["seller_id"] != buyer["id"]]
        
        if not available_listings:
            continue
        
        listing = random.choice(available_listings)
        seller = next((u for u in users if u["id"] == listing["seller_id"]), None)
        
        if not seller:
            continue
        
        status = order_statuses[i % len(order_statuses)]
        
        # Create order
        order = OrderInDB(
            buyer_id=buyer["id"],
            buyer_username=buyer["username"],
            items=[OrderItem(
                listing_id=listing["id"],
                listing_title=listing["title"],
                listing_price=listing["price"],
                listing_image=listing.get("media", [{}])[0].get("url") if listing.get("media") else None,
                quantity=1,
                shipping_cost=listing.get("shipping", {}).get("price", 15.00),
                seller_id=listing["seller_id"],
                seller_username=listing["seller_username"]
            ).model_dump()],
            shipping_address=ShippingAddress(
                full_name=buyer["username"].title() + " User",
                address_line1="123 Music Lane",
                city="Nashville",
                state="TN",
                postal_code="37203",
                country="USA",
                phone="555-123-4567"
            ).model_dump(),
            payment_info=PaymentInfo(
                method="card",
                card_last_four="4242",
                transaction_id=f"MOCK-{str(uuid.uuid4())[:8].upper()}"
            ).model_dump(),
            subtotal=listing["price"],
            shipping_total=listing.get("shipping", {}).get("price", 15.00),
            platform_fee=round(listing["price"] * 0.03, 2),  # 3% platform fee
            payment_processing_fee=round(listing["price"] * 0.029 + 0.30, 2),  # Payment processor fee
            total=round(listing["price"] + listing.get("shipping", {}).get("price", 15.00) + listing["price"] * 0.029 + 0.30, 2),
            status=status,
            created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30)),
            paid_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
        )
        
        if status in ["shipped", "delivered", "completed"]:
            order.shipped_at = datetime.utcnow() - timedelta(days=random.randint(1, 10))
        if status in ["delivered", "completed"]:
            order.delivered_at = datetime.utcnow() - timedelta(days=random.randint(1, 5))
        if status == "completed":
            order.completed_at = datetime.utcnow() - timedelta(days=random.randint(1, 3))
        
        await database.orders.insert_one(order.model_dump())
        created_orders.append(order)
        logger.info(f"Created order {order.order_number} ({status}) for {buyer['username']}")
        
        # Create review for completed/delivered orders
        if status in ["delivered", "completed"]:
            review = ReviewInDB(
                order_id=order.id,
                listing_id=listing["id"],
                listing_title=listing["title"],
                buyer_id=buyer["id"],
                buyer_username=buyer["username"],
                seller_id=listing["seller_id"],
                seller_username=listing["seller_username"],
                rating=random.randint(4, 5),
                comment=random.choice([
                    "Great seller! Item was exactly as described and shipped quickly.",
                    "Excellent condition, fast shipping. Would buy from again!",
                    "Perfect transaction. Highly recommended!",
                    "Item arrived quickly and in perfect condition. A+ seller!",
                    "Fantastic experience! Professional packaging and quick communication."
                ]),
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 3))
            )
            await database.reviews.insert_one(review.model_dump())
            logger.info(f"Created review for order {order.order_number}")
    
    # Create some pending offers
    for buyer in buyers[:3]:
        available_listings = [l for l in listings if l["seller_id"] != buyer["id"]]
        if not available_listings:
            continue
        
        listing = random.choice(available_listings)
        seller = next((u for u in users if u["id"] == listing["seller_id"]), None)
        if not seller:
            continue
        
        offer = OfferInDB(
            listing_id=listing["id"],
            listing_title=listing["title"],
            listing_price=listing["price"],
            listing_image=listing.get("media", [{}])[0].get("url") if listing.get("media") else None,
            buyer_id=buyer["id"],
            buyer_username=buyer["username"],
            seller_id=listing["seller_id"],
            seller_username=listing["seller_username"],
            offer_price=round(listing["price"] * 0.85, 2),  # 15% below asking
            message="Would you consider this offer? I can pay right away!",
            status=random.choice(["pending", "countered"]),
            expires_at=datetime.utcnow() + timedelta(hours=48)
        )
        
        if offer.status == "countered":
            offer.counter_price = round(listing["price"] * 0.92, 2)
            offer.counter_message = "I can meet you halfway. Let me know!"
        
        await database.offers.insert_one(offer.model_dump())
        logger.info(f"Created offer for {listing['title']} from {buyer['username']}")
    
    logger.info(f"Created {len(created_orders)} mock orders with reviews and offers")

if __name__ == "__main__":
    asyncio.run(create_mock_orders())
