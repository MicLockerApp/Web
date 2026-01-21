"""
Listing Reports Routes for MicLocker

Handles user reports of potentially problematic listings.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from database import get_database
from routes.auth import get_current_user
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])


class ListingReportCreate(BaseModel):
    listing_id: str
    category: str
    description: str
    listing_url: str
    listing_title: str
    seller_id: str
    seller_username: str


class ReportResponse(BaseModel):
    id: str
    status: str
    message: str


class AdminReportAction(BaseModel):
    action: str  # 'dismiss', 'delete_listing', 'warn_seller', 'ban_seller'
    admin_response: Optional[str] = None
    notify_reporter: bool = True
    notify_seller: bool = True


@router.post("/listing", response_model=ReportResponse)
async def report_listing(
    report: ListingReportCreate,
    current_user: dict = Depends(get_current_user)
):
    """Submit a report for a listing"""
    db = get_database()
    
    # Verify listing exists
    listing = await db.listings.find_one({"id": report.listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # Check if user already reported this listing
    existing_report = await db.listing_reports.find_one({
        "listing_id": report.listing_id,
        "reporter_id": current_user["id"],
        "status": {"$in": ["pending", "under_review"]}
    })
    
    if existing_report:
        raise HTTPException(
            status_code=400, 
            detail="You have already reported this listing. Our team is reviewing it."
        )
    
    # Can't report your own listing
    if listing.get("seller_id") == current_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot report your own listing")
    
    report_id = str(uuid.uuid4())
    
    report_doc = {
        "id": report_id,
        "listing_id": report.listing_id,
        "listing_title": report.listing_title,
        "listing_url": report.listing_url,
        "seller_id": report.seller_id,
        "seller_username": report.seller_username,
        "reporter_id": current_user["id"],
        "reporter_username": current_user.get("username"),
        "category": report.category,
        "description": report.description,
        "status": "pending",
        "admin_response": None,
        "reviewed_by": None,
        "reviewed_at": None,
        "action_taken": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.listing_reports.insert_one(report_doc)
    
    # Increment report count on listing
    await db.listings.update_one(
        {"id": report.listing_id},
        {"$inc": {"report_count": 1}}
    )
    
    logger.info(f"Listing report submitted: {report_id} for listing {report.listing_id} by user {current_user['id']}")
    
    return ReportResponse(
        id=report_id,
        status="pending",
        message="Your report has been submitted successfully. Our team will review it shortly."
    )


@router.get("/admin/all")
async def get_all_reports(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Get all listing reports (admin only)"""
    if not current_user.get("is_admin") and not current_user.get("is_employee"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    query = {}
    if status:
        query["status"] = status
    
    skip = (page - 1) * limit
    
    total = await db.listing_reports.count_documents(query)
    reports = await db.listing_reports.find(query)\
        .sort("created_at", -1)\
        .skip(skip)\
        .limit(limit)\
        .to_list(length=limit)
    
    # Convert ObjectId and datetime for JSON serialization
    for report in reports:
        report.pop("_id", None)
        if isinstance(report.get("created_at"), datetime):
            report["created_at"] = report["created_at"].isoformat()
        if isinstance(report.get("updated_at"), datetime):
            report["updated_at"] = report["updated_at"].isoformat()
        if isinstance(report.get("reviewed_at"), datetime):
            report["reviewed_at"] = report["reviewed_at"].isoformat()
    
    return {
        "reports": reports,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/admin/stats")
async def get_report_stats(current_user: dict = Depends(get_current_user)):
    """Get report statistics (admin only)"""
    if not current_user.get("is_admin") and not current_user.get("is_employee"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    pending = await db.listing_reports.count_documents({"status": "pending"})
    under_review = await db.listing_reports.count_documents({"status": "under_review"})
    resolved = await db.listing_reports.count_documents({"status": "resolved"})
    dismissed = await db.listing_reports.count_documents({"status": "dismissed"})
    
    return {
        "pending": pending,
        "under_review": under_review,
        "resolved": resolved,
        "dismissed": dismissed,
        "total": pending + under_review + resolved + dismissed
    }


@router.post("/admin/{report_id}/action")
async def take_action_on_report(
    report_id: str,
    action_data: AdminReportAction,
    current_user: dict = Depends(get_current_user)
):
    """Take action on a report (admin only)"""
    if not current_user.get("is_admin") and not current_user.get("is_employee"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    db = get_database()
    
    report = await db.listing_reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    update_data = {
        "status": "resolved" if action_data.action != "dismiss" else "dismissed",
        "action_taken": action_data.action,
        "admin_response": action_data.admin_response,
        "reviewed_by": current_user["id"],
        "reviewed_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Handle specific actions
    if action_data.action == "delete_listing":
        await db.listings.update_one(
            {"id": report["listing_id"]},
            {"$set": {"status": "removed", "removed_reason": "Removed due to user reports"}}
        )
    
    elif action_data.action == "warn_seller":
        # Could send an email or notification to seller
        pass
    
    elif action_data.action == "ban_seller":
        await db.users.update_one(
            {"id": report["seller_id"]},
            {"$set": {"is_banned": True, "ban_reason": f"Multiple listing violations"}}
        )
    
    await db.listing_reports.update_one(
        {"id": report_id},
        {"$set": update_data}
    )
    
    logger.info(f"Admin {current_user['id']} took action '{action_data.action}' on report {report_id}")
    
    return {"status": "success", "message": f"Action '{action_data.action}' completed"}
