# MicLocker - Musical Equipment Marketplace

## Overview
MicLocker is a production-ready full-stack marketplace where musicians, audio engineers, studios, venues, and music enthusiasts can buy, sell, and trade musical equipment online. The UX is designed as a modern clone of Reverb.com.

## Tech Stack
- **Frontend**: React with Tailwind CSS, Shadcn/UI components
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Payments**: Stripe + Stripe Connect
- **Storage**: AWS S3 for media uploads
- **Email**: AWS SES with full authentication (SPF, DKIM, DMARC)

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
- **Account Settings** (merged into Edit Profile page)
  - Change username (requires password verification, propagates across all collections)
  - Change email (requires password + verification to new email)
  - Change password (requires current password, auto-logout for security)
  - Accessible via /profile/edit
- Seller profiles with ratings and reviews

#### Gig Board - /gigs (January 2026)
- Full-featured Gig Board for posting and finding opportunities
- **Two Gig Types**: "Looking For" (what users need) and "Services" (what users offer)
- **7 Main Categories with Subcategories**:
  - Musicians (37 subcategories: Acoustic Guitar, Bass Electric, Drums, Keyboards, etc.)
  - Audio Engineers (32 subcategories: Mixing, Mastering, Live Sound, Post Production, etc.)
  - Recording Studios (33 subcategories: Recording, Rehearsal Rooms, Podcast, etc.)
  - Venues (18 subcategories: Concert Hall, Club, Arena, Festival Grounds, etc.)
  - Merchants (30 subcategories: Merchandise, Vinyl Records, Accessories, etc.)
  - **Comedians** (20 subcategories: Stand-Up, Improv, Sketch, Musical Comedy, etc.)
  - **Actors** (25 subcategories: Film, TV, Theater, Voice Actor, Commercial, etc.)
- **Music Genre Filter**: 20 genres (Rock, Jazz, Hip-Hop, Classical, etc.)
- **Gig Card Features**:
  - Slideable thumbnail gallery with Pexels placeholder images
  - User profile photo displayed next to category icon
  - Title and description
  - Up to 5 photos and 5 videos per gig (via S3)
  - Contact info (email, phone), Location, Budget/rate range
  - Social media links (website, Instagram, Facebook, Twitter, YouTube, SoundCloud, Spotify, Bandcamp)
- **Filter System**: Filter by category, subcategories, music genres, and search
- **My Posts**: View and manage user's own gig postings
- **View Count**: Track how many views each gig receives
- Accessible from navbar "Gigs" icon (desktop and mobile)

#### Learn Page - Coming Soon (January 2026)
- **/learn** - Placeholder for future "Learn" feature (tutorials, guides)
- Currently displays "Coming Soon" placeholder

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
- **Refactored AdminPage.js** - Extracted into tab components (OverviewTab, UsersTab, ListingsTab, OrdersTab, EmployeesTab)

#### 8. Additional Features
- AI Chatbot (using Emergent LLM Key)
- Support ticketing system
- Event-driven analytics
- Legal pages (Privacy, Terms, etc.)

#### 9. Branding & UI (January 2026)
- **New Logo**: Custom yellow dotted spiral design replacing the vinyl record
  - Applied to: Navbar, Login, Register, About page, Footer, Loading spinner
  - Spinning animation maintained (33.5 RPM)
  - PWA icons updated (favicon-32, logo192, logo512)
  - Email templates updated with logo image
- **Homepage Tagline**: "By Industry Pros. For Industry Pros."
- **Homepage Subtitle**: "The gold standard of the music and entertainment industry"
- **Music Platforms Only**: Removed Instagram, Twitter, Facebook, YouTube
  - Now shows only: Apple Music, Spotify, SoundCloud
  - Updated in: Edit Profile, Create Gig, View Gig, Profile Page
- **Mobile Responsive Listing Cards**: Username and star rating stack vertically on mobile, left-aligned
- **Spotify Player Embed** (NEW):
  - Neumorphic-styled embedded Spotify player on user profiles
  - Users can add their Spotify artist/album/track/playlist URL in Edit Profile
  - Custom neumorphic wrapper with:
    - Header showing "{username}'s Music" with gold accent play indicator
    - Soft shadow depth effects (inner and outer shadows)
    - Volume toggle and external link buttons
    - Gradient accent bar
  - Respects "Show music platforms" privacy toggle

#### 10. Top 8 Fans Feature (NEW - January 2026)
- **Fan Ranking System**: Displays top 8 most engaged users on each profile
  - Scoring algorithm (weighted):
    - Visit frequency: 50 points per visit (highest weight)
    - Time spent: 0.1 points per second (secondary)
    - Interactions: 25 points per interaction (third)
  - Interactions include: messages, purchases, reviews, favorites
- **Privacy Controls**:
  - Profile owner can set visibility: Public / Private / Hidden
  - Users can opt-out of appearing on anyone's Top 8 list
- **UI Features**:
  - 4x2 grid displaying fan avatars with rank badges (gold #1, silver #2, bronze #3)
  - Shows username and visit count
  - Gold Member/Founder badges displayed on fan cards
  - Empty state with dashed placeholders
- **Tracking**:
  - Visits tracked when logged-in users view profiles
  - Time tracked every 30 seconds while viewing
  - Only tracks users who haven't opted out

#### 11. Profile Media (Photos & Videos) - January 2026
- **User Profile Portfolio**: Users can showcase their work with photos and videos
- **Tab-based UI**: Profile pages now have 4 tabs: Photos, Videos, Listings, Reviews
- **Photo Uploads**:
  - Max 20 photos per user
  - Supports: JPEG, PNG, WebP, GIF
  - Max file size: 10MB
  - Stored in S3 at `profiles/{user_id}/photos/`
- **Video Uploads with Category Filters**:
  - Max 10 videos per user
  - Supports: MP4, MOV, WebM, MPEG
  - Max file size: 100MB
  - Stored in S3 at `profiles/{user_id}/videos/`
  - **Required**: Category (musician, audio_engineer, recording_studio, venue, comedian, actor)
  - **Optional**: Subcategory, Genre, Description, Song Name
- **UI Features**:
  - Grid layout for photos (square aspect ratio)
  - Grid layout for videos (4:3 aspect ratio matching listing cards)
  - Upload placeholder as first grid item (only on own profile)
  - Lightbox modal for viewing media full-screen
  - Delete functionality in lightbox
  - **Video upload modal** with category/subcategory/genre selectors
  - **"Auditions" badge** on videos shown in the Auditions feed
- **Auditions Integration**:
  - Videos automatically sync to the Auditions feed
  - Videos auto-added to Auditions if user has <5 videos
  - Users with 6+ videos can select which 5 to feature
  - Selection UI appears with "Select Videos for Auditions" button
  - Max 5 videos per user in Auditions feed
- **Upload Media Button**:
  - Yellow button with black text below Edit Profile
  - Only visible on own profile
  - Scrolls to media section when clicked
- **Privacy**: Media is publicly visible on user profiles
- **Backend**: `/app/backend/routes/profile_media.py`
- **Frontend**: Updated `/app/frontend/src/pages/ProfilePage.js`

#### 12. Video Favorites System - January 2026
- **Favorites Tab**:
  - New tab on profile page after Reviews
  - Only visible to profile owner (private)
  - Shows starred videos from Auditions feed
  - Organized by category with collapsible sections
- **Star Favorites in Auditions**:
  - Replaced heart icon with star in Auditions feed
  - Click star to add/remove from favorites
  - Yellow star indicates favorited
  - Count shows total favorites
- **Share Modal**:
  - Share to Facebook, X (Twitter), Reddit
  - Copy link to clipboard
  - Opens when clicking share button in Auditions
- **Auto-play with Sound**:
  - Videos auto-play with sound when active
  - Mute button available for silent viewing
- **Comment Button Removed**:
  - Comment button removed from Auditions feed (planned for later)
- **Backend**: `/app/backend/routes/auditions.py` (favorites endpoints)

## API Endpoints

### Profile Media Endpoints (January 2026)
- `GET /api/profile/media/{user_id}` - Get photos and videos for a user
- `POST /api/profile/media/photo` - Upload a photo (authenticated)
- `POST /api/profile/media/video` - Upload a video with category metadata (authenticated)
- `PATCH /api/profile/media/video/{media_id}` - Update video metadata
- `POST /api/profile/media/auditions/select` - Select which videos appear in Auditions (max 5)
- `DELETE /api/profile/media/{media_id}` - Delete media (owner only)

### Video Favorites Endpoints (January 2026)
- `GET /api/auditions/favorites` - Get user's favorited videos
- `POST /api/auditions/{id}/favorite` - Add video to favorites
- `DELETE /api/auditions/{id}/favorite` - Remove video from favorites
- `GET /api/auditions/{id}/favorite/check` - Check if video is in favorites

### Profile Visits Endpoints (Top 8 Fans)
- `POST /api/profile-visits/track` - Track a profile visit
- `PUT /api/profile-visits/time` - Update time spent on profile
- `POST /api/profile-visits/interaction` - Track interaction (message, purchase, review, favorite)
- `GET /api/profile-visits/top-fans/{profile_id}` - Get top 8 fans for a profile
- `GET /api/profile-visits/my-stats/{profile_id}` - Get current user's fan stats

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

## Completed This Session (January 31, 2026)

### Google OAuth & Two-Factor Authentication Implementation

#### Google OAuth Sign-In
1. **Emergent-managed Google Auth Integration**
   - Added "Continue with Google" button on login page
   - Added "Sign up with Google" button on registration page
   - Created `/app/frontend/src/components/GoogleSignInButton.js`
   - Created `/app/frontend/src/components/GoogleAuthCallback.js` to handle OAuth redirect
   - Created `/app/backend/routes/google_oauth.py` for backend OAuth processing
   - New route: `/auth/google/callback` handles the OAuth flow

2. **How Google OAuth Works:**
   - User clicks "Continue with Google"
   - Redirected to Emergent Auth (Google sign-in)
   - Returns to `/auth/google/callback#session_id=xxx`
   - Backend exchanges session_id for user data
   - New users are created with email from Google
   - Existing users are linked to their Google account

#### Two-Factor Authentication (2FA)
1. **Authenticator App (TOTP)**
   - QR code generation for apps like Google Authenticator, Authy
   - Manual secret entry option
   - Backup codes generated on setup (10 codes)
   - Uses `pyotp` library for TOTP generation/verification

2. **SMS-based 2FA (Twilio)**
   - Phone number verification via Twilio Verify
   - **Requires Twilio credentials in backend/.env:**
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_VERIFY_SERVICE`
   - Falls back to TOTP if SMS unavailable

3. **2FA Enforcement Policy:**
   - Optional during registration (can skip)
   - Required for sensitive actions: withdrawals, password changes
   - Challenge/validate flow for protected operations

4. **New Components:**
   - `/app/frontend/src/components/TwoFactorSetup.js` - Setup wizard
   - `/app/backend/routes/two_factor.py` - 2FA API endpoints
   - `/app/backend/models/two_factor.py` - Data models

#### New API Endpoints
- `GET /api/2fa/status` - Get user's 2FA status
- `POST /api/2fa/setup` - Initialize 2FA setup (TOTP or SMS)
- `POST /api/2fa/verify` - Verify and enable 2FA
- `POST /api/2fa/disable` - Disable 2FA (requires password + code)
- `POST /api/2fa/challenge` - Create challenge for sensitive actions
- `POST /api/2fa/validate` - Validate challenge code
- `POST /api/2fa/resend-sms` - Resend SMS verification code
- `POST /api/auth/google/callback` - Process Google OAuth

### Registration Flow Updated
- Step 1-6: Same as before (account creation, email verification, profile setup)
- Step 7: **NEW** - 2FA setup (optional, can skip)

### Files Created
- `/app/frontend/src/components/GoogleSignInButton.js`
- `/app/frontend/src/components/GoogleAuthCallback.js`
- `/app/frontend/src/components/TwoFactorSetup.js`
- `/app/backend/routes/google_oauth.py`
- `/app/backend/routes/two_factor.py`
- `/app/backend/models/two_factor.py`

### Files Modified
- `/app/frontend/src/pages/LoginPage.js` - Added Google button
- `/app/frontend/src/pages/RegisterPage.js` - Added Google button + 2FA step
- `/app/frontend/src/App.js` - Added OAuth callback route
- `/app/backend/server.py` - Registered new routers

### Dependencies Added
- `pyotp==2.9.0` - TOTP generation
- `qrcode==8.2` - QR code generation
- `twilio==9.10.0` - SMS delivery
- `Pillow` - Image processing for QR codes

### Venue Booking System Complete (P0, P1, P2)

#### P0: Venue Booking Management UI
1. **VenueBookingsPage** (`/venue/bookings`) - Complete management interface for venue owners
   - Filter tabs: Pending, Accepted, Declined, All
   - Booking request cards showing event details, artist info, dates
   - Accept/Decline buttons with response modal
   - Response message field for communicating with artists
   - Document upload section for accepted bookings
   - Component: `/app/frontend/src/pages/VenueBookingsPage.js`

2. **ArtistBookingsPage** (`/my-bookings`) - Track booking requests for artists
   - View all submitted booking requests
   - Filter by status (All, Pending, Confirmed, Declined)
   - Cancel pending bookings
   - View venue responses
   - Upload documents for accepted bookings
   - Component: `/app/frontend/src/pages/ArtistBookingsPage.js`

3. **Navbar Integration**
   - "Manage Bookings" link for venue users (category === 'venue')
   - "My Bookings" link for non-venue users
   - Added Calendar icon for booking links

#### P1: Notification System
1. **Backend Notification System**
   - Notification model with types: booking_accepted, booking_declined, booking_request, etc.
   - CRUD API endpoints for notifications
   - Auto-create notifications when:
     - Artist submits booking request → Venue gets notified
     - Venue accepts booking → Artist gets notified
     - Venue declines booking → Artist gets notified
   - Files: `/app/backend/models/notification.py`, `/app/backend/routes/notifications.py`

2. **Frontend Notification Bell**
   - Bell icon in navbar with unread count badge
   - Dropdown showing recent notifications
   - Click notification to navigate to relevant page
   - "Mark all read" functionality
   - Poll for new notifications every 30 seconds

#### P2: Document Attachments for Approved Bookings
1. Both venues and artists can upload documents to accepted bookings
2. Documents stored in S3 via existing upload infrastructure
3. Separate sections for "Your Documents" and "From Artist/Venue"
4. Support for PDF, DOC, DOCX, TXT, JPG, PNG formats
5. Links open documents in new tab

### Extended Booking System for Audio Engineers & Recording Studios
1. **Backend Updates** (`/app/backend/routes/bookings.py`)
   - Added `BOOKABLE_CATEGORIES = ["venue", "audio_engineer", "recording_studio"]`
   - All booking endpoints now support these three categories
   - Validation rejects booking requests to non-bookable categories

2. **Frontend Updates**
   - ProfilePage shows "View Calendar" for venues, "Book Session" for engineers/studios
   - Navbar shows "Manage Bookings" for all three bookable categories
   - VenueBookingsPage accessible to all three categories
   - VenueCalendarPage works for all three categories

### New API Endpoints
- `POST /api/notifications` - Create notification (internal use)
- `GET /api/notifications` - Get user's notifications
- `GET /api/notifications/count` - Get unread count
- `PATCH /api/notifications/{id}/read` - Mark single notification read
- `POST /api/notifications/mark-read` - Mark multiple/all notifications read
- `DELETE /api/notifications/{id}` - Delete notification
- `DELETE /api/notifications` - Clear all notifications

### New Routes
- `/venue/bookings` - Venue booking management page
- `/my-bookings` - Artist bookings page

### Files Created/Modified
- `/app/backend/models/notification.py` - Notification data model
- `/app/backend/routes/notifications.py` - Notification API
- `/app/backend/routes/bookings.py` - Added notification triggers + extended categories
- `/app/backend/server.py` - Registered notification router
- `/app/frontend/src/pages/ArtistBookingsPage.js` - New page
- `/app/frontend/src/pages/VenueBookingsPage.js` - Updated with document upload
- `/app/frontend/src/pages/VenueCalendarPage.js` - Accept/Decline buttons added
- `/app/frontend/src/pages/ProfilePage.js` - Calendar button for all bookable categories
- `/app/frontend/src/components/Navbar.js` - Added notification bell and booking links
- `/app/frontend/src/App.js` - Added routes

### Testing
- Backend: 14/14 tests passed (100%)
- Frontend: All UI elements verified
- Test files: 
  - `/app/backend/tests/test_bookings_notifications.py`
  - `/app/backend/tests/test_extended_bookings.py`

## Completed Previous Session (January 21, 2026)

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

## Completed This Session (January 24, 2026)

### Profile Image Propagation Fix - COMPLETE (January 24, 2026)
**Root Cause**: The `/api/listings/featured` and `/api/listings/recent` endpoints were using simple `find()` queries instead of aggregation pipelines with `$lookup` to join with the users collection. This meant the `seller_profile_image` field was missing from the API responses.

**Fix Applied**:
1. Updated `/app/backend/routes/listings.py`:
   - `get_featured_listings()` - Now uses aggregation pipeline with `$lookup` to fetch seller profile image
   - `get_recent_listings()` - Now uses aggregation pipeline with `$lookup` to fetch seller profile image
2. Updated `/app/backend/routes/gigs.py`:
   - `get_gigs()` - Now uses aggregation pipeline with `$lookup` to fetch user profile image

**Verified Working**:
- Search results page shows seller profile images ✅
- Listing detail page shows seller profile image ✅
- Featured listings API returns seller_profile_image ✅
- Recent listings API returns seller_profile_image ✅

### AdminPage.js Refactoring - COMPLETE (January 24, 2026) 
1. **Major Refactoring Completed**: Reduced AdminPage.js from **1,655 lines to 617 lines** (63% reduction)

2. **New Tab Components Created** in `/app/frontend/src/components/admin/`:
   - `OverviewTab.js` (207 lines) - Analytics overview with date picker, stats cards, orders by status
   - `UsersTab.js` (208 lines) - User search, table display, manage user action button
   - `ListingsTab.js` (197 lines) - Listing filters, table with thumbnails, remove action
   - `OrdersTab.js` (176 lines) - Order filters, table with fee columns for owner
   - `EmployeesTab.js` (211 lines) - Team management, role descriptions, employee table

3. **Existing Modal Components** (previously extracted):
   - `UserActionModal.js` - Suspend/ban/role change/delete users
   - `AddEmployeeModal.js` - Invite new employees
   - `EditEmployeeModal.js` - Edit employee details
   - `ResetAnalyticsModal.js` - Reset analytics data

4. **Shared Utilities** in `/app/frontend/src/components/admin/utils.js`:
   - `getStatusBadgeClasses()` - Status badge styling
   - `getRoleBadgeClasses()` - Role badge styling
   - `PROTECTED_EMAILS` - Protected admin email addresses
   - `ROLE_OPTIONS` - Available role options

5. **Barrel Export** updated in `/app/frontend/src/components/admin/index.js`:
   - All 5 tab components exported
   - All 4 modal components exported
   - All utility functions exported

### Testing Results (January 24, 2026)
- **Frontend**: 100% (All 27 features verified)
  - Admin panel loads with all 5 tabs
  - Profile images display on listing cards and detail pages
  - Tab switching works correctly
  - All modal components functional
- Test report: `/app/test_reports/iteration_23.json`

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

## Completed This Session (January 22, 2026)

### AWS S3 Integration for Photo & Video Uploads (Major Feature)
**Status: ✅ FULLY IMPLEMENTED & TESTED**

1. **Backend S3 Service** - `/app/backend/services/s3_service.py`:
   - S3Service class with full CRUD operations
   - Presigned URL generation (POST and PUT methods)
   - Direct upload support
   - Object deletion (single and batch)
   - Object listing and existence checks
   - Automatic object key generation with timestamps

2. **Upload API Routes** - `/app/backend/routes/uploads.py`:
   - `GET /api/uploads/status` - Check S3 configuration status
   - `POST /api/uploads/presigned-url` - Generate presigned POST URL for frontend uploads
   - `POST /api/uploads/presigned-put-url` - Generate presigned PUT URL for large files
   - `POST /api/uploads/direct` - Direct upload through backend
   - `DELETE /api/uploads/{key}` - Delete uploaded file
   - `GET /api/uploads/listing/{listing_id}` - List files for a listing

3. **Frontend Components**:
   - `/app/frontend/src/hooks/useS3Upload.js` - React hook for S3 uploads with progress tracking
   - `/app/frontend/src/components/S3MediaUploader.js` - Full-featured media uploader component
     - Drag & drop support
     - Upload progress bars
     - File validation (type & size)
     - Preview display
     - Remove functionality

4. **Integration**:
   - CreateListingPage updated to use S3MediaUploader
   - EditListingPage updated to use S3MediaUploader
   - ListingCreate model extended with S3MediaItem for media URLs
   - Listing creation handles S3 media conversion to ListingMedia format

5. **S3 Bucket Configuration** (`miclocker-saint-louis-bucket` in `us-east-2`):
   - CORS configured: AllowedOrigins: *, AllowedMethods: GET/POST/PUT/DELETE/HEAD
   - Bucket policy for public read access on `listings/*` folder
   - Public access block disabled for bucket policy to work

6. **Testing Results**:
   - Backend: 15/15 tests passed (100%)
   - Frontend: S3MediaUploader component renders correctly
   - Test file: `/app/backend/tests/test_s3_uploads.py`

### Review-Gating System (Major Feature)
1. **Frontend Components**:
   - `/app/frontend/src/components/ReviewGatingModal.js` - Full-screen modal for forced reviews
     - Supports both review submission and support ticket creation
     - Star rating, item condition selection, written review
     - Pre-filled support ticket for 14-day non-receipt cases
   - `/app/frontend/src/components/ReviewGatingWrapper.js` - App wrapper
     - Checks `/api/reviews/pending` on mount and periodically
     - Shows blocking modal when `locked: true` returned
   - Integrated into App.js to wrap entire app content

2. **Backend Scheduled Tasks** - `/app/backend/tasks/delivery_tasks.py`:
   - `run_delivery_check_ins()` - Multi-day check-in process (5, 7, 10, 12, 14 days)
   - `lock_pending_reviewers()` - Locks buyer accounts after delivery confirmation
   - At 14 days: Forces buyer to submit support ticket if item not received
   - All check-ins send in-app messages to buyers

3. **API Endpoints** - `/app/backend/routes/reviews.py`:
   - `GET /api/reviews/pending` - Check pending review status
     - Returns: `{has_pending: bool, locked: bool, type: string, order_id: string, order: object, other_user: object}`
   - `POST /api/reviews/confirm-receipt/{order_id}` - Buyer confirms item receipt
   - `POST /api/reviews` - Submit review (unlocks account)

### Date Picker Sync Enhancement
1. **Admin Panel** - `/app/frontend/src/pages/AdminPage.js`:
   - Added `useDateRange` hook integration
   - Added date picker UI with 7D/30D/90D presets
   - Added custom date range inputs
   - Added "synced with Analytics" indicator
   
2. **Analytics Dashboard** - Already had DateRangeContext integration
   - Both pages now share the same date range state
   - Changing dates on one page reflects on the other

### Testing Results (January 22, 2026)
- **Backend**: 100% (8/8 tests passed, 3 skipped)
- **Frontend**: All UI features verified working
- Test file: `/app/tests/test_review_gating_admin.py`
- Report: `/app/test_reports/iteration_18.json`

## Completed This Session (January 22, 2026 - Continued)

### Support Ticket S3 Attachments (Priority 3 Task)
**Status: ✅ FULLY IMPLEMENTED & TESTED**

1. **Updated HelpCenterPage.js** to use S3 for attachments:
   - Imported `useS3Upload` hook
   - Replaced local `/api/files/upload` endpoint with S3 presigned URL uploads
   - Added upload progress display with percentage
   - Added S3 upload error handling
   - Added data-testid attributes for testing

2. **Files Modified**:
   - `/app/frontend/src/pages/HelpCenterPage.js` - Lines 6, 31, 83: Now uses S3

### Priority 1-3 Tasks Status (All Complete)
1. ✅ **Listing Flagging System** - Already complete from previous session
   - Admin Reports Page at `/admin/reports`
   - Action modal with Dismiss, Warn Seller, Remove Listing, Ban Seller
   - Backend endpoints fully implemented
   
2. ✅ **Admin User Deletion Feedback** - Already complete from previous session
   - Error message shows in modal when trying to delete protected accounts
   - 403 status code properly handled
   
3. ✅ **Support Ticket S3 Attachments** - Completed this session
   - Help Center now uploads attachments to S3
   - Uses same S3 bucket as listing media

### Testing Results (January 22, 2026)
- **Backend**: 100% (11/12 tests passed, 1 skipped)
- **Frontend**: 100% (All UI features working)
- Test file: `/app/tests/test_priority_features.py`
- Report: `/app/test_reports/iteration_20.json`

### Admin Ticket Attachments Display (January 22, 2026)
**Issue**: Admins could not see images/files attached to support tickets
**Status: ✅ FIXED**

1. **Backend Fix** - `/app/backend/routes/tickets.py`:
   - Line 93: Now passes `attachments` field when creating `TicketInDB`
   - Attachments are properly saved to MongoDB with url, filename, and type

2. **Frontend Fix** - `/app/frontend/src/pages/AdminTicketsPage.js`:
   - Added Attachments section in ticket detail view
   - Shows paperclip icon with count header
   - Grid display of attachment thumbnails
   - Image previews for image types
   - File icon for non-image attachments
   - Filename and file type display
   - "Open" link to view full attachment
   - Added attachment indicator in ticket list view

3. **New Icons Added**: `Paperclip`, `Image`, `FileText`, `ExternalLink`

### Stripe Connect Webhooks & Embedded Payments (January 22, 2026)
**Status: ✅ FULLY IMPLEMENTED**

#### Webhook Endpoints Created:
1. **Account Webhook** - `/api/payments/webhook`
   - Handles: checkout.session.completed, expired, payment_intent events, refunds, disputes
   
2. **Connect Webhook** - `/api/payments/webhook/connect`
   - Handles seller account events: account.updated, deauthorized
   - Handles transfers: transfer.created, transfer.reversed
   - Handles payouts: payout.paid, payout.failed
   - Handles capabilities and person verification updates

#### Embedded Payment Endpoints:
- `POST /api/payments/create-payment-intent` - Creates Payment Intent for embedded checkout
- `POST /api/payments/confirm-payment/{order_id}` - Confirms payment completion

#### Automatic Notifications:
- Seller notified when Stripe account becomes active
- Seller notified when Stripe account disconnected
- Seller notified when payout fails

#### Files Modified:
- `/app/backend/routes/payments.py` - Comprehensive webhook handlers
- `/app/backend/config.py` - Added `stripe_connect_webhook_secret`
- `/app/STRIPE_SETUP_GUIDE.md` - Complete setup documentation

#### Required Environment Variables:
- `STRIPE_WEBHOOK_SECRET` - For account webhook signature verification
- `STRIPE_CONNECT_WEBHOOK_SECRET` - For connect webhook signature verification

### Stripe Connect Destination Charges Fix (January 22, 2026)
**Status: ✅ CRITICAL FIX IMPLEMENTED**

**Problem:** Payments were being processed but funds were NOT being routed to sellers.

**Root Cause:** The checkout session was missing `transfer_data.destination` parameter which tells Stripe to send funds to the seller's connected account.

**Fix Applied:**
1. **Updated `/app/backend/services/stripe_service.py`**:
   - Rewrote to use native Stripe SDK instead of emergentintegrations
   - Added `transfer_data.destination` for Connect destination charges
   - Added `application_fee_amount` for platform fee collection

2. **Updated `/app/backend/routes/payments.py`**:
   - Now fetches seller's `stripe_connect_account_id` before creating checkout
   - Passes seller's Connect account and platform fee to checkout session

**How Funds Now Flow:**
```
Buyer pays $100 → Stripe → $97 to Seller + $3 to MicLocker (platform fee)
```

The `transfer_data.destination` parameter automatically routes funds to the seller's connected Stripe account minus the platform fee.

### 6 Critical Updates (January 22, 2026)
**Status: ✅ ALL IMPLEMENTED & TESTED**

1. **Username Editing** - Users can now change their username in Edit Profile
   - Added `username` field to `UserProfileUpdate` model
   - Validation: lowercase, 3-30 chars, only letters/numbers/underscores/dots/hyphens
   - Checks for uniqueness before updating

2. **Back Button on Listing Pages** - Added "← Back" button at top of ListingDetailPage
   - Uses `navigate(-1)` to go to previous page
   - Data-testid: `back-button`

3. **Heart/Favorite Buttons** - Now visible for ALL users (not just authenticated)
   - Unauthenticated users redirected to login when clicking
   - Uses `usersAPI.addFavorite()` and `usersAPI.removeFavorite()`

4. **Checkout Success Page** - Enhanced with full order details
   - Shows order number, date, items purchased with images
   - Seller info, shipping address, price breakdown
   - "Done - Return to Home" button at bottom

5. **$5 Minimum Listing Price** - Enforced at model and route level
   - Model: `price: float = Field(..., ge=5.0)`
   - Route: Additional validation on update rejects prices under $5
   - Frontend: Shows "(min $5.00)" hint, input min="5"

6. **30-Day Trade Cooldown** - After a trade is accepted between two users
   - Stored in `trade_cooldowns` collection with `expires_at`
   - Checked when initiating AND accepting trades
   - Prevents same-user trading for 30 calendar days

**Test Results:** 100% pass rate - `/app/test_reports/iteration_21.json`

### Profile & Account Updates (January 23, 2026)
**Status: ✅ IMPLEMENTED**

1. **Username Changes Propagate Everywhere**
   - When a user changes their username, it updates across:
     - All their listings (`seller_username`)
     - All orders (as buyer/seller)
     - All trades (as initiator/recipient)
     - All offers (as buyer/seller)
     - All reviews (as reviewer/reviewee)

2. **Email & Password Changes in Edit Profile**
   - Moved from Account Settings to Edit Profile page
   - Email change requires password confirmation
   - Password change requires current password

3. **Account Settings Page Removed**
   - `/account` and `/account/settings` now redirect to Edit Profile
   - All functionality consolidated in `/profile/edit`

4. **New Navbar Buttons (Coming Soon)**
   - List icon → `/my-list` (Coming Soon page)
   - GraduationCap icon → `/learn` (Coming Soon page)
   - Both show: "Coming Soon!" with message from The MicLocker Team

**Files Modified:**
- `/app/backend/routes/users.py` - Username propagation, email/password endpoints
- `/app/frontend/src/pages/EditProfilePage.js` - Added Account Settings section
- `/app/frontend/src/components/Navbar.js` - Added List & GraduationCap buttons
- `/app/frontend/src/pages/MyListPage.js` - New Coming Soon page
- `/app/frontend/src/pages/LearnPage.js` - New Coming Soon page
- `/app/frontend/src/App.js` - Updated routes
- Deleted: `/app/frontend/src/pages/AccountSettingsPage.js`

## Notes
- Stripe Connect requires enabling in Stripe Dashboard before use
- **See `/app/STRIPE_SETUP_GUIDE.md` for complete webhook configuration steps**
- Auto-delivery confirmation runs every hour
- Funds are held until buyer confirms delivery or 14 days pass
- Platform fee is 3% (configurable via PLATFORM_FEE_PERCENT)
- Review-gating system activates after first purchase/sale is completed
- **Minimum listing price is $5.00** - cannot be overridden



## Session Updates (January 26, 2026)

### Verification & Confirmation
**Status: ✅ ALL VERIFIED**

1. **Profile Image Propagation** - VERIFIED WORKING
   - Search page shows seller profile images on listing cards ✅
   - Both `miclockerfounder` and `miclocker.support` display avatars correctly
   - Star ratings and review counts displaying properly

2. **AdminPage.js Refactoring** - VERIFIED COMPLETE
   - Reduced from 1,600+ lines to 620 lines (61% reduction)
   - All 5 tab components working: Overview, Users, Listings, Orders, Team
   - All 4 modals functional: UserAction, AddEmployee, EditEmployee, ResetAnalytics
   - Admin panel accessible and fully functional at `/admin`

3. **Map Page** - VERIFIED WORKING
   - Shows user markers with profession-based color coding
   - Filter panel with profession categories and distance radius
   - Legend displaying all profession types
   - "1 user found" confirms API integration working

---

## Session Updates (January 24, 2026)

### Architecture Improvements
**Status: ✅ IMPLEMENTED**

1. **Centralized Error Handling Middleware**
   - Created `/app/backend/middleware/error_handler.py`
   - Request ID tracking via UUID for log correlation
   - Standardized error responses with `X-Request-ID` header
   - Catches unhandled exceptions without breaking HTTPException behavior

2. **GigsPage Component Extraction** - Reduced from 1,183 to 517 lines (56%)
   - `/app/frontend/src/components/gigs/GigCard.js` - Individual gig card with slider
   - `/app/frontend/src/components/gigs/CreateGigModal.js` - Multi-step creation form
   - `/app/frontend/src/components/gigs/ViewGigModal.js` - Full gig detail view
   - `/app/frontend/src/components/gigs/constants.js` - Shared icons and placeholders

3. **Admin Component Library**
   - `/app/frontend/src/components/admin/UserActionModal.js` - User moderation
   - `/app/frontend/src/components/admin/AddEmployeeModal.js` - Employee invites
   - `/app/frontend/src/components/admin/EditEmployeeModal.js` - Employee editing
   - `/app/frontend/src/components/admin/ResetAnalyticsModal.js` - Data reset

4. **Gig Service Layer** - Business logic separated from routes
   - `/app/backend/services/gig_service.py` - Validation, document creation, query building
   - `/app/backend/routes/gigs.py` - Now thin HTTP routing only

### Feature Updates

1. **Comedian & Actor Categories in Signup**
   - Added to `/app/backend/models/user.py` as USER_CATEGORIES
   - 13 comedian specialties: Stand-up, Improv, Sketch Comedy, etc.
   - 23 actor specialties: Film Actor, TV Actor, Voice Actor, etc.
   - Updated `/app/frontend/src/pages/RegisterPage.js` with specialty selection
   - API endpoint `/api/auth/categories` returns new options

2. **Seller Review Count on Listings**
   - Added `seller_review_count` field to listing API responses
   - Updated `/app/backend/routes/listings.py` - All listing endpoints
   - Updated `/app/frontend/src/components/ListingCard.js` - Shows "(0)" next to star rating

