"""Chatbot API Routes

Stateless API - any frontend can call these endpoints.
The intelligence is in the backend services, not here.

Endpoints:
- POST /api/chatbot/message - Send a message and get AI response
- GET /api/chatbot/conversation/{session_id} - Get conversation history
- POST /api/chatbot/escalate - Escalate to human
- GET /api/chatbot/admin/stats - Admin analytics
- GET /api/chatbot/admin/conversations - Admin conversation list
"""
from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import Optional
from services.auth import get_current_user_optional, get_current_user
from ..models.conversation import ChatRequest, ChatResponse
from ..services.ai_service import AIService
from ..services.conversation_service import ConversationService
from ..services.context_service import ContextService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chatbot", tags=["chatbot"])


@router.post("/message", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Send a message to the AI chatbot.
    
    This is the main endpoint for the chat widget.
    The frontend sends user messages here and receives AI responses.
    """
    try:
        # Get or create conversation
        user_id = current_user["id"] if current_user else request.user_id
        conversation = await ConversationService.get_or_create_conversation(
            session_id=request.session_id,
            user_id=user_id,
            source=request.source
        )
        
        # Detect intent
        intent = ContextService.detect_intent(request.message)
        await ConversationService.update_intent(conversation.id, intent)
        
        # Get user context for personalization
        user_context = await ContextService.get_user_context(user_id)
        
        # Get conversation history for context
        history = await ConversationService.get_conversation_history(conversation.id)
        
        # Check if should escalate
        should_escalate, escalation_reason = await AIService.should_escalate(
            history, request.message
        )
        
        if should_escalate:
            await ConversationService.escalate_conversation(
                conversation.id, escalation_reason
            )
            
            # Store user message
            await ConversationService.add_message(
                conversation.id, "user", request.message,
                {"intent": intent}
            )
            
            # Generate escalation response
            escalation_message = (
                "I understand you'd like to speak with a human agent. "
                "I'm connecting you to our support team now. "
                "A team member will be with you shortly during our support hours "
                "(Mon-Fri 3:30am-9pm CT, Sat-Sun 8:30am-4:30pm CT). "
                "If it's outside these hours, we'll get back to you as soon as possible."
            )
            
            await ConversationService.add_message(
                conversation.id, "assistant", escalation_message,
                {"escalated": True, "reason": escalation_reason}
            )
            
            return ChatResponse(
                session_id=request.session_id,
                message=escalation_message,
                conversation_id=conversation.id,
                intent=intent,
                escalate_to_human=True,
                metadata={"escalation_reason": escalation_reason}
            )
        
        # Store user message
        await ConversationService.add_message(
            conversation.id, "user", request.message,
            {"intent": intent, "context": request.context}
        )
        
        # Generate AI response
        ai_response = await AIService.generate_response(
            conversation_id=conversation.id,
            user_message=request.message,
            conversation_history=history,
            user_context=user_context,
            intent=intent
        )
        
        # Store AI response
        await ConversationService.add_message(
            conversation.id, "assistant", ai_response,
            {"intent": intent}
        )
        
        # Get suggested actions
        suggested_actions = ContextService.get_suggested_actions(intent)
        
        return ChatResponse(
            session_id=request.session_id,
            message=ai_response,
            conversation_id=conversation.id,
            intent=intent,
            suggested_actions=suggested_actions,
            escalate_to_human=False
        )
        
    except Exception as e:
        logger.error(f"Error processing chat message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process message"
        )


@router.get("/conversation/{session_id}")
async def get_conversation(
    session_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get conversation history for a session.
    Used when restoring a chat widget state.
    """
    from database import get_database
    db = get_database()
    
    conversation = await db.chatbot_conversations.find_one({
        "session_id": session_id,
        "status": {"$in": ["active", "escalated"]}
    })
    
    if not conversation:
        return {
            "found": False,
            "session_id": session_id,
            "messages": []
        }
    
    # Return messages formatted for frontend
    messages = [
        {
            "role": m["role"],
            "content": m["content"],
            "timestamp": m.get("timestamp")
        }
        for m in conversation.get("messages", [])
        if m["role"] in ["user", "assistant"]
    ]
    
    return {
        "found": True,
        "session_id": session_id,
        "conversation_id": conversation["id"],
        "status": conversation["status"],
        "messages": messages,
        "escalated": conversation.get("escalated_to_human", False)
    }


@router.post("/resolve/{session_id}")
async def resolve_conversation(session_id: str):
    """Mark a conversation as resolved"""
    from database import get_database
    db = get_database()
    
    conversation = await db.chatbot_conversations.find_one({
        "session_id": session_id
    })
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    await ConversationService.resolve_conversation(conversation["id"])
    
    return {"message": "Conversation resolved", "session_id": session_id}


# Admin endpoints
@router.get("/admin/stats")
async def get_chatbot_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get chatbot analytics (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    stats = await ConversationService.get_conversation_stats()
    return stats


@router.get("/admin/conversations")
async def get_conversations(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    skip: int = Query(0),
    current_user: dict = Depends(get_current_user)
):
    """Get conversations list (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    conversations = await ConversationService.get_conversations(
        status=status,
        limit=limit,
        skip=skip
    )
    
    return {
        "conversations": [c.model_dump() for c in conversations],
        "count": len(conversations)
    }


@router.get("/admin/conversation/{conversation_id}")
async def get_conversation_detail(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get full conversation details (admin only)"""
    if not current_user.get("is_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    from database import get_database
    db = get_database()
    
    conversation = await db.chatbot_conversations.find_one({
        "id": conversation_id
    })
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return conversation
