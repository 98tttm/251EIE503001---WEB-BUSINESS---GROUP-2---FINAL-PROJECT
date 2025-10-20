import { cartAPI, productsAPI, utils } from './api.js';
import { authManager } from './auth.js';

// Cart state management
class CartManager {
  constructor() {
    this.cart = null;
    this.isLoading = false;
    this.listeners = [];
    
    // Initialize cart
    this.init();
  }

  // Initialize cart
  async init() {
    // Listen for auth state changes
    authManager.subscribe((authState) => {
      if (authState.isAuthenticated) {
        this.loadCart();
      } else {
        this.cart = null;
        this.notifyListeners();
      }
    });

    // Load cart if user is authenticated
    if (authManager.isUserAuthenticated()) {
      await this.loadCart();
    }
  }

  // Subscribe to cart state changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify listeners of cart state changes
  notifyListeners() {
    this.listeners.forEach(listener => {
      listener({
        cart: this.cart,
        isLoading: this.isLoading
      });
    });
  }

  // Load cart from API
  async loadCart() {
    if (!authManager.isUserAuthenticated()) return;

    try {
      this.isLoading = true;
      this.notifyListeners();

      const response = await cartAPI.getCart();
      this.cart = response.data.cart;
    } catch (error) {
      console.error('Error loading cart:', error);
      this.cart = null;
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  // Add item to cart
  async addToCart(productId, quantity = 1) {
    if (!authManager.isUserAuthenticated()) {
      this.showAuthRequired();
      return { success: false };
    }

    try {
      this.isLoading = true;
      this.notifyListeners();

      const response = await cartAPI.addToCart(productId, quantity);
      this.cart = response.data.cart;
      
      this.showNotification('Đã thêm sản phẩm vào giỏ hàng!', 'success');
      return { success: true };
    } catch (error) {
      this.showNotification(error.message || 'Có lỗi xảy ra', 'error');
      return { success: false, error: error.message };
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  // Update cart item quantity
  async updateCartItem(productId, quantity) {
    if (!authManager.isUserAuthenticated()) return { success: false };

    try {
      this.isLoading = true;
      this.notifyListeners();

      const response = await cartAPI.updateCartItem(productId, quantity);
      this.cart = response.data.cart;
      
      return { success: true };
    } catch (error) {
      this.showNotification(error.message || 'Có lỗi xảy ra', 'error');
      return { success: false, error: error.message };
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  // Remove item from cart
  async removeFromCart(productId) {
    if (!authManager.isUserAuthenticated()) return { success: false };

    try {
      this.isLoading = true;
      this.notifyListeners();

      const response = await cartAPI.removeFromCart(productId);
      this.cart = response.data.cart;
      
      this.showNotification('Đã xóa sản phẩm khỏi giỏ hàng!', 'success');
      return { success: true };
    } catch (error) {
      this.showNotification(error.message || 'Có lỗi xảy ra', 'error');
      return { success: false, error: error.message };
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  // Clear cart
  async clearCart() {
    if (!authManager.isUserAuthenticated()) return { success: false };

    try {
      this.isLoading = true;
      this.notifyListeners();

      const response = await cartAPI.clearCart();
      this.cart = response.data.cart;
      
      this.showNotification('Đã xóa tất cả sản phẩm khỏi giỏ hàng!', 'success');
      return { success: true };
    } catch (error) {
      this.showNotification(error.message || 'Có lỗi xảy ra', 'error');
      return { success: false, error: error.message };
    } finally {
      this.isLoading = false;
      this.notifyListeners();
    }
  }

  // Get cart count
  getCartCount() {
    return this.cart ? this.cart.totalItems : 0;
  }

  // Get cart total
  getCartTotal() {
    return this.cart ? this.cart.totalPrice : 0;
  }

  // Check if product is in cart
  isProductInCart(productId) {
    if (!this.cart) return false;
    return this.cart.items.some(item => item.product._id === productId);
  }

  // Get product quantity in cart
  getProductQuantity(productId) {
    if (!this.cart) return 0;
    const item = this.cart.items.find(item => item.product._id === productId);
    return item ? item.quantity : 0;
  }

  // Show auth required message
  showAuthRequired() {
    this.showNotification('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng', 'warning');
    setTimeout(() => {
      if (window.showAuthModal) {
        window.showAuthModal();
      }
    }, 1000);
  }

  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
}

// Cart UI Components
class CartUI {
  constructor() {
    this.cartManager = new CartManager();
    this.setupEventListeners();
    this.updateUI();
  }

  // Setup event listeners
  setupEventListeners() {
    // Listen for cart state changes
    this.cartManager.subscribe((cartState) => {
      this.updateUI();
    });

    // Listen for auth state changes
    authManager.subscribe((authState) => {
      this.updateUI();
    });
  }

  // Update UI based on cart state
  updateUI() {
    const cartCount = this.cartManager.getCartCount();
    const isAuthenticated = authManager.isUserAuthenticated();

    // Update cart badge
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
      cartBadge.textContent = cartCount;
      cartBadge.style.display = cartCount > 0 ? 'flex' : 'none';
    }

    // Update product buttons
    this.updateProductButtons();

    // Update cart popup if open
    this.updateCartPopup();
  }

  // Update product buttons
  updateProductButtons() {
    const productButtons = document.querySelectorAll('.product-btn');
    
    productButtons.forEach(button => {
      const productCard = button.closest('.product-card');
      if (!productCard) return;

      const productId = productCard.dataset.productId;
      if (!productId) return;

      const isInCart = this.cartManager.isProductInCart(productId);
      const quantity = this.cartManager.getProductQuantity(productId);

      if (isInCart) {
        button.innerHTML = `
          <div class="cart-quantity-controls">
            <button class="quantity-btn" onclick="cartUI.decreaseQuantity('${productId}')">-</button>
            <span class="quantity">${quantity}</span>
            <button class="quantity-btn" onclick="cartUI.increaseQuantity('${productId}')">+</button>
          </div>
        `;
        button.classList.add('in-cart');
      } else {
        button.textContent = 'Chọn mua';
        button.classList.remove('in-cart');
        button.onclick = () => this.addToCart(productId);
      }
    });
  }

  // Update cart popup
  updateCartPopup() {
    const cartPopup = document.querySelector('.cart-popup');
    if (!cartPopup) return;

    const cart = this.cartManager.cart;
    const cartItems = cartPopup.querySelector('.cart-items');
    const cartSummary = cartPopup.querySelector('.cart-summary');

    if (!cart || cart.items.length === 0) {
      cartItems.innerHTML = '<div class="empty-cart">Giỏ hàng trống</div>';
      if (cartSummary) {
        cartSummary.textContent = '0 sản phẩm';
      }
      return;
    }

    // Update cart items
    cartItems.innerHTML = cart.items.map(item => `
      <div class="cart-item">
        <div class="cart-item-image">
          <img src="${item.product.image}" alt="${item.product.name}" width="60" height="60">
        </div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.product.name}</div>
          <div class="cart-item-price">${utils.formatPrice(item.price)}</div>
          <div class="cart-item-quantity">x${item.quantity} ${item.product.unit}</div>
        </div>
        <div class="cart-item-actions">
          <button class="quantity-btn" onclick="cartUI.decreaseQuantity('${item.product._id}')">-</button>
          <span class="quantity">${item.quantity}</span>
          <button class="quantity-btn" onclick="cartUI.increaseQuantity('${item.product._id}')">+</button>
          <button class="remove-btn" onclick="cartUI.removeFromCart('${item.product._id}')">
            <img src="../assets/images/trash_17701260.png" alt="Delete" width="16" height="16">
          </button>
        </div>
      </div>
    `).join('');

    // Update cart summary
    if (cartSummary) {
      cartSummary.textContent = `${cart.totalItems} sản phẩm`;
    }
  }

  // Add product to cart
  async addToCart(productId) {
    await this.cartManager.addToCart(productId);
  }

  // Increase product quantity
  async increaseQuantity(productId) {
    const currentQuantity = this.cartManager.getProductQuantity(productId);
    await this.cartManager.updateCartItem(productId, currentQuantity + 1);
  }

  // Decrease product quantity
  async decreaseQuantity(productId) {
    const currentQuantity = this.cartManager.getProductQuantity(productId);
    if (currentQuantity > 1) {
      await this.cartManager.updateCartItem(productId, currentQuantity - 1);
    } else {
      await this.cartManager.removeFromCart(productId);
    }
  }

  // Remove product from cart
  async removeFromCart(productId) {
    await this.cartManager.removeFromCart(productId);
  }

  // Clear cart
  async clearCart() {
    await this.cartManager.clearCart();
  }
}

// Global functions for cart interactions
window.addToCart = function(productId) {
  if (window.cartUI) {
    window.cartUI.addToCart(productId);
  }
};

window.showCartModal = function() {
  const cartPopup = document.querySelector('.cart-popup');
  const cartContainer = document.querySelector('.cart-container');
  
  if (cartPopup && cartContainer) {
    cartContainer.classList.toggle('open');
  }
};

// Initialize cart UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.cartUI = new CartUI();
});

// Export for use in other modules
export { CartManager, CartUI };
