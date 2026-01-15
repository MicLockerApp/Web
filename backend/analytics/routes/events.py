"""Analytics Event Ingestion API

Endpoints for receiving analytics events from frontend and backend.
Supports batching and beacon-style fire-and-forget.
"""
from fastapi import APIRouter, HTTPException, status, Depends, Request, BackgroundTasks
from services.auth import get_current_user_optional
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import logging

from ..services.event_emitter import emit_event_async, EventTypes, ActorType
from ..models.events import BaseAnalyticsEvent

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Analytics Events"])


class EventPayload(BaseModel):
    """Single event payload from frontend"""
    event_type: str
    listing_id: Optional[str] = None
    order_id: Optional[str] = None
    offer_id: Optional[str] = None
    message_thread_id: Optional[str] = None
    target_user_id: Optional[str] = None
    session_id: Optional[str] = None
    device_type: Optional[str] = None
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    ga_client_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: Optional[datetime] = None  # Allow client timestamp


class BatchEventPayload(BaseModel):
    """Batch of events from frontend"""
    events: List[EventPayload]
    session_id: Optional[str] = None
    ga_client_id: Optional[str] = None


def get_client_info(request: Request) -> dict:
    """Extract client information from request"""
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "referrer": request.headers.get("referer")
    }


@router.post("/track")
async def track_event(
    payload: EventPayload,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Track a single analytics event
    
    This endpoint is designed for important events where confirmation is needed.
    For fire-and-forget, use the /beacon endpoint.
    """
    client_info = get_client_info(request)
    
    # Determine actor type
    if current_user:
        actor_type = ActorType.BUYER  # Default for authenticated users
    else:
        actor_type = ActorType.ANONYMOUS
    
    event_id = await emit_event_async(
        event_type=payload.event_type,
        actor_type=actor_type,
        actor_id=current_user["id"] if current_user else None,
        actor_username=current_user.get("username") if current_user else None,
        session_id=payload.session_id,
        listing_id=payload.listing_id,
        order_id=payload.order_id,
        offer_id=payload.offer_id,
        message_thread_id=payload.message_thread_id,
        target_user_id=payload.target_user_id,
        ip_address=client_info["ip_address"],
        user_agent=client_info["user_agent"],
        referrer=payload.referrer or client_info["referrer"],
        device_type=payload.device_type,
        utm_source=payload.utm_source,
        utm_medium=payload.utm_medium,
        utm_campaign=payload.utm_campaign,
        ga_client_id=payload.ga_client_id,
        metadata=payload.metadata
    )
    
    return {"status": "ok", "event_id": event_id}


@router.post("/batch")
async def track_batch(
    payload: BatchEventPayload,
    request: Request,
    background_tasks: BackgroundTasks,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """Track a batch of analytics events
    
    Optimized for periodic flushing of accumulated events from frontend.
    """
    if len(payload.events) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 100 events per batch"
        )
    
    client_info = get_client_info(request)
    actor_type = ActorType.BUYER if current_user else ActorType.ANONYMOUS
    
    event_ids = []
    for event in payload.events:
        event_id = await emit_event_async(
            event_type=event.event_type,
            actor_type=actor_type,
            actor_id=current_user["id"] if current_user else None,
            actor_username=current_user.get("username") if current_user else None,
            session_id=event.session_id or payload.session_id,
            listing_id=event.listing_id,
            order_id=event.order_id,
            offer_id=event.offer_id,
            message_thread_id=event.message_thread_id,
            target_user_id=event.target_user_id,
            ip_address=client_info["ip_address"],
            user_agent=client_info["user_agent"],
            referrer=event.referrer or client_info["referrer"],
            device_type=event.device_type,
            utm_source=event.utm_source,
            utm_medium=event.utm_medium,
            utm_campaign=event.utm_campaign,
            ga_client_id=event.ga_client_id or payload.ga_client_id,
            metadata=event.metadata
        )
        event_ids.append(event_id)
    
    return {
        "status": "ok",
        "processed": len(event_ids),
        "event_ids": event_ids
    }


@router.post("/beacon", status_code=status.HTTP_204_NO_CONTENT)
async def beacon_event(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Fire-and-forget event tracking via Beacon API
    
    Accepts raw JSON body for navigator.sendBeacon() compatibility.
    Returns 204 No Content immediately.
    """
    try:
        body = await request.json()
        client_info = get_client_info(request)
        
        # Handle both single event and batch
        events = body.get("events", [body]) if "events" in body or "event_type" in body else []
        
        for event_data in events:
            if "event_type" not in event_data:
                continue
            
            background_tasks.add_task(
                emit_event_async,
                event_type=event_data.get("event_type"),
                actor_type=ActorType.ANONYMOUS,
                session_id=event_data.get("session_id"),
                listing_id=event_data.get("listing_id"),
                ip_address=client_info["ip_address"],
                user_agent=client_info["user_agent"],
                referrer=event_data.get("referrer") or client_info["referrer"],
                device_type=event_data.get("device_type"),
                utm_source=event_data.get("utm_source"),
                utm_medium=event_data.get("utm_medium"),
                utm_campaign=event_data.get("utm_campaign"),
                ga_client_id=event_data.get("ga_client_id"),
                metadata=event_data.get("metadata", {})
            )
    except Exception as e:
        logger.warning(f"Beacon event parsing failed: {e}")
    
    # Always return 204 - beacon doesn't wait for response
    return None
