"""Support Ticket Routes

API endpoints for the customer support ticketing system.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query, Request
from typing import Optional, List
from datetime import datetime
from models.ticket import (
    TicketCreate, TicketInDB, TicketResponse, TicketReply,
    TicketStatusUpdate, TicketReplyCreate,
    TICKET_CATEGORIES, TICKET_STATUSES, TICKET_PRIORITIES
)
from services.auth import get_current_user, get_current_user_optional
from services.email import send_ticket_notification, send_ticket_reply_notification
from services.message_service import send_support_message_to_user
from database import get_database
from analytics.services.event_emitter import emit_event, EventTypes, ActorType
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["tickets"])


async def generate_ticket_number() -> str:
    """Generate a human-readable ticket number"""
    db = get_database()
    count = await db.support_tickets.count_documents({}) + 1
    return f"TKT-{count:05d}"


@router.get("/categories")
async def get_ticket_categories():
    """Get available ticket categories"""
    return {
        "categories": TICKET_CATEGORIES,
        "statuses": TICKET_STATUSES,
        "priorities": TICKET_PRIORITIES
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ticket(
    request: Request,
    ticket_data: TicketCreate,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Create a new support ticket"""
    db = get_database()
    
    # Validate category
    if ticket_data.category not in TICKET_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {', '.join(TICKET_CATEGORIES)}"
        )
    
    # Get customer info
    if current_user:
        customer_name = current_user.get("username", "Unknown")
        customer_email = current_user.get("email", "")
        user_id = current_user["id"]
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You must be logged in to submit a support ticket"
        )
    
    # Generate ticket number
    ticket_number = await generate_ticket_number()
    
    # Determine priority based on category
    priority = "medium"
    if ticket_data.category in ["Payment Problem", "Report a User"]:
        priority = "high"
    elif ticket_data.category in ["Feedback/Suggestion"]:
        priority = "low"
    
    # Create ticket
    ticket = TicketInDB(
        ticket_number=ticket_number,
        user_id=user_id,
        customer_name=customer_name,
        customer_email=customer_email,
        category=ticket_data.category,
        subject=ticket_data.subject,
        message=ticket_data.message,
        order_id=ticket_data.order_id,
        listing_id=ticket_data.listing_id,
        priority=priority,
        user_agent=request.headers.get("user-agent")
    )
    
    await db.support_tickets.insert_one(ticket.model_dump())
    
    # Send email notification to staff
    try:
        await send_ticket_notification(ticket)
    except Exception as e:
        logger.error(f"Failed to send ticket notification email: {e}")
    
    # Emit analytics event
    emit_event(
        EventTypes.TICKET_CREATED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=customer_name,
        metadata={
            "ticket_id": ticket.id,
            "ticket_number": ticket_number,
            "category": ticket_data.category,
            "priority": priority,
            "has_order": ticket_data.order_id is not None,
            "has_listing": ticket_data.listing_id is not None
        }
    )
    
    logger.info(f"Created support ticket {ticket_number} from {customer_email}")
    
    return {
        "message": "Support ticket created successfully",
        "ticket_number": ticket_number,
        "ticket_id": ticket.id
    }


@router.get("/my-tickets")
async def get_my_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(20, le=50),
    skip: int = Query(0),
    current_user: dict = Depends(get_current_user)
):
    """Get current user's support tickets"""
    db = get_database()
    
    query = {"user_id": current_user["id"]}
    if status_filter:
        query["status"] = status_filter
    
    cursor = db.support_tickets.find(query)
    cursor = cursor.sort("created_at", -1).skip(skip).limit(limit)
    
    tickets = await cursor.to_list(length=limit)
    total = await db.support_tickets.count_documents(query)
    
    return {
        "tickets": [
            {
                "id": t["id"],
                "ticket_number": t["ticket_number"],
                "category": t["category"],
                "subject": t["subject"],
                "status": t["status"],
                "priority": t["priority"],
                "created_at": t["created_at"],
                "updated_at": t["updated_at"],
                "reply_count": len(t.get("replies", []))
            }
            for t in tickets
        ],
        "total": total
    }


@router.get("/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific ticket"""
    db = get_database()
    
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Only allow owner or admin to view
    if ticket["user_id"] != current_user["id"] and not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this ticket"
        )
    
    # Clean up MongoDB ObjectId
    return {k: v for k, v in ticket.items() if k != '_id'}


@router.post("/{ticket_id}/reply")
async def add_ticket_reply(
    ticket_id: str,
    reply_data: TicketReplyCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a reply to a ticket"""
    db = get_database()
    
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Only allow owner or admin to reply
    is_admin = current_user.get("is_admin", False)
    if ticket["user_id"] != current_user["id"] and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to reply to this ticket"
        )
    
    # Create reply
    reply = TicketReply(
        sender_type="staff" if is_admin else "customer",
        sender_id=current_user["id"],
        sender_name=current_user.get("username", "Staff"),
        message=reply_data.message
    )
    
    # Update ticket
    new_status = ticket["status"]
    if is_admin and ticket["status"] == "open":
        new_status = "in_progress"
    elif not is_admin and ticket["status"] == "waiting_on_customer":
        new_status = "in_progress"
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"replies": reply.model_dump()},
            "$set": {
                "updated_at": datetime.utcnow(),
                "status": new_status
            }
        }
    )
    
    # If staff is replying, send both in-app message and email to the customer
    if is_admin:
        # Send in-app message to user's inbox
        try:
            # Get the ticket owner's username
            ticket_owner = await db.users.find_one({"id": ticket["user_id"]})
            owner_username = ticket_owner.get("username", "User") if ticket_owner else "User"
            
            await send_support_message_to_user(
                user_id=ticket["user_id"],
                user_username=owner_username,
                content=reply_data.message,
                ticket_number=ticket["ticket_number"]
            )
            logger.info(f"In-app support message sent to user {ticket['user_id']} for ticket {ticket['ticket_number']}")
        except Exception as e:
            logger.error(f"Failed to send in-app message: {e}")
    
    # Send email notification (enhanced with CTA button for customers)
    try:
        await send_ticket_reply_notification(ticket, reply, is_admin)
    except Exception as e:
        logger.error(f"Failed to send reply notification: {e}")
    
    # Emit analytics event
    emit_event(
        EventTypes.TICKET_REPLIED,
        actor_type=ActorType.ADMIN if is_admin else ActorType.BUYER,
        actor_id=current_user["id"],
        actor_username=current_user.get("username"),
        metadata={
            "ticket_id": ticket_id,
            "ticket_number": ticket["ticket_number"],
            "is_staff_reply": is_admin
        }
    )
    
    return {"message": "Reply added successfully"}


# Admin endpoints
@router.get("/admin/all")
async def get_all_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    skip: int = Query(0),
    current_user: dict = Depends(get_current_user)
):
    """Get all tickets (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    db = get_database()
    
    query = {}
    if status_filter:
        query["status"] = status_filter
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    
    cursor = db.support_tickets.find(query)
    cursor = cursor.sort("created_at", -1).skip(skip).limit(limit)
    
    tickets = await cursor.to_list(length=limit)
    total = await db.support_tickets.count_documents(query)
    
    # Clean up MongoDB ObjectId before returning
    cleaned_tickets = []
    for t in tickets:
        ticket = {k: v for k, v in t.items() if k != '_id'}
        cleaned_tickets.append(ticket)
    
    return {
        "tickets": cleaned_tickets,
        "total": total
    }


@router.get("/admin/stats")
async def get_ticket_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get ticket statistics (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    db = get_database()
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Counts by status
    total = await db.support_tickets.count_documents({})
    open_tickets = await db.support_tickets.count_documents({"status": "open"})
    in_progress = await db.support_tickets.count_documents({"status": "in_progress"})
    waiting = await db.support_tickets.count_documents({"status": "waiting_on_customer"})
    resolved = await db.support_tickets.count_documents({"status": "resolved"})
    closed = await db.support_tickets.count_documents({"status": "closed"})
    
    # Today's tickets
    today = await db.support_tickets.count_documents({"created_at": {"$gte": today_start}})
    
    # By priority (open tickets only)
    urgent = await db.support_tickets.count_documents({"priority": "urgent", "status": {"$nin": ["resolved", "closed"]}})
    high = await db.support_tickets.count_documents({"priority": "high", "status": {"$nin": ["resolved", "closed"]}})
    
    # By category (top 5)
    pipeline = [
        {"$match": {"status": {"$nin": ["resolved", "closed"]}}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    categories = await db.support_tickets.aggregate(pipeline).to_list(length=5)
    
    return {
        "total_tickets": total,
        "open": open_tickets,
        "in_progress": in_progress,
        "waiting_on_customer": waiting,
        "resolved": resolved,
        "closed": closed,
        "pending_total": open_tickets + in_progress + waiting,
        "tickets_today": today,
        "urgent_tickets": urgent,
        "high_priority": high,
        "top_categories": [{"category": c["_id"], "count": c["count"]} for c in categories]
    }


@router.put("/admin/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    update_data: TicketStatusUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update ticket status (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    db = get_database()
    
    if update_data.status not in TICKET_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(TICKET_STATUSES)}"
        )
    
    update_fields = {
        "status": update_data.status,
        "updated_at": datetime.utcnow()
    }
    
    if update_data.status == "resolved":
        update_fields["resolved_at"] = datetime.utcnow()
    
    if update_data.priority:
        if update_data.priority not in TICKET_PRIORITIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid priority. Must be one of: {', '.join(TICKET_PRIORITIES)}"
            )
        update_fields["priority"] = update_data.priority
    
    result = await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Emit analytics event
    emit_event(
        EventTypes.TICKET_STATUS_CHANGED,
        actor_type=ActorType.ADMIN,
        actor_id=current_user["id"],
        actor_username=current_user.get("username"),
        metadata={
            "ticket_id": ticket_id,
            "new_status": update_data.status,
            "new_priority": update_data.priority
        }
    )
    
    return {"message": "Ticket updated successfully"}
