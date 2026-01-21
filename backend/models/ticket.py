"""Support Ticket Model

Tickets for customer support requests sent to staff.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
import uuid


# Ticket categories/scenarios
TICKET_CATEGORIES = [
    "Order Issue",
    "Payment Problem",
    "Refund Request",
    "Shipping Issue",
    "Item Not As Described",
    "Account Problem",
    "Listing Help",
    "Technical Issue",
    "Report a User",
    "Feedback/Suggestion",
    "Other"
]

TICKET_PRIORITIES = ["low", "medium", "high", "urgent"]
TICKET_STATUSES = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"]


class TicketAttachment(BaseModel):
    """File attachment for a ticket"""
    url: str
    filename: str
    type: str


class TicketCreate(BaseModel):
    """Request to create a new support ticket"""
    category: str
    subject: str
    message: str
    order_id: Optional[str] = None  # If related to a specific order
    listing_id: Optional[str] = None  # If related to a specific listing
    attachments: Optional[List[TicketAttachment]] = None  # Attached files


class TicketReply(BaseModel):
    """A reply to a ticket"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_type: Literal["customer", "staff"]
    sender_id: Optional[str] = None
    sender_name: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TicketInDB(BaseModel):
    """Support ticket as stored in database"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str  # Human-readable ticket number like "TKT-00001"
    
    # Customer info
    user_id: Optional[str] = None  # If logged in
    customer_name: str
    customer_email: str
    
    # Ticket details
    category: str
    subject: str
    message: str
    
    # Related entities
    order_id: Optional[str] = None
    listing_id: Optional[str] = None
    attachments: Optional[List[dict]] = None  # Attached files
    
    # Status tracking
    status: str = "open"
    priority: str = "medium"
    
    # Assignment
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    
    # Replies/conversation
    replies: List[TicketReply] = Field(default_factory=list)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # Metadata
    source: str = "help_center"  # help_center, chatbot, email
    user_agent: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class TicketResponse(BaseModel):
    """Ticket response for API"""
    id: str
    ticket_number: str
    customer_name: str
    customer_email: str
    category: str
    subject: str
    message: str
    status: str
    priority: str
    created_at: datetime
    updated_at: datetime
    reply_count: int = 0


class TicketStatusUpdate(BaseModel):
    """Update ticket status"""
    status: str
    priority: Optional[str] = None


class TicketReplyCreate(BaseModel):
    """Create a reply to a ticket"""
    message: str
