"""Event Instrumentation Utilities

Helper functions to emit events from marketplace code.
Keeps analytics emission clean and separated from business logic.
"""
from typing import Optional, Dict, Any
from datetime import datetime

from .services.event_emitter import emit_event_async, EventTypes, ActorType


async def track_user_registered(
    user_id: str,
    username: str,
    category: Optional[str] = None,
    has_lifetime_free_fees: bool = False,
    referrer: Optional[str] = None,
    **kwargs
):
    """Track user registration event"""
    await emit_event_async(
        event_type=EventTypes.USER_REGISTERED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        metadata={
            "category": category,
            "has_lifetime_free_fees": has_lifetime_free_fees,
        },
        **kwargs
    )


async def track_user_login(
    user_id: str,
    username: str,
    **kwargs
):
    """Track user login event"""
    await emit_event_async(
        event_type=EventTypes.USER_LOGGED_IN,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        **kwargs
    )


async def track_listing_created(
    user_id: str,
    username: str,
    listing_id: str,
    price: float,
    category: str,
    condition: str,
    **kwargs
):
    """Track listing creation event"""
    await emit_event_async(
        event_type=EventTypes.LISTING_CREATED,
        actor_type=ActorType.SELLER,
        actor_id=user_id,
        actor_username=username,
        listing_id=listing_id,
        metadata={
            "price": price,
            "category": category,
            "condition": condition,
        },
        **kwargs
    )


async def track_listing_viewed(
    listing_id: str,
    listing_price: float,
    category: str,
    seller_id: str,
    viewer_id: Optional[str] = None,
    viewer_username: Optional[str] = None,
    source: str = "direct",
    **kwargs
):
    """Track listing view event"""
    await emit_event_async(
        event_type=EventTypes.LISTING_VIEWED,
        actor_type=ActorType.BUYER if viewer_id else ActorType.ANONYMOUS,
        actor_id=viewer_id,
        actor_username=viewer_username,
        listing_id=listing_id,
        target_user_id=seller_id,
        metadata={
            "listing_price": listing_price,
            "category": category,
            "source": source,
        },
        **kwargs
    )


async def track_search_performed(
    query: str,
    result_count: int,
    filters: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None,
    username: Optional[str] = None,
    **kwargs
):
    """Track search event"""
    event_type = EventTypes.SEARCH_ZERO_RESULTS if result_count == 0 else EventTypes.SEARCH_PERFORMED
    
    await emit_event_async(
        event_type=event_type,
        actor_type=ActorType.BUYER if user_id else ActorType.ANONYMOUS,
        actor_id=user_id,
        actor_username=username,
        metadata={
            "query": query,
            "result_count": result_count,
            "filters": filters or {},
        },
        **kwargs
    )


async def track_cart_item_added(
    user_id: str,
    username: str,
    listing_id: str,
    listing_price: float,
    quantity: int,
    category: Optional[str] = None,
    from_search: bool = False,
    **kwargs
):
    """Track add to cart event"""
    await emit_event_async(
        event_type=EventTypes.CART_ITEM_ADDED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        listing_id=listing_id,
        metadata={
            "listing_price": listing_price,
            "quantity": quantity,
            "category": category,
            "from_search": from_search,
        },
        **kwargs
    )


async def track_cart_item_removed(
    user_id: str,
    username: str,
    listing_id: str,
    **kwargs
):
    """Track remove from cart event"""
    await emit_event_async(
        event_type=EventTypes.CART_ITEM_REMOVED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        listing_id=listing_id,
        **kwargs
    )


async def track_checkout_started(
    user_id: str,
    username: str,
    cart_total: float,
    item_count: int,
    from_offer: bool = False,
    offer_id: Optional[str] = None,
    **kwargs
):
    """Track checkout started event"""
    await emit_event_async(
        event_type=EventTypes.CHECKOUT_STARTED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        offer_id=offer_id,
        metadata={
            "cart_total": cart_total,
            "item_count": item_count,
            "from_offer": from_offer,
        },
        **kwargs
    )


async def track_purchase_completed(
    user_id: str,
    username: str,
    order_id: str,
    subtotal: float,
    shipping_total: float,
    platform_fee: float,
    processing_fee: float,
    total: float,
    items: list,
    from_offer: bool = False,
    offer_id: Optional[str] = None,
    **kwargs
):
    """Track purchase completed event - critical for revenue tracking"""
    await emit_event_async(
        event_type=EventTypes.PURCHASE_COMPLETED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        order_id=order_id,
        offer_id=offer_id,
        metadata={
            "subtotal": subtotal,
            "shipping_total": shipping_total,
            "platform_fee": platform_fee,
            "processing_fee": processing_fee,
            "total": total,
            "item_count": len(items),
            "items": [{"id": i.get("listing_id"), "price": i.get("listing_price"), "category": i.get("category")} for i in items],
            "from_offer": from_offer,
        },
        **kwargs
    )


async def track_offer_created(
    user_id: str,
    username: str,
    offer_id: str,
    listing_id: str,
    seller_id: str,
    offer_price: float,
    listing_price: float,
    **kwargs
):
    """Track offer creation event"""
    await emit_event_async(
        event_type=EventTypes.OFFER_CREATED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        offer_id=offer_id,
        listing_id=listing_id,
        target_user_id=seller_id,
        metadata={
            "offer_price": offer_price,
            "listing_price": listing_price,
            "discount_percent": round((1 - offer_price / listing_price) * 100, 2) if listing_price > 0 else 0,
        },
        **kwargs
    )


async def track_offer_countered(
    user_id: str,
    username: str,
    offer_id: str,
    listing_id: str,
    counter_price: float,
    previous_price: float,
    **kwargs
):
    """Track offer counter event"""
    await emit_event_async(
        event_type=EventTypes.OFFER_COUNTERED,
        actor_type=ActorType.SELLER,
        actor_id=user_id,
        actor_username=username,
        offer_id=offer_id,
        listing_id=listing_id,
        metadata={
            "counter_price": counter_price,
            "previous_price": previous_price,
        },
        **kwargs
    )


async def track_offer_accepted(
    user_id: str,
    username: str,
    offer_id: str,
    listing_id: str,
    final_price: float,
    original_price: float,
    negotiation_rounds: int = 1,
    **kwargs
):
    """Track offer acceptance event"""
    await emit_event_async(
        event_type=EventTypes.OFFER_ACCEPTED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        offer_id=offer_id,
        listing_id=listing_id,
        metadata={
            "final_price": final_price,
            "original_price": original_price,
            "discount_percent": round((1 - final_price / original_price) * 100, 2) if original_price > 0 else 0,
            "negotiation_rounds": negotiation_rounds,
        },
        **kwargs
    )


async def track_offer_declined(
    user_id: str,
    username: str,
    offer_id: str,
    listing_id: str,
    **kwargs
):
    """Track offer decline event"""
    await emit_event_async(
        event_type=EventTypes.OFFER_DECLINED,
        actor_type=ActorType.SELLER,
        actor_id=user_id,
        actor_username=username,
        offer_id=offer_id,
        listing_id=listing_id,
        **kwargs
    )


async def track_message_sent(
    user_id: str,
    username: str,
    thread_id: str,
    recipient_id: str,
    is_first_message: bool = False,
    **kwargs
):
    """Track message sent event"""
    await emit_event_async(
        event_type=EventTypes.MESSAGE_SENT,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        message_thread_id=thread_id,
        target_user_id=recipient_id,
        metadata={
            "is_first_message": is_first_message,
        },
        **kwargs
    )


async def track_listing_favorited(
    user_id: str,
    username: str,
    listing_id: str,
    **kwargs
):
    """Track listing favorited event"""
    await emit_event_async(
        event_type=EventTypes.LISTING_FAVORITED,
        actor_type=ActorType.BUYER,
        actor_id=user_id,
        actor_username=username,
        listing_id=listing_id,
        **kwargs
    )


async def track_listing_shared(
    user_id: Optional[str],
    username: Optional[str],
    listing_id: str,
    share_platform: str,
    **kwargs
):
    """Track listing shared event"""
    await emit_event_async(
        event_type=EventTypes.LISTING_SHARED,
        actor_type=ActorType.BUYER if user_id else ActorType.ANONYMOUS,
        actor_id=user_id,
        actor_username=username,
        listing_id=listing_id,
        metadata={
            "share_platform": share_platform,
        },
        **kwargs
    )


async def track_user_suspended(
    admin_id: str,
    admin_username: str,
    target_user_id: str,
    reason: Optional[str] = None,
    **kwargs
):
    """Track user suspension event"""
    await emit_event_async(
        event_type=EventTypes.USER_SUSPENDED,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        actor_username=admin_username,
        target_user_id=target_user_id,
        metadata={
            "reason": reason,
        },
        **kwargs
    )


async def track_listing_removed(
    admin_id: str,
    admin_username: str,
    listing_id: str,
    reason: Optional[str] = None,
    **kwargs
):
    """Track listing removal by admin"""
    await emit_event_async(
        event_type=EventTypes.LISTING_REMOVED,
        actor_type=ActorType.ADMIN,
        actor_id=admin_id,
        actor_username=admin_username,
        listing_id=listing_id,
        metadata={
            "reason": reason,
        },
        **kwargs
    )
