# MicLocker API Documentation

## Base URL
```
http://localhost:8001/api
```

## Interactive Documentation
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Users](#2-users)
3. [Listings](#3-listings)
4. [Cart](#4-cart)
5. [Orders](#5-orders)
6. [Offers](#6-offers)
7. [Messages](#7-messages)
8. [Reviews](#8-reviews)
9. [Search](#9-search)
10. [Files](#10-files)
11. [Admin](#11-admin)
12. [Analytics](#12-analytics)
14. [Error Handling](#error-handling)

---

## 1. Authentication

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "is_admin": false,
  "has_lifetime_free_fees": true,
  "created_at": "2024-01-15T00:00:00Z"
}
```

**Notes:**
- First 100 users receive lifetime 0% platform fees
- First user automatically becomes admin

---

### POST /api/auth/login
Authenticate and receive JWT token.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| username | string | Yes | Username or email |
| password | string | Yes | User password |

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials

---

### GET /api/auth/me
Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "category": "musician",
  "profile_image": "url",
  "bio": "string",
  "rating": 4.8,
  "review_count": 25,
  "is_admin": false,
  "has_lifetime_free_fees": true
}
```

---

### PUT /api/auth/profile/complete
Complete user profile with category-specific information.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "category": "musician",
  "genres": ["rock", "jazz"],
  "instruments": ["Electric Guitar", "Bass Electric"],
  "bio": "Professional musician...",
  "location": "Nashville, TN"
}
```

**Category Options:**
- `musician` - Requires genres, instruments
- `audio_engineer` - Requires specializations
- `recording_studio` - Requires offerings
- `venue` - Requires venue_name, capacity
- `merchant` - No additional requirements

---

### POST /api/auth/forgot-password
Initiate password reset flow.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If an account exists, a reset code has been sent"
}
```

---

### POST /api/auth/verify-reset-code
Verify password reset code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "valid": true
}
```

---

### POST /api/auth/reset-password
Reset password with verified code.

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "newpassword123"
}
```

---

## 2. Users

### GET /api/users/profile/{user_id}
Get public profile of a user.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "username": "string",
  "profile_image": "url",
  "category": "musician",
  "bio": "string",
  "location": "string",
  "rating": 4.8,
  "review_count": 25,
  "instagram": "@handle",
  "has_lifetime_free_fees": true
}
```

**Notes:**
- Email, phone, and address fields respect user privacy settings
- Social media links shown only if `show_social` is true

---

### PUT /api/users/profile
Update current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "bio": "Updated bio",
  "location": "New York, NY",
  "instagram": "@myhandle",
  "show_email": false,
  "show_phone": false,
  "show_address": false,
  "show_social": true
}
```

---

### POST /api/users/favorites/{listing_id}
Add a listing to favorites.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Added to favorites",
  "listing_id": "uuid"
}
```

---

### DELETE /api/users/favorites/{listing_id}
Remove a listing from favorites.

---

### GET /api/users/favorites
Get all favorited listings.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "listings": [
    {
      "id": "uuid",
      "title": "Fender Telecaster",
      "price": 1299.00,
      "images": ["url"]
    }
  ],
  "count": 5
}
```

---

### GET /api/users/search
Search for users by username.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| limit | int | No | Max results (default: 20) |

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** User search requires authentication.

---

## 3. Listings

### GET /api/listings/categories
Get available categories and conditions.

**Response:** `200 OK`
```json
{
  "categories": [
    "Guitars", "Bass", "Keyboards & Synths", "Drums & Percussion",
    "Pro Audio", "Recording Equipment", "DJ Equipment", "Microphones",
    "Amplifiers", "Effects Pedals", "Studio Furniture", "Accessories", "Other"
  ],
  "conditions": [
    "Brand New", "Mint", "Excellent", "Very Good", "Good", "Fair", "Poor"
  ]
}
```

---

### POST /api/listings
Create a new listing.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Fender American Telecaster",
  "description": "2023 model in butterscotch blonde...",
  "price": 1499.00,
  "category": "Guitars",
  "condition": "Excellent",
  "brand": "Fender",
  "model": "American Professional II Telecaster",
  "year": 2023,
  "quantity": 1,
  "accepts_offers": true,
  "shipping": {
    "price": 50.00,
    "free_shipping": false
  },
  "media": [
    {
      "url": "https://...",
      "type": "image",
      "is_primary": true
    }
  ]
}
```

**Response:** `201 Created`

---

### GET /api/listings
Search and filter listings.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | No | Search query |
| category | string | No | Filter by category |
| condition | string | No | Filter by condition |
| brand | string | No | Filter by brand |
| min_price | float | No | Minimum price |
| max_price | float | No | Maximum price |
| seller_id | string | No | Filter by seller |
| sort_by | string | No | Sort field (default: created_at) |
| sort_order | string | No | asc or desc (default: desc) |
| page | int | No | Page number (default: 1) |
| limit | int | No | Items per page (default: 20, max: 50) |

**Response:** `200 OK`
```json
{
  "listings": [...],
  "total": 150,
  "pages": 8,
  "page": 1
}
```

---

### GET /api/listings/{listing_id}
Get a single listing.

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "title": "Fender Telecaster",
  "description": "...",
  "price": 1499.00,
  "category": "Guitars",
  "condition": "Excellent",
  "brand": "Fender",
  "model": "Telecaster",
  "seller_id": "uuid",
  "seller_username": "guitarshop",
  "seller_rating": 4.9,
  "view_count": 125,
  "accepts_offers": true,
  "media": [...],
  "shipping": {...},
  "created_at": "2024-01-15T00:00:00Z"
}
```

**Note:** Viewing a listing increments view_count (except for seller).

---

### PUT /api/listings/{listing_id}
Update a listing.

**Headers:**
```
Authorization: Bearer <token>
```

**Note:** Only the seller can update their listing.

---

### DELETE /api/listings/{listing_id}
Delete a listing.

**Headers:**
```
Authorization: Bearer <token>
```

---

### GET /api/listings/stats
Get marketplace statistics.

**Response:** `200 OK`
```json
{
  "active_listings": 150,
  "total_listings": 500,
  "user_count": 85,
  "promo_active": true,
  "spots_remaining": 15
}
```

---

## 4. Cart

### GET /api/cart
Get current user's cart.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "uuid",
      "listing_id": "uuid",
      "listing_title": "Fender Telecaster",
      "listing_price": 1499.00,
      "listing_image": "url",
      "quantity": 1,
      "shipping_cost": 50.00,
      "seller_id": "uuid",
      "seller_username": "guitarshop"
    }
  ],
  "subtotal": 1499.00,
  "shipping_total": 50.00,
  "total": 1549.00,
  "item_count": 1
}
```

---

### POST /api/cart/items
Add item to cart.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "listing_id": "uuid",
  "quantity": 1
}
```

**Error Responses:**
- `404 Not Found` - Listing not found or unavailable
- `400 Bad Request` - Cannot add own listing / Insufficient quantity

---

### PUT /api/cart/items/{item_id}
Update cart item quantity.

**Request Body:**
```json
{
  "quantity": 2
}
```

---

### DELETE /api/cart/items/{item_id}
Remove item from cart.

---

### DELETE /api/cart
Clear entire cart.

---

## 5. Orders

### POST /api/orders
Create a new order (checkout).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "shipping_address": {
    "full_name": "John Doe",
    "address_line1": "123 Main St",
    "address_line2": "Apt 4B",
    "city": "Nashville",
    "state": "TN",
    "postal_code": "37201",
    "country": "US",
    "phone": "555-1234"
  },
  "payment_method": "credit_card",
  "offer_id": null
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "status": "pending",
  "items": [...],
  "subtotal": 1499.00,
  "shipping_total": 50.00,
  "platform_fee": 44.97,
  "payment_processing_fee": 49.85,
  "total": 1643.82,
  "created_at": "2024-01-15T00:00:00Z"
}
```

**Notes:**
- Can checkout from cart or from accepted offer
- Users with `has_lifetime_free_fees` get 0% platform fee
- Platform fee: 3% of subtotal
- Payment processing: 3.19% + $0.49

---

### GET /api/orders
Get user's orders.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | "buyer" or "seller" |
| status | string | No | Filter by status |
| page | int | No | Page number |
| limit | int | No | Items per page |

---

### GET /api/orders/{order_id}
Get order details.

---

### PUT /api/orders/{order_id}/status
Update order status (seller only).

**Request Body:**
```json
{
  "status": "shipped",
  "tracking_number": "1Z999AA10123456784"
}
```

**Status Flow:**
`pending` → `paid` → `shipped` → `delivered` → `completed`

---

## 6. Offers

### POST /api/offers
Create a new offer on a listing.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "listing_id": "uuid",
  "offer_price": 1200.00,
  "message": "Would you consider this price?"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "listing_id": "uuid",
  "listing_title": "Fender Telecaster",
  "listing_price": 1499.00,
  "offer_price": 1200.00,
  "status": "pending",
  "pending_action_from": "seller",
  "expires_at": "2024-01-18T00:00:00Z",
  "negotiation_history": [...]
}
```

---

### GET /api/offers
Get user's offers.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| role | string | No | "buyer" or "seller" |
| status | string | No | pending, countered, accepted, declined, withdrawn, expired |

---

### POST /api/offers/{offer_id}/counter
Counter an offer.

**Request Body:**
```json
{
  "counter_price": 1350.00,
  "message": "How about meeting in the middle?"
}
```

**Notes:**
- Both buyer and seller can counter
- Unlimited back-and-forth negotiations
- Each counter extends expiration by 3 days

---

### POST /api/offers/{offer_id}/accept
Accept an offer.

**Response:** `200 OK`
```json
{
  "message": "Offer accepted",
  "final_price": 1350.00
}
```

---

### POST /api/offers/{offer_id}/decline
Decline an offer.

---

### POST /api/offers/{offer_id}/withdraw
Withdraw an offer (buyer only).

---

## 7. Messages

### POST /api/messages
Send a message.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "recipient_id": "uuid",
  "content": "Hi, I'm interested in your listing!",
  "listing_id": "uuid"
}
```

**Notes:**
- Rate limited to 20 messages per minute
- `listing_id` is optional, provides context

---

### GET /api/messages/threads
Get user's message threads.

**Response:** `200 OK`
```json
{
  "threads": [
    {
      "id": "uuid",
      "participants": ["user1_id", "user2_id"],
      "other_user_id": "uuid",
      "other_user_name": "guitarshop",
      "other_user_avatar": "url",
      "last_message": "Thanks for your interest!",
      "last_message_at": "2024-01-15T10:30:00Z",
      "unread_count": 2
    }
  ]
}
```

---

### GET /api/messages/threads/{thread_id}
Get messages in a thread.

**Response:** `200 OK`
```json
{
  "thread": {...},
  "messages": [
    {
      "id": "uuid",
      "sender_id": "uuid",
      "sender_username": "buyer123",
      "content": "Is this still available?",
      "created_at": "2024-01-15T10:00:00Z",
      "read_at": "2024-01-15T10:05:00Z"
    }
  ]
}
```

---

### POST /api/messages/threads/{thread_id}/read
Mark thread as read.

---

## 8. Reviews

### POST /api/reviews
Create a review for a completed order.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "order_id": "uuid",
  "rating": 5,
  "comment": "Great seller, fast shipping!"
}
```

**Notes:**
- Only buyers can review
- Only completed/delivered orders can be reviewed
- One review per order

---

### GET /api/reviews/seller/{seller_id}
Get reviews for a seller.

**Response:** `200 OK`
```json
{
  "reviews": [...],
  "total": 25,
  "average_rating": 4.8,
  "rating_distribution": {
    "1": 0,
    "2": 1,
    "3": 2,
    "4": 5,
    "5": 17
  }
}
```

---

## 9. Search

### GET /api/search/global
Global search across listings and users.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| limit | int | No | Max results (default: 5, max: 20) |

**Response:** `200 OK`
```json
{
  "listings": [
    {
      "id": "uuid",
      "title": "Fender Telecaster",
      "price": 1499.00,
      "images": ["url"]
    }
  ],
  "users": [
    {
      "id": "uuid",
      "username": "fenderplayer",
      "profile_image": "url",
      "category": "musician"
    }
  ],
  "query": "fender",
  "authenticated": true
}
```

**Notes:**
- User search results only returned for authenticated users
- Used for search-as-you-type functionality

---

## 10. Files

### POST /api/files/upload
Upload a file.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file_type | string | Yes | "image", "video", or "profile" |

**Form Data:**
| Field | Type | Description |
|-------|------|-------------|
| file | File | The file to upload |

**Response:** `200 OK`
```json
{
  "url": "https://...",
  "file_key": "images/user123/filename.jpg",
  "file_type": "image",
  "size": 245678
}
```

**Limits:**
- Images: 10MB max, JPEG/PNG/GIF/WebP
- Videos: 100MB max, MP4/QuickTime/WebM

---

### GET /api/files/{file_path}
Serve a file.

**Notes:**
- If S3 is configured, redirects to presigned URL
- Otherwise serves from local storage

---

## 11. Admin

### GET /api/admin/analytics
Get platform analytics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "total_gmv": 150000.00,
  "total_fees_collected": 4500.00,
  "total_processing_fees_collected": 5250.00,
  "active_listings": 150,
  "total_users": 500,
  "orders_by_status": {
    "pending": 10,
    "paid": 25,
    "shipped": 15,
    "delivered": 100,
    "completed": 350
  },
  "recent_orders": 45,
  "recent_signups": 20
}
```

**Note:** Admin access required.

---

### GET /api/admin/users
Get all users (admin only).

---

### GET /api/admin/orders
Get all orders (admin only).

---

## 12. Analytics

### GET /api/analytics/realtime
Get real-time metrics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "computed_at": "2024-01-15T10:30:00Z",
  "orders_today": 5,
  "gmv_today": 2500.00,
  "new_users_today": 3,
  "new_listings_today": 8,
  "orders_delta_pct": 25.0,
  "gmv_delta_pct": 15.0,
  "users_delta_pct": 50.0
}
```

---

### GET /api/analytics/revenue
Get revenue summary.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| start_date | string | No | YYYY-MM-DD |
| end_date | string | No | YYYY-MM-DD |

---

### GET /api/analytics/offer-funnel
Get offer conversion funnel.

---

### GET /api/analytics/search-funnel
Get search-to-purchase funnel.

---

### GET /api/analytics/marketplace-health
Get marketplace health metrics.

---

### GET /api/analytics/trust-safety
Get trust & safety metrics.

---

### GET /api/analytics/search-terms
Get top search terms.

---

### POST /api/events/batch
Submit batch of frontend analytics events.

**Request Body:**
```json
{
  "events": [
    {
      "event_type": "listing.viewed",
      "timestamp": "2024-01-15T10:30:00Z",
      "data": {
        "listing_id": "uuid",
        "price": 1499.00
      }
    }
  ]
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes
| Code | Meaning |
|------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 413 | Payload Too Large - File size exceeded |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Validation Error Response
```json
{
  "detail": [
    {
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "type": "value_error.email"
    }
  ]
}
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| POST /api/messages | 20 per minute |
| POST /api/auth/login | 5 per minute |
| POST /api/auth/forgot-password | 3 per minute |

---

## Authentication

Most endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Tokens expire after 7 days (10080 minutes) by default.

---

## Pagination

List endpoints support pagination:

| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| page | int | 1 | - |
| limit | int | 20 | 50 |

Response includes:
```json
{
  "items": [...],
  "total": 150,
  "pages": 8,
  "page": 1
}
```
