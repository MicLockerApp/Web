"""
Trading Routes for MicLocker Marketplace

Handles direct item swaps between users with:
- No platform fees
- 1 trade per user per month limit
- First-time modal explaining rules
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from datetime import datetime, timedelta
import uuid

from models.trade import (
    TradeCreate, TradeInDB, TradeListResponse, TradeItem,
    TradeShippingAddress, TradeTracking
)
from services.auth import get_current_user
from database import get_database
from config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/trades", tags=["Trades"])


# Carrier tracking URLs
CARRIER_TRACKING_URLS = {
    "USPS": "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
    "UPS": "https://www.ups.com/track?tracknum=",
    "FedEx": "https://www.fedex.com/fedextrack/?trknbr=",
    "DHL": "https://www.dhl.com/en/express/tracking.html?AWB=",
    "Other": None
}


async def check_trade_eligibility(db, user_id: str) -> dict:
    """
    Check if a user is eligible to make a trade this month.
    Returns eligibility status and details.
    """
    user = await db.users.find_one({"id": user_id})
    if not user:
        return {"eligible": False, "reason": "User not found"}
    
    # Check monthly limit
    now = datetime.utcnow()
    first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    last_trade_date = user.get("last_trade_date")
    
    # Reset counter if last trade was before this month
    if last_trade_date and last_trade_date < first_of_month:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {"trades_this_month": 0}}
        )
        user["trades_this_month"] = 0
    
    trades_this_month = user.get("trades_this_month", 0)
    
    if trades_this_month >= 1:
        return {
            "eligible": False, 
            "reason": "You have already used your free trade this month. Trades reset on the 1st of each month.",
            "next_trade_available": (first_of_month + timedelta(days=32)).replace(day=1).strftime("%B 1, %Y")
        }
    
    return {
        "eligible": True,
        "trades_remaining": 1 - trades_this_month,
        "has_seen_rules": user.get("has_seen_trade_rules", False)
    }


@router.get("/eligibility")
async def check_eligibility(current_user: dict = Depends(get_current_user)):
    """Check if the current user can make a trade this month"""
    db = get_database()
    return await check_trade_eligibility(db, current_user["id"])


@router.post("/acknowledge-rules")
async def acknowledge_trade_rules(current_user: dict = Depends(get_current_user)):
    """Mark that the user has seen the trade rules modal"""
    db = get_database()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"has_seen_trade_rules": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Trade rules acknowledged"}


@router.post("")
async def initiate_trade(
    trade_data: TradeCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Initiate a trade by offering your listing for another user's listing.
    
    Rules:
    - Each user gets 1 free trade per month
    - No platform fees on trades
    - Both parties must agree before shipping
    """
    db = get_database()
    
    # Check eligibility
    eligibility = await check_trade_eligibility(db, current_user["id"])
    if not eligibility["eligible"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=eligibility["reason"]
        )
    
    # Get my listing
    my_listing = await db.listings.find_one({
        "id": trade_data.my_listing_id,
        "seller_id": current_user["id"],
        "status": "active"
    })
    if not my_listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Your listing not found or not active"
        )
    
    # Get their listing
    their_listing = await db.listings.find_one({
        "id": trade_data.their_listing_id,
        "status": "active"
    })
    if not their_listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The listing you want is not found or not active"
        )
    
    # Can't trade with yourself
    if their_listing["seller_id"] == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot trade with yourself"
        )
    
    # Check if there's already a pending trade for either listing
    existing_trade = await db.trades.find_one({
        "$or": [
            {"initiator_item.listing_id": trade_data.my_listing_id, "status": {"$in": ["pending", "accepted", "shipping"]}},
            {"recipient_item.listing_id": trade_data.my_listing_id, "status": {"$in": ["pending", "accepted", "shipping"]}},
            {"initiator_item.listing_id": trade_data.their_listing_id, "status": {"$in": ["pending", "accepted", "shipping"]}},
            {"recipient_item.listing_id": trade_data.their_listing_id, "status": {"$in": ["pending", "accepted", "shipping"]}}
        ]
    })
    if existing_trade:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One of these listings is already involved in an active trade"
        )
    
    # Check recipient's eligibility too
    recipient_eligibility = await check_trade_eligibility(db, their_listing["seller_id"])
    if not recipient_eligibility["eligible"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The other user cannot accept trades: {recipient_eligibility['reason']}"
        )
    
    # Check 30-day cooldown between these two users
    cooldown_check = await check_trade_cooldown_between_users(db, current_user["id"], their_listing["seller_id"])
    if not cooldown_check["can_trade"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=cooldown_check["reason"]
        )
    
    # Create trade items
    my_item = TradeItem(
        listing_id=my_listing["id"],
        listing_title=my_listing["title"],
        listing_price=my_listing["price"],
        listing_image=my_listing.get("media", [{}])[0].get("url") if my_listing.get("media") else None,
        owner_id=current_user["id"],
        owner_username=current_user["username"]
    )
    
    their_item = TradeItem(
        listing_id=their_listing["id"],
        listing_title=their_listing["title"],
        listing_price=their_listing["price"],
        listing_image=their_listing.get("media", [{}])[0].get("url") if their_listing.get("media") else None,
        owner_id=their_listing["seller_id"],
        owner_username=their_listing["seller_username"]
    )
    
    # Create trade
    trade = TradeInDB(
        initiator_id=current_user["id"],
        initiator_username=current_user["username"],
        initiator_item=my_item,
        recipient_id=their_listing["seller_id"],
        recipient_username=their_listing["seller_username"],
        recipient_item=their_item,
        status="pending"
    )
    
    await db.trades.insert_one(trade.model_dump())
    
    # Send notification to recipient
    await send_trade_notification(
        db, 
        their_listing["seller_id"],
        f"🔄 **New Trade Proposal!**\n\n**{current_user['username']}** wants to trade their **{my_listing['title']}** for your **{their_listing['title']}**.\n\n[View Trade Details]({settings.frontend_url}/trades/{trade.id})"
    )
    
    logger.info(f"Trade {trade.trade_number} created by {current_user['username']}")
    
    return {
        "message": "Trade proposal sent!",
        "trade_id": trade.id,
        "trade_number": trade.trade_number
    }


@router.get("")
async def get_my_trades(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Get all trades involving the current user"""
    db = get_database()
    
    query = {
        "$or": [
            {"initiator_id": current_user["id"]},
            {"recipient_id": current_user["id"]}
        ]
    }
    
    if status_filter:
        query["status"] = status_filter
    
    skip = (page - 1) * limit
    total = await db.trades.count_documents(query)
    
    trades = await db.trades.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return {
        "trades": [TradeListResponse(**t) for t in trades],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/{trade_id}")
async def get_trade(
    trade_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific trade"""
    db = get_database()
    
    trade = await db.trades.find_one({"id": trade_id})
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )
    
    # Check authorization
    if trade["initiator_id"] != current_user["id"] and trade["recipient_id"] != current_user["id"]:
        if not current_user.get("is_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this trade"
            )
    
    # Remove _id
    trade.pop("_id", None)
    return trade


@router.post("/{trade_id}/respond")
async def respond_to_trade(
    trade_id: str,
    action: str = Query(..., regex="^(accept|decline)$"),
    current_user: dict = Depends(get_current_user)
):
    """Accept or decline a trade proposal"""
    db = get_database()
    
    trade = await db.trades.find_one({"id": trade_id})
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )
    
    # Only recipient can respond
    if trade["recipient_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the recipient can respond to this trade"
        )
    
    if trade["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This trade is no longer pending"
        )
    
    if action == "decline":
        await db.trades.update_one(
            {"id": trade_id},
            {"$set": {"status": "declined", "updated_at": datetime.utcnow()}}
        )
        
        # Notify initiator
        await send_trade_notification(
            db,
            trade["initiator_id"],
            f"❌ **Trade Declined**\n\n{current_user['username']} has declined your trade proposal for **{trade['recipient_item']['listing_title']}**."
        )
        
        return {"message": "Trade declined"}
    
    # Accept trade
    # Check recipient eligibility one more time
    eligibility = await check_trade_eligibility(db, current_user["id"])
    if not eligibility["eligible"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=eligibility["reason"]
        )
    
    # Check if these two users have a 30-day trade cooldown
    initiator_id = trade["initiator_id"]
    recipient_id = current_user["id"]
    
    cooldown_check = await check_trade_cooldown_between_users(db, initiator_id, recipient_id)
    if not cooldown_check["can_trade"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=cooldown_check["reason"]
        )
    
    # Mark both listings as in-trade
    await db.listings.update_many(
        {"id": {"$in": [trade["initiator_item"]["listing_id"], trade["recipient_item"]["listing_id"]]}},
        {"$set": {"status": "in_trade", "updated_at": datetime.utcnow()}}
    )
    
    await db.trades.update_one(
        {"id": trade_id},
        {"$set": {
            "status": "accepted",
            "accepted_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Set 30-day trade cooldown between these two users
    cooldown_expiry = datetime.utcnow() + timedelta(days=30)
    await set_trade_cooldown_between_users(db, initiator_id, recipient_id, cooldown_expiry)
    
    # Notify initiator
    await send_trade_notification(
        db,
        trade["initiator_id"],
        f"✅ **Trade Accepted!**\n\n{current_user['username']} has accepted your trade proposal!\n\nPlease submit your shipping address to proceed."
    )
    
    return {"message": "Trade accepted! Please submit your shipping address."}


@router.post("/{trade_id}/shipping-address")
async def submit_shipping_address(
    trade_id: str,
    address: TradeShippingAddress,
    current_user: dict = Depends(get_current_user)
):
    """Submit shipping address for a trade"""
    db = get_database()
    
    trade = await db.trades.find_one({"id": trade_id})
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )
    
    if trade["status"] != "accepted":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trade must be accepted before submitting shipping address"
        )
    
    is_initiator = trade["initiator_id"] == current_user["id"]
    is_recipient = trade["recipient_id"] == current_user["id"]
    
    if not (is_initiator or is_recipient):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this trade"
        )
    
    # Update the appropriate address
    address_field = "initiator_shipping_address" if is_initiator else "recipient_shipping_address"
    
    await db.trades.update_one(
        {"id": trade_id},
        {"$set": {
            address_field: address.model_dump(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Check if both addresses are now submitted
    updated_trade = await db.trades.find_one({"id": trade_id})
    if updated_trade.get("initiator_shipping_address") and updated_trade.get("recipient_shipping_address"):
        await db.trades.update_one(
            {"id": trade_id},
            {"$set": {"status": "addresses_submitted"}}
        )
        
        # Notify both parties that they can now ship
        await send_trade_notification(
            db,
            trade["initiator_id"],
            f"📦 **Ready to Ship!**\n\nBoth shipping addresses are in for **Trade #{trade['trade_number']}**. Please ship your item and add tracking information."
        )
        await send_trade_notification(
            db,
            trade["recipient_id"],
            f"📦 **Ready to Ship!**\n\nBoth shipping addresses are in for **Trade #{trade['trade_number']}**. Please ship your item and add tracking information."
        )
    
    return {"message": "Shipping address submitted"}


@router.post("/{trade_id}/tracking")
async def add_trade_tracking(
    trade_id: str,
    carrier: str,
    tracking_number: str,
    estimated_delivery: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Add tracking information for your side of the trade"""
    db = get_database()
    
    trade = await db.trades.find_one({"id": trade_id})
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )
    
    if trade["status"] not in ["addresses_submitted", "shipping"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Both addresses must be submitted before adding tracking"
        )
    
    is_initiator = trade["initiator_id"] == current_user["id"]
    is_recipient = trade["recipient_id"] == current_user["id"]
    
    if not (is_initiator or is_recipient):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this trade"
        )
    
    # Generate tracking URL
    tracking_url = None
    if carrier in CARRIER_TRACKING_URLS and CARRIER_TRACKING_URLS[carrier]:
        tracking_url = CARRIER_TRACKING_URLS[carrier] + tracking_number
    
    tracking_info = TradeTracking(
        carrier=carrier,
        tracking_number=tracking_number,
        tracking_url=tracking_url,
        shipped_at=datetime.utcnow(),
        estimated_delivery=estimated_delivery
    )
    
    tracking_field = "initiator_tracking" if is_initiator else "recipient_tracking"
    shipped_field = "initiator_shipped" if is_initiator else "recipient_shipped"
    
    await db.trades.update_one(
        {"id": trade_id},
        {"$set": {
            tracking_field: tracking_info.model_dump(),
            shipped_field: True,
            "status": "shipping",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Notify the other party
    other_id = trade["recipient_id"] if is_initiator else trade["initiator_id"]
    await send_trade_notification(
        db,
        other_id,
        f"🚚 **Item Shipped!**\n\n{current_user['username']} has shipped their item for **Trade #{trade['trade_number']}**.\n\n**Carrier:** {carrier}\n**Tracking:** {tracking_number}"
    )
    
    return {"message": "Tracking information added"}


@router.post("/{trade_id}/confirm-receipt")
async def confirm_trade_receipt(
    trade_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Confirm that you received the other party's item"""
    db = get_database()
    
    trade = await db.trades.find_one({"id": trade_id})
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )
    
    if trade["status"] != "shipping":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Items must be shipped before confirming receipt"
        )
    
    is_initiator = trade["initiator_id"] == current_user["id"]
    is_recipient = trade["recipient_id"] == current_user["id"]
    
    if not (is_initiator or is_recipient):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this trade"
        )
    
    # The initiator confirms they received the recipient's item, and vice versa
    received_field = "initiator_confirmed_receipt" if is_initiator else "recipient_confirmed_receipt"
    
    await db.trades.update_one(
        {"id": trade_id},
        {"$set": {
            received_field: True,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Check if trade is now complete
    updated_trade = await db.trades.find_one({"id": trade_id})
    if updated_trade.get("initiator_confirmed_receipt") and updated_trade.get("recipient_confirmed_receipt"):
        # Complete the trade
        await complete_trade(db, updated_trade)
    else:
        # Notify the other party
        other_id = trade["recipient_id"] if is_initiator else trade["initiator_id"]
        await send_trade_notification(
            db,
            other_id,
            f"📬 **Item Received!**\n\n{current_user['username']} has confirmed receipt of your item for **Trade #{trade['trade_number']}**.\n\nPlease confirm when you receive your item to complete the trade."
        )
    
    return {"message": "Receipt confirmed"}


async def complete_trade(db, trade: dict):
    """Complete a trade - update status, listings, and user counters"""
    
    # Update trade status
    await db.trades.update_one(
        {"id": trade["id"]},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Mark listings as traded
    await db.listings.update_many(
        {"id": {"$in": [trade["initiator_item"]["listing_id"], trade["recipient_item"]["listing_id"]]}},
        {"$set": {"status": "traded", "updated_at": datetime.utcnow()}}
    )
    
    # Update both users' trade counters
    for user_id in [trade["initiator_id"], trade["recipient_id"]]:
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "last_trade_date": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            "$inc": {"trades_this_month": 1}}
        )
    
    # Notify both parties
    await send_trade_notification(
        db,
        trade["initiator_id"],
        f"🎉 **Trade Complete!**\n\nCongratulations! **Trade #{trade['trade_number']}** has been completed successfully.\n\nDon't forget to leave a review for {trade['recipient_username']}!"
    )
    await send_trade_notification(
        db,
        trade["recipient_id"],
        f"🎉 **Trade Complete!**\n\nCongratulations! **Trade #{trade['trade_number']}** has been completed successfully.\n\nDon't forget to leave a review for {trade['initiator_username']}!"
    )
    
    logger.info(f"Trade {trade['trade_number']} completed")


@router.post("/{trade_id}/cancel")
async def cancel_trade(
    trade_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a trade (only before items are shipped)"""
    db = get_database()
    
    trade = await db.trades.find_one({"id": trade_id})
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )
    
    is_initiator = trade["initiator_id"] == current_user["id"]
    is_recipient = trade["recipient_id"] == current_user["id"]
    
    if not (is_initiator or is_recipient):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this trade"
        )
    
    if trade["status"] in ["shipping", "completed", "disputed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a trade that is already shipping or completed. Please open a support ticket for disputes."
        )
    
    # Re-activate listings if they were put on hold
    await db.listings.update_many(
        {"id": {"$in": [trade["initiator_item"]["listing_id"], trade["recipient_item"]["listing_id"]]}},
        {"$set": {"status": "active", "updated_at": datetime.utcnow()}}
    )
    
    await db.trades.update_one(
        {"id": trade_id},
        {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
    )
    
    # Notify the other party
    other_id = trade["recipient_id"] if is_initiator else trade["initiator_id"]
    await send_trade_notification(
        db,
        other_id,
        f"❌ **Trade Cancelled**\n\n{current_user['username']} has cancelled **Trade #{trade['trade_number']}**.\n\nYour listing has been reactivated."
    )
    
    return {"message": "Trade cancelled"}


@router.post("/{trade_id}/dispute")
async def open_trade_dispute(
    trade_id: str,
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Open a dispute for a trade (creates a support ticket)"""
    db = get_database()
    
    trade = await db.trades.find_one({"id": trade_id})
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found"
        )
    
    is_initiator = trade["initiator_id"] == current_user["id"]
    is_recipient = trade["recipient_id"] == current_user["id"]
    
    if not (is_initiator or is_recipient):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this trade"
        )
    
    # Create a support ticket
    from models.ticket import TicketInDB
    
    ticket_count = await db.support_tickets.count_documents({}) + 1
    ticket_number = f"TKT-{ticket_count:05d}"
    
    ticket = TicketInDB(
        ticket_number=ticket_number,
        user_id=current_user["id"],
        customer_name=current_user["username"],
        customer_email=current_user.get("email", ""),
        category="Trade Dispute",
        subject=f"Trade Dispute - {trade['trade_number']}",
        message=f"**Trade ID:** {trade['id']}\n**Trade Number:** {trade['trade_number']}\n\n**Reason for dispute:**\n{reason}",
        priority="high"
    )
    
    await db.support_tickets.insert_one(ticket.model_dump())
    
    # Mark trade as disputed
    await db.trades.update_one(
        {"id": trade_id},
        {"$set": {"status": "disputed", "updated_at": datetime.utcnow()}}
    )
    
    # Notify the other party
    other_id = trade["recipient_id"] if is_initiator else trade["initiator_id"]
    await send_trade_notification(
        db,
        other_id,
        f"⚠️ **Trade Dispute Opened**\n\n{current_user['username']} has opened a dispute for **Trade #{trade['trade_number']}**.\n\nOur support team will review and contact both parties."
    )
    
    return {
        "message": "Dispute opened. Our support team will review and contact you.",
        "ticket_number": ticket_number
    }


async def check_trade_cooldown_between_users(db, user1_id: str, user2_id: str) -> dict:
    """
    Check if two users have a trade cooldown between them.
    Returns whether they can trade and reason if not.
    """
    # Check if there's an active cooldown between these users
    cooldown = await db.trade_cooldowns.find_one({
        "$or": [
            {"user1_id": user1_id, "user2_id": user2_id},
            {"user1_id": user2_id, "user2_id": user1_id}
        ],
        "expires_at": {"$gt": datetime.utcnow()}
    })
    
    if cooldown:
        days_remaining = (cooldown["expires_at"] - datetime.utcnow()).days + 1
        return {
            "can_trade": False,
            "reason": f"You must wait {days_remaining} more days before trading with this user again."
        }
    
    return {"can_trade": True}


async def set_trade_cooldown_between_users(db, user1_id: str, user2_id: str, expires_at: datetime):
    """
    Set a trade cooldown between two users.
    """
    cooldown = {
        "id": str(uuid.uuid4()),
        "user1_id": user1_id,
        "user2_id": user2_id,
        "created_at": datetime.utcnow(),
        "expires_at": expires_at
    }
    
    # Remove any existing cooldown between these users first
    await db.trade_cooldowns.delete_many({
        "$or": [
            {"user1_id": user1_id, "user2_id": user2_id},
            {"user1_id": user2_id, "user2_id": user1_id}
        ]
    })
    
    await db.trade_cooldowns.insert_one(cooldown)


async def send_trade_notification(db, user_id: str, message_content: str):
    """Send an in-app notification about a trade"""
    system_user = await db.users.find_one({"is_system_user": True})
    system_user_id = system_user["id"] if system_user else "system-support"
    
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
