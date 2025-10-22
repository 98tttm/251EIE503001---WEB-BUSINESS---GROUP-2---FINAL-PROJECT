// google-login.js
const GOOGLE_CLIENT_ID = "452871086809-ifbrq6ejkl3jdgh0tj1kbu56lqjirpls.apps.googleusercontent.com";

function waitForGoogleSDK(callback) {
	if (window.google && google.accounts && google.accounts.id) {
		callback();
	} else {
		setTimeout(() => waitForGoogleSDK(callback), 300);
	}
}

function renderUserUI() {
	const user = JSON.parse(localStorage.getItem("user"));
	const personal = document.getElementById("personal-section");

	if (!personal) return;

	if (user) {
		personal.innerHTML = `
			<div class="phone-icon"><img src="../../assets/images/avt.png" height="40" width="40"></div>
			<div class="phone-number">${user.profile?.fullName || "Người dùng"}</div>
			<div class="personal-popup">
				<div class="popup-item"><span>Thông tin cá nhân</span></div>
				<div class="popup-item"><span>Đơn hàng của tôi</span></div>
				<div class="popup-item" id="logout-btn"><span>Đăng xuất</span></div>
			</div>`;
		document.getElementById("logout-btn").addEventListener("click", logout);
	} else {
		personal.innerHTML = `<div id="googleBtn"></div>`;
		waitForGoogleSDK(renderGoogleButton);
	}
}

function renderGoogleButton() {
	const btn = document.getElementById("googleBtn");
	if (!btn) return;
	google.accounts.id.initialize({
		client_id: GOOGLE_CLIENT_ID,
		callback: handleCredentialResponse,
	});
	google.accounts.id.renderButton(btn, {
		theme: "outline",
		size: "large",
		shape: "pill",
		text: "signin_with",
	});
}

async function handleCredentialResponse(response) {
	try {
		const res = await fetch("http://localhost:5000/api/auth/google-login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: response.credential }),
		});
		const data = await res.json();
		if (data && (data.phone || data.profile)) {
			localStorage.setItem("user", JSON.stringify(data));
			renderUserUI();
		} else {
			alert("Đăng nhập thất bại!");
		}
	} catch (err) {
		console.error("Login error:", err);
		alert("Không thể kết nối máy chủ!");
	}
}

function logout() {
	localStorage.removeItem("user");
	location.reload();
}
