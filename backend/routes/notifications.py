"""
Notification Routes

API endpoints for user notifications.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.notification import (
    NotificationCreate, NotificationInDB, NotificationResponse,
    NotificationType, NotificationBulkUpdate
)
from services.auth import get_current_user
from database import get_database
from datetime import datetime, timezone
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


async def create_notification(
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    link: Optional[str] = None,
    metadata: Optional[dict] = None
) -> NotificationInDB:
    """
    Helper function to create a notification.
    Can be called from other routes/services.
    """
    db = get_database()
    
    notification = NotificationInDB(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message,
        link=link,
        metadata=metadata
    )
    
    await db.notifications.insert_one(notification.model_dump())
    logger.info(f"Notification created for user {user_id}: {notification_type}")
    
    return notification


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user)
):
    """
    Get notifications for the current user.
    """
    db = get_database()
    
    query = {"user_id": current_user["id"]}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query)\
        .sort("created_at", -1)\
        .skip(offset)\
        .limit(limit)\
        .to_list(length=limit)
    
    return [NotificationResponse(**n) for n in notifications]


@router.get("/count")
async def get_notification_count(
    current_user: dict = Depends(get_current_user)
):
    """
    Get count of unread notifications.
    """
    db = get_database()
    
    count = await db.notifications.count_documents({
        "user_id": current_user["id"],
        "is_read": False
    })
    
    return {"unread_count": count}


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark a single notification as read.
    """
    db = get_database()
    
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["id"]},
        {"$set": {"is_read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"success": True}


@router.post("/mark-read")
async def mark_notifications_read(
    update_data: NotificationBulkUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Mark multiple notifications as read.
    Either provide notification_ids or set mark_all_read=True.
    """
    db = get_database()
    
    if update_data.mark_all_read:
        result = await db.notifications.update_many(
            {"user_id": current_user["id"], "is_read": False},
            {"$set": {"is_read": True}}
        )
        return {"success": True, "updated_count": result.modified_count}
    
    if update_data.notification_ids:
        result = await db.notifications.update_many(
            {
                "id": {"$in": update_data.notification_ids},
                "user_id": current_user["id"]
            },
            {"$set": {"is_read": True}}
        )
        return {"success": True, "updated_count": result.modified_count}
    
    return {"success": True, "updated_count": 0}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a notification.
    """
    db = get_database()
    
    result = await db.notifications.delete_one({
        "id": notification_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"success": True}


@router.delete("")
async def clear_all_notifications(
    current_user: dict = Depends(get_current_user)
):
    """
    Clear all notifications for the current user.
    """
    db = get_database()
    
    result = await db.notifications.delete_many({
        "user_id": current_user["id"]
    })
    
    return {"success": True, "deleted_count": result.deleted_count}
