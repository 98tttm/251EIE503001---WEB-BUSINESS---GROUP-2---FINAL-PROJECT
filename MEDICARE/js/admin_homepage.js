// MediCare Admin — Sidebar toggle + Notification dropdown
(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }
  ready(function () {
    const sidebar = document.getElementById("sidebar");
    const burger  = document.querySelector(".hamburger");
    const btn     = document.getElementById("notifBtn");
    const panel   = document.getElementById("notifDropdown");
    const isMobile = () => window.innerWidth <= 768;
    if (burger && sidebar) {
      burger.addEventListener("click", function () {
        if (isMobile()) {
          sidebar.classList.toggle("open");       // trượt trên mobile
        } else {
          sidebar.classList.toggle("collapsed");  // thu gọn trên desktop
        }
      });
      window.addEventListener("resize", function () {
        if (isMobile()) {
          sidebar.classList.remove("collapsed");
        } else {
          sidebar.classList.remove("open");
        }
      });
    }
    if (btn && panel) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        panel.classList.toggle("open");
        if (panel.classList.contains("open")) {
          btn.classList.remove("has-unread");
        }
      });
      document.addEventListener("click", function () {
        panel.classList.remove("open");
      });
      panel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }
  });
})();
