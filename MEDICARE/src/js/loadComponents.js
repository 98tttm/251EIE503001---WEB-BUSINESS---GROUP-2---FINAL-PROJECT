// ==============================
// Load MediCare UI Components
// ==============================

// Hàm tải file HTML (header, footer, popup, v.v.)
async function loadHTML(selector, filePath) {
	try {
		const container = document.querySelector(selector);
		if (!container) return;
		const response = await fetch(filePath);
		if (!response.ok) throw new Error(`Không tìm thấy: ${filePath}`);
		const html = await response.text();
		container.innerHTML = html;
		requestAnimationFrame(() => container.classList.add("loaded"));
	} catch (err) {
		console.error("❌ Lỗi load component:", err);
	}
}

// Khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", async () => {
	// Load Header và Footer
	await loadHTML("#header", "../components/header.html");
	await loadHTML("#footer", "../components/footer.html");

	// Load popup đăng nhập (auth-modal)
	await loadHTML("#loginPopup", "../components/auth-modal.html");
	import("../js/authModal.js").then(mod => mod.initAuthModal());

	// Sau khi header load xong
	initHeaderInteractions();
	initFooterYear();
	initAuthModal(); // Kích hoạt popup đăng nhập
});

// ==============================
// Hiệu ứng Header (hover, sticky)
// ==============================
function initHeaderInteractions() {
	const navItems = document.querySelectorAll(".nav-item");
	navItems.forEach(item => {
		let timer;
		item.addEventListener("mouseenter", () => {
			timer = setTimeout(() => item.classList.add("active"), 100);
		});
		item.addEventListener("mouseleave", () => {
			clearTimeout(timer);
			item.classList.remove("active");
		});
	});

	// Sticky header khi cuộn
	const header = document.querySelector(".header");
	if (header) {
		window.addEventListener("scroll", () => {
			header.classList.toggle("scrolled", window.scrollY > 50);
		});
	}

	// Toggle giỏ hàng (click)
	const cartBtn = document.querySelector(".cart-container");
	if (cartBtn) {
		cartBtn.addEventListener("click", e => {
			e.stopPropagation();
			cartBtn.classList.toggle("open");
		});
		document.addEventListener("click", e => {
			if (!cartBtn.contains(e.target)) cartBtn.classList.remove("open");
		});
	}
}

// ==============================
// Popup đăng nhập / đăng ký (Auth Modal)
// ==============================
function initAuthModal() {
	const openBtn = document.getElementById("openLoginPopup");
	const modal = document.getElementById("authModal");
	const closeBtn = modal?.querySelector(".auth-modal-close");

	if (!openBtn || !modal) return;

	// Hiển thị popup
	openBtn.addEventListener("click", () => {
		modal.style.display = "flex";
		document.body.style.overflow = "hidden"; // chặn cuộn nền
	});

	// Đóng popup khi nhấn nút ×
	if (closeBtn) {
		closeBtn.addEventListener("click", () => closeAuthModal());
	}

	// Đóng popup khi click ra ngoài
	window.addEventListener("click", (e) => {
		if (e.target === modal) closeAuthModal();
	});

	// Cho phép gọi từ JS khác
	window.authUI = {
		closeAuthModal: closeAuthModal,
	};

	function closeAuthModal() {
		modal.style.display = "none";
		document.body.style.overflow = "auto";
	}
}

// ==============================
// Cập nhật năm Footer tự động
// ==============================
function initFooterYear() {
	const footer = document.querySelector(".footer-bottom");
	if (footer) {
		const year = new Date().getFullYear();
		footer.textContent = `© MediCare ${year} – Safe & Smart Healthcare Online.`;
	}
}
