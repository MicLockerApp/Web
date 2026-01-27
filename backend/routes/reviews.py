from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.review import ReviewCreate, ReviewInDB, ReviewResponse, ITEM_CONDITION_OPTIONS
from services.auth import get_current_user
from database import get_database
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/reviews", tags=["Reviews"])

class ConfirmReceiptRequest(BaseModel):
    received: bool  # True if received, False if not yet received

class FlagReviewRequest(BaseModel):
    reason: str
    details: Optional[str] = None

@router.get("/pending")
async def get_pending_review(current_user: dict = Depends(get_current_user)):
    """
    Check if user has any pending review obligations.
    Returns the order details if they need to submit a review or support ticket.
    """
    db = get_database()
    
    # Check if user has a pending review
    pending_order_id = current_user.get("pending_review_order_id")
    pending_type = current_user.get("pending_review_type")
    pending_locked = current_user.get("pending_review_locked", False)
    must_submit_ticket = current_user.get("must_submit_ticket_order_id")
    
    if must_submit_ticket:
        # User must submit support ticket for non-receipt (14-day)
        order = await db.orders.find_one({"id": must_submit_ticket})
        if order:
            return {
                "has_pending": True,
                "type": "support_ticket",
                "locked": True,
                "order_id": must_submit_ticket,
                "order": {
                    "id": order["id"],
                    "order_number": order.get("order_number"),
                    "items": order.get("items", []),
                    "seller_username": order["items"][0]["seller_username"] if order.get("items") else "Unknown",
                    "shipped_at": order.get("shipped_at"),
                    "total": order.get("total")
                },
                "message": "Please submit a support ticket about your item not being received."
            }
    
    if pending_order_id and pending_locked:
        order = await db.orders.find_one({"id": pending_order_id})
        if order:
            # Get the other party's info
            if pending_type == "buyer":
                # Buyer needs to review seller
                other_user_id = order["items"][0]["seller_id"]
                other_username = order["items"][0]["seller_username"]
            else:
                # Seller needs to review buyer
                other_user_id = order["buyer_id"]
                other_username = order.get("buyer_username", "Unknown")
            
            # Get other user's profile
            other_user = await db.users.find_one({"id": other_user_id})
            
            return {
                "has_pending": True,
                "type": "review",
                "review_type": pending_type,
                "locked": True,
                "order_id": pending_order_id,
                "order": {
                    "id": order["id"],
                    "order_number": order.get("order_number"),
                    "items": order.get("items", []),
                    "total": order.get("total"),
                    "shipped_at": order.get("shipped_at"),
                    "delivered_at": order.get("delivered_at")
                },
                "other_user": {
                    "id": other_user_id,
                    "username": other_username,
                    "profile_image": other_user.get("profile_image") if other_user else None,
                    "rating": other_user.get("rating", 0) if other_user else 0,
                    "review_count": other_user.get("review_count", 0) if other_user else 0
                },
                "message": f"Please review your {'seller' if pending_type == 'buyer' else 'buyer'} to continue using MicLocker."
            }
    
    return {"has_pending": False, "locked": False}

@router.post("/confirm-receipt/{order_id}")
async def confirm_receipt(
    order_id: str,
    request: ConfirmReceiptRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Buyer confirms whether they received the item.
    If received: Locks their account until they submit a review.
    If not received: Continues check-in process.
    """
    db = get_database()
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["buyer_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only the buyer can confirm receipt")
    
    if order["status"] not in ["shipped", "delivered"]:
        raise HTTPException(status_code=400, detail="Order must be shipped first")
    
    if request.received:
        # Buyer received the item - lock their account for review
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "buyer_confirmed_receipt": True,
                "buyer_confirmed_receipt_at": datetime.utcnow(),
                "status": "delivered",
                "delivered_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Lock buyer's account until they review
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {
                "pending_review_order_id": order_id,
                "pending_review_type": "buyer",
                "pending_review_locked": True,
                "updated_at": datetime.utcnow()
            }}
        )
        
        return {
            "message": "Receipt confirmed. Please submit your review of the seller.",
            "review_required": True,
            "locked": True
        }
    else:
        # Not received yet - continue check-ins
        return {
            "message": "Thank you for letting us know. We'll check in again soon.",
            "review_required": False,
            "locked": False
        }

@router.post("", response_model=ReviewResponse)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a review for a completed order.
    - Buyers can review sellers (buyer_to_seller)
    - Sellers can review buyers (seller_to_buyer)
    Reviews are public and displayed on user profiles.
    
    After submitting a review, the user's pending_review_order_id is cleared,
    allowing them to perform their next action (buy/list).
    """
    db = get_database()
    
    # Get order
    order = await db.orders.find_one({"id": review_data.order_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Determine if user is buyer or seller
    is_buyer = order["buyer_id"] == current_user["id"]
    first_item = order["items"][0]
    is_seller = first_item["seller_id"] == current_user["id"]
    
    if not (is_buyer or is_seller):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this order"
        )
    
    # Validate review type matches user role
    if review_data.review_type == "buyer_to_seller" and not is_buyer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only the buyer can leave a seller review"
        )
    
    if review_data.review_type == "seller_to_buyer" and not is_seller:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only the seller can leave a buyer review"
        )
    
    # Check order status
    if order["status"] not in ["delivered", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only review completed orders"
        )
    
    # Check if already reviewed this type
    existing = await db.reviews.find_one({
        "order_id": review_data.order_id,
        "review_type": review_data.review_type
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have already submitted a {review_data.review_type.replace('_', ' ')} review for this order"
        )
    
    # Validate item condition if provided (only for buyer_to_seller)
    item_condition = None
    condition_notes = None
    if review_data.review_type == "buyer_to_seller":
        if review_data.item_condition:
            if review_data.item_condition not in ITEM_CONDITION_OPTIONS:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid item condition. Must be one of: {ITEM_CONDITION_OPTIONS}"
                )
            item_condition = review_data.item_condition
            condition_notes = review_data.condition_notes
    
    # Determine reviewer and reviewee
    if review_data.review_type == "buyer_to_seller":
        reviewer_id = order["buyer_id"]
        reviewer_username = order.get("buyer_username", "Unknown")
        reviewer_role = "buyer"
        reviewee_id = first_item["seller_id"]
        reviewee_username = first_item["seller_username"]
        reviewee_role = "seller"
    else:  # seller_to_buyer
        reviewer_id = first_item["seller_id"]
        reviewer_username = first_item["seller_username"]
        reviewer_role = "seller"
        reviewee_id = order["buyer_id"]
        reviewee_username = order.get("buyer_username", "Unknown")
        reviewee_role = "buyer"
    
    # Create review
    review = ReviewInDB(
        order_id=order["id"],
        listing_id=first_item["listing_id"],
        listing_title=first_item["listing_title"],
        reviewer_id=reviewer_id,
        reviewer_username=reviewer_username,
        reviewer_role=reviewer_role,
        reviewee_id=reviewee_id,
        reviewee_username=reviewee_username,
        reviewee_role=reviewee_role,
        buyer_id=order["buyer_id"],
        buyer_username=order.get("buyer_username", "Unknown"),
        seller_id=first_item["seller_id"],
        seller_username=first_item["seller_username"],
        rating=review_data.rating,
        comment=review_data.comment,
        review_type=review_data.review_type,
        item_condition=item_condition,
        condition_notes=condition_notes,
        is_public=True
    )
    
    await db.reviews.insert_one(review.model_dump())
    
    # Update order to mark review submitted and store review ID
    if is_buyer:
        order_update = {
            "buyer_review_submitted": True,
            "buyer_review_id": review.id,
            "updated_at": datetime.utcnow()
        }
    else:
        order_update = {
            "seller_review_submitted": True,
            "seller_review_id": review.id,
            "updated_at": datetime.utcnow()
        }
    
    await db.orders.update_one({"id": order["id"]}, {"$set": order_update})
    
    # Clear the user's pending review lock
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "pending_review_order_id": None,
            "pending_review_type": None,
            "pending_review_locked": False,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # If buyer just submitted review, lock seller for their review
    if is_buyer:
        seller_id = first_item["seller_id"]
        await db.users.update_one(
            {"id": seller_id},
            {"$set": {
                "pending_review_order_id": order["id"],
                "pending_review_type": "seller",
                "pending_review_locked": True,
                "updated_at": datetime.utcnow()
            }}
        )
    
    # Check if both reviews are now complete
    updated_order = await db.orders.find_one({"id": order["id"]})
    if updated_order.get("buyer_review_submitted") and updated_order.get("seller_review_submitted"):
        # Both reviews done - mark order as completed
        await db.orders.update_one(
            {"id": order["id"]},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
    
    # Update reviewee's rating statistics
    await update_user_rating(db, reviewee_id, reviewee_role)
    
    return ReviewResponse(**review.model_dump())


async def update_user_rating(db, user_id: str, role: str):
    """Update user's average rating based on reviews received"""
    # Get all reviews where this user is the reviewee
    reviews = await db.reviews.find({"reviewee_id": user_id}).to_list(length=1000)
    
    if reviews:
        avg_rating = sum(r["rating"] for r in reviews) / len(reviews)
        
        # Separate ratings by type
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
            {"id": user_id},
            {"$set": update_data}
        )


@router.get("/user/{user_id}", response_model=dict)
async def get_user_reviews(
    user_id: str,
    review_type: Optional[str] = Query(None, regex="^(as_seller|as_buyer|all)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """
    Get reviews for a user (public endpoint).
    - as_seller: Reviews the user received as a seller
    - as_buyer: Reviews the user received as a buyer
    - all: All reviews received
    """
    db = get_database()
    
    # Build filter based on review_type
    if review_type == "as_seller":
        filter_query = {"reviewee_id": user_id, "reviewee_role": "seller"}
    elif review_type == "as_buyer":
        filter_query = {"reviewee_id": user_id, "reviewee_role": "buyer"}
    else:
        filter_query = {"reviewee_id": user_id}
    
    skip = (page - 1) * limit
    
    total = await db.reviews.count_documents(filter_query)
    cursor = db.reviews.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    reviews = await cursor.to_list(length=limit)
    
    # Calculate rating distribution
    all_reviews = await db.reviews.find({"reviewee_id": user_id}).to_list(length=1000)
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in all_reviews:
        rating_distribution[r["rating"]] = rating_distribution.get(r["rating"], 0) + 1
    
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    
    # Separate stats
    seller_reviews = [r for r in all_reviews if r.get("reviewee_role") == "seller"]
    buyer_reviews = [r for r in all_reviews if r.get("reviewee_role") == "buyer"]
    
    return {
        "reviews": [ReviewResponse(**review) for review in reviews],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "average_rating": round(avg_rating, 2),
        "rating_distribution": rating_distribution,
        "stats": {
            "as_seller": {
                "count": len(seller_reviews),
                "average": round(sum(r["rating"] for r in seller_reviews) / len(seller_reviews), 2) if seller_reviews else 0
            },
            "as_buyer": {
                "count": len(buyer_reviews),
                "average": round(sum(r["rating"] for r in buyer_reviews) / len(buyer_reviews), 2) if buyer_reviews else 0
            }
        }
    }


@router.get("/seller/{seller_id}", response_model=dict)
async def get_seller_reviews(
    seller_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get reviews for a seller (legacy endpoint, now uses reviewee_id)"""
    db = get_database()
    
    # Support both old and new format
    filter_query = {
        "$or": [
            {"reviewee_id": seller_id, "reviewee_role": "seller"},
            {"seller_id": seller_id, "review_type": {"$exists": False}}  # Old format
        ]
    }
    skip = (page - 1) * limit
    
    total = await db.reviews.count_documents(filter_query)
    cursor = db.reviews.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    reviews = await cursor.to_list(length=limit)
    
    # Calculate rating distribution
    all_reviews = await db.reviews.find(filter_query).to_list(length=1000)
    rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in all_reviews:
        rating_distribution[r["rating"]] = rating_distribution.get(r["rating"], 0) + 1
    
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    
    return {
        "reviews": [ReviewResponse(**review) for review in reviews],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "average_rating": round(avg_rating, 2),
        "rating_distribution": rating_distribution
    }


@router.get("/order/{order_id}", response_model=dict)
async def get_order_reviews(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all reviews for a specific order"""
    db = get_database()
    
    # Verify user is part of the order
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    first_item = order["items"][0]
    if order["buyer_id"] != current_user["id"] and first_item["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    reviews = await db.reviews.find({"order_id": order_id}).to_list(length=10)
    
    buyer_review = None
    seller_review = None
    
    for r in reviews:
        if r.get("review_type") == "buyer_to_seller":
            buyer_review = ReviewResponse(**r)
        elif r.get("review_type") == "seller_to_buyer":
            seller_review = ReviewResponse(**r)
    
    return {
        "buyer_to_seller": buyer_review,
        "seller_to_buyer": seller_review,
        "can_buyer_review": order["buyer_id"] == current_user["id"] and buyer_review is None,
        "can_seller_review": first_item["seller_id"] == current_user["id"] and seller_review is None
    }


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(review_id: str):
    """Get a specific review"""
    db = get_database()
    
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    return ReviewResponse(**review)


@router.post("/{review_id}/flag")
async def flag_review(
    review_id: str,
    request: FlagReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Flag a review for moderation.
    Creates a support ticket automatically.
    """
    db = get_database()
    
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review.get("is_flagged"):
        raise HTTPException(status_code=400, detail="Review already flagged")
    
    # Can only flag if you're the reviewee (the one being reviewed)
    if review["reviewee_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only flag reviews about yourself")
    
    # Create support ticket for the flag
    import uuid
    ticket_id = str(uuid.uuid4())
    ticket = {
        "id": ticket_id,
        "ticket_number": f"TKT-{ticket_id[:8].upper()}",
        "user_id": current_user["id"],
        "user_username": current_user["username"],
        "user_email": current_user.get("email"),
        "category": "review_dispute",
        "subject": f"Review Dispute - {review.get('listing_title', 'Unknown Item')}",
        "description": f"Reason: {request.reason}\n\nDetails: {request.details or 'No additional details provided'}\n\nReview ID: {review_id}",
        "status": "open",
        "priority": "medium",
        "review_id": review_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.support_tickets.insert_one(ticket)
    
    # Update review with flag info
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {
            "is_flagged": True,
            "flagged_by_id": current_user["id"],
            "flagged_reason": request.reason,
            "flagged_at": datetime.utcnow(),
            "flag_ticket_id": ticket_id
        }}
    )
    
    return {
        "message": "Review flagged for moderation",
        "ticket_id": ticket_id,
        "ticket_number": ticket["ticket_number"]
    }


@router.delete("/{review_id}/admin-remove")
async def admin_remove_review(
    review_id: str,
    reason: str = Query(..., min_length=10),
    current_user: dict = Depends(get_current_user)
):
    """
    Admin/moderator removes an inappropriate review.
    Only accessible to admin/owner/manager roles.
    """
    db = get_database()
    
    # Check if user is admin/moderator
    role = current_user.get("role", "user")
    is_admin = current_user.get("is_admin", False)
    if role not in ["owner", "admin", "manager"] and not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Mark review as removed (don't delete for audit trail)
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {
            "is_removed": True,
            "removed_by_id": current_user["id"],
            "removed_at": datetime.utcnow(),
            "removal_reason": reason,
            "is_public": False
        }}
    )
    
    # Recalculate reviewee's rating
    reviewee_id = review["reviewee_id"]
    reviewee_role = review.get("reviewee_role", "seller")
    await update_user_rating(db, reviewee_id, reviewee_role)
    
    # Close any associated ticket
    if review.get("flag_ticket_id"):
        await db.support_tickets.update_one(
            {"id": review["flag_ticket_id"]},
            {"$set": {
                "status": "resolved",
                "resolution": f"Review removed by moderator. Reason: {reason}",
                "resolved_at": datetime.utcnow(),
                "resolved_by": current_user["id"]
            }}
        )
    
    return {"message": "Review removed", "review_id": review_id}

