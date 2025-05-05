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
      bgColor = type === "success" ? "bg-success" : "bg-danger";
      headerText = type === "success" ? "✅ Success" : "❌ Error";
    }

    const toast = document.createElement("div");
    toast.classList.add("toast", "show", bgColor, "text-dark", "fade");
    toast.setAttribute("role", "alert");
    
    toast.innerHTML = `
      <div class="toast-header">
          <strong class="me-auto">${headerText}</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
      </div>
      <div class="toast-body">${message}</div>
    `;
    
    toastContainer.appendChild(toast);

    // Auto-remove the toast after 10 seconds
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 500);
    }, 10000);
  }

  function toggleLoader() {
    const loader = document.getElementById("loadingOverlay");

    if (loader) {
      loader.classList.toggle("show");

      // Make sure to remove d-none when showing
      if (loader.classList.contains("show")) {
        loader.classList.remove("d-none");
      } else {
        loader.classList.add("d-none");
      }
    }
  }

  function loadStylesheets() {
    const head = document.head;

    // Bootstrap 5.3.5 CSS
    const bootstrapCSS = document.createElement('link');
    bootstrapCSS.rel = 'stylesheet';
    bootstrapCSS.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/css/bootstrap.min.css';
    head.appendChild(bootstrapCSS);

    // Bootstrap Icons
    const bootstrapIcons = document.createElement('link');
    bootstrapIcons.rel = 'stylesheet';
    bootstrapIcons.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css';
    head.appendChild(bootstrapIcons);

    // Font Awesome 6.5
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
    head.appendChild(fontAwesome);

    // Base Custom Styles
    const customCSS = document.createElement('link');
    customCSS.rel = 'stylesheet';
    customCSS.href = 'style.css';
    head.appendChild(customCSS);

    // Theme/Settings Styles (load last so it overrides other styles)
    // const settingsCSS = document.createElement('link');
    // settingsCSS.rel = 'stylesheet';
    // settingsCSS.href = 'settings.css';
    // head.appendChild(settingsCSS);
  }

  function loadScripts() {
    const body = document.body;

    // Bootstrap 5.3.5 JS Bundle
    const bootstrapScript = document.createElement('script');
    bootstrapScript.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.5/dist/js/bootstrap.bundle.min.js';
    bootstrapScript.defer = true;
    body.appendChild(bootstrapScript);

    bootstrapScript.onload = () => {
      // Bootstrap is ready, run any dependent code here
    };
  }

  // ✅ Only run once the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
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
          productTypeDatalist: "product-type-options",
          partsDatalist: "parts-options",
          phoneDatalist: "phone-options",
          unitTypeDatalist: "unit-type-options",
          paymentMethodDatalist: "payment-method-options",
          productDatalist: "product-options"
        };

        for (const [key, datalistId] of Object.entries(dropdowns)) {
          const datalistElement = document.getElementById(datalistId);
          if (datalistElement) {
            datalistElement.innerHTML = "";

            let values = [];
            if (key === "productTypeDatalist") values = data.productTypes || [];
            else if (key === "partsDatalist") values = data.parts || [];
            else if (key === "phoneDatalist") values = data.phoneList || [];
            else if (key === "unitTypeDatalist") values = data.unitTypes || [];
            else if (key === "paymentMethodDatalist") values = data.paymentMethods || [];
            else if (key === "productDatalist") values = data.products || [];

            values.forEach(val => {
              const option = document.createElement("option");
              option.value = val;
              datalistElement.appendChild(option);
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

