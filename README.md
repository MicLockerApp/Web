# 🎸 MicLocker

<div align="center">

![MicLocker Logo](https://img.shields.io/badge/MicLocker-Marketplace-FFD700?style=for-the-badge&logo=music&logoColor=black)

**A production-ready marketplace for musicians, audio engineers, studios, and venues to buy, sell, and trade musical equipment online.**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3+-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

[Live Demo](#) • [API Documentation](#api-documentation) • [Features](#features) • [Installation](#installation)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Third-Party Integrations](#third-party-integrations)
- [Database Schema](#database-schema)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

MicLocker is a full-featured e-commerce marketplace designed specifically for the music industry. Inspired by platforms like Reverb.com, it provides a modern, responsive interface for buying and selling musical instruments, audio equipment, and studio gear.

### Key Highlights

- 🎨 **Black & Yellow Branding** with animated vinyl logo
- 🤖 **AI-Powered Support Chatbot** using OpenAI GPT-4o-mini
- 📊 **Real-time Analytics Dashboard** with event-driven architecture
- 💰 **Flexible Pricing** with "Make an Offer" negotiations
- 🔐 **Secure Authentication** with JWT tokens
- 📧 **Transactional Emails** via AWS SES
- 🎁 **Promotional System** (0% fees for first 100 users)

---

## ✨ Features

### For Buyers
- 🔍 **Advanced Search** - Filter by category, condition, price, brand
- 🛒 **Shopping Cart** - Multi-item cart with quantity management
- 💬 **Make an Offer** - Unlimited counter-offer negotiations
- ❤️ **Favorites** - Save listings for later
- 📱 **Responsive Design** - Works on mobile, tablet, desktop
- 💳 **Secure Checkout** - Architected for Stripe integration

### For Sellers
- 📝 **Easy Listing Creation** - Multiple images, detailed descriptions
- 💰 **Flexible Pricing** - Set prices, accept offers, payment plans
- 📊 **Seller Dashboard** - Track sales, manage inventory
- ⭐ **Ratings & Reviews** - Build reputation through feedback
- 💸 **Transparent Fees** - 3% platform fee, clear breakdown

### For Admins
- 📈 **Analytics Dashboard** - GMV, fees, user metrics, funnels
- 👥 **User Management** - View accounts, handle flags
- 📋 **Order Tracking** - Monitor all marketplace activity
- 🔧 **Platform Settings** - Configure fees, policies

### Communication
- 💬 **User-to-User Messaging** - Direct chat with read receipts
- 🤖 **AI Support Chatbot** - 24/7 automated customer support
- 📧 **Email Notifications** - Order updates, password resets

---

## 🛠 Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|----------|
| **FastAPI** | 0.104+ | REST API framework |
| **Python** | 3.11+ | Backend language |
| **MongoDB** | 6.0+ | Database |
| **Motor** | 3.3+ | Async MongoDB driver |
| **Pydantic** | 2.0+ | Data validation |
| **JWT** | - | Authentication |
| **Celery** | 5.3+ | Background tasks |
| **Redis** | 7.0+ | Task queue broker |

### Frontend
| Technology | Version | Purpose |
|------------|---------|----------|
| **React** | 18+ | UI framework |
| **TailwindCSS** | 3+ | Styling |
| **React Router** | 6+ | Navigation |
| **Axios** | 1.6+ | HTTP client |
| **Lucide React** | - | Icons |

### Third-Party Services
| Service | Purpose |
|---------|---------|
| **AWS SES** | Transactional emails |
| **AWS S3** | File storage (optional) |
| **OpenAI** | AI chatbot (via Emergent LLM) |
| **Google Maps** | Address display |

---

## 🏗 Architecture

```
miclocker/
├── backend/
│   ├── analytics/           # Event-driven analytics system
│   │   ├── models/          # Event & rollup schemas
│   │   ├── routes/          # Analytics API endpoints
│   │   ├── services/        # Aggregation & query services
│   │   └── tasks/           # Background aggregation jobs
│   ├── chatbot/             # AI support chatbot
│   │   ├── models/          # Conversation schemas
│   │   ├── routes/          # Chat API endpoints
│   │   └── services/        # AI, context, conversation services
│   ├── models/              # Core data models
│   ├── routes/              # API route handlers
│   ├── services/            # Business logic
│   ├── utils/               # Helper functions
│   ├── server.py            # FastAPI application
│   ├── database.py          # MongoDB connection
│   ├── config.py            # Configuration
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── public/              # Static assets
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Page components
│       ├── services/        # API clients
│       ├── context/         # React context providers
│       └── App.js           # Main application
├── docs/                    # Documentation
│   ├── API_DOCUMENTATION.md
│   ├── ANALYTICS_ARCHITECTURE.md
│   └── CHATBOT_INTEGRATION.md
└── README.md
```

---

## 🚀 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6.0+
- Redis 7.0+ (for background tasks)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run the server
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
yarn install

# Configure environment
cp .env.example .env
# Edit .env with your backend URL

# Run development server
yarn start
```

### Docker (Optional)

```bash
docker-compose up -d
```

---

## 📚 API Documentation

### Interactive Documentation

- **Swagger UI**: `http://localhost:8001/docs`
- **ReDoc**: `http://localhost:8001/redoc`

### API Endpoints Overview

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Auth** | `/api/auth/*` | Registration, login, password reset |
| **Users** | `/api/users/*` | Profiles, favorites, search |
| **Listings** | `/api/listings/*` | CRUD operations, search |
| **Cart** | `/api/cart/*` | Shopping cart management |
| **Orders** | `/api/orders/*` | Checkout, order tracking |
| **Offers** | `/api/offers/*` | Make/accept/counter offers |
| **Messages** | `/api/messages/*` | User-to-user messaging |
| **Reviews** | `/api/reviews/*` | Ratings and reviews |
| **Search** | `/api/search/*` | Global search |
| **Files** | `/api/files/*` | Image/video uploads |
| **Admin** | `/api/admin/*` | Platform administration |
| **Analytics** | `/api/analytics/*` | Business intelligence |
| **Chatbot** | `/api/chatbot/*` | AI support chat |

📖 **[Full API Documentation →](docs/API_DOCUMENTATION.md)**

---

## 🔐 Environment Variables

### Backend (`/backend/.env`)

```env
# Application
ENVIRONMENT=development
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# MongoDB
MONGO_URL=mongodb://localhost:27017

# AWS S3 (Optional - for file storage)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=your-bucket-name
S3_REGION=us-east-1

# AWS SES (For emails)
SES_REGION=us-east-2
SES_SENDER_EMAIL=info@yourdomain.com

# Platform Settings
PLATFORM_FEE_PERCENT=3
PAYMENT_PROCESSING_PERCENT=3.19
PAYMENT_PROCESSING_FIXED=0.49

# AI Chatbot
EMERGENT_LLM_KEY=your-emergent-key
```

### Frontend (`/frontend/.env`)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

---

## 🔗 Third-Party Integrations

### AWS Simple Email Service (SES)
Used for sending transactional emails:
- Password reset verification codes
- Order confirmations
- Account notifications

**Setup**: Add AWS credentials to `.env`, verify sender email in SES console.

### AWS S3 (Optional)
Used for storing uploaded images and videos.

**Setup**: Create S3 bucket, add credentials to `.env`. Falls back to local storage if not configured.

### OpenAI (via Emergent LLM Key)
Powers the AI support chatbot with GPT-4o-mini.

**Setup**: Add `EMERGENT_LLM_KEY` to `.env`.

### Google Maps API
Displays user addresses on profile pages.

**Setup**: Add `REACT_APP_GOOGLE_MAPS_API_KEY` to frontend `.env`.

---

## 🗄 Database Schema

### Core Collections

| Collection | Description |
|------------|-------------|
| `users` | User accounts and profiles |
| `listings` | Product listings |
| `cart_items` | Shopping cart items |
| `orders` | Completed orders |
| `offers` | Price negotiations |
| `message_threads` | Conversation threads |
| `messages` | Individual messages |
| `reviews` | Seller reviews |

### Analytics Collections

| Collection | Description |
|------------|-------------|
| `analytics_events` | Raw event stream (90-day TTL) |
| `analytics_rollups` | Pre-computed aggregations |

### Chatbot Collections

| Collection | Description |
|------------|-------------|
| `chatbot_conversations` | AI chat sessions |

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
yarn test
```

---

## 📈 Analytics Events

MicLocker tracks the following events for business intelligence:

- `user.registered`, `user.logged_in`
- `listing.created`, `listing.viewed`, `listing.favorited`
- `cart.item_added`, `cart.item_removed`
- `offer.created`, `offer.accepted`, `offer.countered`, `offer.declined`
- `purchase.completed`
- `search.performed`, `search.zero_results`
- `message.sent`, `conversation.started`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by [Reverb.com](https://reverb.com)
- Built with [FastAPI](https://fastapi.tiangolo.com/)
- Styled with [TailwindCSS](https://tailwindcss.com/)
- Icons from [Lucide](https://lucide.dev/)

---

<div align="center">

**Made with ❤️ for the music community**

🎸 🎹 🥁 🎤 🎧

</div>
