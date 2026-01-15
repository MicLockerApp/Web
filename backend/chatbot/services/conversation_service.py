"""Conversation Service - Manages Conversation State

This service handles the stateful aspects of conversations:
- Creating and retrieving conversations
- Adding messages
- Managing conversation status
- Logging for analytics
"""
from typing import Optional, List
from datetime import datetime
from database import get_database
from ..models.conversation import (
    Conversation,
    ConversationMessage,
    ConversationSummary
)
import logging

logger = logging.getLogger(__name__)


class ConversationService:
    """Manages conversation persistence and state"""
    
    @staticmethod
    async def get_or_create_conversation(
        session_id: str,
        user_id: Optional[str] = None,
        source: str = "web_widget"
    ) -> Conversation:
        """Get existing conversation or create new one"""
        db = get_database()
        
        # Try to find existing active conversation
        existing = await db.chatbot_conversations.find_one({
            "session_id": session_id,
            "status": "active"
        })
        
        if existing:
            # Update last activity
            await db.chatbot_conversations.update_one(
                {"id": existing["id"]},
                {"$set": {"last_activity": datetime.utcnow()}}
            )
            return Conversation(**existing)
        
        # Create new conversation
        conversation = Conversation(
            session_id=session_id,
            user_id=user_id,
            source=source
        )
        
        await db.chatbot_conversations.insert_one(conversation.model_dump())
        logger.info(f"Created new conversation: {conversation.id}")
        
        return conversation
    
    @staticmethod
    async def add_message(
        conversation_id: str,
        role: str,
        content: str,
        metadata: dict = None
    ) -> ConversationMessage:
        """Add a message to conversation"""
        db = get_database()
        
        message = ConversationMessage(
            role=role,
            content=content,
            metadata=metadata or {}
        )
        
        await db.chatbot_conversations.update_one(
            {"id": conversation_id},
            {
                "$push": {"messages": message.model_dump()},
                "$inc": {"message_count": 1},
                "$set": {"last_activity": datetime.utcnow()}
            }
        )
        
        return message
    
    @staticmethod
    async def get_conversation_history(
        conversation_id: str,
        limit: int = 20
    ) -> List[dict]:
        """Get recent messages for LLM context"""
        db = get_database()
        
        conversation = await db.chatbot_conversations.find_one(
            {"id": conversation_id}
        )
        
        if not conversation:
            return []
        
        messages = conversation.get("messages", [])
        # Return last N messages for context
        recent_messages = messages[-limit:] if len(messages) > limit else messages
        
        # Format for LLM
        return [
            {"role": m["role"], "content": m["content"]}
            for m in recent_messages
            if m["role"] in ["user", "assistant"]
        ]
    
    @staticmethod
    async def update_intent(
        conversation_id: str,
        intent: str
    ):
        """Update detected intent"""
        db = get_database()
        
        await db.chatbot_conversations.update_one(
            {"id": conversation_id},
            {"$set": {"detected_intent": intent}}
        )
    
    @staticmethod
    async def escalate_conversation(
        conversation_id: str,
        reason: str
    ):
        """Mark conversation for human escalation"""
        db = get_database()
        
        await db.chatbot_conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "escalated_to_human": True,
                    "escalation_reason": reason,
                    "status": "escalated"
                }
            }
        )
        logger.info(f"Conversation {conversation_id} escalated: {reason}")
    
    @staticmethod
    async def resolve_conversation(conversation_id: str):
        """Mark conversation as resolved"""
        db = get_database()
        
        await db.chatbot_conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "status": "resolved",
                    "resolved_at": datetime.utcnow()
                }
            }
        )
    
    @staticmethod
    async def get_conversations(
        status: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[ConversationSummary]:
        """Get conversations for admin dashboard"""
        db = get_database()
        
        query = {}
        if status:
            query["status"] = status
        if user_id:
            query["user_id"] = user_id
        
        cursor = db.chatbot_conversations.find(query)
        cursor = cursor.sort("last_activity", -1).skip(skip).limit(limit)
        
        conversations = await cursor.to_list(length=limit)
        
        return [
            ConversationSummary(
                id=c["id"],
                session_id=c["session_id"],
                user_id=c.get("user_id"),
                status=c["status"],
                message_count=c.get("message_count", 0),
                detected_intent=c.get("detected_intent"),
                started_at=c["started_at"],
                last_activity=c["last_activity"],
                escalated_to_human=c.get("escalated_to_human", False),
                source=c.get("source", "web_widget")
            )
            for c in conversations
        ]
    
    @staticmethod
    async def get_conversation_stats() -> dict:
        """Get chatbot analytics"""
        db = get_database()
        
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        total = await db.chatbot_conversations.count_documents({})
        active = await db.chatbot_conversations.count_documents({"status": "active"})
        resolved = await db.chatbot_conversations.count_documents({"status": "resolved"})
        escalated = await db.chatbot_conversations.count_documents({"escalated_to_human": True})
        today = await db.chatbot_conversations.count_documents({"started_at": {"$gte": today_start}})
        
        # Average messages per conversation
        pipeline = [
            {"$group": {"_id": None, "avg_messages": {"$avg": "$message_count"}}}
        ]
        avg_result = await db.chatbot_conversations.aggregate(pipeline).to_list(length=1)
        avg_messages = avg_result[0]["avg_messages"] if avg_result else 0
        
        return {
            "total_conversations": total,
            "active_conversations": active,
            "resolved_conversations": resolved,
            "escalated_conversations": escalated,
            "conversations_today": today,
            "avg_messages_per_conversation": round(avg_messages, 1),
            "escalation_rate": round(escalated / total * 100, 1) if total > 0 else 0
        }
