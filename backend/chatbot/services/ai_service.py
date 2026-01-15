"""AI Service - LLM Integration

This service handles all LLM interactions.
It's isolated so the LLM provider can be changed without affecting other code.
"""
import os
from typing import List, Optional
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from .context_service import ContextService
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# LLM Configuration
LLM_API_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
LLM_PROVIDER = "openai"
LLM_MODEL = "gpt-4o-mini"  # Cost-effective for support chat


class AIService:
    """Handles LLM interactions for the chatbot"""
    
    # Cache for chat instances (keyed by conversation_id)
    _chat_instances: dict = {}
    
    @classmethod
    def get_chat_instance(cls, conversation_id: str, system_message: str) -> LlmChat:
        """Get or create a chat instance for a conversation"""
        if conversation_id not in cls._chat_instances:
            chat = LlmChat(
                api_key=LLM_API_KEY,
                session_id=conversation_id,
                system_message=system_message
            )
            chat.with_model(LLM_PROVIDER, LLM_MODEL)
            cls._chat_instances[conversation_id] = chat
        
        return cls._chat_instances[conversation_id]
    
    @classmethod
    def clear_chat_instance(cls, conversation_id: str):
        """Clear chat instance when conversation ends"""
        if conversation_id in cls._chat_instances:
            del cls._chat_instances[conversation_id]
    
    @classmethod
    async def generate_response(
        cls,
        conversation_id: str,
        user_message: str,
        conversation_history: List[dict],
        user_context: dict = None,
        intent: str = None
    ) -> str:
        """Generate AI response using LLM"""
        
        # Build enhanced system prompt with context
        system_prompt = ContextService.get_system_prompt()
        
        # Add user context if available
        if user_context and user_context.get("is_authenticated"):
            system_prompt += f"\n\n## Current User Context\n"
            system_prompt += f"- Username: {user_context.get('username')}\n"
            system_prompt += f"- Category: {user_context.get('category')}\n"
            system_prompt += f"- Is Seller: {user_context.get('is_seller')}\n"
            system_prompt += f"- Recent Orders: {user_context.get('recent_order_count')}\n"
            
            if user_context.get('recent_orders'):
                system_prompt += "\nRecent Order Details:\n"
                for order in user_context['recent_orders'][:3]:
                    system_prompt += f"- Order {order['id'][:8]}...: {order['status']}, ${order['total']}\n"
        
        # Add intent context
        if intent:
            system_prompt += f"\n## Detected Intent: {intent}\n"
            system_prompt += "Focus your response on addressing this specific concern.\n"
        
        try:
            # Create fresh chat instance with full context
            chat = LlmChat(
                api_key=LLM_API_KEY,
                session_id=conversation_id,
                system_message=system_prompt
            )
            chat.with_model(LLM_PROVIDER, LLM_MODEL)
            
            # Add conversation history to maintain context
            for msg in conversation_history:
                if msg["role"] == "user":
                    await chat.send_message(UserMessage(text=msg["content"]))
                # Note: Assistant messages are automatically tracked by the library
            
            # Generate response for current message
            user_msg = UserMessage(text=user_message)
            response = await chat.send_message(user_msg)
            
            logger.info(f"Generated response for conversation {conversation_id}")
            return response
            
        except Exception as e:
            logger.error(f"Error generating AI response: {e}")
            # Fallback response
            return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or you can contact our support team directly at support@miclocker.com."
    
    @classmethod
    async def should_escalate(cls, conversation_history: List[dict], current_message: str) -> tuple[bool, str]:
        """Determine if conversation should be escalated to human"""
        
        # Check for explicit escalation request
        escalation_phrases = [
            "speak to human", "talk to person", "real person", 
            "human agent", "customer service", "speak to someone",
            "talk to a real", "human please", "agent please"
        ]
        
        if any(phrase in current_message.lower() for phrase in escalation_phrases):
            return True, "User requested human agent"
        
        # Check for frustrated user (multiple messages without resolution)
        if len(conversation_history) >= 6:
            # Check if similar questions are being repeated
            user_messages = [m["content"].lower() for m in conversation_history if m["role"] == "user"]
            if len(user_messages) >= 3:
                # Simple check: if user keeps asking similar things
                last_three = user_messages[-3:]
                common_words = set(last_three[0].split()) & set(last_three[1].split()) & set(last_three[2].split())
                if len(common_words) > 3:  # More than 3 common words
                    return True, "User appears stuck on same issue"
        
        # Check for negative sentiment indicators
        frustration_indicators = [
            "this is ridiculous", "waste of time", "useless",
            "doesn't help", "not helpful", "frustrated",
            "angry", "terrible", "worst", "scam"
        ]
        
        if any(phrase in current_message.lower() for phrase in frustration_indicators):
            return True, "User expressing frustration"
        
        return False, ""
