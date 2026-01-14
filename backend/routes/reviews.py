from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.review import ReviewCreate, ReviewInDB, ReviewResponse
from services.auth import get_current_user
from database import get_database
from datetime import datetime

router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("", response_model=ReviewResponse)
async def create_review(
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a review for a completed order"""
    db = get_database()
    
    # Get order
    order = await db.orders.find_one({"id": review_data.order_id})
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order["buyer_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer can review this order"
        )
    
    if order["status"] not in ["delivered", "completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only review completed orders"
        )
    
    # Check if already reviewed
    existing = await db.reviews.find_one({"order_id": review_data.order_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this order"
        )
    
    # Get seller info from first item
    first_item = order["items"][0]
    
    # Create review
    review = ReviewInDB(
        order_id=order["id"],
        listing_id=first_item["listing_id"],
        listing_title=first_item["listing_title"],
        buyer_id=current_user["id"],
        buyer_username=current_user["username"],
        seller_id=first_item["seller_id"],
        seller_username=first_item["seller_username"],
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    await db.reviews.insert_one(review.model_dump())
    
    # Update seller's rating
    seller_reviews = await db.reviews.find({"seller_id": first_item["seller_id"]}).to_list(length=1000)
    if seller_reviews:
        avg_rating = sum(r["rating"] for r in seller_reviews) / len(seller_reviews)
        await db.users.update_one(
            {"id": first_item["seller_id"]},
            {
                "$set": {
                    "rating": round(avg_rating, 2),
                    "review_count": len(seller_reviews)
                }
            }
        )
    
    return ReviewResponse(**review.model_dump())

@router.get("/seller/{seller_id}", response_model=dict)
async def get_seller_reviews(
    seller_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50)
):
    """Get reviews for a seller"""
    db = get_database()
    
    filter_query = {"seller_id": seller_id}
    skip = (page - 1) * limit
    
    total = await db.reviews.count_documents(filter_query)
    cursor = db.reviews.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    reviews = await cursor.to_list(length=limit)
    
    # Calculate rating distribution
    all_reviews = await db.reviews.find({"seller_id": seller_id}).to_list(length=1000)
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
