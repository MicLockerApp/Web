from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.order import (
    OrderCreate, OrderInDB, OrderResponse, OrderItem,
    ShippingAddress, PaymentInfo, OrderStatusUpdate
)
from services.auth import get_current_user
from database import get_database
from config import settings
from datetime import datetime
from typing import Optional
import uuid

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new order from cart or accepted offer"""
    db = get_database()
    
    items = []
    subtotal = 0
    shipping_total = 0
    
    if order_data.offer_id:
        # Order from accepted offer
        offer = await db.offers.find_one({
            "id": order_data.offer_id,
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
            listing_image=offer.get("listing_image"),
            quantity=1,
            shipping_cost=listing.get("shipping", {}).get("price", 0),
            seller_id=listing["seller_id"],
            seller_username=listing["seller_username"]
        )
        items.append(item)
        subtotal = offer["final_price"]
        shipping_total = item.shipping_cost
        
        # Mark offer as ordered
        await db.offers.update_one(
            {"id": order_data.offer_id},
            {"$set": {"status": "ordered", "updated_at": datetime.utcnow()}}
        )
    else:
        # Order from cart
        cart_items = await db.cart_items.find({"user_id": current_user["id"]}).to_list(length=100)
        
        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty"
            )
        
        for cart_item in cart_items:
            # Verify listing is still available
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
        
        if not items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No available items in cart"
            )
        
        # Clear cart
        await db.cart_items.delete_many({"user_id": current_user["id"]})
    
    # Calculate fees
    # Platform fee: 3% of subtotal (goes to MicLocker)
    platform_fee = round(subtotal * (settings.platform_fee_percent / 100), 2)
    # Payment processing fee: 3.19% + $0.49 per transaction (goes to payment processor)
    payment_processing_fee = round(subtotal * (settings.payment_processing_percent / 100) + settings.payment_processing_fixed, 2)
    # Total buyer pays
    total = round(subtotal + shipping_total + payment_processing_fee, 2)
    
    # Create order
    order = OrderInDB(
        buyer_id=current_user["id"],
        buyer_username=current_user["username"],
        items=[item.model_dump() for item in items],
        shipping_address=order_data.shipping_address,
        payment_info=PaymentInfo(
            method=order_data.payment_method,
            transaction_id=f"MOCK-{str(uuid.uuid4())[:8].upper()}"
        ),
        subtotal=subtotal,
        shipping_total=shipping_total,
        platform_fee=platform_fee,
        payment_processing_fee=payment_processing_fee,
        total=total,
        status="paid",  # Mock payment - mark as paid
        offer_id=order_data.offer_id,
        paid_at=datetime.utcnow()
    )
    
    await db.orders.insert_one(order.model_dump())
    
    # Update listing quantities and seller stats
    for item in items:
        await db.listings.update_one(
            {"id": item.listing_id},
            {"$inc": {"sold_quantity": item.quantity}}
        )
        
        # Check if sold out
        listing = await db.listings.find_one({"id": item.listing_id})
        if listing and listing["sold_quantity"] >= listing["quantity"]:
            await db.listings.update_one(
                {"id": item.listing_id},
                {"$set": {"status": "sold"}}
            )
        
        # Update seller stats
        await db.users.update_one(
            {"id": item.seller_id},
            {"$inc": {"total_sales": 1}}
        )
    
    return OrderResponse(**order.model_dump())

@router.get("", response_model=dict)
async def get_orders(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's orders (as buyer)"""
    db = get_database()
    
    filter_query = {"buyer_id": current_user["id"]}
    if status:
        filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.orders.count_documents(filter_query)
    cursor = db.orders.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    orders = await cursor.to_list(length=limit)
    
    return {
        "orders": [OrderResponse(**order) for order in orders],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/sales", response_model=dict)
async def get_sales(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Get orders where current user is seller"""
    db = get_database()
    
    # Find orders containing items sold by this user
    filter_query = {"items.seller_id": current_user["id"]}
    if status:
        filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.orders.count_documents(filter_query)
    cursor = db.orders.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    orders = await cursor.to_list(length=limit)
    
    return {
        "orders": [OrderResponse(**order) for order in orders],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific order"""
    db = get_database()
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user is buyer or seller
    is_buyer = order["buyer_id"] == current_user["id"]
    is_seller = any(item["seller_id"] == current_user["id"] for item in order["items"])
    is_admin = current_user.get("is_admin", False)
    
    if not (is_buyer or is_seller or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )
    
    return OrderResponse(**order)

@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update order status (seller can mark as shipped, etc.)"""
    db = get_database()
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    is_seller = any(item["seller_id"] == current_user["id"] for item in order["items"])
    is_buyer = order["buyer_id"] == current_user["id"]
    is_admin = current_user.get("is_admin", False)
    
    if not (is_seller or is_buyer or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this order"
        )
    
    valid_statuses = ["pending", "paid", "shipped", "delivered", "completed", "cancelled", "refunded"]
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )
    
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.utcnow()
    }
    
    if status_update.status == "shipped":
        update_data["shipped_at"] = datetime.utcnow()
    elif status_update.status == "delivered":
        update_data["delivered_at"] = datetime.utcnow()
    elif status_update.status == "completed":
        update_data["completed_at"] = datetime.utcnow()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    return {"message": "Order status updated", "status": status_update.status}
