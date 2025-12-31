// qm-modules/invoice.js

// -------------------- CONFIG --------------------
const SKIP_INVOICE_FETCH = true;   // toggle to true for mock mode
let _cachedNextInvoiceID = null;   // inline cache

// -------------------- FETCH NEXT INVOICE ID --------------------
async function fetchNextInvoiceID(scriptURL) {
  try {
    if (_cachedNextInvoiceID) return _cachedNextInvoiceID;

    if (SKIP_INVOICE_FETCH) {
      // console.warn("⚠️ SKIP_INVOICE_FETCH is ON — using mock invoice ID");
      _cachedNextInvoiceID = 123;
      return _cachedNextInvoiceID;
    }

    const res = await fetch(`${scriptURL}?action=getNextInvoiceID`);
    const json = await res.json();

    if (typeof json?.data !== "number") {
      throw new Error("Invalid response: missing 'data' property for next invoice ID");
    }

    _cachedNextInvoiceID = json.data;
    return _cachedNextInvoiceID;
  } catch (err) {
    console.error("❌ Failed to fetch next invoice ID:", err);
    return "N/A";
  }
}

// -------------------- INJECT INVOICE --------------------
export async function injectInvoiceIntoDrawer(currentQuote, scriptURL) {
  const invoiceBody = document.getElementById("invoiceBody");
  if (!invoiceBody) {
    console.error("❌ Missing #invoiceBody in DOM");
    return;
  }

  toggleLoader(true, { message: "Loading invoice..." });

  try {
    // Ensure invoice ID exists (but do not format here)
    if (!currentQuote.invoiceID) {
      currentQuote.invoiceID = await fetchNextInvoiceID(scriptURL);
    }

    // Fetch invoice template
    const res = await fetch("./qm-modules/invoice.html");
    if (!res.ok) {
      throw new Error(`Failed to fetch template: ${res.status}`);
    }

    let html = await res.text();

    // Clone quote for presentation-only formatting
    const data = { ...currentQuote };

    // Fields that should render as currency
    const currencyFields = [
      "totalProductRetail",
      "subTotal1",
      "subTotal2",
      "subTotal3",
      "discountedTotal",
      "addonsTotal",
      "grandTotal",
      "deposit",
      "balanceDue"
    ];

    // Fields that should render as dates
    const dateFields = [
      "invoiceDate",
      "eventDate",
      "depositDate",
      "balanceDueDate",
      "memberSince",
      "birthday"
    ];

    // Apply global formatters
    currencyFields.forEach(key => {
      if (key in data) {
        data[key] = window.formatCurrency(data[key]);
      }
    });

    dateFields.forEach(key => {
      if (key in data) {
        data[key] = window.formatDateForUser(data[key]);
      }
    });

    // Replace template tokens
    html = html.replace(/{{(\w+)}}/g, (_, key) => data[key] ?? "");
    invoiceBody.innerHTML = html;

    // Inject products dynamically
    const tbody = invoiceBody.querySelector("#invoice-products");
    if (tbody) {
      tbody.innerHTML = "";

      currentQuote.products?.forEach(prod => {
        const qty = prod.qty || 0;
        const price = prod.retailPrice || 0;

        const row = document.createElement("tr");
        row.innerHTML = `
          <td colspan="3">${prod.productName || "Unnamed Product"}</td>
          <td class="text-center">${qty}</td>
          <td class="text-right" style="white-space:nowrap">
            ${window.formatCurrency(price)}
          </td>
          <td class="text-right" style="white-space:nowrap">
            ${window.formatCurrency(price * qty)}
          </td>
        `;
        tbody.appendChild(row);
      });
    }

  } catch (err) {
    console.error("❌ Error rendering invoice:", err);
    invoiceBody.innerHTML = "<p>Failed to load invoice.</p>";
    showToast("⚠️ Failed to load invoice. Please try again.", "error");
  } finally {
    toggleLoader(false);
  }
}

// -------------------- SETUP INVOICE BUTTON --------------------
export function setupInvoiceButton(buttonEl, currentQuote, scriptURL) {
  if (!buttonEl) return;

  buttonEl.addEventListener("click", async () => {
    const quote = currentQuote || window.currentQuote || {};
    if (!quote.invoiceDate) {
      quote.invoiceDate = window.formatDateForUser(new Date());
    }

    try {
      await injectInvoiceIntoDrawer(quote, scriptURL);
    } catch (err) {
      console.error("❌ Error injecting invoice:", err);
      const container = document.getElementById("invoiceDrawer");
      if (container) container.innerHTML = "<p>Invoice preview unavailable.</p>";
    }
  });
}

// Replace existing print handler with this robust version
document.getElementById("printInvoiceBtn").addEventListener("click", () => {
  const invoiceHTML = document.querySelector(".invoice-scope")?.outerHTML;
  if (!invoiceHTML) return console.error("Invoice HTML not found");

  // open a popup (treated as a real popup so close() is allowed)
  const win = window.open(
    "",
    "PRINT",
    "width=900,height=1100,toolbar=no,scrollbars=no,resizable=no,menubar=no,location=no,status=no"
  );

  if (!win) {
    return console.error("Popup blocked");
  }

  // Write a minimal document and inject the invoice HTML + print styles
  win.document.open();
  win.document.write(`
    <html>
      <head>
        <title>Invoice</title>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          @page { margin: 0; }
          html,body { margin:0; padding:0; background:#fff; }
          /* paste/keep the invoice CSS you need here (keeps border, margins, fonts) */
          .invoice-scope { font-family: Arial, sans-serif; font-size:10pt; color:#111; }
          .invoice-scope .invoice-page {
            position:absolute; top:0; left:0; margin:0.25in; padding:.1in;
            width:7.5in; height:10in; border:14px solid green; background:#fff;
            transform:none !important;
          }
          /* any additional invoice-specific rules... */
        </style>
      </head>
      <body>
        ${invoiceHTML}
      </body>
    </html>
  `);
  win.document.close();

  // printedFlag used by opener focus fallback
  let printTriggered = false;
  let fallbackTimer = null;
  let openerFocusHandler = null;
  let mm = null;

  // Close helper (cleans up listeners)
  const cleanupAndClose = () => {
    try { if (mm && typeof mm.removeListener === 'function') mm.removeListener(mm._handler); } catch(e){}
    try { if (mm && typeof mm.removeEventListener === 'function') mm.removeEventListener('change', mm._handler); } catch(e){}
    try { if (openerFocusHandler) window.removeEventListener('focus', openerFocusHandler); } catch(e){}
    try { clearTimeout(fallbackTimer); } catch(e){}
    try { if (!win.closed) win.close(); } catch(e){}
  };

  // Best-case: popup's onafterprint
  try {
    win.onafterprint = () => {
      cleanupAndClose();
    };
  } catch(e){
    // ignore
  }

  // matchMedia fallback (in popup context) - some browsers support it
  try {
    mm = win.matchMedia('print');
    const mmHandler = (m) => {
      // when leaving print mode (matches === false) we assume done
      if (!m.matches) cleanupAndClose();
    };
    mm._handler = mmHandler;
    if (typeof mm.addListener === 'function') mm.addListener(mmHandler);
    else if (typeof mm.addEventListener === 'function') mm.addEventListener('change', mmHandler);
  } catch(e){
    // ignore
  }

  // Opener focus fallback: user returns to main window after printing
  openerFocusHandler = () => {
    // If we triggered print and popup still open, close it.
    if (printTriggered && win && !win.closed) {
      cleanupAndClose();
    }
  };
  window.addEventListener('focus', openerFocusHandler);

  // Timeout fallback (safety)
  fallbackTimer = setTimeout(() => {
    cleanupAndClose();
  }, 15000); // 15s - tune if needed

  // Ensure popup is ready, then trigger print
  const tryPrint = () => {
    try {
      printTriggered = true;
      win.focus();
      // call print; browsers show dialog
      win.print();
      // note: onafterprint may not fire reliably — our other fallbacks will handle it
    } catch (err) {
      // If print throws, close popup after short delay
      console.warn("Print failed:", err);
      setTimeout(cleanupAndClose, 500);
    }
  };

  // wait for popup to finish loading
  if (win.document.readyState === 'complete') {
    tryPrint();
  } else {
    win.onload = tryPrint;
    // safety: if onload never fires, still try after 400ms
    setTimeout(() => { if (!printTriggered) tryPrint(); }, 400);
  }
});
