// global.js

// Page meta setup
window.pageMeta = window.pageMeta || {};
window.pageMeta.loadedFrom = "global.js";
window.pageMeta.pageType = "global";
window.pageMeta.context = window !== window.parent ? "iframe" : "parent";
window.pageMeta.ready = false;

// Deferred console logging system
window._deferredLogs = window._deferredLogs || { parent: [], iframe: [] };

const logWithContext = (...args) => {
  const context = window.pageMeta.context;
  const color = context === "iframe"
    ? "color: orange; font-weight:bold;"
    : "color: green; font-weight:bold;";
  window._deferredLogs[context].push({ args, color });
};

// Global initialization logs
logWithContext("✅ global.js loaded");

// Global error logging (lightweight)
window._errorLog = [];
window.addEventListener("error", (e) => {
  const msg = `[${new Date().toLocaleTimeString()}] ${e.message} @ ${e.filename}:${e.lineno}`;
  window._errorLog.push(msg);
  if (window._errorLog.length > 10) window._errorLog.shift();
});

// Environment / script URL
window.isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
window.scriptURL = window.isLocal
  ? "https://script.google.com/macros/s/AKfycbz0n1Br3EO0z7Dukhqo0bZ_QKCZ-3hLjjsLdZye6kBPdu7Wdl7ag9dTBbgiJ5ArrCQ/exec"
  : "/.netlify/functions/leadproxy";
logWithContext(`🌍 Environment: ${window.isLocal ? "Local" : "Live"}`);

// Library versions
window.LIB_VERSIONS = {
  bootstrap: "5.3.8",
  bootstrapIcons: "1.13.1",
  fontAwesome: "7.0.1",
  fullCalendarCore: "6.1.17",
  fullCalendarPlugins: "6.1.17"
};

// global.js
window.loadSharedStyles = () => {
  const isAdmin = location.pathname.includes('/admin/');
  // Restore this line after refactoring quote-manager.css
  // const stylesheet = isAdmin ? '/admin/style.css' : 'style.css';

  const stylesheet = '/admin/quote-manager.css';

  const stylesheets = [
    `https://cdn.jsdelivr.net/npm/bootstrap@${window.LIB_VERSIONS.bootstrap}/dist/css/bootstrap.min.css`,
    `https://cdn.jsdelivr.net/npm/bootstrap-icons@${window.LIB_VERSIONS.bootstrapIcons}/font/bootstrap-icons.min.css`,
    `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/${window.LIB_VERSIONS.fontAwesome}/css/all.min.css`,
    stylesheet
  ];

  stylesheets.forEach(href => {
    if (![...document.styleSheets].some(s => s.href && s.href.includes(href))) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    }
  });

  logWithContext(`✅ Shared styles loaded (${isAdmin ? 'admin' : 'client'} mode)`);
};

window.loadGlobalScripts = () => {
  if (window.scriptsAlreadyLoaded) return;
  window.scriptsAlreadyLoaded = true;

  const bootstrapScript = document.createElement('script');
  bootstrapScript.src = `https://cdn.jsdelivr.net/npm/bootstrap@${window.LIB_VERSIONS.bootstrap}/dist/js/bootstrap.bundle.min.js`;
  bootstrapScript.defer = true;
  bootstrapScript.onload = () => {
    logWithContext('✅ Bootstrap JS loaded');
  };
  document.body.appendChild(bootstrapScript);
};

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  logWithContext('✅ DOM Ready: Scripts/Styles Loaded');
  window.loadSharedStyles();
  window.loadGlobalScripts();
  window.pageMeta.ready = true;

  // Print logs for this context once
  const context = window.pageMeta.context;
  console.groupCollapsed(`%c[${context}] Page Load Summary`, context === "iframe" ? "color: orange;" : "color: green;");
  window._deferredLogs[context].forEach(log => console.log(`%c[${context}]`, log.color, ...log.args));
  console.groupEnd();
});

// Shared formatters / helpers
window.formatDateForUser = (date) =>
  date ? new Date(date).toLocaleDateString("en-US") : "";

window.formatCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

// Loader overlay toggle
window.toggleLoader = (show, options = {}) => {
  const loader = document.getElementById("loadingOverlay");
  if (!loader) return;

  const { message } = options;
  if (message) {
    const msgEl = loader.querySelector(".loader-message");
    if (msgEl) msgEl.textContent = message;
  }

  if (typeof show === 'undefined') {
    loader.classList.toggle('show');
    loader.classList.toggle('d-none', !loader.classList.contains('show'));
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

window.convertGoogleDriveLink = (url) => {
  if (!url) return url;
  if (url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i)) return url;
  const driveMatch = url.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  if (driveMatch) return `https://drive.google.com/thumbnail?id=${driveMatch[1]}`;
  return url;
};
