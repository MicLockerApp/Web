/**
 * MicLocker website → app backend (api.miclockerapp.com).
 *
 * The website's pages were written against a different (retired) backend.
 * This file keeps the same exported function names the pages already call
 * and translates each call to the app backend, reshaping responses into the
 * fields the pages read. That keeps the pages (and the site's look) intact.
 *
 * Every function resolves to `{ data }`, like axios, because that is what the
 * pages expect.
 *
 * Features the app backend does not have (cart, offers, trades, gig board,
 * venue bookings, Top 8 fans, web admin/employees, analytics) are hidden in
 * the UI. Their API objects below reject with a clear message in case
 * anything still calls them.
 */
import axios from 'axios';
import {
  categoryByLabel, categoryLabelForKey, categoryKeyForLabel,
  conditionLabelForKey, conditionKeyForLabel,
} from '../constants/gear';

export const API_BASE_URL = (process.env.REACT_APP_API_URL || 'https://api.miclockerapp.com').replace(/\/$/, '');

// ── Tokens ────────────────────────────────────────────────────────────────────
// Access tokens last 30 minutes; refresh tokens are single-use and rotate.
// Same approach as the iOS/Android apps (getValidToken).

const ACCESS_KEY = 'token';
const REFRESH_KEY = 'refresh_token';

export const tokenStore = {
  access: () => { try { return localStorage.getItem(ACCESS_KEY); } catch { return null; } },
  refresh: () => { try { return localStorage.getItem(REFRESH_KEY); } catch { return null; } },
  set: (access, refresh) => {
    try {
      if (access) localStorage.setItem(ACCESS_KEY, access);
      if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    } catch { /* storage unavailable */ }
  },
  clear: () => {
    try {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem('user');
    } catch { /* storage unavailable */ }
  },
};

const jwtExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp || 0;
  } catch {
    return 0;
  }
};

const raw = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });

let refreshInFlight = null;

const refreshTokens = async () => {
  const refresh = tokenStore.refresh();
  if (!refresh) throw new Error('No refresh token');
  if (!refreshInFlight) {
    refreshInFlight = raw.post('/auth/refresh', { refresh_token: refresh })
      .then(res => {
        tokenStore.set(res.data.access_token, res.data.refresh_token);
        return res.data.access_token;
      })
      .catch(err => {
        // Only a real auth rejection signs the user out; network blips don't.
        const status = err.response?.status;
        if (status === 401 || status === 403) tokenStore.clear();
        throw err;
      })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
};

export const getValidToken = async () => {
  const access = tokenStore.access();
  if (!access) return null;
  if (jwtExpiry(access) - Date.now() / 1000 > 60) return access;
  try {
    return await refreshTokens();
  } catch {
    return tokenStore.access();
  }
};

const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use(async (config) => {
  const token = await getValidToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const cfg = error.config || {};
    const url = cfg.url || '';
    const isAuthEndpoint = url.startsWith('/auth/login') || url.startsWith('/auth/register')
      || url.startsWith('/auth/refresh') || url.startsWith('/auth/forgot') || url.startsWith('/auth/verify-reset')
      || url.startsWith('/auth/reset');
    if (error.response?.status === 401 && !isAuthEndpoint && tokenStore.refresh() && !cfg._retried) {
      try {
        const token = await refreshTokens();
        cfg._retried = true;
        cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` };
        return api(cfg);
      } catch { /* fall through */ }
    }
    // Session truly expired: sign out and send to login. Logged-out visitors
    // hitting a members-only endpoint just get the error.
    if (error.response?.status === 401 && !isAuthEndpoint && cfg.headers?.Authorization) {
      tokenStore.clear();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const isLoggedIn = () => !!tokenStore.access();

const ok = (data) => ({ data });
const unsupported = (feature) => () => Promise.reject({
  response: { data: { detail: `${feature} isn't available on the website yet. Use the MicLocker app.` } },
});
const cents = (n) => (typeof n === 'number' ? n / 100 : null);
const toCents = (n) => Math.round(parseFloat(n) * 100);

// ── Normalizers (app shape → the shape the website's pages read) ─────────────

export const normalizeProfile = (p) => {
  if (!p) return null;
  const addressParts = [p.address_street, p.address_apartment].filter(Boolean);
  return {
    ...p,
    id: p.user_id,
    user_id: p.user_id,
    profile_id: p.id,
    username: p.handle,
    handle: p.handle,
    display_name: p.display_name,
    profile_image: p.avatar_url,
    email: p.email_contact || null,
    show_email: !!p.email_contact,
    phone: p.phone_number || null,
    phone_number: p.phone_number || null,
    show_phone: !!p.phone_number,
    spotify: p.spotify_playlist_url || null,
    spotify_embed_url: p.spotify_playlist_url || null,
    show_social: !!(p.spotify_playlist_url),
    coordinates: (p.lat != null && p.lng != null) ? { lat: p.lat, lng: p.lng } : null,
    physical_address: (p.address_city || p.address_state) ? {
      address_line1: addressParts.join(' ') || null,
      city: p.address_city, state: p.address_state, postal_code: p.address_zipcode, country: 'US',
    } : null,
    show_physical_address: !!(p.show_location_on_map && p.address_city),
    shipping_address: p.mailing_address_street || p.address_street ? {
      full_name: [p.first_name, p.last_name].filter(Boolean).join(' '),
      address_line1: p.mailing_same_as_physical ? p.address_street : p.mailing_address_street,
      address_line2: p.mailing_same_as_physical ? p.address_apartment : p.mailing_address_apartment,
      city: p.mailing_same_as_physical ? p.address_city : p.mailing_address_city,
      state: p.mailing_same_as_physical ? p.address_state : p.mailing_address_state,
      postal_code: p.mailing_same_as_physical ? p.address_zipcode : p.mailing_address_zipcode,
      country: 'US',
    } : null,
    show_address: false,
    sub_categories: p.sub_categories || [],
    rating: null,
    review_count: 0,
  };
};

export const normalizeUser = (me) => {
  if (!me) return null;
  const profile = normalizeProfile(me.profile) || {};
  return {
    ...profile,
    id: me.id,
    user_id: me.id,
    email: me.email,
    pending_email: me.pending_email,
    date_of_birth: me.date_of_birth,
    age_verified_at: me.age_verified_at,
    terms_accepted_at: me.terms_accepted_at,
    is_active: me.is_active,
    is_admin: false,
    is_employee: false,
    raw_profile: me.profile,
  };
};

const listingMedia = (images, coverUrl) => {
  if (images && images.length) {
    return [...images]
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img, idx) => ({ id: img.id, media_id: img.media_id, url: img.url, media_type: 'image', is_primary: idx === 0 }));
  }
  return coverUrl ? [{ id: 'cover', url: coverUrl, media_type: 'image', is_primary: true }] : [];
};

export const normalizeListing = (l) => {
  if (!l) return null;
  const media = listingMedia(l.images, l.cover_image_url);
  return {
    ...l,
    price: cents(l.price_cents),
    condition_key: l.condition,
    condition: conditionLabelForKey(l.condition),
    category_key: l.category,
    category: categoryLabelForKey(l.category),
    media,
    images: media.map(m => m.url),
    status: l.status || 'active',
    seller_id: l.seller?.user_id,
    seller_username: l.seller?.handle,
    seller_display_name: l.seller?.display_name,
    seller_profile_image: l.seller?.avatar_url,
    seller_rating: null,
    quantity: 1,
    sold_quantity: l.status === 'sold' ? 1 : 0,
    shipping: null,
  };
};

const ORDER_STATUS = (o) => {
  if (o.refund_status === 'full') return 'refunded';
  if (o.payment_status === 'canceled' || o.payment_status === 'failed') return 'cancelled';
  if (o.payment_status === 'pending') return 'pending';
  if (o.fulfillment_status === 'delivered') return 'delivered';
  if (o.fulfillment_status === 'shipped') return 'shipped';
  return 'paid';
};

export const normalizeOrder = (o) => {
  if (!o) return null;
  const listing = o.listing || {};
  return {
    ...o,
    order_number: String(o.id).slice(0, 8).toUpperCase(),
    status: ORDER_STATUS(o),
    items: [{
      listing_id: o.listing_id || listing.id,
      title: listing.title || 'Listing',
      price: cents(o.amount_cents),
      quantity: 1,
      image: listing.cover_image_url,
      seller_id: o.seller_id,
      seller_username: o.seller?.handle,
    }],
    subtotal: cents(o.amount_cents),
    shipping_total: cents(o.shipping_cents || 0),
    tax_total: cents(o.tax_cents || 0),
    total: cents(o.total_due_cents ?? o.amount_cents),
    seller_payout_amount: cents(o.seller_amount_cents),
    platform_fee: cents(o.platform_fee_cents),
    buyer_username: o.buyer?.handle,
    seller_username: o.seller?.handle,
    shipping_address: o.buyer_mailing_street ? {
      full_name: o.buyer_mailing_name,
      address_line1: o.buyer_mailing_street,
      address_line2: o.buyer_mailing_apartment,
      city: o.buyer_mailing_city,
      state: o.buyer_mailing_state,
      postal_code: o.buyer_mailing_zipcode,
      country: 'US',
    } : null,
    tracking_info: o.tracking_number ? { tracking_number: o.tracking_number, carrier: null } : null,
  };
};

// ── Listing cache for client-side search (the backend feed has category +
//    cursor only; keyword/price/condition filtering happens here). ───────────

const FEED_PAGE = 50;
const FEED_MAX_PAGES = 6; // up to 300 newest active listings
let feedCache = { at: 0, key: '', items: [] };

const fetchFeed = async (categoryKey) => {
  const key = `${isLoggedIn() ? 'auth' : 'pub'}:${categoryKey || ''}`;
  if (feedCache.key === key && Date.now() - feedCache.at < 60_000) return feedCache.items;
  const path = isLoggedIn() ? '/gear' : '/public/gear';
  const client = isLoggedIn() ? api : raw;
  let cursor = null;
  const items = [];
  for (let i = 0; i < FEED_MAX_PAGES; i += 1) {
    const params = { limit: FEED_PAGE };
    if (categoryKey) params.category = categoryKey;
    if (cursor) params.cursor = cursor;
    const res = await client.get(path, { params });
    items.push(...res.data.items);
    cursor = res.data.next_cursor;
    if (!cursor) break;
  }
  feedCache = { at: Date.now(), key, items };
  return items;
};

const fetchListingsForCategoryLabel = async (label) => {
  const cat = label ? categoryByLabel(label) : null;
  if (!cat) return fetchFeed(null);
  const lists = await Promise.all(cat.keys.map(k => fetchFeed(k)));
  // fetchFeed caches only the last key; merge and de-dupe.
  const seen = new Set();
  return lists.flat().filter(l => (seen.has(l.id) ? false : seen.add(l.id)))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

// ── Favorites (the backend saves them but has no "list my favorites"
//    endpoint, so the website remembers them in this browser, like iOS). ─────

const favKey = () => `ml_favorites_${(() => { try { return JSON.parse(localStorage.getItem('user') || '{}').id || 'anon'; } catch { return 'anon'; } })()}`;
const readFavs = () => { try { return new Set(JSON.parse(localStorage.getItem(favKey()) || '[]')); } catch { return new Set(); } };
const writeFavs = (set) => { try { localStorage.setItem(favKey(), JSON.stringify([...set])); } catch { /* ignore */ } };

// ── Media upload (same 3-step pipeline as the apps) ──────────────────────────

export const uploadMedia = async (file, source = 'profile') => {
  const { data: slot } = await api.post('/media/upload-url', {
    content_type: file.type || 'image/jpeg',
    size_bytes: file.size,
    source,
  });
  await axios.put(slot.upload_url, file, { headers: { 'Content-Type': file.type || 'image/jpeg' } });
  const { data: media } = await api.post(`/media/${slot.media_id}/confirm`, {});
  return { media_id: slot.media_id, url: media.url };
};

// ── Auth ──────────────────────────────────────────────────────────────────────

const storeSession = (data) => {
  tokenStore.set(data.access_token, data.refresh_token);
  return data;
};

export const authAPI = {
  // `identifier` is the email address (the app backend logs in by email).
  login: async (identifier, password) => {
    const res = await raw.post('/auth/login', { email: String(identifier).trim(), password });
    return ok(storeSession(res.data));
  },
  register: async ({ email, first_name, last_name, date_of_birth, password }) => {
    const res = await raw.post('/auth/register', { email, first_name, last_name, date_of_birth, password });
    return ok(storeSession(res.data));
  },
  logout: async () => {
    const refresh = tokenStore.refresh();
    try { if (refresh) await raw.post('/auth/logout', { refresh_token: refresh }); } catch { /* ignore */ }
    tokenStore.clear();
    return ok({});
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return ok(normalizeUser(res.data));
  },
  acceptTerms: () => api.post('/auth/accept-terms'),
  requestPasswordReset: (email) => raw.post('/auth/forgot-password', { email }),
  // Two-step on the app backend: code → reset token → new password.
  checkResetCode: async (email, code) => {
    const res = await raw.post('/auth/verify-reset-code', { email, code });
    try { sessionStorage.setItem('ml_reset_token', res.data.reset_token); } catch { /* ignore */ }
    return ok({ valid: true, reset_token: res.data.reset_token });
  },
  verifyResetCode: async (email, code, newPassword) => {
    let token = null;
    try { token = sessionStorage.getItem('ml_reset_token'); } catch { /* ignore */ }
    if (!token) {
      const res = await raw.post('/auth/verify-reset-code', { email, code });
      token = res.data.reset_token;
    }
    await raw.post('/auth/reset-password', { reset_token: token, new_password: newPassword, confirm_password: newPassword });
    try { sessionStorage.removeItem('ml_reset_token'); } catch { /* ignore */ }
    return ok({ success: true });
  },
  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { old_password: currentPassword, new_password: newPassword, confirm_password: newPassword }),
  requestEmailChange: (newEmail) => api.post('/auth/email-change/request', { new_email: newEmail }),
  // Account deletion -- same two calls the apps make. The preview says
  // whether the account can be deleted right now (sold orders still in
  // progress block it) and how many active listings will be removed.
  getDeletionPreview: () => api.get('/auth/me/deletion-preview'),
  deleteAccount: () => api.delete('/auth/me'),
  verifyEmailChange: (code) => api.post('/auth/email-change/confirm', { code }),
  getCategories: async () => {
    const { PRO_CATEGORIES } = await import('../constants/roles');
    return ok({ categories: PRO_CATEGORIES });
  },
};

// ── Profiles / users ─────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getProfileByHandle = async (handle) => {
  const clean = String(handle).replace(/^@/, '');
  const res = isLoggedIn()
    ? await api.get(`/profiles/${encodeURIComponent(clean)}`)
    : await raw.get(`/public/profiles/${encodeURIComponent(clean)}`);
  return normalizeProfile(res.data);
};

export const usersAPI = {
  // Profiles are addressed by @handle on the app backend.
  getProfile: async (handleOrMe) => {
    if (handleOrMe === 'me') return ok(normalizeProfile((await api.get('/profiles/me')).data));
    return ok(await getProfileByHandle(handleOrMe));
  },
  getProfileByUsername: async (username) => ok(await getProfileByHandle(username)),
  getMyProfile: async () => ok(normalizeProfile((await api.get('/profiles/me')).data)),
  updateProfile: async (patch) => ok(normalizeProfile((await api.patch('/profiles/me', patch)).data)),
  uploadProfileImage: async (file) => {
    const { media_id } = await uploadMedia(file, 'profile');
    const res = await api.patch('/profiles/me', { avatar_media_id: media_id });
    return ok({ profile_image: res.data.avatar_url, profile: normalizeProfile(res.data) });
  },
  searchUsers: async ({ q, limit = 20 }) => {
    if (!isLoggedIn() || !q) return ok({ users: [] });
    const res = await api.get('/profiles/search', { params: { q, limit } });
    return ok({
      users: res.data.map(u => ({
        id: u.user_id, user_id: u.user_id, username: u.handle, handle: u.handle,
        display_name: u.display_name, profile_image: u.avatar_url,
      })),
    });
  },
  // Accepts a handle (or a user id when already known).
  getUserListings: async (handleOrId, params = {}) => {
    let userId = handleOrId;
    if (!UUID_RE.test(String(handleOrId))) userId = (await getProfileByHandle(handleOrId)).user_id;
    const path = isLoggedIn() ? `/users/${userId}/gear` : `/public/users/${userId}/gear`;
    const client = isLoggedIn() ? api : raw;
    const res = await client.get(path, { params: { limit: Math.min(params.limit || 50, 50) } });
    const listings = res.data.items.map(normalizeListing);
    return ok({ listings, total: listings.length });
  },
  getUserReviews: async (handle) => {
    if (!isLoggedIn() || UUID_RE.test(String(handle))) return ok({ reviews: [], average_rating: null, review_count: 0 });
    const res = await api.get(`/profiles/${encodeURIComponent(String(handle).replace(/^@/, ''))}/reviews`);
    return ok({
      reviews: (res.data.reviews || []).map((r, i) => ({
        id: `${r.order_id}-${i}`,
        rating: r.rating,
        comment: r.body,
        listing_title: r.listing_title,
        created_at: r.created_at,
        reviewer_id: r.reviewer?.handle,
        reviewer_username: r.reviewer?.handle,
        reviewer_profile_image: r.reviewer?.avatar_url,
        reviewer_role: 'buyer',
      })),
      average_rating: res.data.average_rating,
      review_count: res.data.review_count,
    });
  },
  getFavorites: async () => {
    const ids = [...readFavs()];
    const results = await Promise.all(ids.map(id => listingsAPI.getById(id).then(r => r.data).catch(() => null)));
    const listings = results.filter(Boolean);
    return ok({ listings, total: listings.length });
  },
  addFavorite: async (listingId) => {
    await api.post(`/gear/${listingId}/favorite`);
    const s = readFavs(); s.add(listingId); writeFavs(s);
    return ok({ is_favorite: true });
  },
  removeFavorite: async (listingId) => {
    await api.delete(`/gear/${listingId}/favorite`);
    const s = readFavs(); s.delete(listingId); writeFavs(s);
    return ok({ is_favorite: false });
  },
  checkFavorite: async (listingId) => ok({ is_favorite: readFavs().has(listingId) }),
  changePassword: ({ current_password, new_password }) => authAPI.changePassword(current_password, new_password),
  changeEmail: ({ new_email }) => authAPI.requestEmailChange(new_email),
  fan: (handle) => api.post(`/profiles/${encodeURIComponent(handle)}/fan`),
  unfan: (handle) => api.delete(`/profiles/${encodeURIComponent(handle)}/fan`),
  getMapPins: async () => {
    if (!isLoggedIn()) return ok([]);
    const res = await api.get('/profiles/map');
    return ok(res.data);
  },
};

// ── Search ────────────────────────────────────────────────────────────────────

const matchesQuery = (l, q) => {
  if (!q) return true;
  const hay = [l.title, l.brand, l.description, l.location, categoryLabelForKey(l.category)].filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
};

export const searchAPI = {
  globalSearch: async (q, limit = 5) => {
    const [items, users] = await Promise.all([
      fetchFeed(null).catch(() => []),
      usersAPI.searchUsers({ q, limit }).then(r => r.data.users).catch(() => []),
    ]);
    const listings = items.filter(l => matchesQuery(l, q)).slice(0, limit).map(normalizeListing);
    return ok({ listings, users });
  },
};

// ── Listings ─────────────────────────────────────────────────────────────────

export const listingsAPI = {
  search: async (params = {}) => {
    const items = await fetchListingsForCategoryLabel(params.category);
    let results = items.filter(l => matchesQuery(l, params.q));
    if (params.condition) {
      const key = conditionKeyForLabel(params.condition);
      results = results.filter(l => l.condition === key);
    }
    if (params.min_price != null && params.min_price !== '') results = results.filter(l => l.price_cents >= toCents(params.min_price));
    if (params.max_price != null && params.max_price !== '') results = results.filter(l => l.price_cents <= toCents(params.max_price));
    const sort = params.sort_by || 'created_at';
    if (sort === 'price_low' || sort === 'price_asc') results.sort((a, b) => a.price_cents - b.price_cents);
    else if (sort === 'price_high' || sort === 'price_desc') results.sort((a, b) => b.price_cents - a.price_cents);
    const limit = params.limit || 24;
    const page = params.page || 1;
    const total = results.length;
    const listings = results.slice((page - 1) * limit, page * limit).map(normalizeListing);
    return ok({ listings, total, pages: Math.max(1, Math.ceil(total / limit)), page });
  },
  getFeatured: async (limit = 8) => {
    const items = await fetchFeed(null);
    const featured = items.filter(l => l.is_featured);
    const list = (featured.length ? featured : items).slice(0, limit).map(normalizeListing);
    return ok({ listings: list });
  },
  getRecent: async (limit = 12) => {
    const items = await fetchFeed(null);
    return ok({ listings: items.slice(0, limit).map(normalizeListing) });
  },
  getCount: async () => {
    const items = await fetchFeed(null).catch(() => []);
    return ok({ active_listings: items.length, total_users: null, promo_eligible: false, promo_spots_remaining: 0 });
  },
  getById: async (id) => {
    const res = isLoggedIn() ? await api.get(`/gear/${id}`) : await raw.get(`/public/gear/${id}`);
    return ok(normalizeListing(res.data));
  },
  getSellerListings: (userId, params) => usersAPI.getUserListings(userId, params),
  // data: { title, brand, price, condition (label or key), category (label or key),
  //         location, description, image_media_ids, accepts_offers, willing_to_trade }
  create: async (data) => {
    const res = await api.post('/gear', listingPayload(data));
    feedCache.at = 0;
    return ok(normalizeListing(res.data));
  },
  update: async (id, data) => {
    const res = await api.patch(`/gear/${id}`, listingPayload(data, true));
    feedCache.at = 0;
    return ok(normalizeListing(res.data));
  },
  delete: async (id) => {
    await api.delete(`/gear/${id}`);
    feedCache.at = 0;
    return ok({});
  },
  getMine: async (userId) => usersAPI.getUserListings(userId, { limit: 50 }),
  messageSeller: async (listingId) => ok((await api.post(`/gear/${listingId}/message-seller`)).data),
  getCheckoutQuote: async (listingId) => ok((await api.get(`/gear/${listingId}/checkout-quote`)).data),
  createPaymentIntent: async (listingId) => ok((await api.post(`/gear/${listingId}/payment-intent`, {})).data),
};

function listingPayload(d, partial = false) {
  const out = {};
  const set = (k, v) => { if (v !== undefined && (!partial || v !== null)) out[k] = v; };
  set('title', d.title);
  set('brand', d.brand || null);
  if (d.price !== undefined && d.price !== '') set('price_cents', toCents(d.price));
  if (d.condition) set('condition', conditionKeyForLabel(d.condition) || d.condition);
  if (d.category) set('category', categoryKeyForLabel(d.category) || d.category);
  set('location', d.location || null);
  set('description', d.description || null);
  if (d.image_media_ids) set('image_media_ids', d.image_media_ids);
  if (d.accepts_offers !== undefined) set('accepts_offers', !!d.accepts_offers);
  if (d.willing_to_trade !== undefined) set('willing_to_trade', !!d.willing_to_trade);
  return out;
}

// ── Messages ─────────────────────────────────────────────────────────────────

const normalizeThread = (c, meId) => ({
  id: c.id,
  other_user: {
    id: c.other_participant?.user_id,
    username: c.other_participant?.handle,
    display_name: c.other_participant?.display_name,
    profile_image: c.other_participant?.avatar_url,
  },
  other_user_id: c.other_participant?.user_id,
  other_username: c.other_participant?.handle,
  other_profile_image: c.other_participant?.avatar_url,
  other_user_avatar: c.other_participant?.avatar_url,
  last_message: c.last_message_body,
  last_message_at: c.last_message_at || c.created_at,
  unread_count: (c.last_message_sender_id && c.last_message_sender_id !== meId && c.last_message_is_read === false) ? 1 : 0,
  created_at: c.created_at,
});

const normalizeMessage = (m) => ({
  id: m.id,
  thread_id: m.conversation_id,
  sender_id: m.sender_id,
  content: m.body,
  is_read: m.is_read,
  created_at: m.created_at,
  images: (m.attachments || []).filter(a => (a.content_type || '').startsWith('image')).map(a => a.url),
  attachments: m.attachments || [],
});

const myId = () => { try { return JSON.parse(localStorage.getItem('user') || '{}').id; } catch { return null; } };

export const messagesAPI = {
  getThreads: async () => {
    const res = await api.get('/conversations');
    return ok({ threads: res.data.items.map(c => normalizeThread(c, myId())) });
  },
  getThread: async (threadId) => {
    const [msgs] = await Promise.all([
      api.get(`/conversations/${threadId}/messages`, { params: { limit: 100 } }),
    ]);
    api.post(`/conversations/${threadId}/read`).catch(() => {});
    const messages = msgs.data.items.map(normalizeMessage)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return ok({ messages, thread_id: threadId });
  },
  // Find-or-create the 1:1 conversation, then send. `images` are File objects.
  send: async (recipientId, content, _listingId = null, images = null) => {
    const conv = await api.post('/conversations', { recipient_id: recipientId });
    let attachment_media_ids = [];
    if (images && images.length) {
      const files = images.filter(f => f instanceof Blob);
      attachment_media_ids = (await Promise.all(files.map(f => uploadMedia(f, 'message')))).map(u => u.media_id);
    }
    const res = await api.post(`/conversations/${conv.data.id}/messages`, { body: content || '', attachment_media_ids });
    return ok({ ...normalizeMessage(res.data), thread_id: conv.data.id });
  },
  sendToThread: async (threadId, content) => {
    const res = await api.post(`/conversations/${threadId}/messages`, { body: content, attachment_media_ids: [] });
    return ok(normalizeMessage(res.data));
  },
  getUnreadCount: async () => {
    const res = await api.get('/conversations');
    const me = myId();
    const n = res.data.items.filter(c => c.last_message_sender_id && c.last_message_sender_id !== me && c.last_message_is_read === false).length;
    return ok({ unread_count: n });
  },
  markThreadRead: (threadId) => api.post(`/conversations/${threadId}/read`),
  deleteMessage: unsupported('Deleting messages'),
  deleteThread: unsupported('Deleting conversations'),
};

// ── Orders ───────────────────────────────────────────────────────────────────

export const ordersAPI = {
  getAll: async () => {
    const res = await api.get('/orders/buyer');
    const list = Array.isArray(res.data) ? res.data : [res.data];
    return ok({ orders: list.map(normalizeOrder) });
  },
  getSales: async () => {
    const res = await api.get('/orders/seller/dashboard');
    const d = res.data;
    const orders = [...(d.purchased || []), ...(d.en_route || []), ...(d.delivered || [])].map(normalizeOrder)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return ok({ orders, for_sale: d.for_sale || [] });
  },
  getById: async (id) => ok(normalizeOrder((await api.get(`/orders/${id}`)).data)),
  // Seller ships: tracking number + optional shipping/handling in dollars.
  addTracking: async (orderId, { tracking_number, shipping_cost, handling_cost } = {}) =>
    ok(normalizeOrder((await api.post(`/orders/${orderId}/ship`, {
      tracking_number,
      shipping_cents: shipping_cost !== '' && shipping_cost != null ? toCents(shipping_cost) : 0,
      handling_cents: handling_cost !== '' && handling_cost != null ? toCents(handling_cost) : 0,
    })).data)),
  updateStatus: async (id, status, trackingNumber) => {
    if (status === 'shipped') return ordersAPI.addTracking(id, { tracking_number: trackingNumber });
    return unsupported('Changing order status')();
  },
  // Buyer confirms delivery. The app backend requires at least one proof
  // photo (uploaded media ids) plus a 1–5 rating and a written review.
  confirmDelivery: async (orderId, { rating, body, proofMediaIds = [] } = {}) =>
    ok(normalizeOrder((await api.post(`/orders/${orderId}/mark-delivered`, {
      delivery_proof_media_ids: proofMediaIds,
      review_rating: rating,
      review_body: body,
    })).data)),
  contactSeller: async (orderId) => ok(normalizeOrder((await api.post(`/orders/${orderId}/contact-seller`)).data)),
  dispute: async (orderId, reason) => ok(normalizeOrder((await api.post(`/orders/${orderId}/dispute`, { reason })).data)),
  sellerReview: async (orderId, rating, body) =>
    ok(normalizeOrder((await api.post(`/orders/${orderId}/seller-review`, { rating, body })).data)),
};

export const reviewsAPI = {
  // Reviews are attached to an order on the app backend.
  create: async ({ order_id, rating, comment, review_type, proof_media_ids }) => {
    if (review_type === 'seller_to_buyer') return ordersAPI.sellerReview(order_id, rating, comment);
    return ordersAPI.confirmDelivery(order_id, { rating, body: comment, proofMediaIds: proof_media_ids || [] });
  },
  getUserReviews: (handle) => usersAPI.getUserReviews(handle),
  getSellerReviews: (handle) => usersAPI.getUserReviews(handle),
  getOrderReviews: async (orderId) => {
    const o = (await api.get(`/orders/${orderId}`)).data;
    const delivered = o.fulfillment_status === 'delivered';
    return ok({
      buyer_to_seller: o.review_rating ? {
        rating: o.review_rating, comment: o.review_body, created_at: o.delivered_at || o.created_at,
        reviewer_username: o.buyer?.handle, reviewee_username: o.seller?.handle,
      } : null,
      seller_to_buyer: o.seller_review_rating ? {
        rating: o.seller_review_rating, comment: o.seller_review_body, created_at: o.seller_review_submitted_at,
        reviewer_username: o.seller?.handle, reviewee_username: o.buyer?.handle,
      } : null,
      // Buyers review as part of confirming delivery; sellers review afterwards.
      can_buyer_review: false,
      can_seller_review: delivered && !o.seller_review_rating,
    });
  },
  getById: unsupported('Review lookup'),
};

// ── Payments (Stripe Connect seller onboarding) ──────────────────────────────

export const paymentsAPI = {
  getConfig: async () => ok({ publishable_key: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || null }),
  startSellerOnboarding: async () => {
    // client=web → Stripe sends the seller back to miclockerapp.com/dashboard, not the app.
    const res = await api.post('/stripe/onboarding/start', null, { params: { client: 'web' } });
    return ok({ url: res.data.onboarding_url, onboarding_url: res.data.onboarding_url });
  },
  refreshOnboardingLink: async () => paymentsAPI.startSellerOnboarding(),
  getConnectStatus: async () => {
    const res = await api.get('/stripe/onboarding/status');
    const d = res.data;
    const ready = !!(d.charges_enabled && d.payouts_enabled);
    return ok({
      ...d,
      status: !d.stripe_account_id ? 'not_connected' : (ready ? 'connected' : 'pending'),
      can_receive_payouts: ready,
      connected: !!d.stripe_account_id,
      has_account: !!d.stripe_account_id,
      onboarding_complete: d.onboarding_complete,
      charges_enabled: d.charges_enabled,
      payouts_enabled: d.payouts_enabled,
    });
  },
  // No balance endpoint on the app backend; the dashboard hides the balance card.
  getSellerBalance: async () => ok(null),
  createCheckout: unsupported('Cart checkout'),
  // Polls the order until the Stripe webhook marks it paid.
  getStatus: async (orderId) => {
    const o = (await api.get(`/orders/${orderId}`)).data;
    return ok({ order_id: o.id, payment_status: o.payment_status, status: o.payment_status === 'failed' ? 'expired' : o.payment_status });
  },
};

// ── Notifications ────────────────────────────────────────────────────────────

export const notificationsAPI = {
  getInbox: async () => {
    const res = await api.get('/notifications/inbox');
    return ok({
      unread_count: res.data.unread_count,
      notifications: (res.data.notifications || []).map(n => ({
        id: n.id, title: n.title, message: n.body, created_at: n.created_at,
        is_read: !!n.read_at, type: n.type, payload: n.payload,
        link: n.payload?.order_id ? `/orders/${n.payload.order_id}`
          : n.payload?.listing_id ? `/listing/${n.payload.listing_id}`
          : n.payload?.conversation_id ? '/messages' : '#',
      })),
    });
  },
  markRead: (id) => api.post(`/notifications/inbox/${id}/read`),
  markAllRead: () => api.post('/notifications/inbox/read-all'),
};

// ── Support tickets and reports ──────────────────────────────────────────────

export const ticketsAPI = {
  getCategories: async () => ok((await api.get('/tickets/categories')).data),
  create: async ({ category, subject, message, order_id }) =>
    ok((await api.post('/tickets', { category, subject, message, order_id: order_id || null, attachments: [] })).data),
  getMine: async () => ok((await api.get('/tickets/my-tickets')).data),
  getById: async (id) => ok((await api.get(`/tickets/${id}`)).data),
  reply: async (id, message) => ok((await api.post(`/tickets/${id}/reply`, { message, attachments: [] })).data),
};

export const reportsAPI = {
  reportListing: (listingId, reasonCategory, detail) =>
    api.post(`/reports/gear_listing/${listingId}`, { reason_category: reasonCategory, reason_detail: detail || null }),
  reportProfile: (userId, reasonCategory, detail) =>
    api.post(`/reports/profile/${userId}`, { reason_category: reasonCategory, reason_detail: detail || null }),
};

// ── Features not on the app backend yet (hidden in the UI) ───────────────────

const unsupportedApi = (feature, names) =>
  Object.fromEntries(names.map(n => [n, unsupported(feature)]));

export const cartAPI = unsupportedApi('The cart', ['get', 'addItem', 'updateItem', 'removeItem', 'clear']);
export const offersAPI = {
  ...unsupportedApi('Offers', ['create', 'getById', 'counter', 'accept', 'decline', 'withdraw']),
  getAll: async () => ok({ offers: [] }),
};
export const tradesAPI = unsupportedApi('Trades', ['checkEligibility', 'acknowledgeRules', 'create', 'getAll', 'getById', 'respond', 'submitAddress', 'addTracking', 'confirmReceipt', 'cancel', 'openDispute']);
export const adminAPI = unsupportedApi('The admin panel', ['getAnalytics', 'getUsers', 'suspendUser', 'unsuspendUser', 'banUser', 'unbanUser', 'deleteUser', 'changeUserRole', 'resetAnalytics', 'getListings', 'removeListing', 'getOrders', 'getSettings', 'getEmployees', 'createEmployee', 'updateEmployeeDetails', 'updateEmployeeRole', 'resendSetupEmail', 'deleteEmployee']);
export const gigsAPI = unsupportedApi('The gig board', ['getCategories', 'create', 'getAll', 'getMyGigs', 'getById', 'update', 'delete']);
export const profileVisitsAPI = {
  trackVisit: async () => ok({}),
  updateTimeSpent: async () => ok({}),
  trackInteraction: async () => ok({}),
  getTopFans: async () => ok({ fans: [] }),
  getMyFanStats: async () => ok({}),
};
export const filesAPI = { upload: async (file) => ok(await uploadMedia(file, 'profile')) };

export default api;
