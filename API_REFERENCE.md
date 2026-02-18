# MicLocker API Reference - Detailed Endpoints

## Base URL
- **Production:** `https://miclockerapp.com/api`
- **Preview:** `https://videoauditions.preview.emergentagent.com/api`

---

## Authentication Endpoints

### POST `/auth/register/send-verification`
Send email verification code during registration
```json
Request: { "email": "user@example.com" }
Response: { "message": "Verification code sent" }
```

### POST `/auth/register/verify-email`
Verify email with code
```json
Request: { "email": "user@example.com", "code": "123456" }
Response: { "verified": true }
```

### POST `/auth/register`
Create new user account
```json
Request: {
  "username": "string",
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string",
  "category": "musician|audio_engineer|...",
  "sub_categories": ["array"],
  "location": {
    "city": "string",
    "state": "string",
    "country": "string"
  }
}
Response: { "id": "...", "username": "...", ... }
```

### POST `/auth/login`
Login with credentials (query parameters)
```
URL: /api/auth/login?username=xxx&password=xxx
Response: { "access_token": "jwt_token", "token_type": "bearer" }
```

### GET `/auth/me`
Get current authenticated user
```
Headers: Authorization: Bearer <token>
Response: { full user object }
```

### POST `/auth/forgot-password`
Request password reset
```json
Request: { "email": "user@example.com" }
Response: { "message": "Reset code sent" }
```

### POST `/auth/verify-reset-code`
Verify reset code and set new password
```json
Request: { 
  "email": "string", 
  "code": "string", 
  "new_password": "string" 
}
```

### DELETE `/auth/account/delete`
Delete user account (requires password confirmation)
```json
Request: { "password": "string" }
Response: { "message": "Account deleted" }
```

---

## User Profile Endpoints

### GET `/users/profile/{user_id}`
Get public user profile

### GET `/users/profile/by-username/{username}`
Get profile by username

### PUT `/users/profile`
Update own profile
```json
Request: {
  "first_name": "string",
  "last_name": "string",
  "bio": "string",
  "location": {...},
  "social_links": {...}
}
```

### POST `/users/profile/image`
Upload profile image (multipart/form-data)

### GET `/users/{user_id}/listings`
Get user's marketplace listings

### GET `/users/{user_id}/reviews`
Get reviews for user

### GET `/users/favorites/list`
Get user's favorite listings

### POST `/users/favorites/{listing_id}`
Add listing to favorites

### DELETE `/users/favorites/{listing_id}`
Remove from favorites

---

## Auditions (Video Feed) Endpoints

### GET `/auditions`
Get video feed
```
Query params:
- category: string (filter by category)
- featured_only: boolean
- user_id: string (filter by user)
- limit: int (default 20)
- skip: int (pagination)

Response: [array of audition objects]
```

### POST `/auditions`
Upload new audition video
```json
Request: {
  "title": "string",
  "description": "string",
  "video_url": "string (S3 URL)",
  "thumbnail_url": "string",
  "category": "string",
  "subcategories": ["array"],
  "tags": ["array"]
}
```

### GET `/auditions/{id}`
Get single audition details

### DELETE `/auditions/{id}`
Delete own audition

### POST `/auditions/{id}/like`
Like a video

### DELETE `/auditions/{id}/like`
Unlike a video

### POST `/auditions/{id}/view`
Record video view

### POST `/auditions/{id}/favorite`
Add to favorites

### DELETE `/auditions/{id}/favorite`
Remove from favorites

### GET `/auditions/favorites`
Get user's favorite auditions

### GET `/auditions/user/{user_id}`
Get auditions by specific user

---

## Learn Section Endpoints

### Channels

#### GET `/learn/channels`
```
Query params:
- category: string
- limit: int
- skip: int
- search: string
```

#### GET `/learn/channels/trending`
Get trending channels (sorted by subscribers/views)

#### GET `/learn/channels/my`
Get current user's channel (if exists)

#### POST `/learn/channels`
Create new channel
```json
Request: {
  "name": "string",
  "description": "string",
  "category": "string",
  "subcategories": ["array"],
  "intro_video_url": "string (optional)"
}
```

#### GET `/learn/channels/{id}`
Get channel details

#### PUT `/learn/channels/{id}`
Update channel

#### GET `/learn/channels/{id}/content`
Get channel content (videos, playlists, tiers)
```json
Response: {
  "free_videos": [...],
  "playlists": [...],
  "subscription_tiers": [...]
}
```

#### GET `/learn/channels/{id}/tiers`
Get subscription tiers for channel

#### POST `/learn/channels/{id}/tiers`
Create subscription tier
```json
Request: {
  "name": "string",
  "price_usd": number,
  "description": "string",
  "benefits": [
    { "description": "string", "is_included": boolean }
  ],
  "includes_all_content": boolean
}
```

#### POST `/learn/channels/{id}/follow`
Follow channel (FREE - for notifications)

#### DELETE `/learn/channels/{id}/follow`
Unfollow channel

### Playlists

#### GET `/learn/playlists`
```
Query params:
- channel_id: string
- category: string
- is_free: boolean
```

#### POST `/learn/playlists`
Create playlist
```json
Request: {
  "title": "string",
  "description": "string",
  "category": "string",
  "price_usd": number,
  "is_free": boolean
}
```

#### GET `/learn/playlists/{id}`
Get playlist with videos

#### PUT `/learn/playlists/{id}`
Update playlist

#### DELETE `/learn/playlists/{id}`
Delete playlist

### Videos

#### GET `/learn/videos`
```
Query params:
- channel_id: string
- playlist_id: string
- category: string
```

#### POST `/learn/videos`
Upload video
```json
Request: {
  "title": "string",
  "description": "string",
  "video_url": "string",
  "thumbnail_url": "string",
  "duration_seconds": int,
  "category": "string",
  "playlist_id": "string (optional)",
  "price_usd": number,
  "is_free": boolean,
  "preview_duration_seconds": int
}
```

#### GET `/learn/videos/{id}`
Get video details

### Reviews

#### GET `/learn/reviews/{target_type}/{target_id}`
Get reviews (target_type: channel, playlist, video)

#### POST `/learn/reviews`
Create review
```json
Request: {
  "target_type": "channel|playlist|video",
  "target_id": "string",
  "rating": int (1-5),
  "content": "string"
}
```

### Banners

#### GET `/learn/banners`
Get active banners for Learn homepage

### Search

#### GET `/learn/search?q=query`
Search channels, playlists, videos

### Other

#### GET `/learn/following`
Get channels user is following

---

## Gig Board Endpoints

### GET `/gigs`
```
Query params:
- category: string
- location: string
- compensation_type: string
- search: string
- limit: int
- skip: int
```

### POST `/gigs`
Create gig posting
```json
Request: {
  "title": "string",
  "description": "string",
  "category": "string",
  "location": {
    "city": "string",
    "state": "string",
    "country": "string"
  },
  "compensation": {
    "type": "paid|unpaid|negotiable",
    "amount": number,
    "currency": "USD"
  },
  "requirements": ["array"],
  "deadline": "ISO date"
}
```

### GET `/gigs/{id}`
Get gig details

### PUT `/gigs/{id}`
Update gig

### DELETE `/gigs/{id}`
Delete gig

### GET `/gigs/my-gigs`
Get current user's gig postings

### GET `/gigs/categories`
Get available gig categories

---

## Messages Endpoints

### GET `/messages/conversations`
Get all conversations for current user
```json
Response: [{
  "id": "string",
  "participant": { user object },
  "last_message": { message object },
  "unread_count": int,
  "updated_at": "ISO date"
}]
```

### GET `/messages/conversations/{id}`
Get messages in conversation
```
Query params:
- limit: int
- before: string (message_id for pagination)
```

### POST `/messages/conversations`
Create or get conversation with user
```json
Request: { "user_id": "string" }
Response: { conversation object }
```

### POST `/messages/conversations/{id}/messages`
Send message
```json
Request: {
  "content": "string",
  "attachments": [{ "type": "image", "url": "string" }]
}
```

### POST `/messages/conversations/{id}/read`
Mark conversation as read

### DELETE `/messages/conversations/{id}`
Delete conversation

---

## Listings (Marketplace) Endpoints

### GET `/listings`
```
Query params:
- category: string
- min_price: number
- max_price: number
- condition: string
- search: string
- seller_id: string
- sort: string (price_asc, price_desc, newest, oldest)
- limit: int
- skip: int
```

### POST `/listings`
Create listing
```json
Request: {
  "title": "string",
  "description": "string",
  "price": number,
  "category": "string",
  "condition": "new|like_new|good|fair|poor",
  "images": ["array of URLs"],
  "location": {...},
  "shipping": {
    "available": boolean,
    "price": number
  }
}
```

### GET `/listings/{id}`
Get listing details

### PUT `/listings/{id}`
Update listing

### DELETE `/listings/{id}`
Delete listing

---

## Cart & Orders Endpoints

### GET `/cart`
Get current user's cart

### POST `/cart/items`
Add item to cart
```json
Request: { "listing_id": "string", "quantity": int }
```

### PUT `/cart/items/{id}`
Update cart item quantity

### DELETE `/cart/items/{id}`
Remove item from cart

### DELETE `/cart`
Clear entire cart

### POST `/orders`
Create order from cart
```json
Request: {
  "shipping_address": {...},
  "payment_method_id": "string"
}
```

### GET `/orders`
Get user's orders

### GET `/orders/{id}`
Get order details

---

## Notifications Endpoints

### GET `/notifications`
Get user's notifications
```json
Response: [{
  "id": "string",
  "type": "message|order|review|follow|...",
  "title": "string",
  "body": "string",
  "data": {...},
  "read": boolean,
  "created_at": "ISO date"
}]
```

### POST `/notifications/{id}/read`
Mark notification as read

### POST `/notifications/read-all`
Mark all as read

### GET `/notifications/unread-count`
Get count of unread notifications

---

## File Upload Endpoints

### POST `/uploads/s3-presigned`
Get presigned URL for S3 upload
```json
Request: {
  "file_type": "image/jpeg|video/mp4|...",
  "file_name": "string"
}
Response: {
  "upload_url": "presigned S3 URL",
  "file_url": "final URL after upload"
}
```

**Upload Flow:**
1. Call this endpoint to get presigned URL
2. PUT file directly to S3 using upload_url
3. Use file_url in subsequent API calls

---

## Map Endpoints

### GET `/map/users`
Get users with location data
```
Query params:
- category: string
- bounds: string (lat1,lng1,lat2,lng2)
```

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "detail": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 204: No Content (successful delete)
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 422: Validation Error
- 500: Server Error

---

## WebSocket (Future)

Currently using polling for real-time features. WebSocket integration planned for:
- Real-time messaging
- Notification delivery
- Online presence

---

## Rate Limiting

No explicit rate limiting currently implemented. Recommended for mobile:
- Implement client-side throttling
- Cache responses where appropriate
- Use pagination for large lists

---

## Pagination Pattern

Most list endpoints support:
```
?limit=20&skip=0
```
- `limit`: Number of items to return (default usually 20)
- `skip`: Number of items to skip (for offset pagination)

---

## Date Format

All dates are in ISO 8601 format:
```
2026-02-13T19:45:30.123Z
```
Stored as UTC in database. Convert to local timezone on client.
