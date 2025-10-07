// global.js
// Shared/global utilities, loaders, and diagnostics

// --- pageMeta and debug tags ---
window.pageMeta = window.pageMeta || {};
window.pageMeta.loadedFrom = "global.js";
window.pageMeta.pageType = "global";
window.pageMeta.ready = false;
console.log("✅ global.js loaded");

// --- global error logging ---
window._errorLog = window._errorLog || [];
window.addEventListener("error", (e) => {
  const msg = `[${new Date().toLocaleTimeString()}] ${e.message} at ${e.filename}:${e.lineno}`;
  window._errorLog.push(msg);
  if (window._errorLog.length > 10) window._errorLog.shift();
});

// --- environment / script URL ---
window.isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
window.scriptURL = window.isLocal
  ? "https://script.google.com/macros/s/AKfycbzd_0wJUUB8AyjmBd_Z5ZMjkch3RTWR66qbBFen_0li0KwcoVZVGBgRQWKzwePFRDjZ/exec"
  : "/.netlify/functions/leadProxy";

// ---------------------------
// Shared formatters / helpers
// ---------------------------
window.formatDateForUser = (date) => (!date ? "" : new Date(date).toLocaleDateString("en-US"));

window.formatCurrency = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

window.parseSafeNumber = (raw) => {
  if (raw === undefined || raw === null) return 0;
  const s = String(raw).replace(/[^0-9.-]+/g, "");
  return parseFloat(s) || 0;
};

window.formatPhoneNumber = (number) => {
  if (!number) return "";
  const digits = String(number).replace(/\D/g, "");
  if (digits.length !== 10) return number;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
};

// ---------------------------
// Shared CSS & JS loaders
// ---------------------------
window.loadSharedStyles = () => {
  const head = document.head;
  const stylesheets = [
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css',
    'style.css'
  ];
  stylesheets.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    head.appendChild(link);
  });
  window.pageMeta.hasBootstrapCSS = true;
  window.pageMeta.hasBootstrapIcons = true;
  window.pageMeta.hasFontAwesome = true;
  window.pageMeta.hasCustomCSS = true;
};

window.loadSharedScripts = () => {
  if (window.scriptsAlreadyLoaded) return;
  window.scriptsAlreadyLoaded = true;

  const bootstrapScript = document.createElement('script');
  bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js';
  bootstrapScript.defer = true;
  bootstrapScript.onload = () => {
    console.log('✅ Bootstrap JS loaded');
    window.pageMeta.hasBootstrap = true;
  };
  document.body.appendChild(bootstrapScript);
};

// ---------------------------
// Resource / debug helpers
// ---------------------------
window.getResourceStatus = () => [
  { name: "Bootstrap CSS", loaded: !!document.querySelector('link[href*="bootstrap.min.css"]') },
  { name: "Bootstrap Icons", loaded: !!document.querySelector('link[href*="bootstrap-icons.min.css"]') },
  { name: "Font Awesome", loaded: !!document.querySelector('link[href*="font-awesome"],link[href*="fontawesome"]') },
  { name: "Custom CSS", loaded: !!document.querySelector('link[href*="style.css"]') },
  { name: "Bootstrap JS", loaded: typeof bootstrap !== "undefined" },
  { name: "FullCalendar", loaded: typeof window.FullCalendar !== "undefined" }
];

window.checkParentResources = () => {
  const pm = window.pageMeta || {};
  const checks = [
    { name: 'Global.js included', found: pm.loadedFrom === 'global.js' },
    { name: 'Bootstrap CSS', found: !!pm.hasBootstrapCSS },
    { name: 'Bootstrap Icons', found: !!pm.hasBootstrapIcons },
    { name: 'Font Awesome', found: !!pm.hasFontAwesome },
    { name: 'Custom CSS', found: !!pm.hasCustomCSS },
    { name: 'Bootstrap JS', found: !!pm.hasBootstrap },
    { name: 'FullCalendar', found: !!pm.hasFullCalendar },
    { name: 'Page Type', found: pm.pageType || 'Unknown' }
  ];
  return { checks, theme: pm.theme || 'Unknown' };
};

window.checkIframeResources = async () => {
  const frame = document.querySelector('#content-frame');
  if (!frame) return { error: '❌ No iframe found' };
  const win = frame.contentWindow;
  const pm = win.pageMeta || {};
  const checks = [
    { name: 'Global.js included', found: pm.loadedFrom === 'global.js' },
    { name: 'Bootstrap CSS', found: !!pm.hasBootstrapCSS },
    { name: 'Bootstrap Icons', found: !!pm.hasBootstrapIcons },
    { name: 'Font Awesome', found: !!pm.hasFontAwesome },
    { name: 'Custom CSS', found: !!pm.hasCustomCSS },
    { name: 'Bootstrap JS', found: !!pm.hasBootstrap },
    { name: 'FullCalendar', found: !!pm.hasFullCalendar },
    { name: 'Page Type', found: pm.pageType || 'Unknown' }
  ];
  return { checks, theme: pm.theme || 'Unknown' };
};

// quick console helper
window.showLoadedModules = () => {
  console.table({
    "Loaded From": window.pageMeta.loadedFrom,
    "Page Type": window.pageMeta.pageType,
    "Bootstrap CSS": !!window.pageMeta.hasBootstrapCSS,
    "Bootstrap JS": !!window.pageMeta.hasBootstrap,
    "FullCalendar": !!window.pageMeta.hasFullCalendar
  });
};

// ---------------------------
// Conditional FullCalendar + theme detection moved into shared loadScripts
// (keeps original behavior: FullCalendar only loads on /calendar.html)
// ---------------------------
window.loadGlobalScriptsWithConditionals = () => {
  if (window.scriptsAlreadyLoaded) return;
  window.scriptsAlreadyLoaded = true;

  // Bootstrap
  const bootstrapScript = document.createElement('script');
  bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js';
  bootstrapScript.defer = true;
  bootstrapScript.onload = () => {
    console.log('✅ Bootstrap loaded');
    window.pageMeta.hasBootstrap = true;
  };
  document.body.appendChild(bootstrapScript);

  // FullCalendar only on /calendar.html
  if (["/calendar.html"].includes(window.location.pathname)) {
    const fullCalendarCore = document.createElement('script');
    fullCalendarCore.src = 'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/index.global.min.js';
    fullCalendarCore.onload = () => {
      console.log('✅ FullCalendar core loaded');
      const pluginScripts = [
        'https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/index.global.min.js',
        'https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.17/index.global.min.js',
        'https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.17/index.global.min.js',
        'https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.17/index.global.min.js',
        'https://cdn.jsdelivr.net/npm/@fullcalendar/google-calendar@6.1.17/index.global.min.js'
      ];
      let loadedCount = 0;
      pluginScripts.forEach((src) => {
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        script.onload = () => {
          loadedCount++;
          if (loadedCount === pluginScripts.length) {
            console.log('✅ FullCalendar plugins loaded');
            window.pageMeta.hasFullCalendar = true;
            window.dispatchEvent(new Event('FullCalendarLoaded'));
          }
        };
        document.body.appendChild(script);
      });
    };
    document.body.appendChild(fullCalendarCore);
  }

  // detect theme class on body
  const themeClass = [...document.body.classList].find(cls => cls.startsWith('theme-')) || 'no-theme';
  window.pageMeta.theme = themeClass;
  window.pageMeta.ready = true;
};

// ---------------------------
// DOM ready wiring (keeps original behavior)
// ---------------------------
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Ready: global loading styles and scripts...');
  window.loadSharedStyles();
  window.loadGlobalScriptsWithConditionals();
  window.pageMeta.ready = true;
});

function convertGoogleDriveLink(url) {
  if (!url) return url;
  if (url.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i)) return url;
  const driveMatch = url.match(/(?:\/d\/|id=)([a-zA-Z0-9_-]{20,})/);
  return driveMatch ? `https://drive.google.com/thumbnail?id=${driveMatch[1]}` : url;
}

// 👇 Add this line to make it visible to all scripts
window.convertGoogleDriveLink = convertGoogleDriveLink;
