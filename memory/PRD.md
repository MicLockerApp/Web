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
- User registration with **email verification**
  - 6-digit verification code sent via email
  - 15-minute code expiration
  - Resend code functionality
  - Users cannot complete signup until email is verified
- User login
- Profile management with image upload
- **Account Settings** (NEW - January 2026)
  - Change username (requires password verification)
  - Change email (requires password + verification to new email)
  - Change password (requires current password, auto-logout for security)
  - Accessible via /account or user dropdown menu
- Seller profiles with ratings and reviews

#### 2. Marketplace Core
- Listing creation with media upload (images/videos)
- Advanced search and filtering
- Categories: Guitars, Bass, Drums, Keys, Recording, Live Sound, DJ, Accessories
- Shopping cart functionality
- Favorites/watchlist

#### 3. Offers System
- Make offers on listings
- Counter offers with negotiation history
- Accept/decline/withdraw functionality
- Pending action tracking (buyer/seller turn indicator)

#### 4. Reviews & Ratings System (NEW - January 2026)
- **Bidirectional reviews**: Buyers rate sellers AND sellers rate buyers
- 5-star rating system with written comments
- Reviews are **publicly displayed** on user profiles (cannot be hidden)
- Separate rating statistics: "As Seller" and "As Buyer"
- Rating distribution breakdown
- Tied to completed orders (delivered/completed status)
- Review submission from Order Detail page

#### 5. Messaging System
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

## Completed This Session (January 21, 2026)

### Welcome/New Company Banner (NEW - January 21, 2026)
1. **Dismissible "New Company" Banner** implemented under navbar
   - Yellow text with transparent background (`bg-yellow-500/10`)
   - Friendly message encouraging users to report bugs
   - X button to dismiss
   - **localStorage persistence** - once dismissed, stays hidden
   - Component: `/app/frontend/src/components/WelcomeBanner.js`
   - Added to Layout in `/app/frontend/src/App.js`

## Completed Previous Session (January 20, 2026)

### Trading System (NEW - January 2026)
1. **Full Trading API** - Direct item swaps with no platform fees
   - `/api/trades/eligibility` - Check if user can trade
   - `/api/trades/acknowledge-rules` - Accept trade rules modal
   - `/api/trades` POST - Propose a trade
   - `/api/trades` GET - List user's trades
   - `/api/trades/{id}/respond` - Accept/decline trade
   - `/api/trades/{id}/shipping-address` - Submit shipping address
   - `/api/trades/{id}/tracking` - Add tracking info
   - `/api/trades/{id}/confirm-receipt` - Confirm item received
   - `/api/trades/{id}/cancel` - Cancel trade
   - `/api/trades/{id}/dispute` - Open support ticket for dispute

2. **Trade Rules**:
   - 1 free trade per user per month (resets on 1st)
   - No platform fees on trades
   - First-time modal explaining rules
   - Both parties must ship and confirm receipt

3. **Files Created**:
   - `/app/backend/routes/trades.py` - All trading endpoints
   - `/app/backend/models/trade.py` - Trade model
   - `/app/frontend/src/pages/TradesPage.js` - Trades list view
   - `/app/frontend/src/pages/TradeDetailPage.js` - Trade detail/flow view

### Review Gating System (NEW - January 2026)
1. **After first transaction, users must review counterparty before next action**:
   - Buyers must review sellers before making another purchase
   - Sellers must review buyers before creating another listing
   - First-time buyers/sellers are exempt

2. **User Model Fields Added**:
   - `pending_review_order_id` - Order that needs review
   - `pending_review_type` - "buyer" or "seller"
   - `first_purchase_completed` - Has made at least one purchase
   - `first_sale_completed` - Has made at least one sale

3. **Blocking Logic Added**:
   - `/api/payments/checkout` - Blocks if buyer has pending review
   - `/api/listings` POST - Blocks if seller has pending review

### Item Condition Reporting (NEW - January 2026)
1. Buyers can report item condition during review:
   - `as_described` - Item exactly as described
   - `minor_issues` - Small cosmetic/minor differences
   - `significantly_different` - Major differences from description
   - `damaged` - Item arrived damaged
2. Optional condition notes field for details
3. Added to review model and frontend review modal

### Auto-Payout & Reminders (Enhanced - January 2026)
1. **14-Day Auto-Payout**: If buyer doesn't confirm delivery within 14 days, funds auto-release
2. **5-Day Review Reminders**: Automated in-app messages to both parties
3. **Dashboard Message**: Sellers see info about 14-day auto-release

### Bidirectional Reviews & Ratings System (NEW)
1. Enhanced review model to support buyer-to-seller AND seller-to-buyer reviews
2. Added `reviewer_id`, `reviewee_id`, `reviewer_role`, `reviewee_role`, `review_type` fields
3. Reviews are publicly displayed on user profiles (cannot be hidden)
4. Separate rating statistics: "As Seller" and "As Buyer" ratings
5. Updated ProfilePage to show bidirectional reviews with proper badges
6. Updated OrderDetailPage with review submission UI for both parties
7. Added review API endpoints: `/api/reviews/user/{id}`, `/api/reviews/order/{id}`
8. Seeded database with 28 sample reviews
9. All 27 backend tests passing (100%)

### Files Modified for Reviews
- `/app/backend/routes/reviews.py` - Complete rewrite with bidirectional support
- `/app/backend/models/review.py` - Added reviewer/reviewee fields, review_type
- `/app/backend/database.py` - Updated index to allow multiple reviews per order
- `/app/frontend/src/pages/OrderDetailPage.js` - Review submission UI
- `/app/frontend/src/pages/ProfilePage.js` - Enhanced reviews display
- `/app/frontend/src/services/api.js` - Added reviewsAPI methods
- `/app/backend/seed_reviews.py` - Seed data script

### Email Verification Disabled (Code Kept)
- Email verification step temporarily disabled due to AWS SES sandbox limitations
- All verification code preserved in codebase for future use
- Signup flow now: Account creation → Category selection → Profile completion
- Code can be re-enabled by uncommenting in RegisterPage.js

### Account Settings Feature
1. Added ability for users to change username, email, and password
2. All changes require password verification for security
3. Email change uses 2-step verification (password + code to new email)
4. Password change automatically logs user out for security
5. Created `/app/frontend/src/pages/AccountSettingsPage.js`
6. Added Account Settings link to navbar user dropdown

### Files Modified for Account Settings
- `/app/backend/routes/auth.py` - Added change-username, change-email/*, change-password endpoints
- `/app/frontend/src/pages/AccountSettingsPage.js` - New page for account settings
- `/app/frontend/src/services/api.js` - Added authAPI methods for account changes
- `/app/frontend/src/components/Navbar.js` - Added Account Settings link
- `/app/frontend/src/App.js` - Added routes for /account

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
- **PRODUCTION DEPLOYMENT REQUIRED** - Login/registration on live site is failing because the deployment is out-of-sync with code changes. Redeploy to fix.
- **Enable Stripe Connect in Stripe Dashboard** - Required before sellers can onboard
  - Go to: https://dashboard.stripe.com/connect/onboarding
  - Complete platform profile
  - Then seller onboarding will work

### P1 (High Priority)
- Integrate email delivery (AWS SES production access or alternative provider)
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
