// ✅ Utility: Show Edit Tab
function showEditTab() {
    const editTab = document.querySelector('[data-bs-target="#edit-quote"]');
    if (editTab) new bootstrap.Tab(editTab).show();
}

// ✅ Utility: Create or get counter elements
function getOrCreateCounter(id, classList, parent, insertAfter = null) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement("span");
        el.id = id;
        el.classList.add(...classList);
        if (insertAfter) {
            insertAfter.insertAdjacentElement("afterend", el);
        } else {
            parent.appendChild(el);
        }
    }
    return el;
}

// ✅ DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const searchTabButton = document.querySelector('button[data-bs-target="#search-quote"]');
    const searchResultsBox = document.getElementById("searchResults");
    const searchCounter = document.getElementById("searchCounter");

    if (searchInput) {
        searchInput.addEventListener("input", search);
    } else {
        console.error("❌ Search input not found!");
    }

    if (searchTabButton) {
        searchTabButton.addEventListener("shown.bs.tab", () => {
            if (searchInput) {
                searchInput.value = "";
                searchInput.focus();
            }
            if (searchResultsBox) searchResultsBox.innerHTML = "";
            if (searchCounter) {
                searchCounter.textContent = "";
                searchCounter.classList.add("text-success", "text-dark", "fw-bold");
            }
            
        });
    }

    if (searchResultsBox) searchResultsBox.innerHTML = "";

    toggleLoader();
    setQuoteDataForSearch();
    setTimeout(toggleLoader, 2000);
});

// ✅ quote Data
let quoteData = []; //change this

// ✅ Load Search Data
function setQuoteDataForSearch() {
    fetch(scriptURL + "?action=getQuoteDataForSearch")
        .then(res => res.json())
        .then(data => quoteData = data.slice())
        .catch(err => console.error("❌ Error loading quote data:", err));
}

// ✅ Search Quotes
function search() {
    const searchInputEl = document.getElementById("searchInput");
    const searchResultsBox = document.getElementById("searchResults");
    if (!searchInputEl || !searchResultsBox) return;

    let counterContainer = document.getElementById("counterContainer");
    if (!counterContainer) {
        counterContainer = document.createElement("div");
        counterContainer.id = "counterContainer";
        counterContainer.classList.add("d-inline-flex", "gap-3", "align-items-center", "ms-3");
        searchInputEl.parentNode.insertBefore(counterContainer, searchInputEl.nextSibling);
    }

    const searchCounter = getOrCreateCounter("searchCounter", ["px-2", "py-1", "border", "rounded", "fw-bold", "bg-success", "text-dark"], counterContainer);
    const totalCounter = getOrCreateCounter("totalCounter", ["px-3", "py-1", "border", "rounded", "fw-bold", "bg-light", "text-dark"], counterContainer, searchCounter);

    toggleLoader();

    const input = searchInputEl.value.toLowerCase().trim();
    const searchWords = input.split(/\s+/);
    const searchCols = [0, 1, 2];

    const results = input === "" ? [] : quoteData.filter(r =>
        searchWords.every(word =>
            searchCols.some(i => r[i]?.toString().toLowerCase().includes(word))
        )
    );

    searchCounter.textContent = input === "" ? "🔍" : `${results.length} Quotes Found`;
    totalCounter.textContent = `Total Quotes: ${quoteData.length}`;
    searchResultsBox.innerHTML = "";

    const template = document.getElementById("rowTemplate").content;
    results.forEach(r => {
        const row = template.cloneNode(true);
        row.querySelector(".qtID").textContent = r[0];
        row.querySelector(".firstName").textContent = r[2]; // change this
        row.querySelector(".lastName").textContent = r[3];
        row.querySelector(".eventDate").textContent = r[9];
        row.querySelector(".edit-button").dataset.quoteid = r[0];
        row.querySelector(".delete-button").dataset.quoteid = r[0];
        searchResultsBox.appendChild(row);
    });

    toggleLoader();
}

// ✅ Unified Click Handler for Search Results
document.getElementById("searchResults").addEventListener("click", event => {
    const target = event.target;

    // Confirm Delete Toggle
    if (target.classList.contains("before-delete-button")) {
        const confirmBtn = target.previousElementSibling;
        const isDelete = target.dataset.buttonState === "delete";
        confirmBtn?.classList.toggle("d-none", !isDelete);
        target.textContent = isDelete ? "Cancel" : "Delete";
        target.dataset.buttonState = isDelete ? "cancel" : "delete";
        return;
    }

    // Perform Delete
    if (target.classList.contains("delete-button")) {
        const qtID = target.dataset.quoteid?.trim();
        if (!qtID) return showToast("⚠️ Quote ID missing", "error");

        toggleLoader();
        fetch(scriptURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ system: "quotes", action: "delete", qtID })
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showToast("✅ Quote deleted!", "success");
                document.getElementById("searchInput").value = "";
                document.getElementById("searchResults").innerHTML = "";
                setQuoteDataForSearch();
            } else {
                showToast("⚠️ Could not delete quote.", "error");
            }
        })
        .catch(() => showToast("⚠️ Error occurred while deleting quote.", "error"))
        .finally(toggleLoader);
        return;
    }

    // Handle Edit
    const editBtn = target.closest(".edit-button");
    if (editBtn) {
        const qtID = editBtn.dataset.quoteid;
        if (!qtID) return console.error("❌ Error: Missing qtID!");
        populateEditForm(qtID);
        showEditTab();
    }
});

// ✅ Utility functions
function getField(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value;
  } else {
    console.warn(`⚠️ Element with ID "${id}" not found.`);
  }
}

function formatPhoneNumber(number) {
  const digits = number.replace(/\D/g, ""); // strip all non-digits
  if (digits.length !== 10) return number; // fallback if it's not a full 10-digit number
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6);
  return `(${area}) ${mid}-${last}`;
}

// ✅ Populate edit form
async function populateEditForm(qtID) {
  try {
    toggleLoader(true);

    // Set quote ID and unlock the field
    setField("edit-qtID", qtID);
    document.getElementById("edit-qtID")?.removeAttribute("readonly");

    // Load select dropdowns
    loadDropdowns();

    // Fetch quote data from backend
    const res = await fetch(`${scriptURL}?action=getQuoteById&qtID=${qtID}`);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);

    const data = await res.json();
    if (!data || data.error) throw new Error(data?.error || "No quote data found");

    // Fields to populate directly
    const fields = [
      "phone", "firstName", "lastName", "email", "street", "city", "state", "zip",
      "eventDate", "eventLocation", "deliveryFee", "setupFee", "otherFee",
      "addonsTotal", "discount", "deposit", "depositDate", "balanceDue", "balanceDueDate",
      "paymentMethod", "quoteNotes", "grandTotal", "totalProductCost", "totalProductRetail",
      "eventNotes"
    ];

    fields.forEach(field => {
      let value = data[field] || "";
      if (field === "phone") value = formatPhoneNumber(value);
      setField(`edit-${field}`, value);
    });

    // Update header displays
    const updateDisplayText = (id, value, fallback = "") => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || fallback;
    };

    updateDisplayText("edit-firstName-display", `${data.firstName || ""} ${data.lastName || ""}`.trim(), "Client Info");
    updateDisplayText("edit-addonsTotal-display", data.addonsTotal);
    updateDisplayText("edit-grandTotal-display", data.grandTotal);
    updateDisplayText("edit-eventDate-display", data.eventDate);

    // Reset and populate product rows
    const productContainer = document.getElementById("product-rows-container");
    if (productContainer) productContainer.innerHTML = "";

    if (Array.isArray(data.products)) {
      data.products.forEach(p => {
        addProductRow(p.name, p.quantity);
      });
    }

    // Trigger recalculation
    calculateAllTotals();

    // Show edit pane and scroll to it
    const editPane = document.getElementById("edit-quote");
    if (editPane) {
      editPane.classList.remove("d-none");
      editPane.scrollIntoView({ behavior: "smooth" });
    }

  } catch (err) {
    console.error("❌ Error populating edit form:", err);
    showToast("❌ Error loading quote data!", "error");
  } finally {
    toggleLoader(false);
  }
}
  
// ✅ Handle Save/Edit Quote
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("save-changes");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    toggleLoader(true);

    try {
      // Get phone number (formatted or not)
      const phoneInput = getField("edit-phone");
      let phoneValue = phoneInput.trim();

      // Remove non-digit characters to store raw phone number in the backend
      const rawPhone = phoneValue.replace(/\D/g, "");

      // Build core form data
      const formData = {
        system: "quotes",
        action: "edit",
        qtID: getField("edit-qtID"),
        phone: rawPhone,  // Store raw phone number (digits only)
        firstName: getField("edit-firstName"),
        lastName: getField("edit-lastName"),
        email: getField("edit-email"),
        street: getField("edit-street"),
        city: getField("edit-city"),
        state: getField("edit-state"),
        zip: getField("edit-zip"),
        eventDate: getField("edit-eventDate"),
        eventLocation: getField("edit-eventLocation"),
        totalProductCost: getField("edit-totalProductCost"),
        totalProductRetail: getField("totalProductRetail"),
        deliveryFee: getField("edit-deliveryFee"),
        setupFee: getField("edit-setupFee"),
        otherFee: getField("edit-otherFee"),
        addonsTotal: getField("edit-addonsTotal"),
        discount: getField("edit-discount"),
        grandTotal: getField("edit-grandTotal"),
        deposit: getField("edit-deposit"),
        depositDate: getField("edit-depositDate"),
        balanceDue: getField("edit-balanceDue"),
        balanceDueDate: getField("edit-balanceDueDate"),
        paymentMethod: getField("edit-paymentMethod"),
        quoteNotes: getField("edit-quoteNotes"),
        eventNotes: getField("edit-eventNotes"),
      };

      // 🔍 Parse and validate product rows
      const partRows = document.querySelectorAll("#product-rows-container .product-row");
      const parts = {};
      let validCount = 0;

      partRows.forEach((row, index) => {
        const name = row.querySelector(".product-name")?.value.trim();
        const qty = row.querySelector(".product-quantity")?.value.trim();

        if (name && qty && parseFloat(qty) > 0) {
          parts[`part${index + 1}`] = name;
          parts[`qty${index + 1}`] = qty;
          validCount++;
        }
      });

      console.log("📦 Parts to save:", parts);

      if (validCount === 0) {
        showToast("⚠️ At least one part and quantity must be provided.", "error");
        return;
      }

      // Merge parts into formData
      Object.assign(formData, parts);

      // 🔄 Send data to backend
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (result.success) {
        showToast("✅ Quote updated!");
        document.getElementById("searchInput").value = "";
        document.getElementById("searchResults").innerHTML = "";
        setQuoteDataForSearch();
        document.querySelector('[data-bs-target="#search-quote"]')?.click();
      } else {
        showToast("❌ Error updating quote data!", "error");
      }

    } catch (err) {
      console.error("❌ Edit error:", err);
      showToast("❌ Error updating quote data!", "error");
    } finally {
      toggleLoader(false);
    }
  });
});
  
// 1) Initialize Add-Quote Form
async function initializeAddForm() {
  try {
    toggleLoader(true);

    // 1.a) Clear all add-mode fields
    const addFields = [
      "add-phone","add-firstName","add-lastName","add-email","add-street","add-city","add-state","add-zip",
      "add-deliveryFee","add-setupFee","add-otherFee","add-addonsTotal",
      "add-discount","add-subTotal1","add-subTotal2","add-subTotal3","add-grandTotal",
      "add-eventDate","add-eventLocation","add-eventNotes",
      "add-deposit","add-depositDate","add-paymentMethod","add-balanceDue","add-balanceDueDate",
      "add-grandTotalSummary","add-quoteNotes"
    ];
    addFields.forEach(id => setField(id, ""));

    // 1.b) Load all dropdowns (products, payment methods, etc.)
    await Promise.all([
      getProdDataForSearch(),    // repopulates row-products-selector
      setQuoteDataForSearch(),   // if you have any other datalists
      loadDropdowns()            // your existing function for other selects
    ]);
    
    // 1.c) Clear existing add-product rows & add first blank row
    const ctr = document.getElementById("add-product-rows-container");
    if (ctr) {
      ctr.innerHTML = "";
      addProductRow();           // your existing addProductRow() will append into add-product-rows-container
    }

    // 1.d) Wire up listeners on this fresh form
    setupAddFormListeners();

    // trigger one calc so totals read “$0.00”
    calculateAllTotals();

  } catch (err) {
    console.error("❌ Error initializing Add form", err);
    showToast("❌ Could not prepare Add Quote form", "error");
  } finally {
    toggleLoader(false);
  }
}

// 2) Setup listeners in Add form to auto-recalculate
function setupAddFormListeners() {
  const addPane = document.getElementById("add-quote");
  if (!addPane) return;

  // any input inside addPane that should recalc
  const selectors = [
    ".product-name", ".product-quantity",
    "#add-deliveryFee", "#add-setupFee", "#add-otherFee",
    "#add-discount",
    "#add-deposit"
  ];
  selectors.forEach(sel => {
    addPane.querySelectorAll(sel).forEach(el => {
      el.removeEventListener("input", calculateAllTotals);
      el.addEventListener("input", calculateAllTotals);
    });
  });
}

// 3) When “Add Quote” tab is shown, run initializeAddForm
document.querySelector('button[data-bs-target="#add-quote"]')
  .addEventListener("shown.bs.tab", initializeAddForm);

  document.getElementById("add-phone").addEventListener("change", async () => {
    const phone = getField("add-phone");  // Phone is actually ClientID
  
    if (!phone) return;
  
    try {
      const res = await fetch(`${scriptURL}?action=getClientById&clientID=${encodeURIComponent(phone)}`);
      const client = await res.json();
  
      if (!client.error) {
        setField("add-firstName", client.firstName);
        setField("add-lastName",  client.lastName);
        setField("add-email",     client.email);
        setField("add-street",    client.street);
        setField("add-city",      client.city);
        setField("add-state",     client.state);
        setField("add-zip",       client.zip);
      } else {
        // Clear if not found
        ["add-firstName","add-lastName","add-email","add-street","add-city","add-state","add-zip"]
          .forEach(id => setField(id,""));
        showToast(client.error, "warning");
      }
  
    } catch (err) {
      console.error("❌ Error loading client by ID:", err);
      showToast("❌ Could not load client info!", "error");
    }
  });

let productData = {}; // Global material map
const maxProducts = 20;
  
async function getProdDataForSearch() {
  try {
    const response = await fetch(`${scriptURL}?action=getProdDataForSearch`);
    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
    const rawData = await response.json();
 
    productData = {}; // ✅ Global assignment

    rawData.forEach(row => {
      const id = typeof row[0] === 'string' ? row[0].trim() : String(row[0]);
      const name = typeof row[1] === 'string' ? row[1].trim() : String(row[1]);
      const cost = parseFloat(row[46]?.toString().replace(/[^0-9.]/g, '')) || 0;
      const retail = parseFloat(row[45]?.toString().replace(/[^0-9.]/g, '')) || 0;
  
      if (id && name) {
        productData[id] = { prodID: id, name, cost, retail };
      }
    });
  
    const datalist = document.getElementById("row-products-selector");
    if (datalist) {
      datalist.innerHTML = "";
      Object.values(productData).forEach(mat => {
        const opt = document.createElement("option");
        opt.value = mat.name;
        datalist.appendChild(opt);
      });
    }
  
    return true;
  } catch (err) {
    console.error("❌ Error loading products:", err);
    showToast("❌ Error loading products!", "error");
    throw err;
  }
}
  
function calculateAllTotals() {
let totalProductCost = 0;
let totalProductRetail = 0;

// Parse currency safely
const parseCurrency = (val) => parseFloat(String(val || "0").replace(/[^0-9.-]+/g, "")) || 0;

// Sum product rows
document.querySelectorAll(".product-row").forEach(row => {
  const name = row.querySelector(".product-name")?.value.trim() || "";
  const qty = parseInt(row.querySelector(".product-quantity")?.value) || 0;
  const prod = Object.values(productData).find(p => p.name === name);
  if (prod && qty > 0) {
    totalProductCost += prod.cost * qty;
    totalProductRetail += prod.retail * qty;
  }
});

// Clean + parse fee and form inputs
const deliveryFee = parseCurrency(document.getElementById("edit-deliveryFee")?.value || document.getElementById("deliveryFee")?.value);
const setupFee = parseCurrency(document.getElementById("edit-setupFee")?.value || document.getElementById("setupFee")?.value);
const otherFee = parseCurrency(document.getElementById("edit-otherFee")?.value || document.getElementById("otherFee")?.value);
const discount = parseCurrency(document.getElementById("edit-discount")?.value || document.getElementById("discount")?.value);
const deposit = parseCurrency(document.getElementById("edit-deposit")?.value || document.getElementById("deposit")?.value);

const addonsTotal = deliveryFee + setupFee + otherFee;
const subTotal1 = totalProductRetail * 0.08875;
const subTotal2 = totalProductRetail + subTotal1;
const subTotal3 = totalProductRetail * (discount / 100);
const grandTotal = subTotal2 - subTotal3 + addonsTotal;
const balanceDue = grandTotal - deposit;

// Currency formatting helper
const formatCurrency = (val) =>
  val.toLocaleString("en-US", { style: "currency", currency: "USD" });

// Update display/input values
const updateField = (id, val) => {
  const el = document.getElementById(id);
  if (!el) return;
  const formatted = formatCurrency(val);
  if (el.tagName === "INPUT") {
    el.value = formatted;
  } else {
    el.textContent = formatted;
  }
};

updateField("totalRowCost", totalProductCost);
updateField("edit-totalProductCost", totalProductCost);
updateField("totalRowRetail", totalProductRetail);
updateField("edit-totalProductRetail", totalProductRetail);
updateField("addonsTotal", addonsTotal);
updateField("edit-addonsTotal", addonsTotal);
updateField("header-addonsTotal", addonsTotal);
updateField("edit-addonsTotal-totals", addonsTotal);
updateField("subTotal1", subTotal1);
updateField("subTotal2", subTotal2);
updateField("subTotal3", subTotal3);
updateField("grandTotal", grandTotal);
updateField("edit-grandTotal", grandTotal);
updateField("edit-grandTotal-display", grandTotal);
updateField("header-grandTotal-totals", grandTotal);
updateField("balanceDue", balanceDue);
updateField("edit-balanceDue", balanceDue);
}

// Auto-trigger calculations
document.addEventListener("DOMContentLoaded", () => {
  const selectors = [
    ".product-name", ".product-quantity",
    "#deliveryFee", "#setupFee", "#otherFee",
    "#edit-deliveryFee", "#edit-setupFee", "#edit-otherFee",
    "#discount", "#edit-discount",
    "#deposit", "#edit-deposit"
  ];

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener("input", calculateAllTotals);
    });
  });

  calculateAllTotals(); // Initial run
});

// Auto-trigger on all relevant fields
document.addEventListener("DOMContentLoaded", () => {
  const selectors = [
    ".product-name", ".product-quantity",
    "#deliveryFee", "#setupFee", "#otherFee",
    "#edit-deliveryFee", "#edit-setupFee", "#edit-otherFee",
    "#discount", "#edit-discount",
    "#deposit", "#edit-deposit"
  ];

  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.addEventListener("input", calculateAllTotals);
    });
  });

  calculateAllTotals(); // Run once on load
});
  
function addProductRow(name = "", qty = 1) {
  const container = document.getElementById("product-rows-container");
  if (!container) return;

  const row = document.createElement("div");
  row.classList.add("row", "g-2", "align-items-center", "mb-1", "product-row");
  row.innerHTML = `
    <div class="col-md-6">
      <select class="form-select product-name">
        <option value="">Choose a product...</option>
        ${Object.values(productData).map(p => `
          <option value="${p.name}" ${p.name === name ? "selected" : ""}>${p.name}</option>
        `).join("")}
      </select>
    </div>
    <div class="col-md-1">
      <input type="number" class="form-control text-center product-quantity" value="${qty}">
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control text-end totalRowCost" value="$0.00" readonly>
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control text-end totalRowRetail" value="$0.00" readonly>
    </div>
    <div class="col-md-1">
      <button type="button" class="btn btn-danger btn-sm remove-part"><i class="bi bi-trash"></i></button>
    </div>
  `;

  container.appendChild(row);

  // ✅ Attach event listeners and auto-trigger totals
  attachRowEvents(row);

  // ✅ Trigger calculation immediately with pre-filled values
  const nameInput = row.querySelector(".product-name");
  const qtyInput = row.querySelector(".product-quantity");
  if (nameInput && qtyInput) {
    nameInput.dispatchEvent(new Event("change"));
    qtyInput.dispatchEvent(new Event("change"));
  }
}
  
  function attachRowEvents(row) {
    const nameInput = row.querySelector(".product-name");
    const qtyInput = row.querySelector(".product-quantity");
    const costOutput = row.querySelector(".totalRowCost");
    const retailOutput = row.querySelector(".totalRowRetail");
    const deleteBtn = row.querySelector(".remove-part");
  
    function updateTotals() {
      const name = nameInput.value.trim();
      const qty = parseInt(qtyInput.value) || 0;
      const prod = Object.values(productData).find(p => p.name === name);
  
      if (prod && qty > 0) {
        costOutput.value = `$${(prod.cost * qty).toFixed(2)}`;
        retailOutput.value = `$${(prod.retail * qty).toFixed(2)}`;
      } else {
        costOutput.value = "$0.00";
        retailOutput.value = "$0.00";
      }
  
      calculateAllTotals();
    }
  
    nameInput.addEventListener("change", updateTotals);
    qtyInput.addEventListener("change", updateTotals);
    deleteBtn.addEventListener("click", () => {
      row.remove();
      calculateAllTotals();
    });
  }

  document.getElementById("edit-discount").addEventListener("input", calculateAllTotals);

  window.addEventListener("DOMContentLoaded", async () => {
    await getProdDataForSearch();
    document.getElementById("add-product-btn")?.addEventListener("click", () => addProductRow());
    addProductRow(); // Add initial row
  });

  // Ensure the form is fully loaded before running calculations
window.addEventListener("DOMContentLoaded", () => {
  calculateAllTotals(); // Auto-run calculations on form load
});
