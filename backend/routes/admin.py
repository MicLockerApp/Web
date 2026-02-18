from fastapi import APIRouter, HTTPException, status, Depends, Query, Body
from models.review import AdminAnalytics
from models.user import UserInDB
from services.auth import get_admin_user, get_staff_user, get_owner_admin, get_manager_or_admin, get_password_hash
from services.email import send_password_setup_email
from database import get_database
from config import settings
from utils.helpers import serialize_docs, serialize_doc
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import uuid
import secrets

router = APIRouter(prefix="/admin", tags=["Admin"])

# Role hierarchy: owner > admin > manager > employee > user
ROLE_HIERARCHY = {
    "owner": 5,
    "admin": 4,
    "manager": 3,
    "employee": 2,
    "user": 1
}

# Owner emails that cannot be demoted
# REMOVED: All users can now have their roles changed by owners
PROTECTED_OWNER_EMAILS = []  # Empty - no protected users

# Super admin account - can change ANY account's role including other owners
SUPER_ADMIN_EMAIL = "info@miclockerapp.com"

def get_role_level(role: str) -> int:
    """Get numeric level for a role (higher = more permissions)"""
    return ROLE_HIERARCHY.get(role, 1)

def can_modify_role(actor_role: str, target_current_role: str, target_new_role: str = None) -> bool:
    """Check if actor can modify target's role"""
    actor_level = get_role_level(actor_role)
    target_level = get_role_level(target_current_role)
    
    # Owners can modify anyone's role (including other owners)
    if actor_role == "owner":
        return True
    
    # Actor must have higher or equal level than target
    if actor_level < target_level:
        return False
    
    # If changing role, actor must have higher or equal level than new role too
    if target_new_role:
        new_role_level = get_role_level(target_new_role)
        if actor_level < new_role_level:
            return False
    
    return True

def can_delete_user(actor_role: str, target_role: str, target_email: str, actor_email: str = None) -> bool:
    """Check if actor can delete target user"""
    # Super admin (miclocker.support / info@miclockerapp.com) can delete ANYONE except themselves
    if actor_email == SUPER_ADMIN_EMAIL:
        # Cannot delete yourself
        if target_email == SUPER_ADMIN_EMAIL:
            return False
        # Can delete anyone else, including other owners
        return True
    
    # Cannot delete protected owner accounts (for non-super-admins)
    if target_email in PROTECTED_OWNER_EMAILS:
        return False
    
    # Owners can delete anyone except protected owners
    if actor_role == "owner":
        return True
    
    # Admins can delete admin and below (but not owners)
    if actor_role == "admin":
        return target_role in ["admin", "manager", "employee", "user"]
    
    # Managers can delete employees and users
    if actor_role == "manager":
        return target_role in ["employee", "user"]
    
    return False

router = APIRouter(prefix="/admin", tags=["Admin"])

class CreateEmployeeRequest(BaseModel):
    username: str
    email: EmailStr
    role: str  # 'admin', 'manager', 'employee'

class UpdateEmployeeRoleRequest(BaseModel):
    role: str  # 'admin', 'manager', 'employee'

class UpdateEmployeeDetailsRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None

class ChangeUserRoleRequest(BaseModel):
    role: str  # 'owner', 'admin', 'manager', 'employee', 'user'

class ResetAnalyticsRequest(BaseModel):
    """Request to reset specific analytics data"""
    reset_orders: bool = False
    reset_analytics_events: bool = False
    reset_analytics_rollups: bool = False
    reset_support_tickets: bool = False
    reset_all: bool = False
    confirmation: str  # Must be "CONFIRM_RESET" to proceed

# Helper to check if user is admin or owner
def is_admin_or_owner(user: dict) -> bool:
    """Check if user has admin or owner role"""
    role = user.get("role", "")
    is_admin = user.get("is_admin", False)
    return role in ["owner", "admin"] or is_admin

@router.post("/reset-analytics")
async def reset_analytics_data(
    request: ResetAnalyticsRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """
    Reset analytics and seed data from the database.
    Only available to admin or owner roles.
    Requires confirmation string "CONFIRM_RESET" to proceed.
    """
    # Verify admin/owner role
    if not is_admin_or_owner(admin_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Owner can reset analytics data"
        )
    
    # Verify confirmation
    if request.confirmation != "CONFIRM_RESET":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid confirmation. Must provide 'CONFIRM_RESET' to proceed."
        )
    
    db = get_database()
    results = {}
    
    # Reset orders (but keep structure)
    if request.reset_orders or request.reset_all:
        result = await db.orders.delete_many({})
        results["orders_deleted"] = result.deleted_count
    
    # Reset analytics events
    if request.reset_analytics_events or request.reset_all:
        result = await db.analytics_events.delete_many({})
        results["analytics_events_deleted"] = result.deleted_count
    
    # Reset analytics rollups
    if request.reset_analytics_rollups or request.reset_all:
        result = await db.analytics_rollups.delete_many({})
        results["analytics_rollups_deleted"] = result.deleted_count
    
    # Reset support tickets
    if request.reset_support_tickets or request.reset_all:
        result = await db.support_tickets.delete_many({})
        results["support_tickets_deleted"] = result.deleted_count
    
    # Log the action
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Analytics reset by {admin_user.get('username')}: {results}")
    
    return {
        "message": "Analytics data reset successfully",
        "reset_by": admin_user.get("username"),
        "results": results
    }

@router.get("/analytics")
async def get_analytics(staff_user: dict = Depends(get_staff_user)):
    """Get platform analytics (staff only - filtered by role)"""
    db = get_database()
    
    # Determine user's role for filtering sensitive data
    is_admin = staff_user.get("is_admin", False)
    employee_role = staff_user.get("employee_role")
    
    # Admin or original owner can see everything
    # Manager can see everything except financial data
    # Employee can only see limited data
    is_owner = is_admin and employee_role in [None, "admin"]
    is_manager = employee_role == "manager"
    is_employee_role = employee_role == "employee"  # noqa: F841
    
    # Financial data - only for admin/owner
    total_gmv = 0
    total_fees = 0
    total_processing_fees = 0
    
    if is_owner:
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
    
    # Active listings count - all staff can see
    active_listings = await db.listings.count_documents({"status": "active"})
    
    # Total users (excluding employees)
    total_users = await db.users.count_documents({"is_employee": {"$ne": True}})
    
    # Orders by status - managers and admins can see
    orders_by_status = {}
    if is_owner or is_manager:
        status_pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        status_result = await db.orders.aggregate(status_pipeline).to_list(length=100)
        orders_by_status = {item["_id"]: item["count"] for item in status_result}
    
    # Recent activity (last 30 days) - managers and admins can see
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_orders = 0
    recent_signups = 0
    
    if is_owner or is_manager:
        recent_orders = await db.orders.count_documents({"created_at": {"$gte": thirty_days_ago}})
        recent_signups = await db.users.count_documents({
            "created_at": {"$gte": thirty_days_ago},
            "is_employee": {"$ne": True}
        })
    
    return {
        "total_gmv": round(total_gmv, 2),
        "total_fees_collected": round(total_fees, 2),
        "total_processing_fees_collected": round(total_processing_fees, 2),
        "active_listings": active_listings,
        "total_users": total_users,
        "orders_by_status": orders_by_status,
        "recent_orders": recent_orders,
        "recent_signups": recent_signups,
        "platform_fee_percent": settings.platform_fee_percent,
        "payment_processing_percent": settings.payment_processing_percent,
        "payment_processing_fixed": settings.payment_processing_fixed,
        # Include role info for frontend
        "user_role": employee_role or ("admin" if is_admin else None),
        "is_owner": is_owner
    }

@router.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    staff_user: dict = Depends(get_staff_user)
):
    """Get all users (staff only)"""
    db = get_database()
    
    # Exclude employees from user list (they're shown separately)
    filter_query = {"is_employee": {"$ne": True}}
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
    staff_user: dict = Depends(get_staff_user)
):
    """Suspend a user (staff only) - temporary suspension"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.get("is_admin") or user.get("is_employee"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot suspend admin or employee users"
        )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_suspended": True, 
            "suspension_type": "temporary",
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "User suspended temporarily"}

@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    staff_user: dict = Depends(get_staff_user)
):
    """Unsuspend a user (staff only)"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Cannot unsuspend permanently banned users without admin approval
    if user.get("is_banned"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unsuspend a permanently banned user. Use unban instead."
        )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_suspended": False, 
            "suspension_type": None,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": "User unsuspended"}

@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    reason: str = Body(None, embed=True),
    staff_user: dict = Depends(get_staff_user)
):
    """Permanently ban a user (staff only)"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.get("is_admin") or user.get("is_employee"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot ban admin or employee users"
        )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_banned": True,
            "is_suspended": True,
            "suspension_type": "permanent",
            "ban_reason": reason,
            "banned_at": datetime.utcnow(),
            "banned_by": staff_user.get("username"),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Also deactivate all their active listings
    await db.listings.update_many(
        {"seller_id": user_id, "status": "active"},
        {"$set": {"status": "removed", "updated_at": datetime.utcnow()}}
    )
    
    return {"message": "User permanently banned"}

@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Remove permanent ban from a user (admin only)"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user.get("is_banned"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not banned"
        )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_banned": False,
            "is_suspended": False,
            "suspension_type": None,
            "updated_at": datetime.utcnow()
        },
        "$unset": {
            "ban_reason": "",
            "banned_at": "",
            "banned_by": ""
        }}
    )
    
    return {"message": "User ban removed"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin_user: dict = Depends(get_admin_user)
):
    """Permanently delete a user and all their data (role-based permissions)"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get roles - handle missing role field
    actor_role = admin_user.get("role")
    actor_email = admin_user.get("email", "")
    if not actor_role:
        # Fallback: check is_admin flag
        if admin_user.get("is_admin"):
            actor_role = "owner"  # Treat admins as owners for backwards compatibility
        else:
            actor_role = "user"
    
    target_role = user.get("role", "user")
    target_email = user.get("email", "")
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Delete attempt: actor_email={actor_email}, actor_role={actor_role}, target_role={target_role}, target_email={target_email}")
    
    # Check if actor can delete target (pass actor_email for super admin check)
    if not can_delete_user(actor_role, target_role, target_email, actor_email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete this user. Protected accounts or insufficient permissions."
        )
    
    # Delete user's listings
    await db.listings.delete_many({"seller_id": user_id})
    
    # Delete user's messages (both sent and in threads)
    await db.messages.delete_many({"sender_id": user_id})
    
    # Remove user from message threads
    await db.message_threads.update_many(
        {"participants": user_id},
        {"$pull": {"participants": user_id}}
    )
    
    # Delete empty message threads
    await db.message_threads.delete_many({"participants": {"$size": 0}})
    await db.message_threads.delete_many({"participants": {"$size": 1}})
    
    # Delete user's cart
    await db.carts.delete_many({"user_id": user_id})
    
    # Delete user's offers
    await db.offers.delete_many({"$or": [{"buyer_id": user_id}, {"seller_id": user_id}]})
    
    # Delete user's reviews (as reviewer)
    await db.reviews.delete_many({"reviewer_id": user_id})
    
    # Delete user's support tickets
    await db.support_tickets.delete_many({"user_id": user_id})
    
    # Finally delete the user
    await db.users.delete_one({"id": user_id})
    
    return {"message": "User and all associated data deleted permanently"}

@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    request: ChangeUserRoleRequest,
    admin_user: dict = Depends(get_admin_user)
):
    """Change a user's role (permission-based)"""
    db = get_database()
    
    # Validate role
    if request.role not in ROLE_HIERARCHY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(ROLE_HIERARCHY.keys())}"
        )
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get roles
    actor_role = admin_user.get("role", "admin" if admin_user.get("is_admin") else "user")
    target_current_role = user.get("role", "user")
    target_email = user.get("email", "")
    actor_email = admin_user.get("email", "")
    
    # Super admin (miclocker.support) can change ANY user's role
    if actor_email == SUPER_ADMIN_EMAIL:
        pass  # Allow all role changes
    # Check if actor can make this change (other owners/admins)
    elif not can_modify_role(actor_role, target_current_role, request.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to change this user's role"
        )
    
    # Update role and related flags
    update_data = {
        "role": request.role,
        "updated_at": datetime.utcnow()
    }
    
    # Set is_admin and is_employee based on role
    if request.role == "owner":
        update_data["is_admin"] = True
        update_data["is_employee"] = False
        update_data["employee_role"] = None
    elif request.role == "admin":
        update_data["is_admin"] = True
        update_data["is_employee"] = False
        update_data["employee_role"] = None
    elif request.role in ["manager", "employee"]:
        update_data["is_admin"] = False
        update_data["is_employee"] = True
        update_data["employee_role"] = request.role
    else:  # user
        update_data["is_admin"] = False
        update_data["is_employee"] = False
        update_data["employee_role"] = None
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    return {
        "message": f"User role changed to {request.role}",
        "user_id": user_id,
        "new_role": request.role
    }


class BlogEditorToggleRequest(BaseModel):
    is_blog_editor: bool


@router.put("/users/{user_id}/blog-editor")
async def toggle_blog_editor(
    user_id: str,
    request: BlogEditorToggleRequest,
    admin_user: dict = Depends(get_owner_admin)
):
    """Toggle blog editor status for a user (owner only)"""
    db = get_database()
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "is_blog_editor": request.is_blog_editor,
            "updated_at": datetime.utcnow()
        }}
    )
    
    status_text = "granted" if request.is_blog_editor else "revoked"
    return {
        "message": f"Blog editor access {status_text}",
        "user_id": user_id,
        "is_blog_editor": request.is_blog_editor
    }

@router.get("/listings")
async def get_all_listings(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: str = Query(None),
    staff_user: dict = Depends(get_staff_user)
):
    """Get all listings (staff only)"""
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
    staff_user: dict = Depends(get_staff_user)
):
    """Remove a listing (staff moderation)"""
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
    staff_user: dict = Depends(get_staff_user)
):
    """Get all orders (staff only)"""
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
async def get_platform_settings(owner_user: dict = Depends(get_owner_admin)):
    """Get platform settings (owner only)"""
    return {
        "platform_fee_percent": settings.platform_fee_percent,
        "max_image_size_mb": settings.max_image_size_mb,
        "max_video_size_mb": settings.max_video_size_mb
    }

# =====================
# Employee Management
# =====================

@router.get("/employees")
async def get_employees(manager_user: dict = Depends(get_manager_or_admin)):
    """Get all employees (manager and admin only)"""
    db = get_database()
    
    # Get all employees and admins
    cursor = db.users.find(
        {"$or": [{"is_employee": True}, {"is_admin": True}]},
        {"hashed_password": 0}
    ).sort("created_at", -1)
    employees = await cursor.to_list(length=100)
    
    return {"employees": serialize_docs(employees)}

@router.post("/employees")
async def create_employee(
    data: CreateEmployeeRequest,
    manager_user: dict = Depends(get_manager_or_admin)
):
    """Create a new employee account (manager and admin only). Sends password setup email."""
    db = get_database()
    
    # Validate role
    if data.role not in ["admin", "manager", "employee"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'admin', 'manager', or 'employee'"
        )
    
    # Check if username or email already exists
    existing = await db.users.find_one({
        "$or": [{"username": data.username}, {"email": data.email}]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    
    # Create employee user without password (they'll set it via email)
    employee_id = str(uuid.uuid4())
    
    # Generate a password setup token
    setup_token = secrets.token_urlsafe(32)
    token_expiry = datetime.utcnow() + timedelta(days=7)  # 7 days to set up password
    
    employee_doc = {
        "id": employee_id,
        "username": data.username,
        "email": data.email,
        "hashed_password": None,  # No password yet - employee will set it
        "role": "Employee",  # Display role
        "is_admin": data.role in ["admin", "manager"],  # Admin access for admin and manager roles
        "is_employee": True,  # Mark as employee (won't count toward user total)
        "employee_role": data.role,  # Specific employee role
        "is_suspended": False,
        "profile_completed": True,
        "has_lifetime_free_fees": False,
        "password_setup_required": True,  # Flag to indicate password needs to be set
        "password_reset_codes": [{
            "code": setup_token,
            "email": data.email,
            "expires_at": token_expiry,
            "used": False,
            "is_setup": True  # Mark as initial setup, not reset
        }],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.users.insert_one(employee_doc)
    
    # Send password setup email
    try:
        await send_password_setup_email(data.email, data.username, setup_token, data.role)
    except Exception as e:
        print(f"Failed to send password setup email: {e}")
        # Don't fail the request, employee can use forgot password later
    
    # Remove sensitive data from response
    response_doc = {k: v for k, v in employee_doc.items() if k not in ["hashed_password", "password_reset_codes"]}
    
    return {
        "message": f"Employee created with role '{data.role}'. Password setup email sent to {data.email}.",
        "employee": serialize_doc(response_doc)
    }

@router.put("/employees/{employee_id}")
async def update_employee_details(
    employee_id: str,
    data: UpdateEmployeeDetailsRequest,
    manager_user: dict = Depends(get_manager_or_admin)
):
    """Update an employee's details (username, email) - manager and admin only"""
    db = get_database()
    
    # Find the employee
    employee = await db.users.find_one({"id": employee_id})
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Can't edit the original owner unless you are the owner
    if employee.get("is_first_user") and manager_user.get("id") != employee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify the original owner's details"
        )
    
    update_fields = {"updated_at": datetime.utcnow()}
    
    # Check username uniqueness if changing
    if data.username and data.username != employee.get("username"):
        existing = await db.users.find_one({"username": data.username, "id": {"$ne": employee_id}})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        update_fields["username"] = data.username
    
    # Check email uniqueness if changing
    if data.email and data.email != employee.get("email"):
        existing = await db.users.find_one({"email": data.email, "id": {"$ne": employee_id}})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
        update_fields["email"] = data.email
    
    if len(update_fields) > 1:  # More than just updated_at
        await db.users.update_one(
            {"id": employee_id},
            {"$set": update_fields}
        )
        return {"message": "Employee details updated successfully"}
    else:
        return {"message": "No changes made"}

@router.put("/employees/{employee_id}/role")
async def update_employee_role(
    employee_id: str,
    data: UpdateEmployeeRoleRequest,
    manager_user: dict = Depends(get_manager_or_admin)
):
    """Update an employee's role (manager and admin only)"""
    db = get_database()
    
    # Validate role
    if data.role not in ["admin", "manager", "employee"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'admin', 'manager', or 'employee'"
        )
    
    # Find the employee
    employee = await db.users.find_one({"id": employee_id, "is_employee": True})
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Can't change the original owner's role
    if employee.get("is_first_user"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify the original owner's role"
        )
    
    # Update role
    await db.users.update_one(
        {"id": employee_id},
        {"$set": {
            "employee_role": data.role,
            "is_admin": data.role in ["admin", "manager"],
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {"message": f"Employee role updated to '{data.role}'"}

@router.post("/employees/{employee_id}/resend-setup")
async def resend_password_setup(
    employee_id: str,
    manager_user: dict = Depends(get_manager_or_admin)
):
    """Resend password setup email to an employee (manager and admin only)"""
    db = get_database()
    
    employee = await db.users.find_one({"id": employee_id, "is_employee": True})
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Generate new setup token
    setup_token = secrets.token_urlsafe(32)
    token_expiry = datetime.utcnow() + timedelta(days=7)
    
    # Add new token to password_reset_codes
    await db.users.update_one(
        {"id": employee_id},
        {
            "$push": {
                "password_reset_codes": {
                    "code": setup_token,
                    "email": employee["email"],
                    "expires_at": token_expiry,
                    "used": False,
                    "is_setup": True
                }
            },
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Send email
    try:
        await send_password_setup_email(
            employee["email"], 
            employee["username"], 
            setup_token, 
            employee.get("employee_role", "employee")
        )
        return {"message": f"Password setup email resent to {employee['email']}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )

@router.delete("/employees/{employee_id}")
async def delete_employee(
    employee_id: str,
    manager_user: dict = Depends(get_manager_or_admin)
):
    """Delete an employee account (manager and admin only)"""
    db = get_database()
    
    # Find the employee
    employee = await db.users.find_one({"id": employee_id, "is_employee": True})
    if not employee:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found"
        )
    
    # Can't delete the original owner
    if employee.get("is_first_user"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the original owner"
        )
    
    # Can't delete yourself
    if employee["id"] == manager_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    await db.users.delete_one({"id": employee_id})
    
    return {"message": "Employee deleted"}



@router.post("/migrations/gold-members")
async def migrate_gold_members(admin_user: dict = Depends(get_admin_user)):
    """
    One-time migration to set is_gold_member for existing users.
    Sets is_gold_member=True for the first 300 non-employee users based on signup order.
    """
    db = get_database()
    
    # Get all non-employee users sorted by creation date
    cursor = db.users.find(
        {"is_employee": {"$ne": True}},
        {"id": 1, "username": 1, "created_at": 1}
    ).sort("created_at", 1).limit(300)
    
    users = await cursor.to_list(length=300)
    
    updated_count = 0
    for index, user in enumerate(users):
        signup_number = index + 1
        result = await db.users.update_one(
            {"id": user["id"]},
            {"$set": {
                "is_gold_member": True,
                "signup_number": signup_number,
                "has_lifetime_free_fees": True
            }}
        )
        if result.modified_count > 0:
            updated_count += 1
    
    # Set is_gold_member=False for users after the first 300
    await db.users.update_many(
        {
            "is_employee": {"$ne": True},
            "signup_number": {"$exists": False}
        },
        {"$set": {"is_gold_member": False}}
    )
    
    return {
        "message": f"Migration complete. Updated {updated_count} users as Gold Members.",
        "gold_member_count": len(users)
    }
