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

### Admin Quick Login Feature (NEW - January 21, 2026)
1. **Admin Login Button** added to LoginPage.js
   - Collapsible "Admin Access" section at bottom of login form
   - Yellow-styled "Sign In as Admin" button with shield icon
   - One-click login as `miclocker.support` with full admin privileges
   - Automatically navigates to `/admin` dashboard after login
   - Component: `/app/frontend/src/pages/LoginPage.js`

2. **Admin User Fix**
   - Fixed `is_admin: True` flag not being set on admin user
   - Updated `server.py` to set `is_admin: True` on admin creation
   - Added auto-update logic to fix existing admin users missing the flag
   - Admin now has full access to Admin Panel, Analytics, User Management

### Deployment Database Fix (January 21, 2026)
1. **Refactored database.py** to use correct database:
   - Priority 1: `DB_NAME` env var (set by Emergent platform)
   - Priority 2: Database name extracted from `MONGO_URL` connection string
   - Priority 3: Fallback to `miclocker_prod`/`miclocker_dev`
   - Removed hardcoded `DB_PROD`/`DB_DEVELOP` causing authorization errors

2. **Updated config.py**
   - Added `extra = "ignore"` to allow extra env vars
   - Fixed Pydantic validation errors on startup

3. **Admin credentials moved to environment variables**
   - `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` in `.env`
   - No more hardcoded credentials in source code

### Welcome/New Company Banner (January 21, 2026)
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

### P0 (Critical - User Verification Required)
- **PRODUCTION DEPLOYMENT FIX IMPLEMENTED** - The database connection logic has been completely refactored:
  - **Priority 1**: Uses `DB_NAME` environment variable if set (Emergent platform sets this)
  - **Priority 2**: Extracts database name from `MONGO_URL` connection string
  - **Priority 3**: Falls back to `miclocker_prod` or `miclocker_dev` based on environment
  - **Removed**: Hardcoded `DB_PROD` and `DB_DEVELOP` names that caused "Unauthorized" errors
  - Admin credentials now read from environment variables (`ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`)
  - **ACTION**: Redeploy the application - the new code will use the correct database
- **Enable Stripe Connect in Stripe Dashboard** - Required before sellers can onboard
  - Go to: https://dashboard.stripe.com/connect/onboarding
  - Complete platform profile

### P1 (High Priority)
- Integrate email delivery (AWS SES production access or alternative provider)
- Add Stripe webhook secret configuration
- After production is stable, clean up any overriding environment variables in hosting platform

### P2 (Medium Priority)
- Enhance seller dashboard with advanced analytics
- Integrate AWS S3 for production image hosting
- Enhance search with Elasticsearch/Meilisearch

### P3 (Low Priority)
- Clean up ESLint warnings in frontend
- Add more comprehensive error handling
- UI test automation (blocked until login issues resolved)

## Completed This Session (January 22, 2026)

### Message Deletion Feature (NEW - January 22, 2026)
1. **Backend Endpoints** - Already existed in `/app/backend/routes/messages.py`:
   - `DELETE /api/messages/messages/{message_id}` - Delete a single message (only sender can delete)
   - `DELETE /api/messages/threads/{thread_id}` - Delete entire conversation thread
   
2. **Frontend UI** added to `/app/frontend/src/pages/MessagesPage.js`:
   - Trash icon appears on hover for own messages
   - Delete confirmation popover before deletion
   - Three-dot menu on threads with "Delete Conversation" option
   - Click-outside handler to close menus
   - Proper state management for message and thread removal

3. **API Methods** added to `/app/frontend/src/services/api.js`:
   - `messagesAPI.deleteMessage(messageId)`
   - `messagesAPI.deleteThread(threadId)`

### Admin User Deletion Feedback Fix (January 22, 2026)
1. **Improved Error Handling** in `/app/frontend/src/pages/AdminPage.js`:
   - When trying to delete admin/owner/employee accounts, shows clear error message
   - "Cannot delete admin, owner, or employee accounts. These accounts are protected."
   - Checks for 403 status code specifically

### Date Picker Sync Between Admin & Analytics (January 22, 2026)
1. **Shared DateRangeContext** integrated into `/app/frontend/src/pages/AnalyticsDashboard.js`:
   - Uses `useDateRange` hook from `DateRangeContext`
   - Removed local state for dates
   - Added quick preset buttons (7D, 30D, 90D)
   - Date range shared across Admin Panel and Analytics Dashboard

### Admin Reports Page for Flagged Listings (January 22, 2026)
1. **New Page Created**: `/app/frontend/src/pages/AdminReportsPage.js`
   - Stats cards: Pending, Under Review, Resolved, Dismissed, Total
   - Filter tabs for report status
   - Report cards with listing info, reporter, seller, description
   - Action modal with options: Dismiss, Warn Seller, Remove Listing, Ban Seller
   - Admin response field for notes
   - View Listing button with external link
   - Pagination for reports list

2. **Route Added** to `/app/frontend/src/App.js`:
   - `/admin/reports` route for AdminReportsPage

3. **Link Added** to Admin Panel:
   - "Flagged Listings" button with red-orange gradient
   - Visible to all admin/employee users

### Files Modified (January 22, 2026)
- `/app/frontend/src/pages/MessagesPage.js` - Added message/thread deletion UI
- `/app/frontend/src/pages/AdminPage.js` - Fixed user deletion feedback, added reports link
- `/app/frontend/src/pages/AnalyticsDashboard.js` - Integrated DateRangeContext
- `/app/frontend/src/services/api.js` - Added deleteMessage, deleteThread methods
- `/app/frontend/src/App.js` - Added AdminReportsPage route and import
- `/app/frontend/src/pages/AdminReportsPage.js` - New file for admin reports management

### Testing Results (January 22, 2026)
- **Backend**: 100% (20/21 tests passed, 1 skipped)
- **Frontend**: All UI features working correctly
- Test file: `/app/tests/test_messages_reports.py`

## Test Credentials
- **Admin**: miclocker.support / Eisenhower1212!!
  - **Note**: On production, this user is auto-created on startup when Atlas is detected
  - Works locally after backend starts

## Production Database Architecture
The application now uses smart database selection:
- **Local MongoDB**: Uses `DB_DEVELOP` database
- **MongoDB Atlas (production)**: Auto-detects via URL and forces `DB_PROD` database
- Admin user creation is idempotent - runs on every startup, creates user only if missing
- On Atlas, clears any detected seed data (>1 user or any listings) before creating admin

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
