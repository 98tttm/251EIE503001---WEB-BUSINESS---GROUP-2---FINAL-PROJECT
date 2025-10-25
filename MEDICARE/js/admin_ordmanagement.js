(() => {
  'use strict';
  // GLOBAL STATE
  let orders = [];
  let filteredOrders = [];
  let currentPage = 1;
  const itemsPerPage = 10;
  let currentOrderId = null;
  // CONFIGURATION
  const CONFIG = {
    ANIMATION_DURATION: 250,
    DEBOUNCE_DELAY: 300,
    NOTIFICATION_POLLING: 30000,
    LOCAL_STORAGE_KEY: 'medicare_orders'
  };
  // DOM Cache
  const DOM = {};
  // UTILITIES
  const Utils = {
    debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    },
    formatMoney(amount) {
      return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
      }).format(amount);
    },
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('vi-VN');
    },
    statusLabel(status) {
      const labels = {
        new: 'Mới',
        processing: 'Đang xử lý',
        shipped: 'Đã giao',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy'
      };
      return labels[status] || status;
    },
    showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
      `;
    Object.assign(toast.style, {
      position: 'fixed',
      top: '80px',
      right: '30px',
      background: type === 'success'
        ? 'linear-gradient(135deg, #28a745, #20c997)'
        : 'linear-gradient(135deg, #dc3545, #fd7e14)',
      color: 'white',
      padding: '14px 22px',
      borderRadius: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: '10002',
      opacity: '0',
      transform: 'translateX(50px)',
      transition: 'all 0.4s ease',
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontSize: '14px',
      maxWidth: '320px',
      wordWrap: 'break-word',
      pointerEvents: 'none'
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
    },
    showLogoutModal(callback) {
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
        backdrop-filter: blur(8px);
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
          from { opacity: 0; transform: scale(0.85) translateY(-30px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        #logoutConfirm:hover { 
          transform: translateY(-3px) !important;
          box-shadow: 0 12px 30px rgba(255,59,48,0.5) !important;
        }
        #logoutCancel:hover { 
          transform: translateY(-3px) !important;
          background: linear-gradient(135deg, #e9ecef, #dee2e6) !important;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(modal);
      document.getElementById('logoutConfirm').onclick = () => {
        Utils.showToast('Đăng xuất thành công!', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1000);
      };
      document.getElementById('logoutCancel').onclick = () => {
        modal.style.animation = 'modalSlideIn 0.3s ease reverse';
        setTimeout(() => {
          modal.remove();
          document.head.removeChild(style);
        }, 300);
      };
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.getElementById('logoutCancel').click();
        }
      });
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          document.getElementById('logoutCancel').click();
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
    // Local Storage Functions
    saveToLocalStorage() {
      try {
        localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(orders));
        console.log('Orders saved to localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        Utils.showToast('Lỗi khi lưu dữ liệu đơn hàng!', 'error');
      }
    },
    loadFromLocalStorage() {
      try {
        const savedOrders = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
        if (savedOrders) {
          const parsedOrders = JSON.parse(savedOrders);
          if (Array.isArray(parsedOrders)) {
            return parsedOrders;
          }
        }
        return null;
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        Utils.showToast('Lỗi khi tải dữ liệu đơn hàng!', 'error');
        return null;
      }
    }
  };

  // ORDER DATA GENERATOR
  function generateSampleData() {
    const statuses = ['new', 'processing', 'shipped', 'completed', 'cancelled'];
    const partners = ['GHN', 'GHTK', 'Viettel Post'];
    const products = [
      { name: 'Panadol Extra 10v', price: 45000 },
      { name: 'Vitamin C 500mg', price: 120000 },
      { name: 'Ensure Gold 900g', price: 890000 },
      { name: 'BioGaia 10ml', price: 350000 },
      { name: 'Hapacol 80mg', price: 65000 }
    ];
    const customers = [
      'Nguyễn Thị B',
      'Trần Văn C',
      'Lê Hoàng D',
      'Phạm Minh E',
      'Hoàng Thị F',
      'Trần Nguyễn Hoàng G',
      'Vũ Thị H',
      'Lý Minh J'
    ];
    const addresses = [
      '123 Đường ABC, Quận XYZ, TP.HCM',
      '456 Đường DEF, Quận UVW, Hà Nội',
      '789 Đường GHI, Quận RST, Đà Nẵng',
      '478 Đường JKL, Quận MNO, Cần Thơ',
      '159 Đường MNP, Quận QRS, Hải Phòng',
      '753 Đường TUV, Quận LMN, Nha Trang',
      '876 Đường WXY, Quận OPQ, Vũng Tàu'
    ];
    return Array.from({ length: 60 }, (_, i) => {
      const partner = partners[Math.floor(Math.random() * partners.length)];
      const tracking = `${partner}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      const prefix = Math.random() < 0.5 ? '09' : '03';
      const phone = `${prefix}${Math.floor(10000000 + Math.random() * 90000000)}`;
      return {
        id: `ORD-${String(1000 + i).padStart(5, '0')}`,
        customer: `${customers[i % customers.length]} (KH${i + 1})`,
        phone,
        date: `2025-10-${String(15 + Math.floor(Math.random() * 10)).padStart(2, '0')}`,
        total: Math.floor(Math.random() * 2000000) + 300000,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        partner,
        tracking,
        address: addresses[i % addresses.length],
        payment: Math.random() > 0.5 ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản',
        items: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => {
          const product = products[Math.floor(Math.random() * products.length)];
          const qty = 1 + Math.floor(Math.random() * 3);
          return { ...product, qty };
        })
      };
    });
  }

  // TABLE RENDERING ENGINE
  function renderTable(page = 1) {
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredOrders.slice(start, end);
    if (DOM.tableBody) {
      DOM.tableBody.innerHTML = pageData.map(order => `
        <tr data-id="${order.id}" class="order-row">
          <td><strong>${order.id}</strong></td>
          <td>
            <div class="customer-info">
              <strong>${order.customer.split(' ')[0]}</strong>
              <br><small>${order.customer}</small>
              <br><small class="phone">${order.phone}</small>
            </div>
          </td>
          <td>${Utils.formatDate(order.date)}</td>
          <td><strong>${Utils.formatMoney(order.total)}</strong></td>
          <td><span class="status-badge status-${order.status}">${Utils.statusLabel(order.status)}</span></td>
          <td>
            ${order.tracking ? 
              `<div class="tracking-info">
                <span class="tracking-no">${order.tracking}</span>
                <small>${order.partner}</small>
              </div>` : 
              '<span class="no-tracking">-</span>'
            }
          </td>
          <td>
            <button class="btn-view" data-id="${order.id}" title="Xem chi tiết">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn-delete" data-id="${order.id}" title="Xóa đơn hàng">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
    renderPagination();
    Utils.saveToLocalStorage();
  }

  function renderPagination() {
    if (!DOM.pagination) return;
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    let html = '';
    html += `<button ${currentPage === 1 ? 'disabled' : ''} class="page-btn" data-page="${currentPage - 1}">
      <i class="fas fa-chevron-left"></i>
    </button>`;
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} class="page-btn" data-page="${currentPage + 1}">
      <i class="fas fa-chevron-right"></i>
    </button>`;
    DOM.pagination.innerHTML = html;
  }

  // FILTERING SYSTEM
  function applyFilters() {
    const status = DOM.statusFilter?.value;
    const from = DOM.dateFrom?.value;
    const to = DOM.dateTo?.value;
    filteredOrders = orders.filter(order => {
      if (status && order.status !== status) return false;
      if (from && order.date < from) return false;
      if (to && order.date > to) return false;
      if (search && !order.customer.toLowerCase().includes(search) && 
          !order.phone.includes(search)) return false;
      return true;
    });
    renderTable(1);
    Utils.showToast(`Đã lọc ${filteredOrders.length} đơn hàng`, 'info');
  }

  // MODAL SYSTEM
  function openModal(orderId) {
  currentOrderId = orderId;
  const saved = Utils.loadFromLocalStorage();
  if (saved && Array.isArray(saved)) {
    orders = saved;
  }
  const order = orders.find(o => o.id === orderId);
  if (!order || !DOM.modal) return;
    document.getElementById('modalTitle').textContent = `Chi tiết đơn hàng #${order.id}`;
    document.getElementById('custName').textContent = order.customer;
    document.getElementById('custPhone').textContent = order.phone;
    document.getElementById('custAddr').value = order.address || '';
    document.getElementById('paymentMethod').textContent = order.payment;
    const statusSelect = document.getElementById('statusSelect');
    const statuses = [
      {value: 'new', label: 'Mới'},
      {value: 'processing', label: 'Đang xử lý'},
      {value: 'shipped', label: 'Đã giao'},
      {value: 'completed', label: 'Hoàn thành'},
      {value: 'cancelled', label: 'Đã hủy'}
    ];
    statusSelect.innerHTML = statuses.map(s => 
      `<option value="${s.value}" ${order.status === s.value ? 'selected' : ''}>${s.label}</option>`
    ).join('');
    document.getElementById('trackingNo').value = order.tracking || '';
    const partnerSelect = document.getElementById('partnerSelect');
    partnerSelect.innerHTML = ['GHN', 'GHTK', 'Viettel Post']
      .map(p => `<option ${order.partner === p ? 'selected' : ''}>${p}</option>`).join('');
    const productRows = document.getElementById('productRows');
    productRows.innerHTML = order.items.map(item => `
      <tr>
        <td><strong>${item.name}</strong></td>
        <td><span class="qty-badge">${item.qty}</span></td>
        <td>${Utils.formatMoney(item.price)}</td>
        <td><strong>${Utils.formatMoney(item.price * item.qty)}</strong></td>
      </tr>
    `).join('');
    DOM.modal.style.opacity = '0';
    DOM.modal.style.transform = 'scale(0.8)';
    DOM.modal.classList.add('show');
    requestAnimationFrame(() => {
      DOM.modal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      DOM.modal.style.opacity = '1';
      DOM.modal.style.transform = 'scale(1)';
    });
  }

  const trackingInput = document.getElementById('trackingNo');
  trackingInput.addEventListener('input', () => {
    const val = trackingInput.value.toUpperCase();
    if (val.startsWith('GHN')) {
      partnerSelect.value = 'GHN';
    } else if (val.startsWith('GHTK')) {
      partnerSelect.value = 'GHTK';
    } else if (val.startsWith('VIETTEL POST')) {
      partnerSelect.value = 'Viettel Post';
    }
  });

  function closeModal() {
    if (DOM.modal && DOM.modal.classList.contains('show')) {
      DOM.modal.style.opacity = '0';
      DOM.modal.style.transform = 'scale(0.8)';
      setTimeout(() => {
        DOM.modal.classList.remove('show');
        DOM.modal.style.transition = '';
      }, 300);
    }
    currentOrderId = null;
  }

  function openCreateModal() {
    DOM.createOrderModal.classList.add('show');
  }

  function closeCreateModal() {
    DOM.createOrderModal.classList.remove('show');
    ['newCustomer', 'newPhone', 'newTotal'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('newStatus').value = 'new';
  }

  function saveNewOrder() {
    const customer = document.getElementById('newCustomer').value.trim();
    const phone = document.getElementById('newPhone').value.trim();
    const address = document.getElementById('newAddress').value.trim();
    const status = document.getElementById('newStatus').value;
    const selectedProducts = Array.from(document.querySelectorAll('.product-checkbox:checked'))
      .map(cb => {
        const qtyInput = cb.parentElement.querySelector('.product-qty');
        const qty = parseInt(qtyInput?.value) || 1;
        const price = parseFloat(cb.dataset.price);
        return { name: cb.dataset.name, price, qty };
      });
    const total = selectedProducts.reduce((sum, p) => sum + p.price * p.qty, 0);
    if (!customer || !phone || !address || selectedProducts.length === 0) {
      Utils.showToast('Vui lòng nhập đầy đủ thông tin và chọn ít nhất 1 sản phẩm!', 'error');
      return;
    }
    if (!/^(0\d{9,10})$/.test(phone)) {
      Utils.showToast('Số điện thoại không hợp lệ! (phải có 10-11 chữ số bắt đầu bằng 0)', 'error');
      return;
    }
    const newOrder = {
      id: `ORD-${String(1000 + orders.length).padStart(5, '0')}`,
      customer: `${customer} (KH${orders.length + 1})`,
      phone,
      date: new Date().toISOString().split('T')[0],
      total,
      status,
      partner: 'GHN',
      tracking: '',
      address,
      payment: 'Thanh toán khi nhận hàng',
      items: selectedProducts
    };
    orders.unshift(newOrder);
    filteredOrders = [...orders];
    renderTable(1);
    closeCreateModal();
    Utils.showToast('Tạo đơn hàng mới thành công!', 'success');
  }

  // DOM CACHING
  function cacheDOM() {
    DOM.tableBody = document.querySelector('#orderTable tbody');
    DOM.pagination = document.getElementById('pagination');
    DOM.modal = document.getElementById('orderModal');
    DOM.modalClose = document.getElementById('modalClose');
    DOM.statusFilter = document.getElementById('statusFilter');
    DOM.dateFrom = document.getElementById('dateFrom');
    DOM.dateTo = document.getElementById('dateTo');
    DOM.customerSearch = document.getElementById('customerSearch');
    DOM.applyFilter = document.getElementById('applyFilter');
    DOM.refreshBtn = document.getElementById('refreshBtn');
    DOM.exportBtn = document.getElementById('exportBtn');
    DOM.saveOrder = document.getElementById('saveOrder');
    DOM.cancelOrder = document.getElementById('cancelOrder');
    DOM.syncShipping = document.getElementById('syncShipping');
    DOM.processRefund = document.getElementById('processRefund');
    DOM.trackingInput = document.getElementById('trackingNo');
    DOM.notifBtn = document.getElementById('notifBtn');
    DOM.notifDropdown = document.getElementById('notifDropdown');
    DOM.logoutBtn = document.querySelector('.logout-btn');
    DOM.hamburger = document.getElementById('hamburgerBtn');
    DOM.sidebar = document.getElementById('sidebar');
    DOM.createOrderBtn = document.getElementById('createOrderBtn');
    DOM.createOrderModal = document.getElementById('createOrderModal');
    DOM.createOrderClose = document.getElementById('createOrderClose');
    DOM.saveNewOrder = document.getElementById('saveNewOrder');
  }

  // EVENT LISTENERS
  function initEventListeners() {
    if (DOM.hamburger && DOM.sidebar) {
      DOM.hamburger.addEventListener('click', (e) => {
        e.stopPropagation();
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
      });
    }
    if (DOM.notifBtn && DOM.notifDropdown) {
      DOM.notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = DOM.notifDropdown.classList.toggle('show');
        if (isOpen) {
          const badge = DOM.notifBtn.querySelector('.notif-badge');
          if (badge) {
            badge.style.display = 'none';
            DOM.notifBtn.classList.remove('has-unread');
          }
        }
      });
      document.addEventListener('click', () => {
        DOM.notifDropdown?.classList.remove('show');
      });
      DOM.notifDropdown.addEventListener('click', (e) => e.stopPropagation());
    }
    if (DOM.applyFilter) {
      DOM.applyFilter.addEventListener('click', applyFilters);
    }
    if (DOM.customerSearch) {
      DOM.customerSearch.addEventListener('input', Utils.debounce(applyFilters, CONFIG.DEBOUNCE_DELAY));
    }
    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn-view')) {
        const orderId = e.target.closest('.btn-view').dataset.id;
        openModal(orderId);
      }
      if (e.target.closest('.btn-delete')) {
        const deleteBtn = e.target.closest('.btn-delete');
        const orderId = deleteBtn.dataset.id;
        const order = orders.find(o => o.id === orderId);
        if (!order) return;
        const modal = document.getElementById('deleteConfirmModal');
        const msg = modal.querySelector('.delete-message');
        msg.textContent = `Bạn có chắc chắn muốn xóa đơn hàng #${order.id} của ${order.customer}?`;
        modal.dataset.orderId = orderId;
        modal.classList.add('show');
      }
      const cancelDeleteBtn = document.getElementById('cancelDelete');
      if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', () => {
          document.getElementById('deleteConfirmModal').classList.remove('show');
        });
      }
      const confirmDeleteBtn = document.getElementById('confirmDelete');
      if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => {
          const modal = document.getElementById('deleteConfirmModal');
          const orderId = modal.dataset.orderId;
          if (orderId) {
            orders = orders.filter(o => o.id !== orderId);
            filteredOrders = [...orders];
            renderTable(currentPage);
            Utils.showToast('Đã xóa đơn hàng thành công!', 'success');
          }
          modal.classList.remove('show');
        });
      }
      if (e.target.dataset.page) {
        const page = +e.target.dataset.page;
        if (page > 0) renderTable(page);
      }
      if (e.target.dataset.tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => 
          c.classList.toggle('hidden', c.id !== `tab-${e.target.dataset.tab}`)
        );
      }
    });
    if (DOM.modalClose) DOM.modalClose.addEventListener('click', closeModal);
    if (DOM.modal) {
      DOM.modal.addEventListener('click', (e) => {
        if (e.target === DOM.modal) closeModal();
      });
    }
    if (DOM.createOrderBtn) {
      DOM.createOrderBtn.addEventListener('click', () => {
        DOM.createOrderModal.classList.add('show');
      });
    }
    if (DOM.createOrderClose) {
      DOM.createOrderClose.addEventListener('click', () => {
        DOM.createOrderModal.classList.remove('show');
      });
    }
    if (DOM.createOrderModal) {
      DOM.createOrderModal.addEventListener('click', (e) => {
        if (e.target === DOM.createOrderModal) {
          DOM.createOrderModal.classList.remove('show');
        }
      });
    }
    if (DOM.saveNewOrder) {
      DOM.saveNewOrder.addEventListener('click', () => {
        const name = document.getElementById('newCustomer').value.trim();
        const phone = document.getElementById('newPhone').value.trim();
        const total = parseFloat(document.getElementById('newTotal').value);
        const status = document.getElementById('newStatus').value;
        if (!name || !phone || !total) {
          Utils.showToast('Vui lòng nhập đầy đủ thông tin đơn hàng!', 'error');
          return;
        }
        const newOrder = {
          id: `ORD-${String(Math.floor(10000 + Math.random() * 90000))}`,
          customer: name, phone, total,
          date: new Date().toISOString().split('T')[0],
          status,
          tracking: '',
          partner: 'GHN',
          address: 'Chưa cập nhật',
          payment: 'Chưa thanh toán',
          items: []
        };
        orders.unshift(newOrder);
        filteredOrders = [...orders];
        renderTable(1);
        DOM.createOrderModal.classList.remove('show');
        Utils.showToast('Đã tạo đơn hàng mới!', 'success');
        DOM.createOrderModal.classList.remove('show');
      });
    }
    if (DOM.refreshBtn) {
      DOM.refreshBtn.addEventListener('click', () => {
        const originalText = DOM.refreshBtn.innerHTML;
        DOM.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        DOM.refreshBtn.disabled = true;
        setTimeout(() => {
          orders = generateSampleData();
          Utils.saveToLocalStorage();
          filteredOrders = [...orders];
          renderTable(1);
          DOM.refreshBtn.innerHTML = originalText;
          DOM.refreshBtn.disabled = false;
          Utils.showToast('Đã tạo lại dữ liệu đơn hàng!', 'success');
        }, 1200);
      });
    }
    if (DOM.exportBtn) {
      DOM.exportBtn.addEventListener('click', async () => {
        const originalText = DOM.exportBtn.innerHTML;
        DOM.exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo báo cáo...';
        DOM.exportBtn.disabled = true;
        try {
          const element = document.querySelector('.order-table-container');
          if (!element) throw new Error('Không tìm thấy bảng đơn hàng');
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });
          const imgData = canvas.toDataURL("image/png");
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({
            orientation: "p",
            unit: "mm",
            format: "a4",
          });
          const imgWidth = 190;
          const pageHeight = 295;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          let yPos = 35;
          pdf.setFontSize(18);
          pdf.setTextColor(0, 74, 173);
          pdf.text("BÁO CÁO ĐƠN HÀNG MEDICARE", 105, 20, { align: "center" });
          pdf.setFontSize(11);
          pdf.setTextColor(80, 80, 80);
          pdf.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 105, 27, { align: "center" });
          pdf.addImage(imgData, "PNG", 10, yPos + 25, imgWidth, imgHeight);
          pdf.save(`medicare_orders_${new Date().toISOString().slice(0, 10)}.pdf`);
          Utils.showToast("Báo cáo PDF đã được tải xuống!", "success");
        } catch (error) {
          console.error("PDF Error:", error);
          Utils.showToast("Lỗi tạo báo cáo!", "error");
        } finally {
          DOM.exportBtn.innerHTML = originalText;
          DOM.exportBtn.disabled = false;
        }
      });
    }
    if (DOM.saveOrder) {
      DOM.saveOrder.addEventListener('click', () => {
        if (currentOrderId) {
          const order = orders.find(o => o.id === currentOrderId);
          order.status = document.getElementById('statusSelect').value;
          order.tracking = document.getElementById('trackingNo').value.trim();
          order.partner = document.getElementById('partnerSelect').value;
          const addrField = document.getElementById('custAddr');
          if (addrField && addrField.value.trim() !== '') {
            order.address = addrField.value.trim();
          } else {
            order.address = 'Chưa cập nhật';
          }

          Utils.saveToLocalStorage();
          Utils.showToast('Đã lưu thay đổi đơn hàng!', 'success');
          closeModal();
          renderTable(currentPage);
        }
      });
    }
    if (DOM.cancelOrder) {
      DOM.cancelOrder.addEventListener('click', () => {
        if (currentOrderId) {
          const order = orders.find(o => o.id === currentOrderId);
          order.status = 'cancelled';
          Utils.saveToLocalStorage();
          Utils.showToast('Đã hủy đơn hàng!', 'error');
          closeModal();
          renderTable(currentPage);
        }
      });
    }
    if (DOM.syncShipping) {
      DOM.syncShipping.addEventListener('click', () => {
        Utils.showToast('Đã đồng bộ vận đơn thành công!', 'success');
      });
    }
    if (DOM.processRefund) {
      DOM.processRefund.addEventListener('click', () => {
        if (document.getElementById('refundReq').checked) {
          Utils.showToast('Đã xử lý hoàn tiền!', 'success');
        } else {
          Utils.showToast('Vui lòng chọn yêu cầu hoàn tiền', 'error');
        }
      });
    }
    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Utils.showLogoutModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOM.modal?.classList.contains('show')) {
        closeModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        DOM.refreshBtn?.click();
      }
    });
  }

  // INITIALIZATION
  function init() {
    console.log('MediCare Admin Order Management initializing...');
    cacheDOM();
    const savedOrders = Utils.loadFromLocalStorage();
    orders = savedOrders && savedOrders.length > 0 ? savedOrders : generateSampleData();
    filteredOrders = [...orders];
    renderTable(1);
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (DOM.dateFrom) DOM.dateFrom.valueAsDate = last30Days;
    if (DOM.dateTo) DOM.dateTo.valueAsDate = today;
    initEventListeners();
    if ('performance' in window) {
      console.log(` Admin Order Management LOADED in ${Math.round(performance.now())}ms`);
    }
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        DOM.refreshBtn?.click();
      }
    }, 1800000);
  }

  document.querySelectorAll('.product-checkbox, .product-qty').forEach(el => {
    el.addEventListener('input', () => {
      let total = 0;
      document.querySelectorAll('.product-checkbox').forEach(box => {
        if (box.checked) {
          const price = parseFloat(box.dataset.price);
          const qtyInput = box.parentElement.querySelector('.product-qty');
          const qty = parseInt(qtyInput.value) || 1;
          total += price * qty;
        }
      });
      document.getElementById('newTotal').value = total;
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }
})();