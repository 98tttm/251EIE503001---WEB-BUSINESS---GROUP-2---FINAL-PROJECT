document.addEventListener("DOMContentLoaded", () => {
	const navItems = document.querySelectorAll(".nav-item");
	let openItem = null;
	let hideTimer = null;

	navItems.forEach(item => {
		const popup = item.querySelector(".nav-popup");
		if (!popup) return;

		// Khởi tạo trạng thái popup ẩn
		popup.style.opacity = "0";
		popup.style.visibility = "hidden";
		popup.style.transform = "translateY(-10px)";
		popup.style.transition = "opacity 0.25s ease, transform 0.25s ease, visibility 0.25s";
		popup.style.position = "absolute";
		popup.style.display = "none";

		// Hover vào nav-item
		item.addEventListener("mouseenter", () => {
			clearTimeout(hideTimer);
			if (openItem && openItem !== item) closePopup(openItem);
			openItem = item;
			showPopup(item, popup);
		});

		// Rời khỏi nav-item
		item.addEventListener("mouseleave", () => {
			hideTimer = setTimeout(() => closePopup(item), 150);
		});

		// Hover popup (để không mất khi di chuyển giữa nav-item và popup)
		popup.addEventListener("mouseenter", () => {
			clearTimeout(hideTimer);
			showPopup(item, popup);
		});

		popup.addEventListener("mouseleave", () => {
			hideTimer = setTimeout(() => closePopup(item), 150);
		});
	});

	// Sticky header khi scroll
	window.addEventListener("scroll", () => {
		const header = document.querySelector(".header");
		if (header) header.classList.toggle("scrolled", window.scrollY > 50);
	});
});

function showPopup(item, popup) {
	item.classList.add("active");
	popup.style.display = "block";
	requestAnimationFrame(() => {
		popup.style.opacity = "1";
		popup.style.visibility = "visible";
		popup.style.transform = "translateY(0)";
	});
}

function closePopup(item) {	
	const popup = item.querySelector(".nav-popup");
	if (!popup) return;
	item.classList.remove("active");
	popup.style.opacity = "0";
	popup.style.visibility = "hidden";
	popup.style.transform = "translateY(-10px)";
	setTimeout(() => {
		if (!item.classList.contains("active")) popup.style.display = "none";
	}, 250);
}

document.querySelectorAll('.nav-popup').forEach(popup => {
	const items = popup.querySelectorAll('.nav-popup-item');
	const mains = popup.querySelectorAll('.nav-popup-main');

	items.forEach((item, index) => {
		item.addEventListener('mouseenter', () => {
			items.forEach(i => i.classList.remove('active'));
			item.classList.add('active');

			mains.forEach((m, i) => {
				m.style.display = (i === index) ? 'flex' : 'none';
			});
		});
	});
});
