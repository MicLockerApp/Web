from fastapi import APIRouter, HTTPException, status, Depends, Query
from models.offer import OfferCreate, OfferCounter, OfferInDB, OfferResponse
from services.auth import get_current_user
from database import get_database
from utils.helpers import get_offer_expiration
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
    cursor = db.offers.find(filter_query).skip(skip).limit(limit).sort("created_at", -1)
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
    """Counter an offer (seller only)"""
    db = get_database()
    
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    
    if offer["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the seller can counter this offer"
        )
    
    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot counter this offer"
        )
    
    await db.offers.update_one(
        {"id": offer_id},
        {
            "$set": {
                "counter_price": counter_data.counter_price,
                "counter_message": counter_data.message,
                "status": "countered",
                "expires_at": get_offer_expiration(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Counter offer sent", "counter_price": counter_data.counter_price}

@router.post("/{offer_id}/accept")
async def accept_offer(
    offer_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Accept an offer (seller accepts buyer's offer, or buyer accepts counter)"""
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
    
    if offer["status"] == "pending" and is_seller:
        # Seller accepting buyer's original offer
        final_price = offer["offer_price"]
    elif offer["status"] == "countered" and is_buyer:
        # Buyer accepting seller's counter offer
        final_price = offer["counter_price"]
    elif offer["status"] == "countered" and is_seller:
        # Seller accepting (this means they're confirming the counter)
        final_price = offer["counter_price"]
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot accept this offer in its current state"
        )
    
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
    """Decline an offer"""
    db = get_database()
    
    offer = await db.offers.find_one({"id": offer_id})
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer not found"
        )
    
    if offer["seller_id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the seller can decline offers"
        )
    
    if offer["status"] not in ["pending", "countered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot decline this offer"
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
