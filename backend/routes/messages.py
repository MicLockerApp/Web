from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.message import (
    MessageCreate, MessageInDB, MessageThreadInDB,
    MessageResponse, MessageThreadResponse, ThreadWithMessages
)
from services.auth import get_current_user
from database import get_database
from datetime import datetime
from typing import Optional

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
        other_user_id = [p for p in thread["participants"] if p != current_user["id"]][0]
        other_username = None
        for i, p in enumerate(thread["participants"]):
            if p == other_user_id:
                other_username = thread["participant_usernames"][i] if i < len(thread["participant_usernames"]) else None
                break
        
        formatted_threads.append(MessageThreadResponse(
            id=thread["id"],
            participants=thread["participants"],
            participant_usernames=thread["participant_usernames"],
            other_user_id=other_user_id,
            other_username=other_username,
            last_message=thread.get("last_message"),
            last_message_at=thread.get("last_message_at"),
            unread_count=thread.get("unread_count", {}).get(current_user["id"], 0),
            created_at=thread["created_at"]
        ))
    
    return {
        "threads": formatted_threads,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/threads/{thread_id}", response_model=ThreadWithMessages)
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
    
    # Mark messages as read
    await db.messages.update_many(
        {"thread_id": thread_id, "sender_id": {"$ne": current_user["id"]}, "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    # Reset unread count
    unread_count = thread.get("unread_count", {})
    unread_count[current_user["id"]] = 0
    await db.message_threads.update_one(
        {"id": thread_id},
        {"$set": {"unread_count": unread_count}}
    )
    
    # Format thread
    other_user_id = [p for p in thread["participants"] if p != current_user["id"]][0]
    other_username = None
    for i, p in enumerate(thread["participants"]):
        if p == other_user_id:
            other_username = thread["participant_usernames"][i] if i < len(thread["participant_usernames"]) else None
            break
    
    thread_response = MessageThreadResponse(
        id=thread["id"],
        participants=thread["participants"],
        participant_usernames=thread["participant_usernames"],
        other_user_id=other_user_id,
        other_username=other_username,
        last_message=thread.get("last_message"),
        last_message_at=thread.get("last_message_at"),
        unread_count=0,
        created_at=thread["created_at"]
    )
    
    return ThreadWithMessages(
        thread=thread_response,
        messages=[MessageResponse(**msg) for msg in messages]
    )

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
    
    # Mark messages as read
    await db.messages.update_many(
        {"thread_id": thread_id, "sender_id": {"$ne": current_user["id"]}},
        {"$set": {"is_read": True}}
    )
    
    # Reset unread count
    unread_count = thread.get("unread_count", {})
    unread_count[current_user["id"]] = 0
    await db.message_threads.update_one(
        {"id": thread_id},
        {"$set": {"unread_count": unread_count}}
    )
    
    return {"message": "Thread marked as read"}
