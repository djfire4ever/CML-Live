// ✅ Global invoice storage
let invoicedata = [];

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const searchResultsBox = document.getElementById("searchResults");

  // ✅ Attach input listener
  if (searchInput) {
    searchInput.addEventListener("input", search);
  } else {
    console.error("❌ Search input not found!");
  }

  // ✅ Handle tab-switch to Search Tab
  const searchTabButton = document.querySelector('button[data-bs-target="#tab-search"]');
  if (searchTabButton) {
    searchTabButton.addEventListener("shown.bs.tab", () => {
      if (searchInput) {
        searchInput.value = "";
        searchInput.focus();
      }
      if (searchResultsBox) searchResultsBox.innerHTML = "";

      const searchCounter = document.getElementById("searchCounter");
      if (searchCounter) {
        searchCounter.textContent = "";
        searchCounter.classList.add("text-success", "text-dark", "fw-bold");
      }
    });
  } else {
    console.error("❌ Search tab not found!");
  }

  // ✅ Clear previous results and load fresh data
  if (searchResultsBox) searchResultsBox.innerHTML = "";
  toggleLoader();
  setDataForSearch();
  setTimeout(toggleLoader, 500);
});

// ✅ Load invoice data for search
function setDataForSearch() {
  fetch(scriptURL + "?action=getInvDataForSearch")
    .then(res => res.json())
    .then(data => {
      invoicedata = Array.isArray(data) ? data : [];
    })
    .catch(err => console.error("❌ Error loading invoice data:", err));
}

// ✅ Perform search
function search() {
  const inputEl = document.getElementById("searchInput");
  const box = document.getElementById("searchResults");

  if (!inputEl || !box) return;

  let counterContainer = document.getElementById("counterContainer");
  if (!counterContainer) {
    counterContainer = document.createElement("div");
    counterContainer.id = "counterContainer";
    counterContainer.className = "d-inline-flex gap-3 align-items-center ms-3";
    inputEl.parentNode.insertBefore(counterContainer, inputEl.nextSibling);
  }

  let searchCounter = document.getElementById("searchCounter");
  if (!searchCounter) {
    searchCounter = document.createElement("span");
    searchCounter.id = "searchCounter";
    searchCounter.className = "px-2 py-1 border rounded fw-bold bg-dark text-info";
    counterContainer.appendChild(searchCounter);
  }

  let totalCounter = document.getElementById("totalCounter");
  if (!totalCounter) {
    totalCounter = document.createElement("span");
    totalCounter.id = "totalCounter";
    totalCounter.className = "px-2 py-1 border rounded fw-bold bg-dark text-info";
    searchCounter.insertAdjacentElement("afterend", totalCounter);
  }

  toggleLoader();

  const terms = inputEl.value.toLowerCase().trim().split(/\s+/);
  const filtered = terms[0] === ""
    ? []
    : invoicedata.filter(row =>
      terms.every(word =>
        // Search in columns: logID(0), invoiceID(1), qtID(2), firstName(3), lastName(4)
        [0, 1, 2, 3, 4].some(i => row[i]?.toString().toLowerCase().includes(word))
      )
    );

  searchCounter.textContent = terms[0] === "" ? "🔍" : `${filtered.length} Invoices Found`;
  totalCounter.textContent = `Total Invoices: ${invoicedata.length}`;
  box.innerHTML = "";

  const template = document.getElementById("rowTemplate").content;
  filtered.forEach(r => {
    const row = template.cloneNode(true);
    const tr = row.querySelector("tr");

    tr.querySelector(".invoiceID").textContent = r[1];
    tr.querySelector(".invoiceDate").textContent = r[7];
    tr.querySelector(".firstName").textContent = r[3];
    tr.querySelector(".lastName").textContent = r[4];
    tr.querySelector(".grandTotal").textContent = r[9];
    // Use logID as unique dataset key for row identification
    tr.dataset.logid = r[0];

    box.appendChild(row);
  });

  toggleLoader();
}

// ✅ Handle clicks on any row (delegated handler)
document.getElementById("searchResults").addEventListener("click", async function (event) {
  const tr = event.target.closest("tr");
  if (!tr || !tr.dataset.logid) return; // Use logid here

  const logID = tr.dataset.logid;
  toggleLoader(true);

  try {
    await populateViewForm(logID); // Pass logID to load full details
    const viewTab = document.querySelector('[data-bs-target="#tab-view"]');
    if (viewTab) new bootstrap.Tab(viewTab).show();
  } catch (err) {
    console.error("❌ Failed to load invoice:", err);
  } finally {
    toggleLoader(false);
  }
});

// ✅ Fetch and populate form using logID (unique key)
async function populateViewForm(logID) {
  if (!logID) {
    console.error("❌ Missing logID parameter");
    return;
  }

  const invoiceIDField = document.getElementById("invoiceID");
  if (!invoiceIDField) {
    console.error("❌ invoiceID input field not found");
    return;
  }

  invoiceIDField.removeAttribute("readonly");
  toggleLoader(true);

  try {
    const response = await fetch(`${scriptURL}?action=getInvoiceById&logID=${encodeURIComponent(logID)}`);
    const text = await response.text();

    let invoiceInfo;
    try {
      invoiceInfo = JSON.parse(text);
    } catch (err) {
      throw new Error(`Failed to parse JSON: ${err.message}\nResponse text: ${text}`);
    }

    if (!invoiceInfo || typeof invoiceInfo !== "object") {
      throw new Error("Invalid or missing invoice data");
    }

    if (invoiceInfo.error) {
      throw new Error(invoiceInfo.error);
    }

    // ✅ Store globally
    window.currentInvoiceData = invoiceInfo;

    // ✅ Map all invoice fields to matching form fields (must exist in DOM)
    const fieldMap = [
      "logID",
      "invoiceID",
      "qtID",
      "firstName",
      "lastName",
      "email",
      "invoiceDate",
      "dueDate",
      "grandTotal",
      "amountPaid",
      "balanceDue",
      "status",
      "paymentHistory",
      "sendDate",
      "sendMethod",
      "invoiceLogNotes"
    ];

    fieldMap.forEach(key => {
      const el = document.getElementById(key);
      if (el) el.value = invoiceInfo[key] || "";
    });

    // === Simple overdue and paid-in-full alert logic ===
    const overdueEl = document.getElementById("overdueAlert");
    const paidInFullEl = document.getElementById("paidInFullAlert");
    if (overdueEl && paidInFullEl) {
      const dueDate = new Date(invoiceInfo.dueDate);
      const balance = parseFloat(invoiceInfo.balanceDue) || 0;
      const today = new Date();

      if (balance > 0 && dueDate < today) {
        overdueEl.style.display = "block";
        paidInFullEl.style.display = "none";
      } else if (balance === 0) {
        overdueEl.style.display = "none";
        paidInFullEl.style.display = "block";
      } else {
        overdueEl.style.display = "none";
        paidInFullEl.style.display = "none";
      }
    }

    // ✅ Setup View PDF button using invoiceUrl
    const viewBtn = document.getElementById("view-Button");
    if (viewBtn) {
      if (invoiceInfo.invoiceUrl) {
        viewBtn.disabled = false;
        viewBtn.dataset.pdfLink = invoiceInfo.invoiceUrl;
        viewBtn.removeEventListener("click", openPDFfromInput);
        viewBtn.addEventListener("click", openPDFfromInput);
      } else {
        viewBtn.disabled = true;
        delete viewBtn.dataset.pdfLink;
      }
    }

    // ✅ Setup Send Email button
    const sendBtn = document.getElementById("send-Button");
    if (sendBtn) {
      sendBtn.removeEventListener("click", openEmailModal);
      sendBtn.addEventListener("click", openEmailModal);
    }

    // ✅ Optional: Jump to QuoteManager using qtID
    const openQuoteBtn = document.getElementById("openQuoteBtn");
    if (openQuoteBtn && invoiceInfo.qtID) {
      openQuoteBtn.disabled = false;
      openQuoteBtn.onclick = () => {
        const iframe = window.parent.document.querySelector("iframe");
        if (iframe) {
          iframe.src = `quotemanager.html?qtID=${encodeURIComponent(invoiceInfo.qtID)}`;
        } else {
          console.warn("❌ Could not find iframe in admin.html");
        }
      };
    }

  } catch (error) {
    console.error("❌ Error fetching invoice data:", error);
    showToast("❌ Failed to load invoice data.", "error");
  } finally {
    toggleLoader(false);
  }
}
   
// Open the log payment modal with the invoice ID preloaded
function openLogPaymentModal(invoiceID) {
  document.getElementById("log-payment-invoiceID").value = invoiceID;
  document.getElementById("log-payment-amount").value = "";
  document.getElementById("log-payment-method").value = "";
  const modal = new bootstrap.Modal(document.getElementById("logPaymentModal"));
  modal.show();
}

// Handle form submission
document.getElementById("submitLogPaymentBtn").addEventListener("click", async () => {
  const invoiceID = document.getElementById("log-payment-invoiceID").value;
  const amount = parseFloat(document.getElementById("log-payment-amount").value);
  const method = document.getElementById("log-payment-method").value;

  // Validation: check for empty and valid number
  if (!invoiceID || isNaN(amount) || !method) {
    showToast("⚠️ Please complete all fields before submitting.", "warning");
    return;
  }

  try {
    toggleLoader(true);

    const response = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "quotes",
        action: "logPayment",
        invoiceID,
        amount,
        method
      })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ Payment logged successfully!");
      bootstrap.Modal.getInstance(document.getElementById("logPaymentModal")).hide();

      // Optional: refresh totals or reload quote — good idea to add if needed
      // e.g., await refreshInvoiceTotals(invoiceID);
    } else {
      throw new Error(result.message || "Unknown error");
    }
  } catch (error) {
    console.error("❌ Error logging payment:", error);
    showToast("❌ Failed to log payment", "error");
  } finally {
    toggleLoader(false);
  }
});
