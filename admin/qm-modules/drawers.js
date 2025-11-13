// qm-modules/drawers.js
import { injectInvoiceIntoDrawer } from './invoice.js';

export const drawerEvents = new EventTarget();

const drawerState = {
  quoteSummaryDrawer: {
    name: null,
    clientID: null,
    tier: null,
    memberSince: null,
    eventDate: null,
    eventLocation: null,
    eventTheme: null,
    productCount: 0,
    productTotal: "$0.00",
    discount: null,
    discountedTotal: null,
    deposit: null,
    amountPaid: null,
    grandTotal: null
  },
  shoppingListDrawer: { items: [] },
  runningTotalDrawer: { html: "" },
  invoiceDrawer: { html: "" } // cached filled invoice
};

// -------------------- RENDER DRAWER --------------------
async function renderDrawer(drawerName) {
  switch (drawerName) {

    case "invoiceDrawer": {
      const container = document.getElementById("invoiceDrawer");
      if (!container) return;

      const currentQuote = window.currentQuote || {};
      try {
        await injectInvoiceIntoDrawer(currentQuote);
      } catch (err) {
        console.error("❌ Error injecting invoice:", err);
        container.innerHTML = "<p>Invoice preview unavailable.</p>";
      }
      break;
    }

    case "quoteSummaryDrawer": {
      const s = drawerState.quoteSummaryDrawer;
      const mapping = {
        summaryClientName: s.name,
        summaryClientID: s.clientID ? formatPhoneNumber(s.clientID) : "—",
        summaryTier: s.tier,
        summaryMemberSince: s.memberSince ? formatDateForUser(s.memberSince) : "—",
        summaryEventDate: s.eventDate ? formatDateForUser(s.eventDate) : "—",
        summaryEventLocation: s.eventLocation,
        summaryEventTheme: s.eventTheme,
        summaryProductCount: `${s.productCount ?? 0}`,
        summaryProductTotal: s.productTotal,
        summaryDiscount: s.discount ?? "—",
        summaryDiscountedTotal: s.discountedTotal ?? "—",
        summaryDeposit: s.deposit ?? "—",
        summaryAmountPaid: s.amountPaid ?? "—",
        summaryPaidToDate: s.summaryPaidToDate ?? "—",
        summaryGrandTotal: s.grandTotal ?? "—"
      };
      Object.entries(mapping).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "—";
      });
      break;
    }

    case "shoppingListDrawer": {
      const s = drawerState.shoppingListDrawer;
      const container = document.getElementById("shoppinglist-body");
      if (!container) break;
      container.innerHTML = "";

      if (!s.items?.length) {
        container.innerHTML = `
          <tr>
            <td colspan="6" class="text-center text-muted py-3">
              No materials needed
            </td>
          </tr>`;
        break;
      }

      s.items.forEach(mat => {
        const row = document.createElement("tr");

        const needed = Number(mat.totalNeeded) || 0;
        const onHand = Number(mat.onHand) || 0;
        const incoming = Number(mat.incoming) || 0;
        const outgoing = Number(mat.outgoing) || 0;
        const netAvailable = onHand + incoming - outgoing;

        const shortfall = needed > netAvailable;
        const reorder = netAvailable < (Number(mat.reorderLevel) || 0);

        row.innerHTML = `
          <td>${mat.matName || "—"}</td>
          <td class="text-center">${needed}</td>
          <td class="text-center">${onHand}</td>
          <td class="text-center">
            ${shortfall 
                ? '<span class="text-danger fw-bold">Shortfall</span>' 
                : '<span class="text-success">OK</span>'}
          </td>
          <td>${mat.supplier || "—"}</td>
          <td class="text-center">
            ${reorder 
                ? '<span class="text-warning fw-bold">⚠️</span>' 
                : '<span class="text-muted">—</span>'}
          </td>
        `;
        container.appendChild(row);
      });
      break;
    }

    case "runningTotalDrawer": {
      const container = document.getElementById("runningTotalBody");
      if (container) container.innerHTML = drawerState.runningTotalDrawer.html || "<p>No totals available</p>";
      break;
    }

    default:
      console.warn("Unknown drawer:", drawerName);
  }
}

// -------------------- INIT DRAWERS --------------------
export function initDrawers() {
  const drawerMap = {
    quoteSummaryDrawer: "openQuoteSummary",
    shoppingListDrawer: "openShoppingList",
    runningTotalDrawer: "openRunningTotal",
    invoiceDrawer: "openInvoicePreview"
  };

  const drawerInstances = {};
  Object.keys(drawerMap).forEach(drawerId => {
    const el = document.getElementById(drawerId);
    if (!el) return;
    drawerInstances[drawerId] = new bootstrap.Offcanvas(el);
  });

  Object.entries(drawerMap).forEach(([drawerId, btnId]) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener("click", () => {
      Object.entries(drawerInstances).forEach(([otherId, instance]) => {
        if (otherId !== drawerId) instance.hide();
      });
      drawerInstances[drawerId]?.show();
    });
  });

  drawerEvents.addEventListener("updateDrawer", async () => {
    const q = window.currentQuote;
    if (!q) return;

    // Quote Summary Drawer
    Object.assign(drawerState.quoteSummaryDrawer, {
      name: q.clientName,
      clientID: q.clientID,
      tier: q.tier,
      memberSince: q.memberSince,
      eventDate: q.eventDate,
      eventLocation: q.eventLocation,
      eventTheme: q.eventTheme,
      productCount: q.products?.length ?? 0,
      productTotal: `$${(q.totalProductRetail ?? 0).toFixed(2)}`,
      discount: q.discount != null ? `${q.discount}%` : "—",
      discountedTotal: `$${(q.discountedTotal ?? 0).toFixed(2)}`,
      deposit: `$${(q.deposit ?? 0).toFixed(2)}`,
      amountPaid: `$${(q.amountPaid ?? 0).toFixed(2)}`,
      grandTotal: `$${(q.grandTotal ?? 0).toFixed(2)}`,
      summaryPaidToDate: `$${((q.deposit ?? 0) + (q.amountPaid ?? 0)).toFixed(2)}`
    });

    // Running Total Drawer
    drawerState.runningTotalDrawer.html = generateRunningTotalHTML(q);

    // Clear cached invoice HTML
    drawerState.invoiceDrawer.html = "";

    // Render all drawers
    for (const d of ["quoteSummaryDrawer", "shoppingListDrawer", "runningTotalDrawer", "invoiceDrawer"]) {
      await renderDrawer(d);
    }
  });
}

// -------------------- NOTIFY --------------------
export function notifyDrawer() {
  drawerEvents.dispatchEvent(new CustomEvent("updateDrawer"));
}

// -------------------- HELPER --------------------
function generateRunningTotalHTML(q) {
  const productsHtml = (q.products?.length
    ? q.products.map(p => `
      <div class="product-row">
        <span class="name" title="${p.productName}">${p.productName}</span>
        <span class="qty">${p.qty}</span> @ 
        <span class="price">$${(p.retailPrice ?? 0).toFixed(2)}</span> = 
        <span class="total">$${((p.qty||0)*(p.retailPrice??0)).toFixed(2)}</span>
      </div>`).join("")
    : "<div class='no-products'>No products selected</div>"
  );

  return `<div class="receipt">
    <div class="receipt-header"><p>Generated: ${new Date().toLocaleDateString()}</p></div>

    <div class="receipt-products">${productsHtml}</div>

    <div class="receipt-subtotals">
      <div><span>Total Product Retail:</span><span>$${(q.totalProductRetail??0).toFixed(2)}</span></div>
      <div><span>Sales Tax (8.875%):</span><span>$${(q.subTotal1??0).toFixed(2)}</span></div>
      <div><span>Discount (${q.discount??0}%):</span><span>$${(q.subTotal3??0).toFixed(2)}</span></div>
      <div><span>After Discount:</span><span>$${(q.discountedTotal??0).toFixed(2)}</span></div>
    </div>

    <div class="receipt-addons">
      <div><span>Delivery:</span><span>$${(q.deliveryFee??0).toFixed(2)}</span></div>
      <div><span>Setup:</span><span>$${(q.setupFee??0).toFixed(2)}</span></div>
      <div><span>Other:</span><span>$${(q.otherFee??0).toFixed(2)}</span></div>
      <div><span>Add-ons Total:</span><span>$${(q.addonsTotal??0).toFixed(2)}</span></div>
    </div>

    <div class="receipt-total">
      <div><strong>Grand Total:</strong><span>$${(q.grandTotal??0).toFixed(2)}</span></div>
      <div><span>Deposit:</span><span>$${(q.deposit??0).toFixed(2)}</span></div>
      <div><strong>Balance Due:</strong><span>$${(q.balanceDue??0).toFixed(2)}</span></div>
    </div>

    <div class="receipt-footer"><p>Thank you for your business!</p></div>
  </div>`;
}
