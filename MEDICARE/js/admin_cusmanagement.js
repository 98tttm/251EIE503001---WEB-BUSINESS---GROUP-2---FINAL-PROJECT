(() => {
  'use strict';

  // GLOBAL STATE
  let orders = [];
  let customers = [];
  let filteredCustomers = [];
  let currentPage = 1;
  let currentCustomerId = null;
  const itemsPerPage = 10;

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
        top: '100px',
        right: '24px',
        background: type === 'success' ? 'linear-gradient(135deg, #28a745, #20c997)' : 'linear-gradient(135deg, #dc3545, #fd7e14)',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
        zIndex: '10002',
        transform: 'translateX(400px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: 'blur(10px)',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px'
      });
      document.body.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
      });
      setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => toast.remove(), 400);
      }, 4000);
    },
    showLogoutModal() {
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

  // DERIVE CUSTOMERS FROM ORDERS
  function deriveCustomersFromOrders(orders) {
    const customerMap = new Map();
    orders.forEach(order => {
      const key = order.phone;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: `CUS-${String(customerMap.size + 1).padStart(5, '0')}`,
          name: order.customer,
          phone: order.phone,
          address: order.address,
          total_orders: 0,
          total_spent: 0,
          last_order_date: order.date,
          order_ids: [],
          status: 'active'
        });
      }
      const cust = customerMap.get(key);
      cust.total_orders += 1;
      cust.total_spent += order.total;
      cust.order_ids.push(order.id);
      if (order.date > cust.last_order_date) cust.last_order_date = order.date;
    });
    return Array.from(customerMap.values());
  }

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
    const pageData = filteredCustomers.slice(start, end);
    if (DOM.tableBody) {
      DOM.tableBody.innerHTML = pageData.length > 0 ? pageData.map(customer => `
        <tr data-id="${customer.id}" class="customer-row">
          <td><strong>${customer.id}</strong></td>
          <td>
            <div class="customer-info">
              <strong>${customer.name.split(' ')[0]}</strong>
              <br><small>${customer.name}</small>
              <br><small class="phone">${customer.phone}</small>
            </div>
          </td>
          <td>${customer.phone}</td>
          <td>${customer.address}</td>
          <td>${customer.total_orders}</td>
          <td><strong>${Utils.formatMoney(customer.total_spent)}</strong></td>
          <td>${Utils.formatDate(customer.last_order_date)}</td>
          <td class="action-cell">
            <div class="action-buttons">
              <button class="btn-action btn-view" data-id="${customer.id}" title="Xem chi tiết">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn-action btn-delete" data-id="${customer.id}" title="Xóa khách hàng">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('') : `
        <tr>
          <td colspan="9" style="text-align: center; padding: 20px;">
            Không có khách hàng nào để hiển thị.
          </td>
        </tr>
      `;
    }
    renderPagination();
  }

  function renderPagination() {
    if (!DOM.pagination) return;
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
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
    DOM.pagination.innerHTML = totalPages > 0 ? html : '';
  }

  // FILTERING SYSTEM
  function applyFilters() {
    const status = DOM.statusFilter?.value;
    const from = DOM.dateFrom?.value;
    const to = DOM.dateTo?.value;
    const nameSearch = DOM.nameFilter?.value.toLowerCase();
    const phoneSearch = DOM.phoneFilter?.value.toLowerCase();
    filteredCustomers = customers.filter(customer => {
      if (status && customer.status !== status) return false;
      if (from && customer.last_order_date < from) return false;
      if (to && customer.last_order_date > to) return false;
      if (nameSearch && !customer.name.toLowerCase().includes(nameSearch)) return false;
      if (phoneSearch && !customer.phone.includes(phoneSearch)) return false;
      return true;
    });
    renderTable(1);
    Utils.showToast(`Đã lọc ${filteredCustomers.length} khách hàng`, 'info');
  }

  // MODAL SYSTEM
  function openModal(customerId) {
    currentCustomerId = customerId;
    const customer = customers.find(c => c.id === customerId);
    if (!customer || !DOM.modal) return;
    document.getElementById('cusId').textContent = customer.id;
    document.getElementById('cusName').value = customer.name;
    document.getElementById('cusPhone').value = customer.phone;
    document.getElementById('cusAddress').value = customer.address;
    document.getElementById('cusOrders').textContent = customer.total_orders;
    document.getElementById('cusSpent').textContent = Utils.formatMoney(customer.total_spent);
    document.getElementById('cusLastOrder').textContent = Utils.formatDate(customer.last_order_date);
    const orderHistoryBody = document.getElementById('orderHistoryBody');
    orderHistoryBody.innerHTML = customer.order_ids.map(orderId => {
      const order = orders.find(o => o.id === orderId);
      return order ? `
        <tr>
          <td><strong>${order.id}</strong></td>
          <td>${Utils.formatDate(order.date)}</td>
          <td>${Utils.formatMoney(order.total)}</td>
          <td><span class="status-badge status-${order.status}">${Utils.statusLabel(order.status)}</span></td>
        </tr>
      ` : '';
    }).join('');
    DOM.modal.style.opacity = '0';
    DOM.modal.style.transform = 'scale(0.8)';
    DOM.modal.classList.add('show');
    requestAnimationFrame(() => {
      DOM.modal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      DOM.modal.style.opacity = '1';
      DOM.modal.style.transform = 'scale(1)';
    });
  }

  function closeModal() {
    if (DOM.modal && DOM.modal.classList.contains('show')) {
      DOM.modal.style.opacity = '0';
      DOM.modal.style.transform = 'scale(0.8)';
      setTimeout(() => {
        DOM.modal.classList.remove('show');
        DOM.modal.style.transition = '';
      }, 300);
    }
    currentCustomerId = null;
  }

  function openCreateModal() {
    DOM.createCustomerModal.classList.add('show');
  }

  function closeCreateModal() {
    DOM.createCustomerModal.classList.remove('show');
    ['newCusName', 'newCusPhone', 'newCusAddress'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.value = '';
    });
  }

  function saveNewCustomer() {
    const nameInput = document.getElementById('newCusName');
    const phoneInput = document.getElementById('newCusPhone');
    const addressInput = document.getElementById('newCusAddress');

    // Kiểm tra xem các trường nhập liệu có tồn tại không
    if (!nameInput || !phoneInput || !addressInput) {
        Utils.showToast('Không tìm thấy các trường nhập liệu trong modal!', 'error');
        return;
    }

    // Lấy giá trị từ các trường nhập liệu
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();

    // Kiểm tra thông tin nhập liệu có đầy đủ không
    if (!name || !phone || !address) {
        Utils.showToast('Vui lòng nhập đầy đủ thông tin khách hàng!', 'error');
        return;
    }

    // Kiểm tra số điện thoại hợp lệ
    if (!/^(0\d{9,10})$/.test(phone)) {
        Utils.showToast('Số điện thoại không hợp lệ! (phải có 10-11 chữ số bắt đầu bằng 0)', 'error');
        return;
    }

    // Kiểm tra xem số điện thoại đã tồn tại trong danh sách khách hàng chưa
    if (customers.some(c => c.phone === phone)) {
        Utils.showToast('Khách hàng với số điện thoại này đã tồn tại!', 'error');
        return;
    }
    const currentDate = new Date().toISOString().split('T')[0]; 

    // Tạo một order placeholder để đồng bộ với customers
    const newOrderId = `ORD-${String(orders.length + 1).padStart(5, '0')}`;
    const newOrder = {
      id: newOrderId,
      customer: name,
      phone: phone,
      date: currentDate,
      total: 0,
      status: 'new',
      partner: 'N/A',
      tracking: 'N/A',
      address: address,
      payment: 'N/A',
      items: []
    };

    // Thêm order mới vào orders
    orders.unshift(newOrder);

    // Lưu orders vào localStorage
    Utils.saveToLocalStorage();

    // Derive lại customers từ orders
    customers = deriveCustomersFromOrders(orders);
    filteredCustomers = [...customers];

    // Cập nhật giao diện
    renderTable(1);

    // Đóng modal và thông báo thành công
    closeCreateModal();
    Utils.showToast(`Tạo khách hàng "${name}" thành công!`, 'success');
}

  // DOM CACHING
  function cacheDOM() {
    DOM.tableBody = document.getElementById('customerTableBody');
    DOM.pagination = document.getElementById('pagination');
    DOM.modal = document.getElementById('customerModal');
    DOM.modalClose = document.getElementById('closeModal');
    DOM.nameFilter = document.getElementById('nameFilter');
    DOM.phoneFilter = document.getElementById('phoneFilter');
    DOM.dateFrom = document.getElementById('dateFrom');
    DOM.dateTo = document.getElementById('dateTo');
    DOM.statusFilter = document.getElementById('statusFilter');
    DOM.applyFilter = document.getElementById('applyFilter');
    DOM.refreshBtn = document.getElementById('refreshBtn');
    DOM.exportBtn = document.getElementById('exportBtn');
    DOM.saveCustomer = document.getElementById('saveCustomer');
    DOM.notifBtn = document.getElementById('notifBtn');
    DOM.notifDropdown = document.getElementById('notifDropdown');
    DOM.logoutBtn = document.querySelector('.logout-btn');
    DOM.hamburger = document.getElementById('hamburgerBtn');
    DOM.sidebar = document.getElementById('sidebar');
    DOM.createCustomerBtn = document.getElementById('createCustomerBtn');
    DOM.createCustomerModal = document.getElementById('createCustomerModal');
    DOM.createCustomerClose = document.getElementById('createCustomerClose');
    DOM.saveNewCustomer = document.getElementById('saveNewCustomer');
    DOM.cancelNewCustomer = document.getElementById('cancelNewCustomer');
    DOM.deleteConfirmModal = document.getElementById('deleteConfirmModal');
    DOM.cancelDelete = document.getElementById('cancelDelete');
    DOM.confirmDelete = document.getElementById('confirmDelete');
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

    if (DOM.nameFilter) {
      DOM.nameFilter.addEventListener('input', Utils.debounce(applyFilters, CONFIG.DEBOUNCE_DELAY));
    }

    if (DOM.phoneFilter) {
      DOM.phoneFilter.addEventListener('input', Utils.debounce(applyFilters, CONFIG.DEBOUNCE_DELAY));
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn-view')) {
        const customerId = e.target.closest('.btn-view').dataset.id;
        openModal(customerId);
      }
      if (e.target.closest('.btn-delete')) {
        const deleteBtn = e.target.closest('.btn-delete');
        const customerId = deleteBtn.dataset.id;
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return;
        const modal = DOM.deleteConfirmModal;
        const msg = modal.querySelector('.delete-message');
        msg.textContent = `Bạn có chắc chắn muốn xóa khách hàng #${customer.id} - ${customer.name}? (Sẽ xóa tất cả đơn hàng liên quan)`;
        modal.dataset.customerId = customerId;
        modal.classList.add('show');
      }
    });

    if (DOM.cancelDelete) {
      DOM.cancelDelete.addEventListener('click', () => {
        DOM.deleteConfirmModal.classList.remove('show');
      });
    }

    if (DOM.confirmDelete) {
      DOM.confirmDelete.addEventListener('click', () => {
        const modal = DOM.deleteConfirmModal;
        const customerId = modal.dataset.customerId;
        if (customerId) {
          const customer = customers.find(c => c.id === customerId);
          orders = orders.filter(o => o.phone !== customer.phone);
          Utils.saveToLocalStorage();
          customers = deriveCustomersFromOrders(orders);
          filteredCustomers = [...customers];
          renderTable(currentPage);
          Utils.showToast('Đã xóa khách hàng và đơn hàng liên quan thành công!', 'success');
        }
        modal.classList.remove('show');
      });
    }

    if (DOM.pagination) {
      DOM.pagination.addEventListener('click', (e) => {
        if (e.target.dataset.page) {
          const page = +e.target.dataset.page;
          if (page > 0) renderTable(page);
        }
      });
    }

    if (DOM.tabNav) {
      DOM.tabNav.addEventListener('click', (e) => {
        if (e.target.dataset.tab) {
          document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
          e.target.classList.add('active');
          const status = e.target.dataset.tab === 'all' ? '' : e.target.dataset.tab;
          DOM.statusFilter.value = status;
          applyFilters();
        }
      });
    }

    if (DOM.modalClose) {
      DOM.modalClose.addEventListener('click', closeModal);
    }

    if (DOM.modal) {
      DOM.modal.addEventListener('click', (e) => {
        if (e.target === DOM.modal) closeModal();
      });
    }

    if (DOM.createCustomerBtn) {
      DOM.createCustomerBtn.addEventListener('click', openCreateModal);
    }

    if (DOM.createCustomerClose) {
      DOM.createCustomerClose.addEventListener('click', closeCreateModal);
    }

    if (DOM.cancelNewCustomer) {
      DOM.cancelNewCustomer.addEventListener('click', closeCreateModal);
    }

    if (DOM.createCustomerModal) {
      DOM.createCustomerModal.addEventListener('click', (e) => {
        if (e.target === DOM.createCustomerModal) closeCreateModal();
      });
    }

    if (DOM.saveNewCustomer) {
      DOM.saveNewCustomer.addEventListener('click', saveNewCustomer);
    }

    if (DOM.refreshBtn) {
      DOM.refreshBtn.addEventListener('click', () => {
        const originalText = DOM.refreshBtn.innerHTML;
        DOM.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        DOM.refreshBtn.disabled = true;
        setTimeout(() => {
          orders = Utils.loadFromLocalStorage() || generateSampleData();
          Utils.saveToLocalStorage();
          customers = deriveCustomersFromOrders(orders);
          filteredCustomers = [...customers];
          renderTable(1);
          DOM.refreshBtn.innerHTML = originalText;
          DOM.refreshBtn.disabled = false;
          Utils.showToast('Đã làm mới dữ liệu!', 'success');
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
          if (!element) throw new Error('Không tìm thấy bảng khách hàng');
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
          pdf.text("BÁO CÁO KHÁCH HÀNG MEDICARE", 105, 20, { align: "center" });
          pdf.setFontSize(11);
          pdf.setTextColor(80, 80, 80);
          pdf.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 105, 27, { align: "center" });
          pdf.addImage(imgData, "PNG", 10, yPos + 25, imgWidth, imgHeight);
          pdf.save(`medicare_customers_${new Date().toISOString().slice(0, 10)}.pdf`);
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

    if (DOM.saveCustomer) {
      DOM.saveCustomer.addEventListener('click', () => {
        if (currentCustomerId) {
          const customer = customers.find(c => c.id === currentCustomerId);
          const newName = document.getElementById('cusName').value.trim();
          const newPhone = document.getElementById('cusPhone').value.trim();
          const newAddr = document.getElementById('cusAddress').value.trim();
          const newStatus = document.getElementById('cusStatus').value;
          if (!newName || !newPhone || !newAddr) {
            Utils.showToast('Vui lòng nhập đầy đủ thông tin!', 'error');
            return;
          }
          if (!/^(0\d{9,10})$/.test(newPhone)) {
            Utils.showToast('Số điện thoại không hợp lệ! (phải có 10-11 chữ số bắt đầu bằng 0)', 'error');
            return;
          }
          if (newPhone !== customer.phone && customers.some(c => c.phone === newPhone)) {
            Utils.showToast('Số điện thoại này đã được sử dụng!', 'error');
            return;
          }
          orders.forEach(order => {
            if (order.phone === customer.phone) {
              order.customer = newName;
              order.phone = newPhone;
              order.address = newAddr;
            }
          });
          customer.name = newName;
          customer.phone = newPhone;
          customer.address = newAddr;
          customer.status = newStatus;

          Utils.saveToLocalStorage();
          customers = deriveCustomersFromOrders(orders);
          filteredCustomers = [...customers];
          renderTable(currentPage);
          Utils.showToast('Đã lưu thay đổi khách hàng!', 'success');
          closeModal();
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
    console.log('MediCare Admin Customer Management initializing...');
    cacheDOM();
    const savedOrders = Utils.loadFromLocalStorage();
    orders = savedOrders && savedOrders.length > 0 ? savedOrders : generateSampleData();
    if (!savedOrders) Utils.saveToLocalStorage();
    customers = deriveCustomersFromOrders(orders);
    filteredCustomers = [...customers];
    if (customers.length === 0) {
      customers = [];
      filteredCustomers = [];
    }
    renderTable(1);
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (DOM.dateFrom) DOM.dateFrom.valueAsDate = last30Days;
    if (DOM.dateTo) DOM.dateTo.valueAsDate = today;
    initEventListeners();
    if ('performance' in window) {
      console.log(`Admin Customer Management LOADED in ${Math.round(performance.now())}ms`);
    }
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        DOM.refreshBtn?.click();
      }
    }, 1800000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }
})();