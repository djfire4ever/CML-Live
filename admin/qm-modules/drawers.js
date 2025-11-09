// qm-modules/drawers.js

// --- Event dispatcher for slides to notify drawers ---
export const drawerEvents = new EventTarget();

// --- Central drawer state ---
const drawerState = {
  quoteSummaryDrawer: {
    name: null,
    clientID: null,
    tier: null,
    eventDate: null,
    eventLocation: null,
    productCount: 0,
    productTotal: "$0.00",
    productList: []
  },
  balanceDetailsDrawer: {
    items: []
  },
  runningTotalDrawer: {
    html: ""
  }
};

// =========================================================
// 🧩 Drawer Rendering
// =========================================================
function renderDrawer(drawerName) {
  switch (drawerName) {

    case "quoteSummaryDrawer": {
      const s = drawerState.quoteSummaryDrawer;

      const summaryClientNameEl = document.getElementById("summaryClientName");
      if (summaryClientNameEl) summaryClientNameEl.textContent = s.name || "—";

      const summaryClientIDEl = document.getElementById("summaryClientID");
      if (summaryClientIDEl) summaryClientIDEl.textContent = s.clientID ? formatPhoneNumber(s.clientID) : "—";

      const summaryTierEl = document.getElementById("summaryTier");
      if (summaryTierEl) summaryTierEl.textContent = s.tier || "—";

      const summaryEventDateEl = document.getElementById("summaryEventDate");
      if (summaryEventDateEl) summaryEventDateEl.textContent = s.eventDate ? formatDateForUser(s.eventDate) : "—";

      const summaryEventLocationEl = document.getElementById("summaryEventLocation");
      if (summaryEventLocationEl) summaryEventLocationEl.textContent = s.eventLocation || "—";

      const summaryProductCountEl = document.getElementById("summaryProductCount");
      if (summaryProductCountEl) summaryProductCountEl.textContent = `${s.productCount ?? 0} items`;

      const summaryProductTotalEl = document.getElementById("summaryProductTotal");
      if (summaryProductTotalEl) summaryProductTotalEl.textContent = s.productTotal || "$0.00";

      const summaryProductListEl = document.getElementById("summaryProductList");
      if (summaryProductListEl) {
        summaryProductListEl.innerHTML = s.productList?.length
          ? s.productList.map(p => `<li class="text-warning">${p.name} — ${p.qty} × $${p.retail.toFixed(2)} = $${p.total}</li>`).join("")
          : "<li>No products selected</li>";
      }
      break;
    }

    case "balanceDetailsDrawer": {
      const s = drawerState.balanceDetailsDrawer;
      const containerEl = document.getElementById("balanceDetailsDrawer");
      if (containerEl) {
        const bodyEl = containerEl.querySelector(".offcanvas-body");
        if (bodyEl) {
          bodyEl.innerHTML = s.items?.length
            ? `<ul>${s.items.map(i => `<li>${i.desc}: ${i.amount}</li>`).join("")}</ul>`
            : "<p>No items yet</p>";
        }
      }
      break;
    }

    case "runningTotalDrawer": {
      const containerEl = document.getElementById("runningTotalBody");
      if (containerEl) {
        containerEl.innerHTML = drawerState.runningTotalDrawer.html || "<p>No totals available</p>";
      }
      break;
    }

    default:
      console.warn("Unknown drawer for render:", drawerName);
  }
}

// =========================================================
// 🧩 Initialization
// =========================================================
export function initDrawers() {
  const drawerMap = {
    quoteSummaryDrawer: "openQuoteSummary",
    balanceDetailsDrawer: "openBalanceDetails",
    runningTotalDrawer: "openRunningTotal"
  };

  const drawerInstances = {};

  // Bootstrap Offcanvas init
  Object.keys(drawerMap).forEach(drawerId => {
    const el = document.getElementById(drawerId);
    if (!el) return;
    drawerInstances[drawerId] = new bootstrap.Offcanvas(el);
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
      drawerInstances[drawerId]?.show();
    });
  });

  // Unified drawer update listener
  drawerEvents.addEventListener("updateDrawer", (e) => {
    const { drawer, fields } = e.detail;
    if (!drawerState[drawer]) return;

    // Default to global currentQuote if quote is not explicitly passed
    const quote = fields.quote || window.currentQuote;

    switch(drawer) {
      case "quoteSummaryDrawer":
        if (quote) {
          Object.assign(drawerState.quoteSummaryDrawer, {
            name: quote.clientName,
            clientID: quote.clientID,
            tier: quote.tier,
            eventDate: quote.eventDate,
            eventLocation: quote.eventLocation,
            productCount: quote.products?.length ?? 0,
            productTotal: `$${quote.totalProductRetail?.toFixed(2) || 0}`,
            productList: quote.products?.map(p => ({
              name: p.productName,
              qty: p.qty,
              retail: p.retailPrice,
              total: (p.qty * p.retailPrice).toFixed(2)
            })) || []
          });
        }
        break;

      case "balanceDetailsDrawer":
        if (quote) {
          drawerState.balanceDetailsDrawer.items = quote.balanceItems || [];
        }
        break;

      case "runningTotalDrawer":
        if (quote) {
          const productsHtml = (quote.products?.length
            ? `
              <p><strong>Selected Products:</strong></p>
              ${quote.products.map(p => `
                <div class="product-row">
                  <span class="name">${p.productName}</span>
                  <span class="qty">${p.qty}</span> @
                  <span class="price">$${(p.retailPrice ?? 0).toFixed(2)}</span> =
                  <span class="total">$${((p.qty || 0) * (p.retailPrice ?? 0)).toFixed(2)}</span>
                </div>
              `).join("")}
              <div class="product-subtotal">
                <strong>Subtotal:</strong> $${(quote.totalProductRetail ?? 0).toFixed(2)}
              </div>
            `
            : "<div class='no-products'>No products selected</div>"
          );

          const totalsHtml = `
            <div class="receipt">
              <div class="receipt-header">
                <p>Generated: ${new Date().toLocaleDateString()}</p>
              </div>

              <div class="receipt-products">
                ${productsHtml}
              </div>

              <div class="receipt-subtotals">
                <div><span>Sales Tax (8.875%):</span><span>$${(quote.subTotal1 ?? 0).toFixed(2)}</span></div>
                <div><span>Discount (${quote.discount ?? 0}%):</span><span>$${(quote.subTotal3 ?? 0).toFixed(2)}</span></div>
                <div><span>After Discount:</span><span>$${(quote.discountedTotal ?? 0).toFixed(2)}</span></div>
              </div>

              <div class="receipt-addons">
                <div><span>Delivery:</span><span>$${(quote.deliveryFee ?? 0).toFixed(2)}</span></div>
                <div><span>Setup:</span><span>$${(quote.setupFee ?? 0).toFixed(2)}</span></div>
                <div><span>Other:</span><span>$${(quote.otherFee ?? 0).toFixed(2)}</span></div>
                <div><span>Add-ons Total:</span><span>$${(quote.addonsTotal ?? 0).toFixed(2)}</span></div>
              </div>

              <div class="receipt-total">
                <div><strong>Grand Total:</strong><span>$${(quote.grandTotal ?? 0).toFixed(2)}</span></div>
                <div><span>Deposit:</span><span>$${(quote.deposit ?? 0).toFixed(2)}</span></div>
                <div><strong>Balance Due:</strong><span>$${(quote.balanceDue ?? 0).toFixed(2)}</span></div>
              </div>

              <div class="receipt-footer">
                <p>Thank you for your business!</p>
              </div>
            </div>
          `;

          drawerState.runningTotalDrawer.html = totalsHtml;
        }
        break;

      default:
        Object.assign(drawerState[drawer], fields);
    }

    renderDrawer(drawer);
  });
}

// =========================================================
// 🧩 Drawer Update API
// =========================================================
export function notifyDrawer(drawerName, fields) {
  drawerEvents.dispatchEvent(new CustomEvent("updateDrawer", {
    detail: { drawer: drawerName, fields }
  }));
}
