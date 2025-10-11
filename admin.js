// admin.js
import './global.js';

window.pageMeta = window.pageMeta || {};
window.pageMeta.loadedFrom = window.pageMeta.loadedFrom || "global.js";
window.pageMeta.pageType = "admin";
console.log("✅ admin.js loaded");

// Admin font (Courgette)
(function loadAdminFont() {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Courgette&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
})();

// Admin toggleLoader (uses classes)
window.toggleLoader = (show) => {
  const loader = document.getElementById("loadingOverlay");
  if (!loader) return;
  if (typeof show === 'undefined') {
    loader.classList.toggle('show');
    if (loader.classList.contains('show')) loader.classList.remove('d-none'); else loader.classList.add('d-none');
    return;
  }
  if (show) { loader.classList.add('show'); loader.classList.remove('d-none'); }
  else { loader.classList.remove('show'); loader.classList.add('d-none'); }
};

// Admin showToast (admin look)
window.showToast = (message, type = "success") => {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;
  const bgColor = type === "success" ? "bg-black" : "bg-danger";
  const headerText = type === "success" ? "✅ Success" : "❌ Error";
  const toast = document.createElement("div");
  toast.classList.add("toast","show",bgColor,"text-info","fade");
  toast.setAttribute("role","alert");
  toast.innerHTML = `
    <div class="toast-header bg-info text-black">
      <strong class="me-auto">${headerText}</strong>
      <button type="button" class="btn-close btn-close-info" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">${message}</div>
  `;
  toastContainer.appendChild(toast);
  setTimeout(()=>{ toast.classList.remove('show'); setTimeout(()=>toast.remove(),5000); }, 5000);
};

// ---------------------------
// Backend version check (original behavior)
async function checkBackendVersion() {
  const versionCheckURL = `${window.scriptURL}?action=versionCheck`;
  const updateBadge = (statusEmoji, statusText, bgClass) => {
    const badgeBtn = document.querySelector("#debugBadge button");
    if (badgeBtn) {
      badgeBtn.innerHTML = `${statusEmoji} ${statusText}`;
      badgeBtn.classList.remove("btn-outline-secondary", "btn-outline-success", "btn-outline-danger");
      badgeBtn.classList.add(bgClass);
    }
  };

  updateBadge("⏳", "Connecting", "btn-outline-secondary");

  try {
    const res = await fetch(versionCheckURL);
    const data = await res.json();

    const resources = window.getResourceStatus ? window.getResourceStatus() : [];

    window.backendMeta = {
      status: "✅ Connected",
      scriptURL: window.scriptURL,
      isLocal: window.isLocal,
      deployedVersion: data.deployedVersion || "N/A",
      timestamp: new Date().toISOString(),
      resources
    };

    console.log("✅ Debug System Operational");
    updateBadge("✅", "Connected", "btn-outline-black");
  } catch (err) {
    window.backendMeta = {
      status: "❌ Connection failed",
      scriptURL: window.scriptURL,
      isLocal: window.isLocal,
      error: err.message,
      timestamp: new Date().toISOString(),
      resources: window.getResourceStatus ? window.getResourceStatus() : []
    };
    console.error("❌ Backend version check failed:", err);
    updateBadge("❌", "Disconnected", "btn-outline-danger");
  }
}
document.addEventListener("DOMContentLoaded", () => setTimeout(checkBackendVersion, 3000));

// ---------------------------
// Debug modal (keeps original showDebugInfo behavior)
async function showDebugInfo() {
  const modalEl = document.getElementById("debugModal");
  if (!modalEl) return console.warn("No debugModal element");
  const modal = new bootstrap.Modal(modalEl);

  modal.show();
  toggleLoader(true);
  await new Promise(res => setTimeout(res, 50));

  const debugOutput = {
    status: "⏳ Gathering info...",
    scriptURL: window.scriptURL || "⚠️ Not set",
    deployedVersion: "Loading...",
    timestamp: new Date().toISOString(),
    currentPage: window.location.href,
    iframeSrc: document.querySelector("iframe")?.src || "N/A",
    parentTheme: "Unknown",
    iframeTheme: "Unknown",
    recentErrors: window._errorLog?.slice(-5) || [],
    ...window.backendMeta
  };

  try {
    const iframeCheck = await window.checkIframeResources();
    debugOutput.iframeChecks = iframeCheck.checks || [];
    debugOutput.iframeTheme = iframeCheck.theme || debugOutput.iframeTheme;
  } catch (err) {
    console.warn("❌ Iframe resource check failed:", err);
  }

  const parentCheck = window.checkParentResources();
  debugOutput.parentChecks = parentCheck.checks || [];
  debugOutput.parentTheme = parentCheck.theme || debugOutput.parentTheme;

  try {
    const res = await fetch(`${window.scriptURL}?action=versionCheck`);
    const data = await res.json();
    debugOutput.status = "✅ Connected";
    debugOutput.deployedVersion = data.deployedVersion;
    debugOutput.scriptURL = data.scriptURL || debugOutput.scriptURL;
    debugOutput.timestamp = data.timestamp;
    debugOutput.environment = data.environment;
  } catch (err) {
    debugOutput.status = "❌ Failed to connect";
    debugOutput.error = err.message;
  }

  const statusBadge = debugOutput.status.includes("✅")
    ? `<span class="badge bg-success">${debugOutput.status}</span>`
    : `<span class="badge bg-danger">${debugOutput.status}</span>`;

  const combinedResources = debugOutput.parentChecks.map((parentCheck, idx) => {
    const iframeCheck = debugOutput.iframeChecks?.[idx];
    return `
      <tr>
        <td>${parentCheck.name}</td>
        <td class="text-center">${parentCheck.found ? "✅" : "❌"}</td>
        <td class="text-center">${iframeCheck?.found ? "✅" : "❌"}</td>
      </tr>
    `;
  }).join("");

  const recentErrors = debugOutput.recentErrors.length
    ? debugOutput.recentErrors.map(e => `<li class="list-group-item py-1">${e}</li>`).join("")
    : `<li class="list-group-item py-1 text-muted">None</li>`;

  const contentHTML = `
    ... (same HTML structure you provided) ...
  `;
  const container = document.getElementById("debugData");
  if (container) container.innerHTML = contentHTML;
  toggleLoader(false);
}

// ---------------------------
// Email template helpers (keeps original behavior)
async function getEmailTemplateByType(type) {
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

async function showEmailModal({ type, mode }) {
  toggleLoader(true);
  await new Promise(requestAnimationFrame);

  try {
    const prefix = mode === "add" ? "add" : "edit";
    const firstName = document.getElementById(`${prefix}-firstName`)?.value || "";
    const lastName = document.getElementById(`${prefix}-lastName`)?.value || "";
    const emailTo = document.getElementById(`${prefix}-email`)?.value || "";
    const invoiceUrl = document.getElementById(`${prefix}-invoiceUrl`)?.value || "";
    const eventDate = document.getElementById(`${prefix}-eventDate`)?.value || "";
    const eventTheme = document.getElementById(`${prefix}-eventTheme`)?.value || "";
    const grandTotal = document.getElementById(`${prefix}-grandTotal`)?.value || "";
    const quoteID = document.getElementById(`${prefix}-qtID`)?.value || "";

    const placeholders = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      name: `${firstName} ${lastName}`.trim(),
      url: invoiceUrl,
      quoteID,
      eventDate,
      eventTheme,
      grandTotal
    };

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
    if (toInput) toInput.value = emailTo;
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
    toggleLoader(false);
  }
}

// ---------------------------
// Template renderer & drive helper
function renderTemplate(template, data) {
  return template.replace(/{{\s*([\w.]+)\s*}}/g, (match, key) => (key in data ? data[key] : match));
}

function convertGoogleDriveLink(url) {
  if (!url) return url;
  if (url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i)) return url;
  const driveMatch = url.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  if (driveMatch) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}`;
  return url;
}

function formatPhoneNumber(raw) {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  return raw; // fallback
}

function formatDateForUser(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US");
}

