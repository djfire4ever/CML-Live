// qm-modules/drawers.js
export const drawerEvents = new EventTarget();

const drawerState = {
  quoteSummaryDrawer: { name: null, clientID: null, tier: null, eventDate: null, eventLocation: null, productCount: 0, productTotal: "$0.00", productList: [] },
  balanceDetailsDrawer: { items: [] },
  runningTotalDrawer: { html: "" },
  invoiceDrawer: { html: "" } // cached filled invoice
};

// -------------------- RENDER DRAWER --------------------
function renderDrawer(drawerName) {
  switch (drawerName) {
    case "quoteSummaryDrawer": {
      const s = drawerState.quoteSummaryDrawer;
      const mapping = {
        summaryClientName: s.name,
        summaryClientID: s.clientID ? formatPhoneNumber(s.clientID) : "—",
        summaryTier: s.tier,
        summaryEventDate: s.eventDate ? formatDateForUser(s.eventDate) : "—",
        summaryEventLocation: s.eventLocation,
        summaryProductCount: `${s.productCount ?? 0} items`,
        summaryProductTotal: s.productTotal
      };
      Object.entries(mapping).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "—";
      });
      const listEl = document.getElementById("summaryProductList");
      if (listEl) {
        listEl.innerHTML = s.productList?.length
          ? s.productList.map(p => `<li class="text-warning">${p.name} — ${p.qty} × $${p.retail.toFixed(2)} = $${p.total}</li>`).join("")
          : "<li>No products selected</li>";
      }
      break;
    }

    case "balanceDetailsDrawer": {
      const s = drawerState.balanceDetailsDrawer;
      const container = document.getElementById("balanceDetailsDrawer");
      if (container) {
        const body = container.querySelector(".offcanvas-body");
        if (body) {
          body.innerHTML = s.items?.length
            ? `<ul>${s.items.map(i => `<li>${i.desc}: ${i.amount}</li>`).join("")}</ul>`
            : "<p>No items yet</p>";
        }
      }
      break;
    }

    case "runningTotalDrawer": {
      const container = document.getElementById("runningTotalBody");
      if (container) container.innerHTML = drawerState.runningTotalDrawer.html || "<p>No totals available</p>";
      break;
    }

    case "invoiceDrawer": {
      const container = document.getElementById("invoiceDrawer");
      if (!container) break;

      // Use cached HTML if available
      if (drawerState.invoiceDrawer.html) {
        container.innerHTML = drawerState.invoiceDrawer.html;
        break;
      }

      fetch("qm-modules/invoice.html")
        .then(r => {
          if (!r.ok) throw new Error(`Failed to fetch invoice template: ${r.status}`);
          return r.text();
        })
        .then(template => {
          const q = window.currentQuote || {};

          // Map placeholders to currentQuote values
          const data = {
            firstName: q.firstName || "",
            lastName: q.lastName || "",
            invoiceID: q.invoiceID || "",
            invoiceDate: formatDateForUser(q.invoiceDate) || "",
            street: q.street || "",
            city: q.city || "",
            state: q.state || "",
            zip: q.zip || "",
            clientID: q.clientID || "",
            email: q.email || "",
            eventDate: formatDateForUser(q.eventDate) || "",
            eventLocation: q.eventLocation || "",
            totalProductRetail: `$${q.totalProductRetail?.toFixed(2) || 0}`,
            subTotal1: `$${q.subTotal1?.toFixed(2) || 0}`,
            subTotal2: `$${q.subTotal2?.toFixed(2) || 0}`,
            discount: q.discount || 0,
            subTotal3: `$${q.subTotal3?.toFixed(2) || 0}`,
            discountedTotal: `$${q.discountedTotal?.toFixed(2) || 0}`,
            addonsTotals: `$${q.addonsTotal?.toFixed(2) || 0}`,
            grandTotal: `$${q.grandTotal?.toFixed(2) || 0}`,
            deposit: `$${q.deposit?.toFixed(2) || 0}`,
            depositDate: formatDateForUser(q.depositDate) || "",
            balanceDue: `$${q.balanceDue?.toFixed(2) || 0}`,
            balanceDueDate: formatDateForUser(q.balanceDueDate) || "",
            paymentMethod: q.paymentMethod || ""
          };

          // Replace all placeholders {{key}} in template
          let filled = template.replace(/{{(\w+)}}/g, (_, key) => data[key] || "");

          // Parse filled template to DOM
          const parser = new DOMParser();
          const doc = parser.parseFromString(filled, "text/html");

          // Insert product rows dynamically
          const productsBody = doc.getElementById("invoice-products");
          if (productsBody && q.products?.length) {
            q.products.forEach(prod => {
              const row = doc.createElement("tr");
              row.innerHTML = `
                <td colspan="3">${prod.productName}</td>
                <td class="text-center">${prod.qty}</td>
                <td class="text-right">$${prod.retailPrice.toFixed(2)}</td>
                <td class="text-right">$${(prod.qty * prod.retailPrice).toFixed(2)}</td>
              `;
              productsBody.appendChild(row);
            });
          } else if (productsBody) {
            const row = doc.createElement("tr");
            row.innerHTML = `<td colspan="6" class="text-center">No products selected</td>`;
            productsBody.appendChild(row);
          }

          // Insert divider row above totals section
          const totalsSection = doc.getElementById("totals-section");
          if (totalsSection) {
            const divider = doc.createElement("tr");
            divider.innerHTML = `<td colspan="6" style="border-top:1px solid #999;">&nbsp;</td>`;
            totalsSection.prepend(divider);
          }

          // Cache and render
          drawerState.invoiceDrawer.html = doc.body.innerHTML;
          container.innerHTML = drawerState.invoiceDrawer.html;
        })
        .catch(err => {
          console.error(err);
          container.innerHTML = "<p>Failed to load invoice preview.</p>";
        });

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
    balanceDetailsDrawer: "openBalanceDetails",
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
      Object.entries(drawerInstances).forEach(([otherId, instance]) => { if (otherId !== drawerId) instance.hide(); });
      drawerInstances[drawerId]?.show();
    });
  });

  drawerEvents.addEventListener("updateDrawer", () => {
    const q = window.currentQuote;
    if (!q) return;

    // Quote Summary Drawer
    Object.assign(drawerState.quoteSummaryDrawer, {
      name: q.clientName,
      clientID: q.clientID,
      tier: q.tier,
      eventDate: q.eventDate,
      eventLocation: q.eventLocation,
      productCount: q.products?.length ?? 0,
      productTotal: `$${q.totalProductRetail?.toFixed(2) || 0}`,
      productList: q.products?.map(p => ({ name: p.productName, qty: p.qty, retail: p.retailPrice, total: (p.qty*p.retailPrice).toFixed(2) })) || []
    });

    // Balance Details Drawer
    drawerState.balanceDetailsDrawer.items = q.balanceItems || [];

    // Running Total Drawer
    drawerState.runningTotalDrawer.html = generateRunningTotalHTML(q);

    // --- Invoice Drawer ---
    // Invalidate cached HTML to force fresh render
    drawerState.invoiceDrawer.html = "";

    // Render all drawers
    ["quoteSummaryDrawer","balanceDetailsDrawer","runningTotalDrawer","invoiceDrawer"].forEach(renderDrawer);
  });
}

// -------------------- NOTIFY --------------------
export function notifyDrawer() {
  drawerEvents.dispatchEvent(new CustomEvent("updateDrawer"));
}

// -------------------- HELPER --------------------
function generateRunningTotalHTML(q) {
  const productsHtml = (q.products?.length
    ? q.products.map(p => `<div class="product-row"><span class="name">${p.productName}</span><span class="qty">${p.qty}</span> @ <span class="price">$${(p.retailPrice??0).toFixed(2)}</span> = <span class="total">$${((p.qty||0)*(p.retailPrice??0)).toFixed(2)}</span></div>`).join("")
    : "<div class='no-products'>No products selected</div>"
  );

  return `<div class="receipt">
    <div class="receipt-header"><p>Generated: ${new Date().toLocaleDateString()}</p></div>
    <div class="receipt-products">${productsHtml}</div>
    <div class="receipt-subtotals">
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
