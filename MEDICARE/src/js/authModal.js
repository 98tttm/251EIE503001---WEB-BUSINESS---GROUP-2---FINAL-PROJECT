// ==========================
// MediCare Auth Modal Logic
// ==========================
export function initAuthModal() {
    const modal = document.getElementById("authModal");
    if (!modal) return;
  
    const tabs = modal.querySelectorAll(".auth-tab");
    const tabContents = modal.querySelectorAll(".auth-tab-content");
    const openBtn = document.getElementById("openLoginPopup");
    const closeBtn = modal.querySelector(".auth-modal-close");
  
    // Mở popup
    if (openBtn) {
      openBtn.addEventListener("click", () => {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
      });
    }
  
    // Đóng popup
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      });
    }
  
    // Chuyển tab
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        const targetTab = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove("active"));
        tabContents.forEach(c => c.classList.remove("active"));
        tab.classList.add("active");
        modal.querySelector(`#${targetTab}Tab`).classList.add("active");
      });
    });
  
    // Click nền đen để đóng
    window.addEventListener("click", e => {
      if (e.target === modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });
  
    // =====================
    // FORM ĐĂNG NHẬP / ĐK
    // =====================
    const registerForm = modal.querySelector("#registerForm");
    const loginForm = modal.querySelector("#loginForm");
  
    // --- Đăng ký ---
    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const formData = {
          firstName: modal.querySelector("#firstName").value,
          lastName: modal.querySelector("#lastName").value,
          email: modal.querySelector("#registerEmail").value,
          phone: modal.querySelector("#phone").value,
          password: modal.querySelector("#registerPassword").value,
        };
  
        try {
          const res = await fetch("http://localhost:5000/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
          });
          const data = await res.json();
          alert(data.message || "Đăng ký thành công!");
        } catch (err) {
          alert("⚠️ Lỗi kết nối máy chủ!");
        }
      });
    }
  
    // --- Đăng nhập ---
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const email = modal.querySelector("#loginEmail").value;
        const password = modal.querySelector("#loginPassword").value;
  
        try {
          const res = await fetch("http://localhost:5000/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
  
          const data = await res.json();
          alert(data.message || "Đăng nhập thành công!");
  
          if (res.ok) {
            localStorage.setItem("user", JSON.stringify(data.user));
            modal.style.display = "none";
            location.reload();
          }
        } catch (err) {
          alert("⚠️ Lỗi kết nối máy chủ!");
        }
      });
    }
  }
  