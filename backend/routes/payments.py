"""
Stripe Payment Routes for MicLocker Marketplace

Features:
- Create checkout sessions
- Handle webhooks (both Account and Connect webhooks)
- Check payment status
- Fund holding until delivery
- Stripe Connect seller onboarding
- Fund transfers to sellers
- Embedded payment components
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


class EmbeddedCheckoutRequest(BaseModel):
    """Request for embedded checkout (Payment Element)"""
    origin_url: str
    offer_id: Optional[str] = None
    shipping_address: ShippingAddress


class EmbeddedCheckoutResponse(BaseModel):
    """Response with client secret for embedded payment"""
    client_secret: str
    order_id: str
    amount: float
    currency: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    checkout_data: CheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Stripe checkout session for the user's cart
    
    Flow:
    1. Check review gating
    2. Get items from cart (or accepted offer)
    3. Calculate totals and fees
    4. Create order in pending state
    5. Create Stripe checkout session
    6. Return checkout URL
    
    Funds are held until delivery is confirmed.
    """
    db = get_database()
    
    # Review Gating Check: If user has made a purchase before and has a pending review, block checkout
    if current_user.get("first_purchase_completed") and current_user.get("pending_review_order_id"):
        pending_order = await db.orders.find_one({"id": current_user["pending_review_order_id"]})
        if pending_order and pending_order.get("status") in ["delivered", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "review_required",
                    "message": "You must review your seller from your last purchase before making a new purchase.",
                    "order_id": current_user["pending_review_order_id"],
                    "order_number": pending_order.get("order_number")
                }
            )
    
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
    
    # Get seller's Stripe Connect account ID for destination charges
    seller_stripe_account_id = None
    if seller_id:
        seller = await db.users.find_one({"id": seller_id})
        if seller:
            seller_stripe_account_id = seller.get("stripe_connect_account_id")
            # Only use Connect if seller has completed onboarding
            if seller_stripe_account_id:
                seller_status = seller.get("stripe_connect_status")
                if seller_status != "active" and not seller.get("stripe_can_receive_payouts"):
                    logger.warning(f"Seller {seller_id} has Connect account but status is {seller_status}")
                    # Still allow payment, but log warning
    
    # Create Stripe checkout session with Connect destination charges
    session = await stripe_service.create_checkout_session(
        amount=total,
        order_id=order_id,
        buyer_id=current_user["id"],
        seller_id=seller_id,
        listing_title=listing_titles,
        success_url=success_url,
        cancel_url=cancel_url,
        seller_stripe_account_id=seller_stripe_account_id,
        platform_fee_amount=platform_fee,
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


@router.post("/create-payment-intent", response_model=EmbeddedCheckoutResponse)
async def create_payment_intent(
    checkout_data: EmbeddedCheckoutRequest,
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Payment Intent for embedded checkout (Stripe Payment Element)
    
    This allows you to build a custom checkout experience using Stripe's
    Payment Element, which supports all payment methods in a single integration.
    
    Returns a client_secret to initialize the Payment Element on the frontend.
    """
    import stripe
    
    db = get_database()
    
    # Review Gating Check
    if current_user.get("first_purchase_completed") and current_user.get("pending_review_order_id"):
        pending_order = await db.orders.find_one({"id": current_user["pending_review_order_id"]})
        if pending_order and pending_order.get("status") in ["delivered", "completed"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "review_required",
                    "message": "You must review your seller from your last purchase before making a new purchase.",
                    "order_id": current_user["pending_review_order_id"]
                }
            )
    
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
            raise HTTPException(status_code=404, detail="Accepted offer not found")
        
        listing = await db.listings.find_one({"id": offer["listing_id"]})
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
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
            raise HTTPException(status_code=400, detail="Cart is empty")
        
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
                
                if not seller_id:
                    seller_id = listing["seller_id"]
                    seller_username = listing["seller_username"]
        
        if not items:
            raise HTTPException(status_code=400, detail="No available items in cart")
    
    # Calculate fees
    has_free_fees = current_user.get("has_lifetime_free_fees", False)
    platform_fee = 0.0 if has_free_fees else round(subtotal * (settings.platform_fee_percent / 100), 2)
    payment_processing_fee = round(
        subtotal * (settings.payment_processing_percent / 100) + settings.payment_processing_fixed, 
        2
    )
    total = round(subtotal + shipping_total + payment_processing_fee, 2)
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
    
    # Create Payment Intent
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=int(total * 100),  # Amount in cents
            currency="usd",
            automatic_payment_methods={"enabled": True},
            metadata={
                "order_id": order_id,
                "buyer_id": current_user["id"],
                "buyer_username": current_user["username"],
                "seller_id": seller_id or "multiple",
                "seller_username": seller_username or "multiple",
                "platform_fee": str(platform_fee),
                "seller_payout": str(seller_payout)
            }
        )
        
        # Update order with payment intent ID
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "stripe_payment_intent_id": payment_intent.id,
                "payment_info.stripe_payment_intent_id": payment_intent.id
            }}
        )
        
        logger.info(f"Created payment intent {payment_intent.id} for order {order_id}")
        
        return EmbeddedCheckoutResponse(
            client_secret=payment_intent.client_secret,
            order_id=order_id,
            amount=total,
            currency="usd"
        )
        
    except stripe.error.StripeError as e:
        # Clean up the order if Stripe fails
        await db.orders.delete_one({"id": order_id})
        logger.error(f"Stripe error creating payment intent: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create payment: {str(e)}"
        )


@router.post("/confirm-payment/{order_id}")
async def confirm_payment(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Confirm payment completion for embedded checkout
    
    Called after the Payment Element completes successfully on the frontend.
    Verifies the payment and updates the order status.
    """
    import stripe
    
    db = get_database()
    
    # Find the order
    order = await db.orders.find_one({
        "id": order_id,
        "buyer_id": current_user["id"]
    })
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get the payment intent from Stripe
    payment_intent_id = order.get("stripe_payment_intent_id")
    if not payment_intent_id:
        raise HTTPException(status_code=400, detail="No payment intent found for this order")
    
    try:
        payment_intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if payment_intent.status == "succeeded":
            # Payment successful - update order
            if order["status"] == "awaiting_payment":
                await db.orders.update_one(
                    {"id": order_id},
                    {"$set": {
                        "status": "paid",
                        "payment_info.funds_status": "held",
                        "seller_payout_status": "held",
                        "paid_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }}
                )
                
                # Clear cart
                if not order.get("offer_id"):
                    await db.cart_items.delete_many({"user_id": current_user["id"]})
                else:
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
                
                # Send notifications
                try:
                    await notify_seller_of_sale(db, order)
                    await send_buyer_confirmation(db, order)
                except Exception as e:
                    logger.error(f"Error sending notifications: {e}")
            
            return {
                "status": "success",
                "order_id": order_id,
                "payment_status": "paid",
                "funds_status": "held"
            }
        
        elif payment_intent.status == "processing":
            return {
                "status": "processing",
                "order_id": order_id,
                "payment_status": "processing",
                "message": "Payment is still processing"
            }
        
        else:
            return {
                "status": "failed",
                "order_id": order_id,
                "payment_status": payment_intent.status,
                "message": "Payment was not successful"
            }
            
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error confirming payment: {e}")
        raise HTTPException(status_code=500, detail=f"Error confirming payment: {str(e)}")


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
# Stripe Webhook Handler (Account + Connect)
# ============================================

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """
    Handle Stripe webhook events (Account webhooks)
    
    This endpoint receives real-time events from Stripe for platform activity:
    - checkout.session.completed: Payment was successful
    - checkout.session.expired: Checkout session expired
    - payment_intent.succeeded: Payment intent succeeded
    - payment_intent.payment_failed: Payment failed
    - charge.refunded: Refund was processed
    
    For Connect webhooks (connected account activity), use /webhook/connect
    """
    import stripe
    
    db = get_database()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    # Verify webhook signature in production
    webhook_secret = settings.stripe_webhook_secret
    
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        else:
            # Test mode without signature verification
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
    
    # Account-level events (platform's own account)
    elif event_type == "account.updated":
        await handle_platform_account_updated(db, event_data)
    
    return {"status": "success", "event_type": event_type}


@router.post("/webhook/connect")
async def stripe_connect_webhook(request: Request):
    """
    Handle Stripe Connect webhook events (Connected Account activity)
    
    This endpoint receives events for connected accounts:
    - account.updated: Connected account details changed
    - account.application.deauthorized: Account disconnected from platform
    - transfer.created: Transfer to connected account created
    - transfer.reversed: Transfer reversed
    - payout.paid: Payout to bank succeeded
    - payout.failed: Payout to bank failed
    - capability.updated: Account capability status changed
    - person.updated: Person verification status changed
    
    Configure this endpoint in Stripe Dashboard with "Events on Connected accounts"
    """
    import stripe
    
    db = get_database()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    # Use Connect webhook secret (different from account webhook secret)
    connect_webhook_secret = settings.stripe_connect_webhook_secret
    
    try:
        if connect_webhook_secret:
            event = stripe.Webhook.construct_event(
                payload, sig_header, connect_webhook_secret
            )
        else:
            # Test mode without signature verification
            event = stripe.Event.construct_from(
                stripe.util.json.loads(payload),
                stripe.api_key
            )
    except ValueError as e:
        logger.error(f"Invalid Connect webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid Connect webhook signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    event_type = event.type
    event_data = event.data.object
    
    # Get the connected account ID from the event
    connected_account_id = event.get("account")
    
    logger.info(f"Received Stripe Connect webhook: {event_type} for account {connected_account_id}")
    
    # Handle Connect-specific events
    if event_type == "account.updated":
        await handle_connected_account_updated(db, event_data, connected_account_id)
    
    elif event_type == "account.application.deauthorized":
        await handle_account_deauthorized(db, event_data, connected_account_id)
    
    elif event_type == "transfer.created":
        await handle_transfer_created(db, event_data)
    
    elif event_type == "transfer.reversed":
        await handle_transfer_reversed(db, event_data)
    
    elif event_type == "payout.paid":
        await handle_payout_paid(db, event_data, connected_account_id)
    
    elif event_type == "payout.failed":
        await handle_payout_failed(db, event_data, connected_account_id)
    
    elif event_type == "capability.updated":
        await handle_capability_updated(db, event_data, connected_account_id)
    
    elif event_type == "person.updated":
        await handle_person_updated(db, event_data, connected_account_id)
    
    return {"status": "success", "event_type": event_type, "account": connected_account_id}


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


async def handle_platform_account_updated(db, account):
    """Handle platform's own Stripe account updates"""
    logger.info(f"Platform account updated: {account.get('id')}")
    # Store platform account status if needed
    await db.platform_settings.update_one(
        {"key": "stripe_account_status"},
        {"$set": {
            "value": {
                "account_id": account.get("id"),
                "charges_enabled": account.get("charges_enabled"),
                "payouts_enabled": account.get("payouts_enabled"),
                "updated_at": datetime.utcnow()
            }
        }},
        upsert=True
    )


# ============================================
# Connect Webhook Handlers
# ============================================

async def handle_connected_account_updated(db, account, connected_account_id: str):
    """
    Handle connected account (seller) status updates
    
    This is triggered when:
    - Seller completes identity verification
    - Bank account is added/verified
    - Account capabilities change
    - Requirements are updated
    """
    account_id = account.get("id") or connected_account_id
    
    # Find the user with this Stripe account
    user = await db.users.find_one({"stripe_connect_account_id": account_id})
    
    if not user:
        logger.warning(f"No user found for Stripe account {account_id}")
        return
    
    # Extract account status
    charges_enabled = account.get("charges_enabled", False)
    payouts_enabled = account.get("payouts_enabled", False)
    details_submitted = account.get("details_submitted", False)
    
    # Determine overall status
    if charges_enabled and payouts_enabled and details_submitted:
        new_status = "active"
        can_receive_payouts = True
    elif details_submitted:
        new_status = "pending_verification"
        can_receive_payouts = False
    else:
        new_status = "pending"
        can_receive_payouts = False
    
    # Get requirements if any
    requirements = account.get("requirements", {})
    currently_due = requirements.get("currently_due", [])
    eventually_due = requirements.get("eventually_due", [])
    past_due = requirements.get("past_due", [])
    disabled_reason = requirements.get("disabled_reason")
    
    # Update user's Stripe status
    update_data = {
        "stripe_connect_status": new_status,
        "stripe_charges_enabled": charges_enabled,
        "stripe_payouts_enabled": payouts_enabled,
        "stripe_details_submitted": details_submitted,
        "stripe_can_receive_payouts": can_receive_payouts,
        "stripe_requirements": {
            "currently_due": currently_due,
            "eventually_due": eventually_due,
            "past_due": past_due,
            "disabled_reason": disabled_reason
        },
        "updated_at": datetime.utcnow()
    }
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update_data}
    )
    
    logger.info(f"Updated seller {user['username']} Stripe status to {new_status}")
    
    # Send notification if account became active
    if new_status == "active" and user.get("stripe_connect_status") != "active":
        await send_seller_stripe_active_notification(db, user)


async def handle_account_deauthorized(db, application, connected_account_id: str):
    """
    Handle when a connected account disconnects from the platform
    
    This happens when a seller manually disconnects their Stripe account
    from your platform in their Stripe Dashboard.
    """
    # Find the user with this Stripe account
    user = await db.users.find_one({"stripe_connect_account_id": connected_account_id})
    
    if not user:
        logger.warning(f"No user found for deauthorized account {connected_account_id}")
        return
    
    # Update user's Stripe status
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "stripe_connect_status": "disconnected",
            "stripe_can_receive_payouts": False,
            "stripe_disconnected_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }}
    )
    
    logger.info(f"Seller {user['username']} disconnected their Stripe account")
    
    # Notify the seller
    await send_seller_stripe_disconnected_notification(db, user)


async def handle_transfer_created(db, transfer):
    """
    Handle when a transfer to a connected account is created
    
    This confirms that funds have been moved from the platform
    to the seller's connected account.
    """
    transfer_id = transfer.get("id")
    destination = transfer.get("destination")  # Connected account ID
    amount = transfer.get("amount", 0)  # Amount in cents
    transfer_group = transfer.get("transfer_group", "")  # Contains order_id
    metadata = transfer.get("metadata", {})
    
    # Extract order_id from transfer_group (format: "order_{order_id}")
    order_id = metadata.get("order_id") or (transfer_group.replace("order_", "") if transfer_group.startswith("order_") else None)
    
    if order_id:
        # Update order with transfer info
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "stripe_transfer_id": transfer_id,
                "seller_payout_status": "transferred",
                "transfer_created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"Transfer {transfer_id} created for order {order_id}: ${amount/100:.2f}")
    
    # Log transfer record
    await db.stripe_transfers.insert_one({
        "id": str(uuid.uuid4()),
        "stripe_transfer_id": transfer_id,
        "destination_account": destination,
        "amount_cents": amount,
        "currency": transfer.get("currency", "usd"),
        "order_id": order_id,
        "transfer_group": transfer_group,
        "status": "created",
        "created_at": datetime.utcnow()
    })


async def handle_transfer_reversed(db, transfer):
    """
    Handle when a transfer is reversed (e.g., due to refund)
    """
    transfer_id = transfer.get("id")
    
    # Update transfer record
    await db.stripe_transfers.update_one(
        {"stripe_transfer_id": transfer_id},
        {"$set": {
            "status": "reversed",
            "reversed_at": datetime.utcnow()
        }}
    )
    
    # Update order if found
    order = await db.orders.find_one({"stripe_transfer_id": transfer_id})
    if order:
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "seller_payout_status": "reversed",
                "updated_at": datetime.utcnow()
            }}
        )
    
    logger.info(f"Transfer {transfer_id} reversed")


async def handle_payout_paid(db, payout, connected_account_id: str):
    """
    Handle when a payout to a seller's bank account succeeds
    
    This means the funds have been deposited to the seller's bank.
    """
    payout_id = payout.get("id")
    amount = payout.get("amount", 0)
    arrival_date = payout.get("arrival_date")
    
    # Find seller
    user = await db.users.find_one({"stripe_connect_account_id": connected_account_id})
    
    if user:
        logger.info(f"Payout {payout_id} of ${amount/100:.2f} paid to seller {user['username']}")
        
        # Log payout record
        await db.stripe_payouts.insert_one({
            "id": str(uuid.uuid4()),
            "stripe_payout_id": payout_id,
            "connected_account_id": connected_account_id,
            "user_id": user["id"],
            "amount_cents": amount,
            "currency": payout.get("currency", "usd"),
            "status": "paid",
            "arrival_date": datetime.fromtimestamp(arrival_date) if arrival_date else None,
            "created_at": datetime.utcnow()
        })


async def handle_payout_failed(db, payout, connected_account_id: str):
    """
    Handle when a payout to a seller's bank account fails
    
    Common reasons: invalid bank account, insufficient funds, etc.
    """
    payout_id = payout.get("id")
    failure_code = payout.get("failure_code")
    failure_message = payout.get("failure_message")
    
    # Find seller
    user = await db.users.find_one({"stripe_connect_account_id": connected_account_id})
    
    if user:
        logger.error(f"Payout {payout_id} failed for seller {user['username']}: {failure_code} - {failure_message}")
        
        # Log failed payout
        await db.stripe_payouts.insert_one({
            "id": str(uuid.uuid4()),
            "stripe_payout_id": payout_id,
            "connected_account_id": connected_account_id,
            "user_id": user["id"],
            "amount_cents": payout.get("amount", 0),
            "currency": payout.get("currency", "usd"),
            "status": "failed",
            "failure_code": failure_code,
            "failure_message": failure_message,
            "created_at": datetime.utcnow()
        })
        
        # Notify seller about failed payout
        await send_seller_payout_failed_notification(db, user, failure_message)


async def handle_capability_updated(db, capability, connected_account_id: str):
    """
    Handle when an account capability status changes
    
    Capabilities include: card_payments, transfers, etc.
    """
    capability_id = capability.get("id")  # e.g., "card_payments"
    capability_status = capability.get("status")  # active, inactive, pending
    
    logger.info(f"Capability {capability_id} updated to {capability_status} for account {connected_account_id}")
    
    # Update user's capability status
    user = await db.users.find_one({"stripe_connect_account_id": connected_account_id})
    if user:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                f"stripe_capabilities.{capability_id}": capability_status,
                "updated_at": datetime.utcnow()
            }}
        )


async def handle_person_updated(db, person, connected_account_id: str):
    """
    Handle when a person's verification status changes
    
    This is for identity verification of account representatives.
    """
    person_id = person.get("id")
    verification_status = person.get("verification", {}).get("status")
    
    logger.info(f"Person {person_id} verification status: {verification_status} for account {connected_account_id}")


# ============================================
# Notification Helpers for Connect Events
# ============================================

async def send_seller_stripe_active_notification(db, user: dict):
    """Send notification when seller's Stripe account becomes active"""
    system_user = await db.users.find_one({"is_system_user": True})
    system_user_id = system_user["id"] if system_user else "system-support"
    
    message_content = """🎉 **Great news! Your Stripe account is now active!**

Your identity has been verified and your bank account is connected. You're all set to receive payments from your sales on MicLocker!

**What happens when you make a sale:**
1. Buyer pays for your item
2. Funds are held until delivery is confirmed
3. Once confirmed, funds are transferred to your Stripe account
4. Stripe automatically deposits to your bank (usually 2-3 business days)

You can view your balance and payout history in your Seller Dashboard.

Start listing your gear and make some sales! 🎸
"""
    
    thread = await db.message_threads.find_one({
        "participants": {"$all": [system_user_id, user["id"]], "$size": 2}
    })
    
    if not thread:
        thread = {
            "id": str(uuid.uuid4()),
            "participants": [system_user_id, user["id"]],
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


async def send_seller_stripe_disconnected_notification(db, user: dict):
    """Send notification when seller disconnects their Stripe account"""
    system_user = await db.users.find_one({"is_system_user": True})
    system_user_id = system_user["id"] if system_user else "system-support"
    
    message_content = """⚠️ **Your Stripe account has been disconnected**

We noticed that your Stripe account is no longer connected to MicLocker. This means:

- You won't be able to receive payments from new sales
- Any pending payouts may be affected
- Your existing listings will remain, but buyers can't complete purchases

**To reconnect:**
Go to your Seller Dashboard and click "Set Up Stripe Payments" to reconnect your account.

If you disconnected by mistake or need help, please contact our support team.
"""
    
    thread = await db.message_threads.find_one({
        "participants": {"$all": [system_user_id, user["id"]], "$size": 2}
    })
    
    if not thread:
        thread = {
            "id": str(uuid.uuid4()),
            "participants": [system_user_id, user["id"]],
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


async def send_seller_payout_failed_notification(db, user: dict, failure_message: str):
    """Send notification when seller's payout fails"""
    system_user = await db.users.find_one({"is_system_user": True})
    system_user_id = system_user["id"] if system_user else "system-support"
    
    message_content = f"""⚠️ **Payout Failed**

We were unable to deposit funds to your bank account.

**Reason:** {failure_message or 'Unknown error'}

**What to do:**
1. Check that your bank account details are correct in Stripe
2. Ensure your bank account can receive ACH transfers
3. Contact your bank if the issue persists

To update your bank account, go to your Seller Dashboard and click "Manage Stripe Account".

If you need help, please contact our support team.
"""
    
    thread = await db.message_threads.find_one({
        "participants": {"$all": [system_user_id, user["id"]], "$size": 2}
    })
    
    if not thread:
        thread = {
            "id": str(uuid.uuid4()),
            "participants": [system_user_id, user["id"]],
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


# ============================================
# Stripe Connect - Seller Onboarding & Payouts
# ============================================

@router.post("/connect/onboard")
async def start_seller_onboarding(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Start Stripe Connect onboarding for a seller
    
    Creates an Express account and returns the onboarding URL.
    Sellers complete identity verification and add bank account on Stripe's hosted page.
    """
    db = get_database()
    
    # Get origin URL from request for dynamic redirect URLs
    origin_url = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
    if origin_url and origin_url.endswith("/"):
        origin_url = origin_url[:-1]
    
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
            current_user["id"],
            origin_url
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
        current_user["id"],
        origin_url
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
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Generate a new onboarding link if the previous one expired"""
    
    # Get origin URL from request for dynamic redirect URLs
    origin_url = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
    
    stripe_account_id = current_user.get("stripe_connect_account_id")
    
    if not stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No Stripe account found. Start onboarding first."
        )
    
    onboarding_url = await stripe_connect_service.create_account_link(
        stripe_account_id,
        current_user["id"],
        origin_url
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
    
    MicLocker requires TWO webhook endpoints in Stripe Dashboard:
    
    1. ACCOUNT WEBHOOK (Platform events)
       - For events on your own Stripe account
       
    2. CONNECT WEBHOOK (Connected Account events)  
       - For events on seller accounts
       - Enable "Events on Connected accounts" when creating
    """
    base_url = settings.frontend_url.rstrip('/')
    
    return {
        "account_webhook": {
            "url": f"{base_url}/api/payments/webhook",
            "description": "For platform account events (payments, refunds)",
            "required_events": [
                "checkout.session.completed",
                "checkout.session.expired",
                "payment_intent.succeeded",
                "payment_intent.payment_failed",
                "charge.refunded",
                "charge.dispute.created",
                "charge.dispute.closed"
            ],
            "webhook_secret_env_var": "STRIPE_WEBHOOK_SECRET",
            "secret_configured": bool(settings.stripe_webhook_secret)
        },
        "connect_webhook": {
            "url": f"{base_url}/api/payments/webhook/connect",
            "description": "For connected account (seller) events - enable 'Events on Connected accounts'",
            "required_events": [
                "account.updated",
                "account.application.deauthorized",
                "capability.updated",
                "person.updated",
                "transfer.created",
                "transfer.reversed",
                "payout.paid",
                "payout.failed"
            ],
            "webhook_secret_env_var": "STRIPE_CONNECT_WEBHOOK_SECRET",
            "secret_configured": bool(settings.stripe_connect_webhook_secret)
        },
        "setup_instructions": {
            "step1": "Go to Stripe Dashboard > Developers > Webhooks",
            "step2": "Click 'Add endpoint' to create the ACCOUNT webhook",
            "step3": f"Enter URL: {base_url}/api/payments/webhook",
            "step4": "Select the account webhook events listed above",
            "step5": "Save and copy the signing secret to STRIPE_WEBHOOK_SECRET",
            "step6": "Click 'Add endpoint' again for the CONNECT webhook",
            "step7": f"Enter URL: {base_url}/api/payments/webhook/connect",
            "step8": "CHECK 'Events on Connected accounts' option",
            "step9": "Select the connect webhook events listed above",
            "step10": "Save and copy the signing secret to STRIPE_CONNECT_WEBHOOK_SECRET"
        },
        "stripe_dashboard_url": "https://dashboard.stripe.com/webhooks"
    }