from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.message import (
    MessageCreate, MessageInDB, MessageThreadInDB,
    MessageResponse, MessageThreadResponse, ThreadWithMessages
)
from models.ticket import TicketReply
from services.auth import get_current_user
from services.message_service import SUPPORT_SYSTEM_USER_ID
from database import get_database
from analytics.services.event_emitter import emit_event, EventTypes, ActorType
from datetime import datetime
from typing import Optional
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["Messages"])

# Rate limiting: simple in-memory tracker (for production, use Redis)
message_rate_limit = {}  # user_id: [timestamps]
RATE_LIMIT_MESSAGES = 20  # messages per minute
RATE_LIMIT_WINDOW = 60  # seconds

def check_rate_limit(user_id: str) -> bool:
    """Check if user is within rate limit"""
    now = datetime.utcnow().timestamp()
    user_messages = message_rate_limit.get(user_id, [])
    
    # Remove old timestamps
    user_messages = [ts for ts in user_messages if now - ts < RATE_LIMIT_WINDOW]
    message_rate_limit[user_id] = user_messages
    
    return len(user_messages) < RATE_LIMIT_MESSAGES

def record_message(user_id: str):
    """Record a message for rate limiting"""
    now = datetime.utcnow().timestamp()
    if user_id not in message_rate_limit:
        message_rate_limit[user_id] = []
    message_rate_limit[user_id].append(now)

@router.post("", response_model=MessageResponse)
async def send_message(
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to another user"""
    db = get_database()
    
    # Rate limiting
    if not check_rate_limit(current_user["id"]):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many messages. Please wait a moment."
        )
    
    # Get recipient
    recipient = await db.users.find_one({"id": message_data.recipient_id})
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found"
        )
    
    if recipient["id"] == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to yourself"
        )
    
    # Check if user is replying to MicLocker Support
    is_support_reply = message_data.recipient_id == SUPPORT_SYSTEM_USER_ID
    
    # Get listing info if provided
    listing_title = None
    if message_data.listing_id:
        listing = await db.listings.find_one({"id": message_data.listing_id})
        if listing:
            listing_title = listing["title"]
    
    # Find or create thread
    participants = sorted([current_user["id"], recipient["id"]])
    thread = await db.message_threads.find_one({"participants": participants})
    
    if not thread:
        # Create new thread
        thread = MessageThreadInDB(
            participants=participants,
            participant_usernames=[current_user["username"], recipient["username"]],
            unread_count={recipient["id"]: 0}
        )
        await db.message_threads.insert_one(thread.model_dump())
        thread = thread.model_dump()
    
    # Create message
    message = MessageInDB(
        thread_id=thread["id"],
        sender_id=current_user["id"],
        sender_username=current_user["username"],
        content=message_data.content,
        listing_id=message_data.listing_id,
        listing_title=listing_title
    )
    
    await db.messages.insert_one(message.model_dump())
    
    # Update thread
    unread_count = thread.get("unread_count", {})
    unread_count[recipient["id"]] = unread_count.get(recipient["id"], 0) + 1
    
    await db.message_threads.update_one(
        {"id": thread["id"]},
        {
            "$set": {
                "last_message": message_data.content[:100],
                "last_message_at": datetime.utcnow(),
                "last_sender_id": current_user["id"],
                "unread_count": unread_count,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    record_message(current_user["id"])
    
    # If this is a reply to MicLocker Support, add it to the user's most recent open ticket
    if is_support_reply:
        try:
            # Find the user's most recent open/in-progress ticket
            latest_ticket = await db.support_tickets.find_one(
                {
                    "user_id": current_user["id"],
                    "status": {"$in": ["open", "in_progress", "waiting_on_customer"]}
                },
                sort=[("updated_at", -1)]
            )
            
            if latest_ticket:
                # Create a ticket reply from the user
                ticket_reply = TicketReply(
                    sender_type="customer",
                    sender_id=current_user["id"],
                    sender_name=current_user.get("username", "User"),
                    message=message_data.content
                )
                
                # Update the ticket with the new reply
                await db.support_tickets.update_one(
                    {"id": latest_ticket["id"]},
                    {
                        "$push": {"replies": ticket_reply.model_dump()},
                        "$set": {
                            "updated_at": datetime.utcnow(),
                            "status": "in_progress" if latest_ticket["status"] == "waiting_on_customer" else latest_ticket["status"]
                        }
                    }
                )
                
                logger.info(f"User reply added to ticket {latest_ticket['ticket_number']} from messaging inbox")
                
                # Emit analytics event
                emit_event(
                    EventTypes.TICKET_REPLIED,
                    actor_type=ActorType.BUYER,
                    actor_id=current_user["id"],
                    actor_username=current_user.get("username"),
                    metadata={
                        "ticket_id": latest_ticket["id"],
                        "ticket_number": latest_ticket["ticket_number"],
                        "is_staff_reply": False,
                        "source": "messaging_inbox"
                    }
                )
        except Exception as e:
            logger.error(f"Failed to sync message to ticket: {e}")
    
    # Emit analytics event for message sent
    is_first_message = not thread.get("last_message")
    emit_event(
        EventTypes.MESSAGE_SENT,
        actor_type=ActorType.BUYER,
        actor_id=current_user["id"],
        actor_username=current_user["username"],
        message_thread_id=thread["id"],
        target_user_id=recipient["id"],
        listing_id=message_data.listing_id,
        metadata={
            "is_first_message": is_first_message,
            "has_listing_context": message_data.listing_id is not None,
            "listing_title": listing_title,
            "is_support_reply": is_support_reply
        }
    )
    
    # Emit conversation started event if this is a new thread
    if is_first_message:
        emit_event(
            EventTypes.CONVERSATION_STARTED,
            actor_type=ActorType.BUYER,
            actor_id=current_user["id"],
            actor_username=current_user["username"],
            message_thread_id=thread["id"],
            target_user_id=recipient["id"],
            listing_id=message_data.listing_id,
            metadata={
                "has_listing_context": message_data.listing_id is not None
            }
        )
    
    return MessageResponse(**message.model_dump())

@router.get("/threads", response_model=dict)
async def get_threads(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Get user's message threads (inbox)"""
    db = get_database()
    
    filter_query = {"participants": current_user["id"]}
    skip = (page - 1) * limit
    
    total = await db.message_threads.count_documents(filter_query)
    cursor = db.message_threads.find(filter_query).skip(skip).limit(limit).sort("updated_at", -1)
    threads = await cursor.to_list(length=limit)
    
    # Format threads with other user info
    formatted_threads = []
    for thread in threads:
        # Find the other user (not current user)
        other_user_id = None
        for p in thread["participants"]:
            if p != current_user["id"]:
                other_user_id = p
                break
        
        if not other_user_id:
            continue
            
        # Fetch the other user's profile for username and avatar
        other_user = await db.users.find_one({"id": other_user_id})
        other_username = other_user.get("username") if other_user else "Unknown"
        other_user_avatar = other_user.get("profile_image") if other_user else None
        
        formatted_threads.append({
            "id": thread["id"],
            "participants": thread["participants"],
            "participant_usernames": thread["participant_usernames"],
            "other_user_id": other_user_id,
            "other_username": other_username,
            "other_user_avatar": other_user_avatar,
            "last_message": thread.get("last_message"),
            "last_message_at": thread.get("last_message_at"),
            "unread_count": thread.get("unread_count", {}).get(current_user["id"], 0),
            "created_at": thread["created_at"]
        })
    
    return {
        "threads": formatted_threads,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/threads/{thread_id}")
async def get_thread(
    thread_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific thread with messages"""
    db = get_database()
    
    thread = await db.message_threads.find_one({"id": thread_id})
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    if current_user["id"] not in thread["participants"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this thread"
        )
    
    # Get messages
    skip = (page - 1) * limit
    cursor = db.messages.find({"thread_id": thread_id}).skip(skip).limit(limit).sort("created_at", 1)
    messages = await cursor.to_list(length=limit)
    
    # Mark messages as read and set read_at timestamp
    await db.messages.update_many(
        {"thread_id": thread_id, "sender_id": {"$ne": current_user["id"]}, "is_read": False},
        {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
    )
    
    # Reset unread count
    unread_count = thread.get("unread_count", {})
    unread_count[current_user["id"]] = 0
    await db.message_threads.update_one(
        {"id": thread_id},
        {"$set": {"unread_count": unread_count}}
    )
    
    # Find the other user and fetch their profile
    other_user_id = None
    for p in thread["participants"]:
        if p != current_user["id"]:
            other_user_id = p
            break
    
    other_user = await db.users.find_one({"id": other_user_id}) if other_user_id else None
    other_username = other_user.get("username") if other_user else "Unknown"
    other_user_avatar = other_user.get("profile_image") if other_user else None
    
    thread_response = {
        "id": thread["id"],
        "participants": thread["participants"],
        "participant_usernames": thread["participant_usernames"],
        "other_user_id": other_user_id,
        "other_username": other_username,
        "other_user_avatar": other_user_avatar,
        "last_message": thread.get("last_message"),
        "last_message_at": thread.get("last_message_at"),
        "unread_count": 0,
        "created_at": thread["created_at"]
    }
    
    return {
        "thread": thread_response,
        "messages": [MessageResponse(**msg).model_dump() for msg in messages]
    }

@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get total unread message count"""
    db = get_database()
    
    # Count unread messages
    pipeline = [
        {"$match": {"participants": current_user["id"]}},
        {"$project": {"unread": {"$ifNull": [f"$unread_count.{current_user['id']}", 0]}}},
        {"$group": {"_id": None, "total": {"$sum": "$unread"}}}
    ]
    
    result = await db.message_threads.aggregate(pipeline).to_list(length=1)
    total = result[0]["total"] if result else 0
    
    return {"unread_count": total}

@router.post("/threads/{thread_id}/read")
async def mark_thread_read(
    thread_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark all messages in thread as read"""
    db = get_database()
    
    thread = await db.message_threads.find_one({"id": thread_id})
    if not thread or current_user["id"] not in thread["participants"]:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    # Mark messages as read and set read_at timestamp
    await db.messages.update_many(
        {"thread_id": thread_id, "sender_id": {"$ne": current_user["id"]}},
        {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
    )
    
    # Reset unread count
    unread_count = thread.get("unread_count", {})
    unread_count[current_user["id"]] = 0
    await db.message_threads.update_one(
        {"id": thread_id},
        {"$set": {"unread_count": unread_count}}
    )
    
    return {"message": "Thread marked as read"}
