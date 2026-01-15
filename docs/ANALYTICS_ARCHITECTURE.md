# MicLocker Analytics Subsystem Architecture

## Overview

The MicLocker Analytics Subsystem is a production-ready, event-driven analytics system designed to observe marketplace behavior without affecting it. The system is architecturally isolated from marketplace business logic and can be extracted into a standalone service in the future.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (React)                                   │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │ analytics.js    │    │  Components     │    │    GA4          │         │
│  │ (Event Client)  │───▶│  (emit events)  │───▶│  Integration    │         │
│  └────────┬────────┘    └─────────────────┘    └─────────────────┘         │
│           │ Batch + Beacon                                                   │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BACKEND (FastAPI)                                   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    MARKETPLACE ROUTES                                │   │
│  │  auth.py │ listings.py │ orders.py │ offers.py │ messages.py        │   │
│  │                    ↓ (fire-and-forget)                               │   │
│  │              instrumentation.py                                      │   │
│  └───────────────────────┬─────────────────────────────────────────────┘   │
│                          │                                                   │
│  ┌───────────────────────▼─────────────────────────────────────────────┐   │
│  │                    ANALYTICS SUBSYSTEM                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │  │ Event Ingestion │  │ Event Emitter   │  │ Analytics API   │     │   │
│  │  │ /api/events/*   │  │ (async, non-    │  │ /api/analytics/*│     │   │
│  │  │                 │  │  blocking)      │  │                 │     │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘     │   │
│  │           │                    │                    │               │   │
│  │           ▼                    ▼                    │               │   │
│  │  ┌─────────────────────────────────────────────────┐│               │   │
│  │  │            RAW EVENTS COLLECTION                ││               │   │
│  │  │  (append-only, TTL: 90 days)                    ││               │   │
│  │  └─────────────────────────────────────────────────┘│               │   │
│  │                          │                          │               │   │
│  │                          ▼                          │               │   │
│  │  ┌─────────────────────────────────────────────────┐│               │   │
│  │  │         BACKGROUND SCHEDULER                    ││               │   │
│  │  │  • Hourly aggregation (every hour at :05)       ││               │   │
│  │  │  • Daily aggregation (1 AM UTC)                 ││               │   │
│  │  │  • Weekly cleanup (Sunday 3 AM UTC)             ││               │   │
│  │  └────────────────────────┬────────────────────────┘│               │   │
│  │                           │                         │               │   │
│  │                           ▼                         ▼               │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐│   │
│  │  │                 ROLLUPS COLLECTION                               ││   │
│  │  │  • Revenue rollups                                               ││   │
│  │  │  • Offer funnel rollups                                          ││   │
│  │  │  • Search funnel rollups                                         ││   │
│  │  │  • Marketplace health rollups                                    ││   │
│  │  │  • Trust & safety rollups                                        ││   │
│  │  └──────────────────────────────────────────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONGODB                                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ analytics_events│  │analytics_rollups│  │ marketplace     │             │
│  │ (raw events)    │  │ (aggregations)  │  │ collections     │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Event Taxonomy & Contracts

Located in `/app/backend/analytics/models/events.py`

**Event Schema:**
```python
{
    "event_id": "uuid",
    "event_type": "listing.viewed",
    "event_category": "search_discovery",
    "event_version": "1.0",
    "timestamp": "2024-01-14T12:00:00Z",
    "processed_at": "2024-01-14T12:00:01Z",
    
    # Actor information
    "actor_type": "buyer|seller|admin|system|anonymous",
    "actor_id": "user_uuid",
    "actor_username": "guitarking",
    
    # Session/Attribution
    "session_id": "sess_abc123",
    "device_type": "mobile|tablet|desktop",
    "user_agent": "...",
    "ip_hash": "abc123...",  # Hashed for privacy
    "referrer": "https://google.com",
    
    # UTM/Marketing Attribution
    "utm_source": "google",
    "utm_medium": "cpc",
    "utm_campaign": "summer_sale",
    "ga_client_id": "GA1.1.123456789.1234567890",
    
    # Entity references
    "listing_id": "uuid",
    "order_id": "uuid",
    "offer_id": "uuid",
    "message_thread_id": "uuid",
    "target_user_id": "uuid",
    
    # Structured metadata
    "metadata": {
        "listing_price": 500,
        "category": "Guitars",
        "source": "search"
    }
}
```

### 2. Event Coverage

| Category | Event Types |
|----------|-------------|
| **User & Session** | user.registered, user.logged_in, user.logged_out, session.started, session.ended |
| **Search & Discovery** | search.performed, search.zero_results, listing.viewed, listing.favorited, listing.unfavorited, listing.shared |
| **Commerce** | listing.created, cart.item_added, cart.item_removed, checkout.started, checkout.completed, purchase.completed, payment.failed, refund.initiated, refund.completed |
| **Offers** | offer.created, offer.countered, offer.accepted, offer.declined, offer.withdrawn, offer.expired, offer.converted_to_purchase |
| **Messaging** | message.sent, message.read, conversation.started |
| **Moderation** | moderation.listing_flagged, moderation.listing_removed, moderation.user_suspended |

### 3. Raw Event Storage

**Collection:** `analytics_events`

**Indexes:**
- `event_type`
- `timestamp` (TTL: 90 days)
- `actor_id`
- `listing_id`
- `order_id`
- `session_id`
- Compound: `(event_type, timestamp)`

**Retention:** Automatic cleanup after 90 days via TTL index.

### 4. Aggregation & Rollups

**Collection:** `analytics_rollups`

**Rollup Types:**

| Rollup | Metrics |
|--------|---------|
| **Revenue** | GMV, platform_fees, processing_fees, order_count, AOV, revenue_by_category |
| **Offer Funnel** | created, countered, accepted, declined, withdrawn, conversion_rates |
| **Search Funnel** | searches, zero_results, views, cart_adds, purchases, conversion_rates |
| **Marketplace Health** | active_listings, active_buyers, active_sellers, buyer_seller_ratio, turnover_rate |
| **Trust & Safety** | refunds, disputes, flags, suspensions, rates |

**Schedule:**
- Hourly: Revenue rollups (for real-time-ish data)
- Daily at 1 AM UTC: All rollups for previous day
- Weekly at 3 AM UTC: Cleanup old raw events

### 5. API Endpoints

**Event Ingestion:**
- `POST /api/events/track` - Single event (confirmed)
- `POST /api/events/batch` - Batch events (up to 100)
- `POST /api/events/beacon` - Fire-and-forget (204 response)

**Analytics Dashboard (Admin only):**
- `GET /api/analytics/realtime` - Real-time metrics
- `GET /api/analytics/revenue` - Revenue with date range
- `GET /api/analytics/offer-funnel` - Offer funnel metrics
- `GET /api/analytics/search-funnel` - Search funnel metrics
- `GET /api/analytics/marketplace-health` - Health metrics
- `GET /api/analytics/trust-safety` - Safety metrics
- `GET /api/analytics/search-terms` - Top search terms
- `GET /api/analytics/events` - Event drill-down
- `POST /api/analytics/reprocess` - Reprocess rollups
- `POST /api/analytics/run-aggregation` - Manual aggregation trigger

### 6. Frontend Analytics Client

Located in `/app/frontend/src/services/analytics.js`

**Features:**
- Event batching (10 events or 30 seconds)
- Beacon API for fire-and-forget
- Session tracking
- UTM parameter capture and persistence
- GA4 integration
- Device type detection

**Usage:**
```javascript
import analytics from '../services/analytics';

// Initialize (once in App.js)
analytics.init({ ga4MeasurementId: 'G-XXXXXXXXXX' });

// Track events
analytics.listingViewed(listingId, price, category, sellerId, 'search');
analytics.addToCart(listingId, price, 1, category, true);
analytics.purchaseCompleted(orderId, total, items);
```

### 7. GA4 Integration

**Purpose:** Marketing analytics only (traffic, attribution, campaigns)

**Integration Points:**
- Client-side gtag.js loading
- ga_client_id captured and attached to internal events
- UTM parameters preserved across session
- Dual tracking: internal + GA4

**NOT used for:**
- Revenue reporting (use internal analytics)
- Business KPIs (use internal rollups)

## Design Principles

1. **Marketplace emits events only** - Business code calls `emit_event()`, doesn't query analytics
2. **Analytics observes, never changes** - Read-only from marketplace perspective
3. **Append-only data** - Events are immutable once stored
4. **Isolated storage** - Separate collections from transactional data
5. **Dashboard reads rollups** - Fast, pre-computed aggregations
6. **Privacy-first** - IPs hashed, PII minimized

## Scaling Roadmap

### Current State (v1)
- Single MongoDB instance
- APScheduler for background jobs
- Direct writes to analytics_events

### Future Scale (v2)
1. **Add Redis queue** between event emission and storage
2. **Migrate to Celery** for distributed job processing
3. **Separate analytics database** for query isolation
4. **Add ClickHouse/TimescaleDB** for time-series optimization
5. **Event stream** via Kafka/Kinesis for real-time processing
6. **Extract to microservice** with dedicated API

### Migration Path
```
v1: FastAPI → MongoDB (current)
v2: FastAPI → Redis Queue → Worker → MongoDB
v3: FastAPI → Kafka → Stream Processor → ClickHouse
```

## File Structure

```
/app/backend/analytics/
├── __init__.py
├── instrumentation.py          # Helper functions for emitting events
├── models/
│   ├── __init__.py
│   ├── events.py              # Event taxonomy and schemas
│   └── rollups.py             # Aggregation schemas
├── routes/
│   ├── __init__.py
│   ├── analytics.py           # Dashboard API endpoints
│   └── events.py              # Event ingestion endpoints
├── services/
│   ├── __init__.py
│   ├── event_emitter.py       # Core event emission logic
│   ├── analytics_service.py   # Query service for dashboard
│   └── aggregation_service.py # Rollup computation logic
└── tasks/
    ├── __init__.py
    └── scheduler.py           # Background job scheduler

/app/frontend/src/
├── services/
│   └── analytics.js           # Frontend analytics client
└── pages/
    └── AnalyticsDashboard.js  # Admin analytics UI
```

## Testing

**Backend:**
```bash
# Test event tracking
curl -X POST http://localhost:8001/api/events/track \
  -H "Content-Type: application/json" \
  -d '{"event_type": "listing.viewed", "listing_id": "123", "metadata": {"source": "search"}}'

# Test analytics API (requires admin auth)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/api/analytics/realtime
```

**Frontend:**
```javascript
// In browser console
import analytics from './services/analytics';
analytics.track('test.event', { test: true });
analytics.flush();
```

## Security & Privacy

- IP addresses are hashed before storage
- No raw PII stored in events
- Admin authentication required for analytics APIs
- Events cannot be modified after insertion
- 90-day retention with automatic cleanup
- Separate from transactional data
