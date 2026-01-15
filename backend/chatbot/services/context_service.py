"""Context Service - Business Rules & Knowledge Base

This service provides the AI with MicLocker-specific knowledge and business rules.
The system prompt and context are managed here, separate from the LLM calls.
"""
from typing import Optional, Dict, Any
from database import get_database
import logging

logger = logging.getLogger(__name__)


class ContextService:
    """Manages business context and knowledge for the AI"""
    
    # MicLocker System Prompt - The AI's personality and knowledge
    SYSTEM_PROMPT = """You are MicLocker Support, a friendly and knowledgeable AI assistant for MicLocker - a marketplace where musicians, audio engineers, studios, and venues buy, sell, and trade musical equipment.

## Your Personality
- Friendly, helpful, and professional
- Knowledgeable about musical equipment and the music industry
- Patient and understanding with customer concerns
- You use music-related language naturally ("Let's jam on this problem", "Sounds good!", etc.)

## Key Business Information

### About MicLocker
- MicLocker is a peer-to-peer marketplace for musical equipment
- Sellers list their gear, buyers purchase directly from sellers
- Platform fee: 3% on completed sales
- Payment processing fee: 3.19% + $0.49 per transaction

### User Categories
- Musicians
- Audio Engineers  
- Recording Studios
- Venues
- Merchants

### Key Features
- Buy It Now purchases
- Make an Offer (negotiate prices)
- Shopping cart for multiple items
- User-to-user messaging
- Seller ratings and reviews
- Favorites/watchlist

### Support Hours
Live chat support is available:
- Monday - Friday: 3:30 a.m. - 9 p.m. CT
- Saturday - Sunday: 8:30 a.m. - 4:30 p.m. CT

### Common Policies

**Returns:**
- Buyers can request returns within 7 days of delivery
- Item must be in original condition
- Seller pays return shipping if item not as described
- Buyer pays return shipping for change of mind

**Shipping:**
- Sellers set their own shipping rates
- Most items ship within 1-3 business days
- Tracking is provided for all shipments

**Payments:**
- We accept major credit cards and PayPal
- Sellers receive payment after buyer confirms receipt
- Disputes are handled by our support team

**Safety:**
- Keep all communication on MicLocker
- Never share personal payment information in messages
- Report suspicious listings or users

## How to Help Users

1. **Order Issues**: Ask for order ID, check status, explain next steps
2. **Refund Requests**: Explain the return policy, guide them through the process
3. **Account Help**: Guide them to profile settings, password reset
4. **Seller Questions**: Explain fees, listing process, payout timing
5. **Technical Issues**: Collect details, offer workarounds, escalate if needed

## Escalation Rules
Escalate to a human agent when:
- User explicitly asks to speak to a human
- Complex disputes involving money
- Suspected fraud or scams
- You cannot resolve the issue after 3 attempts
- User is frustrated or upset

## Response Guidelines
- Keep responses concise but helpful (2-4 sentences usually)
- Ask clarifying questions when needed
- Provide specific next steps
- Offer quick reply options when appropriate
- Never make up information - say "I'll need to check on that" if unsure"""

    @staticmethod
    def get_system_prompt() -> str:
        """Get the base system prompt"""
        return ContextService.SYSTEM_PROMPT
    
    @staticmethod
    async def get_user_context(user_id: Optional[str]) -> Dict[str, Any]:
        """Get context about a specific user if they're logged in"""
        if not user_id:
            return {"is_authenticated": False}
        
        try:
            db = get_database()
            user = await db.users.find_one({"id": user_id})
            
            if not user:
                return {"is_authenticated": False}
            
            # Get user's recent orders
            recent_orders = await db.orders.find(
                {"buyer_id": user_id}
            ).sort("created_at", -1).limit(5).to_list(length=5)
            
            # Get user's active listings (if seller)
            active_listings = await db.listings.find(
                {"seller_id": user_id, "status": "active"}
            ).limit(10).to_list(length=10)
            
            return {
                "is_authenticated": True,
                "username": user.get("username"),
                "category": user.get("category"),
                "is_seller": len(active_listings) > 0,
                "recent_order_count": len(recent_orders),
                "recent_orders": [
                    {
                        "id": o["id"],
                        "status": o.get("status"),
                        "total": o.get("total"),
                        "created_at": o.get("created_at").isoformat() if o.get("created_at") else None
                    }
                    for o in recent_orders
                ],
                "active_listing_count": len(active_listings)
            }
        except Exception as e:
            logger.error(f"Error getting user context: {e}")
            return {"is_authenticated": False, "error": str(e)}
    
    @staticmethod
    async def get_order_context(order_id: str) -> Dict[str, Any]:
        """Get detailed context about a specific order"""
        try:
            db = get_database()
            order = await db.orders.find_one({"id": order_id})
            
            if not order:
                return {"found": False}
            
            return {
                "found": True,
                "id": order["id"],
                "status": order.get("status"),
                "total": order.get("total"),
                "items": order.get("items", []),
                "shipping_address": order.get("shipping_address"),
                "created_at": order.get("created_at").isoformat() if order.get("created_at") else None,
                "tracking_number": order.get("tracking_number")
            }
        except Exception as e:
            logger.error(f"Error getting order context: {e}")
            return {"found": False, "error": str(e)}
    
    @staticmethod
    def detect_intent(message: str) -> str:
        """Simple intent detection based on keywords"""
        message_lower = message.lower()
        
        # Order-related
        if any(word in message_lower for word in ["order", "tracking", "shipped", "delivery", "where is my"]):
            return "order_inquiry"
        
        # Refund-related
        if any(word in message_lower for word in ["refund", "return", "money back", "cancel order"]):
            return "refund_request"
        
        # Account-related
        if any(word in message_lower for word in ["password", "login", "account", "profile", "sign in", "email"]):
            return "account_help"
        
        # Seller-related
        if any(word in message_lower for word in ["sell", "listing", "payout", "fees", "create listing"]):
            return "seller_support"
        
        # Payment-related
        if any(word in message_lower for word in ["payment", "charge", "credit card", "paypal", "invoice"]):
            return "payment_issue"
        
        # Escalation
        if any(phrase in message_lower for phrase in ["speak to human", "talk to person", "real person", "human agent", "customer service"]):
            return "escalation_request"
        
        # Greeting
        if any(word in message_lower for word in ["hello", "hi", "hey", "good morning", "good afternoon"]):
            return "greeting"
        
        return "general_inquiry"
    
    @staticmethod
    def get_suggested_actions(intent: str) -> list:
        """Get suggested quick reply actions based on intent"""
        actions = {
            "greeting": [
                {"label": "Track my order", "value": "I want to track my order"},
                {"label": "Return an item", "value": "I need to return an item"},
                {"label": "Selling help", "value": "I need help selling my gear"}
            ],
            "order_inquiry": [
                {"label": "Enter order ID", "value": "My order ID is "},
                {"label": "View my orders", "value": "Show me my recent orders"},
                {"label": "Contact seller", "value": "I want to contact the seller"}
            ],
            "refund_request": [
                {"label": "Item not as described", "value": "The item is not as described"},
                {"label": "Changed my mind", "value": "I changed my mind about the purchase"},
                {"label": "Item damaged", "value": "The item arrived damaged"}
            ],
            "seller_support": [
                {"label": "Create a listing", "value": "How do I create a listing?"},
                {"label": "Fees info", "value": "What are the seller fees?"},
                {"label": "Payout status", "value": "When will I get paid?"}
            ],
            "escalation_request": [
                {"label": "Confirm escalation", "value": "Yes, please connect me with a human agent"}
            ]
        }
        return actions.get(intent, [])
