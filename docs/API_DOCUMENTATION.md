# MicLocker API Documentation

## Overview
MicLocker is a comprehensive marketplace API for creative professionals. This documentation provides details on all available API endpoints.

## Live Documentation

### Swagger UI (Interactive)
**URL:** https://eventsphere-21.preview.emergentagent.com/docs

The Swagger UI allows you to:
- Browse all available endpoints
- See request/response schemas
- Test API calls directly in the browser

### ReDoc (Alternative Format)
**URL:** https://eventsphere-21.preview.emergentagent.com/redoc

ReDoc provides a clean, readable format for API documentation.

### OpenAPI JSON Spec
**URL:** https://eventsphere-21.preview.emergentagent.com/openapi.json

Download the raw OpenAPI 3.0 specification for use in:
- iOS/Swift code generation
- Android/Kotlin code generation
- Postman collections
- API client generators

## Base URL
```
https://eventsphere-21.preview.emergentagent.com/api
```

## Authentication

Most endpoints require authentication via Bearer token.

### Getting a Token
```bash
curl -X POST "https://eventsphere-21.preview.emergentagent.com/api/auth/login" \
  -d "username=your_username&password=your_password"
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Using the Token
Include the token in the Authorization header:
```bash
curl -X GET "https://eventsphere-21.preview.emergentagent.com/api/users/profile/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## API Categories

### Authentication (`/api/auth`)
- User registration and login
- Email verification
- Password reset
- Two-factor authentication (TOTP)
- Google OAuth integration

### Users (`/api/users`)
- Profile management
- User search
- Favorites
- Fan tracking

### Listings (`/api/listings`)
- Create, update, delete listings
- Browse marketplace
- Search and filter

### Orders (`/api/orders`)
- Shopping cart
- Checkout
- Order management
- Stripe payments

### Messages (`/api/messages`)
- Direct messaging
- Media attachments
- Message threads

### Gig Board (`/api/gig-board`)
- Post gigs (Looking For, Services, Show Trades)
- Browse opportunities
- Category filtering

### Auditions (`/api/auditions`)
- Video feed
- Favorites
- Category/genre filtering

### Admin (`/api/admin`)
- User management
- Role changes
- Analytics
- Content moderation

### Bookings (`/api/bookings`)
- Venue availability
- Booking requests
- Approval workflow

## Code Generation

### iOS/Swift
```bash
# Using OpenAPI Generator
openapi-generator generate -i openapi.json -g swift5 -o ./ios-client
```

### Android/Kotlin
```bash
# Using OpenAPI Generator
openapi-generator generate -i openapi.json -g kotlin -o ./android-client
```

### JavaScript/TypeScript
```bash
# Using OpenAPI Generator
openapi-generator generate -i openapi.json -g typescript-axios -o ./ts-client
```

## Rate Limiting
API requests are rate limited. If you exceed the limit, you'll receive a 429 response.

## Support
For API support, contact: info@miclockerapp.com

---
*Documentation Version: 2.0.0*
*Last Updated: February 2026*
