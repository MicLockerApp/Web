from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.review import ReviewCreate, ReviewInDB, ReviewResponse
from services.auth import get_current_user
from database import get_database
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/reviews", tags=["Reviews"])

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
        is_public=True
    )
    
    await db.reviews.insert_one(review.model_dump())
    
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
