# MicLocker - Musical Equipment Marketplace

## Overview
MicLocker is a production-ready full-stack marketplace where musicians, audio engineers, studios, venues, and music enthusiasts can buy, sell, and trade musical equipment online. The UX is designed as a modern clone of Reverb.com.

## Tech Stack
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Stripe + Stripe Connect

## Core Features

### Implemented Features

#### 1. User Authentication & Profiles
- JWT-based authentication
- User registration and login
- Profile management with image upload
- Seller profiles with ratings and reviews

#### 2. Marketplace Core
- Listing creation with media upload (images/videos)
- Advanced search and filtering
- Categories: Guitars, Bass, Drums, Keys, Recording, Live Sound, DJ, Accessories
- Shopping cart functionality
- Favorites/watchlist

#### 3. Offers System
- Make offers on listings
- Counter offers
- Accept/decline functionality

#### 4. Messaging System
- Direct messaging between users
- Thread-based conversations
- System notifications

#### 5. Payment System (Stripe)
- Stripe Checkout integration
- Fund holding until delivery confirmation
- Order tracking with shipping info
- Buyer delivery confirmation

#### 6. Stripe Connect (NEW - January 2026)
- Seller onboarding via Express accounts
- Automated fund transfers to sellers
- Balance display for connected sellers
- Auto-delivery confirmation after 14 days
- **Status**: Backend complete, awaiting Stripe Connect activation in Stripe Dashboard

#### 7. Admin System
- 3-tier employee system (Owner, Manager, Employee)
- User management (suspend, ban, delete)
- Employee management with secure password setup
- Analytics dashboard

#### 8. Additional Features
- AI Chatbot (using Emergent LLM Key)
- Support ticketing system
- Event-driven analytics
- Legal pages (Privacy, Terms, etc.)

## API Endpoints

### Stripe Connect Endpoints
- `GET /api/payments/connect/status` - Get seller's Stripe connection status
- `POST /api/payments/connect/onboard` - Start seller onboarding
- `POST /api/payments/connect/refresh-link` - Generate new onboarding link
- `GET /api/payments/connect/balance` - Get seller's balance
- `GET /api/payments/webhook-info` - Get webhook configuration

### Key Order Endpoints
- `POST /api/payments/checkout` - Create checkout session
- `GET /api/payments/status/{session_id}` - Get payment status
- `PUT /api/orders/{order_id}/tracking` - Add tracking info
- `POST /api/orders/{order_id}/confirm-delivery` - Confirm delivery

## Database Schema

### Users Collection
```javascript
{
  id: String,
  username: String,
  email: String,
  stripe_connect_account_id: String,  // NEW
  stripe_connect_status: String,       // NEW: pending, connected
  // ... other fields
}
```

### Orders Collection
```javascript
{
  id: String,
  buyer_id: String,
  status: String,  // awaiting_payment, paid, shipped, delivered, completed
  payment_info: {
    funds_status: String,  // pending, held, released, refunded
    stripe_session_id: String,
    stripe_payment_intent_id: String
  },
  seller_payout_status: String,  // pending, held, released, paid
  tracking_info: {
    carrier: String,
    tracking_number: String,
    estimated_delivery: String
  },
  // ... other fields
}
```

## Completed This Session (January 20, 2026)

### Stripe Connect Implementation
1. Integrated delivery scheduler in server.py (runs hourly)
2. Added Stripe Connect API endpoints for seller onboarding
3. Created seller onboarding UI in DashboardPage.js
4. Added API functions in frontend api.js
5. Fixed auth race condition in DashboardPage
6. All backend tests passing (11/11)

### Daily Visitors Analytics
1. Added `visitors_today` field to realtime metrics
2. Created new `/api/analytics/daily-visitors` endpoint with timeline data
3. Added Daily Visitors section to AnalyticsDashboard.js with:
   - Total visitors, average daily, days tracked summary
   - Interactive bar chart showing daily breakdown
4. Displays unique sessions tracked via page.view events

### Files Modified
- `/app/backend/server.py` - Added delivery scheduler integration
- `/app/backend/routes/payments.py` - Fixed duplicate code, improved error messages
- `/app/backend/services/stripe_connect.py` - Improved error handling
- `/app/backend/analytics/services/analytics_service.py` - Added visitors tracking
- `/app/backend/analytics/routes/analytics.py` - Added daily-visitors endpoint
- `/app/backend/analytics/models/rollups.py` - Added visitors_today field
- `/app/frontend/src/pages/DashboardPage.js` - Added Stripe Connect UI section
- `/app/frontend/src/pages/AnalyticsDashboard.js` - Added Daily Visitors section
- `/app/frontend/src/services/api.js` - Added Stripe Connect API functions

## Pending Tasks

### P0 (Critical)
- **Enable Stripe Connect in Stripe Dashboard** - Required before sellers can onboard
  - Go to: https://dashboard.stripe.com/connect/onboarding
  - Complete platform profile
  - Then seller onboarding will work

### P1 (High Priority)
- Implement "Make an Offer" feature flow
- Implement user ratings and review submission flow
- Add Stripe webhook secret configuration

### P2 (Medium Priority)
- Enhance seller dashboard with advanced analytics
- Integrate AWS S3 for production image hosting
- Enhance search with Elasticsearch/Meilisearch

### P3 (Low Priority)
- Clean up ESLint warnings in frontend
- Add more comprehensive error handling

## Test Credentials
- **Admin**: miclocker.support / Finally2026!!

## Environment Variables Required
```env
# Stripe (already configured)
STRIPE_API_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=  # Configure after setting up webhook

# Auto-delivery settings
AUTO_DELIVERY_DAYS=14
```

## Notes
- Stripe Connect requires enabling in Stripe Dashboard before use
- Auto-delivery confirmation runs every hour
- Funds are held until buyer confirms delivery or 14 days pass
- Platform fee is 3% (configurable via PLATFORM_FEE_PERCENT)
