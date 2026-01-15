from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.offer import OfferCreate, OfferCounter, OfferInDB, OfferResponse, NegotiationEntry
from services.auth import get_current_user
from database import get_database
from utils.helpers import get_offer_expiration
from analytics.services.event_emitter import emit_event, EventTypes, ActorType
from datetime import datetime
from typing import Optional

router = APIRouter(prefix="/offers", tags=["Offers"])

@router.post("", response_model=OfferResponse)
async def create_offer(
    offer_data: OfferCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new offer on a listing"""
    db = get_database()
    
    # Get listing
    listing = await db.listings.find_one({"id": offer_data.listing_id, "status": "active"})
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or no longer available"
        )
    
    if not listing.get("accepts_offers", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This listing does not accept offers"
        )
    
    if listing["seller_id"] == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot make an offer on your own listing"
        )
    
    # Check for existing pending offer
    existing = await db.offers.find_one({
        "listing_id": offer_data.listing_id,
        "buyer_id": current_user["id"],
        "status": {"$in": ["pending", "countered"]}
    })
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a pending offer on this listing"
        )
    
    # Get primary image
    listing_image = None
    for media in listing.get("media", []):
        if media.get("is_primary"):
            listing_image = media.get("url")
            break
    if not listing_image and listing.get("media"):
        listing_image = listing["media"][0].get("url")
    
    # Create initial negotiation entry
    initial_entry = NegotiationEntry(
        user_id=current_user["id"],
        username=current_user["username"],
        role="buyer",
        price=offer_data.offer_price,
        message=offer_data.message
    )
    
    # Create offer
    offer = OfferInDB(
        listing_id=listing["id"],
        listing_title=listing["title"],
        listing_price=listing["price"],
        listing_image=listing_image,
        buyer_id=current_user["id"],
        buyer_username=current_user["username"],
        seller_id=listing["seller_id"],
        seller_username=listing["seller_username"],
        offer_price=offer_data.offer_price,
        message=offer_data.message,
        negotiation_history=[initial_entry.model_dump()],
        pending_action_from="seller",  # Seller needs to respond
        expires_at=get_offer_expiration()
    )
    
    await db.offers.insert_one(offer.model_dump())
    
    return OfferResponse(**offer.model_dump())

@router.get("", response_model=dict)
async def get_offers(
    type: str = Query("received", regex="^(received|sent)$"),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    """Get offers (received as seller or sent as buyer)"""
    db = get_database()
    
    if type == "received":
        filter_query = {"seller_id": current_user["id"]}
    else:
        filter_query = {"buyer_id": current_user["id"]}
    
    if status:
        filter_query["status"] = status
    
    skip = (page - 1) * limit
    total = await db.offers.count_documents(filter_query)
    cursor = db.offers.find(filter_query).skip(skip).limit(limit).sort("updated_at", -1)
    offers = await cursor.to_list(length=limit)
    
    return {
        "offers": [OfferResponse(**offer) for offer in offers],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }

@router.get("/{offer_id}", response_model=OfferResponse)
async def get_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific offer"""
    db = get_database()
    
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    
    if offer["buyer_id"] != current_user["id"] and offer["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this offer"
        )
    
    return OfferResponse(**offer)

@router.post("/{offer_id}/counter")
async def counter_offer(
    offer_id: str,
    counter_data: OfferCounter,
    current_user: dict = Depends(get_current_user)
):
    """Counter an offer - both buyer and seller can counter back and forth"""
    db = get_database()
    
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    
    is_seller = offer["seller_id"] == current_user["id"]
    is_buyer = offer["buyer_id"] == current_user["id"]
    
    if not (is_seller or is_buyer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to counter this offer"
        )
    
    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot counter this offer - it's no longer active"
        )
    
    # Determine role and check if it's this user's turn
    role = "seller" if is_seller else "buyer"
    pending_from = offer.get("pending_action_from", "seller")
    
    if pending_from != role:
        other_party = "buyer" if role == "seller" else "seller"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Waiting for the {other_party} to respond"
        )
    
    # Create negotiation entry
    counter_entry = NegotiationEntry(
        user_id=current_user["id"],
        username=current_user["username"],
        role=role,
        price=counter_data.counter_price,
        message=counter_data.message
    )
    
    # Get existing history or create new list
    negotiation_history = offer.get("negotiation_history", [])
    negotiation_history.append(counter_entry.model_dump())
    
    # Switch turn to the other party
    next_action_from = "buyer" if is_seller else "seller"
    
    await db.offers.update_one(
        {"id": offer_id},
        {
            "$set": {
                "counter_price": counter_data.counter_price,
                "counter_message": counter_data.message,
                "negotiation_history": negotiation_history,
                "pending_action_from": next_action_from,
                "status": "countered",
                "expires_at": get_offer_expiration(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Counter offer sent",
        "counter_price": counter_data.counter_price,
        "pending_action_from": next_action_from
    }

@router.post("/{offer_id}/accept")
async def accept_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accept an offer - either party can accept the latest price"""
    db = get_database()
    
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    
    is_seller = offer["seller_id"] == current_user["id"]
    is_buyer = offer["buyer_id"] == current_user["id"]
    
    if not (is_seller or is_buyer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot accept this offer - it's no longer active"
        )
    
    role = "seller" if is_seller else "buyer"
    pending_from = offer.get("pending_action_from", "seller")
    
    # User can only accept if it's their turn to respond
    if pending_from != role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only accept when it's your turn to respond"
        )
    
    # Determine the final price - it's the latest offer from the OTHER party
    negotiation_history = offer.get("negotiation_history", [])
    
    if negotiation_history:
        # Find the most recent offer from the other party
        for entry in reversed(negotiation_history):
            if entry.get("role") != role:
                final_price = entry.get("price")
                break
        else:
            # If no counter from other party, use original offer price
            final_price = offer["offer_price"]
    else:
        # Backwards compatibility - use counter_price or offer_price
        if offer["status"] == "countered" and offer.get("counter_price"):
            final_price = offer["counter_price"]
        else:
            final_price = offer["offer_price"]
    
    await db.offers.update_one(
        {"id": offer_id},
        {
            "$set": {
                "status": "accepted",
                "final_price": final_price,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Offer accepted", "final_price": final_price}

@router.post("/{offer_id}/decline")
async def decline_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Decline an offer - either party can decline"""
    db = get_database()
    
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    
    is_seller = offer["seller_id"] == current_user["id"]
    is_buyer = offer["buyer_id"] == current_user["id"]
    
    if not (is_seller or is_buyer):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot decline this offer - it's no longer active"
        )
    
    await db.offers.update_one(
        {"id": offer_id},
        {
            "$set": {
                "status": "declined",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Offer declined"}

@router.post("/{offer_id}/withdraw")
async def withdraw_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Withdraw an offer (buyer only)"""
    db = get_database()
    
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    
    if offer["buyer_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer can withdraw their offer"
        )
    
    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot withdraw this offer"
        )
    
    await db.offers.update_one(
        {"id": offer_id},
        {
            "$set": {
                "status": "withdrawn",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Offer withdrawn"}
