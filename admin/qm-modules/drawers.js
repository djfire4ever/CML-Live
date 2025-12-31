// qm-modules/drawers.js

export const drawerEvents = new EventTarget();

const drawerState = {
  shoppingListDrawer: { items: [] },
  runningTotalDrawer: { html: "" },
  invoiceDrawer: { html: "" }
};

async function renderDrawer(drawerName) {
  const q = window.currentQuote;
  const containerMap = {
    quoteSummaryDrawer: "quoteSummaryDrawer",
    shoppingListDrawer: "shoppinglist-body",
    runningTotalDrawer: "runningTotalBody",
    invoiceDrawer: "invoiceBody"
  };

  const container = document.getElementById(containerMap[drawerName]);
  if (!container) return;

  switch (drawerName) {
    case "quoteSummaryDrawer": {
      const s = q ?? {};
      const mapping = {
        summaryClientName: s.clientName ?? drawerState.quoteSummaryDrawer?.name ?? "—",
        summaryClientID: s.clientID ? formatPhoneNumber(s.clientID) : "—",
        summaryTier: s.tier ?? "—",
        summaryMemberSince: s.memberSince ? formatDateForUser(s.memberSince) : "—",
        summaryEventDate: s.eventDate ? formatDateForUser(s.eventDate) : "—",
        summaryEventLocation: s.eventLocation ?? "—",
        summaryEventTheme: s.eventTheme ?? "—",
        summaryProductCount: `${s.products?.length ?? 0}`,
        summaryProductTotal: s.totalProductRetail != null ? `$${(s.totalProductRetail).toFixed(2)}` : "—",
        summaryDiscount: s.discount != null ? `${s.discount}%` : "—",
        summaryDiscountedTotal: s.discountedTotal != null ? `$${(s.discountedTotal).toFixed(2)}` : "—",
        summaryDeposit: s.deposit != null ? `$${(s.deposit).toFixed(2)}` : "—",
        summaryAmountPaid: s.amountPaid != null ? `$${(s.amountPaid).toFixed(2)}` : "—",
        summaryPaidToDate: (s.deposit ?? 0) + (s.amountPaid ?? 0),
        summaryGrandTotal: s.grandTotal != null ? `$${(s.grandTotal).toFixed(2)}` : "—"
      };
      Object.entries(mapping).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? "—";
      });
      break;
    }

    case "shoppingListDrawer": {
      const items = (q && q.materials) ? q.materials : drawerState.shoppingListDrawer.items || [];
      container.innerHTML = "";

      if (!items.length) {
        container.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No materials needed</td></tr>`;
        break;
      }

      items.forEach(mat => {
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
          <td class="text-center">${shortfall ? '<span class="text-danger fw-bold">Shortfall</span>' : '<span class="text-success">OK</span>'}</td>
          <td>${mat.supplier || "—"}</td>
          <td class="text-center">${reorder ? '<span class="text-warning fw-bold">⚠️</span>' : '<span class="text-muted">—</span>'}</td>
        `;
        container.appendChild(row);
      });
      break;
    }

    case "runningTotalDrawer": {
      if (!q) return;

      // Set generated date
      const generatedDateEl = document.getElementById("rt-generated-date");
      if (generatedDateEl) {
        generatedDateEl.textContent = `Generated: ${new Date().toLocaleDateString()}`;
      }

      // Populate products
      const productsEl = document.getElementById("rt-products");
      if (productsEl) {
        productsEl.innerHTML = ""; // clear old rows

        q.products?.forEach(p => {
          const row = document.createElement("div");
          row.className = "product-row";

          row.innerHTML = `
            <span class="name" title="${p.productName}">${p.productName}</span>
            <span class="qty">${p.qty}</span> @ 
            <span class="price">$${(p.retailPrice ?? 0).toFixed(2)}</span> = 
            <span class="total">$${((p.qty||0)*(p.retailPrice??0)).toFixed(2)}</span>
          `;

          productsEl.appendChild(row);
        });
      }

      // Populate subtotals
      const mappings = [
        ["rt-product-total", q.totalProductRetail],
        ["rt-tax", q.subTotal1],
        ["rt-discount-rate", q.discount ?? 0],
        ["rt-discount", q.subTotal3],
        ["rt-after-discount", q.discountedTotal],
        ["rt-delivery", q.deliveryFee],
        ["rt-setup", q.setupFee],
        ["rt-other", q.otherFee],
        ["rt-addons-total", q.addonsTotal],
        ["rt-grand-total", q.grandTotal],
        ["rt-deposit", q.deposit],
        ["rt-balance-due", q.balanceDue]
      ];

      mappings.forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (!el) return;

        // Special case for discount rate
        if (id === "rt-discount-rate") {
          el.textContent = ` ${value ?? 0}% `;
        } else {
          el.textContent = `$${(value ?? 0).toFixed(2)}`;
        }
      });

      break;
    }

    case "invoiceDrawer": {
      if (q && typeof generateInvoiceHTML === "function") {
        container.innerHTML = generateInvoiceHTML(q);
      } else {
        container.innerHTML = drawerState.invoiceDrawer.html || "<p>No invoice available</p>";
      }
      break;
    }
  }
}

export function initDrawers() {
  const drawerMap = {
    quoteSummaryDrawer: "openQuoteSummary",
    shoppingListDrawer: "openShoppingList",
    runningTotalDrawer: "openRunningTotal",
    invoiceDrawer: "openInvoicePreview"
  };

  const drawerInstances = {};
  Object.entries(drawerMap).forEach(([drawerId, btnId]) => {
    const el = document.getElementById(drawerId);
    if (el) drawerInstances[drawerId] = new bootstrap.Offcanvas(el);

    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener("click", async () => {
      Object.entries(drawerInstances).forEach(([otherId, instance]) => {
        if (otherId !== drawerId) instance.hide();
      });
      drawerInstances[drawerId]?.show();
      await renderDrawer(drawerId);
    });
  });

  drawerEvents.addEventListener("updateDrawer", () => {
    // placeholder for external code, does not auto-render
  });
}

