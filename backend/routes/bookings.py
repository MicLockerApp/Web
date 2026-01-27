"""
Venue Booking Routes

API endpoints for venue/studio/engineer calendar and booking request system.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.booking import (
    BookingCreate, BookingInDB, BookingResponse, BookingUpdate,
    BookingStatus, CalendarEvent
)
from models.notification import NotificationType
from routes.notifications import create_notification
from services.auth import get_current_user, get_current_user_optional
from database import get_database
from datetime import datetime, timezone
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["Bookings"])

# Categories that can receive booking requests
BOOKABLE_CATEGORIES = ["venue", "audio_engineer", "recording_studio"]


@router.post("", response_model=BookingResponse)
async def create_booking_request(
    booking_data: BookingCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a booking request to a venue.
    Only non-bookable users can send booking requests.
    """
    db = get_database()
    
    # Get the provider (venue/studio/engineer)
    provider = await db.users.find_one({"id": booking_data.venue_id})
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    # Verify target is a bookable category
    provider_category = provider.get("category", "").lower()
    if provider_category not in BOOKABLE_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking requests can only be sent to venues, audio engineers, or recording studios"
        )
    
    # Cannot book yourself
    if provider["id"] == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send booking request to yourself"
        )
    
    # Check for existing booking on same date/time
    existing = await db.venue_bookings.find_one({
        "venue_id": booking_data.venue_id,
        "event_date": booking_data.event_date,
        "event_time": booking_data.event_time,
        "status": {"$in": [BookingStatus.PENDING, BookingStatus.ACCEPTED]}
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This time slot is already booked or has a pending request"
        )
    
    # Create booking
    booking = BookingInDB(
        venue_id=provider["id"],
        venue_username=provider["username"],
        artist_id=current_user["id"],
        artist_username=current_user["username"],
        event_date=booking_data.event_date,
        event_time=booking_data.event_time,
        duration_hours=booking_data.duration_hours,
        event_name=booking_data.event_name,
        event_description=booking_data.event_description,
        expected_attendance=booking_data.expected_attendance,
        genre=booking_data.genre,
        special_requests=booking_data.special_requests
    )
    
    await db.venue_bookings.insert_one(booking.model_dump())
    
    logger.info(f"Booking request created: {booking.id} from {current_user['username']} to {provider['username']}")
    
    # Get provider type label for notification
    provider_type = "studio" if provider_category == "recording_studio" else provider_category.replace("_", " ")
    
    # Create notification for provider
    await create_notification(
        user_id=provider["id"],
        notification_type=NotificationType.BOOKING_REQUEST,
        title="New Booking Request",
        message=f"{current_user['username']} wants to book your {provider_type} for '{booking_data.event_name}'",
        link="/venue/bookings",
        metadata={"booking_id": booking.id, "artist_id": current_user["id"]}
    )
    
    return BookingResponse(**booking.model_dump())


@router.get("/venue/{venue_id}/calendar", response_model=List[CalendarEvent])
async def get_venue_calendar(
    venue_id: str,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get a provider's calendar with all accepted bookings.
    Pending bookings are only visible to the provider (owner).
    Works for venues, audio engineers, and recording studios.
    """
    db = get_database()
    
    # Verify provider exists and is a bookable category
    provider = await db.users.find_one({"id": venue_id})
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    provider_category = provider.get("category", "").lower()
    if provider_category not in BOOKABLE_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a bookable provider (venue, audio engineer, or recording studio)"
        )
    
    # Build query
    query = {"venue_id": venue_id}
    
    # Only show accepted bookings to public, show all to provider
    is_provider = current_user and current_user["id"] == venue_id
    if not is_provider:
        query["status"] = BookingStatus.ACCEPTED
    else:
        query["status"] = {"$in": [BookingStatus.PENDING, BookingStatus.ACCEPTED]}
    
    # Filter by month/year if provided
    if month and year:
        from datetime import datetime
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        query["event_date"] = {"$gte": start_date, "$lt": end_date}
    
    bookings = await db.venue_bookings.find(query).sort("event_date", 1).to_list(length=100)
    
    events = []
    for booking in bookings:
        events.append(CalendarEvent(
            id=booking["id"],
            event_name=booking["event_name"],
            event_date=booking["event_date"],
            event_time=booking["event_time"],
            duration_hours=booking["duration_hours"],
            artist_username=booking["artist_username"],
            artist_id=booking["artist_id"],
            status=booking["status"],
            genre=booking.get("genre")
        ))
    
    return events


@router.get("/venue/{venue_id}/requests", response_model=List[BookingResponse])
async def get_venue_booking_requests(
    venue_id: str,
    status_filter: Optional[BookingStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all booking requests for a venue.
    Only the venue owner can access this.
    """
    db = get_database()
    
    # Verify user owns this venue
    if current_user["id"] != venue_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own booking requests"
        )
    
    query = {"venue_id": venue_id}
    if status_filter:
        query["status"] = status_filter
    
    bookings = await db.venue_bookings.find(query).sort("created_at", -1).to_list(length=100)
    
    return [BookingResponse(**b) for b in bookings]


@router.get("/artist/requests", response_model=List[BookingResponse])
async def get_artist_booking_requests(
    status_filter: Optional[BookingStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all booking requests sent by the current user (artist).
    """
    db = get_database()
    
    query = {"artist_id": current_user["id"]}
    if status_filter:
        query["status"] = status_filter
    
    bookings = await db.venue_bookings.find(query).sort("created_at", -1).to_list(length=100)
    
    return [BookingResponse(**b) for b in bookings]


@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a specific booking.
    Only the venue owner or artist can view.
    """
    db = get_database()
    
    booking = await db.venue_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check permission
    if current_user["id"] not in [booking["venue_id"], booking["artist_id"]]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to view this booking"
        )
    
    return BookingResponse(**booking)


@router.patch("/{booking_id}", response_model=BookingResponse)
async def update_booking(
    booking_id: str,
    update_data: BookingUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update a booking (accept/decline, add documents).
    - Venue owner can accept/decline and add venue_documents
    - Artist can add artist_documents
    - Only pending bookings can be accepted/declined
    """
    db = get_database()
    
    booking = await db.venue_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    is_venue = current_user["id"] == booking["venue_id"]
    is_artist = current_user["id"] == booking["artist_id"]
    
    if not is_venue and not is_artist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this booking"
        )
    
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    
    # Handle status change (venue only)
    if update_data.status and is_venue:
        if booking["status"] != BookingStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending bookings can be accepted or declined"
            )
        update_fields["status"] = update_data.status
        update_fields["responded_at"] = datetime.now(timezone.utc)
        
        if update_data.venue_response:
            update_fields["venue_response"] = update_data.venue_response
        
        # Create notification for artist about booking status
        if update_data.status == BookingStatus.ACCEPTED:
            await create_notification(
                user_id=booking["artist_id"],
                notification_type=NotificationType.BOOKING_ACCEPTED,
                title="Booking Confirmed!",
                message=f"{booking['venue_username']} has accepted your booking for '{booking['event_name']}'",
                link="/my-bookings",
                metadata={"booking_id": booking["id"], "venue_id": booking["venue_id"]}
            )
        elif update_data.status == BookingStatus.DECLINED:
            await create_notification(
                user_id=booking["artist_id"],
                notification_type=NotificationType.BOOKING_DECLINED,
                title="Booking Declined",
                message=f"{booking['venue_username']} has declined your booking for '{booking['event_name']}'",
                link="/my-bookings",
                metadata={"booking_id": booking["id"], "venue_id": booking["venue_id"]}
            )
    
    # Handle document uploads
    if update_data.venue_documents is not None and is_venue:
        # Append new documents to existing
        existing_docs = booking.get("venue_documents", [])
        update_fields["venue_documents"] = existing_docs + update_data.venue_documents
    
    if update_data.artist_documents is not None and is_artist:
        # Append new documents to existing
        existing_docs = booking.get("artist_documents", [])
        update_fields["artist_documents"] = existing_docs + update_data.artist_documents
    
    await db.venue_bookings.update_one(
        {"id": booking_id},
        {"$set": update_fields}
    )
    
    updated_booking = await db.venue_bookings.find_one({"id": booking_id})
    
    logger.info(f"Booking {booking_id} updated by {current_user['username']}: {update_fields}")
    
    return BookingResponse(**updated_booking)


@router.delete("/{booking_id}")
async def cancel_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel a booking.
    - Artist can cancel their own pending requests
    - Venue can cancel any booking for their venue
    """
    db = get_database()
    
    booking = await db.venue_bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    is_venue = current_user["id"] == booking["venue_id"]
    is_artist = current_user["id"] == booking["artist_id"]
    
    if not is_venue and not is_artist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel this booking"
        )
    
    # Artist can only cancel pending requests
    if is_artist and booking["status"] != BookingStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only cancel pending booking requests"
        )
    
    await db.venue_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "status": BookingStatus.CANCELLED,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    logger.info(f"Booking {booking_id} cancelled by {current_user['username']}")
    
    return {"message": "Booking cancelled successfully"}
