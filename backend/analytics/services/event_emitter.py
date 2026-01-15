"""Analytics Event Emitter

This service provides the interface for marketplace code to emit events.
Events are queued for async processing to not block transactions.
"""
import asyncio
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import hashlib

from ..models.events import (
    BaseAnalyticsEvent, EventTypes, ActorType, EventCategory, create_event
)
from database import get_database

logger = logging.getLogger(__name__)

# Re-export EventTypes for convenience
__all__ = ['emit_event', 'emit_event_async', 'EventTypes', 'ActorType']


class EventEmitter:
    """Singleton event emitter service"""
    
    _instance = None
    _event_buffer: list = []
    _buffer_size = 50
    _flush_interval = 5  # seconds
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @staticmethod
    def hash_ip(ip: Optional[str]) -> Optional[str]:
        """Hash IP address for privacy"""
        if not ip:
            return None
        return hashlib.sha256(ip.encode()).hexdigest()[:16]
    
    @staticmethod
    def categorize_event(event_type: str) -> EventCategory:
        """Determine event category from event type"""
        if event_type.startswith("user.") or event_type.startswith("session."):
            return EventCategory.USER_SESSION
        elif event_type.startswith("search.") or event_type.startswith("listing.viewed") or event_type.startswith("category."):
            return EventCategory.SEARCH_DISCOVERY
        elif event_type.startswith("listing.") or event_type.startswith("cart.") or event_type.startswith("checkout.") or event_type.startswith("purchase.") or event_type.startswith("order.") or event_type.startswith("refund.") or event_type.startswith("payment."):
            return EventCategory.COMMERCE
        elif event_type.startswith("offer."):
            return EventCategory.OFFERS
        elif event_type.startswith("message.") or event_type.startswith("conversation."):
            return EventCategory.MESSAGING
        elif event_type.startswith("moderation."):
            return EventCategory.ADMIN_MODERATION
        else:
            return EventCategory.SYSTEM
    
    async def emit(self, event: BaseAnalyticsEvent) -> str:
        """Emit a single event to the analytics store"""
        try:
            db = get_database()
            if db is None:
                logger.warning("Database not available, event dropped")
                return event.event_id
            
            # Add processed timestamp
            event_dict = event.model_dump()
            event_dict['processed_at'] = datetime.utcnow()
            
            # Insert into raw events collection
            await db.analytics_events.insert_one(event_dict)
            logger.debug(f"Event emitted: {event.event_type} ({event.event_id})")
            
            return event.event_id
        except Exception as e:
            logger.error(f"Failed to emit event: {e}")
            return event.event_id
    
    async def emit_batch(self, events: list) -> int:
        """Emit multiple events in a batch"""
        if not events:
            return 0
        
        try:
            db = get_database()
            if db is None:
                logger.warning("Database not available, events dropped")
                return 0
            
            now = datetime.utcnow()
            event_dicts = []
            for event in events:
                event_dict = event.model_dump()
                event_dict['processed_at'] = now
                event_dicts.append(event_dict)
            
            result = await db.analytics_events.insert_many(event_dicts)
            logger.info(f"Batch emitted {len(result.inserted_ids)} events")
            return len(result.inserted_ids)
        except Exception as e:
            logger.error(f"Failed to emit batch: {e}")
            return 0


# Global emitter instance
_emitter = EventEmitter()


async def emit_event_async(
    event_type: str,
    actor_type: ActorType = ActorType.ANONYMOUS,
    actor_id: Optional[str] = None,
    actor_username: Optional[str] = None,
    session_id: Optional[str] = None,
    listing_id: Optional[str] = None,
    order_id: Optional[str] = None,
    offer_id: Optional[str] = None,
    message_thread_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    referrer: Optional[str] = None,
    device_type: Optional[str] = None,
    utm_source: Optional[str] = None,
    utm_medium: Optional[str] = None,
    utm_campaign: Optional[str] = None,
    ga_client_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    **extra_metadata
) -> str:
    """Async function to emit an analytics event
    
    Args:
        event_type: Event type from EventTypes constants
        actor_type: Type of actor (buyer, seller, admin, system, anonymous)
        actor_id: User ID if authenticated
        ... other fields ...
        metadata: Structured metadata payload
        **extra_metadata: Additional metadata fields merged into metadata
    
    Returns:
        event_id: The unique ID of the emitted event
    """
    
    # Merge metadata
    final_metadata = metadata or {}
    final_metadata.update(extra_metadata)
    
    event = BaseAnalyticsEvent(
        event_type=event_type,
        event_category=_emitter.categorize_event(event_type),
        actor_type=actor_type,
        actor_id=actor_id,
        actor_username=actor_username,
        session_id=session_id,
        listing_id=listing_id,
        order_id=order_id,
        offer_id=offer_id,
        message_thread_id=message_thread_id,
        target_user_id=target_user_id,
        ip_hash=_emitter.hash_ip(ip_address),
        user_agent=user_agent,
        referrer=referrer,
        device_type=device_type,
        utm_source=utm_source,
        utm_medium=utm_medium,
        utm_campaign=utm_campaign,
        ga_client_id=ga_client_id,
        metadata=final_metadata
    )
    
    return await _emitter.emit(event)


def emit_event(
    event_type: str,
    **kwargs
) -> None:
    """Fire-and-forget event emission (non-blocking)
    
    This creates a background task to emit the event without blocking.
    Use this in transactional code where you don't need confirmation.
    """
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # Schedule as background task
            asyncio.create_task(emit_event_async(event_type, **kwargs))
        else:
            # Run synchronously if no loop
            loop.run_until_complete(emit_event_async(event_type, **kwargs))
    except RuntimeError:
        # No event loop, create one
        asyncio.run(emit_event_async(event_type, **kwargs))
