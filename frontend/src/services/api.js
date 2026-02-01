import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on login/register failures - let the component handle those
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                           error.config?.url?.includes('/auth/register');
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  // New email verification signup flow
  sendVerification: (data) => api.post('/auth/register/send-verification', data),
  verifyEmail: (data) => api.post('/auth/register/verify-email', data),
  resendVerification: (data) => api.post('/auth/register/resend-verification', data),
  checkVerification: (email, code) => api.get('/auth/register/check-verification', { params: { email, code } }),
  login: (username, password) => 
    api.post(`/auth/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`),
  getMe: () => api.get('/auth/me'),
  completeProfile: (data) => api.post('/auth/complete-profile', data),
  getCategories: () => api.get('/auth/categories'),
  // Password reset
  requestPasswordReset: (email) => api.post('/auth/forgot-password', { email }),
  verifyResetCode: (email, code, newPassword) => api.post('/auth/verify-reset-code', { 
    email, 
    code, 
    new_password: newPassword 
  }),
  checkResetCode: (email, code) => api.get('/auth/check-reset-code', { params: { email, code } }),
  // Employee password setup
  verifySetupToken: (email, token) => api.get('/auth/verify-setup-token', { params: { email, token } }),
  setupEmployeePassword: (email, token, newPassword) => 
    api.post(`/auth/setup-employee-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}&new_password=${encodeURIComponent(newPassword)}`),
  // Account settings (change username/email/password)
  changeUsername: (newUsername, password) => 
    api.post('/auth/account/change-username', { new_username: newUsername, password }),
  requestEmailChange: (newEmail, password) => 
    api.post('/auth/account/change-email/request', { new_email: newEmail, password }),
  verifyEmailChange: (code) => 
    api.post('/auth/account/change-email/verify', { code }),
  resendEmailChangeCode: () => 
    api.post('/auth/account/change-email/resend'),
  getPendingEmailChange: () => 
    api.get('/auth/account/pending-email-change'),
  cancelEmailChange: () => 
    api.delete('/auth/account/pending-email-change'),
  changePassword: (currentPassword, newPassword) => 
    api.post('/auth/account/change-password', { current_password: currentPassword, new_password: newPassword }),
  deleteAccount: (username, password) =>
    api.delete('/auth/account/delete', { data: { username, password } }),
};

// Users APIs
export const usersAPI = {
  getProfile: (userId) => api.get(`/users/profile/${userId}`),
  getProfileByUsername: (username) => api.get(`/users/profile/by-username/${username}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/profile/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  changeEmail: (data) => api.put('/users/profile/email', data),
  changePassword: (data) => api.put('/users/profile/password', data),
  searchUsers: (params) => api.get('/users/search', { params }),
  getUserListings: (userId, params) => api.get(`/users/${userId}/listings`, { params }),
  getUserReviews: (userId, params) => api.get(`/reviews/user/${userId}`, { params }),
  // Listing Favorites
  getFavorites: (params) => api.get('/users/favorites/list', { params }),
  addFavorite: (listingId) => api.post(`/users/favorites/${listingId}`),
  removeFavorite: (listingId) => api.delete(`/users/favorites/${listingId}`),
  checkFavorite: (listingId) => api.get(`/users/favorites/check/${listingId}`),
  // Video Favorites
  getVideoFavorites: () => api.get('/auditions/favorites'),
  addVideoFavorite: (auditionId) => api.post(`/auditions/${auditionId}/favorite`),
  removeVideoFavorite: (auditionId) => api.delete(`/auditions/${auditionId}/favorite`),
  checkVideoFavorite: (auditionId) => api.get(`/auditions/${auditionId}/favorite/check`),
  // Profile Media (photos & videos)
  getProfileMedia: (userId) => api.get(`/profile/media/${userId}`),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/media/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadVideo: (file, { category, subcategory, genre, description, songName }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (subcategory) formData.append('subcategory', subcategory);
    if (genre) formData.append('genre', genre);
    if (description) formData.append('description', description);
    if (songName) formData.append('song_name', songName);
    return api.post('/profile/media/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateVideo: (mediaId, data) => api.patch(`/profile/media/video/${mediaId}`, data),
  selectAuditionVideos: (videoIds) => api.post('/profile/media/auditions/select', { video_ids: videoIds }),
  deleteMedia: (mediaId) => api.delete(`/profile/media/${mediaId}`),
};

// Global Search API (searches both listings and users)
export const searchAPI = {
  globalSearch: (q, limit = 5) => api.get('/search/global', { params: { q, limit } }),
};

// Listings APIs
export const listingsAPI = {
  getCategories: () => api.get('/listings/categories'),
  search: (params) => api.get('/listings', { params }),
  getFeatured: (limit = 8) => api.get('/listings/featured', { params: { limit } }),
  getRecent: (limit = 12) => api.get('/listings/recent', { params: { limit } }),
  getCount: () => api.get('/listings/stats/count'),
  getById: (id) => api.get(`/listings/${id}`),
  create: (data) => api.post('/listings', data),
  update: (id, data) => api.put(`/listings/${id}`, data),
  delete: (id) => api.delete(`/listings/${id}`),
  addMedia: (id, formData, isPrimary = false) => 
    api.post(`/listings/${id}/media?is_primary=${isPrimary}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  removeMedia: (listingId, mediaId) => api.delete(`/listings/${listingId}/media/${mediaId}`),
};

// Cart APIs
export const cartAPI = {
  get: () => api.get('/cart'),
  addItem: (listingId, quantity = 1) => 
    api.post('/cart/items', { listing_id: listingId, quantity }),
  updateItem: (itemId, quantity) => api.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete('/cart'),
};

// Orders APIs
export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getSales: (params) => api.get('/orders/sales', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status, trackingNumber) => 
    api.put(`/orders/${id}/status`, { status, tracking_number: trackingNumber }),
  // Tracking
  addTracking: (orderId, trackingData) => api.put(`/orders/${orderId}/tracking`, trackingData),
  getTracking: (orderId) => api.get(`/orders/${orderId}/tracking`),
  // Delivery confirmation
  confirmDelivery: (orderId) => api.post(`/orders/${orderId}/confirm-delivery`),
};

// Offers APIs
export const offersAPI = {
  create: (data) => api.post('/offers', data),
  getAll: (type = 'received', params = {}) => 
    api.get('/offers', { params: { type, ...params } }),
  getById: (id) => api.get(`/offers/${id}`),
  counter: (id, counterPrice, message) => 
    api.post(`/offers/${id}/counter`, { counter_price: counterPrice, message }),
  accept: (id) => api.post(`/offers/${id}/accept`),
  decline: (id) => api.post(`/offers/${id}/decline`),
  withdraw: (id) => api.post(`/offers/${id}/withdraw`),
};

// Messages APIs
export const messagesAPI = {
  send: (recipientId, content, listingId = null, images = null) => 
    api.post('/messages', { recipient_id: recipientId, content, listing_id: listingId, images }),
  getThreads: (params) => api.get('/messages/threads', { params }),
  getThread: (threadId, params) => api.get(`/messages/threads/${threadId}`, { params }),
  getUnreadCount: () => api.get('/messages/unread-count'),
  markThreadRead: (threadId) => api.post(`/messages/threads/${threadId}/read`),
  deleteMessage: (messageId) => api.delete(`/messages/messages/${messageId}`),
  deleteThread: (threadId) => api.delete(`/messages/threads/${threadId}`),
};

// Reviews APIs
export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getSellerReviews: (sellerId, params) => api.get(`/reviews/seller/${sellerId}`, { params }),
  getUserReviews: (userId, params) => api.get(`/reviews/user/${userId}`, { params }),
  getOrderReviews: (orderId) => api.get(`/reviews/order/${orderId}`),
  getById: (id) => api.get(`/reviews/${id}`),
};

// Trades APIs
export const tradesAPI = {
  // Check eligibility for trading
  checkEligibility: () => api.get('/trades/eligibility'),
  // Acknowledge trade rules modal
  acknowledgeRules: () => api.post('/trades/acknowledge-rules'),
  // Initiate a trade
  create: (myListingId, theirListingId) => api.post('/trades', {
    my_listing_id: myListingId,
    their_listing_id: theirListingId
  }),
  // Get all trades for current user
  getAll: (params) => api.get('/trades', { params }),
  // Get a specific trade
  getById: (tradeId) => api.get(`/trades/${tradeId}`),
  // Respond to trade (accept/decline)
  respond: (tradeId, action) => api.post(`/trades/${tradeId}/respond`, null, { params: { action } }),
  // Submit shipping address
  submitAddress: (tradeId, address) => api.post(`/trades/${tradeId}/shipping-address`, address),
  // Add tracking
  addTracking: (tradeId, carrier, trackingNumber, estimatedDelivery) => 
    api.post(`/trades/${tradeId}/tracking`, null, { 
      params: { carrier, tracking_number: trackingNumber, estimated_delivery: estimatedDelivery }
    }),
  // Confirm receipt
  confirmReceipt: (tradeId) => api.post(`/trades/${tradeId}/confirm-receipt`),
  // Cancel trade
  cancel: (tradeId) => api.post(`/trades/${tradeId}/cancel`),
  // Open dispute
  openDispute: (tradeId, reason) => api.post(`/trades/${tradeId}/dispute`, null, { params: { reason } }),
};

// Admin APIs
export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (userId) => api.post(`/admin/users/${userId}/suspend`),
  unsuspendUser: (userId) => api.post(`/admin/users/${userId}/unsuspend`),
  banUser: (userId, reason) => api.post(`/admin/users/${userId}/ban`, { reason }),
  unbanUser: (userId) => api.post(`/admin/users/${userId}/unban`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  changeUserRole: (userId, role) => api.put(`/admin/users/${userId}/role`, { role }),
  resetAnalytics: (options) => api.post('/admin/reset-analytics', options),
  getListings: (params) => api.get('/admin/listings', { params }),
  removeListing: (listingId) => api.post(`/admin/listings/${listingId}/remove`),
  getOrders: (params) => api.get('/admin/orders', { params }),
  getSettings: () => api.get('/admin/settings'),
  // Employee management
  getEmployees: () => api.get('/admin/employees'),
  createEmployee: (data) => api.post('/admin/employees', data),
  updateEmployeeDetails: (employeeId, data) => api.put(`/admin/employees/${employeeId}`, data),
  updateEmployeeRole: (employeeId, role) => api.put(`/admin/employees/${employeeId}/role`, { role }),
  resendSetupEmail: (employeeId) => api.post(`/admin/employees/${employeeId}/resend-setup`),
  deleteEmployee: (employeeId) => api.delete(`/admin/employees/${employeeId}`),
};

// Files API
export const filesAPI = {
  upload: (file, fileType) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/files/upload?file_type=${fileType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Payments API (Stripe)
export const paymentsAPI = {
  // Get Stripe config (publishable key)
  getConfig: () => api.get('/payments/config'),
  
  // Create checkout session
  createCheckout: (data) => api.post('/payments/checkout', data),
  
  // Get payment status
  getStatus: (sessionId) => api.get(`/payments/status/${sessionId}`),
  
  // Stripe Connect - Seller Onboarding
  startSellerOnboarding: () => api.post('/payments/connect/onboard'),
  getConnectStatus: () => api.get('/payments/connect/status'),
  refreshOnboardingLink: () => api.post('/payments/connect/refresh-link'),
  getSellerBalance: () => api.get('/payments/connect/balance'),
};

// Gig Board API
export const gigsAPI = {
  // Get categories and subcategories
  getCategories: () => api.get('/gig-board/categories'),
  
  // Create a new gig
  create: (data) => api.post('/gig-board', data),
  
  // Get all gigs with filters
  getAll: (params) => api.get('/gig-board', { params }),
  
  // Get current user's gigs
  getMyGigs: (gigType) => api.get('/gig-board/my-gigs', { params: { gig_type: gigType } }),
  
  // Get single gig
  getById: (gigId) => api.get(`/gig-board/${gigId}`),
  
  // Update gig
  update: (gigId, data) => api.put(`/gig-board/${gigId}`, data),
  
  // Delete gig
  delete: (gigId) => api.delete(`/gig-board/${gigId}`),
};

// Profile Visits API (Top 8 Fans feature)
export const profileVisitsAPI = {
  // Track a profile visit
  trackVisit: (profileId) => api.post('/profile-visits/track', { profile_id: profileId }),
  
  // Update time spent on a profile (call periodically)
  updateTimeSpent: (profileId, secondsSpent) => 
    api.put('/profile-visits/time', { profile_id: profileId, seconds_spent: secondsSpent }),
  
  // Track an interaction (message, purchase, review, favorite)
  trackInteraction: (profileId, interactionType) => 
    api.post('/profile-visits/interaction', { profile_id: profileId, interaction_type: interactionType }),
  
  // Get top 8 fans for a profile
  getTopFans: (profileId) => api.get(`/profile-visits/top-fans/${profileId}`),
  
  // Get current user's fan stats for a profile
  getMyFanStats: (profileId) => api.get(`/profile-visits/my-stats/${profileId}`),
};

export default api;
