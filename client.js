// client.js
import './global.js';

window.pageMeta = window.pageMeta || {};
window.pageMeta.loadedFrom = window.pageMeta.loadedFrom || "global.js";
window.pageMeta.pageType = "client";

// ✅ Client-specific font (Roboto)
(function loadClientFont() {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Roboto&display=swap';
  link.rel = 'stylesheet';
  link.type = 'text/css';
  document.head.appendChild(link);
})();

// Client-specific toggleLoader (simple show/hide)
window.toggleLoader = (show) => {
  const loader = document.getElementById("loadingOverlay");
  if (!loader) return;
  if (typeof show === 'undefined') {
    // toggle behavior (backwards compatible)
    loader.classList.toggle('show');
    if (loader.classList.contains('show')) loader.classList.remove('d-none');
    else loader.classList.add('d-none');
    return;
  }
  if (show) {
    loader.classList.add('show');
    loader.classList.remove('d-none');
  } else {
    loader.classList.remove('show');
    loader.classList.add('d-none');
  }
};

// Client-specific showToast (lead form styles by default)
window.showToast = (message, type = "success") => {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  let bgColor, headerText;

  if (type === "success") {
    bgColor = "bg-primary";
    headerText = "Thank You!";
    message = message || "We will contact you shortly.";
  } else if (type === "warning") {
    bgColor = "bg-warning";
    headerText = "Attention!";
  } else if (type === "error") {
    bgColor = "bg-danger";
    headerText = "❌ Error!";
  }

  const toast = document.createElement("div");
  toast.classList.add("toast", "show", bgColor, "text-info", "fade");
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
    <div class="toast-header bg-info text-black">
      <strong class="me-auto">${headerText}</strong>
      <button type="button" class="btn-close btn-close-info" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">${message}</div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 5000);
};

