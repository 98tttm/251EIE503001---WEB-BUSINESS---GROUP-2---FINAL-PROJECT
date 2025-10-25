(() => {
  'use strict';

  // GLOBAL STATE
  let blogs = [];
  let filteredBlogs = [];
  let currentPage = 1;
  let currentBlogId = null;
  const itemsPerPage = 10;

  // CONFIGURATION
  const CONFIG = {
    ANIMATION_DURATION: 250,
    DEBOUNCE_DELAY: 300,
    NOTIFICATION_POLLING: 30000,
    LOCAL_STORAGE_KEY: 'medicare_blogs',
    XML_DATA_URL: '../data/blogs.xml' // Đường dẫn file XML
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
    formatDate(dateStr) {
      return new Date(dateStr).toLocaleDateString('vi-VN');
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
        localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(blogs));
        console.log('Blogs saved to localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        Utils.showToast('Lỗi khi lưu dữ liệu blog!', 'error');
      }
    },
    loadFromLocalStorage() {
      try {
        const savedBlogs = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
        if (savedBlogs) {
          const parsedBlogs = JSON.parse(savedBlogs);
          if (Array.isArray(parsedBlogs)) {
            return parsedBlogs;
          }
        }
        return null;
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        Utils.showToast('Lỗi khi tải dữ liệu blog!', 'error');
        return null;
      }
    }
  };

  // PARSE XML TO BLOGS ARRAY
  function parseXmlToBlogs(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const blogNodes = xmlDoc.getElementsByTagName("blog");
    const blogsArray = [];

    for (let node of blogNodes) {
      const contentNode = node.getElementsByTagName("content")[0];
      const contentXml = contentNode ? new XMLSerializer().serializeToString(contentNode) : '';
      
      const summaryNode = node.getElementsByTagName("summary")[0] || node.getElementsByTagName("introduction")[0];
      const summaryText = summaryNode ? summaryNode.textContent : 'No summary available';

      const titleNode = node.getElementsByTagName("title")[0];
      const authorNode = node.getElementsByTagName("author")[0];
      const dateNode = node.getElementsByTagName("date")[0];

      if (!titleNode || !authorNode || !dateNode || !contentNode) {
        console.warn(`Skipping invalid blog entry with id=${node.getAttribute("id")} due to missing required fields`);
        continue;
      }

      blogsArray.push({
        id: node.getAttribute("id"),
        category: node.getAttribute("category") || 'Uncategorized',
        title: titleNode.textContent,
        author: authorNode.textContent,
        date: dateNode.textContent,
        summary: summaryText,
        content: contentXml
      });
    }
    return blogsArray;
  }

  // LOAD BLOGS FROM EXTERNAL XML FILE
  async function loadBlogsFromXML() {
    try {
      const response = await fetch(CONFIG.XML_DATA_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xmlText = await response.text();
      const parsedBlogs = parseXmlToBlogs(xmlText);
      if (parsedBlogs.length === 0) {
        console.warn('XML loaded but no valid blog entries found');
        return null;
      }
      return parsedBlogs;
    } catch (error) {
      console.error('Failed to load XML file:', error);
      Utils.showToast('Không thể tải dữ liệu từ blog.xml. Dùng dữ liệu cũ.', 'error');
      return null;
    }
  }

  // TABLE RENDERING ENGINE
  function renderTable(page = 1) {
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredBlogs.slice(start, end);
    if (DOM.tableBody) {
      DOM.tableBody.innerHTML = pageData.length > 0 ? pageData.map(blog => `
        <tr data-id="${blog.id}" class="blog-row">
          <td><strong>${blog.id}</strong></td>
          <td>${blog.title}</td>
          <td>${blog.author}</td>
          <td>${Utils.formatDate(blog.date)}</td>
          <td>${blog.category}</td>
          <td class="action-cell">
            <div class="action-buttons">
              <button class="btn-action btn-view" data-id="${blog.id}" title="Xem/Chỉnh sửa">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn-action btn-delete" data-id="${blog.id}" title="Xóa">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </td>
        </tr>
      `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 20px;">Không có dữ liệu blog</td></tr>';
    }
    renderPagination();
  }

  // PAGINATION
  function renderPagination() {
    const totalPages = Math.ceil(filteredBlogs.length / itemsPerPage);
    let html = '';
    if (totalPages > 1) {
      html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    }
    if (DOM.pagination) DOM.pagination.innerHTML = html;
  }

  // APPLY FILTERS
  function applyFilters() {
    const title = DOM.titleFilter?.value.toLowerCase() || '';
    const author = DOM.authorFilter?.value.toLowerCase() || '';
    const fromDate = DOM.dateFrom?.value ? new Date(DOM.dateFrom.value) : null;
    const toDate = DOM.dateTo?.value ? new Date(DOM.dateTo.value) : null;
    const category = DOM.categoryFilter?.value || '';
    filteredBlogs = blogs.filter(blog => {
      const blogDate = new Date(blog.date);
      return (
        blog.title.toLowerCase().includes(title) &&
        blog.author.toLowerCase().includes(author) &&
        (!fromDate || blogDate >= fromDate) &&
        (!toDate || blogDate <= toDate) &&
        (!category || blog.category === category)
      );
    });
    renderTable(1);
  }

  // OPEN MODAL FOR VIEW/EDIT
  function openModal(blogId) {
    currentBlogId = blogId;
    const blog = blogs.find(b => b.id === blogId);
    if (blog && DOM.modal) {
      document.getElementById('blogId').textContent = blog.id;
      document.getElementById('blogTitle').value = blog.title;
      document.getElementById('blogAuthor').value = blog.author;
      document.getElementById('blogDate').value = blog.date;
      document.getElementById('blogCategory').value = blog.category;
      document.getElementById('blogSummary').value = blog.summary;
      document.getElementById('blogContent').value = blog.content;
      DOM.modal.classList.add('show');
    }
  }

  // CLOSE MODAL
  function closeModal() {
    if (DOM.modal) {
      DOM.modal.classList.remove('show');
      currentBlogId = null;
    }
  }

  // OPEN CREATE MODAL
  function openCreateModal() {
    if (DOM.createBlogModal) {
      DOM.createBlogModal.classList.add('show');
    }
  }

  // CLOSE CREATE MODAL
  function closeCreateModal() {
    if (DOM.createBlogModal) {
      DOM.createBlogModal.classList.remove('show');
    }
  }

  // SAVE NEW BLOG
  function saveNewBlog() {
    const newTitle = document.getElementById('newBlogTitle').value.trim();
    const newAuthor = document.getElementById('newBlogAuthor').value.trim();
    const newDate = document.getElementById('newBlogDate').value;
    const newCategory = document.getElementById('newBlogCategory').value;
    const newSummary = document.getElementById('newBlogSummary').value.trim();
    const newContent = document.getElementById('newBlogContent').value.trim();

    if (!newTitle || !newAuthor || !newDate || !newCategory || !newSummary || !newContent) {
      Utils.showToast('Vui lòng nhập đầy đủ thông tin!', 'error');
      return;
    }

    const newId = `BLOG-${Date.now()}`;
    const newBlog = {
      id: newId,
      category: newCategory,
      title: newTitle,
      author: newAuthor,
      date: newDate,
      summary: newSummary,
      content: newContent
    };

    blogs.push(newBlog);
    Utils.saveToLocalStorage();
    filteredBlogs = [...blogs];
    renderTable(currentPage);
    Utils.showToast('Đã tạo blog mới thành công!', 'success');
    closeCreateModal();
  }

  // CACHE DOM
  function cacheDOM() {
    DOM.modal = document.getElementById('blogModal');
    DOM.modalClose = document.getElementById('closeModal');
    DOM.tableBody = document.getElementById('blogTableBody');
    DOM.pagination = document.getElementById('pagination');
    DOM.titleFilter = document.getElementById('titleFilter');
    DOM.authorFilter = document.getElementById('authorFilter');
    DOM.dateFrom = document.getElementById('dateFrom');
    DOM.dateTo = document.getElementById('dateTo');
    DOM.categoryFilter = document.getElementById('categoryFilter');
    DOM.applyFilter = document.getElementById('applyFilter');
    DOM.refreshBtn = document.getElementById('refreshBtn');
    DOM.exportBtn = document.getElementById('exportBtn');
    DOM.saveBlog = document.getElementById('saveBlog');
    DOM.notifBtn = document.getElementById('notifBtn');
    DOM.notifDropdown = document.getElementById('notifDropdown');
    DOM.logoutBtn = document.querySelector('.logout-btn');
    DOM.hamburger = document.getElementById('hamburgerBtn');
    DOM.sidebar = document.getElementById('sidebar');
    DOM.createBlogBtn = document.getElementById('createBlogBtn');
    DOM.createBlogModal = document.getElementById('createBlogModal');
    DOM.createBlogClose = document.getElementById('createBlogClose');
    DOM.saveNewBlog = document.getElementById('saveNewBlog');
    DOM.cancelNewBlog = document.getElementById('cancelNewBlog');
    DOM.deleteConfirmModal = document.getElementById('deleteConfirmModal');
    DOM.cancelDelete = document.getElementById('cancelDelete');
    DOM.confirmDelete = document.getElementById('confirmDelete');
  }

  // EVENT LISTENERS
  function initEventListeners() {
    // Hamburger menu
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

    // Notification dropdown
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

    // Filters
    if (DOM.applyFilter) {
      DOM.applyFilter.addEventListener('click', applyFilters);
    }
    if (DOM.titleFilter) {
      DOM.titleFilter.addEventListener('input', Utils.debounce(applyFilters, CONFIG.DEBOUNCE_DELAY));
    }
    if (DOM.authorFilter) {
      DOM.authorFilter.addEventListener('input', Utils.debounce(applyFilters, CONFIG.DEBOUNCE_DELAY));
    }

    // View / Delete
    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn-view')) {
        const blogId = e.target.closest('.btn-view').dataset.id;
        openModal(blogId);
      }
      if (e.target.closest('.btn-delete')) {
        const deleteBtn = e.target.closest('.btn-delete');
        const blogId = deleteBtn.dataset.id;
        const blog = blogs.find(b => b.id === blogId);
        if (!blog) return;
        const modal = DOM.deleteConfirmModal;
        const msg = modal.querySelector('.delete-message');
        msg.textContent = `Bạn có chắc chắn muốn xóa blog #${blog.id} - ${blog.title}?`;
        modal.dataset.blogId = blogId;
        modal.classList.add('show');
      }
    });

    // Delete confirm
    if (DOM.cancelDelete) {
      DOM.cancelDelete.addEventListener('click', () => {
        DOM.deleteConfirmModal.classList.remove('show');
      });
    }
    if (DOM.confirmDelete) {
      DOM.confirmDelete.addEventListener('click', () => {
        const modal = DOM.deleteConfirmModal;
        const blogId = modal.dataset.blogId;
        if (blogId) {
          blogs = blogs.filter(b => b.id !== blogId);
          Utils.saveToLocalStorage();
          filteredBlogs = [...blogs];
          renderTable(currentPage);
          Utils.showToast('Đã xóa blog thành công!', 'success');
        }
        modal.classList.remove('show');
      });
    }

    // Pagination
    if (DOM.pagination) {
      DOM.pagination.addEventListener('click', (e) => {
        if (e.target.dataset.page) {
          const page = +e.target.dataset.page;
          if (page > 0) renderTable(page);
        }
      });
    }

    // Modal close
    if (DOM.modalClose) DOM.modalClose.addEventListener('click', closeModal);
    if (DOM.modal) DOM.modal.addEventListener('click', (e) => { if (e.target === DOM.modal) closeModal(); });

    // Create modal
    if (DOM.createBlogBtn) DOM.createBlogBtn.addEventListener('click', openCreateModal);
    if (DOM.createBlogClose) DOM.createBlogClose.addEventListener('click', closeCreateModal);
    if (DOM.cancelNewBlog) DOM.cancelNewBlog.addEventListener('click', closeCreateModal);
    if (DOM.createBlogModal) DOM.createBlogModal.addEventListener('click', (e) => { if (e.target === DOM.createBlogModal) closeCreateModal(); });
    if (DOM.saveNewBlog) DOM.saveNewBlog.addEventListener('click', saveNewBlog);

    // Refresh button
    if (DOM.refreshBtn) {
      DOM.refreshBtn.addEventListener('click', async () => {
        const originalText = DOM.refreshBtn.innerHTML;
        DOM.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        DOM.refreshBtn.disabled = true;

        const xmlBlogs = await loadBlogsFromXML();
        if (xmlBlogs) {
          blogs = xmlBlogs;
          Utils.saveToLocalStorage();
        } else {
          const localBlogs = Utils.loadFromLocalStorage();
          if (localBlogs && localBlogs.length > 0) {
            blogs = localBlogs;
          }
        }

        filteredBlogs = [...blogs];
        renderTable(1);
        DOM.refreshBtn.innerHTML = originalText;
        DOM.refreshBtn.disabled = false;
        Utils.showToast('Dữ liệu đã được cập nhật!', 'success');
      });
    }

    // Export PDF
    if (DOM.exportBtn) {
      DOM.exportBtn.addEventListener('click', async () => {
        const originalText = DOM.exportBtn.innerHTML;
        DOM.exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo báo cáo...';
        DOM.exportBtn.disabled = true;
        try {
          const element = document.querySelector('.order-table-container');
          if (!element) throw new Error('Không tìm thấy bảng blog');
          const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });
          const imgData = canvas.toDataURL("image/png");
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
          const imgWidth = 190;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.setFontSize(18);
          pdf.setTextColor(0, 74, 173);
          pdf.text("BÁO CÁO BLOG MEDICARE", 105, 20, { align: "center" });
          pdf.setFontSize(11);
          pdf.setTextColor(80, 80, 80);
          pdf.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 105, 27, { align: "center" });
          pdf.addImage(imgData, "PNG", 10, 35, imgWidth, imgHeight);
          pdf.save(`medicare_blogs_${new Date().toISOString().slice(0, 10)}.pdf`);
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

    // Save edited blog
    if (DOM.saveBlog) {
      DOM.saveBlog.addEventListener('click', () => {
        if (currentBlogId) {
          const blog = blogs.find(b => b.id === currentBlogId);
          const newTitle = document.getElementById('blogTitle').value.trim();
          const newAuthor = document.getElementById('blogAuthor').value.trim();
          const newDate = document.getElementById('blogDate').value;
          const newCategory = document.getElementById('blogCategory').value;
          const newSummary = document.getElementById('blogSummary').value.trim();
          const newContent = document.getElementById('blogContent').value.trim();

          if (!newTitle || !newAuthor || !newDate || !newCategory || !newSummary || !newContent) {
            Utils.showToast('Vui lòng nhập đầy đủ thông tin!', 'error');
            return;
          }

          blog.title = newTitle;
          blog.author = newAuthor;
          blog.date = newDate;
          blog.category = newCategory;
          blog.summary = newSummary;
          blog.content = newContent;

          Utils.saveToLocalStorage();
          filteredBlogs = [...blogs];
          renderTable(currentPage);
          Utils.showToast('Đã lưu thay đổi blog!', 'success');
          closeModal();
        }
      });
    }

    // Logout
    if (DOM.logoutBtn) {
      DOM.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        Utils.showLogoutModal();
      });
    }

    // Keyboard shortcuts
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
  async function init() {
    console.log('MediCare Admin Blog Management initializing...');
    cacheDOM();

    // 1. Load from XML first
    const xmlBlogs = await loadBlogsFromXML();
    if (xmlBlogs) {
      blogs = xmlBlogs;
      Utils.saveToLocalStorage();
    } else {
      // 2. Fallback to localStorage
      const localBlogs = Utils.loadFromLocalStorage();
      blogs = localBlogs && localBlogs.length > 0 ? localBlogs : [];
    }

    filteredBlogs = [...blogs];
    renderTable(1);

    // Default date filter
    const today = new Date();
    const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (DOM.dateFrom) DOM.dateFrom.valueAsDate = last30Days;
    if (DOM.dateTo) DOM.dateTo.valueAsDate = today;

    initEventListeners();

    if ('performance' in window) {
      console.log(`Admin Blog Management LOADED in ${Math.round(performance.now())}ms`);
    }

    // Auto refresh every 30 minutes
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