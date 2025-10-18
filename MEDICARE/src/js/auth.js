import { authAPI, utils } from './api.js';

// Authentication state management
class AuthManager {
  constructor() {
    this.user = null;
    this.isAuthenticated = false;
    this.listeners = [];
    
    // Initialize auth state
    this.init();
  }

  // Initialize authentication state
  async init() {
    const token = utils.getToken();
    if (token) {
      try {
        const response = await authAPI.getMe();
        this.user = response.data.user;
        this.isAuthenticated = true;
        this.notifyListeners();
      } catch (error) {
        console.error('Auth initialization error:', error);
        this.logout();
      }
    }
  }

  // Subscribe to auth state changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify listeners of auth state changes
  notifyListeners() {
    this.listeners.forEach(listener => {
      listener({
        user: this.user,
        isAuthenticated: this.isAuthenticated
      });
    });
  }

  // Login user
  async login(email, password) {
    try {
      const response = await authAPI.login({ email, password });
      const { user, token } = response.data;
      
      utils.setToken(token);
      this.user = user;
      this.isAuthenticated = true;
      this.notifyListeners();
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Register user
  async register(userData) {
    try {
      const response = await authAPI.register(userData);
      const { user, token } = response.data;
      
      utils.setToken(token);
      this.user = user;
      this.isAuthenticated = true;
      this.notifyListeners();
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Logout user
  async logout() {
    try {
      if (this.isAuthenticated) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      utils.clearToken();
      this.user = null;
      this.isAuthenticated = false;
      this.notifyListeners();
    }
  }

  // Update user profile
  async updateProfile(profileData) {
    try {
      const response = await authAPI.updateProfile(profileData);
      this.user = response.data.user;
      this.notifyListeners();
      return { success: true, user: this.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated;
  }
}

// Create global auth manager instance
const authManager = new AuthManager();

// Authentication UI Components
class AuthUI {
  constructor() {
    this.authManager = authManager;
    this.setupEventListeners();
    this.updateUI();
  }

  // Setup event listeners
  setupEventListeners() {
    // Listen for auth state changes
    this.authManager.subscribe((authState) => {
      this.updateUI();
    });

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', this.handleLogin.bind(this));
    }

    // Register form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', this.handleRegister.bind(this));
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', this.handleLogout.bind(this));
    }
  }

  // Handle login form submission
  async handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');

    const loginBtn = event.target.querySelector('button[type="submit"]');
    const originalText = loginBtn.textContent;
    
    try {
      loginBtn.textContent = 'Đang đăng nhập...';
      loginBtn.disabled = true;

      const result = await this.authManager.login(email, password);
      
      if (result.success) {
        this.showNotification('Đăng nhập thành công!', 'success');
        this.closeAuthModal();
        event.target.reset();
      } else {
        this.showNotification(result.error, 'error');
      }
    } catch (error) {
      this.showNotification('Có lỗi xảy ra khi đăng nhập', 'error');
    } finally {
      loginBtn.textContent = originalText;
      loginBtn.disabled = false;
    }
  }

  // Handle register form submission
  async handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
      email: formData.get('email'),
      password: formData.get('password'),
      profile: {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phone: formData.get('phone')
      }
    };

    const registerBtn = event.target.querySelector('button[type="submit"]');
    const originalText = registerBtn.textContent;
    
    try {
      registerBtn.textContent = 'Đang đăng ký...';
      registerBtn.disabled = true;

      const result = await this.authManager.register(userData);
      
      if (result.success) {
        this.showNotification('Đăng ký thành công!', 'success');
        this.closeAuthModal();
        event.target.reset();
      } else {
        this.showNotification(result.error, 'error');
      }
    } catch (error) {
      this.showNotification('Có lỗi xảy ra khi đăng ký', 'error');
    } finally {
      registerBtn.textContent = originalText;
      registerBtn.disabled = false;
    }
  }

  // Handle logout
  async handleLogout() {
    try {
      await this.authManager.logout();
      this.showNotification('Đã đăng xuất thành công!', 'success');
    } catch (error) {
      this.showNotification('Có lỗi xảy ra khi đăng xuất', 'error');
    }
  }

  // Update UI based on auth state
  updateUI() {
    const isAuthenticated = this.authManager.isUserAuthenticated();
    const user = this.authManager.getCurrentUser();

    // Update user info in header
    const userInfo = document.querySelector('.personal-info');
    if (userInfo) {
      if (isAuthenticated) {
        userInfo.innerHTML = `
          <div class="phone-icon">
            <img src="../assets/images/avatar_15657781.png" height="50" width="50" alt="Avatar Icon">
          </div>
          <div class="phone-number">${user.profile.firstName}</div>
          <div class="personal-popup">    
            <div class="popup-item" onclick="showProfileModal()">
              <div class="popup-icon"><img src="../assets/images/8324223_ui_essential_app_avatar_profile_icon.png" height="20" width="20" alt="Avatar Icon"></div>
              <span>Thông tin cá nhân</span>
            </div>
            <div class="popup-item" onclick="showOrdersModal()">
              <div class="popup-icon"><img src="../assets/images/9025861_package_box_icon.png" height="20" width="20" alt="Amazon Icon"></div>
              <span>Đơn hàng của tôi</span>
            </div>
            <div class="popup-item" onclick="showAddressModal()">
              <div class="popup-icon"><img src="../assets/images/2849827_pointer_map_location_place_multimedia_icon.png" height="20" width="20" alt="Map Icon"></div>
              <span>Quản lý sổ địa chỉ</span>
            </div>
            <div class="popup-item" onclick="authUI.handleLogout()">
              <div class="popup-icon"><img src="../assets/images/9104136_logout_sign out_exit_dooe_out_icon.png" height="20" width="20" alt="Sign Out Icon"></div>
              <span>Đăng xuất</span>
            </div>
          </div>
        `;
      } else {
        userInfo.innerHTML = `
          <div class="phone-icon">
            <img src="../assets/images/avatar_15657781.png" height="50" width="50" alt="Avatar Icon">
          </div>
          <div class="phone-number" onclick="showAuthModal()">Đăng nhập</div>
        `;
      }
    }

    // Update cart access
    const cartBtn = document.querySelector('.cart-container');
    if (cartBtn) {
      if (isAuthenticated) {
        cartBtn.style.cursor = 'pointer';
        cartBtn.onclick = () => showCartModal();
      } else {
        cartBtn.style.cursor = 'pointer';
        cartBtn.onclick = () => {
          this.showNotification('Vui lòng đăng nhập để xem giỏ hàng', 'warning');
          showAuthModal();
        };
      }
    }
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

  // Close auth modal
  closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }
}

// Global functions for UI interactions
window.showAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.style.display = 'flex';
  }
};

window.showProfileModal = function() {
  // TODO: Implement profile modal
  console.log('Show profile modal');
};

window.showOrdersModal = function() {
  // TODO: Implement orders modal
  console.log('Show orders modal');
};

window.showAddressModal = function() {
  // TODO: Implement address modal
  console.log('Show address modal');
};

window.showCartModal = function() {
  // TODO: Implement cart modal
  console.log('Show cart modal');
};

// Initialize auth UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.authUI = new AuthUI();
});

// Export for use in other modules
export { authManager, AuthUI };
