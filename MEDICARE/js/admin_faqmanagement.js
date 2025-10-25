(() => {
  'use strict';

  // GLOBAL STATE
  let faqs = [];
  let filteredFaqs = [];
  let currentPage = 1;
  let currentFaqId = null;
  const itemsPerPage = 10;

  // CONFIGURATION
  const CONFIG = {
    ANIMATION_DURATION: 250,
    DEBOUNCE_DELAY: 300,
    NOTIFICATION_POLLING: 30000,
    LOCAL_STORAGE_KEY: 'medicare_faqs'
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
        localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(faqs));
        console.log('FAQs saved to localStorage');
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        Utils.showToast('Lỗi khi lưu dữ liệu FAQ!', 'error');
      }
    },
    loadFromLocalStorage() {
      try {
        const savedFaqs = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
        if (savedFaqs) {
          const parsedFaqs = JSON.parse(savedFaqs);
          if (Array.isArray(parsedFaqs)) {
            return parsedFaqs;
          }
        }
        return null;
      } catch (error) {
        console.error('Error loading from localStorage:', error);
        Utils.showToast('Lỗi khi tải dữ liệu FAQ!', 'error');
        return null;
      }
    }
  };

  // FAQ DATA GENERATOR FROM CSV
  async function generateSampleData() {
    try {
      // Fetch file faq.csv
      const response = await fetch('../data/faq.csv');
      if (!response.ok) {
        throw new Error(`Không thể tải file faq.csv: ${response.statusText}`);
      }
      const csvContent = await response.text();
      
      // Parse CSV content
      const lines = csvContent.split('\n').slice(1); // Skip header
      return lines.map((line, i) => {
        const [question, answer] = line.split(',"');
        return {
          id: `FAQ-${String(i + 1).padStart(5, '0')}`,
          question: question.trim(),
          answer: answer ? answer.replace(/"$/, '').trim() : ''
        };
      }).filter(faq => faq.question && faq.answer);
    } catch (error) {
      console.error('Error loading faq.csv:', error);
      Utils.showToast('Lỗi khi tải dữ liệu FAQ từ file CSV!', 'error');
      return [];
    }
  }

  // TABLE RENDERING ENGINE
  function renderTable(page = 1) {
    currentPage = page;
    const start = (page - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = filteredFaqs.slice(start, end);
    if (DOM.tableBody) {
      DOM.tableBody.innerHTML = pageData.length > 0 ? pageData.map(faq => `
        <tr data-id="${faq.id}" class="faq-row">
          <td><strong>${faq.id}</strong></td>
          <td>${faq.question}</td>
          <td class="faq-answer">${faq.answer}</td>
          <td class="action-cell">
            <div class="action-buttons">
              <button class="btn-action btn-view" data-id="${faq.id}" title="Xem/Chỉnh sửa"><i class="fas fa-edit"></i></button>
              <button class="btn-action btn-delete" data-id="${faq.id}" title="Xóa"><i class="fas fa-trash-alt"></i></button>
            </div>
          </td>
        </tr>
      `).join('') : '<tr><td colspan="4" style="text-align: center; padding: 20px;">Không có FAQ nào</td></tr>';
    }
    renderPagination(filteredFaqs.length);
  }

  // PAGINATION RENDERING
  function renderPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    let html = '';
    if (totalPages > 1) {
      html += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>◀</button>`;
      for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
      }
      html += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>▶</button>`;
    }
    if (DOM.pagination) DOM.pagination.innerHTML = html;
  }

  // APPLY FILTERS
  function applyFilters() {
    const question = DOM.questionFilter?.value.toLowerCase() || '';
    filteredFaqs = faqs.filter(faq => {
      return faq.question.toLowerCase().includes(question);
    });
    renderTable(1);
  }

  // OPEN MODAL FOR VIEW/EDIT
  function openModal(faqId) {
    currentFaqId = faqId;
    const faq = faqs.find(f => f.id === faqId);
    if (faq && DOM.faqModal) {
      document.getElementById('faqId').textContent = faq.id;
      document.getElementById('faqQuestion').value = faq.question;
      document.getElementById('faqAnswer').value = faq.answer;
      DOM.faqModal.classList.add('show');
    }
  }

  // CLOSE MODAL
  function closeModal() {
    if (DOM.faqModal) {
      DOM.faqModal.classList.remove('show');
      currentFaqId = null;
    }
  }

  // OPEN CREATE MODAL
  function openCreateModal() {
    if (DOM.createFaqModal) {
      document.getElementById('newFaqQuestion').value = '';
      document.getElementById('newFaqAnswer').value = '';
      DOM.createFaqModal.classList.add('show');
    }
  }

  // CLOSE CREATE MODAL
  function closeCreateModal() {
    if (DOM.createFaqModal) {
      DOM.createFaqModal.classList.remove('show');
    }
  }

  // SAVE NEW FAQ
  function saveNewFaq() {
    const question = document.getElementById('newFaqQuestion').value.trim();
    const answer = document.getElementById('newFaqAnswer').value.trim();
    if (!question || !answer) {
      Utils.showToast('Vui lòng nhập đầy đủ câu hỏi và câu trả lời!', 'error');
      return;
    }
    const newId = `FAQ-${String(faqs.length + 1).padStart(5, '0')}`;
    faqs.push({ id: newId, question, answer });
    Utils.saveToLocalStorage();
    filteredFaqs = [...faqs];
    renderTable(currentPage);
    Utils.showToast('Đã tạo FAQ mới thành công!', 'success');
    closeCreateModal();
  }

  // CACHE DOM
  function cacheDOM() {
    DOM.tableBody = document.getElementById('faqTableBody');
    DOM.pagination = document.getElementById('pagination');
    DOM.faqModal = document.getElementById('faqModal');
    DOM.modalClose = document.getElementById('closeModal');
    DOM.saveFaq = document.getElementById('saveFaq');
    DOM.questionFilter = document.getElementById('questionFilter');
    DOM.applyFilter = document.getElementById('applyFilter');
    DOM.refreshBtn = document.getElementById('refreshBtn');
    DOM.exportBtn = document.getElementById('exportBtn');
    DOM.notifBtn = document.getElementById('notifBtn');
    DOM.notifDropdown = document.getElementById('notifDropdown');
    DOM.logoutBtn = document.querySelector('.logout-btn');
    DOM.hamburger = document.getElementById('hamburgerBtn');
    DOM.sidebar = document.getElementById('sidebar');
    DOM.createFaqBtn = document.getElementById('createFaqBtn');
    DOM.createFaqModal = document.getElementById('createFaqModal');
    DOM.createFaqClose = document.getElementById('createFaqClose');
    DOM.saveNewFaq = document.getElementById('saveNewFaq');
    DOM.cancelNewFaq = document.getElementById('cancelNewFaq');
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

    if (DOM.questionFilter) {
      DOM.questionFilter.addEventListener('input', Utils.debounce(applyFilters, CONFIG.DEBOUNCE_DELAY));
    }

    document.addEventListener('click', (e) => {
      if (e.target.closest('.btn-view')) {
        const faqId = e.target.closest('.btn-view').dataset.id;
        openModal(faqId);
      }
      if (e.target.closest('.btn-delete')) {
        const deleteBtn = e.target.closest('.btn-delete');
        const faqId = deleteBtn.dataset.id;
        const faq = faqs.find(f => f.id === faqId);
        if (!faq) return;
        const modal = DOM.deleteConfirmModal;
        const msg = modal.querySelector('.delete-message');
        msg.textContent = `Bạn có chắc chắn muốn xóa FAQ #${faq.id} - ${faq.question}?`;
        modal.dataset.faqId = faqId;
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
        const faqId = modal.dataset.faqId;
        if (faqId) {
          faqs = faqs.filter(f => f.id !== faqId);
          Utils.saveToLocalStorage();
          filteredFaqs = [...faqs];
          renderTable(currentPage);
          Utils.showToast('Đã xóa FAQ thành công!', 'success');
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

    if (DOM.faqModal) {
      DOM.faqModal.addEventListener('click', (e) => {
        if (e.target === DOM.faqModal) closeModal();
      });
    }

    if (DOM.createFaqBtn) {
      DOM.createFaqBtn.addEventListener('click', openCreateModal);
    }

    if (DOM.createFaqClose) {
      DOM.createFaqClose.addEventListener('click', closeCreateModal);
    }

    if (DOM.cancelNewFaq) {
      DOM.cancelNewFaq.addEventListener('click', closeCreateModal);
    }

    if (DOM.createFaqModal) {
      DOM.createFaqModal.addEventListener('click', (e) => {
        if (e.target === DOM.createFaqModal) closeCreateModal();
      });
    }

    if (DOM.saveNewFaq) {
      DOM.saveNewFaq.addEventListener('click', saveNewFaq);
    }

    if (DOM.refreshBtn) {
      DOM.refreshBtn.addEventListener('click', async () => {
        const originalText = DOM.refreshBtn.innerHTML;
        DOM.refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
        DOM.refreshBtn.disabled = true;
        try {
          faqs = Utils.loadFromLocalStorage() || await generateSampleData();
          Utils.saveToLocalStorage();
          filteredFaqs = [...faqs];
          renderTable(1);
          Utils.showToast('Đã làm mới dữ liệu!', 'success');
        } catch (error) {
          console.error('Error refreshing data:', error);
          Utils.showToast('Lỗi khi làm mới dữ liệu!', 'error');
        } finally {
          DOM.refreshBtn.innerHTML = originalText;
          DOM.refreshBtn.disabled = false;
        }
      });
    }

    if (DOM.exportBtn) {
      DOM.exportBtn.addEventListener('click', async () => {
        const originalText = DOM.exportBtn.innerHTML;
        DOM.exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tạo báo cáo...';
        DOM.exportBtn.disabled = true;
        try {
          const element = document.querySelector('.order-table-container');
          if (!element) throw new Error('Không tìm thấy bảng FAQ');
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
          pdf.text("BÁO CÁO FAQ MEDICARE", 105, 20, { align: "center" });
          pdf.setFontSize(11);
          pdf.setTextColor(80, 80, 80);
          pdf.text(`Ngày xuất: ${new Date().toLocaleDateString("vi-VN")}`, 105, 27, { align: "center" });
          pdf.addImage(imgData, "PNG", 10, yPos + 25, imgWidth, imgHeight);
          pdf.save(`medicare_faqs_${new Date().toISOString().slice(0, 10)}.pdf`);
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

    if (DOM.saveFaq) {
      DOM.saveFaq.addEventListener('click', () => {
        if (currentFaqId) {
          const faq = faqs.find(f => f.id === currentFaqId);
          const newQuestion = document.getElementById('faqQuestion').value.trim();
          const newAnswer = document.getElementById('faqAnswer').value.trim();
          if (!newQuestion || !newAnswer) {
            Utils.showToast('Vui lòng nhập đầy đủ thông tin!', 'error');
            return;
          }
          faq.question = newQuestion;
          faq.answer = newAnswer;
          Utils.saveToLocalStorage();
          filteredFaqs = [...faqs];
          renderTable(currentPage);
          Utils.showToast('Đã lưu thay đổi FAQ!', 'success');
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
      if (e.key === 'Escape' && DOM.faqModal?.classList.contains('show')) {
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
    console.log('MediCare Admin FAQ Management initializing...');
    cacheDOM();
    const savedFaqs = Utils.loadFromLocalStorage();
    faqs = savedFaqs && savedFaqs.length > 0 ? savedFaqs : await generateSampleData();
    if (!savedFaqs) Utils.saveToLocalStorage();
    filteredFaqs = [...faqs];
    if (faqs.length === 0) {
      faqs = [];
      filteredFaqs = [];
    }
    renderTable(1);
    initEventListeners();
    if ('performance' in window) {
      console.log(`Admin FAQ Management LOADED in ${Math.round(performance.now())}ms`);
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