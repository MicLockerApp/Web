# MicLocker Mobile App - Comprehensive Handoff Document

## 🎯 Application Overview

**MicLocker** is a comprehensive marketplace for creative professionals in the entertainment industry. The platform combines:
- **Gear Marketplace** - Buy/sell equipment and services
- **Auditions Feed** - TikTok-style vertical video feed for showcasing talent
- **Learn Section** - Educational content with channels, playlists, and subscription tiers
- **Gig Board** - Job postings for creative professionals
- **Direct Messaging** - Real-time communication between users
- **Professional Profiles** - Portfolio pages with media galleries

---

## 🎨 Design System & Color Scheme

### Primary Colors
```
Primary (Gold/Yellow): #FACC15
├── 50:  #FEF9E7
├── 100: #FEF3CF
├── 200: #FDE89F
├── 300: #FCDC6F
├── 400: #FBD13F
├── 500: #FACC15 (DEFAULT)
├── 600: #D4A90A
├── 700: #9E7D07
├── 800: #685205
└── 900: #322803
```

### Dark Mode Colors (DEFAULT)
```
Dark Background: #0A0A0A
├── 50:  #525252
├── 100: #484848
├── 200: #333333
├── 300: #292929
├── 400: #1F1F1F
├── 500: #141414
├── 600: #0A0A0A (DEFAULT)
└── 700-900: #000000

CSS Variables:
--bg-primary: #0A0A0A
--bg-secondary: #141414
--bg-card: #1A1A1A
--bg-elevated: #1F1F1F
--bg-input: #1A1A1A
--border-color: #333333
--text-primary: #FFFFFF
--text-secondary: #A3A3A3
--text-muted: #666666
```

### Light Mode Colors
```
Light Background: #FFFFFF
├── 100: #FAFAFA
├── 200: #F5F5F5
├── 300: #E5E5E5
├── 400: #D4D4D4
├── 500: #A3A3A3
├── 600: #737373
├── 700: #525252
├── 800: #262626
└── 900: #171717

CSS Variables:
--bg-primary: #FFFFFF
--bg-secondary: #F5F5F5
--bg-card: #FFFFFF
--bg-elevated: #FAFAFA
--border-color: #E5E5E5
--text-primary: #171717
--text-secondary: #525252
--text-muted: #737373
```

### Status Colors
```
Success/Green: #22C55E (green-500)
Error/Red: #EF4444 (red-500)
Warning/Yellow: #FACC15 (primary)
Info/Blue: #3B82F6 (blue-500)
```

### Typography
- Font Family: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto')
- Headings: Bold, larger text-2xl to text-4xl
- Body: Regular, text-base (16px)
- Small/Muted: text-sm (14px) or text-xs (12px)

---

## 🔐 Authentication System

### Auth Endpoints (prefix: `/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Create new account | No |
| POST | `/register/send-verification` | Send email verification code | No |
| POST | `/register/verify-email` | Verify email with code | No |
| POST | `/login` | Login (query params: username, password) | No |
| GET | `/me` | Get current user | Yes |
| POST | `/forgot-password` | Request password reset | No |
| POST | `/verify-reset-code` | Verify reset code | No |
| POST | `/account/change-password` | Change password | Yes |
| POST | `/account/change-username` | Change username | Yes |
| POST | `/account/change-email/request` | Request email change | Yes |
| DELETE | `/account/delete` | Delete account | Yes |
| GET | `/categories` | Get all user categories | No |

### Google OAuth Endpoints (prefix: `/api/google`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/login` | Initiate Google OAuth |
| GET | `/callback` | OAuth callback handler |

### Auth Token Format
- Type: Bearer JWT Token
- Header: `Authorization: Bearer <token>`
- Token field in response: `access_token`
- Login returns: `{ "access_token": "...", "token_type": "bearer" }`

### User Categories (12 total)
1. `musician` - Musicians (with instrument specializations)
2. `audio_engineer` - Audio Engineers (mixing, mastering, live sound)
3. `recording_studio` - Recording Studios
4. `venue` - Venues (concert halls, clubs, theaters)
5. `merchant` - Merchants (gear sellers)
6. `comedian` - Comedians
7. `actor` - Actors
8. `show_pro` - Show Production (lighting, stage, sound techs)
9. `photographer` - Photographers
10. `videographer` - Videographers
11. `manager` - Managers (artist, tour, booking agents)
12. `services` - Services (hair, makeup, stylists, trainers)

---

## 📱 Main Features & Screens

### 1. HOME / GEAR MARKETPLACE
**Route:** `/` or `/gear`
**Purpose:** Marketplace for buying/selling equipment and services

#### Endpoints (prefix: `/api/listings`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/listings` | List all listings with filters |
| POST | `/listings` | Create new listing |
| GET | `/listings/{id}` | Get listing details |
| PUT | `/listings/{id}` | Update listing |
| DELETE | `/listings/{id}` | Delete listing |
| GET | `/listings/user/{user_id}` | Get user's listings |

#### Listing Categories
- Instruments, Amplifiers, Recording Equipment, Studio Gear
- DJ Equipment, Live Sound, Lighting, Cables & Accessories
- Cases & Bags, Software & Plugins, Vintage, Services

---

### 2. AUDITIONS (Video Feed)
**Route:** `/auditions`
**Purpose:** TikTok-style vertical scrolling video feed

#### Endpoints (prefix: `/api/auditions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auditions` | Get feed (query: category, featured_only, limit, skip) |
| POST | `/auditions` | Upload new audition video |
| GET | `/auditions/{id}` | Get single audition |
| DELETE | `/auditions/{id}` | Delete audition |
| POST | `/auditions/{id}/like` | Like a video |
| DELETE | `/auditions/{id}/like` | Unlike a video |
| POST | `/auditions/{id}/view` | Record view |
| POST | `/auditions/{id}/favorite` | Add to favorites |
| DELETE | `/auditions/{id}/favorite` | Remove from favorites |
| GET | `/auditions/favorites` | Get user's favorites |
| GET | `/auditions/user/{user_id}` | Get user's auditions |

#### Feed Categories (tabs)
- Featured (curated content)
- Musicians
- Audio Engineers
- Studios
- (All 12 user categories)

#### Video Player Features
- Vertical full-screen video
- Double-tap to like
- Swipe up/down to navigate
- Mute/unmute toggle
- Share button
- Profile link to video owner

---

### 3. LEARN SECTION
**Route:** `/learn`
**Purpose:** Educational content platform (like CreativeLive)

#### Endpoints (prefix: `/api/learn`)

**Channels:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learn/channels` | List all channels |
| GET | `/learn/channels/trending` | Get trending channels |
| POST | `/learn/channels` | Create channel |
| GET | `/learn/channels/{id}` | Get channel details |
| PUT | `/learn/channels/{id}` | Update channel |
| GET | `/learn/channels/{id}/content` | Get channel content (videos, playlists, tiers) |
| GET | `/learn/channels/{id}/tiers` | Get subscription tiers |
| POST | `/learn/channels/{id}/follow` | Follow channel (FREE) |
| DELETE | `/learn/channels/{id}/follow` | Unfollow channel |

**Playlists:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learn/playlists` | List playlists |
| POST | `/learn/playlists` | Create playlist |
| GET | `/learn/playlists/{id}` | Get playlist details |
| PUT | `/learn/playlists/{id}` | Update playlist |
| DELETE | `/learn/playlists/{id}` | Delete playlist |

**Videos:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learn/videos` | List videos |
| POST | `/learn/videos` | Upload video |
| GET | `/learn/videos/{id}` | Get video details |
| PUT | `/learn/videos/{id}` | Update video |
| DELETE | `/learn/videos/{id}` | Delete video |

**Other:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/learn/banners` | Get homepage banners |
| GET | `/learn/reviews/{type}/{id}` | Get reviews |
| POST | `/learn/reviews` | Create review |
| GET | `/learn/search?q=` | Search channels/playlists/videos |
| GET | `/learn/following` | Get followed channels |

#### Learn Section Features
- Banner carousel (auto-slides every 5 seconds)
- Category filtering (same 12 categories as user signup)
- Channel pages with tabs: Free Videos, Playlists, Subscription Tiers, Reviews
- Paywall for paid content (lock icons on videos)
- "Subscribe" button = FREE follow for notifications
- "Purchase" button = PAID monthly subscription

---

### 4. GIG BOARD
**Route:** `/gigs`
**Purpose:** Job postings for creative professionals

#### Endpoints (prefix: `/api/gigs`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/gigs` | List all gigs with filters |
| POST | `/gigs` | Create new gig posting |
| GET | `/gigs/{id}` | Get gig details |
| PUT | `/gigs/{id}` | Update gig |
| DELETE | `/gigs/{id}` | Delete gig |
| GET | `/gigs/my-gigs` | Get user's posted gigs |
| GET | `/gigs/categories` | Get gig categories |

#### Gig Categories
- Live Performance, Studio Work, Tour Support
- Teaching/Lessons, Session Work, Production
- Engineering, Composing, And more...

---

### 5. MESSAGES
**Route:** `/messages`
**Purpose:** Real-time direct messaging

#### Endpoints (prefix: `/api/messages`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages/conversations` | List all conversations |
| GET | `/messages/conversations/{id}` | Get conversation messages |
| POST | `/messages/conversations` | Create/get conversation with user |
| POST | `/messages/conversations/{id}/messages` | Send message |
| POST | `/messages/conversations/{id}/read` | Mark as read |
| DELETE | `/messages/conversations/{id}` | Delete conversation |

#### Message Features
- Real-time messaging
- Image attachments (NOTE: Currently has a bug)
- Read receipts
- Online status indicators
- Timestamps in local timezone

---

### 6. USER PROFILES
**Route:** `/profile/{username}`
**Purpose:** Public portfolio pages

#### Endpoints (prefix: `/api/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/{id}` | Get user profile |
| GET | `/users/username/{username}` | Get by username |
| PUT | `/users/{id}` | Update profile |
| GET | `/users/{id}/media` | Get profile media |
| POST | `/users/{id}/media` | Upload media |
| DELETE | `/users/{id}/media/{media_id}` | Delete media |

#### Profile Sections
- Header with avatar, banner, verification badge
- Bio and location
- Category and specializations
- Media gallery (images/videos)
- Audition videos
- Gear listings
- Reviews received
- Social links

---

### 7. MAP / DISCOVER
**Route:** `/map`
**Purpose:** Geographic discovery of professionals

#### Endpoints (prefix: `/api/map`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/map/users` | Get users with location data |
| GET | `/map/search` | Search by location |

---

### 8. CART & CHECKOUT
**Routes:** `/cart`, `/checkout`

#### Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get user's cart |
| POST | `/api/cart/items` | Add item to cart |
| PUT | `/api/cart/items/{id}` | Update cart item |
| DELETE | `/api/cart/items/{id}` | Remove from cart |
| DELETE | `/api/cart` | Clear cart |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | Get user's orders |
| GET | `/api/orders/{id}` | Get order details |

---

### 9. NOTIFICATIONS
**Route:** Notification icon in navbar

#### Endpoints (prefix: `/api/notifications`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get user's notifications |
| POST | `/notifications/{id}/read` | Mark as read |
| POST | `/notifications/read-all` | Mark all as read |
| GET | `/notifications/unread-count` | Get unread count |

---

### 10. HELP CENTER
**Route:** `/help`

#### Endpoints (prefix: `/api/tickets`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tickets` | Get user's tickets |
| POST | `/tickets` | Create support ticket |
| GET | `/tickets/{id}` | Get ticket details |
| POST | `/tickets/{id}/messages` | Add message to ticket |

---

## 🔗 API Base URL

**Production:** `https://miclockerapp.com/api`
**Preview:** `https://videoauditions.preview.emergentagent.com/api`

All API endpoints are prefixed with `/api`

---

## 📦 File Uploads

#### Endpoint: `/api/uploads/s3-presigned`
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/uploads/s3-presigned` | Get presigned URL for S3 upload |

**Upload Flow:**
1. Request presigned URL with file type
2. Upload file directly to S3 using presigned URL
3. Use returned URL in subsequent API calls

---

## 🔔 Key UI Components

### Navigation Bar
- Logo (links to `/`)
- Search bar (hidden on Auditions page)
- Icons: Auditions, Gigs, Learn, Map, Help Center
- Notifications bell with badge
- Messages icon with unread count
- Profile dropdown / Sign In buttons
- Theme toggle (dark/light)

### Bottom Navigation (Mobile)
Should include:
- Home (Gear)
- Auditions
- Create (+)
- Messages
- Profile

### Common UI Patterns
- Cards with rounded corners (rounded-xl = 12px)
- Buttons: Primary (gold bg, black text), Secondary (dark bg, white text)
- Form inputs with dark backgrounds in dark mode
- Loading spinners (vinyl record animation)
- Toast notifications (sonner library)
- Modals with backdrop blur
- Pull-to-refresh on lists

---

## 👤 User Object Structure

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "first_name": "string",
  "last_name": "string",
  "avatar": "string (URL)",
  "banner": "string (URL)",
  "bio": "string",
  "category": "string (one of 12 categories)",
  "sub_categories": ["array of specializations"],
  "location": {
    "city": "string",
    "state": "string",
    "country": "string",
    "coordinates": { "lat": number, "lng": number }
  },
  "is_verified": boolean,
  "is_admin": boolean,
  "role": "string (user/admin/owner)",
  "created_at": "ISO date string"
}
```

---

## 🎬 Audition Item Structure

```json
{
  "id": "string",
  "user_id": "string",
  "video_url": "string",
  "thumbnail_url": "string",
  "title": "string",
  "description": "string",
  "category": "string",
  "subcategories": ["array"],
  "tags": ["array"],
  "like_count": number,
  "view_count": number,
  "is_featured": boolean,
  "created_at": "ISO date string",
  "user": { /* embedded user object */ }
}
```

---

## 📚 Learn Section Structures

### Channel
```json
{
  "id": "string",
  "user_id": "string",
  "name": "string",
  "description": "string",
  "category": "string",
  "subcategories": ["array"],
  "intro_video_url": "string",
  "banner_image": "string",
  "subscriber_count": number,
  "total_views": number,
  "average_rating": number,
  "review_count": number
}
```

### Playlist
```json
{
  "id": "string",
  "channel_id": "string",
  "title": "string",
  "description": "string",
  "thumbnail_url": "string",
  "price_usd": number,
  "is_free": boolean,
  "video_count": number,
  "average_rating": number,
  "review_count": number
}
```

### Subscription Tier
```json
{
  "id": "string",
  "channel_id": "string",
  "name": "string (Basic/Pro/VIP)",
  "price_usd": number,
  "description": "string",
  "benefits": [
    { "description": "string", "is_included": boolean }
  ],
  "includes_all_content": boolean
}
```

---

## ⚠️ Important Notes

### Payment Integration
- **MOCKED**: Stripe integration is scaffolded but not connected
- Purchase buttons show alert placeholders
- Ready for Stripe integration when keys are provided

### Known Issues
- Direct Message image uploader has a bug (recurring issue)
- Needs investigation on frontend implementation

### Visitor Access
- Non-logged-in users can browse most of the site
- Interactive features (message, favorite, post) show "Sign Up" modal
- Protected routes redirect to login

### Admin Features
- Admin panel at `/admin`
- User management, listings moderation, analytics
- Learn Banners management tab
- Only accessible to admin/owner roles

---

## 📁 Key File Locations (Web Reference)

### Frontend Pages
```
/frontend/src/pages/
├── HomePage.js (Gear marketplace)
├── AuditionsPage.js (Video feed)
├── LearnPage.js (Learn homepage)
├── LearnChannelPage.js (Channel view)
├── LearnPlaylistPage.js (Playlist view)
├── LearnVideoPage.js (Video player)
├── LearnStudioPage.js (Creator dashboard)
├── GigsPage.js (Job board)
├── MessagesPage.js (DM system)
├── ProfilePage.js (User profiles)
├── MapPage.js (Geographic discovery)
├── CartPage.js (Shopping cart)
├── AdminPage.js (Admin panel)
└── ... (60 total pages)
```

### Backend Routes
```
/backend/routes/
├── auth.py (Authentication)
├── users.py (User profiles)
├── listings.py (Marketplace)
├── auditions.py (Video feed)
├── learn.py (Learn section)
├── gigs.py (Gig board)
├── messages.py (Messaging)
├── cart.py (Shopping cart)
├── orders.py (Orders)
├── notifications.py (Notifications)
├── admin.py (Admin functions)
└── ... (30 total route files)
```

### Models
```
/backend/models/
├── user.py (User model + categories)
├── listing.py (Marketplace listings)
├── audition.py (Video items)
├── learn.py (Learn section models)
├── gig.py (Job postings)
└── ...
```

---

## 🔑 Test Credentials

**Admin Account:**
- Username: `miclocker.support`
- Password: `Eisenhower1212!!`
- Role: `owner` (full admin access)

---

## 📊 Total API Endpoints: 259+

The backend has approximately 259 API endpoints across all route files. Key route prefixes:
- `/api/auth` - Authentication
- `/api/users` - User management
- `/api/listings` - Marketplace
- `/api/auditions` - Video feed
- `/api/learn` - Educational content
- `/api/gigs` - Job board
- `/api/messages` - Messaging
- `/api/cart` - Shopping cart
- `/api/orders` - Order management
- `/api/notifications` - Notifications
- `/api/admin` - Admin panel
- `/api/uploads` - File uploads
- `/api/google` - Google OAuth

---

## 🎯 Mobile App Priority Features

### Must Have (P0)
1. Authentication (login, register, Google OAuth)
2. Auditions video feed with swipe navigation
3. User profiles
4. Direct messaging
5. Gear marketplace browsing
6. Push notifications

### Should Have (P1)
1. Learn section (channels, playlists, videos)
2. Gig board
3. Shopping cart & checkout
4. Map discovery
5. Profile media gallery

### Nice to Have (P2)
1. Video upload for auditions
2. Listing creation
3. Creator studio for Learn
4. Admin features

---

This document should provide everything needed for the Mobile Agent to create a mobile app that closely mirrors the web application.
