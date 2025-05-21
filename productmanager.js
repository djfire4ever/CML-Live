let materialData = {}; // Global material map
const maxParts = 20;
let prodData = [];

// ✅ Show Edit Tab (when clicking a row to edit)
function showEditTab() {
    const editTab = document.querySelector('[data-bs-target="#edit-product"]');
    if (editTab) new bootstrap.Tab(editTab).show();
}

// ✅ DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");
    const searchTabButton = document.querySelector('button[data-bs-target="#search-product"]');
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
    setProdDataForSearch();
    setTimeout(toggleLoader, 500);
});

// ✅ Load Product Data for Search
function setProdDataForSearch() {
    fetch(scriptURL + "?action=getProdDataForSearch")
        .then(res => res.json())
        .then(data => prodData = data.slice())
        .catch(err => console.error("❌ Error loading product data:", err));
}

// ✅ Search Products
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

    const results = input === "" ? [] : prodData.filter(r =>
        searchWords.every(word =>
            searchCols.some(i => r[i]?.toString().toLowerCase().includes(word))
        )
    );

    searchCounter.textContent = input === "" ? "🔍" : `${results.length} Products Found`;
    totalCounter.textContent = `Total Products: ${prodData.length}`;
    searchResultsBox.innerHTML = "";

    const template = document.getElementById("rowTemplate").content;
    results.forEach(r => {
        const row = template.cloneNode(true);
        const tr = row.querySelector("tr");
        tr.classList.add("search-result-row");
        tr.dataset.productid = r[0];

        row.querySelector(".prodID").textContent = r[0];
        row.querySelector(".productName").textContent = r[1];
        row.querySelector(".productType").textContent = r[2];
        row.querySelector(".cost").textContent = r[46];
        row.querySelector(".retail").textContent = r[45];

        row.querySelector(".delete-button").dataset.productid = r[0];
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
        const prodID = target.dataset.productid?.trim();
        if (!prodID) return showToast("⚠️ Product ID missing", "error");

        toggleLoader();
        fetch(scriptURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ system: "products", action: "delete", prodID })
        })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showToast("✅ Product deleted!", "success");
                document.getElementById("searchInput").value = "";
                document.getElementById("searchResults").innerHTML = "";
                setProdDataForSearch();
            } else {
                showToast("⚠️ Could not delete product.", "error");
            }
        })
        .catch(() => showToast("⚠️ Error occurred while deleting product.", "error"))
        .finally(toggleLoader);
        return;
    }

    // Row Click → Edit Tab
    const row = target.closest(".search-result-row");
    if (row) {
        const prodID = row.dataset.productid;
        if (!prodID) return console.error("❌ Error: Missing prodID!");
        populateEditForm(prodID);
        showEditTab();
    }
});

// ✅ Add Tab: When it becomes visible
document.querySelector('button[data-bs-target="#add-product"]')?.addEventListener("shown.bs.tab", () => {
    const partRows = document.getElementById('add-part-rows');
    if (partRows) {
        partRows.innerHTML = '';
        addPartRowTo('add-part-rows');
    }
    initializeAddForm(); // Only if needed
});

// ✅ Load Material Data on Page Ready
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await setMaterialDataForEdit();
    } catch (err) {
        console.error("❌ Failed to load material data", err);
        showToast("❌ Failed to load material data!", "error");
    }
});

// ✅ Fetch Material Data
async function setMaterialDataForEdit() {
    try {
        const response = await fetch(`${scriptURL}?action=getMatDataForSearch`);
        if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
        const rawData = await response.json();

        materialData = {}; // Global assignment

        rawData.forEach(row => {
            const id = row[0]?.trim();
            const name = row[1]?.trim();
            const unitPrice = parseFloat(row[7]?.replace(/[^0-9.]/g, '')) || 0;

            if (id && name) {
                materialData[id] = { matID: id, name, unitPrice };
            }
        });

        const datalist = document.getElementById("row-parts-selector");
        if (datalist) {
            datalist.innerHTML = "";
            Object.values(materialData).forEach(mat => {
                const opt = document.createElement("option");
                opt.value = mat.name;
                datalist.appendChild(opt);
            });
        }

        return true;
    } catch (err) {
        console.error("❌ Error loading materials:", err);
        showToast("❌ Error loading materials!", "error");
        throw err;
    }
}
  
// ✅ Populate Edit Form
async function populateEditForm(prodID) {
  try {
    toggleLoader(true);

    if (Object.keys(materialData).length === 0) await setMaterialDataForEdit();
    if (Object.keys(materialData).length === 0) {
      showToast("⚠️ Material data missing. Please reload the page.", "warning");
      return;
    }

    setField("edit-prodID", prodID);
    document.getElementById("edit-prodID").removeAttribute("readonly");
    setField("edit-prodID-hidden", prodID);
    loadDropdowns();

    const res = await fetch(`${scriptURL}?action=getProductById&prodID=${prodID}`);
    const data = await res.json();
    if (!data || data.error) throw new Error(data?.error || "No product data found");

    ["productName", "productType", "compTime", "retail", "cost", "description"].forEach(field =>
      setField(`edit-${field}`, data[field] || "")
    );

    clearPartRows("edit-part-rows");

    for (let i = 1; i <= maxParts; i++) {
      const name = data[`part${i}`];
      const qty = data[`qty${i}`];
      if (name && qty) {
        const found = Object.values(materialData).find(m => m.name === name);
        if (found) addPartRowTo("edit-part-rows", name, qty);
      }
    }

    calculateTotalProductCost();

    const editPane = document.getElementById("edit-product");
    editPane?.classList.remove("d-none");
    editPane?.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    console.error("❌ Error populating edit form:", err);
    showToast("❌ Error loading product data!", "error");
  } finally {
    toggleLoader(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("save-changes")?.addEventListener("click", async (e) => {
    e.preventDefault();
    toggleLoader();

    // Core fields
    const formData = {
      system: "products",
      action: "edit",
      prodID: getField("edit-prodID"),
      productName: getField("edit-productName"),
      productType: getField("edit-productType"),
      compTime: getField("edit-compTime"),
      description: getField("edit-description"),
      retail: getField("edit-totalProductRetail"),
      cost: getField("edit-totalProductCost")
    };

    // Collect part rows
    const partRows = document.querySelectorAll("#edit-part-rows .part-row");
    let partCount = 0;

    partRows.forEach((row, i) => {
      const part = row.querySelector(".part-input")?.value.trim() || "";
      const qty = row.querySelector(".qty-input")?.value.trim() || "";
      if (part && qty) partCount++;

      formData[`part${i + 1}`] = part;
      formData[`qty${i + 1}`] = qty;
    });

    // If no valid parts entered, show warning
    if (partCount === 0) {
      showToast("⚠️ At least one part and quantity must be provided.", "error");
      toggleLoader();
      return;
    }

    try {
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (result.success) {
        showToast("✅ Product updated!");
        new bootstrap.Tab(document.querySelector('[data-bs-target="#search-product"]')).show();
        // No tab switching — Bootstrap handles that
      } else {
        showToast("❌ Error updating product data!", "error");
      }
    } catch (err) {
      console.error("Edit error:", err);
      showToast("❌ Error updating product data!", "error");
    } finally {
      toggleLoader();
    }
  });
});

async function initializeAddForm() {
  ["add-prodID", "add-productName", "add-productType", "add-compTime", "add-totalProductRetail", "add-totalProductCost", "add-cost", "add-retail", "add-description"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  if (Object.keys(materialData).length === 0) await setMaterialDataForEdit();

  const container = document.getElementById("add-part-rows");
  if (container) {
    container.innerHTML = "";
    addPartRowTo("add-part-rows");
  }
}

addProductForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  toggleLoader();

  try {
    const productName = getField("add-productName");
    const productType = getField("add-productType");
    const compTime = getField("add-compTime");

    const partRows = document.querySelectorAll("#add-part-rows .part-row");
    const partData = [];

    // Add up to 20 parts; fill empty strings for unused
    for (let i = 0; i < 20; i++) {
      const row = partRows[i];
      const part = row?.querySelector(".part-input")?.value?.trim() || "";
      const qty = row?.querySelector(".qty-input")?.value?.trim() || "";
      partData.push(part, qty);
    }

    const description = getField("add-description");
    const retail = getField("add-totalProductRetail");
    const cost = getField("add-totalProductCost");

    const productInfo = [
      productName,
      productType,
      compTime,
      ...partData,
      description,
      retail,
      cost
    ];

    const res = await fetch(`${scriptURL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "products", action: "add", productInfo })
    });

    const result = await res.json();
    if (result.success) {
      showToast("✅ Product added!");
      addProductForm.reset();
      document.getElementById("add-part-rows").innerHTML = ""; // Clear dynamic parts
      setProdDataForSearch();
      new bootstrap.Tab(document.querySelector('[data-bs-target="#search-product"]')).show();
    } else {
      showToast("❌ Error adding product.", "error");
    }

  } catch (err) {
    console.error("Add error:", err);
    showToast("❌ Error adding product.", "error");
  } finally {
    toggleLoader();
  }
});

// Part Row Functions
function addPartRowTo(containerId, name = "", qty = 0) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const mode = container.dataset.mode || ""; // "edit" or "add"

  const matID = Object.keys(materialData).find(id => materialData[id].name === name.trim());
  const mat = materialData[matID] || { name: "", unitPrice: 0 };

  const row = document.createElement("div");
  row.className = "row align-items-center mb-2 part-row";
  row.innerHTML = `
    <div class="col-md-5">
      <input type="text" class="form-control part-input" list="row-parts-selector" placeholder="Select Part"
             value="${mat.name}" data-matid="${matID || ''}">
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control qty-input" value="${qty}">
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control totalRowCost" readonly>
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control totalRowRetail" readonly>
    </div>
    <div class="col-md-1 d-flex">
      <button type="button" class="btn btn-danger btn-sm remove-part"><i class="bi bi-trash"></i></button>
    </div>
  `;

  container.appendChild(row);

  // Hook up logic
  const partInput = row.querySelector(".part-input");
  const qtyInput = row.querySelector(".qty-input");
  const removeBtn = row.querySelector(".remove-part");

  partInput.addEventListener("change", () => calculateAndUpdate(row));
  qtyInput.addEventListener("change", () => calculateAndUpdate(row));
  removeBtn.addEventListener("click", () => {
    row.remove();
    calculateTotalProductCost(mode); // optional mode-based cost update
  });

  if (matID) calculateAndUpdate(row);
}

function clearPartRows(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", () => {
  // Add tab ➕ Part
  document.getElementById("add-partRow")?.addEventListener("click", () => {
    addPartRowTo("add-part-rows");
  });

  // Edit tab ➕ Part
  document.getElementById("edit-partRow")?.addEventListener("click", () => {
    addPartRowTo("edit-part-rows");
  });
});

["Add", "Edit"].forEach(mode => {
  document.getElementById(`add${mode}PartRow`)?.addEventListener("click", () => {
    const containerId = `${mode.toLowerCase()}-part-rows`;
    const count = document.querySelectorAll(`#${containerId} .part-row`).length;
    if (count >= maxParts) {
      showToast("⚠️ Max 20 parts allowed", "warning");
      return;
    }
    addPartRowTo(containerId);
  });
});

// Auto-Calculate Functions
function calculateAndUpdate(row) {
  const name = row.querySelector(".part-input")?.value.trim();
  const qty = parseFloat(row.querySelector(".qty-input")?.value) || 0;

  const matID = Object.keys(materialData).find(id => materialData[id].name === name);
  const material = materialData[matID];

  const costInput = row.querySelector(".totalRowCost");
  const retailInput = row.querySelector(".totalRowRetail");

  if (!material) {
    costInput.value = "";
    retailInput.value = "";
    return;
  }

  const rowCost = qty * parseFloat(material.unitPrice || 0);
  const rowRetail = rowCost * 2.5;

  costInput.value = rowCost.toFixed(2);
  retailInput.value = rowRetail.toFixed(2);
  calculateTotalProductCost();
}

function calculateTotalProductCost() {
  const pane = document.querySelector(".tab-pane.active");
  if (!pane) return;

  let totalCost = 0, totalRetail = 0;

  pane.querySelectorAll(".totalRowCost").forEach(input => {
    totalCost += parseFloat(input.value) || 0;
  });

  pane.querySelectorAll(".totalRowRetail").forEach(input => {
    totalRetail += parseFloat(input.value) || 0;
  });

  const costField = pane.querySelector("[id$='totalProductCost']");
  const retailField = pane.querySelector("[id$='totalProductRetail']");

  if (costField) costField.value = totalCost.toFixed(2);
  if (retailField) retailField.value = totalRetail.toFixed(2);

  // FIXED: Update badge count dynamically based on active pane
  const partRowsContainer = pane.querySelector("[id$='part-rows']");
  // The badge ID uses either "add-" or "edit-" prefix
  const badgeId = pane.id.startsWith("add") ? "add-partrow-header-display" : "edit-partrow-header-display";
  const badge = document.getElementById(badgeId);

  if (partRowsContainer && badge) {
    const count = partRowsContainer.querySelectorAll(".part-row").length;
    badge.textContent = `Parts - ${count}`;
  }
}

// ✅ Utility functions
function getField(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function setField(id, value = "") {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function updatePartsBadgeCount() {
  const pane = document.querySelector(".tab-pane.active");
  if (!pane) return;
  
  // Count part rows inside the active pane
  const partRows = pane.querySelectorAll(".part-row");
  const badge = document.getElementById("add-partrow-header-display");
  if (badge) {
    badge.textContent = `Parts - ${partRows.length}`;
  }
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

