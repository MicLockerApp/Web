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
  searchUsers: (params) => api.get('/users/search', { params }),
  getUserListings: (userId, params) => api.get(`/users/${userId}/listings`, { params }),
  getUserReviews: (userId, params) => api.get(`/users/${userId}/reviews`, { params }),
  // Favorites
  getFavorites: (params) => api.get('/users/favorites/list', { params }),
  addFavorite: (listingId) => api.post(`/users/favorites/${listingId}`),
  removeFavorite: (listingId) => api.delete(`/users/favorites/${listingId}`),
  checkFavorite: (listingId) => api.get(`/users/favorites/check/${listingId}`),
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
  send: (recipientId, content, listingId = null) => 
    api.post('/messages', { recipient_id: recipientId, content, listing_id: listingId }),
  getThreads: (params) => api.get('/messages/threads', { params }),
  getThread: (threadId, params) => api.get(`/messages/threads/${threadId}`, { params }),
  getUnreadCount: () => api.get('/messages/unread-count'),
  markThreadRead: (threadId) => api.post(`/messages/threads/${threadId}/read`),
};

// Reviews APIs
export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getSellerReviews: (sellerId, params) => api.get(`/reviews/seller/${sellerId}`, { params }),
  getById: (id) => api.get(`/reviews/${id}`),
};

// Admin APIs
export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: (params) => api.get('/admin/users', { params }),
  suspendUser: (userId) => api.post(`/admin/users/${userId}/suspend`),
  unsuspendUser: (userId) => api.post(`/admin/users/${userId}/unsuspend`),
  getListings: (params) => api.get('/admin/listings', { params }),
  removeListing: (listingId) => api.post(`/admin/listings/${listingId}/remove`),
  getOrders: (params) => api.get('/admin/orders', { params }),
  getSettings: () => api.get('/admin/settings'),
  // Employee management
  getEmployees: () => api.get('/admin/employees'),
  createEmployee: (data) => api.post('/admin/employees', data),
  updateEmployeeRole: (employeeId, role) => api.put(`/admin/employees/${employeeId}/role`, { role }),
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

export default api;
