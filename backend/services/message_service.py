"""
Message Service for sending system/support messages to users
"""
from datetime import datetime
from models.message import MessageInDB, MessageThreadInDB
from database import get_database
import logging

logger = logging.getLogger(__name__)

# System user ID for support messages - uses the admin account
SUPPORT_SYSTEM_USER_ID = "admin-miclocker-support"
SUPPORT_SYSTEM_USERNAME = "miclocker.support"


async def send_support_message_to_user(
    user_id: str,
    user_username: str,
    content: str,
    ticket_number: str = None
) -> bool:
    """
    Send an in-app message to a user from the MicLocker Support system.
    This creates or uses an existing message thread between the user and the support system.
    
    Args:
        user_id: The recipient user's ID
        user_username: The recipient user's username
        content: The message content
        ticket_number: Optional ticket number for reference
        
    Returns:
        True if message was sent successfully, False otherwise
    """
    db = get_database()
    
    try:
        # Find or create thread between user and support system
        participants = sorted([SUPPORT_SYSTEM_USER_ID, user_id])
        thread = await db.message_threads.find_one({"participants": participants})
        
        if not thread:
            # Create new thread with support system
            thread = MessageThreadInDB(
                participants=participants,
                participant_usernames=[SUPPORT_SYSTEM_USERNAME, user_username],
                unread_count={user_id: 0}
            )
            await db.message_threads.insert_one(thread.model_dump())
            thread = thread.model_dump()
            logger.info(f"Created new support thread for user {user_id}")
        
        # Format message content with ticket reference
        if ticket_number:
            formatted_content = f"""📬 Support Ticket Reply (Ticket #{ticket_number})

{content}

You can reply to this message or visit Contact Support to manage your tickets.

Keep Rockin! 🎸"""
        else:
            formatted_content = content
        
        # Create message
        message = MessageInDB(
            thread_id=thread["id"],
            sender_id=SUPPORT_SYSTEM_USER_ID,
            sender_username=SUPPORT_SYSTEM_USERNAME,
            content=formatted_content,
            listing_id=None,
            listing_title=None
        )
        
        await db.messages.insert_one(message.model_dump())
        
        # Update thread with last message info
        unread_count = thread.get("unread_count", {})
        unread_count[user_id] = unread_count.get(user_id, 0) + 1
        
        await db.message_threads.update_one(
            {"id": thread["id"]},
            {
                "$set": {
                    "last_message": formatted_content[:100],
                    "last_message_at": datetime.utcnow(),
                    "last_sender_id": SUPPORT_SYSTEM_USER_ID,
                    "unread_count": unread_count,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Support message sent to user {user_id} (thread: {thread['id']})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send support message to user {user_id}: {e}")
        return False


async def ensure_support_user_exists():
    """
    Verify the support/admin user exists in the database.
    This is called during app startup.
    
    Note: In production, the admin user (miclocker.support) is used for support messages.
    We don't create a separate system user anymore.
    """
    db = get_database()
    
    # Check if the admin support user exists
    support_user = await db.users.find_one({"id": SUPPORT_SYSTEM_USER_ID})
    
    if not support_user:
        # Also check by username as fallback
        support_user = await db.users.find_one({"username": SUPPORT_SYSTEM_USERNAME})
    
    if support_user:
        logger.info(f"Support user exists: {support_user.get('username')}")
        return True
    else:
        logger.warning("Support user (miclocker.support) not found in database!")
        return False
