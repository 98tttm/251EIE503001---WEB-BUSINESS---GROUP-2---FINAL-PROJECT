// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API Helper Functions
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  // Get headers for API requests
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Make API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Create API client instance
const api = new ApiClient();

// Authentication API
export const authAPI = {
  // Register user
  register: (userData) => api.post('/auth/register', userData),

  // Login user
  login: (credentials) => api.post('/auth/login', credentials),

  // Get current user
  getMe: () => api.get('/auth/me'),

  // Update profile
  updateProfile: (profileData) => api.put('/auth/profile', profileData),

  // Change password
  changePassword: (passwordData) => api.put('/auth/change-password', passwordData),

  // Logout
  logout: () => api.post('/auth/logout'),
};

// Products API
export const productsAPI = {
  // Get all products with filters
  getProducts: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products${queryString ? `?${queryString}` : ''}`);
  },

  // Get single product
  getProduct: (id) => api.get(`/products/${id}`),

  // Get featured products
  getFeaturedProducts: (limit = 10) => api.get(`/products/featured?limit=${limit}`),

  // Get products by category
  getProductsByCategory: (categoryId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products/category/${categoryId}${queryString ? `?${queryString}` : ''}`);
  },

  // Get related products
  getRelatedProducts: (id, limit = 8) => api.get(`/products/${id}/related?limit=${limit}`),

  // Add product review
  addReview: (id, reviewData) => api.post(`/products/${id}/reviews`, reviewData),

  // Get product reviews
  getProductReviews: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/products/${id}/reviews${queryString ? `?${queryString}` : ''}`);
  },
};

// Categories API
export const categoriesAPI = {
  // Get all categories
  getCategories: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/categories${queryString ? `?${queryString}` : ''}`);
  },

  // Get single category
  getCategory: (id) => api.get(`/categories/${id}`),

  // Get category children
  getCategoryChildren: (id) => api.get(`/categories/${id}/children`),

  // Get category path
  getCategoryPath: (id) => api.get(`/categories/${id}/path`),

  // Get category tree
  getCategoryTree: () => api.get('/categories/tree'),
};

// Cart API
export const cartAPI = {
  // Get cart
  getCart: () => api.get('/cart'),

  // Add to cart
  addToCart: (productId, quantity = 1) => api.post('/cart/add', { productId, quantity }),

  // Update cart item
  updateCartItem: (productId, quantity) => api.put('/cart/update', { productId, quantity }),

  // Remove from cart
  removeFromCart: (productId) => api.delete('/cart/remove', { productId }),

  // Clear cart
  clearCart: () => api.delete('/cart/clear'),

  // Get cart count
  getCartCount: () => api.get('/cart/count'),

  // Merge cart
  mergeCart: (sessionId) => api.post('/cart/merge', { sessionId }),
};

// Utility functions
export const utils = {
  // Check if user is authenticated
  isAuthenticated: () => !!api.token,

  // Get current token
  getToken: () => api.token,

  // Set token
  setToken: (token) => api.setToken(token),

  // Clear token
  clearToken: () => api.setToken(null),

  // Format price
  formatPrice: (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  },

  // Format date
  formatDate: (date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(date));
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Generate session ID for guest users
  generateSessionId: () => {
    return 'session_' + Math.random().toString(36).substr(2, 9) + Date.now();
  },
};

// Export API client for direct use
export default api;
