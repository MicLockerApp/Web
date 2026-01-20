"""
Stripe Payment Routes for MicLocker Marketplace

Features:
- Create checkout sessions
- Handle webhooks
- Check payment status
- Fund holding until delivery
- Stripe Connect seller onboarding
- Fund transfers to sellers
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import logging

from services.auth import get_current_user
from services.stripe_service import stripe_service, get_stripe_service
from services.stripe_connect import stripe_connect_service
from services.email import send_order_confirmation_email, send_seller_sale_notification_email
from database import get_database
from config import settings
from models.order import (
    OrderCreate, OrderInDB, OrderResponse, OrderItem,
    ShippingAddress, PaymentInfo, TrackingInfo, TrackingUpdate
)
from analytics.services.event_emitter import emit_event, EventTypes, ActorType

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)


class CheckoutRequest(BaseModel):
    """Request to create a checkout session"""
    origin_url: str  # Frontend origin for success/cancel URLs
    offer_id: Optional[str] = None  # If ordering from accepted offer
    shipping_address: ShippingAddress


class CheckoutResponse(BaseModel):
    """Response with checkout session URL"""
    checkout_url: str
    session_id: str
    order_id: str


class PaymentStatusResponse(BaseModel):
    """Payment status response"""
    status: str
    payment_status: str
    order_id: str
    order_status: str
    funds_status: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    checkout_data: CheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Stripe checkout session for the user's cart
    
    Flow:
    1. Get items from cart (or accepted offer)
    2. Calculate totals and fees
    3. Create order in pending state
    4. Create Stripe checkout session
    5. Return checkout URL
    
    Funds are held until delivery is confirmed.
    """
    db = get_database()
    
    # Initialize Stripe with the request's base URL
    base_url = str(request.base_url).rstrip('/')
    stripe_service.initialize(base_url)
    
    items = []
    subtotal = 0
    shipping_total = 0
    seller_id = None
    seller_username = None
    
    if checkout_data.offer_id:
        # Order from accepted offer
        offer = await db.offers.find_one({
            "id": checkout_data.offer_id,
            "buyer_id": current_user["id"],
            "status": "accepted"
        })
        
        if not offer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Accepted offer not found"
            )
        
        listing = await db.listings.find_one({"id": offer["listing_id"]})
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        item = OrderItem(
            listing_id=listing["id"],
            listing_title=listing["title"],
            listing_price=offer["final_price"],
            listing_image=listing.get("media", [{}])[0].get("url") if listing.get("media") else None,
            quantity=1,
            shipping_cost=listing.get("shipping", {}).get("price", 0),
            seller_id=listing["seller_id"],
            seller_username=listing["seller_username"]
        )
        items.append(item)
        subtotal = offer["final_price"]
        shipping_total = item.shipping_cost
        seller_id = listing["seller_id"]
        seller_username = listing["seller_username"]
        
    else:
        # Order from cart
        cart_items = await db.cart_items.find({"user_id": current_user["id"]}).to_list(length=100)
        
        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty"
            )
        
        for cart_item in cart_items:
            listing = await db.listings.find_one({"id": cart_item["listing_id"], "status": "active"})
            if not listing:
                continue
            
            available = listing["quantity"] - listing.get("sold_quantity", 0)
            quantity = min(cart_item["quantity"], available)
            
            if quantity > 0:
                item = OrderItem(
                    listing_id=listing["id"],
                    listing_title=listing["title"],
                    listing_price=listing["price"],
                    listing_image=cart_item.get("listing_image"),
                    quantity=quantity,
                    shipping_cost=cart_item.get("shipping_cost", 0),
                    seller_id=listing["seller_id"],
                    seller_username=listing["seller_username"]
                )
                items.append(item)
                subtotal += listing["price"] * quantity
                shipping_total += item.shipping_cost * quantity
                
                # Track first seller (for simple cases)
                if not seller_id:
                    seller_id = listing["seller_id"]
                    seller_username = listing["seller_username"]
        
        if not items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No available items in cart"
            )
    
    # Calculate fees
    has_free_fees = current_user.get("has_lifetime_free_fees", False)
    
    if has_free_fees:
        platform_fee = 0.0
    else:
        platform_fee = round(subtotal * (settings.platform_fee_percent / 100), 2)
    
    payment_processing_fee = round(
        subtotal * (settings.payment_processing_percent / 100) + settings.payment_processing_fixed, 
        2
    )
    
    total = round(subtotal + shipping_total + payment_processing_fee, 2)
    
    # Calculate seller payout (subtotal + shipping - platform fee)
    seller_payout = round(subtotal + shipping_total - platform_fee, 2)
    
    # Create order in pending state
    order_id = str(uuid.uuid4())
    order = OrderInDB(
        id=order_id,
        buyer_id=current_user["id"],
        buyer_username=current_user["username"],
        buyer_email=current_user.get("email"),
        items=[item.model_dump() for item in items],
        shipping_address=checkout_data.shipping_address,
        payment_info=PaymentInfo(
            method="card",
            funds_status="pending"
        ),
        subtotal=subtotal,
        shipping_total=shipping_total,
        platform_fee=platform_fee,
        payment_processing_fee=payment_processing_fee,
        total=total,
        seller_payout_amount=seller_payout,
        seller_payout_status="pending",
        status="awaiting_payment",
        offer_id=checkout_data.offer_id
    )
    
    await db.orders.insert_one(order.model_dump())
    
    # Build success/cancel URLs
    success_url = f"{checkout_data.origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}&order_id={order_id}"
    cancel_url = f"{checkout_data.origin_url}/checkout/cancel?order_id={order_id}"
    
    # Create listing title summary for Stripe
    listing_titles = ", ".join([item.listing_title[:30] for item in items[:3]])
    if len(items) > 3:
        listing_titles += f" (+{len(items) - 3} more)"
    
    # Create Stripe checkout session
    session = await stripe_service.create_checkout_session(
        amount=total,
        order_id=order_id,
        buyer_id=current_user["id"],
        seller_id=seller_id,
        listing_title=listing_titles,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "buyer_username": current_user["username"],
            "seller_username": seller_username or "multiple",
            "item_count": str(len(items)),
            "platform_fee": str(platform_fee),
            "seller_payout": str(seller_payout)
        }
    )
    
    if not session:
        # Clean up the order if Stripe fails
        await db.orders.delete_one({"id": order_id})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment session"
        )
    
    # Update order with Stripe session ID
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "stripe_session_id": session.session_id,
            "payment_info.stripe_session_id": session.session_id
        }}
    )
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "order_id": order_id,
        "user_id": current_user["id"],
        "amount": total,
        "currency": "usd",
        "payment_status": "initiated",
        "metadata": {
            "buyer_id": current_user["id"],
            "seller_id": seller_id,
            "platform_fee": platform_fee,
            "seller_payout": seller_payout
        },
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    })
    
    logger.info(f"Created checkout session {session.session_id} for order {order_id}")
    
    return CheckoutResponse(
        checkout_url=session.url,
        session_id=session.session_id,
        order_id=order_id
    )


@router.get("/status/{session_id}", response_model=PaymentStatusResponse)
async def get_payment_status(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Check the status of a payment session
    
    This endpoint is polled by the frontend after redirect from Stripe
    """
    db = get_database()
    
    # Get checkout status from Stripe
    checkout_status = await stripe_service.get_checkout_status(session_id)
    
    if not checkout_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment session not found"
        )
    
    # Find the order
    order = await db.orders.find_one({"stripe_session_id": session_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Update order and transaction based on payment status
    if checkout_status.payment_status == "paid" and order["status"] == "awaiting_payment":
        # Payment successful - mark as paid with funds held
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "status": "paid",
                "payment_info.funds_status": "held",
                "seller_payout_status": "held",
                "paid_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Update payment transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": "paid",
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Clear cart if not from offer
        if not order.get("offer_id"):
            await db.cart_items.delete_many({"user_id": current_user["id"]})
        else:
            # Mark offer as ordered
            await db.offers.update_one(
                {"id": order["offer_id"]},
                {"$set": {"status": "ordered", "updated_at": datetime.utcnow()}}
            )
        
        # Update listing quantities
        for item in order["items"]:
            await db.listings.update_one(
                {"id": item["listing_id"]},
                {"$inc": {"sold_quantity": item["quantity"]}}
            )
            
            listing = await db.listings.find_one({"id": item["listing_id"]})
            if listing and listing.get("sold_quantity", 0) >= listing.get("quantity", 1):
                await db.listings.update_one(
                    {"id": item["listing_id"]},
                    {"$set": {"status": "sold"}}
                )
            
            await db.users.update_one(
                {"id": item["seller_id"]},
                {"$inc": {"total_sales": 1}}
            )
        
        # Send notifications (async - don't block)
        try:
            await notify_seller_of_sale(db, order)
            await send_buyer_confirmation(db, order)
        except Exception as e:
            logger.error(f"Error sending notifications: {e}")
        
        # Emit analytics
        emit_event(
            EventTypes.PURCHASE_COMPLETED,
            actor_type=ActorType.BUYER,
            actor_id=current_user["id"],
            actor_username=current_user["username"],
            order_id=order["id"],
            metadata={
                "total": order["total"],
                "platform_fee": order["platform_fee"],
                "seller_payout": order["seller_payout_amount"],
                "payment_method": "stripe",
                "funds_status": "held"
            }
        )
        
        return PaymentStatusResponse(
            status=checkout_status.status,
            payment_status=checkout_status.payment_status,
            order_id=order["id"],
            order_status="paid",
            funds_status="held"
        )
    
    elif checkout_status.status == "expired":
        # Session expired - mark order as cancelled
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "status": "cancelled",
                "updated_at": datetime.utcnow()
            }}
        )
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": "expired",
                "updated_at": datetime.utcnow()
            }}
        )
    
    return PaymentStatusResponse(
        status=checkout_status.status,
        payment_status=checkout_status.payment_status,
        order_id=order["id"],
        order_status=order["status"],
        funds_status=order.get("payment_info", {}).get("funds_status", "pending")
    )


@router.get("/config")
async def get_stripe_config():
    """Get Stripe publishable key for frontend"""
    return {
        "publishable_key": stripe_service.publishable_key
    }


async def notify_seller_of_sale(db, order: dict):
    """Send notification to seller about new sale with funds held message"""
    
    # Get unique sellers from order items
    seller_ids = list(set(item["seller_id"] for item in order["items"]))
    
    for seller_id in seller_ids:
        seller = await db.users.find_one({"id": seller_id})
        if not seller:
            continue
        
        # Get items for this seller
        seller_items = [item for item in order["items"] if item["seller_id"] == seller_id]
        
        # Calculate seller's portion
        seller_subtotal = sum(item["listing_price"] * item["quantity"] for item in seller_items)
        seller_shipping = sum(item["shipping_cost"] * item["quantity"] for item in seller_items)
        
        # Create in-app message to seller
        system_user = await db.users.find_one({"is_system_user": True})
        system_user_id = system_user["id"] if system_user else "system-support"
        
        # Build item list for message
        items_text = "\n".join([
            f"• {item['listing_title']} - ${item['listing_price']:.2f}"
            for item in seller_items
        ])
        
        # Build shipping address
        addr = order["shipping_address"]
        shipping_text = f"""
{addr['full_name']}
{addr['address_line1']}
{addr.get('address_line2', '') or ''}
{addr['city']}, {addr['state']} {addr['postal_code']}
{addr['country']}
{f"Phone: {addr['phone']}" if addr.get('phone') else ''}
""".strip()
        
        message_content = f"""🎉 **Congratulations! You made a sale!**

**Order #{order['order_number']}**
**Buyer:** {order['buyer_username']}

**Items Sold:**
{items_text}

**Ship To:**
{shipping_text}

**Payout Summary:**
• Subtotal: ${seller_subtotal:.2f}
• Shipping: ${seller_shipping:.2f}
• Platform Fee: -${order['platform_fee']:.2f}
• **Your Payout: ${order['seller_payout_amount']:.2f}**

⚠️ **IMPORTANT: Funds are being held**
Your payment will be released once the buyer confirms delivery of the item. Please ship the item promptly and provide tracking information.

To add tracking: Go to your Sales page and click "Add Tracking" on this order.

Once the buyer receives the package and delivery is confirmed, the funds will be automatically released to your account.

Thank you for selling on MicLocker!
"""
        
        # Create or find message thread
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
        
        # Create message
        message = {
            "id": str(uuid.uuid4()),
            "thread_id": thread["id"],
            "sender_id": system_user_id,
            "content": message_content,
            "created_at": datetime.utcnow(),
            "read_at": None
        }
        await db.messages.insert_one(message)
        
        # Update thread
        await db.message_threads.update_one(
            {"id": thread["id"]},
            {"$set": {"last_message_at": datetime.utcnow()}}
        )
        
        # Send email notification
        try:
            await send_seller_sale_notification_email(
                to_email=seller.get("email"),
                seller_username=seller.get("username"),
                order_number=order["order_number"],
                buyer_username=order["buyer_username"],
                items=seller_items,
                shipping_address=order["shipping_address"],
                payout_amount=order["seller_payout_amount"]
            )
        except Exception as e:
            logger.error(f"Error sending seller email: {e}")
        
        # Mark seller as notified
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {"seller_notified": True}}
        )


async def send_buyer_confirmation(db, order: dict):
    """Send confirmation to buyer"""
    
    buyer = await db.users.find_one({"id": order["buyer_id"]})
    if not buyer:
        return
    
    try:
        await send_order_confirmation_email(
            to_email=buyer.get("email"),
            buyer_username=buyer.get("username"),
            order_number=order["order_number"],
            items=order["items"],
            shipping_address=order["shipping_address"],
            total=order["total"]
        )
        
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {"buyer_notified": True}}
        )
    except Exception as e:
        logger.error(f"Error sending buyer email: {e}")



# ============================================
# Stripe Webhook Handler
# ============================================

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events
    
    This endpoint receives real-time events from Stripe:
    - checkout.session.completed: Payment was successful
    - checkout.session.expired: Checkout session expired
    - payment_intent.succeeded: Payment intent succeeded
    - payment_intent.payment_failed: Payment failed
    - charge.refunded: Refund was processed
    """
    import stripe
    
    db = get_database()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    # For now, we'll process the event without signature verification in test mode
    # In production, you should verify the webhook signature
    try:
        event = stripe.Event.construct_from(
            stripe.util.json.loads(payload),
            stripe.api_key
        )
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event.type
    event_data = event.data.object
    
    logger.info(f"Received Stripe webhook: {event_type}")
    
    # Handle specific events
    if event_type == "checkout.session.completed":
        await handle_checkout_completed(db, event_data)
    
    elif event_type == "checkout.session.expired":
        await handle_checkout_expired(db, event_data)
    
    elif event_type == "payment_intent.succeeded":
        await handle_payment_succeeded(db, event_data)
    
    elif event_type == "payment_intent.payment_failed":
        await handle_payment_failed(db, event_data)
    
    elif event_type == "charge.refunded":
        await handle_charge_refunded(db, event_data)
    
    return {"status": "success", "event_type": event_type}


async def handle_checkout_completed(db, session):
    """Handle successful checkout completion"""
    session_id = session.id
    
    # Find the order
    order = await db.orders.find_one({"stripe_session_id": session_id})
    if not order:
        logger.warning(f"Order not found for session {session_id}")
        return
    
    # Skip if already processed
    if order["status"] != "awaiting_payment":
        logger.info(f"Order {order['id']} already processed")
        return
    
    # Update order status
    await db.orders.update_one(
        {"id": order["id"]},
        {"$set": {
            "status": "paid",
            "payment_info.funds_status": "held",
            "payment_info.stripe_payment_intent_id": session.get("payment_intent"),
            "seller_payout_status": "held",
            "paid_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Update payment transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "payment_status": "paid",
            "payment_intent_id": session.get("payment_intent"),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Update listing quantities
    for item in order["items"]:
        await db.listings.update_one(
            {"id": item["listing_id"]},
            {"$inc": {"sold_quantity": item["quantity"]}}
        )
        
        listing = await db.listings.find_one({"id": item["listing_id"]})
        if listing and listing.get("sold_quantity", 0) >= listing.get("quantity", 1):
            await db.listings.update_one(
                {"id": item["listing_id"]},
                {"$set": {"status": "sold"}}
            )
        
        await db.users.update_one(
            {"id": item["seller_id"]},
            {"$inc": {"total_sales": 1}}
        )
    
    # Clear buyer's cart
    if not order.get("offer_id"):
        await db.cart_items.delete_many({"user_id": order["buyer_id"]})
    else:
        await db.offers.update_one(
            {"id": order["offer_id"]},
            {"$set": {"status": "ordered", "updated_at": datetime.utcnow()}}
        )
    
    # Send notifications
    try:
        await notify_seller_of_sale(db, order)
        await send_buyer_confirmation(db, order)
    except Exception as e:
        logger.error(f"Error sending notifications: {e}")
    
    # Emit analytics
    emit_event(
        EventTypes.PURCHASE_COMPLETED,
        actor_type=ActorType.BUYER,
        actor_id=order["buyer_id"],
        actor_username=order.get("buyer_username"),
        order_id=order["id"],
        metadata={
            "total": order["total"],
            "platform_fee": order["platform_fee"],
            "seller_payout": order["seller_payout_amount"],
            "payment_method": "stripe",
            "funds_status": "held",
            "source": "webhook"
        }
    )
    
    logger.info(f"Processed checkout.session.completed for order {order['id']}")


async def handle_checkout_expired(db, session):
    """Handle expired checkout session"""
    session_id = session.id
    
    order = await db.orders.find_one({"stripe_session_id": session_id})
    if not order:
        return
    
    if order["status"] == "awaiting_payment":
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "status": "cancelled",
                "updated_at": datetime.utcnow()
            }}
        )
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": "expired",
                "updated_at": datetime.utcnow()
            }}
        )
    
    logger.info(f"Processed checkout.session.expired for order {order['id']}")


async def handle_payment_succeeded(db, payment_intent):
    """Handle successful payment intent"""
    payment_intent_id = payment_intent.id
    
    # Find order by payment intent
    order = await db.orders.find_one({
        "payment_info.stripe_payment_intent_id": payment_intent_id
    })
    
    if order:
        logger.info(f"Payment succeeded for order {order['id']}")


async def handle_payment_failed(db, payment_intent):
    """Handle failed payment"""
    payment_intent_id = payment_intent.id
    
    order = await db.orders.find_one({
        "payment_info.stripe_payment_intent_id": payment_intent_id
    })
    
    if order:
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "status": "payment_failed",
                "updated_at": datetime.utcnow()
            }}
        )
        logger.info(f"Payment failed for order {order['id']}")


async def handle_charge_refunded(db, charge):
    """Handle refund processed"""
    payment_intent_id = charge.get("payment_intent")
    
    if not payment_intent_id:
        return
    
    order = await db.orders.find_one({
        "payment_info.stripe_payment_intent_id": payment_intent_id
    })
    
    if order:
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "status": "refunded",
                "payment_info.funds_status": "refunded",
                "seller_payout_status": "cancelled",
                "updated_at": datetime.utcnow()
            }}
        )
        logger.info(f"Refund processed for order {order['id']}")


# ============================================
# Stripe Connect - Seller Onboarding & Payouts
# ============================================

@router.post("/connect/onboard")
async def start_seller_onboarding(
    current_user: dict = Depends(get_current_user)
):
    """
    Start Stripe Connect onboarding for a seller
    
    Creates an Express account and returns the onboarding URL.
    Sellers complete identity verification and add bank account on Stripe's hosted page.
    """
    db = get_database()
    
    # Check if user already has a Stripe account
    if current_user.get("stripe_connect_account_id"):
        # Get existing account status
        account_status = await stripe_connect_service.get_account_status(
            current_user["stripe_connect_account_id"]
        )
        
        if account_status and account_status.get("details_submitted"):
            return {
                "status": "complete",
                "message": "Stripe account already set up",
                "account": account_status
            }
        
        # Account exists but onboarding not complete - generate new link
        onboarding_url = await stripe_connect_service.create_account_link(
            current_user["stripe_connect_account_id"],
            current_user["id"]
        )
        
        if onboarding_url:
            return {
                "status": "pending",
                "message": "Continue your Stripe setup",
                "onboarding_url": onboarding_url
            }
    
    # Create new Stripe Express account
    account = await stripe_connect_service.create_express_account(
        seller_email=current_user.get("email"),
        seller_id=current_user["id"]
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe Connect is not yet enabled for this platform. The marketplace administrator needs to enable Stripe Connect in the Stripe Dashboard at https://dashboard.stripe.com/connect/onboarding"
        )
    
    # Save account ID to user
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "stripe_connect_account_id": account["account_id"],
            "stripe_connect_status": "pending",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Create onboarding link
    onboarding_url = await stripe_connect_service.create_account_link(
        account["account_id"],
        current_user["id"]
    )
    
    if not onboarding_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create onboarding link. Please try again."
        )
    
    return {
        "status": "created",
        "message": "Stripe account created. Complete your setup.",
        "onboarding_url": onboarding_url,
        "account_id": account["account_id"]
    }


@router.get("/connect/status")
async def get_connect_status(
    current_user: dict = Depends(get_current_user)
):
    """Get the status of the seller's Stripe Connect account"""
    
    stripe_account_id = current_user.get("stripe_connect_account_id")
    
    if not stripe_account_id:
        return {
            "status": "not_connected",
            "message": "No Stripe account connected",
            "can_receive_payouts": False
        }
    
    account_status = await stripe_connect_service.get_account_status(stripe_account_id)
    
    if not account_status:
        return {
            "status": "error",
            "message": "Could not retrieve account status",
            "can_receive_payouts": False
        }
    
    can_receive = (
        account_status.get("charges_enabled", False) and 
        account_status.get("payouts_enabled", False) and
        account_status.get("details_submitted", False)
    )
    
    return {
        "status": "connected" if can_receive else "pending",
        "message": "Ready to receive payouts" if can_receive else "Complete your Stripe setup to receive payouts",
        "can_receive_payouts": can_receive,
        "account": account_status
    }


@router.post("/connect/refresh-link")
async def refresh_onboarding_link(
    current_user: dict = Depends(get_current_user)
):
    """Generate a new onboarding link if the previous one expired"""
    
    stripe_account_id = current_user.get("stripe_connect_account_id")
    
    if not stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe account found. Start onboarding first."
        )
    
    onboarding_url = await stripe_connect_service.create_account_link(
        stripe_account_id,
        current_user["id"]
    )
    
    if not onboarding_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create onboarding link"
        )
    
    return {
        "onboarding_url": onboarding_url
    }


@router.get("/connect/balance")
async def get_seller_balance(
    current_user: dict = Depends(get_current_user)
):
    """Get the seller's Stripe balance"""
    
    stripe_account_id = current_user.get("stripe_connect_account_id")
    
    if not stripe_account_id:
        return {
            "available": 0,
            "pending": 0,
            "message": "Connect your Stripe account to see balance"
        }
    
    balance = await stripe_connect_service.get_balance(stripe_account_id)
    
    if not balance:
        return {
            "available": 0,
            "pending": 0,
            "message": "Could not retrieve balance"
        }
    
    # Convert from cents
    available = sum(b["amount"] for b in balance.get("available", []) if b["currency"] == "usd") / 100
    pending = sum(b["amount"] for b in balance.get("pending", []) if b["currency"] == "usd") / 100
    
    return {
        "available": available,
        "pending": pending,
        "currency": "USD"
    }


@router.get("/webhook-info")
async def get_webhook_info():
    """
    Get webhook configuration information for production setup
    
    In production, you need to:
    1. Go to Stripe Dashboard > Developers > Webhooks
    2. Add endpoint URL: https://your-domain.com/api/payments/webhook
    3. Select events: checkout.session.completed, checkout.session.expired, etc.
    4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET env var
    """
    return {
        "webhook_url": f"{settings.frontend_url}/api/payments/webhook",
        "required_events": [
            "checkout.session.completed",
            "checkout.session.expired",
            "payment_intent.succeeded",
            "payment_intent.payment_failed",
            "charge.refunded",
            "account.updated",
            "payout.paid",
            "payout.failed"
        ],
        "webhook_secret_configured": bool(settings.stripe_webhook_secret),
        "instructions": {
            "step1": "Go to Stripe Dashboard > Developers > Webhooks",
            "step2": "Click 'Add endpoint'",
            "step3": f"Enter URL: {settings.frontend_url}/api/payments/webhook",
            "step4": "Select the events listed above",
            "step5": "Copy the signing secret and add to STRIPE_WEBHOOK_SECRET env var"
        }
    }