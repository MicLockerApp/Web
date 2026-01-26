"""
Map Routes

API endpoints for the Map View feature.
Returns users with their locations for display on Google Maps.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime
import os
import httpx

from database import get_database
from services.auth import get_current_user_optional

router = APIRouter(prefix="/map", tags=["Map"])

GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY", "")


async def geocode_address(address: str) -> Optional[dict]:
    """
    Geocode an address string to lat/lng coordinates using Google Geocoding API.
    Returns {"lat": float, "lng": float} or None if geocoding fails.
    """
    if not address or not GOOGLE_MAPS_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={
                    "address": address,
                    "key": GOOGLE_MAPS_API_KEY
                },
                timeout=10.0
            )
            data = response.json()
            
            if data.get("status") == "OK" and data.get("results"):
                location = data["results"][0]["geometry"]["location"]
                return {"lat": location["lat"], "lng": location["lng"]}
    except Exception as e:
        print(f"Geocoding error for '{address}': {e}")
    
    return None


async def geocode_city(city: str) -> Optional[dict]:
    """
    Get general city center coordinates.
    Used as fallback when user doesn't show specific address.
    """
    if not city:
        return None
    
    # Add slight randomization for city-level locations to prevent exact overlap
    import random
    
    coords = await geocode_address(city)
    if coords:
        # Add small random offset (roughly 0.5-1 mile) to prevent exact stacking
        coords["lat"] += random.uniform(-0.01, 0.01)
        coords["lng"] += random.uniform(-0.01, 0.01)
        coords["is_approximate"] = True
    
    return coords


def build_full_address(address_dict: dict) -> str:
    """Build a full address string from address components."""
    if not address_dict:
        return ""
    
    parts = []
    if address_dict.get("address_line1"):
        parts.append(address_dict["address_line1"])
    if address_dict.get("address_line2"):
        parts.append(address_dict["address_line2"])
    if address_dict.get("city"):
        parts.append(address_dict["city"])
    if address_dict.get("state"):
        parts.append(address_dict["state"])
    if address_dict.get("postal_code"):
        parts.append(address_dict["postal_code"])
    if address_dict.get("country"):
        parts.append(address_dict["country"])
    
    return ", ".join(parts)


@router.get("/users")
async def get_map_users(
    category: Optional[str] = Query(None, description="Filter by category (musician, audio_engineer, etc.)"),
    lat: Optional[float] = Query(None, description="Center latitude for distance filtering"),
    lng: Optional[float] = Query(None, description="Center longitude for distance filtering"),
    radius_miles: Optional[float] = Query(None, description="Radius in miles for distance filtering"),
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Get all users with their locations for the map view.
    
    Location priority:
    1. Physical address (if show_physical_address is true)
    2. Mailing/shipping address (if show_address is true)
    3. General city location (from location field)
    
    Users can be filtered by:
    - Category (profession)
    - Distance from a center point
    """
    db = get_database()
    
    # Build query
    query = {
        "is_active": {"$ne": False},
        "is_suspended": {"$ne": True},
        "is_banned": {"$ne": True}
    }
    
    # Filter by category if provided
    if category:
        query["category"] = category
    
    # Fetch users
    users_cursor = db.users.find(query, {
        "_id": 0,
        "id": 1,
        "username": 1,
        "profile_image": 1,
        "category": 1,
        "sub_categories": 1,
        "genres": 1,
        "genre": 1,
        "location": 1,
        "rating": 1,
        "review_count": 1,
        "is_gold_member": 1,
        "is_founder": 1,
        "show_physical_address": 1,
        "physical_address": 1,
        "show_address": 1,
        "shipping_address": 1,
        "bio": 1,
        # Geocoded coordinates (if stored)
        "map_coordinates": 1,
        "map_coordinates_type": 1,  # "physical", "mailing", "city"
        # Presence status
        "last_activity": 1,
        "presence_status": 1
    })
    
    users = await users_cursor.to_list(length=500)  # Limit to 500 users for performance
    
    map_users = []
    
    for user in users:
        user_data = {
            "id": user.get("id"),
            "username": user.get("username"),
            "profile_image": user.get("profile_image"),
            "category": user.get("category"),
            "sub_categories": user.get("sub_categories", []),
            "genres": user.get("genres") or ([user.get("genre")] if user.get("genre") else []),
            "rating": user.get("rating", 0),
            "review_count": user.get("review_count", 0),
            "is_gold_member": user.get("is_gold_member", False),
            "is_founder": user.get("is_founder", False),
            "bio": (user.get("bio") or "")[:100],  # First 100 chars of bio
            "location_type": None,
            "coordinates": None,
            "display_location": user.get("location", "")
        }
        
        # Determine location based on privacy settings
        coordinates = None
        location_type = None
        
        # Priority 1: Physical address (if showing)
        if user.get("show_physical_address") and user.get("physical_address"):
            address = build_full_address(user["physical_address"])
            if address:
                # Check if we have cached coordinates
                if user.get("map_coordinates") and user.get("map_coordinates_type") == "physical":
                    coordinates = user["map_coordinates"]
                else:
                    coordinates = await geocode_address(address)
                    if coordinates:
                        # Cache the coordinates
                        await db.users.update_one(
                            {"id": user["id"]},
                            {"$set": {
                                "map_coordinates": coordinates,
                                "map_coordinates_type": "physical"
                            }}
                        )
                location_type = "physical"
                user_data["display_location"] = user["physical_address"].get("city", user.get("location", ""))
        
        # Priority 2: Mailing/shipping address (if showing)
        if not coordinates and user.get("show_address") and user.get("shipping_address"):
            address = build_full_address(user["shipping_address"])
            if address:
                if user.get("map_coordinates") and user.get("map_coordinates_type") == "mailing":
                    coordinates = user["map_coordinates"]
                else:
                    coordinates = await geocode_address(address)
                    if coordinates:
                        await db.users.update_one(
                            {"id": user["id"]},
                            {"$set": {
                                "map_coordinates": coordinates,
                                "map_coordinates_type": "mailing"
                            }}
                        )
                location_type = "mailing"
                user_data["display_location"] = user["shipping_address"].get("city", user.get("location", ""))
        
        # Priority 3: General city location (fallback)
        if not coordinates and user.get("location"):
            if user.get("map_coordinates") and user.get("map_coordinates_type") == "city":
                coordinates = user["map_coordinates"]
                coordinates["is_approximate"] = True
            else:
                coordinates = await geocode_city(user["location"])
                if coordinates:
                    await db.users.update_one(
                        {"id": user["id"]},
                        {"$set": {
                            "map_coordinates": {"lat": coordinates["lat"], "lng": coordinates["lng"]},
                            "map_coordinates_type": "city"
                        }}
                    )
            location_type = "city"
        
        # Skip users without coordinates
        if not coordinates:
            continue
        
        user_data["coordinates"] = coordinates
        user_data["location_type"] = location_type
        user_data["is_approximate"] = coordinates.get("is_approximate", False)
        
        # Distance filtering
        if lat is not None and lng is not None and radius_miles is not None:
            # Calculate distance using Haversine formula
            from math import radians, sin, cos, sqrt, atan2
            
            R = 3959  # Earth's radius in miles
            lat1, lon1 = radians(lat), radians(lng)
            lat2, lon2 = radians(coordinates["lat"]), radians(coordinates["lng"])
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            distance = R * c
            
            if distance > radius_miles:
                continue
            
            user_data["distance_miles"] = round(distance, 1)
        
        map_users.append(user_data)
    
    # Sort by distance if filtering by location
    if lat is not None and lng is not None and radius_miles is not None:
        map_users.sort(key=lambda x: x.get("distance_miles", float("inf")))
    
    return {
        "users": map_users,
        "total": len(map_users),
        "filters": {
            "category": category,
            "center": {"lat": lat, "lng": lng} if lat and lng else None,
            "radius_miles": radius_miles
        }
    }


@router.get("/categories")
async def get_map_categories():
    """Get available categories for filtering."""
    return {
        "categories": [
            {"value": "musician", "label": "Musician", "icon": "🎵"},
            {"value": "audio_engineer", "label": "Audio Engineer", "icon": "🎛️"},
            {"value": "producer", "label": "Producer", "icon": "🎹"},
            {"value": "venue", "label": "Venue", "icon": "🏟️"},
            {"value": "studio", "label": "Studio", "icon": "🎙️"},
            {"value": "merchant", "label": "Merchant", "icon": "🛍️"},
            {"value": "comedian", "label": "Comedian", "icon": "🎭"},
            {"value": "actor", "label": "Actor", "icon": "🎬"},
        ]
    }


@router.post("/geocode")
async def geocode_location(
    address: str = Query(..., description="Address to geocode"),
    current_user: dict = Depends(get_current_user_optional)
):
    """
    Geocode an address to coordinates.
    Used for the "search location" feature.
    """
    if not address:
        raise HTTPException(status_code=400, detail="Address is required")
    
    coords = await geocode_address(address)
    if not coords:
        raise HTTPException(status_code=404, detail="Could not geocode address")
    
    return coords
