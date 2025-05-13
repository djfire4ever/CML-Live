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

// ✅ quote Data
let quoteData = []; 

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

    const searchCounter = getOrCreateCounter("searchCounter", ["px-2", "py-1", "border", "rounded", "fw-bold", "bg-dark", "text-info"], counterContainer);
    const totalCounter = getOrCreateCounter("totalCounter", ["px-2", "py-1", "border", "rounded", "fw-bold", "bg-dark", "text-info"], counterContainer, searchCounter);

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
      row.querySelector(".firstName").textContent = r[3];
      row.querySelector(".lastName").textContent = r[4];
      row.querySelector(".eventDate").textContent = r[10];
  
      // ✅ Set qtID directly on the row for click handling
      const tr = row.querySelector("tr");
      tr.dataset.quoteid = r[0];
  
      // ✅ Still set delete buttons if needed
      const deleteBtn = row.querySelector(".delete-button");
      const confirmBtn = row.querySelector(".before-delete-button");
      if (deleteBtn) deleteBtn.dataset.quoteid = r[0];
      if (confirmBtn) confirmBtn.dataset.quoteid = r[0];
  
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

// Unified Event listener for Save buttons in Both Forms
document.addEventListener("DOMContentLoaded", () => {
  // Save button for Edit Form
  const saveQuoteBtn = document.getElementById("save-quote-btn");
  if (saveQuoteBtn) {
    saveQuoteBtn.addEventListener("click", async (e) => {
      console.log("✅ Save Quote button clicked (Edit Form)");
      e.preventDefault();
      e.stopPropagation(); // Prevent event from propagating to parent elements
      await handleSave("edit");
    });
  }

  // Save button for Add Form
  const addQuoteBtn = document.getElementById("add-quote-btn");
  if (addQuoteBtn) {
    addQuoteBtn.addEventListener("click", async (e) => {
      console.log("✅ Add Quote button clicked (Add Form)");
      e.preventDefault(); // Prevent default form submission
      e.stopPropagation(); // Stop the event from propagating further
      await handleSave(e, "add"); // Pass the event object explicitly
    });
  }

  // Initialize Add Form when the tab is shown
  document.querySelector('button[data-bs-target="#add-quote"]')
    .addEventListener("shown.bs.tab", initializeAddForm);
});

// Unified save handler for both Add and Edit forms
async function handleSave(event, mode) {
  const eventSource = event?.target;
  console.log("Event source:", eventSource); // Log the source of the event
  console.log("Event type:", event?.type); // Log the type of the event

  if (!eventSource || eventSource.id !== "add-quote-btn") {
    console.warn("⚠️ handleSave triggered by an unintended element:", eventSource);
    return; // Exit if the source is not the Add Quote button
  }

  console.log(`🔍 handleSave triggered for mode: ${mode}`);
  console.log("Event source:", eventSource); // Log the source of the event
  console.log("Event type:", event.type); // Log the type of the event
  toggleLoader(true); // Show loader during saving process


  try {
    const get = (id) => getField(`${mode}-${id}`);
    const rawPhone = get("phone").replace(/\D/g, "");

    const formData = {
      quoteDate: new Date(),
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
      invoiceID: get("invoiceID"),
      invoiceDate: get("invoiceDate"),
      invoiceUrl: get("invoiceUrl")
    };
    console.log("Form data being collected:", formData);

    // Collect product rows
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
    console.log("Products being collected:", products);

    if (products.length === 0) {
      showToast("⚠️ At least one valid product and quantity must be provided.", "error");
      return;
    }

    formData.productCount = products.length;

    // Add product data to formData
    for (let i = 1; i <= 15; i++) {
      const p = products[i - 1] || {};
      formData[`part${i}`] = p.name || "";
      formData[`qty${i}`] = p.quantity || "";
      formData[`unitPrice${i}`] = p.unitPrice || "";
      formData[`totalRowRetail${i}`] = p.totalRowRetail || "";
    }

    const dataArray = [
      formData.quoteDate,
      formData.phone,
      formData.firstName,
      formData.lastName,
      formData.email,
      formData.street,
      formData.city,
      formData.state,
      formData.zip,
      formData.eventDate,
      formData.eventLocation,
      formData.productCount,
      formData.deliveryFee,
      formData.setupFee,
      formData.otherFee,
      formData.addonsTotal,
      formData.deposit,
      formData.depositDate,
      formData.balanceDue,
      formData.balanceDueDate,
      formData.paymentMethod,
      formData.dueDate,
      formData.totalProductCost,
      formData.totalProductRetail,
      formData.subTotal1,
      formData.subTotal2,
      formData.subTotal3,
      formData.discount,
      formData.discountedTotal,
      formData.grandTotal,
    ];

    for (let i = 1; i <= 15; i++) {
      dataArray.push(
        formData[`part${i}`],
        formData[`qty${i}`],
        formData[`unitPrice${i}`],
        formData[`totalRowRetail${i}`]
      );
    }

    dataArray.push(
      formData.quoteNotes,
      formData.eventNotes,
      formData.invoiceID,
      formData.invoiceDate,
      formData.invoiceUrl
    );

    console.log("Data being sent to backend:", dataArray);

    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "quotes",
        action: mode, // Dynamically set to "add" or "edit"
        qtID: mode === "edit" ? get("qtID") : null,
        quoteInfo: dataArray
      })
    });

    const result = await res.json();
    console.log("Backend response:", result);

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
  } catch (err) {
    console.error("❌ Save error:", err);
    showToast("❌ Error updating quote data!", "error");
  } finally {
    toggleLoader(false);
  }
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

    addFields.forEach(field => setField(`add-${field}`, ""));

    // Load all dropdowns
    await Promise.all([
      getProdDataForSearch(),
      setQuoteDataForSearch(),
      loadDropdowns()
    ]);

    // Clear product rows and add one fresh row
    resetProductRows("add-product-rows-container");

    // Trigger calculations and header updates
    calculateAllTotals("add");
    updateCardHeaders("add");

  } catch (err) {
    console.error("❌ Error initializing Add form", err);
    showToast("❌ Could not prepare Add Quote form", "error");
  } finally {
    toggleLoader(false);
  }
}

// 3) When “Add Quote” tab is shown, run initializeAddForm
document.querySelector('button[data-bs-target="#add-quote"]')
  .addEventListener("shown.bs.tab", initializeAddForm);

  document.getElementById("add-phone").addEventListener("change", async (e) => {
    e.stopPropagation(); // Prevent event from propagating
    const phone = getField("add-phone"); // Phone is actually ClientID
  
    if (!phone) return;
  
    try {
      const res = await fetch(`${scriptURL}?action=getClientById&clientID=${encodeURIComponent(phone)}`);
      const client = await res.json();
  
      if (!client.error) {
        setField("add-firstName", client.firstName);
        setField("add-lastName", client.lastName);
        setField("add-email", client.email);
        setField("add-street", client.street);
        setField("add-city", client.city);
        setField("add-state", client.state);
        setField("add-zip", client.zip);
      } else {
        // Clear if not found
        ["add-firstName", "add-lastName", "add-email", "add-street", "add-city", "add-state", "add-zip"]
          .forEach(id => setField(id, ""));
        showToast(client.error, "warning");
      }
  
      // Trigger header updates after populating fields
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

    console.log("✅ productData loaded successfully.");
  } catch (err) {
    console.error("❌ Error loading products:", err);
    throw err;
  }
}
  
// Initialize product row events
function handleAddProductClick() {
  console.log("✅ Add Product button clicked");
  addProductRow("", 1, "add-product-rows-container", "add");
}

document.querySelectorAll(".product-name").forEach((dropdown) => {
  dropdown.addEventListener("click", (e) => {
    console.log("✅ Product dropdown clicked");
    e.stopPropagation(); // Prevent event from propagating to parent elements
  });
});

document.querySelectorAll('[data-bs-toggle="collapse"]').forEach((btn) => {
  btn.addEventListener("click", (e) => {
    console.log("✅ Collapse button clicked");
    e.stopPropagation(); // Prevent event from propagating to parent elements
  });
});

// Add product row dynamically
function addProductRow(
  name = "",
  qty = 1,
  containerId = "add-product-rows-container",
  mode = "add",
  unitRetail = 0,
  totalRetail = 0
) {
  console.log(`Adding product row to container: ${containerId}`);
  const container = document.getElementById(containerId);
  if (!container) return;

  const row = document.createElement("div");
  row.classList.add("row", "g-2", "align-items-center", "mb-1", "product-row");

  const optionsHTML = Object.values(productData).map(p => {
    const selected = p.name === name ? ' selected' : '';
    return `<option value="${p.name.replace(/"/g, '&quot;')}"${selected}>${p.name}</option>`;
  }).join("");

  // Format numbers as $xx.xx strings
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
  attachRowEvents(row, mode);
  calculateAllTotals(mode);
}

function handleEditProductClick() {
  addProductRow("", 1, "edit-product-rows-container", "edit");
}

function attachRowEvents(row, mode = "edit") {
  const prefix = mode === "add" ? "add-" : "edit-";
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

    // Trigger recalculation
    calculateAllTotals(mode);
  }

  nameInput.addEventListener("change", updateTotals);
  qtyInput.addEventListener("change", updateTotals);
  deleteBtn.addEventListener("click", () => {
    row.remove();
    calculateAllTotals(mode);
  });

  updateTotals(); // Auto-trigger
}

function resetProductRows(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`❌ Container with ID "${containerId}" not found.`);
    return;
  }

  // Clear all existing product rows
  container.innerHTML = "";

  // Add one fresh product row
  addProductRow("", 1, containerId, containerId.startsWith("add") ? "add" : "edit");
}

// ✅ Utility functions
function calculateAllTotals(mode = "edit") {
  const prefix = mode === "add" ? "add-" : "edit-";

  let totalProductCost = 0;
  let totalProductRetail = 0;

  // Helper: safely parse currency
  const parseCurrency = (val) =>
    parseFloat(String(val || "0").replace(/[^0-9.-]+/g, "")) || 0;

  // Sum up product rows
  document.querySelectorAll(`#${prefix}product-rows-container .product-row`).forEach(row => {
    const name = row.querySelector(".product-name")?.value.trim() || "";
    const qty = parseFloat(row.querySelector(".product-quantity")?.value) || 0;
    const prod = productData?.[name] || Object.values(productData).find(p => p.name === name);

    if (prod && qty > 0) {
      totalProductCost += prod.cost * qty;
      totalProductRetail += prod.retail * qty;
    }
  });

  // 🔥 Auto-update productCount field
  const productCount = document.querySelectorAll(`#${prefix}product-rows-container .product-row`).length;
  const countEl = document.getElementById(`${prefix}productCount`);
  if (countEl) countEl.value = productCount;


  // Fees and discounts
  const deliveryFee = parseCurrency(document.getElementById(`${prefix}deliveryFee`)?.value);
  const setupFee = parseCurrency(document.getElementById(`${prefix}setupFee`)?.value);
  const otherFee = parseCurrency(document.getElementById(`${prefix}otherFee`)?.value);
  const discount = parseCurrency(document.getElementById(`${prefix}discount`)?.value);
  const deposit = parseCurrency(document.getElementById(`${prefix}deposit`)?.value);

  // Totals calculations
  const addonsTotal = deliveryFee + setupFee + otherFee;
  const subTotal1 = totalProductRetail * 0.08875; // tax
  const subTotal2 = totalProductRetail + subTotal1;
  const subTotal3 = totalProductRetail * (discount / 100);
  const discountedTotal = subTotal2 - subTotal3;
  const grandTotal = subTotal2 - subTotal3 + addonsTotal;
  const balanceDue = grandTotal - deposit;

  // Update all UI fields
  const updateField = (id, value) => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`⚠️ Element with ID "${id}" not found.`);
      return;
    }
    const currencyFormat = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
    
    if (el.tagName === "INPUT") {
      el.value = currencyFormat.format(value);
    } else {
      el.textContent = currencyFormat.format(value);
    }
 };

  updateField(`${prefix}addonsTotal`, addonsTotal);
  updateField(`${prefix}addonsTotal-totals`, addonsTotal);
  updateField(`${prefix}grandTotal`, grandTotal);
  updateField(`${prefix}grandTotal-Addons`, grandTotal);
  // updateField(`${prefix}grandTotal-Totals`, grandTotal);
  updateField(`${prefix}grandTotal-Summary`, grandTotal);
  updateField(`${prefix}balanceDue`, balanceDue);
  updateField(`${prefix}totalProductCost`, totalProductCost);
  updateField(`${prefix}totalProductRetail`, totalProductRetail);
  updateField(`${prefix}subTotal1`, subTotal1);
  updateField(`${prefix}subTotal2`, subTotal2);
  updateField(`${prefix}subTotal3`, subTotal3);
  updateField(`${prefix}discountedTotal`, discountedTotal);
  
  // Update card headers
  updateCardHeaders(mode);
}

function getField(id) {
  const el = document.getElementById(id);
  return (el?.value ?? "").toString().trim();
}

function setField(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value;
  } else {
    console.warn(`⚠️ Element with ID "${id}" not found.`);
  }
}

function recalculateAndUpdateHeaders(mode = "edit") {
  calculateAllTotals(mode);
  updateCardHeaders(mode);
}

function updateDisplayText(id, value, fallback = "") {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value || fallback;
  } else {
    console.warn(`⚠️ Element with ID "${id}" not found.`);
  }
}

function updateCardHeaders(mode = "edit") {
  const prefix = mode === "add" ? "add-" : "edit-";

  // Retrieve values directly from the card body fields
  const addonsTotal = document.getElementById(`${prefix}addonsTotal`)?.textContent || "0.00";
  const grandTotal = document.getElementById(`${prefix}grandTotal`)?.textContent || "0.00";
  const balanceDue = document.getElementById(`${prefix}balanceDue`)?.value || "0.00";
  const totalProductCost = document.getElementById(`${prefix}totalProductCost`)?.textContent || "0.00";
  const totalProductRetail = document.getElementById(`${prefix}totalProductRetail`)?.textContent || "0.00";
  const firstName = document.getElementById(`${prefix}firstName`)?.value || "";
  const lastName = document.getElementById(`${prefix}lastName`)?.value || "";
  const eventDate = document.getElementById(`${prefix}eventDate`)?.value || "";

  // Format values as currency
  const formatCurrency = (value) => {
    const parsedValue = parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0;
    return parsedValue.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  // Update card headers with the values from the card body fields
  updateDisplayText(`${prefix}card1-header-display`, `${firstName} ${lastName}`.trim(), "Client Info");
  updateDisplayText(`${prefix}card2-header-display`, eventDate || "Event Info");
  updateDisplayText(`${prefix}card3-header-display`, formatCurrency(grandTotal));
  updateDisplayText(`${prefix}card4-header-display`, formatCurrency(addonsTotal));
  updateDisplayText(`${prefix}card5-header-display`, formatCurrency(balanceDue));
  updateDisplayText(`${prefix}card6-header-display`, formatCurrency(grandTotal));

  // Update Card 5 body fields
  updateDisplayText(`${prefix}totalProductCost`, formatCurrency(totalProductCost));
  updateDisplayText(`${prefix}totalProductRetail`, formatCurrency(totalProductRetail));
}

function parseCurrency(value) {
  return parseFloat(String(value || "0").replace(/[^0-9.-]+/g, "")) || 0;
}

// work to remove this
function formatPhoneNumber(number) {
  const digits = number.replace(/\D/g, ""); // strip all non-digits
  if (digits.length !== 10) return number; // fallback if it's not a full 10-digit number
  const area = digits.slice(0, 3);
  const mid = digits.slice(3, 6);
  const last = digits.slice(6);
  return `(${area}) ${mid}-${last}`;
}
