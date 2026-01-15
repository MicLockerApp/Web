from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.cart import CartItem, CartItemCreate, CartItemUpdate, CartResponse
from services.auth import get_current_user
from database import get_database
from analytics.services.event_emitter import emit_event, EventTypes, ActorType
from datetime import datetime
from typing import List

router = APIRouter(prefix="/cart", tags=["Cart"])

@router.get("", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    """Get current user's cart"""
    db = get_database()
    
    cart_items = await db.cart_items.find({"user_id": current_user["id"]}).to_list(length=100)
    
    subtotal = sum(item["listing_price"] * item["quantity"] for item in cart_items)
    shipping_total = sum(item.get("shipping_cost", 0) * item["quantity"] for item in cart_items)
    
    return CartResponse(
        items=[CartItem(**item) for item in cart_items],
        subtotal=round(subtotal, 2),
        shipping_total=round(shipping_total, 2),
        total=round(subtotal + shipping_total, 2),
        item_count=len(cart_items)
    )

@router.post("/items")
async def add_to_cart(
    item_data: CartItemCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add item to cart"""
    db = get_database()
    
    # Get listing
    listing = await db.listings.find_one({"id": item_data.listing_id, "status": "active"})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or no longer available"
        )
    
    # Can't add own listing to cart
    if listing["seller_id"] == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot add your own listing to cart"
        )
    
    # Check quantity available
    available = listing["quantity"] - listing.get("sold_quantity", 0)
    if item_data.quantity > available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {available} items available"
        )
    
    # Check if already in cart
    existing = await db.cart_items.find_one({
        "user_id": current_user["id"],
        "listing_id": item_data.listing_id
    })
    
    if existing:
        # Update quantity
        new_quantity = existing["quantity"] + item_data.quantity
        if new_quantity > available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot add more. Only {available} items available"
            )
        
        await db.cart_items.update_one(
            {"id": existing["id"]},
            {"$set": {"quantity": new_quantity}}
        )
        return {"message": "Cart updated", "quantity": new_quantity}
    
    # Get primary image
    primary_image = None
    for media in listing.get("media", []):
        if media.get("is_primary"):
            primary_image = media.get("url")
            break
    if not primary_image and listing.get("media"):
        primary_image = listing["media"][0].get("url")
    
    # Create cart item
    cart_item = CartItem(
        user_id=current_user["id"],
        listing_id=listing["id"],
        quantity=item_data.quantity,
        listing_title=listing["title"],
        listing_price=listing["price"],
        listing_image=primary_image,
        seller_id=listing["seller_id"],
        seller_username=listing["seller_username"],
        shipping_cost=listing.get("shipping", {}).get("price", 0)
    )
    
    await db.cart_items.insert_one(cart_item.model_dump())
    
    # Emit analytics event for adding to cart
    emit_event(
        EventTypes.CART_ITEM_ADDED,
        actor_type=ActorType.BUYER,
        actor_id=current_user["id"],
        actor_username=current_user["username"],
        listing_id=listing["id"],
        target_user_id=listing["seller_id"],
        metadata={
            "listing_price": listing["price"],
            "quantity": item_data.quantity,
            "category": listing.get("category"),
            "listing_title": listing["title"]
        }
    )
    
    return {"message": "Item added to cart", "item": cart_item.model_dump()}

@router.put("/items/{item_id}")
async def update_cart_item(
    item_id: str,
    item_data: CartItemUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update cart item quantity"""
    db = get_database()
    
    cart_item = await db.cart_items.find_one({
        "id": item_id,
        "user_id": current_user["id"]
    })
    
    if not cart_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    # Verify listing availability
    listing = await db.listings.find_one({"id": cart_item["listing_id"]})
    if listing:
        available = listing["quantity"] - listing.get("sold_quantity", 0)
        if item_data.quantity > available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only {available} items available"
            )
    
    await db.cart_items.update_one(
        {"id": item_id},
        {"$set": {"quantity": item_data.quantity}}
    )
    
    return {"message": "Cart updated"}

@router.delete("/items/{item_id}")
async def remove_from_cart(
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove item from cart"""
    db = get_database()
    
    result = await db.cart_items.delete_one({
        "id": item_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found"
        )
    
    return {"message": "Item removed from cart"}

@router.delete("")
async def clear_cart(current_user: dict = Depends(get_current_user)):
    """Clear all items from cart"""
    db = get_database()
    
    await db.cart_items.delete_many({"user_id": current_user["id"]})
    
    return {"message": "Cart cleared"}
