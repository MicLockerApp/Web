from typing import List, Dict, Any
from datetime import datetime, timedelta
import re
from bson import ObjectId

def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB ObjectId and convert to JSON-serializable format"""
    if doc is None:
        return None
    result = {}
    for key, value in doc.items():
        if key == '_id':
            continue  # Skip MongoDB's _id field
        elif isinstance(value, ObjectId):
            result[key] = str(value)
        elif isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = serialize_doc(value)
        elif isinstance(value, list):
            result[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        else:
            result[key] = value
    return result

def serialize_docs(docs: List[dict]) -> List[dict]:
    """Serialize a list of MongoDB documents"""
    return [serialize_doc(doc) for doc in docs]

def sanitize_search_query(query: str) -> str:
    """Sanitize search query to prevent injection"""
    # Remove special MongoDB characters
    return re.sub(r'[\$\{\}\[\]\(\)\*\+\?\^\|\\]', '', query)

def build_listing_search_filter(params: dict) -> dict:
    """Build MongoDB filter from search parameters"""
    filter_query = {"status": "active"}
    
    if params.get("q"):
        sanitized = sanitize_search_query(params["q"])
        filter_query["$text"] = {"$search": sanitized}
    
    if params.get("category"):
        filter_query["category"] = params["category"]
    
    if params.get("condition"):
        filter_query["condition"] = params["condition"]
    
    if params.get("brand"):
        filter_query["brand"] = {"$regex": params["brand"], "$options": "i"}
    
    if params.get("min_price") is not None:
        filter_query["price"] = {"$gte": params["min_price"]}
    
    if params.get("max_price") is not None:
        if "price" in filter_query:
            filter_query["price"]["$lte"] = params["max_price"]
        else:
            filter_query["price"] = {"$lte": params["max_price"]}
    
    if params.get("seller_id"):
        filter_query["seller_id"] = params["seller_id"]
    
    return filter_query

def build_sort_options(sort_by: str, sort_order: str) -> List[tuple]:
    """Build MongoDB sort options"""
    order = -1 if sort_order == "desc" else 1
    
    sort_mapping = {
        "created_at": [("created_at", order)],
        "price": [("price", order)],
        "price_low": [("price", 1)],
        "price_high": [("price", -1)],
        "relevance": [("score", {"$meta": "textScore"})] if sort_by == "relevance" else [("created_at", order)]
    }
    
    return sort_mapping.get(sort_by, [("created_at", order)])

def calculate_platform_fee(amount: float, fee_percent: float = 5.0) -> float:
    """Calculate platform fee"""
    return round(amount * (fee_percent / 100), 2)

def format_currency(amount: float) -> str:
    """Format amount as currency"""
    return f"${amount:,.2f}"

def get_offer_expiration() -> datetime:
    """Get offer expiration time (48 hours from now)"""
    return datetime.utcnow() + timedelta(hours=48)

def paginate_results(items: List[Any], page: int, limit: int) -> Dict[str, Any]:
    """Paginate list results"""
    total = len(items)
    start = (page - 1) * limit
    end = start + limit
    
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }
