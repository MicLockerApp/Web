/**
 * MicLocker Analytics Client
 * 
 * Frontend analytics library with batching, Beacon API support,
 * and Google Analytics 4 integration.
 */

const ANALYTICS_CONFIG = {
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  maxQueueSize: 100,
  endpoint: '/api/events',
  debug: process.env.NODE_ENV === 'development',
};

class MicLockerAnalytics {
  constructor() {
    this.eventQueue = [];
    this.sessionId = this.getOrCreateSessionId();
    this.gaClientId = null;
    this.utmParams = this.parseUtmParams();
    this.flushTimer = null;
    this.isInitialized = false;
    
    // Bind methods
    this.track = this.track.bind(this);
    this.flush = this.flush.bind(this);
  }

  /**
   * Initialize analytics with optional GA4 measurement ID
   */
  init(options = {}) {
    if (this.isInitialized) return;
    
    const { ga4MeasurementId } = options;
    
    // Initialize GA4 if measurement ID provided
    if (ga4MeasurementId && typeof window !== 'undefined') {
      this.initGA4(ga4MeasurementId);
    }
    
    // Set up periodic flush
    this.flushTimer = setInterval(this.flush, ANALYTICS_CONFIG.flushInterval);
    
    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.flush);
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush();
        }
      });
    }
    
    this.isInitialized = true;
    this.log('Analytics initialized');
  }

  /**
   * Initialize Google Analytics 4
   */
  initGA4(measurementId) {
    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false, // We'll track manually
    });

    // Get GA client ID
    gtag('get', measurementId, 'client_id', (clientId) => {
      this.gaClientId = clientId;
      this.log('GA4 client ID:', clientId);
    });
  }

  /**
   * Get or create session ID
   */
  getOrCreateSessionId() {
    const key = 'ml_session_id';
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      sessionStorage.setItem(key, sessionId);
    }
    return sessionId;
  }

  /**
   * Parse UTM parameters from URL
   */
  parseUtmParams() {
    if (typeof window === 'undefined') return {};
    
    const params = new URLSearchParams(window.location.search);
    const utm = {};
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(key => {
      const value = params.get(key);
      if (value) utm[key.replace('utm_', '')] = value;
    });
    
    // Store UTM params for session
    if (Object.keys(utm).length > 0) {
      sessionStorage.setItem('ml_utm', JSON.stringify(utm));
    }
    
    // Return stored UTM if current URL has none
    const stored = sessionStorage.getItem('ml_utm');
    return stored ? JSON.parse(stored) : utm;
  }

  /**
   * Get device type
   */
  getDeviceType() {
    if (typeof window === 'undefined') return 'unknown';
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Track an event
   */
  track(eventType, properties = {}) {
    const event = {
      event_type: eventType,
      session_id: this.sessionId,
      device_type: this.getDeviceType(),
      referrer: document.referrer || null,
      ga_client_id: this.gaClientId,
      utm_source: this.utmParams.source,
      utm_medium: this.utmParams.medium,
      utm_campaign: this.utmParams.campaign,
      metadata: properties,
      timestamp: new Date().toISOString(),
      ...properties, // Allow overriding
    };

    // Also send to GA4 if available
    if (window.gtag) {
      window.gtag('event', eventType.replace('.', '_'), {
        ...properties,
        session_id: this.sessionId,
      });
    }

    this.eventQueue.push(event);
    this.log('Event queued:', eventType, properties);

    // Flush if queue is full
    if (this.eventQueue.length >= ANALYTICS_CONFIG.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush event queue
   */
  flush() {
    if (this.eventQueue.length === 0) return;

    const events = this.eventQueue.splice(0, ANALYTICS_CONFIG.maxQueueSize);
    const payload = JSON.stringify({
      events,
      session_id: this.sessionId,
      ga_client_id: this.gaClientId,
    });

    this.log('Flushing', events.length, 'events');

    // Try Beacon API first (non-blocking)
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon(`${ANALYTICS_CONFIG.endpoint}/beacon`, blob);
      if (sent) {
        this.log('Events sent via Beacon');
        return;
      }
    }

    // Fallback to fetch
    fetch(`${ANALYTICS_CONFIG.endpoint}/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }),
      },
      body: payload,
      keepalive: true, // Allow request to outlive page
    }).catch(err => {
      this.log('Flush error:', err);
      // Re-queue events on failure
      this.eventQueue.unshift(...events);
    });
  }

  /**
   * Debug logger
   */
  log(...args) {
    if (ANALYTICS_CONFIG.debug) {
      console.log('[Analytics]', ...args);
    }
  }

  // ============= Convenience Methods =============

  pageView(pageName, properties = {}) {
    this.track('page.view', { page_name: pageName, ...properties });
  }

  searchPerformed(query, resultCount, filters = {}) {
    this.track('search.performed', {
      query,
      result_count: resultCount,
      filters,
    });
  }

  listingViewed(listingId, price, category, sellerId, source = 'direct') {
    this.track('listing.viewed', {
      listing_id: listingId,
      listing_price: price,
      category,
      seller_id: sellerId,
      source,
    });
  }

  listingFavorited(listingId) {
    this.track('listing.favorited', { listing_id: listingId });
  }

  listingUnfavorited(listingId) {
    this.track('listing.unfavorited', { listing_id: listingId });
  }

  listingShared(listingId, platform) {
    this.track('listing.shared', {
      listing_id: listingId,
      share_platform: platform,
    });
  }

  addToCart(listingId, price, quantity, category, fromSearch = false) {
    this.track('cart.item_added', {
      listing_id: listingId,
      listing_price: price,
      quantity,
      category,
      from_search: fromSearch,
    });
  }

  removeFromCart(listingId) {
    this.track('cart.item_removed', { listing_id: listingId });
  }

  checkoutStarted(cartTotal, itemCount, fromOffer = false) {
    this.track('checkout.started', {
      cart_total: cartTotal,
      item_count: itemCount,
      from_offer: fromOffer,
    });
  }

  purchaseCompleted(orderId, total, items) {
    this.track('purchase.completed', {
      order_id: orderId,
      total,
      item_count: items.length,
      items: items.map(i => ({ id: i.id, price: i.price })),
    });
  }

  offerCreated(offerId, listingId, offerPrice, listingPrice) {
    this.track('offer.created', {
      offer_id: offerId,
      listing_id: listingId,
      offer_price: offerPrice,
      listing_price: listingPrice,
    });
  }

  offerAccepted(offerId, finalPrice) {
    this.track('offer.accepted', {
      offer_id: offerId,
      final_price: finalPrice,
    });
  }

  messageSent(threadId, recipientId) {
    this.track('message.sent', {
      message_thread_id: threadId,
      target_user_id: recipientId,
    });
  }

  userRegistered(category) {
    this.track('user.registered', { category });
  }

  userLoggedIn() {
    this.track('user.logged_in', {});
  }
}

// Create singleton instance
const analytics = new MicLockerAnalytics();

export default analytics;
export { MicLockerAnalytics };
