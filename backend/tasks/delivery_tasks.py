"""
Scheduled Tasks for MicLocker

Handles:
- Auto-delivery confirmation after 14 days
- Fund release automation
- 5-day review reminders
- Cleanup tasks
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
import uuid

from database import get_database
from config import settings
from services.stripe_connect import stripe_connect_service

logger = logging.getLogger(__name__)


async def send_five_day_review_reminders():
    """
    Send review reminder messages to buyers and sellers 5 days after purchase.
    
    This encourages both parties to leave reviews for completed transactions.
    """
    db = get_database()
    cutoff_date = datetime.utcnow() - timedelta(days=5)
    cutoff_date_end = cutoff_date - timedelta(hours=1)  # 1-hour window to avoid duplicates
    
    logger.info(f"Running 5-day review reminders for orders paid around {cutoff_date}")
    
    # Find paid orders from ~5 days ago that haven't had reminders sent
    orders = await db.orders.find({
        "status": {"$in": ["paid", "shipped", "delivered", "completed"]},
        "paid_at": {"$lt": cutoff_date, "$gt": cutoff_date_end},
        "five_day_reminder_sent": {"$ne": True}
    }).to_list(length=100)
    
    reminder_count = 0
    system_user = await db.users.find_one({"is_system_user": True})
    system_user_id = system_user["id"] if system_user else "system-support"
    
    for order in orders:
        try:
            # Get frontend URL for direct links
            frontend_url = settings.frontend_url
            order_link = f"{frontend_url}/orders/{order['id']}"
            
            # Send reminder to buyer
            await send_review_reminder_message(
                db, system_user_id, 
                order["buyer_id"],
                order,
                is_buyer=True,
                order_link=order_link
            )
            
            # Send reminder to seller(s)
            seller_ids = list(set(item["seller_id"] for item in order["items"]))
            for seller_id in seller_ids:
                await send_review_reminder_message(
                    db, system_user_id,
                    seller_id,
                    order,
                    is_buyer=False,
                    order_link=order_link
                )
            
            # Mark reminder as sent
            await db.orders.update_one(
                {"id": order["id"]},
                {"$set": {"five_day_reminder_sent": True, "updated_at": datetime.utcnow()}}
            )
            
            reminder_count += 1
            logger.info(f"Sent 5-day review reminders for order {order['order_number']}")
            
        except Exception as e:
            logger.error(f"Error sending review reminder for order {order['id']}: {e}")
    
    logger.info(f"Sent {reminder_count} review reminder sets")
    return reminder_count


async def send_review_reminder_message(db, system_user_id: str, user_id: str, order: dict, is_buyer: bool, order_link: str):
    """Send an in-app review reminder message to a user"""
    
    # Get or create message thread
    thread = await db.message_threads.find_one({
        "participants": {"$all": [system_user_id, user_id], "$size": 2}
    })
    
    if not thread:
        thread = {
            "id": str(uuid.uuid4()),
            "participants": [system_user_id, user_id],
            "created_at": datetime.utcnow(),
            "last_message_at": datetime.utcnow()
        }
        await db.message_threads.insert_one(thread)
    
    # Check if user has already reviewed
    review_type = "buyer_to_seller" if is_buyer else "seller_to_buyer"
    existing_review = await db.reviews.find_one({
        "order_id": order["id"],
        "review_type": review_type
    })
    
    if existing_review:
        # Already reviewed, skip
        return
    
    if is_buyer:
        other_party = order["items"][0]["seller_username"]
        message_content = f"""⭐ **Time to Leave a Review!**

It's been 5 days since your purchase of **Order #{order['order_number']}**.

We'd love to hear about your experience! Your review helps:
- Other buyers make informed decisions
- Sellers build their reputation
- Keep our community trustworthy

**[Click here to review your seller]({order_link})**

Thank you for being part of the MicLocker community!

---
*If you haven't received your item yet, no worries! You can leave a review once it arrives.*
"""
    else:
        other_party = order.get("buyer_username", "the buyer")
        message_content = f"""⭐ **Time to Leave a Review!**

It's been 5 days since your sale on **Order #{order['order_number']}**.

Please take a moment to review your buyer, {other_party}. Your feedback helps:
- Build trust in our community
- Help other sellers know who they're dealing with
- Complete the transaction cycle

**[Click here to review your buyer]({order_link})**

Thank you for selling on MicLocker!
"""
    
    message = {
        "id": str(uuid.uuid4()),
        "thread_id": thread["id"],
        "sender_id": system_user_id,
        "content": message_content,
        "created_at": datetime.utcnow(),
        "read_at": None
    }
    await db.messages.insert_one(message)
    
    await db.message_threads.update_one(
        {"id": thread["id"]},
        {"$set": {"last_message_at": datetime.utcnow()}}
    )


async def auto_confirm_deliveries():
    """
    Automatically confirm delivery for shipped orders after 14 days
    
    This protects sellers by automatically releasing funds if the buyer
    doesn't confirm delivery within the specified timeframe.
    """
    db = get_database()
    auto_days = settings.auto_delivery_days
    cutoff_date = datetime.utcnow() - timedelta(days=auto_days)
    
    logger.info(f"Running auto-delivery confirmation for orders shipped before {cutoff_date}")
    
    # Find shipped orders that haven't been delivered and were shipped more than X days ago
    shipped_orders = await db.orders.find({
        "status": "shipped",
        "shipped_at": {"$lt": cutoff_date}
    }).to_list(length=100)
    
    confirmed_count = 0
    
    for order in shipped_orders:
        try:
            # Update order status
            await db.orders.update_one(
                {"id": order["id"]},
                {"$set": {
                    "status": "delivered",
                    "delivered_at": datetime.utcnow(),
                    "payment_info.funds_status": "released",
                    "seller_payout_status": "released",
                    "funds_released_at": datetime.utcnow(),
                    "auto_confirmed": True,
                    "updated_at": datetime.utcnow()
                }}
            )
            
            # Notify seller about auto-confirmation
            await notify_seller_auto_delivery(db, order)
            
            # Notify buyer about auto-confirmation
            await notify_buyer_auto_delivery(db, order)
            
            # Process fund transfer if seller has Stripe Connect
            await process_seller_payout(db, order)
            
            confirmed_count += 1
            logger.info(f"Auto-confirmed delivery for order {order['id']}")
            
        except Exception as e:
            logger.error(f"Error auto-confirming order {order['id']}: {e}")
    
    logger.info(f"Auto-confirmed {confirmed_count} deliveries")
    return confirmed_count


async def notify_seller_auto_delivery(db, order: dict):
    """Notify seller that delivery was auto-confirmed"""
    system_user = await db.users.find_one({"is_system_user": True})
    system_user_id = system_user["id"] if system_user else "system-support"
    
    for item in order["items"]:
        seller_id = item["seller_id"]
        
        thread = await db.message_threads.find_one({
            "participants": {"$all": [system_user_id, seller_id], "$size": 2}
        })
        
        if not thread:
            thread = {
                "id": str(uuid.uuid4()),
                "participants": [system_user_id, seller_id],
                "created_at": datetime.utcnow(),
                "last_message_at": datetime.utcnow()
            }
            await db.message_threads.insert_one(thread)
        
        message_content = f"""💰 **Payment Auto-Released**

Good news! Delivery for **Order #{order['order_number']}** has been automatically confirmed after {settings.auto_delivery_days} days.

**Your payout of ${order['seller_payout_amount']:.2f} has been released!**

The buyer did not report any issues within the delivery confirmation window, so the funds have been automatically released to your account.

Thank you for selling on MicLocker!
"""
        
        message = {
            "id": str(uuid.uuid4()),
            "thread_id": thread["id"],
            "sender_id": system_user_id,
            "content": message_content,
            "created_at": datetime.utcnow(),
            "read_at": None
        }
        await db.messages.insert_one(message)
        
        await db.message_threads.update_one(
            {"id": thread["id"]},
            {"$set": {"last_message_at": datetime.utcnow()}}
        )


async def notify_buyer_auto_delivery(db, order: dict):
    """Notify buyer that delivery was auto-confirmed"""
    system_user = await db.users.find_one({"is_system_user": True})
    system_user_id = system_user["id"] if system_user else "system-support"
    
    buyer_id = order["buyer_id"]
    
    thread = await db.message_threads.find_one({
        "participants": {"$all": [system_user_id, buyer_id], "$size": 2}
    })
    
    if not thread:
        thread = {
            "id": str(uuid.uuid4()),
            "participants": [system_user_id, buyer_id],
            "created_at": datetime.utcnow(),
            "last_message_at": datetime.utcnow()
        }
        await db.message_threads.insert_one(thread)
    
    message_content = f"""📦 **Delivery Auto-Confirmed**

**Order #{order['order_number']}** has been automatically marked as delivered after {settings.auto_delivery_days} days since shipment.

The payment has been released to the seller.

If you have not received your item or have any issues, please contact us immediately at info@miclockerapp.com or submit a support ticket.

Thank you for shopping on MicLocker!
"""
    
    message = {
        "id": str(uuid.uuid4()),
        "thread_id": thread["id"],
        "sender_id": system_user_id,
        "content": message_content,
        "created_at": datetime.utcnow(),
        "read_at": None
    }
    await db.messages.insert_one(message)
    
    await db.message_threads.update_one(
        {"id": thread["id"]},
        {"$set": {"last_message_at": datetime.utcnow()}}
    )


async def process_seller_payout(db, order: dict):
    """
    Process fund transfer to seller's Stripe Connect account
    
    If the seller has a connected Stripe account, transfer the funds.
    Otherwise, log that manual payout is needed.
    """
    # Get unique sellers from order
    seller_ids = list(set(item["seller_id"] for item in order["items"]))
    
    for seller_id in seller_ids:
        seller = await db.users.find_one({"id": seller_id})
        if not seller:
            continue
        
        stripe_account_id = seller.get("stripe_connect_account_id")
        
        if stripe_account_id:
            # Calculate seller's portion from this order
            seller_items = [item for item in order["items"] if item["seller_id"] == seller_id]
            seller_amount = sum(
                item["listing_price"] * item["quantity"] + item["shipping_cost"] * item["quantity"]
                for item in seller_items
            )
            # Subtract platform fee
            platform_fee = seller_amount * (settings.platform_fee_percent / 100)
            payout_amount = seller_amount - platform_fee
            
            # Convert to cents for Stripe
            amount_cents = int(payout_amount * 100)
            
            # Create transfer
            transfer = await stripe_connect_service.transfer_funds_to_seller(
                seller_stripe_account_id=stripe_account_id,
                amount_cents=amount_cents,
                order_id=order["id"],
                description=f"MicLocker sale - Order #{order['order_number']}"
            )
            
            if transfer:
                await db.orders.update_one(
                    {"id": order["id"]},
                    {"$set": {
                        "seller_payout_status": "paid",
                        "stripe_transfer_id": transfer["transfer_id"],
                        "payout_processed_at": datetime.utcnow()
                    }}
                )
                logger.info(f"Transferred ${payout_amount:.2f} to seller {seller_id}")
            else:
                logger.warning(f"Failed to transfer funds to seller {seller_id}")
        else:
            # No Stripe Connect - mark for manual payout
            logger.info(f"Seller {seller_id} does not have Stripe Connect - manual payout required")
            await db.orders.update_one(
                {"id": order["id"]},
                {"$set": {
                    "seller_payout_status": "pending_manual",
                    "updated_at": datetime.utcnow()
                }}
            )


async def run_scheduled_tasks():
    """Run all scheduled tasks"""
    logger.info("Starting scheduled tasks...")
    
    while True:
        try:
            # Run auto-delivery confirmation (14 days)
            await auto_confirm_deliveries()
            
            # Run 5-day review reminders
            await send_five_day_review_reminders()
            
        except Exception as e:
            logger.error(f"Error in scheduled tasks: {e}")
        
        # Sleep for 1 hour before next run
        await asyncio.sleep(3600)


def start_delivery_scheduler():
    """Start the delivery confirmation scheduler in background"""
    loop = asyncio.get_event_loop()
    loop.create_task(run_scheduled_tasks())
    logger.info("Delivery confirmation scheduler started")
