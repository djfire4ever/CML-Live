window._errorLog = [];
window.addEventListener("error", (e) => {
  const msg = `[${new Date().toLocaleTimeString()}] ${e.message} at ${e.filename}:${e.lineno}`;
  window._errorLog.push(msg);
  if (window._errorLog.length > 10) window._errorLog.shift(); // Keep only last 10
});

// const scriptURL = "https://script.google.com/macros/s/AKfycbzd_0wJUUB8AyjmBd_Z5ZMjkch3RTWR66qbBFen_0li0KwcoVZVGBgRQWKzwePFRDjZ/exec";

  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  const scriptURL = isLocal
    ? "https://script.google.com/macros/s/AKfycbzd_0wJUUB8AyjmBd_Z5ZMjkch3RTWR66qbBFen_0li0KwcoVZVGBgRQWKzwePFRDjZ/exec"
    : "/.netlify/functions/leadProxy";

  // Dynamically load Courgette font from Google Fonts
  (function loadCourgetteFont() {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Courgette&display=swap';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    document.head.appendChild(link);
  })();

// Show Toast Notification with different styles for Lead Form and Admin
function showToast(message, type = "success", forLeadForm = false) {
  const toastContainer = document.getElementById("toastContainer");

  // Define background color for different types
  let bgColor;
  let headerText;
    
  if (forLeadForm) {
    // For the lead form, use different colors for different types
    if (type === "success") {
      bgColor = "bg-primary"; // Lead form success message
      headerText = "Thank You!";
      message = "We will contact you shortly."; // Default message for success
    } else if (type === "warning") {
      bgColor = "bg-warning"; // Lead form warning (e.g., missing phone/email)
      headerText = "Attention!";
    } else if (type === "error") {
      bgColor = "bg-danger"; // Lead form error message
      headerText = "❌ Error!";
    }
  } else {
    // Admin side (success or error)
    bgColor = type === "success" ? "bg-black" : "bg-danger";
    headerText = type === "success" ? "✅ Success" : "❌ Error";
  }

  const toast = document.createElement("div");
  toast.classList.add("toast", "show", bgColor, "text-info", "fade");
  toast.setAttribute("role", "alert");
  
  toast.innerHTML = `
    <div class="toast-header">
        <strong class="me-auto">${headerText}</strong>
        <button type="button" class="btn-close btn-close-info" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">${message}</div>
  `;
    
  toastContainer.appendChild(toast);

  // Auto-remove the toast after 5 seconds
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 5000);
  }, 5000);
}

function toggleLoader() {
  const loader = document.getElementById("loadingOverlay");

  if (loader) {
    loader.classList.toggle("show");

    // Also toggle d-none to remove from layout
    if (loader.classList.contains("show")) {
      loader.classList.remove("d-none");
    } else {
      loader.classList.add("d-none");
    }
  }
}

function loadStylesheets() {
  const head = document.head;

  // Bootstrap 5.3.6 CSS
  const bootstrapCSS = document.createElement('link');
  bootstrapCSS.rel = 'stylesheet';
  bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/css/bootstrap.min.css';
  head.appendChild(bootstrapCSS);

  // Bootstrap Icons
  const bootstrapIcons = document.createElement('link');
  bootstrapIcons.rel = 'stylesheet';
  bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.1/font/bootstrap-icons.min.css';
  head.appendChild(bootstrapIcons);

  // Font Awesome 6.7.2
  const fontAwesome = document.createElement('link');
  fontAwesome.rel = 'stylesheet';
  fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css';
  head.appendChild(fontAwesome);

  // Base Custom Styles
  const customCSS = document.createElement('link');
  customCSS.rel = 'stylesheet';
  customCSS.href = 'style.css';
  head.appendChild(customCSS);
}

function loadScripts() {
  const body = document.body;

  // ✅ Prevent reloading
  if (window.scriptsAlreadyLoaded) return;
  window.scriptsAlreadyLoaded = true;

  // ✅ Load Bootstrap
  const bootstrapScript = document.createElement('script');
  bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.6/dist/js/bootstrap.bundle.min.js';
  bootstrapScript.defer = true;
  bootstrapScript.onload = () => {
    console.log('✅ Bootstrap loaded');
  };
  body.appendChild(bootstrapScript);

  // ✅ Conditionally load FullCalendar ONLY on calendar pages
  if (["/calendar.html", "/schedule.html"].includes(window.location.pathname)) {
    const fullCalendarScripts = [
      'https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/index.global.min.js',
      'https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.17/index.global.min.js',
      'https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.17/index.global.min.js',
      'https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.17/index.global.min.js',
      'https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.17/index.global.min.js',
      'https://cdn.jsdelivr.net/npm/@fullcalendar/google-calendar@6.1.17/index.global.min.js'
    ];

    let loadedCount = 0;
    fullCalendarScripts.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = () => {
        loadedCount++;
        if (loadedCount === fullCalendarScripts.length) {
          window.dispatchEvent(new Event('FullCalendarLoaded'));
          console.log('✅ FullCalendar scripts fully loaded');
        }
      };
      body.appendChild(script);
    });
  }
}

// To be called on DOMContentLoaded:
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Ready: loading styles and scripts...');
  loadStylesheets();
  loadScripts();
});

// ✅ Load Dropdowns
document.addEventListener("DOMContentLoaded", () => {
  if (
    document.getElementById("product-type-options") ||
    document.getElementById("parts-options") ||
    document.getElementById("phone-options") ||
    document.getElementById("unit-type-options") ||
    document.getElementById("payment-method-options") ||
    document.getElementById("product-options")
  ) {
    loadDropdowns();
  }
});

function loadDropdowns() {
  fetch(`${scriptURL}?action=dropdownLists`)
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
          selectElement.innerHTML = ""; // Clear existing options

          // Add a default "Select" option
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
  
          // Populate the dropdown with options
          values.forEach(val => {
            const option = document.createElement("option");
            option.value = val;
            option.textContent = val;
            selectElement.appendChild(option);
          });
        }
      }
  
      console.log("✅ Dropdowns loaded successfully");
    })
    .catch(error => {
      // Only log the error if it's not caused by user navigating away
      if (error.name !== "AbortError") {
        console.warn("⚠️ Dropdown fetch skipped or failed silently:", error.message);
      }
    });
}

window.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('searchInput');
  if (input && document.activeElement !== input) {
    input.focus();
  }
});

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

function formatDateForUser(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US");
}

function formatPhoneNumber(number) {
  const digits = number.replace(/\D/g, "");
  if (digits.length !== 10) return number;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
}

// ✅ Global version/debug check
function getResourceStatus() {
  return [
    {
      name: "Bootstrap CSS",
      loaded: !!document.querySelector('link[href*="bootstrap.min.css"]')
    },
    {
      name: "Bootstrap Icons",
      loaded: !!document.querySelector('link[href*="bootstrap-icons"]')
    },
    {
      name: "Font Awesome",
      loaded: !!document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"]')
    },
    {
      name: "Custom CSS",
      loaded: !!document.querySelector('link[href*="style.css"]')
    },
    {
      name: "Bootstrap JS",
      loaded: typeof bootstrap !== "undefined"
    },
    {
      name: "FullCalendar",
      loaded: typeof window.FullCalendar !== "undefined",
      location: typeof window.FullCalendar !== "undefined" ? "✅ Global" : "❌ Not Found"
    }
  ];
}

function checkBackendVersion() {
  const versionCheckURL = `${scriptURL}?action=versionCheck`;
  const resources = [
    { name: "Bootstrap CSS", check: () => !!document.querySelector('link[href*="bootstrap.min.css"]') },
    { name: "Bootstrap Icons", check: () => !!document.querySelector('link[href*="bootstrap-icons"]') },
    { name: "Font Awesome", check: () => !!document.querySelector('link[href*="font-awesome"]') },
    { name: "Custom CSS", check: () => !!document.querySelector('link[href*="style.css"]') },
    { name: "Bootstrap JS", check: () => !!window.bootstrap },
    { name: "FullCalendar",
      status: window.FullCalendar ? "✅" : "⚠️ Not Loaded",
      location: typeof window.FullCalendar !== "undefined" ? "Global" : "Unavailable"
    }
  ];

  const updateBadge = (statusEmoji, statusText, bgClass) => {
    const badgeBtn = document.querySelector("#debugBadge button");
    if (badgeBtn) {
      badgeBtn.innerHTML = `${statusEmoji} ${statusText}`;
      badgeBtn.classList.remove("btn-outline-secondary", "btn-outline-success", "btn-outline-danger");
      badgeBtn.classList.add(bgClass);
    }
  };

  updateBadge("⏳", "Connecting", "btn-outline-secondary");

  fetch(versionCheckURL)
    .then(res => res.json())
    .then(data => {
      const resources = getResourceStatus();

      window.backendMeta = {
        status: "✅ Connected",
        scriptURL,
        isLocal,
        deployedVersion: data.deployedVersion || "N/A",
        timestamp: new Date().toISOString(),
        resources
      };

      console.log("✅ Backend Connected:", window.backendMeta);
      updateBadge("✅", "Connected", "btn-outline-success");
    })
    .catch(err => {
      window.backendMeta = {
        status: "❌ Connection failed",
        scriptURL,
        isLocal,
        error: err.message,
        timestamp: new Date().toISOString(),
        resources: resources.map(r => ({ name: r.name, loaded: r.check() }))
      };
      console.error("❌ Backend version check failed:", err);
      updateBadge("❌", "Disconnected", "btn-outline-danger");
    });
}

// 🔎 Show debug modal with version info
async function showDebugInfo() {
  const debugOutput = {
    status: "⏳ Gathering info...",
    scriptURL: window.scriptURL || "⚠️ Not set",
    deployedVersion: "Loading...",
    timestamp: new Date().toISOString(),
    currentPage: window.location.pathname,
    iframeSrc: document.querySelector("iframe")?.src || "N/A",
    theme: getComputedStyle(document.documentElement).getPropertyValue('--bs-body-bg')?.trim() || "Not set",
    recentErrors: window._errorLog?.slice(-5) || [],
    ...window.backendMeta // 🧠 Merge all backendMeta values (status, scriptURL, isLocal, environment, resources, etc.)
  };

  try {
    const res = await fetch(`${scriptURL}?action=versionCheck`);
    const data = await res.json();
    debugOutput.status = "✅ Connected";
    debugOutput.deployedVersion = data.deployedVersion;
    debugOutput.scriptURL = data.scriptURL || debugOutput.scriptURL;
    debugOutput.timestamp = data.timestamp;
    debugOutput.environment = data.environment;
  } catch (e) {
    debugOutput.status = "❌ Failed to connect";
    debugOutput.error = e.message;
  }

  // 🧩 Build UI content
  const statusBadge = debugOutput.status.includes("✅")
    ? `<span class="badge bg-success">${debugOutput.status}</span>`
    : `<span class="badge bg-danger">${debugOutput.status}</span>`;

  const errors = debugOutput.recentErrors.length
    ? debugOutput.recentErrors.map(e => `<li>${e}</li>`).join("")
    : "<li>None</li>";

  const resources = (debugOutput.resources || [])
    .map(r => `<tr><td>${r.name}</td><td>${r.loaded ? "✅" : "❌"}${r.location ? ` <span class="text-muted small">(${r.location})</span>` : ""}</td></tr>`)
    .join("");

  const contentHTML = `
    <div class="mb-3">
      <h6>Status ${statusBadge}</h6>
    </div>
    <div class="mb-3">
      <h6>📄 Page Info</h6>
      <ul class="list-group list-group-flush small">
        <li class="list-group-item"><strong>Current Page:</strong> ${debugOutput.currentPage}</li>
        <li class="list-group-item"><strong>iFrame Src:</strong> ${debugOutput.iframeSrc}</li>
        <li class="list-group-item"><strong>Theme Color:</strong> ${debugOutput.theme}</li>
      </ul>
    </div>
    <div class="mb-3">
      <h6>🧠 Backend Info</h6>
      <ul class="list-group list-group-flush small">
        <li class="list-group-item"><strong>Script URL:</strong> ${debugOutput.scriptURL}</li>
        <li class="list-group-item"><strong>Deployed Version:</strong> ${debugOutput.deployedVersion}</li>
        <li class="list-group-item"><strong>Environment:</strong> ${debugOutput.environment}</li>
        <li class="list-group-item"><strong>isLocal:</strong> ${debugOutput.isLocal}</li>
        <li class="list-group-item"><strong>Timestamp:</strong> ${debugOutput.timestamp}</li>
      </ul>
    </div>
    <div class="mb-3">
      <h6>📦 Resources Loaded</h6>
      <table class="table table-sm table-bordered small">
        <thead class="table-light">
          <tr><th>Resource</th><th>Status</th></tr>
        </thead>
        <tbody>${resources}</tbody>
      </table>
    </div>
    <div>
      <h6>⚠️ Recent Errors</h6>
      <ul class="small">${errors}</ul>
    </div>
  `;

  document.getElementById("debugData").innerHTML = contentHTML;

  const modal = new bootstrap.Modal(document.getElementById("debugModal"));
  modal.show();
}

// Automatically check version on load
document.addEventListener("DOMContentLoaded", () => {
  checkBackendVersion();
});


// ✅ Calendar init waits for FullCalendar to load
// function initCalendarIfPresent() {
//   const calendarEl = document.getElementById("calendar");
//   if (!calendarEl) return; // Exit if calendar isn't on this page

//   function waitForFullCalendar(callback) {
//     if (window.FullCalendar && window.FullCalendar.Calendar) {
//       callback();
//     } else {
//       setTimeout(() => waitForFullCalendar(callback), 50);
//     }
//   }

//   waitForFullCalendar(() => {
//     const {
//       Calendar,
//       dayGridPlugin,
//       timeGridPlugin,
//       listPlugin,
//       interactionPlugin,
//     } = window.FullCalendar;

//     const calendar = new Calendar(calendarEl, {
//       plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
//       initialView: "dayGridMonth",
//       headerToolbar: {
//         left: "prev,next today",
//         center: "title",
//         right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
//       },
//       events: [], // or fetch from backend
//       editable: true,
//       selectable: true,
//     });

//     calendar.render();
//     console.log("✅ Calendar rendered");
//   });
// }

// Attach after DOM ready
// document.addEventListener("DOMContentLoaded", initCalendarIfPresent);




  // function applyThemeFromPage() {
  //   const theme = document.body.dataset.theme; // e.g., "theme-dark"
  //   if (theme) {
  //     // Remove any existing class that starts with "theme-"
  //     document.body.classList.forEach(cls => {
  //       if (cls.startsWith("theme-")) {
  //         document.body.classList.remove(cls);
  //       }
  //     });
  
  //     // Apply the new theme class without affecting other body classes
  //     document.body.classList.add(theme);
  //     console.log(`🎨 Theme applied from page: ${theme}`);
  //   } else {
  //     console.warn("⚠️ No data-theme found on <body>");
  //   }
  // } 

// (function purgeLocalStorageGlobally() {
//   if (typeof localStorage !== 'undefined') {
//     console.warn("⚠️ Purging localStorage globally from config.js...");
//     localStorage.clear(); // Wipes everything
//     console.log("✅ localStorage successfully purged by global script.");
//   }
// })();

// // ── config.js ── This entire section may need to be deleted or at least modified

  // // 1) Create a channel named "theme"
  // const themeChannel = new BroadcastChannel("theme");

  // // 2) A helper to apply a theme settings object to the current page
  // function applyThemeSettings(settings = {}) {
  //   document.documentElement.classList.remove(
  //     "theme-dark","theme-classic"
  //   );
  //   if (settings.theme) {
  //     document.documentElement.classList.add(settings.theme);
  //   }
  //   // CSS variables:
  //   if (settings.bgColor)   document.documentElement.style.setProperty("--bg-color",   settings.bgColor);
  //   if (settings.textColor) document.documentElement.style.setProperty("--text-color", settings.textColor);
  //   if (settings.inputBg)   document.documentElement.style.setProperty("--input-bg",   settings.inputBg);
  //   if (settings.searchBg)  document.documentElement.style.setProperty("--search-bg",  settings.searchBg);
  // }

  // // 3) On page load, read from localStorage and apply
  // window.addEventListener("DOMContentLoaded", () => {
  //   const saved = localStorage.getItem("theme-settings");
  //   if (saved) {
  //     applyThemeSettings(JSON.parse(saved));
  //   }
  // });

  // // 4) Listen for live broadcasts
  // themeChannel.addEventListener("message", ev => {
  //   applyThemeSettings(ev.data);
  // });

  // function applyTheme(themeName) {
  //   document.body.classList.remove("theme-dark","theme-classic");
  //   document.body.classList.add(themeName);
  // }

