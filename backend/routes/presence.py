"""
User Presence/Status Tracking

Tracks user online status:
- online (green): Active within last 5 minutes
- standby (yellow): No interaction for 15+ minutes
- away (gray): No interaction for 30+ minutes or logged out
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel
from services.auth import get_current_user
from database import get_database

router = APIRouter(prefix="/api/presence", tags=["presence"])

class PresenceUpdate(BaseModel):
    status: Optional[str] = None  # 'active', 'standby', 'away'

class HeartbeatResponse(BaseModel):
    status: str
    last_activity: datetime

# Status thresholds
STANDBY_THRESHOLD_MINUTES = 15
AWAY_THRESHOLD_MINUTES = 30

def calculate_status(last_activity: datetime) -> str:
    """Calculate user status based on last activity time"""
    if not last_activity:
        return "away"
    
    now = datetime.now(timezone.utc)
    # Handle naive datetime
    if last_activity.tzinfo is None:
        last_activity = last_activity.replace(tzinfo=timezone.utc)
    
    time_diff = now - last_activity
    minutes_inactive = time_diff.total_seconds() / 60
    
    if minutes_inactive < STANDBY_THRESHOLD_MINUTES:
        return "online"
    elif minutes_inactive < AWAY_THRESHOLD_MINUTES:
        return "standby"
    else:
        return "away"

@router.post("/heartbeat")
async def heartbeat(current_user: dict = Depends(get_current_user)):
    """
    Update user's last activity timestamp (call this periodically from frontend)
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "last_activity": now,
                "presence_status": "online"
            }
        }
    )
    
    return {"status": "online", "last_activity": now.isoformat()}

@router.post("/standby")
async def set_standby(current_user: dict = Depends(get_current_user)):
    """
    Set user status to standby (called when page visibility changes)
    """
    db = get_database()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "presence_status": "standby"
            }
        }
    )
    
    return {"status": "standby"}

@router.post("/away")
async def set_away(current_user: dict = Depends(get_current_user)):
    """
    Set user status to away (called on logout or timeout)
    """
    db = get_database()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "presence_status": "away"
            }
        }
    )
    
    return {"status": "away"}

@router.get("/status/{user_id}")
async def get_user_status(user_id: str):
    """
    Get a specific user's online status
    """
    db = get_database()
    
    user = await db.users.find_one(
        {"id": user_id},
        {"last_activity": 1, "presence_status": 1}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate real-time status based on last activity
    last_activity = user.get("last_activity")
    status = calculate_status(last_activity) if last_activity else "away"
    
    return {
        "user_id": user_id,
        "status": status,
        "last_activity": last_activity.isoformat() if last_activity else None
    }

@router.get("/bulk")
async def get_bulk_status(user_ids: str):
    """
    Get online status for multiple users (comma-separated IDs)
    """
    db = get_database()
    ids = [uid.strip() for uid in user_ids.split(",") if uid.strip()]
    
    if not ids:
        return {"statuses": {}}
    
    users = await db.users.find(
        {"id": {"$in": ids}},
        {"id": 1, "last_activity": 1, "presence_status": 1}
    ).to_list(length=len(ids))
    
    statuses = {}
    for user in users:
        last_activity = user.get("last_activity")
        statuses[user["id"]] = calculate_status(last_activity) if last_activity else "away"
    
    # Set missing users as away
    for uid in ids:
        if uid not in statuses:
            statuses[uid] = "away"
    
    return {"statuses": statuses}
