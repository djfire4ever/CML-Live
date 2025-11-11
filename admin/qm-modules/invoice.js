// qm-modules/invoice.js

// Helper: format currency using global function if available
const fmt = formatCurrency;

// =========================================================
// Generate HTML for the invoice drawer
// =========================================================
export function generateInvoiceHTML(quote) {
    // Generate up to 15 product rows
    const productRows = [];
    for (let i = 1; i <= 15; i++) {
        const part = quote[`part${i}`];
        if (!part) continue;
        const qty = quote[`qty${i}`] ?? 0;
        const unitPrice = quote[`unitPrice${i}`] ?? 0;
        const total = quote[`totalRowRetail${i}`] ?? 0;

        productRows.push(`
            <tr>
                <td>${part}</td>
                <td></td>
                <td></td>
                <td>${qty}</td>
                <td>${fmt(unitPrice)}</td>
                <td>${fmt(total)}</td>
                <td></td>
                <td></td>
            </tr>
        `);
    }

    return `
        <style>
            table td, table th {
                font-size: smaller;
                border: 1px solid black;
                line-height: 1.4;
                padding: 10px 10px;
            }
        </style>
        <table>
            <tbody>
                <tr><th></th><th>CraftyMama Labs</th><th></th><th></th><th></th><th></th><th></th><th></th></tr>
                <tr><td></td><td>CUSTOM EVENT DECOR CREATOR</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td></td><td>(332) 202-8819</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td></td><td>tiffany@craftymamaalabs.com</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td></td><td>Invoice</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                
                <tr><td></td><td>Bill To:</td><td></td><td>Invoice #</td><td></td><td>Invoice date</td><td></td><td></td></tr>
                <tr><td></td><td>${quote.firstName ?? ""}</td><td>${quote.lastName ?? ""}</td><td>${quote.invoiceID ?? ""}</td><td></td><td>${quote.invoiceDate ?? ""}</td><td></td><td></td></tr>
                <tr><td></td><td>${quote.street ?? ""}</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
                <tr><td></td><td>${quote.city ?? ""}</td><td>${quote.state ?? ""}</td><td>${quote.zip ?? ""}</td><td></td><td></td><td></td><td></td></tr>
                <tr><td></td><td>${quote.phone ?? ""}</td><td></td><td>Event Date</td><td></td><td>Event Location</td><td></td><td></td></tr>
                <tr><td></td><td>${quote.email ?? ""}</td><td></td><td>${quote.eventDate ?? ""}</td><td></td><td>${quote.eventLocation ?? ""}</td><td></td><td></td></tr>

                <tr><td></td><td>Description</td><td></td><td></td><td>Qty</td><td>Unit Price</td><td>Total Price</td><td></td></tr>
                ${productRows.join("")}

                <tr><td></td><td> </td><td>0</td><td></td><td></td><td>Subtotal</td><td>${fmt(quote.totalProductRetail)}</td><td></td></tr>
                <tr><td></td><td>Tax</td><td>8.875%</td><td></td><td></td><td>${fmt(quote.subTotal1)}</td><td>${fmt(quote.subTotal2)}</td><td></td></tr>
                <tr><td></td><td>Discount</td><td></td><td></td><td>${quote.discount ?? 0}</td><td>${fmt(quote.subTotal3)}</td><td>${fmt(quote.discountedTotal)}</td><td></td></tr>
                <tr><td></td><td>Add-Ons</td><td></td><td></td><td></td><td>${fmt(quote.addonsTotal)}</td><td>${fmt(quote.grandTotal)}</td><td></td></tr>
                <tr><td></td><td>Deposit*</td><td></td><td>${fmt(quote.deposit)}</td><td>Paid on</td><td>${quote.depositDate ?? ""}</td><td></td><td></td></tr>
                <tr><td></td><td>Balance of</td><td></td><td>${fmt(quote.balanceDue)}</td><td>Due By</td><td>${quote.balanceDueDate ?? ""}</td><td>${quote.paymentMethod ?? ""}</td><td></td></tr>
                <tr><td></td><td>"Terms: As per agreed Terms and Conditions"</td></tr>
                <tr><td>*Payment is due within 30 days of the invoice date. Late payments may be subject to a 5% late fee.</td></tr>
                <tr><td>*Deposits are due up receipt of this invoice and are non-refundable.</td></tr>
                <tr><td>*Deposit does not include Add-Ons. Add-Ons are due upon final payment."</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
            </tbody>
        </table>
    `;
}

// =========================================================
// Initialize Invoice Drawer
// =========================================================
export function initInvoice(currentQuote) {
    const invoiceBtn = document.getElementById("openInvoicePreview");
    if (!invoiceBtn) return;

    invoiceBtn.addEventListener("click", () => {
        const invoiceBody = document.getElementById("invoiceBody");
        invoiceBody.innerHTML = generateInvoiceHTML(currentQuote);

        const invoiceDrawer = new bootstrap.Offcanvas(document.getElementById("invoiceDrawer"));
        invoiceDrawer.show();
    });
}
