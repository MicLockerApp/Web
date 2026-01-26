"""
Profile Visits Routes

API endpoints for tracking and retrieving profile engagement data
for the Top 8 Fans feature.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional

from database import get_database
from routes.auth import get_current_user
from services.auth import get_current_user_optional
from models.profile_visit import (
    ProfileVisitCreate,
    ProfileVisitTimeUpdate,
    ProfileVisitInteraction,
    TopFan,
    TopFansResponse,
    calculate_engagement_score
)

router = APIRouter(prefix="/profile-visits", tags=["Profile Visits"])


@router.post("/track")
async def track_profile_visit(
    data: ProfileVisitCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Track a visit to a user's profile.
    Called when a logged-in user views another user's profile.
    """
    db = get_database()
    visitor_id = current_user["id"]
    profile_id = data.profile_id
    
    # Don't track self-visits
    if visitor_id == profile_id:
        return {"status": "skipped", "reason": "self_visit"}
    
    # Check if visitor has opted out of being tracked as a fan
    visitor = await db.users.find_one({"id": visitor_id})
    if visitor and visitor.get("opt_out_of_top_fans", False):
        return {"status": "skipped", "reason": "opted_out"}
    
    # Check if profile exists
    profile_owner = await db.users.find_one({"id": profile_id})
    if not profile_owner:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Find existing visit record or create new one
    existing = await db.profile_visits.find_one({
        "visitor_id": visitor_id,
        "profile_id": profile_id
    })
    
    now = datetime.now(timezone.utc)
    
    if existing:
        # Increment visit count
        await db.profile_visits.update_one(
            {"_id": existing["_id"]},
            {
                "$inc": {"visit_count": 1},
                "$set": {"last_visited": now}
            }
        )
        return {"status": "updated", "visit_count": existing["visit_count"] + 1}
    else:
        # Create new visit record
        visit_record = {
            "visitor_id": visitor_id,
            "profile_id": profile_id,
            "visit_count": 1,
            "total_time_spent": 0,
            "interaction_count": 0,
            "last_visited": now,
            "created_at": now
        }
        await db.profile_visits.insert_one(visit_record)
        return {"status": "created", "visit_count": 1}


@router.put("/time")
async def update_time_spent(
    data: ProfileVisitTimeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update time spent on a profile.
    Called periodically while user is viewing a profile.
    Max 5 minutes (300 seconds) per update to prevent abuse.
    """
    db = get_database()
    visitor_id = current_user["id"]
    profile_id = data.profile_id
    
    # Don't track self-visits
    if visitor_id == profile_id:
        return {"status": "skipped", "reason": "self_visit"}
    
    # Check if visitor has opted out
    visitor = await db.users.find_one({"id": visitor_id})
    if visitor and visitor.get("opt_out_of_top_fans", False):
        return {"status": "skipped", "reason": "opted_out"}
    
    # Update time spent
    result = await db.profile_visits.update_one(
        {"visitor_id": visitor_id, "profile_id": profile_id},
        {
            "$inc": {"total_time_spent": data.seconds_spent},
            "$set": {"last_visited": datetime.now(timezone.utc)}
        }
    )
    
    if result.modified_count == 0:
        # No existing record - this shouldn't happen normally
        # but create one just in case
        visit_record = {
            "visitor_id": visitor_id,
            "profile_id": profile_id,
            "visit_count": 1,
            "total_time_spent": data.seconds_spent,
            "interaction_count": 0,
            "last_visited": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        }
        await db.profile_visits.insert_one(visit_record)
        return {"status": "created", "seconds_added": data.seconds_spent}
    
    return {"status": "updated", "seconds_added": data.seconds_spent}


@router.post("/interaction")
async def track_interaction(
    data: ProfileVisitInteraction,
    current_user: dict = Depends(get_current_user)
):
    """
    Track an interaction with a profile.
    Called when user messages, purchases from, reviews, or favorites
    something from another user.
    """
    db = get_database()
    visitor_id = current_user["id"]
    profile_id = data.profile_id
    
    # Don't track self-interactions
    if visitor_id == profile_id:
        return {"status": "skipped", "reason": "self_interaction"}
    
    # Check if visitor has opted out
    visitor = await db.users.find_one({"id": visitor_id})
    if visitor and visitor.get("opt_out_of_top_fans", False):
        return {"status": "skipped", "reason": "opted_out"}
    
    # Valid interaction types
    valid_types = ["message", "purchase", "review", "favorite", "gig_response"]
    if data.interaction_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid interaction type. Must be one of: {valid_types}")
    
    now = datetime.now(timezone.utc)
    
    # Find existing record or create new one
    existing = await db.profile_visits.find_one({
        "visitor_id": visitor_id,
        "profile_id": profile_id
    })
    
    if existing:
        await db.profile_visits.update_one(
            {"_id": existing["_id"]},
            {
                "$inc": {"interaction_count": 1},
                "$set": {"last_visited": now}
            }
        )
        return {"status": "updated", "interaction_type": data.interaction_type}
    else:
        # Create new record with interaction
        visit_record = {
            "visitor_id": visitor_id,
            "profile_id": profile_id,
            "visit_count": 0,  # They interacted but may not have "visited" the profile page
            "total_time_spent": 0,
            "interaction_count": 1,
            "last_visited": now,
            "created_at": now
        }
        await db.profile_visits.insert_one(visit_record)
        return {"status": "created", "interaction_type": data.interaction_type}


@router.get("/top-fans/{profile_id}", response_model=TopFansResponse)
async def get_top_fans(
    profile_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get the top 8 fans for a profile.
    Returns fans ranked by engagement score.
    """
    db = get_database()
    
    # Get profile owner
    profile_owner = await db.users.find_one({"id": profile_id})
    if not profile_owner:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Check visibility settings
    visibility = profile_owner.get("top_fans_visibility", "public")
    is_owner = current_user and current_user["id"] == profile_id
    
    # If hidden, return empty (unless owner)
    if visibility == "hidden" and not is_owner:
        return TopFansResponse(fans=[], visibility="hidden", total_unique_visitors=0)
    
    # If private, only owner can see
    if visibility == "private" and not is_owner:
        return TopFansResponse(fans=[], visibility="private", total_unique_visitors=0)
    
    # Get all visitors who haven't opted out
    # First, get list of users who have opted out
    opted_out_users = await db.users.distinct("id", {"opt_out_of_top_fans": True})
    
    # Build query to exclude opted-out users
    query = {
        "profile_id": profile_id,
        "visitor_id": {"$nin": opted_out_users}
    }
    
    # Get all visit records for this profile
    visits_cursor = db.profile_visits.find(query)
    visits = await visits_cursor.to_list(length=None)
    
    # Calculate engagement scores and sort
    scored_visitors = []
    for visit in visits:
        score = calculate_engagement_score(
            visit.get("visit_count", 0),
            visit.get("total_time_spent", 0),
            visit.get("interaction_count", 0)
        )
        # Only include if they have some engagement
        if score > 0:
            scored_visitors.append({
                "visitor_id": visit["visitor_id"],
                "score": score,
                "visit_count": visit.get("visit_count", 0)
            })
    
    # Sort by score descending and take top 8
    scored_visitors.sort(key=lambda x: x["score"], reverse=True)
    top_8 = scored_visitors[:8]
    
    # Fetch user details for top 8
    fans = []
    for i, visitor_data in enumerate(top_8):
        user = await db.users.find_one({"id": visitor_data["visitor_id"]})
        if user:
            fans.append(TopFan(
                user_id=user["id"],
                username=user.get("username", "Unknown"),
                profile_image=user.get("profile_image"),
                rank=i + 1,
                engagement_score=visitor_data["score"],
                visit_count=visitor_data["visit_count"],
                is_gold_member=user.get("is_gold_member", False),
                is_founder=user.get("is_founder", False)
            ))
    
    return TopFansResponse(
        fans=fans,
        visibility=visibility,
        total_unique_visitors=len(visits)
    )


@router.get("/my-stats/{profile_id}")
async def get_my_fan_stats(
    profile_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get current user's engagement stats for a specific profile.
    Useful for showing users their own fan status.
    """
    db = get_database()
    
    visit_record = await db.profile_visits.find_one({
        "visitor_id": current_user["id"],
        "profile_id": profile_id
    })
    
    if not visit_record:
        return {
            "is_fan": False,
            "visit_count": 0,
            "total_time_spent": 0,
            "interaction_count": 0,
            "engagement_score": 0
        }
    
    score = calculate_engagement_score(
        visit_record.get("visit_count", 0),
        visit_record.get("total_time_spent", 0),
        visit_record.get("interaction_count", 0)
    )
    
    return {
        "is_fan": True,
        "visit_count": visit_record.get("visit_count", 0),
        "total_time_spent": visit_record.get("total_time_spent", 0),
        "interaction_count": visit_record.get("interaction_count", 0),
        "engagement_score": score
    }
