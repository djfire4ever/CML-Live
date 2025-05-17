// new quotemanager.js

// bootstrap 5 tab switching and mode detection
// ✅ Utility: Show Edit Tab
function showEditTab() {
  const editTab = document.querySelector('[data-bs-target="#edit-quote"]');
  if (editTab) new bootstrap.Tab(editTab).show();
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
    setTimeout(toggleLoader, 500);
    // Add event listener for the discount field
    document.getElementById("edit-discount")?.addEventListener("change", calculateAllTotals);
});

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
            showToast("✅ Quote updated!");
            document.getElementById("searchInput").value = "";
            document.getElementById("searchResults").innerHTML = "";
            setQuoteDataForSearch();
            document.querySelector('[data-bs-target="#search-quote"]')?.click(); // Switches to the search form
          } else {
            showToast("❌ Error updating quote data!", "error");
            console.error("❌ Backend save failed:", result.message || "Unknown error");
          }
      })
      .catch(() => showToast("⚠️ Error occurred while deleting quote.", "error"))
      .finally(toggleLoader);
      return;
  }

// Handle row click for editing
  const row = target.closest("tr");
  if (row && row.dataset.quoteid && !target.closest(".btn-group")) {
    const qtID = row.dataset.quoteid;
    console.log("🔍 Row clicked with qtID:", qtID); // Add this log
    populateEditForm(qtID);
    showEditTab();
    return;
  }

});

document.addEventListener("DOMContentLoaded", () => {
  // Save button for Edit Form
  const editQuoteBtn = document.getElementById("edit-quote-btn");
  if (editQuoteBtn) {
    editQuoteBtn.addEventListener("click", async (e) => {
      console.log("✅ Save Quote button clicked (Edit Form)");
      e.preventDefault();
      e.stopPropagation();
      await handleSave(e, "edit");  // ✅ FIXED: pass event!
    });
  }

  // Save button for Add Form
  const addQuoteBtn = document.getElementById("add-quote-btn");
  if (addQuoteBtn) {
    addQuoteBtn.addEventListener("click", async (e) => {
      console.log("✅ Add Quote button clicked (Add Form)");
      e.preventDefault();
      e.stopPropagation();
      await handleSave(e, "add");  // already good
    });
  }

  // Initialize Add Form when the tab is shown
  document.querySelector('button[data-bs-target="#add-quote"]')
    ?.addEventListener("shown.bs.tab", initializeAddForm);
});

// Part 1-mode detection
// ✅ Populate Edit Form
document.addEventListener("DOMContentLoaded", () => {
  // Watch all fields that affect calculations
  const fieldsToWatch = [
    "edit-deliveryFee",
    "edit-setupFee",
    "edit-otherFee",
    "edit-discount",
    "edit-deposit",
    "add-deliveryFee",
    "add-setupFee",
    "add-otherFee",
    "add-discount",
    "add-deposit",
    "add-phone",
    "add-eventDate",
    "edit-eventDate",
    "edit-phone",
  ];

  fieldsToWatch.forEach(fieldId => {
    document.getElementById(fieldId)?.addEventListener("change", () => {
      const mode = fieldId.startsWith("add") ? "add" : "edit";
      calculateAllTotals(mode);
    });
  });

  // Attach event listeners to existing product rows dynamically based on mode
  document.querySelectorAll(".product-row").forEach(row => {
    const mode = row.closest("#add-product-rows-container") ? "add" : "edit";
    attachRowEvents(row, mode);
  });

  // Add specific listeners for Add and Edit product buttons
  const addProductBtn = document.getElementById("add-product-btn");
  if (addProductBtn) {
    addProductBtn.addEventListener("click", (e) => {
      console.log("✅ Add Product button clicked");
      e.stopPropagation(); // Prevent event from propagating
      addProductRow("", 1, "add-product-rows-container", "add");
    });
  }
  const editProductBtn = document.getElementById("edit-product-btn");

  if (addProductBtn) {
    console.log("🔍 Adding event listener to Add Product button");
    addProductBtn.removeEventListener("click", handleAddProductClick); // Remove any existing listener
    addProductBtn.addEventListener("click", handleAddProductClick); // Add the new listener
  }

  if (editProductBtn) {
    editProductBtn.removeEventListener("click", handleEditProductClick); // Remove any existing listener
    editProductBtn.addEventListener("click", handleEditProductClick);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Save button for Edit Form
  const editQuoteBtn = document.getElementById("edit-quote-btn");
  if (editQuoteBtn) {
    editQuoteBtn.addEventListener("click", async (e) => {
      console.log("✅ Save Quote button clicked (Edit Form)");
      e.preventDefault();
      e.stopPropagation();
      await handleSave(e, "edit");  // ✅ FIXED: pass event!
    });
  }

  // Save button for Add Form
  const addQuoteBtn = document.getElementById("add-quote-btn");
  if (addQuoteBtn) {
    addQuoteBtn.addEventListener("click", async (e) => {
      console.log("✅ Add Quote button clicked (Add Form)");
      e.preventDefault();
      e.stopPropagation();
      await handleSave(e, "add");  // already good
    });
  }

  // Initialize Add Form when the tab is shown
  document.querySelector('button[data-bs-target="#add-quote"]')
    ?.addEventListener("shown.bs.tab", initializeAddForm);
});

// Part 2-only uses bs-tabs logic and mode detection
async function populateEditForm(qtID) {
  try {
    toggleLoader(true);
    await getProdDataForSearch();

    setField("edit-qtID", qtID);
    document.getElementById("edit-qtID")?.setAttribute("readonly", true);

    console.log("🔍 Fetching quote data for qtID:", qtID);
    
    const res = await fetch(`${scriptURL}?action=getQuoteById&qtID=${qtID}`);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);

    console.log("✅ Fetch response status:", res.status);

    const data = await res.json();
    if (!data || data.error) throw new Error(data?.error || "No quote data found");
    console.log("✅ Fetch response data:", data);

    // 🔹 Card 1 - Client Info
    setField("edit-phone", data.phone || "");
    setField("edit-firstName", data.firstName || "");
    setField("edit-lastName", data.lastName || "");
    setField("edit-street", data.street || "");
    setField("edit-email", data.email || "");
    setField("edit-city", data.city || "");
    setField("edit-state", data.state || "");
    setField("edit-zip", data.zip || "");

    // 🔹 Card 2 - Event Info
    setField("edit-eventDate", data.eventDate || "");
    setField("edit-eventLocation", data.eventLocation || "");
    setField("edit-eventNotes", data.eventNotes || "");

    // 🔹 Card 3 - Add-On Fees
    setField("edit-deliveryFee", data.deliveryFee || 0);
    setField("edit-setupFee", data.setupFee || 0);
    setField("edit-otherFee", data.otherFee || 0);
    setField("edit-addonsTotal", data.addonsTotal || 0);

    // 🔹 Card 4 - Balance Info
    setField("edit-deposit", data.deposit || 0);
    setField("edit-depositDate", data.depositDate || "");
    setField("edit-balanceDue", data.balanceDue || 0);
    setField("edit-balanceDueDate", data.balanceDueDate || "");
    setField("edit-paymentMethod", data.paymentMethod || "");
    setField("edit-dueDate", data.dueDate || ""); // ✅ NEW

    // 🔹 Card 5 - Totals
    setField("edit-discount", data.discount || 0);
    setField("edit-subTotal1", data.subTotal1 || 0);           // ✅ NEW
    setField("edit-subTotal2", data.subTotal2 || 0);           // ✅ NEW
    setField("edit-subTotal3", data.subTotal3 || 0);           // ✅ NEW
    setField("edit-discountedTotal", data.discountedTotal || 0); // ✅ NEW
    setField("edit-grandTotal", data.grandTotal || 0);

    // 🔹 Products
    const productContainer = document.getElementById("edit-product-rows-container");
    if (productContainer) productContainer.innerHTML = "";

    if (Array.isArray(data.products)) {
      data.products.forEach(p => {
        addProductRow(
          p.name || "", 
          p.quantity || "", 
          "edit-product-rows-container", 
          "edit",
          p.unitPrice || "",              // ✅ NEW - if supported by your addProductRow()
          p.totalRowRetail || ""          // ✅ NEW
        );
      });
    }

    // 🔹 Hidden / Extra Fields
    setField("edit-totalProductCost", data.totalProductCost || 0);
    setField("edit-totalProductRetail", data.totalProductRetail || 0);
    setField("edit-productCount", data.productCount || "");        // ✅ NEW
    setField("edit-quoteDate", data.quoteDate || "");              // ✅ NEW
    setField("edit-quoteNotes", data.quoteNotes || "");
    setField("edit-invoiceID", data.invoiceID || "");              // ✅ NEW
    setField("edit-invoiceDate", data.invoiceDate || "");          // ✅ NEW
    setField("edit-invoiceUrl", data.invoiceUrl || "");            // ✅ NEW

    // 🔁 Totals + UI
    calculateAllTotals("edit");
    updateCardHeaders("edit");

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

async function handleSave(event, mode) {
  if (!event || !mode) {
    console.error("❌ handleSave requires both event and mode.");
    return;
  }

  const eventSource = event.target;
  console.log("Event source:", eventSource);
  console.log("Event type:", event.type);

  const expectedButtonId = mode === "add" ? "add-quote-btn" : "edit-quote-btn";
  if (eventSource?.id !== expectedButtonId) {
    console.warn(`⚠️ handleSave triggered by unintended element:`, eventSource);
    return;
  }

  console.log(`🔍 handleSave triggered for mode: ${mode}`);
  toggleLoader(true);

  try {
    // Recalculate totals before collecting data
    calculateAllTotals(mode);

    const formData = collectQuoteFormData(mode);
    console.log("🚀 Data being sent to backend:", formData);

    // Send data to the backend with 'quoteDate' handled by the backend
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "quotes",
        action: mode,
        qtID: mode === "edit" ? getField("edit-qtID") : null,
        quoteInfo: formData
      })
    });

    const result = await res.json();
    console.log("✅ Backend response:", result);

    if (result.success) {
      showToast("✅ Quote saved successfully!");
      document.getElementById("searchInput").value = "";
      document.getElementById("searchResults").innerHTML = "";
      setQuoteDataForSearch();
      document.querySelector('[data-bs-target="#search-quote"]')?.click();
    } else {
      showToast("❌ Error saving quote data!", "error");
      console.error("❌ Backend save failed:", result.message || "Unknown error");
    }
  } catch (err) {
    console.error("❌ Save error:", err);
    showToast("❌ Error saving quote data!", "error");
  } finally {
    toggleLoader(false);
  }
}

function collectQuoteFormData(mode) {
  const get = (id) => getField(`${mode}-${id}`);
  const rawPhone = get("phone").replace(/\D/g, "");

  const formData = {
    phone: rawPhone,
    firstName: get("firstName"),
    lastName: get("lastName"),
    email: get("email"),
    street: get("street"),
    city: get("city"),
    state: get("state"),
    zip: get("zip"),
    eventDate: get("eventDate"),
    eventLocation: get("eventLocation"),
    deliveryFee: parseCurrency(get("deliveryFee")),
    setupFee: parseCurrency(get("setupFee")),
    otherFee: parseCurrency(get("otherFee")),
    addonsTotal: parseCurrency(get("addonsTotal")),
    deposit: parseCurrency(get("deposit")),
    depositDate: get("depositDate"),
    balanceDue: parseCurrency(get("balanceDue")),
    balanceDueDate: get("balanceDueDate"),
    paymentMethod: get("paymentMethod"),
    dueDate: get("dueDate"),
    totalProductCost: parseCurrency(get("totalProductCost")),
    totalProductRetail: parseCurrency(get("totalProductRetail")),
    subTotal1: parseCurrency(get("subTotal1")),
    subTotal2: parseCurrency(get("subTotal2")),
    subTotal3: parseCurrency(get("subTotal3")),
    discount: parseCurrency(get("discount")),
    discountedTotal: parseCurrency(get("discountedTotal")),
    grandTotal: parseCurrency(get("grandTotal")),
    quoteNotes: get("quoteNotes"),
    eventNotes: get("eventNotes"),
    invoiceID: "",
    invoiceDate: "",
    invoiceUrl: ""
  };

  // Gather product rows
  const partRows = document.querySelectorAll(`#${mode}-product-rows-container .product-row`);
  const products = [];

  partRows.forEach((row) => {
    const name = row.querySelector(".product-name")?.value.trim();
    const qty = parseFloat(row.querySelector(".product-quantity")?.value.trim() || 0);
    const unitPrice = parseCurrency(row.querySelector(".totalRowCost")?.value || 0);
    const totalRowRetail = parseCurrency(row.querySelector(".totalRowRetail")?.value || 0);

    if (name && qty > 0) {
      products.push({ name, quantity: qty, unitPrice, totalRowRetail });
    }
  });

  formData.productCount = products.length;

  for (let i = 1; i <= 15; i++) {
    const p = products[i - 1] || {};
    formData[`part${i}`] = p.name || "";
    formData[`qty${i}`] = p.quantity || "";
    formData[`unitPrice${i}`] = p.unitPrice || "";
    formData[`totalRowRetail${i}`] = p.totalRowRetail || "";
  }

  return formData;
}

let productData = {}; // Global material map
const maxProducts = 15;

// Initialize Add Form
async function initializeAddForm() {
  try {
    toggleLoader(true);

    // Clear all add-mode fields
    const addFields = [
      "phone", "firstName", "lastName", "email", "street", "city", "state", "zip",
      "eventDate", "eventLocation", "deliveryFee", "setupFee", "otherFee",
      "addonsTotal", "discount", "deposit", "depositDate", "balanceDue", "balanceDueDate",
      "paymentMethod", "quoteNotes", "grandTotal", "totalProductCost", "totalProductRetail",
      "eventDate", "eventLocation", "eventNotes"
    ];

    addFields.forEach(field => setField(`add-${field}`, "")); // Mode-specific field clearing ("add" mode)

    // Load all dropdowns (products, clients, etc.)
    await Promise.all([
      getProdDataForSearch(),
      setQuoteDataForSearch(),
      loadDropdowns()
    ]);

    // Reset and add a blank product row for "add" mode
    resetProductRows("add-product-rows-container");

    // Recalculate totals and update headers (specific to "add" mode)
    calculateAllTotals("add");
    updateCardHeaders("add");

  } catch (err) {
    console.error("❌ Error initializing Add form", err);
    showToast("❌ Could not prepare Add Quote form", "error");
  } finally {
    toggleLoader(false);
  }
}

// ✅ Bootstrap 5 tab switch listener: runs only when "Add Quote" tab is shown
document.querySelector('button[data-bs-target="#add-quote"]')
  .addEventListener("shown.bs.tab", initializeAddForm);

// Populate client info in "add" mode based on selected phone/clientID
document.getElementById("add-phone").addEventListener("change", async (e) => {
  e.stopPropagation();
  const phone = getField("add-phone");

  if (!phone) return;

  try {
    const res = await fetch(`${scriptURL}?action=getClientById&clientID=${encodeURIComponent(phone)}`);
    const client = await res.json();

    if (!client.error) {
      // Fill in all matching add-mode fields
      setField("add-firstName", client.firstName);
      setField("add-lastName", client.lastName);
      setField("add-email", client.email);
      setField("add-street", client.street);
      setField("add-city", client.city);
      setField("add-state", client.state);
      setField("add-zip", client.zip);
    } else {
      // Clear all fields if client not found
      ["add-firstName", "add-lastName", "add-email", "add-street", "add-city", "add-state", "add-zip"]
        .forEach(id => setField(id, ""));
      showToast(client.error, "warning");
    }

    // Update card headers for "add" mode
    updateCardHeaders("add");

  } catch (err) {
    console.error("❌ Error loading client by ID:", err);
    showToast("❌ Could not load client info!", "error");
  }
});

async function getProdDataForSearch() {
  try {
    const response = await fetch(`${scriptURL}?action=getProdDataForSearch`);
    if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
    const rawData = await response.json();

    productData = {}; // ✅ Assign global product map

    rawData.forEach(row => {
      const id = typeof row[0] === 'string' ? row[0].trim() : String(row[0]);
      const name = typeof row[1] === 'string' ? row[1].trim() : String(row[1]);
      const cost = parseFloat(row[46]?.toString().replace(/[^0-9.]/g, '')) || 0;
      const retail = parseFloat(row[45]?.toString().replace(/[^0-9.]/g, '')) || 0;

      if (id && name) {
        productData[id] = { prodID: id, name, cost, retail };
      }
    });

    console.log("✅ productData loaded successfully.");
  } catch (err) {
    console.error("❌ Error loading products:", err);
    throw err;
  }
}

// Handle add product button (Add Mode)
function handleAddProductClick() {
  console.log("✅ Add Product button clicked");
  addProductRow("", 1, "add-product-rows-container", "add"); // Mode = "add"
}

// Improve UX for dropdown clicks (prevent unwanted bubbling)
document.querySelectorAll(".product-name").forEach((dropdown) => {
  dropdown.addEventListener("click", (e) => {
    console.log("✅ Product dropdown clicked");
    e.stopPropagation();
  });
});

// Collapse toggles (prevent bubbling)
document.querySelectorAll('[data-bs-toggle="collapse"]').forEach((btn) => {
  btn.addEventListener("click", (e) => {
    console.log("✅ Collapse button clicked");
    e.stopPropagation();
  });
});

// Dynamically add a product row to Add or Edit container
function addProductRow(
  name = "",
  qty = 1,
  containerId = "add-product-rows-container",
  mode = "add", // ✅ Default is "add" mode
  unitRetail = 0,
  totalRetail = 0
) {
  console.log(`Adding product row to container: ${containerId}`);
  const container = document.getElementById(containerId);
  if (!container) return;

  const row = document.createElement("div");
  row.classList.add("row", "g-2", "align-items-center", "mb-1", "product-row");

  // Build options dropdown
  const optionsHTML = Object.values(productData).map(p => {
    const selected = p.name === name ? ' selected' : '';
    return `<option value="${p.name.replace(/"/g, '&quot;')}"${selected}>${p.name}</option>`;
  }).join("");

  const formattedUnitRetail = `$${parseFloat(unitRetail || 0).toFixed(2)}`;
  const formattedTotalRetail = `$${parseFloat(totalRetail || 0).toFixed(2)}`;

  row.innerHTML = `
    <div class="col-md-6">
      <select class="form-select product-name" list="row-products-selector">
        <option value="">Choose a product...</option>
        ${optionsHTML}
      </select>
    </div>
    <div class="col-md-1">
      <input type="number" class="form-control text-center product-quantity" value="${qty}">
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control text-end totalRowCost" value="${formattedUnitRetail}" readonly>
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control text-end totalRowRetail" value="${formattedTotalRetail}" readonly>
    </div>
    <div class="col-md-1">
      <button type="button" class="btn btn-danger btn-sm remove-part">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;

  container.appendChild(row);

  attachRowEvents(row, mode);       // ✅ Attach events with correct mode
  calculateAllTotals(mode);         // ✅ Recalculate totals based on mode
}

// Edit product button (Edit Mode)
function handleEditProductClick() {
  addProductRow("", 1, "edit-product-rows-container", "edit"); // ✅ Mode = "edit"
}

// Attach input/change/delete events to row
function attachRowEvents(row, mode = "edit") {
  const prefix = mode === "add" ? "add-" : "edit-"; // ✅ Mode-based field handling

  const nameInput = row.querySelector(".product-name");
  const qtyInput = row.querySelector(".product-quantity");
  const costOutput = row.querySelector(".totalRowCost");
  const retailOutput = row.querySelector(".totalRowRetail");
  const deleteBtn = row.querySelector(".remove-part");

  function updateTotals() {
    const name = nameInput.value.trim();
    const qty = parseInt(qtyInput.value) || 0;
    const prod = productData?.[name] || Object.values(productData).find(p => p.name === name);

    if (prod && qty > 0) {
      costOutput.value = `$${(prod.cost * qty).toFixed(2)}`;
      retailOutput.value = `$${(prod.retail * qty).toFixed(2)}`;
    } else {
      costOutput.value = "$0.00";
      retailOutput.value = "$0.00";
    }

    calculateAllTotals(mode); // ✅ Recalculate using correct mode
  }

  nameInput.addEventListener("change", updateTotals);
  qtyInput.addEventListener("change", updateTotals);
  deleteBtn.addEventListener("click", () => {
    row.remove();
    calculateAllTotals(mode); // ✅ Remove and recalc based on mode
  });

  updateTotals(); // ✅ Initial calc
}

// Clear and reset product row section
function resetProductRows(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`❌ Container with ID "${containerId}" not found.`);
    return;
  }

  container.innerHTML = ""; // Remove all rows

  // ✅ Infer mode from containerId prefix
  addProductRow("", 1, containerId, containerId.startsWith("add") ? "add" : "edit");
}

