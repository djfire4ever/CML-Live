// qm-modules/drawers.js

// --- Event dispatcher for slides to notify drawers ---
export const drawerEvents = new EventTarget();

// --- Central drawer state ---
const drawerState = {
  summaryDrawer: {
    name: null,
    clientID: null,
    email: null,
    eventDate: null,
    eventLocation: null,
    productCount: 0,
    productTotal: "$0.00",
    productList: []
  },
  balanceDrawer: {
    total: 0,
    paid: 0,
    balance: 0
  },
  balanceDetailsDrawer: {
    items: []
  }
};

// --- Drawer rendering ---
function renderDrawer(drawerName) {
  switch (drawerName) {
    // =========================================================
    // 🔹 Summary Drawer
    // =========================================================
    case "summaryDrawer": {
      const s = drawerState.summaryDrawer;
      const sumClient = document.getElementById("summaryClient");
      const sumEmail = document.getElementById("summaryEmail");
      const sumEventDate = document.getElementById("summaryEventDate");
      const sumEventLocation = document.getElementById("summaryEventLocation");
      const sumProductCount = document.getElementById("summaryProductCount");
      const sumProductTotal = document.getElementById("summaryProductTotal");
      const sumProductList = document.getElementById("summaryProductList");

      if (sumClient) sumClient.textContent = s.name ? `${s.name} (${s.clientID})` : "---";
      if (sumEmail) sumEmail.textContent = s.email || "---";
      if (sumEventDate) sumEventDate.textContent = s.eventDate ? formatDateForUser(s.eventDate) : "—";
      if (sumEventLocation) sumEventLocation.textContent = s.eventLocation || "—";

      if (sumProductCount) sumProductCount.textContent = `${s.productCount ?? 0} items`;
      if (sumProductTotal) sumProductTotal.textContent = s.productTotal || "$0.00";

      if (sumProductList) {
        sumProductList.innerHTML = (s.productList?.length)
          ? s.productList.map(p => `
              <li class="text-warning">
                ${p.name} — ${p.qty} × $${p.retail.toFixed(2)} = $${p.total}
              </li>
            `).join("")
          : "<li>No products selected</li>";
      }
      break;
    }

    // =========================================================
    // 🔹 Balance Drawer
    // =========================================================
    case "balanceDrawer": {
      const s = drawerState.balanceDrawer;
      const totalEl = document.querySelector("#balanceDrawer p:nth-child(1)");
      const paidEl = document.querySelector("#balanceDrawer p:nth-child(2)");
      const balanceEl = document.querySelector("#balanceDrawer p:nth-child(3)");

      if (totalEl) totalEl.textContent = `Total: $${s.total ?? "0.00"}`;
      if (paidEl) paidEl.textContent = `Paid: $${s.paid ?? "0.00"}`;
      if (balanceEl) balanceEl.textContent = `Balance: $${s.balance ?? "0.00"}`;
      break;
    }

    // =========================================================
    // 🔹 Balance Details Drawer
    // =========================================================
    case "balanceDetailsDrawer": {
      const s = drawerState.balanceDetailsDrawer;
      const itemsContainer = document.getElementById("balanceDetailsItems");
      if (itemsContainer) {
        itemsContainer.innerHTML = s.items?.length
          ? s.items.map(item => `<li>${item.desc}: ${item.amount}</li>`).join("")
          : "<p>No items</p>";
      }
      break;
    }

    default:
      console.warn("Unknown drawer for render:", drawerName);
  }
}

// --- Initialize all drawers and buttons ---
export function initDrawers() {
  const drawerMap = {
    summaryDrawer: "openSummary",
    balanceDrawer: "openBalance",
    balanceDetailsDrawer: "openBalanceDetails"
  };

  const drawerInstances = {};

  // Initialize Bootstrap Offcanvas instances
  Object.keys(drawerMap).forEach(drawerId => {
    const drawerEl = document.getElementById(drawerId);
    if (!drawerEl) return;
    drawerInstances[drawerId] = new bootstrap.Offcanvas(drawerEl);
  });

  // Button click handlers
  Object.entries(drawerMap).forEach(([drawerId, btnId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener("click", () => {
      // Close other drawers
      Object.entries(drawerInstances).forEach(([otherId, instance]) => {
        if (otherId !== drawerId) instance.hide();
      });

      // Open this drawer
      drawerInstances[drawerId].show();
    });
  });

  // Listen for unified slide updates
  drawerEvents.addEventListener("updateDrawer", (e) => {
    const { drawer, fields } = e.detail;
    if (!drawerState[drawer]) return;

    Object.assign(drawerState[drawer], fields);
    renderDrawer(drawer);
  });
}

// --- Helper to notify drawers from slides ---
export function notifyDrawer(drawerName, fields) {
  drawerEvents.dispatchEvent(new CustomEvent("updateDrawer", {
    detail: { drawer: drawerName, fields }
  }));
}
