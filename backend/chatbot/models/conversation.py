"""Conversation Models for AI Chatbot

These models define the structure of conversations stored in MongoDB.
The backend is stateful - it maintains full conversation history.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
import uuid


class ConversationMessage(BaseModel):
    """A single message in a conversation"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = Field(default_factory=dict)  # For storing context, intent, etc.


class Conversation(BaseModel):
    """A complete conversation session"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str  # External session ID (from Crisp or custom widget)
    user_id: Optional[str] = None  # Linked MicLocker user if authenticated
    
    # Conversation state
    messages: List[ConversationMessage] = Field(default_factory=list)
    status: Literal["active", "resolved", "escalated", "abandoned"] = "active"
    
    # Context & Intent
    detected_intent: Optional[str] = None  # e.g., "order_help", "refund_request"
    context: dict = Field(default_factory=dict)  # Business context
    
    # Analytics
    message_count: int = 0
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # Escalation
    escalated_to_human: bool = False
    escalation_reason: Optional[str] = None
    
    # Source tracking
    source: str = "web_widget"  # e.g., "crisp", "web_widget", "api"
    user_agent: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ChatRequest(BaseModel):
    """Request from frontend to send a message"""
    session_id: str
    message: str
    user_id: Optional[str] = None  # If user is logged in
    context: dict = Field(default_factory=dict)  # Page context, etc.
    source: str = "web_widget"


class ChatResponse(BaseModel):
    """Response sent back to frontend"""
    session_id: str
    message: str
    conversation_id: str
    intent: Optional[str] = None
    suggested_actions: List[dict] = Field(default_factory=list)  # Quick reply buttons
    escalate_to_human: bool = False
    metadata: dict = Field(default_factory=dict)


class ConversationSummary(BaseModel):
    """Summary for admin dashboard"""
    id: str
    session_id: str
    user_id: Optional[str] = None
    status: str
    message_count: int
    detected_intent: Optional[str] = None
    started_at: datetime
    last_activity: datetime
    escalated_to_human: bool
    source: str
