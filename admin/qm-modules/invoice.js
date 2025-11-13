// ===============================
// invoice.js
// ===============================

// --- Fetch + render invoice into drawer ---
async function injectInvoiceIntoDrawer(currentQuote) {
  const invoiceBody = document.getElementById("invoiceBody");
  if (!invoiceBody) {
    console.error("❌ Missing #invoiceBody in DOM");
    return;
  }

  try {
    // 1️⃣ Fetch invoice.html template
    const res = await fetch("./qm-modules/invoice.html");
    if (!res.ok) throw new Error(`Failed to fetch invoice template: ${res.status}`);
    let html = await res.text();

    // 2️⃣ Replace placeholders {{key}} with data
    const data = {
      firstName: currentQuote.firstName || "",
      lastName: currentQuote.lastName || "",
      invoiceID: currentQuote.invoiceID || "",
      invoiceDate: currentQuote.invoiceDate || "",
      street: currentQuote.street || "",
      city: currentQuote.city || "",
      state: currentQuote.state || "",
      zip: currentQuote.zip || "",
      clientID: currentQuote.clientID || "",
      email: currentQuote.email || "",
      eventDate: currentQuote.eventDate || "",
      eventLocation: currentQuote.eventLocation || "",
      totalProductRetail: formatCurrency(currentQuote.totalProductRetail),
      subTotal1: formatCurrency(currentQuote.subTotal1),
      discount: currentQuote.discount || "0%",
      subTotal3: formatCurrency(currentQuote.subTotal3),
      grandTotal: formatCurrency(currentQuote.grandTotal),
      deposit: formatCurrency(currentQuote.deposit),
      balanceDue: formatCurrency(currentQuote.balanceDue)
    };

    html = html.replace(/{{(\w+)}}/g, (_, key) => data[key] ?? "");

    // 3️⃣ Inject filled HTML into drawer body
    invoiceBody.innerHTML = html;

    // 4️⃣ Fill in products dynamically
    const tbody = invoiceBody.querySelector("#invoice-products");
    if (!tbody) {
      console.warn("⚠️ No #invoice-products section found");
      return;
    }

    const parts = currentQuote.parts || [];
    if (!Array.isArray(parts) || parts.length === 0) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="6" style="text-align:center; color:#999; padding:10px;">No products listed</td>`;
      tbody.appendChild(row);
      return;
    }

    parts.forEach(p => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td colspan="3">${p.part || p.description || "Unnamed Item"}</td>
        <td class="text-center">${p.qty || 0}</td>
        <td class="text-right">${formatCurrency(p.unitPrice)}</td>
        <td class="text-right">${formatCurrency(p.total)}</td>
      `;
      tbody.appendChild(row);
    });

    console.log("✅ Invoice successfully rendered into drawer");
  } catch (err) {
    console.error("❌ Error rendering invoice:", err);
  }
}

// --- Export for drawer integration ---
window.injectInvoiceIntoDrawer = injectInvoiceIntoDrawer;
