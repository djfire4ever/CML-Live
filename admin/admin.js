// admin.js
import '../global.js';

// admin.js
window.loadSharedStyles({ stylesheet: './style.css' });

// pageMeta setup
window.pageMeta = window.pageMeta || {};
window.pageMeta.pageType = "admin";
window.pageMeta.context = window !== window.parent ? "iframe" : "parent";
window.pageMeta.ready = window.pageMeta.ready || false;

// Use same deferred logging as global.js
const logWithContext = (...args) => {
  const context = window.pageMeta.context;
  const color = context === "iframe"
    ? "color: orange; font-weight:bold;"
    : "color: green; font-weight:bold;";
  window._deferredLogs[context].push({ args, color });
};

// Initialization
logWithContext("✅ admin.js loaded");

// Load admin-only font
const loadAdminFont = () => {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Courgette&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
};
loadAdminFont();

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  logWithContext("✅ DOM Ready: admin.js");
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

// Admin-specific helpers
window.convertGoogleDriveLink = (url) => {
  if (!url) return url;
  if (url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i)) return url;
  const driveMatch = url.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  if (driveMatch) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}`;
  return url;
};

window.getEmailTemplateByType = async (type) => {
  try {
    const res = await fetch(`${window.scriptURL}?action=getEmailTemplates`);
    const templates = await res.json();

    if (!res.ok || !Array.isArray(templates)) {
      const msg = !res.ok ? res.statusText : "Invalid templates format";
      window.showToast?.(`❌ Failed to fetch templates: ${msg}`, "error");
      throw new Error(msg);
    }

    const match = templates.find(t => t.type === type);
    if (!match) window.showToast?.(`⚠️ No template found for type "${type}"`, "warning");
    return match || null;
  } catch (err) {
    console.error(`❌ Error fetching template "${type}":`, err);
    window.showToast?.(`❌ Error fetching template "${type}"`, "error");
    return null;
  }
}

window.showEmailModal = async ({ type, mode }) => {
  window.toggleLoader(true);
  await new Promise(requestAnimationFrame);

  try {
    const prefix = mode === "add" ? "add" : "edit";
    const placeholders = {
      firstName: document.getElementById(`${prefix}-firstName`)?.value || "",
      lastName: document.getElementById(`${prefix}-lastName`)?.value || "",
      fullName: "",
      name: "",
      url: document.getElementById(`${prefix}-invoiceUrl`)?.value || "",
      quoteID: document.getElementById(`${prefix}-qtID`)?.value || "",
      eventDate: document.getElementById(`${prefix}-eventDate`)?.value || "",
      eventTheme: document.getElementById(`${prefix}-eventTheme`)?.value || "",
      grandTotal: document.getElementById(`${prefix}-grandTotal`)?.value || ""
    };
    placeholders.fullName = placeholders.name = `${placeholders.firstName} ${placeholders.lastName}`.trim();

    const template = await getEmailTemplateByType(type);
    if (!template) {
      window.showToast?.(`❌ Could not load "${type}" template`, "error");
      return;
    }

    const emailSubject = renderTemplate(template.subject || "", placeholders);
    const emailBody = renderTemplate(template.body || "", placeholders);

    const toInput = document.getElementById("invoice-email-to");
    const subjInput = document.getElementById("invoice-email-subject");
    const bodyEl = document.getElementById("invoice-email-body");
    if (toInput) toInput.value = document.getElementById(`${prefix}-email`)?.value || "";
    if (subjInput) subjInput.value = emailSubject;
    if (bodyEl) bodyEl.innerHTML = emailBody;

    const modalEl = document.getElementById("finalInvoiceModal");
    if (modalEl) {
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.show();
    }
  } catch (err) {
    console.error("❌ Failed to show email modal:", err);
    window.showToast?.("❌ Error preparing email", "error");
  } finally {
    window.toggleLoader(false);
  }
};

// Template renderer
window.renderTemplate = (template, data) => {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => (key in data ? data[key] : match));
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

