from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.review import AdminAnalytics
from services.auth import get_admin_user
from database import get_database
from config import settings
from utils.helpers import serialize_docs, serialize_doc
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/analytics", response_model=AdminAnalytics)
async def get_analytics(admin_user: dict = Depends(get_admin_user)):
    """Get platform analytics (admin only)"""
    db = get_database()
    
    # Total GMV (sum of all completed order totals)
    gmv_pipeline = [
        {"$match": {"status": {"$in": ["paid", "shipped", "delivered", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$subtotal"}}}
    ]
    gmv_result = await db.orders.aggregate(gmv_pipeline).to_list(length=1)
    total_gmv = gmv_result[0]["total"] if gmv_result else 0
    
    # Total platform fees collected (3%)
    fees_pipeline = [
        {"$match": {"status": {"$in": ["paid", "shipped", "delivered", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$platform_fee"}}}
    ]
    fees_result = await db.orders.aggregate(fees_pipeline).to_list(length=1)
    total_fees = fees_result[0]["total"] if fees_result else 0
    
    # Total payment processing fees collected (3.19% + $0.49)
    processing_fees_pipeline = [
        {"$match": {"status": {"$in": ["paid", "shipped", "delivered", "completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": {"$ifNull": ["$payment_processing_fee", 0]}}}}
    ]
    processing_fees_result = await db.orders.aggregate(processing_fees_pipeline).to_list(length=1)
    total_processing_fees = processing_fees_result[0]["total"] if processing_fees_result else 0
    
    # Active listings count
    active_listings = await db.listings.count_documents({"status": "active"})
    
    # Total users
    total_users = await db.users.count_documents({})
    
    # Orders by status
    status_pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_result = await db.orders.aggregate(status_pipeline).to_list(length=100)
    orders_by_status = {item["_id"]: item["count"] for item in status_result}
    
    # Recent orders (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_orders = await db.orders.count_documents({"created_at": {"$gte": thirty_days_ago}})
    
    # Recent signups (last 30 days)
    recent_signups = await db.users.count_documents({"created_at": {"$gte": thirty_days_ago}})
    
    return AdminAnalytics(
        total_gmv=round(total_gmv, 2),
        total_fees_collected=round(total_fees, 2),
        total_processing_fees_collected=round(total_processing_fees, 2),
        active_listings=active_listings,
        total_users=total_users,
        orders_by_status=orders_by_status,
        recent_orders=recent_orders,
        recent_signups=recent_signups,
        platform_fee_percent=settings.platform_fee_percent,
        payment_processing_percent=settings.payment_processing_percent,
        payment_processing_fixed=settings.payment_processing_fixed
    )

@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get all users (admin only)"""
    db = get_database()
    
    filter_query = {}
    if search:
        filter_query["$or"] = [
            {"username": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    total = await db.users.count_documents(filter_query)
    cursor = db.users.find(filter_query, {"hashed_password": 0}).skip(skip).limit(limit).sort("created_at", -1)
    users = await cursor.to_list(length=limit)
    
    return {
        "users": serialize_docs(users),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Suspend a user (admin only)"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend admin users"
        )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_suspended": True, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "User suspended"}

@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Unsuspend a user (admin only)"""
    db = get_database()
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_suspended": False, "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "User unsuspended"}

@router.get("/listings")
async def get_all_listings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get all listings (admin only)"""
    db = get_database()
    
    filter_query = {}
    if status:
        filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.listings.count_documents(filter_query)
    cursor = db.listings.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    listings = await cursor.to_list(length=limit)
    
    return {
        "listings": serialize_docs(listings),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.post("/listings/{listing_id}/remove")
async def remove_listing(
    listing_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Remove a listing (admin moderation)"""
    db = get_database()
    
    listing = await db.listings.find_one({"id": listing_id})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    await db.listings.update_one(
        {"id": listing_id},
        {"$set": {"status": "removed", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Listing removed"}

@router.get("/orders")
async def get_all_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    admin_user: dict = Depends(get_admin_user)
):
    """Get all orders (admin only)"""
    db = get_database()
    
    filter_query = {}
    if status:
        filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.orders.count_documents(filter_query)
    cursor = db.orders.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
    orders = await cursor.to_list(length=limit)
    
    return {
        "orders": serialize_docs(orders),
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/settings")
async def get_platform_settings(admin_user: dict = Depends(get_admin_user)):
    """Get platform settings (admin only)"""
    return {
        "platform_fee_percent": settings.platform_fee_percent,
        "max_image_size_mb": settings.max_image_size_mb,
        "max_video_size_mb": settings.max_video_size_mb
    }
