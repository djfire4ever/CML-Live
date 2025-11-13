// invoice.js
export async function injectInvoiceIntoDrawer(currentQuote) {
  const invoiceBody = document.getElementById("invoiceBody");
  if (!invoiceBody) return console.error("❌ Missing #invoiceBody in DOM");

  try {
    // 1️⃣ Fetch invoice template
    const res = await fetch("./qm-modules/invoice.html");
    if (!res.ok) throw new Error(`Failed to fetch template: ${res.status}`);
    let html = await res.text();

    // 2️⃣ Replace placeholders with data
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
      balanceDue: formatCurrency(currentQuote.balanceDue),
      addonsTotals: formatCurrency(currentQuote.addonsTotals),
      discountedTotal: formatCurrency(currentQuote.discountedTotal),
      balanceDueDate: currentQuote.balanceDueDate || "",
      depositDate: currentQuote.depositDate || "",
      paymentMethod: currentQuote.paymentMethod || ""
    };

    html = html.replace(/{{(\w+)}}/g, (_, key) => data[key] ?? "");

    // 3️⃣ Inject filled HTML into drawer
    invoiceBody.innerHTML = html;

    // 4️⃣ Inject products dynamically with proper alignment
    const tbody = invoiceBody.querySelector("#invoice-products");
    if (!tbody) return;

    (currentQuote.parts || []).forEach(p => {
      const row = document.createElement("tr");

      const descTd = document.createElement("td");
      descTd.setAttribute("colspan", "3");
      descTd.textContent = p.part || p.description || "Unnamed Item";

      const qtyTd = document.createElement("td");
      qtyTd.className = "text-center";
      qtyTd.textContent = p.qty || 0;

      const unitTd = document.createElement("td");
      unitTd.className = "text-right";
      unitTd.style.textAlign = "right";
      unitTd.style.whiteSpace = "nowrap";
      unitTd.textContent = formatCurrency(p.unitPrice);

      const totalTd = document.createElement("td");
      totalTd.className = "text-right";
      totalTd.style.textAlign = "right";
      totalTd.style.whiteSpace = "nowrap";
      totalTd.textContent = formatCurrency(p.total);

      row.append(descTd, qtyTd, unitTd, totalTd);
      tbody.appendChild(row);
    });

    console.log("✅ Invoice successfully rendered into drawer");
  } catch (err) {
    console.error("❌ Error rendering invoice:", err);
    invoiceBody.innerHTML = "<p>Failed to load invoice.</p>";
  }
}
