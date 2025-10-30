// admin.js
import '../global.js';

// --- Page Meta Setup ---
window.pageMeta = window.pageMeta || {};
window.pageMeta.pageType = "admin";
window.pageMeta.context = window !== window.parent ? "iframe" : "parent";
window.pageMeta.ready = window.pageMeta.ready || false;

// --- Deferred Logging (consistent with global.js) ---
const logWithContext = (...args) => {
  const context = window.pageMeta.context;
  const color = context === "iframe"
    ? "color: orange; font-weight:bold;"
    : "color: green; font-weight:bold;";
  window._deferredLogs[context].push({ args, color });
};

logWithContext("✅ admin.js loaded");

// --- Load Admin Font ---
(function loadAdminFont() {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Courgette&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
})();

// --- DOM Ready ---
document.addEventListener('DOMContentLoaded', () => {
  logWithContext("✅ DOM Ready: admin.js initialized");

  // ✅ Let global.js handle shared + side-specific stylesheet logic
  // Only call this manually if you need to override or load extra CSS
  if (typeof window.loadSharedStyles === "function") {
    window.loadSharedStyles({ stylesheet: '/admin/style.css' });
  }
});

// FullCalendar (admin-only)
window.loadFullCalendarAdmin = () => {
  if (window.fullCalendarLoaded) return;
  window.fullCalendarLoaded = true;

  const core = document.createElement('script');
  core.src = `https://cdn.jsdelivr.net/npm/@fullcalendar/core@${window.LIB_VERSIONS.fullCalendarCore}/index.global.min.js`;
  core.defer = true;
  core.onload = () => {
    logWithContext("✅ FullCalendar core loaded");

    const plugins = [
      '@fullcalendar/daygrid',
      '@fullcalendar/timegrid',
      '@fullcalendar/interaction',
      '@fullcalendar/list',
      '@fullcalendar/google-calendar'
    ].map(p => `https://cdn.jsdelivr.net/npm/${p}@${window.LIB_VERSIONS.fullCalendarPlugins}/index.global.min.js`);

    let loadedCount = 0;
    plugins.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.onload = () => {
        if (++loadedCount === plugins.length) {
          logWithContext("✅ FullCalendar plugins loaded");
          window.pageMeta.hasFullCalendar = true;
          window.dispatchEvent(new Event('FullCalendarLoaded'));
        }
      };
      document.body.appendChild(s);
    });
  };
  document.body.appendChild(core);
};

if (location.pathname === "/admin/calendar.html") {
  document.addEventListener('DOMContentLoaded', window.loadFullCalendarAdmin);
}

document.addEventListener("keydown", function (e) {
  const isEnter = e.key === "Enter";
  const target = e.target;

  const isTextInput = ["INPUT", "SELECT"].includes(target.tagName);
  const isTextArea = target.tagName === "TEXTAREA";
  const isSubmitTrigger = isEnter && isTextInput && !isTextArea;

  if (isSubmitTrigger) {
    e.preventDefault();
  }
});

window.loadDropdowns = () => {
  fetch(`${window.scriptURL}?action=dropdownLists`)
    .then(response => {
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      return response.json();
    })
    .then(data => {
      const dropdowns = {
        productTypeDropdown: "product-type-options",
        partsDropdown: "parts-options",
        phoneDropdown: "phone-options",
        unitTypeDropdown: "unit-type-options",
        paymentMethodDropdown: "payment-method-options",
        productDropdown: "product-options"
      };

      for (const [key, selectId] of Object.entries(dropdowns)) {
        const selectElement = document.getElementById(selectId);
        if (selectElement) {
          selectElement.innerHTML = "";
          const defaultOption = document.createElement("option");
          defaultOption.value = "";
          defaultOption.textContent = "Select an option";
          selectElement.appendChild(defaultOption);

          let values = [];
          if (key === "productTypeDropdown") values = data.productTypes || [];
          else if (key === "partsDropdown") values = data.parts || [];
          else if (key === "phoneDropdown") values = data.phoneList || [];
          else if (key === "unitTypeDropdown") values = data.unitTypes || [];
          else if (key === "paymentMethodDropdown") values = data.paymentMethods || [];
          else if (key === "productDropdown") values = data.products || [];

          values.forEach(val => {
            const option = document.createElement("option");
            option.value = val;
            option.textContent = val;
            selectElement.appendChild(option);
          });
        }
      }
      console.log("✅ Dropdowns loaded successfully (client)");
    })
    .catch(error => {
      if (error.name !== "AbortError") console.warn("⚠️ Dropdown fetch skipped or failed silently:", error.message);
    });
}

window.parseSafeNumber = (raw) => {
  if (raw == null) return 0;
  const s = String(raw).replace(/[^0-9.-]+/g, "");
  return parseFloat(s) || 0;
};

window.formatPhoneNumber = (number) => {
  if (!number) return "";
  const digits = String(number).replace(/\D/g, "");
  if (digits.length !== 10) return number;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
};

// Admin-specific showToast (CRUD / management)
window.showToast = (message, type = "success") => {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const bgColor = type === "success" ? "bg-black" : "bg-danger";
  const headerText = type === "success" ? "✅ Success" : "❌ Error";

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

