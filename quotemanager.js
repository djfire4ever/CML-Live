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
      row.querySelector(".firstName").textContent = r[2];
      row.querySelector(".lastName").textContent = r[3];
      row.querySelector(".eventDate").textContent = r[9];
  
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

// Handle row click for editing
const row = target.closest("tr");
if (row && row.dataset.quoteid && !target.closest(".btn-group")) {
    const qtID = row.dataset.quoteid;
    populateEditForm(qtID);
    showEditTab();
    return;
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

function handleAddProductClick() {
  console.log("✅ Add Product button clicked");
  addProductRow("", 1, "add-product-rows-container", "add");
}

function handleEditProductClick() {
  addProductRow("", 1, "edit-product-rows-container", "edit");
}

async function populateEditForm(qtID) {
  const response = await fetch(`/getQuoteById?id=${qtID}`);
  const quoteData = await response.json();

  if (!quoteData) {
    console.error("❌ No quote data returned.");
    return;
  }

  const setField = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  // 🌐 General Info
  setField("edit-qtID", quoteData.qtID);
  setField("edit-quoteDate", quoteData.quoteDate);
  setField("edit-phone", quoteData.phone);
  setField("edit-firstName", quoteData.firstName);
  setField("edit-lastName", quoteData.lastName);
  setField("edit-email", quoteData.email);
  setField("edit-street", quoteData.street);
  setField("edit-city", quoteData.city);
  setField("edit-state", quoteData.state);
  setField("edit-zip", quoteData.zip);
  setField("edit-eventDate", quoteData.eventDate);
  setField("edit-eventLocation", quoteData.eventLocation);

  // 📦 Product/Cost Summary
  setField("edit-productCount", quoteData.productCount);
  setField("edit-deliveryFee", quoteData.deliveryFee);
  setField("edit-setupFee", quoteData.setupFee);
  setField("edit-otherFee", quoteData.otherFee);
  setField("edit-addonsTotal", quoteData.addonsTotal);
  setField("edit-deposit", quoteData.deposit);
  setField("edit-depositDate", quoteData.depositDate);
  setField("edit-balanceDue", quoteData.balanceDue);
  setField("edit-balanceDueDate", quoteData.balanceDueDate);
  setField("edit-paymentMethod", quoteData.paymentMethod);
  setField("edit-dueDate", quoteData.dueDate);

  // 💵 Totals
  setField("edit-totalProductCost", quoteData.totalProductCost);
  setField("edit-totalProductRetail", quoteData.totalProductRetail);
  setField("edit-subTotal1", quoteData.subTotal1);
  setField("edit-subTotal2", quoteData.subTotal2);
  setField("edit-subTotal3", quoteData.subTotal3);
  setField("edit-discount", quoteData.discount);
  setField("edit-discountedTotal", quoteData.discountedTotal);
  setField("edit-grandTotal", quoteData.grandTotal);

  // 📝 Notes & Invoice
  setField("edit-quoteNotes", quoteData.quoteNotes);
  setField("edit-eventNotes", quoteData.eventNotes);
  setField("edit-invoiceID", quoteData.invoiceID);
  setField("edit-invoiceDate", quoteData.invoiceDate);
  setField("edit-invoiceUrl", quoteData.invoiceUrl);

  // 🧾 Products
  const container = document.getElementById("edit-product-rows-container");
  container.innerHTML = ""; // Clear old rows

  quoteData.products.forEach((product, index) => {
    const row = createProductRow("edit", index + 1);
    row.querySelector(".product-name").value = product.name || "";
    row.querySelector(".product-qty").value = product.quantity || 0;
    row.querySelector(".product-unitprice").value = product.unitPrice || 0;
    row.querySelector(".product-total").value = product.totalRowRetail || 0;
    container.appendChild(row);
  });

  calculateAllTotals("edit");
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

// ✅ Edit Quote Form Save
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("save-changes");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    toggleLoader(true);

    try {
      // Define mode explicitly (use "add" for Add form if needed)
      const mode = "edit"; // Change to "add" if saving for Add form

      // Get phone number (formatted or not)
      const phoneInput = getField(`${mode}-phone`);
      let phoneValue = phoneInput.trim();

      // Remove non-digit characters to store raw phone number in the backend
      const rawPhone = phoneValue.replace(/\D/g, "");

      // Build core form data
      const formData = {
        system: "quotes",
        action: mode,
        qtID: getField(`${mode}-qtID`),
        quoteDate: getField(`${mode}-quoteDate`),
        phone: rawPhone,
        firstName: getField(`${mode}-firstName`),
        lastName: getField(`${mode}-lastName`),
        email: getField(`${mode}-email`),
        street: getField(`${mode}-street`),
        city: getField(`${mode}-city`),
        state: getField(`${mode}-state`),
        zip: getField(`${mode}-zip`),
        eventDate: getField(`${mode}-eventDate`),
        eventLocation: getField(`${mode}-eventLocation`),
        productCount: getField(`${mode}-productCount`),
        deliveryFee: getField(`${mode}-deliveryFee`),
        setupFee: getField(`${mode}-setupFee`),
        otherFee: getField(`${mode}-otherFee`),
        addonsTotal: getField(`${mode}-addonsTotal`),
        deposit: getField(`${mode}-deposit`),
        depositDate: getField(`${mode}-depositDate`),
        balanceDue: getField(`${mode}-balanceDue`),
        balanceDueDate: getField(`${mode}-balanceDueDate`),
        paymentMethod: getField(`${mode}-paymentMethod`),
        dueDate: getField(`${mode}-dueDate`),
        totalProductCost: getField(`${mode}-totalProductCost`),
        totalProductRetail: getField(`${mode}-totalProductRetail`),
        subTotal1: getField(`${mode}-subTotal1`),
        subTotal2: getField(`${mode}-subTotal2`),
        subTotal3: getField(`${mode}-subTotal3`),
        discount: getField(`${mode}-discount`),
        discountedTotal: getField(`${mode}-discountedTotal`),
        grandTotal: getField(`${mode}-grandTotal`),
        quoteNotes: getField(`${mode}-quoteNotes`),
        eventNotes: getField(`${mode}-eventNotes`),
        invoiceID: getField(`${mode}-invoiceID`),
        invoiceDate: getField(`${mode}-invoiceDate`),
        invoiceUrl: getField(`${mode}-invoiceUrl`)
      };

      // 🔍 Parse and validate product rows
      const partRows = document.querySelectorAll(
        `#${mode === "add" ? "add-product-rows-container" : "edit-product-rows-container"} .product-row`
      );
      const parts = {};
      let validCount = 0;

      partRows.forEach((row, index) => {
        const name = row.querySelector(".product-name")?.value.trim();
        const qty = row.querySelector(".product-quantity")?.value.trim();
        const unitPrice = row.querySelector(".product-unitprice")?.value.trim();
        const totalRetail = row.querySelector(".product-total")?.value.trim();

      if (name && qty && parseFloat(qty) > 0) {
        const i = index + 1;
        parts[`part${i}`] = name;
        parts[`qty${i}`] = qty;
        parts[`unitPrice${i}`] = unitPrice;
        parts[`totalRowRetail${i}`] = totalRetail;
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
        body: JSON.stringify(formData),
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

// Preview Quote
async function previewInvoiceFromForm() {
  toggleLoader(true);

  try {
    const mode = "edit"; // or "add" depending on context

    const phoneInput = getField(`${mode}-phone`);
    const rawPhone = phoneInput.replace(/\D/g, "");

    const formData = {
      system: "quotes",
      action: "preview", // not "add" or "edit"
      qtID: getField(`${mode}-qtID`),
      quoteDate: getField(`${mode}-quoteDate`),
      phone: rawPhone,
      firstName: getField(`${mode}-firstName`),
      lastName: getField(`${mode}-lastName`),
      email: getField(`${mode}-email`),
      street: getField(`${mode}-street`),
      city: getField(`${mode}-city`),
      state: getField(`${mode}-state`),
      zip: getField(`${mode}-zip`),
      eventDate: getField(`${mode}-eventDate`),
      eventLocation: getField(`${mode}-eventLocation`),
      productCount: getField(`${mode}-productCount`),
      deliveryFee: getField(`${mode}-deliveryFee`),
      setupFee: getField(`${mode}-setupFee`),
      otherFee: getField(`${mode}-otherFee`),
      addonsTotal: getField(`${mode}-addonsTotal`),
      deposit: getField(`${mode}-deposit`),
      depositDate: getField(`${mode}-depositDate`),
      balanceDue: getField(`${mode}-balanceDue`),
      balanceDueDate: getField(`${mode}-balanceDueDate`),
      paymentMethod: getField(`${mode}-paymentMethod`),
      dueDate: getField(`${mode}-dueDate`),
      totalProductCost: getField(`${mode}-totalProductCost`),
      totalProductRetail: getField(`${mode}-totalProductRetail`),
      subTotal1: getField(`${mode}-subTotal1`),
      subTotal2: getField(`${mode}-subTotal2`),
      subTotal3: getField(`${mode}-subTotal3`),
      discount: getField(`${mode}-discount`),
      discountedTotal: getField(`${mode}-discountedTotal`),
      grandTotal: getField(`${mode}-grandTotal`),
      quoteNotes: getField(`${mode}-quoteNotes`),
      eventNotes: getField(`${mode}-eventNotes`),
      invoiceID: getField(`${mode}-invoiceID`),
      invoiceDate: getField(`${mode}-invoiceDate`),
      invoiceUrl: getField(`${mode}-invoiceUrl`)
    };

    const partRows = document.querySelectorAll(
      `#${mode === "add" ? "add-product-rows-container" : "edit-product-rows-container"} .product-row`
    );

    let validCount = 0;
    const parts = {};

    partRows.forEach((row, index) => {
      const name = row.querySelector(".product-name")?.value.trim();
      const qty = row.querySelector(".product-quantity")?.value.trim();
      const unitPrice = row.querySelector(".product-unitprice")?.value.trim();
      const totalRetail = row.querySelector(".product-total")?.value.trim();

      if (name && qty && parseFloat(qty) > 0) {
        const i = index + 1;
        parts[`part${i}`] = name;
        parts[`qty${i}`] = qty;
        parts[`unitPrice${i}`] = unitPrice;
        parts[`totalRowRetail${i}`] = totalRetail;
        validCount++;
      }
    });

    if (validCount === 0) {
      showToast("⚠️ At least one product must be entered.", "error");
      return;
    }

    Object.assign(formData, parts);

    // 🔄 Send formData to the Web App preview endpoint
    const res = await fetch("https://script.google.com/macros/s/___YOUR_DEPLOYED_URL___/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    const result = await res.json();

    if (result.status === "success") {
      window.open(result.url, "_blank");
    } else {
      showToast("❌ Failed to generate invoice preview.", "error");
      console.error(result.message);
    }

  } catch (err) {
    console.error("❌ Preview error:", err);
    showToast("❌ Preview failed.", "error");
  } finally {
    toggleLoader(false);
  }
}

// Add Quote Form
// 1) Initialize Add-Quote Form

// document.getElementById("add-product-btn")?.addEventListener("click", () =>
//   addProductRow("", 1, "add-product-rows-container", "add")
// );

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

  document.getElementById("add-phone").addEventListener("change", async () => {
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

// Initialize product row events
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

// Add product row dynamically
function addProductRow(name = "", qty = 1, containerId = "add-product-rows-container", mode = "add") {
  console.log(`Adding product row to container: ${containerId}`);
  const container = document.getElementById(containerId);
  if (!container) return;

  const row = document.createElement("div");
  row.classList.add("row", "g-2", "align-items-center", "mb-1", "product-row");

  const optionsHTML = Object.values(productData).map(p => {
    const selected = p.name === name ? ' selected' : '';
    return `<option value="${p.name.replace(/"/g, '&quot;')}"${selected}>${p.name}</option>`;
  }).join("");

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
      <input type="text" class="form-control text-end totalRowCost" value="$0.00" readonly>
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control text-end totalRowRetail" value="$0.00" readonly>
    </div>
    <div class="col-md-1">
      <button type="button" class="btn btn-danger btn-sm remove-part">
        <i class="bi bi-trash"></i>
      </button>
    </div>
  `;

  container.appendChild(row);
  attachRowEvents(row, mode);

  // Trigger recalculation immediately
  calculateAllTotals(mode);
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

// document.addEventListener("DOMContentLoaded", () => {
//   // Watch all fields that affect calculations
//   const fieldsToWatch = [
//     "edit-deliveryFee",
//     "edit-setupFee",
//     "edit-otherFee",
//     "edit-discount",
//     "edit-deposit",
//     "add-deliveryFee",
//     "add-setupFee",
//     "add-otherFee",
//     "add-discount",
//     "add-deposit",
//     "add-phone",
//     "add-eventDate",
//     "edit-eventDate",
//     "edit-phone",
//   ];

//   fieldsToWatch.forEach(fieldId => {
//     document.getElementById(fieldId)?.addEventListener("change", () => {
//       const mode = fieldId.startsWith("add") ? "add" : "edit";
//       calculateAllTotals(mode);
//     });
//   });

  // Attach event listeners to product rows
//   document.querySelectorAll(".product-row").forEach(row => {
//     attachRowEvents(row, "edit");
//   });

//   // Add specific listeners for Add and Edit product buttons
//   document.getElementById("add-product-btn")?.addEventListener("click", () => {
//     addProductRow("", 1, "add-product-rows-container", "add");
//   });

//   document.getElementById("edit-product-btn")?.addEventListener("click", () => {
//     addProductRow("", 1, "product-rows-container", "edit");
//   });
// });

