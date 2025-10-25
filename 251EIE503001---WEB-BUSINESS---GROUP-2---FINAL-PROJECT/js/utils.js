/**
 * Utility functions for MediCare application
 */

/**
 * Format number to Vietnamese currency format
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency string
 */
function formatVnd(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '0₫';
  }
  return amount.toLocaleString('vi-VN') + '₫';
}

/**
 * Parse currency string to number
 * @param {string} currencyString - Currency string like "492.000₫"
 * @returns {number} Parsed number
 */
function parseCurrency(currencyString) {
  if (!currencyString) return 0;
  return parseInt(currencyString.replace(/[^\d]/g, '')) || 0;
}

/**
 * Calculate discount amount based on percentage
 * @param {number} amount - Original amount
 * @param {number} percentage - Discount percentage (0-100)
 * @returns {number} Discount amount
 */
function calculateDiscount(amount, percentage) {
  return Math.round((amount * percentage) / 100);
}

/**
 * Calculate shipping fee based on total amount
 * @param {number} totalAmount - Total order amount
 * @returns {number} Shipping fee
 */
function calculateShippingFee(totalAmount) {
  // Free shipping for orders over 500,000₫
  if (totalAmount >= 500000) {
    return 0;
  }
  // Standard shipping fee
  return 30000;
}

/**
 * Validate Vietnamese phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Is valid phone number
 */
function isValidPhone(phone) {
  const phoneRegex = /^(0|\+84)[3-9]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get current timestamp
 * @returns {string} Current timestamp in ISO format
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Generate order ID
 * @returns {string} Unique order ID
 */
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `MC${timestamp}${random}`;
}

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Calculate final total amount
 * Công thức: Thành tiền = Tổng tiền trước giảm - Tổng giảm giá
 * @param {number} subtotal - Tổng tiền trước giảm
 * @param {number} discount - Tổng giảm giá
 * @param {number} shipping - Phí vận chuyển (optional)
 * @returns {number} Final total amount
 */
function calculateFinalTotal(subtotal, discount, shipping = 0) {
  const totalDiscount = discount || 0;
  const totalShipping = shipping || 0;
  const finalTotal = Math.max(0, subtotal - totalDiscount + totalShipping);
  return finalTotal;
}

/**
 * Calculate cart totals from DOM elements
 * @returns {Object} Cart calculation result
 */
function calculateCartTotals() {
  const rows = Array.from(document.querySelectorAll('.cart-row'));
  let subtotal = 0;
  let totalQuantity = 0;
  
  rows.forEach(row => {
    const checked = row.querySelector('.item-check')?.checked;
    const unit = Number(row.querySelector('.price')?.getAttribute('data-price') || 0);
    const qty = Math.max(1, Number(row.querySelector('.qty-input')?.value || 1));
    const line = unit * qty;
    
    if (checked) {
      subtotal += line;
      totalQuantity += qty;
    }
    
    // Update line total
    const lineTotalElement = row.querySelector('.line-total');
    if (lineTotalElement) {
      lineTotalElement.textContent = formatVnd(line);
    }
  });
  
  return {
    subtotal,
    totalQuantity,
    itemCount: rows.filter(row => row.querySelector('.item-check')?.checked).length
  };
}

/**
 * Update cart display with calculated totals
 */
function updateCartDisplay() {
  const calculation = calculateCartTotals();
  
  // Update subtotal
  const subtotalElement = document.querySelector('.subtotal');
  if (subtotalElement) {
    subtotalElement.textContent = formatVnd(calculation.subtotal);
  }
  
  // Get discount amount
  const discountElement = document.querySelector('.discount');
  const discountText = discountElement ? discountElement.textContent.replace(/[^\d]/g, '') : '0';
  const discount = Number(discountText || 0);
  
  // Get shipping fee
  const shippingElement = document.querySelector('.shipping');
  const shippingText = shippingElement ? shippingElement.textContent.replace(/[^\d]/g, '') : '0';
  const shipping = Number(shippingText || 0);
  
  // Calculate final total
  const finalTotal = calculateFinalTotal(calculation.subtotal, discount, shipping);
  
  // Update final price
  const finalPriceElement = document.querySelector('.final-price');
  if (finalPriceElement) {
    finalPriceElement.textContent = formatVnd(finalTotal);
  }
  
  // Update item count in select all
  const selectAllSpan = document.querySelector('#select-all + span');
  if (selectAllSpan) {
    selectAllSpan.textContent = `Chọn tất cả (${calculation.itemCount})`;
  }
  
  // Update cart badge
  const cartBadge = document.querySelector('.cart-badge');
  if (cartBadge) {
    cartBadge.textContent = calculation.totalQuantity;
  }
  
  return {
    subtotal: calculation.subtotal,
    discount,
    shipping,
    finalTotal,
    itemCount: calculation.itemCount,
    totalQuantity: calculation.totalQuantity
  };
}

/**
 * Apply voucher discount
 * @param {string} voucherCode - Voucher code
 * @returns {boolean} Success status
 */
function applyVoucherDiscount(voucherCode) {
  const vouchers = {
    'MEDI10': 10000,
    'MEDI50': 50000,
    'MEDI20P': 20, // percentage
    'FREESHIP': 'freeship'
  };
  
  const voucher = vouchers[voucherCode.toUpperCase()];
  if (!voucher) return false;
  
  const discountElement = document.querySelector('.discount');
  if (!discountElement) return false;
  
  if (voucher === 'freeship') {
    // Free shipping
    const shippingElement = document.querySelector('.shipping');
    if (shippingElement) {
      shippingElement.textContent = '0₫';
    }
  } else if (typeof voucher === 'number') {
    if (voucher <= 100) {
      // Percentage discount
      const calculation = calculateCartTotals();
      const discountAmount = calculateDiscount(calculation.subtotal, voucher);
      discountElement.textContent = formatVnd(discountAmount);
    } else {
      // Fixed discount
      discountElement.textContent = formatVnd(voucher);
    }
  }
  
  // Recalculate totals
  updateCartDisplay();
  return true;
}

/**
 * Show notification message
 * @param {string} message - Message to show
 * @param {string} type - Type of notification (success, error, warning, info)
 */
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 4px;
    color: white;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  // Set background color based on type
  const colors = {
    success: '#4CAF50',
    error: '#f44336',
    warning: '#ff9800',
    info: '#2196F3'
  };
  notification.style.backgroundColor = colors[type] || colors.info;
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  // Add to DOM
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}
