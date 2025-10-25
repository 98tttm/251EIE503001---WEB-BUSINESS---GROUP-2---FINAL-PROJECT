(function () {
  'use strict';

  // Polyfills cho môi trường cũ
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = (cb) => setTimeout(cb, 1);
    window.cancelIdleCallback = (id) => clearTimeout(id);
  }

  // Configuration
  const CONFIG = {
    ANIMATION_DURATION: 250,
    DEBOUNCE_DELAY: 150,
    NOTIFICATION_CHECK_INTERVAL: 30000 // 30s
  };

  // State management
  const STATE = {
    notifications: {
      unread: 3,
      items: [
        { id: 1, type: 'order', message: '3 đơn hàng mới hôm nay', time: '2 phút trước' },
        { id: 2, type: 'warning', message: '2 sản phẩm sắp hết HSD', time: '1 giờ trước' },
        { id: 3, type: 'refund', message: '1 yêu cầu hoàn tiền cần xử lý', time: 'Hôm nay' }
      ]
    },
    charts: {
      revenue: null,
      products: null
    }
  };

  // DOM Cache
  const DOM = {};

  // Utilities
  const Utils = {
    // Debounce function
    debounce(fn, delay) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    // Throttle function
    throttle(fn, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          fn.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    // Animation helper
    animate(element, duration = CONFIG.ANIMATION_DURATION) {
      return new Promise((resolve) => {
        element.style.transition = `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        element.addEventListener('transitionend', () => resolve(), { once: true });
      });
    },

    // Focus trap cho modal/dropdown
    trapFocus(container) {
      const focusable = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      container.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      });
    }
  };

  // Sidebar Controller - Desktop only
  const Sidebar = {
    init() {
      DOM.sidebar = document.getElementById('sidebar');
      DOM.hamburger = document.getElementById('hamburgerBtn');
      DOM.dashboardContent = document.querySelector('.dashboard-content');

      if (!DOM.sidebar || !DOM.hamburger) return;

      this.bindEvents();
      this.setInitialState();
    },

    bindEvents() {
      DOM.hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });

      DOM.hamburger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggle();
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.sidebar.classList.contains('collapsed')) {
          this.toggle();
        }
      });
    },

    toggle() {
      const isCollapsed = DOM.sidebar.classList.contains('collapsed');
      
      if (isCollapsed) {
        DOM.sidebar.classList.remove('collapsed');
        document.body.setAttribute('data-sidebar', 'expanded');
        DOM.hamburger.setAttribute('aria-expanded', 'false');
      } else {
        DOM.sidebar.classList.add('collapsed');
        document.body.setAttribute('data-sidebar', 'collapsed');
        DOM.hamburger.setAttribute('aria-expanded', 'true');
      }
    },

    setInitialState() {
      document.body.setAttribute('data-sidebar', 'expanded');
      DOM.hamburger.setAttribute('aria-expanded', 'false');
    }
  };

  // Notification Controller
  const Notifications = {
    init() {
      DOM.notifBtn = document.getElementById('notifBtn');
      DOM.notifDropdown = document.getElementById('notifDropdown');
      DOM.notifBadge = document.querySelector('.notif-badge');

      if (!DOM.notifBtn || !DOM.notifDropdown) return;

      this.bindEvents();
      this.updateBadge();
      this.startPolling();
    },

    bindEvents() {
      DOM.notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });

      DOM.notifBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggle();
        }
      });

      document.addEventListener('click', this.close.bind(this));
      DOM.notifDropdown.addEventListener('click', (e) => e.stopPropagation());

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && DOM.notifDropdown.classList.contains('show')) {
          this.close();
        }
      });
    },

    toggle() {
      const isOpen = DOM.notifDropdown.classList.contains('show');
      isOpen ? this.close() : this.open();
    },

    open() {
      DOM.notifDropdown.classList.add('show');
      DOM.notifBtn.setAttribute('aria-expanded', 'true');
      
      Utils.trapFocus(DOM.notifDropdown);
      DOM.notifDropdown.querySelector('li button, li a')?.focus();
      this.markAsRead();
    },

    close() {
      DOM.notifDropdown.classList.remove('show');
      DOM.notifBtn.setAttribute('aria-expanded', 'false');
    },

    markAsRead() {
      STATE.notifications.unread = 0;
      this.updateBadge();
      DOM.notifBtn?.classList.remove('has-unread');
    },

    updateBadge() {
      if (DOM.notifBadge) {
        DOM.notifBadge.textContent = STATE.notifications.unread || '';
        DOM.notifBadge.style.display = STATE.notifications.unread ? 'flex' : 'none';
      }
    },

    startPolling() {
      setInterval(() => {
        if (Math.random() < 0.05 && STATE.notifications.unread < 10) {
          STATE.notifications.unread++;
          this.updateBadge();
          DOM.notifBtn?.classList.add('has-unread');
        }
      }, CONFIG.NOTIFICATION_CHECK_INTERVAL);
    }
  };

  // Charts Controller
  const Charts = {
    revenueCtx: null,
    productsCtx: null,

    init() {
      this.revenueCtx = document.getElementById('chartRevenue');
      this.productsCtx = document.getElementById('chartTopProducts');

      if (!this.revenueCtx || !this.productsCtx || !window.Chart) return;

      this.createRevenueChart();
      this.createProductsChart();
      this.bindChartControls();
    },

    createRevenueChart() {
      STATE.charts.revenue = new Chart(this.revenueCtx, {
        type: 'line',
        data: {
          labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
          datasets: [{
            label: 'Doanh thu (triệu ₫)',
            data: [12, 19, 15, 25, 30, 28],
            borderColor: '#004aad',
            backgroundColor: 'rgba(0, 74, 173, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#004aad',
            pointBorderWidth: 3,
            pointHoverRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.9)',
              titleColor: '#fff',
              bodyColor: '#fff',
              cornerRadius: 8
            }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    },

    createProductsChart() {
      STATE.charts.products = new Chart(this.productsCtx, {
        type: 'bar',
        data: {
          labels: ['Panadol', 'Ensure Gold', 'BioGaia', 'Vitamin C', 'Glucerna'],
          datasets: [{
            label: 'Số lượng bán',
            data: [120, 90, 80, 70, 60],
            backgroundColor: [
              'rgba(0, 74, 173, 0.8)',
              'rgba(0, 123, 255, 0.8)',
              'rgba(40, 167, 69, 0.8)',
              'rgba(255, 193, 7, 0.8)',
              'rgba(108, 117, 125, 0.8)'
            ],
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    },

    bindChartControls() {
      document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const parent = e.target.closest('.chart-actions');
          parent.querySelector('.active')?.classList.remove('active');
          e.target.classList.add('active');
          this.updateRevenueChart(e.target.dataset.period || '30');
        });
      });
    },

    updateRevenueChart(period) {
      const data = {
        '7': [8, 12, 15, 18, 22, 25],
        '30': [12, 19, 15, 25, 30, 28],
        '12': [22, 28, 35, 42, 38, 45]
      };
      
      if (STATE.charts.revenue) {
        STATE.charts.revenue.data.datasets[0].data = data[period] || data['30'];
        STATE.charts.revenue.update('active', { duration: 500 });
      }
    }
  };

  // Search Controller
  const Search = {
    init() {
      DOM.searchInput = document.querySelector('.admin-search');
      if (!DOM.searchInput) return;

      DOM.searchInput.addEventListener('input', Utils.debounce(this.handleInput.bind(this), 300));
      DOM.searchInput.addEventListener('focus', this.handleFocus.bind(this));
      DOM.searchInput.addEventListener('blur', this.handleBlur.bind(this));
    },

    handleInput(e) {
      const query = e.target.value.trim();
      console.log('Searching for:', query);
    },

    handleFocus() {
      DOM.searchInput.parentElement.classList.add('focused');
    },

    handleBlur() {
      DOM.searchInput.parentElement.classList.remove('focused');
    }
  };

  // Action Buttons
const Actions = {
  init() {
    document.querySelector('.btn-refresh')?.addEventListener('click', this.refreshData);
    document.querySelector('.btn-export')?.addEventListener('click', this.exportReport);
    
    //LOGOUT BUTTON
    document.querySelector('.logout-btn')?.addEventListener('click', this.logout);
    
    document.querySelectorAll('.sidebar-link').forEach(link => {
      link.addEventListener('click', this.handleNavigation.bind(this));
    });
  },

  // LOGOUT CONFIRM DIALOG
  logout(e) {
    e.preventDefault();
    
    const modal = document.createElement('div');
    modal.className = 'logout-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      backdrop-filter: blur(4px);
    `;
    
    modal.innerHTML = `
      <div style="
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 25px 70px rgba(0,0,0,0.35);
          text-align: center;
          animation: modalSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        ">
          <div style="
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
            border-radius: 50%;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            box-shadow: 0 10px 30px rgba(255,107,107,0.4);
          ">
            <i class="fas fa-sign-out-alt" style="color: white;"></i>
          </div>
          <h3 style="
            font-size: 26px;
            font-weight: 700;
            color: #1a1a1a;
            margin: 0 0 16px;
            line-height: 1.3;
          ">Xác nhận đăng xuất</h3>
          <p style="
            font-size: 16px;
            color: #666;
            line-height: 1.6;
            margin: 0 0 32px;
          ">Bạn chắc chắn muốn đăng xuất khỏi hệ thống quản trị?</p>
          <div style="
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
          ">
            <button id="logoutConfirm" style="
              padding: 14px 32px;
              background: linear-gradient(135deg, #ff3b30, #ff6b6b);
              color: white;
              border: none;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 6px 20px rgba(255,59,48,0.3);
            ">
              <i class="fas fa-sign-out-alt"></i> Đăng xuất
            </button>
            <button id="logoutCancel" style="
              padding: 14px 32px;
              background: linear-gradient(135deg, #f8f9fa, #e9ecef);
              color: #495057;
              border: 2px solid #dee2e6;
              border-radius: 12px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
            ">
              <i class="fas fa-times"></i> Hủy bỏ
            </button>
          </div>
        </div>
    `;
  
    const style = document.createElement('style');
    style.textContent = `
      @keyframes modalSlideIn {
        from { opacity: 0; transform: scale(0.9) translateY(-20px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      #logoutConfirm:hover { 
        background: #e63946 !important;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(255,59,48,0.3);
      }
      #logoutCancel:hover { 
        background: #e9ecef !important;
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(modal);
    
    document.getElementById('logoutConfirm').onclick = () => {
      window.location.href = 'index.html';
    };
    
    document.getElementById('logoutCancel').onclick = () => {
      modal.remove();
      document.head.removeChild(style);
    };
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        document.head.removeChild(style);
      }
    });
    
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.head.removeChild(style);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    const confirmBtn = document.getElementById('logoutConfirm');
    const cancelBtn = document.getElementById('logoutCancel');
    confirmBtn.focus();
    
    const focusTrap = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === cancelBtn) {
            confirmBtn.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === confirmBtn) {
            cancelBtn.focus();
            e.preventDefault();
          }
        }
      }
    };
    modal.addEventListener('keydown', focusTrap);
  },

  async refreshData() {
    const btn = document.querySelector('.btn-refresh');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang làm mới...';
    btn.disabled = true;

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    document.querySelectorAll('.kpi-value').forEach((el, i) => {
      const values = ['152', '47.8M₫', '7'];
      el.textContent = values[i];
    });

    btn.innerHTML = originalText;
    btn.disabled = false;
  },

  exportReport() {
    const btn = document.querySelector('.btn-export');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo PDF...';
    btn.disabled = true;
    html2canvas(document.querySelector('.dashboard-content'), {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: document.querySelector('.dashboard-content').scrollWidth,
      height: document.querySelector('.dashboard-content').scrollHeight
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 190;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;

      // Thêm header PDF
      pdf.setFontSize(20);
      pdf.setTextColor(0, 74, 173);
      pdf.text('BÁO CÁO DASHBOARD MEDICARE', 105, 15, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(new Date().toLocaleDateString('vi-VN'), 105, 25, { align: 'center' });
      position = 35;

      // Add image
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF
      pdf.save(`medicare-dashboard-${new Date().toISOString().slice(0,10)}.pdf`);
      
      // Reset button
      btn.innerHTML = originalText;
      btn.disabled = false;
      
      this.showToast('Báo cáo PDF đã tải xuống!', 'success');
    }).catch(error => {
      console.error('PDF Error:', error);
      btn.innerHTML = originalText;
      btn.disabled = false;
      this.showToast('Lỗi tạo PDF!', 'error');
    });
  },

  handleNavigation(e) {
    const target = e.currentTarget;
    document.querySelector('.sidebar-link.active')?.classList.remove('active');
    target.classList.add('active');
  },

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 90px;
      right: 24px;
      background: ${type === 'success' ? '#28a745' : '#004aad'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      z-index: 10000;
      transform: translateX(400px);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
    });
    
    setTimeout(() => {
      toast.style.transform = 'translateX(400px)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

  // Keyboard Navigation
  const Keyboard = {
    init() {
      document.addEventListener('keydown', this.handleGlobalKeys.bind(this));
    },

    handleGlobalKeys(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        DOM.searchInput?.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        Actions.refreshData();
      }
    }
  };

  // Initialize everything
  function init() {
    Sidebar.init();
    Notifications.init();
    Charts.init();
    Search.init();
    Actions.init();
    Keyboard.init();

    document.querySelector('.skip-link')?.focus();

    if ('performance' in window) {
      console.log('Admin Dashboard loaded in:', Math.round(performance.now()) + 'ms');
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }

  if (window.requestIdleCallback) {
    requestIdleCallback(init, { timeout: 2000 });
  } else {
    window.addEventListener('load', init);
  }
  
})();