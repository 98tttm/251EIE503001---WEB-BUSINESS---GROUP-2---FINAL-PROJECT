(() => {
  'use strict';

  // GLOBAL STATE
  let products = [];
  let filteredProducts = [];
  let categories = [
    { id: 'thuoc', name: 'Thuốc' },
    { id: 'vitamin', name: 'Vitamin' },
    { id: 'khangsinh', name: 'Kháng sinh' }
  ];
  let attributes = [
    { id: 'dosage', name: 'Dạng bào chế', values: ['Viên', 'Nang', 'Lỏng'] },
    { id: 'strength', name: 'Hàm lượng', values: ['500mg', '1000mg'] }
  ];
  let currentPage = 1;
  let currentProductId = null;
  const itemsPerPage = 10;

  // CONFIGURATION
  const CONFIG = {
    ANIMATION_DURATION: 250,
    DEBOUNCE_DELAY: 300,
    NOTIFICATION_POLLING: 30000,
    LOCAL_STORAGE_KEY: 'medicare_products'
  };

  // DOM Cache
  const DOM = {  
    prodId: document.getElementById('prodId'),
    prodName: document.getElementById('prodName'),
    prodCategory: document.getElementById('prodCategory'),
    prodPrice: document.getElementById('prodPrice'),
    prodDiscount: document.getElementById('prodDiscount'),
    prodStock: document.getElementById('prodStock'),
    prodExpiry: document.getElementById('prodExpiry'),
    prodDescription: document.getElementById('prodDescription'),
    prodStatus: document.getElementById('prodStatus'),
    prodImagePreview: document.getElementById('prodImagePreview'),
    batchTableBody: document.getElementById('batchTableBody'),

    // --- Filter elements ---
    filterName: document.getElementById('filterName'),
    filterCategory: document.getElementById('filterCategory'),
    filterStatus: document.getElementById('filterStatus'),
    filterExpiry: document.getElementById('filterExpiry'),

    productTableBody: document.getElementById('productTableBody'),  
    pagination: document.getElementById('pagination'),  
    editProductModal: document.getElementById('editProductModal'),  
    deleteConfirmModal: document.getElementById('deleteConfirmModal'),  
    confirmDelete: document.getElementById('confirmDelete'),  
    cancelDelete: document.getElementById('cancelDelete'),  
    modalClose: document.getElementById('closeEditModal'),  
    saveProduct: document.getElementById('saveProduct'),  
    addBatchBtn: document.getElementById('addBatchBtn'), 

    applyFilter: document.getElementById('applyFilter'), 
    createProductBtn: document.getElementById('createProductBtn'),  
    closeCreateModal: document.getElementById('closeCreateModal'),  
    cancelCreate: document.getElementById('cancelCreate'),  
    saveNewProduct: document.getElementById('saveNewProduct'),  
    refreshBtn: document.getElementById('refreshBtn'),  
    exportBtn: document.getElementById('exportBtn'),  
    manageCategoryBtn: document.getElementById('manageCategoryBtn'),  
    categoryModal: document.getElementById('categoryModal'),  
    closeCategoryModal: document.getElementById('closeCategoryModal'),  
    addCategoryBtn: document.getElementById('addCategoryBtn'),  
    categoryTableBody: document.getElementById('categoryTableBody'),  
    manageAttributeBtn: document.getElementById('manageAttributeBtn'),  
    attributeModal: document.getElementById('attributeModal'), 
    closeAttributeModal: document.getElementById('closeAttributeModal'),  
    addAttributeBtn: document.getElementById('addAttributeBtn'),  
    attributeTableBody: document.getElementById('attributeTableBody'),  
    hamburger: document.getElementById('hamburgerBtn'),
    sidebar: document.getElementById('sidebar'),
    notifBtn: document.getElementById('notifBtn'),
    notifDropdown: document.getElementById('notifDropdown'),
    logoutBtn: document.getElementById('logoutBtn'),
  };

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
        active: 'Hoạt động',
        pending: 'Chờ duyệt',
        inactive: 'Không hoạt động',
        expired: 'Hết hạn'
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
        localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(products));
        console.log('Products saved to localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        Utils.showToast('Lỗi khi lưu dữ liệu sản phẩm!', 'error');
      }
    },
    loadFromLocalStorage() {
      try {
        const savedProducts = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
        if (savedProducts) {
          const parsedProducts = JSON.parse(savedProducts);
          if (Array.isArray(parsedProducts)) {
            return parsedProducts;
          }
        }
        return null;
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        Utils.showToast('Lỗi khi tải dữ liệu sản phẩm!', 'error');
        return null;
      }
    }
  };
  function openModal(modal) {
    if (modal) modal.classList.add('show');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('show');
  }


  // PRODUCT DATA GENERATOR
  function generateSampleData() {
    const statuses = ['active', 'pending', 'inactive', 'expired'];
    const sampleCategories = ['thuoc', 'vitamin', 'khangsinh'];
    return Array.from({ length: 60 }, (_, i) => ({
      id: `PROD-${String(1000 + i).padStart(5, '0')}`,
      name: `Sản phẩm ${i + 1}`,
      category: sampleCategories[Math.floor(Math.random() * sampleCategories.length)],
      price: Math.floor(Math.random() * 2000000) + 300000,
      discount: Math.floor(Math.random() * 100000),
      stock: Math.floor(Math.random() * 100) + 1,
      expiry: `2025-10-${String(15 + Math.floor(Math.random() * 10)).padStart(2, '0')}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      description: `Mô tả sản phẩm ${i + 1}`,
      image: '',
      ratings: { average: Math.random() * 5 }
    }));
  }

  // TABLE RENDERING ENGINE
  function renderTable(page = 1) {
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredProducts.slice(start, end);

    if (DOM.productTableBody) {
      DOM.productTableBody.innerHTML =
        pageData.length > 0
          ? pageData
              .map(product => {
                const catName =
                  categories.find(c => c.id === product.categoryId)?.name ||
                  'Không xác định';

                return `
                  <tr data-id="${product.id}" class="product-row">
                    <td><input type="checkbox" class="selectItem"></td>
                    <td><strong>${product.id}</strong></td>
                    <td>${product.name}</td>
                    <td>${catName}</td>
                    <td>${Utils.formatMoney(product.price)}</td>
                    <td>${product.stock}</td>
                    <td>${Utils.formatDate(product.expiry)}</td>
                    <td><span class="status-badge ${product.status}">${Utils.statusLabel(
                  product.status
                )}</span></td>
                    <td>
                      <img src="${
                        product.image || '../assets/placeholder.png'
                      }" alt="${product.name}" class="product-img" style="max-width: 50px; border-radius: 4px;">
                    </td>
                    <td>${
                      product.ratings?.average
                        ? product.ratings.average.toFixed(1)
                        : 'N/A'
                    }</td>
                    <td>
                      <div class="action-buttons">
                        <button class="btn-view" data-id="${
                          product.id
                        }" title="Xem chi tiết">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-edit" data-id="${
                          product.id
                        }" title="Chỉnh sửa">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" data-id="${
                          product.id
                        }" title="Xóa">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join('')
          : '<tr><td colspan="11" style="text-align: center; padding: 20px;">Không tìm thấy sản phẩm</td></tr>';

      renderPagination();
    }
  }
  // RENDER PAGINATION
  function renderPagination() {
    const pages = Math.ceil(filteredProducts.length / itemsPerPage);
    DOM.pagination.innerHTML = '';
    if (pages <= 1) return;
    const createBtn = (text, page, active = false, disabled = false) => {
      const btn = document.createElement('button');
      btn.className = `page-btn ${active ? 'active' : ''}`;
      btn.disabled = disabled;
      btn.textContent = text;
      if (!disabled) btn.dataset.page = page;
      return btn;
    };
    DOM.pagination.appendChild(createBtn('«', 1, false, currentPage === 1));
    DOM.pagination.appendChild(createBtn('<', currentPage - 1, false, currentPage === 1));
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(pages, currentPage + 2); i++) {
      DOM.pagination.appendChild(createBtn(i, i, i === currentPage));
    }
    DOM.pagination.appendChild(createBtn('>', currentPage + 1, false, currentPage === pages));
    DOM.pagination.appendChild(createBtn('»', pages, false, currentPage === pages));
  }

  // FILTER PRODUCTS
  function applyFilters() {
    const name = DOM.filterName.value.toLowerCase();
    const category = DOM.filterCategory.value;
    const status = DOM.filterStatus.value;
    const expiry = DOM.filterExpiry.value;

    filteredProducts = products.filter(p => {
      const matchName = p.name.toLowerCase().includes(name);
      const matchCategory = !category || p.categoryId === category;
      const matchStatus = !status || p.status === status;

      // Kiểm tra hạn sử dụng
      if (expiry === 'near') {
        const expDate = new Date(p.expiry);
        const now = new Date();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        return matchName && matchCategory && matchStatus &&
              expDate >= now && expDate <= new Date(now.getTime() + thirtyDays);
      }

      if (expiry === 'expired') {
        return matchName && matchCategory && matchStatus &&
              new Date(p.expiry) < new Date();
      }

      // Trường hợp còn lại (không lọc theo hạn)
      return matchName && matchCategory && matchStatus;
    });
    renderTable(1);
  }
  // OPEN EDIT MODAL 
  function openModal(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) {
      Utils.showToast("Không tìm thấy sản phẩm!", "error");
      return;
    }

    currentProductId = productId;

    // Gán dữ liệu vào form
    DOM.prodId.textContent = product.id || "";
    DOM.prodName.value = product.name || "";
    DOM.prodPrice.value = product.price || 0;
    DOM.prodDiscount.value = product.discount || 0;
    DOM.prodStock.value = product.stock || 0;
    DOM.prodExpiry.value = product.expiry || "";
    DOM.prodDescription.value = product.description || "";
    DOM.prodStatus.value = product.status || "active";
    DOM.prodImagePreview.src = product.image || "../assets/placeholder.png";

    // Danh mục
    if (DOM.prodCategory) {
      const options = categories
        .map(
          cat => `<option value="${cat.id}" ${cat.id === product.categoryId ? "selected" : ""}>${cat.name}</option>`
        )
        .join("");
      DOM.prodCategory.innerHTML = `<option value="">Chọn danh mục</option>${options}`;
    }

    // Bật tất cả input cho chỉnh sửa
    const modal = DOM.editProductModal;
    const inputs = modal.querySelectorAll(".editable, select, textarea");
    inputs.forEach(el => el.removeAttribute("disabled"));

    //  Hiện nút Lưu
    const btnSave = modal.querySelector("#saveProduct");
    if (btnSave) btnSave.style.display = "inline-flex";

    // Đổi tiêu đề modal
    const modalTitle = modal.querySelector(".modal-title");
    if (modalTitle) {
      modalTitle.innerHTML = `<i class="fas fa-edit"></i> Chỉnh sửa sản phẩm`;
    }
    // Mở modal
    modal.classList.add("show");
  }
  //OPEN VIEW MODAL
  function openViewModal(productId) {
    const product = products.find(p => p.id == productId);
    if (!product) {
      Utils.showToast("Không tìm thấy sản phẩm!", "error");
      return;
    }

    document.getElementById("viewProdId").textContent = product.id || "";
    document.getElementById("viewProdName").textContent = product.name || "";
    document.getElementById("viewProdCategory").textContent =
      categories.find(c => c.id === product.categoryId)?.name || "Không xác định";
    document.getElementById("viewProdPrice").textContent = Utils.formatMoney(product.price);
    document.getElementById("viewProdStock").textContent = product.stock || "—";
    document.getElementById("viewProdExpiry").textContent = Utils.formatDate(product.expiry);
    document.getElementById("viewProdStatus").textContent = Utils.statusLabel(product.status);
    document.getElementById("viewProdImage").src = product.image || "../assets/placeholder.png";
    document.getElementById("viewProdDescription").textContent = product.description || "";

    document.getElementById("viewProductModal").classList.add("show");
  }
  function syncCategorySelects() {
    const opts = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    // Filter bar
    if (DOM.filterCategory) {
      const current = DOM.filterCategory.value;
      DOM.filterCategory.innerHTML = `<option value="">Tất cả</option>${opts}`;
      if (current) DOM.filterCategory.value = current;
    }
    // Modal "Chỉnh sửa sản phẩm"
    if (DOM.prodCategory) {
      const current = DOM.prodCategory.value;
      DOM.prodCategory.innerHTML = `<option value="">Chọn danh mục</option>${opts}`;
      if (current) DOM.prodCategory.value = current;
    }
    // Modal "Thêm sản phẩm mới"
    const newProdCategory = document.getElementById('newProdCategory');
    if (newProdCategory) {
      const currentNew = newProdCategory.value;
      newProdCategory.innerHTML = `<option value="">Chọn danh mục</option>${opts}`;
      if (currentNew) newProdCategory.value = currentNew;
    }
  }
  function openCategoryEdit(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return Utils.showToast('Không tìm thấy danh mục!', 'error');
    DOM.catEditId.value = cat.id;
    DOM.catEditName.value = cat.name || '';
    DOM.categoryEditModal.classList.add('show');
  }
  function saveCategory() {
    const id = DOM.catEditId.value;
    const name = DOM.catEditName.value.trim();
    if (!name) return Utils.showToast('Tên danh mục không được để trống!', 'error');

    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) return Utils.showToast('Không tìm thấy danh mục!', 'error');

    categories[idx].name = name;

    renderCategoryTable();
    syncCategorySelects();
    renderTable(currentPage); // cập nhật tên danh mục trong bảng sản phẩm
    Utils.showToast('Đã cập nhật danh mục!', 'success');
    DOM.categoryEditModal.classList.remove('show');
  }
  function deleteCategory(catId) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return Utils.showToast('Không tìm thấy danh mục!', 'error');

    // Gán thông tin vào modal xác nhận
    DOM.deleteCategoryMessage.textContent = `Bạn có chắc chắn muốn xoá danh mục "${cat.name}" không?`;
    DOM.deleteCategoryModal.dataset.catId = catId;

    // Hiển thị modal xác nhận xoá danh mục
    DOM.deleteCategoryModal.classList.add('show');
  }



  // CLOSE MODAL
  function closeModal() {
    DOM.editProductModal.classList.remove('show');
    currentProductId = null;
  }

  // OPEN CREATE MODAL
  function openCreateModal() {
    // Clear form fields
    document.getElementById('newProdName').value = '';
    document.getElementById('newProdCategory').value = '';
    document.getElementById('newProdPrice').value = '';
    document.getElementById('newProdDiscount').value = '';
    document.getElementById('newProdStock').value = '';
    document.getElementById('newProdExpiry').value = '';
    document.getElementById('newProdDescription').value = '';
    document.getElementById('newProdStatus').value = 'active';
    // Clear batch table if any
    DOM.createProductModal.classList.add('show');
  }

  // CLOSE CREATE MODAL
  function closeCreateModal() {
    DOM.createProductModal.classList.remove('show');
  }

  // SAVE NEW PRODUCT
  function saveNewProduct() {
    const newName = document.getElementById('newProdName').value.trim();
    const newCategory = document.getElementById('newProdCategory').value;
    const newPrice = parseFloat(document.getElementById('newProdPrice').value);
    const newDiscount = parseFloat(document.getElementById('newProdDiscount').value) || 0;
    const newStock = parseInt(document.getElementById('newProdStock').value);
    const newExpiry = document.getElementById('newProdExpiry').value;
    const newDescription = document.getElementById('newProdDescription').value.trim();
    const newStatus = document.getElementById('newProdStatus').value;
    if (!newName || !newCategory || isNaN(newPrice) || isNaN(newStock) || !newExpiry) {
      Utils.showToast('Vui lòng nhập đầy đủ thông tin hợp lệ!', 'error');
      return;
    }
    const newProduct = {
      id: `PROD-${Date.now().toString().slice(-6)}`,
      name: newName,
      category: newCategory,
      price: newPrice,
      discount: newDiscount,
      stock: newStock,
      expiry: newExpiry,
      description: newDescription,
      status: newStatus,
      image: '',
      batches: [],
      ratings: { average: 0 }
    };
    products.push(newProduct);
    Utils.saveToLocalStorage();
    filteredProducts = [...products];
    applyFilters();
    Utils.showToast('Đã thêm sản phẩm mới thành công!', 'success');
    closeCreateModal();
  }

  // CACHE DOM
  function cacheDOM() {
    DOM.sidebar = document.getElementById('sidebar');
    DOM.hamburger = document.getElementById('hamburgerBtn');
    DOM.notifBtn = document.getElementById('notifBtn');
    DOM.notifDropdown = document.getElementById('notifDropdown');
    DOM.logoutBtn = document.querySelector('.logout-btn');
    // Nút thao tác chính
    DOM.refreshBtn = document.getElementById('refreshBtn');
    DOM.exportBtn = document.getElementById('exportBtn');
    DOM.createProductBtn = document.getElementById('createProductBtn');
    DOM.manageCategoryBtn = document.getElementById('manageCategoryBtn');
    DOM.applyFilter = document.getElementById('applyFilter');
    // Bộ lọc
    DOM.filterName = document.getElementById('filterName');
    DOM.filterCategory = document.getElementById('filterCategory');
    DOM.filterStatus = document.getElementById('filterStatus');
    DOM.filterExpiry = document.getElementById('filterExpiry');
    // Bảng sản phẩm
    DOM.selectAll = document.getElementById('selectAll');
    DOM.productTableBody = document.getElementById('productTableBody');
    DOM.pagination = document.getElementById('pagination');
    // Modals
    DOM.editProductModal = document.getElementById('editProductModal');
    DOM.createProductModal = document.getElementById('createProductModal');
    DOM.deleteConfirmModal = document.getElementById('deleteConfirmModal');
    DOM.categoryModal = document.getElementById('categoryModal');
    // Modal buttons
    DOM.modalClose = document.getElementById('closeEditModal');
    DOM.closeCreateModal = document.getElementById('closeCreateModal');
    DOM.cancelCreate = document.getElementById('cancelCreate');
    DOM.cancelDelete = document.getElementById('cancelDelete');
    DOM.confirmDelete = document.getElementById('confirmDelete');
    // Product fields
    DOM.prodId = document.getElementById('prodId');
    DOM.prodName = document.getElementById('prodName');
    DOM.prodCategory = document.getElementById('prodCategory');
    DOM.prodPrice = document.getElementById('prodPrice');
    DOM.prodDiscount = document.getElementById('prodDiscount');
    DOM.prodStock = document.getElementById('prodStock');
    DOM.prodExpiry = document.getElementById('prodExpiry');
    DOM.prodDescription = document.getElementById('prodDescription');
    DOM.prodStatus = document.getElementById('prodStatus');
    DOM.prodImagePreview = document.getElementById('prodImagePreview');
    // Category & Attribute
    DOM.categoryTableBody = document.getElementById('categoryTableBody');
    DOM.addCategoryBtn = document.getElementById('addCategoryBtn');
    DOM.closeCategoryModal = document.getElementById('closeCategoryModal');
    DOM.categoryEditModal = document.getElementById('categoryEditModal');
    DOM.closeCategoryEdit  = document.getElementById('closeCategoryEdit');
    DOM.catEditId         = document.getElementById('catEditId');
    DOM.catEditName       = document.getElementById('catEditName');
    DOM.saveCategory      = document.getElementById('saveCategory');
    DOM.deleteCategoryModal = document.getElementById('deleteCategoryModal');
    DOM.deleteCategoryMessage = document.getElementById('deleteCategoryMessage');
    DOM.confirmDeleteCategory = document.getElementById('confirmDeleteCategory');
    DOM.cancelDeleteCategory = document.getElementById('cancelDeleteCategory');
    DOM.closeDeleteCategoryModal = document.getElementById('closeDeleteCategoryModal');
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

    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Utils.showLogoutModal();
      });
    }

    if (DOM.applyFilter) {
      DOM.applyFilter.addEventListener('click', applyFilters);
    }

    if (DOM.filterName) {
      DOM.filterName.addEventListener('input', Utils.debounce(applyFilters, CONFIG.DEBOUNCE_DELAY));
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn-view')) {
        const productId = e.target.closest('button').dataset.id;
        openViewModal(productId);
      }
    if (e.target.closest('.btn-edit')) {
      const productId = e.target.closest('button').dataset.id;
      openModal(productId, 'edit');
    }
      if (e.target.closest('.btn-delete')) {
        const deleteBtn = e.target.closest('.btn-delete');
        const productId = deleteBtn.dataset.id;
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const modal = DOM.deleteConfirmModal;
        const msg = modal.querySelector('.delete-message');
        msg.textContent = `Bạn có chắc chắn muốn xóa sản phẩm #${product.id} - ${product.name}?`;
        modal.dataset.productId = productId;
        modal.classList.add('show');
      }
    });

    if (DOM.cancelDelete) {
      DOM.cancelDelete.addEventListener('click', () => {
        DOM.deleteConfirmModal.classList.remove('show');
      });
    }
    // Click trong bảng danh mục
    if (DOM.categoryTableBody) {
      DOM.categoryTableBody.addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit-cat');
        const btnDel  = e.target.closest('.btn-delete-cat');

        if (btnEdit) {
          openCategoryEdit(btnEdit.dataset.id);
        }
        if (btnDel) {
          deleteCategory(btnDel.dataset.id);
        }
      });
    }


    // Đóng / Lưu modal sửa danh mục
    if (DOM.closeCategoryEdit) {
      DOM.closeCategoryEdit.addEventListener('click', () => {
        DOM.categoryEditModal.classList.remove('show');
      });
    }
    if (DOM.saveCategory) {
      DOM.saveCategory.addEventListener('click', saveCategory);
    }
    // Modal xác nhận xóa danh mục
    if (DOM.cancelDeleteCategory) {
      DOM.cancelDeleteCategory.addEventListener('click', () => {
        DOM.deleteCategoryModal.classList.remove('show');
      });
    }

    if (DOM.closeDeleteCategoryModal) {
      DOM.closeDeleteCategoryModal.addEventListener('click', () => {
        DOM.deleteCategoryModal.classList.remove('show');
      });
    }

    if (DOM.confirmDeleteCategory) {
      DOM.confirmDeleteCategory.addEventListener('click', () => {
        const catId = DOM.deleteCategoryModal.dataset.catId;
        if (!catId) return;

        const cat = categories.find(c => c.id === catId);
        if (!cat) return Utils.showToast('Không tìm thấy danh mục!', 'error');

        // Gỡ danh mục khỏi mảng
        categories = categories.filter(c => c.id !== catId);

        // Các sản phẩm thuộc danh mục này → gán "Không xác định"
        products = products.map(p => {
          if (p.categoryId === catId || p.category === catId) {
            return { ...p, categoryId: undefined, category: '' };
          }
          return p;
        });

        // Render lại bảng + dropdown
        renderCategoryTable();
        syncCategorySelects();
        renderTable(currentPage);

        Utils.showToast(`Đã xoá danh mục "${cat.name}" thành công!`, 'success');

        // Đóng modal
        DOM.deleteCategoryModal.classList.remove('show');
      });
    }


    // Khi mở "Quản lý danh mục"
    if (DOM.manageCategoryBtn) {
      DOM.manageCategoryBtn.addEventListener('click', async () => {
        if (!categories.length) categories = await loadCategoriesFromJSON();
        renderCategoryTable();
        DOM.categoryModal.classList.add('show');
      });
    }

    // Đóng modal xem sản phẩm
    const viewModal = document.getElementById("viewProductModal");
    const closeViewModalBtn = document.getElementById("closeViewModal");

    if (closeViewModalBtn) {
      closeViewModalBtn.addEventListener("click", () => viewModal.classList.remove("show"));
    }

    if (viewModal) {
      viewModal.addEventListener("click", e => {
        if (e.target === viewModal) viewModal.classList.remove("show");
      });
    }
    if (DOM.confirmDelete) {
      DOM.confirmDelete.addEventListener('click', () => {
        const modal = DOM.deleteConfirmModal;
        const productId = modal.dataset.productId;
        if (productId) {
          products = products.filter(p => p.id !== productId);
          Utils.saveToLocalStorage();
          filteredProducts = [...products];
          renderTable(currentPage);
          Utils.showToast('Đã xóa sản phẩm thành công!', 'success');
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

    if (DOM.modalClose) {
      DOM.modalClose.addEventListener('click', closeModal);
    }

    if (DOM.editProductModal) {
      DOM.editProductModal.addEventListener('click', (e) => {
        if (e.target === DOM.editProductModal) closeModal();
      });
    }


    if (DOM.createProductBtn) {
      DOM.createProductBtn.addEventListener('click', openCreateModal);
    }

    if (DOM.closeCreateModal) {
      DOM.closeCreateModal.addEventListener('click', closeCreateModal);
    }

    if (DOM.cancelCreate) {
      DOM.cancelCreate.addEventListener('click', closeCreateModal);
    }

    if (DOM.createModal) {
      DOM.createProductModal.addEventListener('click', (e) => {
        if (e.target === DOM.createModal) closeCreateModal();
      });
    }

    if (DOM.saveNewProduct) {
      DOM.saveNewProduct.addEventListener('click', saveNewProduct);
    }

    if (DOM.refreshBtn) {
      DOM.refreshBtn.addEventListener('click', () => {
        const originalText = DOM.refreshBtn.innerHTML;
        DOM.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        DOM.refreshBtn.disabled = true;
        setTimeout(() => {
          products = Utils.loadFromLocalStorage() || generateSampleData();
          Utils.saveToLocalStorage();
          filteredProducts = [...products];
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
          const element = document.querySelector('.order-table');
          if (!element) throw new Error('Không tìm thấy bảng sản phẩm');
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
          pdf.text("BÁO CÁO SẢN PHẨM MEDICARE", 105, 20, { align: "center" });
          pdf.setFontSize(11);
          pdf.setTextColor(80, 80, 80);
          pdf.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 105, 27, { align: "center" });
          pdf.addImage(imgData, "PNG", 10, yPos + 25, imgWidth, imgHeight);
          pdf.save(`medicare_products_${new Date().toISOString().slice(0, 10)}.pdf`);
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

    if (DOM.saveProduct) {
      DOM.saveProduct.addEventListener('click', () => {
        if (currentProductId) {
          const product = products.find(p => p.id === currentProductId);
          const newName = DOM.prodName.value.trim();
          const newCategory = DOM.prodCategory.value;
          const newPrice = parseFloat(DOM.prodPrice.value);
          const newDiscount = parseFloat(DOM.prodDiscount.value);
          const newStock = parseInt(DOM.prodStock.value);
          const newExpiry = DOM.prodExpiry.value;
          const newDescription = DOM.prodDescription.value.trim();
          const newStatus = DOM.prodStatus.value;
          if (!newName || isNaN(newPrice) || isNaN(newStock) || !newExpiry) {
            Utils.showToast('Vui lòng nhập đầy đủ thông tin hợp lệ!', 'error');
            return;
          }
          product.name = newName;
          product.category = newCategory;
          product.price = newPrice;
          product.discount = newDiscount;
          product.stock = newStock;
          product.expiry = newExpiry;
          product.description = newDescription;
          product.status = newStatus;
          // Update batches
          product.batches = DOM.batchTableBody
            ? Array.from(DOM.batchTableBody.rows).map(row => ({
                batchNo: row.querySelector('.batch-no').value,
                qty: parseInt(row.querySelector('.batch-qty').value),
                expiry: row.querySelector('.batch-expiry').value
              }))
            : [];
          Utils.saveToLocalStorage();
          filteredProducts = [...products];
          renderTable(currentPage);
          Utils.showToast('Đã lưu thay đổi sản phẩm!', 'success');
          closeModal();
        }
      });
    }
    if (DOM.manageCategoryBtn) {
      DOM.manageCategoryBtn.addEventListener('click', async () => {
        if (!categories.length) {
          categories = await loadCategoriesFromJSON();
        }
        renderCategoryTable();
        DOM.categoryModal.classList.add('show');
      });
    }


    if (DOM.closeCategoryModal) {
      DOM.closeCategoryModal.addEventListener('click', () => {
        DOM.categoryModal.classList.remove('show');
      });
    }

    if (DOM.addCategoryBtn) {
      DOM.addCategoryBtn.addEventListener('click', () => {
        const newCat = { id: 'new_' + Date.now(), name: prompt('Tên danh mục mới:') };
        if (newCat.name) {
          categories.push(newCat);
          renderCategoryTable();
          Utils.showToast('Đã thêm danh mục mới!', 'success');
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOM.editProductModal?.classList.contains('show')) {
        closeModal();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        DOM.refreshBtn?.click();
      }
    });
  }
  // RENDER CATEGORY TABLE
  function renderCategoryTable() {
    DOM.categoryTableBody.innerHTML = categories.map(cat => {
      const catId = cat.id || 'Không có ID';
      const catName = cat.name || 'Không có tên';

      return `
        <tr>
          <td>${catId}</td>
          <td>${catName}</td>
          <td>
            <div class="action-buttons">
              <button class="btn-edit-cat" data-id="${catId}" title="Chỉnh sửa danh mục">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn-delete-cat" data-id="${catId}" title="Xóa danh mục">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
  function renderCategorySelects() {
    const filterSelect = document.getElementById('filterCategory');
    const createSelect = document.getElementById('newProdCategory');
    const editSelect = document.getElementById('prodCategory');
    if (!categories || categories.length === 0) return;
    // Tạo danh sách option chung
    const options = categories
      .map(cat => `<option value="${cat.id}">${cat.name}</option>`)
      .join('');
    //Filter bar
    if (filterSelect) {
      filterSelect.innerHTML = `
        <option value="">Tất cả</option>
        ${options}
      `;
    }
    //Modal thêm sản phẩm
    if (createSelect) {
      createSelect.innerHTML = `
        <option value="">Chọn danh mục</option>
        ${options}
      `;
    }
    // Modal chỉnh sửa sản phẩm
    if (editSelect) {
      editSelect.innerHTML = `
        <option value="">Chọn danh mục</option>
        ${options}
      `;
    }
    console.log(" Category dropdowns đã được render:", categories.length);
  }
  // LOAD PRODUCTS FROM JSON
  function loadProductsFromJSON() {
    return fetch('../data/longchau_products_normalized.json')
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data)) return [];

        // CHỈ LẤY NHỮNG FIELD CẦN DÙNG
        const simplified = data.map(item => ({
          id: item._id?.toString() || '',
          name: item.name || 'Không rõ tên',
          categoryId: item.categoryId || 'khác',
          price: item.price || 0,
          stock: item.stock || 0,
          expiry: item.expiredDate ? new Date(item.expiredDate).toISOString().split('T')[0] : '',
          status: item.isActive ? 'active' : 'inactive',
          image: item.image || '',
          ratings: { average: item.ratings?.average || 0 }
        }));

        console.log(` Đã chuyển ${simplified.length} sản phẩm từ JSON`);
        return simplified;
      })
      .catch(err => {
        console.error(' Lỗi load JSON:', err);
        return [];
      });
  }
  async function loadCategoriesFromJSON() {
    try {
      const res = await fetch('../data/longchau_categories.json');
      const data = await res.json();

      console.log(" Raw categories JSON:", data.slice(0, 5));

      // ⚙️ Chuẩn hóa dữ liệu thành { id, name }
      const mapped = Array.isArray(data)
        ? data.map(c => ({ id: c._id || c.id, name: c.name }))
        : [];

      console.log("Mapped categories:", mapped.slice(0, 5));
      categories = mapped; 

      return mapped;
    } catch (err) {
      console.error("Lỗi loadCategoriesFromJSON:", err);
      return [];
    }
  }

  // INITIALIZATION
  async function init() {
    console.log('MediCare Admin Product Management initializing...');
    cacheDOM();

    try {
      // --- Load song song sản phẩm & danh mục ---
      const [jsonProducts, jsonCategories] = await Promise.all([
        loadProductsFromJSON(),
        loadCategoriesFromJSON()
      ]);

      // --- Xử lý danh mục ---
      if (jsonCategories && jsonCategories.length > 0) {
        categories = jsonCategories; //  
        console.log(` Đã load ${categories.length} danh mục từ JSON`);
        console.log(" Ví dụ categories:", categories.slice(0, 5));
      } else {
        categories = [];
        console.warn(' Không có dữ liệu danh mục.');
      }
      renderCategorySelects();

      // --- Xử lý sản phẩm ---
      const savedProducts = Utils.loadFromLocalStorage();

      if (jsonProducts && jsonProducts.length > 0) {
        products = jsonProducts;
        Utils.saveToLocalStorage();
        console.log(` Đã load ${products.length} sản phẩm từ JSON`);
      } else if (savedProducts && savedProducts.length > 0) {
        products = savedProducts;
        console.log(` Đã load ${products.length} sản phẩm từ LocalStorage`);
      } else {
        products = generateSampleData();
        Utils.saveToLocalStorage();
        console.log(' Đã tạo dữ liệu mẫu vì JSON rỗng');
      }

      // --- Render lần đầu ---
      filteredProducts = [...products];
      renderTable(1);

      // --- Gắn sự kiện ---
      initEventListeners();

      // --- Kiểm tra hiệu suất load ---
      if ('performance' in window) {
        console.log(
          `Admin Product Management LOADED in ${Math.round(performance.now())}ms`
        );
      }

      // --- Auto refresh sau 30 phút (khi tab đang active) ---
      setInterval(() => {
        if (document.visibilityState === 'visible') {
          DOM.refreshBtn?.click();
        }
      }, 1800000);
    } catch (error) {
      console.error(' Lỗi khi khởi tạo:', error);
      Utils.showToast('Không thể tải dữ liệu sản phẩm hoặc danh mục!', 'error');
    }
  }
  // Khởi động sau khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    requestAnimationFrame(init);
  }
  })();
