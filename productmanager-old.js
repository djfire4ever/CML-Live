let materialData = {}; // Global material map
const maxParts = 15;
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

function setProdDataForSearch() {
  fetch(scriptURL + "?action=getProdDataForSearch")
    .then(res => res.json())
    .then(data => {
      prodData = data.map(product => {
        let parts = [];
        try {
          parts = product[4] ? JSON.parse(product[4]) : [];
        } catch (e) {
          console.error("❌ Failed to parse partsJSON for product", product[0], e);
        }

        return {
          prodID: product[0],          // Column A
          productName: product[1],     // Column B
          productType: product[2],     // Column C
          compTime: product[3],        // Column D
          parts,                       // Column E (JSON)
          description: product[5],     // Column F
          cost: product[6],            // Column G
          retail: product[7],          // Column H
          raw: product
        };
      });
    })
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

  const results = input === "" ? [] : prodData.filter(product =>
    searchWords.every(word =>
      [product.prodID, product.productName, product.productType]
        .some(field => field?.toString().toLowerCase().includes(word))
    )
  );

  searchCounter.textContent = input === "" ? "🔍" : `${results.length} Products Found`;
  totalCounter.textContent = `Total Products: ${prodData.length}`;
  searchResultsBox.innerHTML = "";

  const template = document.getElementById("rowTemplate").content;
  results.forEach(product => {
    const row = template.cloneNode(true);
    const tr = row.querySelector("tr");
    tr.classList.add("search-result-row");
    tr.dataset.productid = product.prodID;

    row.querySelector(".prodID").textContent = product.prodID;
    row.querySelector(".productName").textContent = product.productName;
    row.querySelector(".productType").textContent = product.productType;
    row.querySelector(".cost").textContent = formatCurrency(product.cost);
    row.querySelector(".retail").textContent = formatCurrency(product.retail);

    row.querySelector(".delete-button").dataset.productid = product.prodID;
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

    // Fill core fields
    ["productName", "productType", "compTime", "retail", "cost", "description"].forEach(field => {
      let value = data[field] || "";
      if (["cost", "retail"].includes(field)) value = formatCurrency(value);
      setField(`edit-${field}`, value);
      });

    // Clear and rebuild part rows
    clearPartRows("edit-part-rows");
    const parts = JSON.parse(data.partsJSON || "[]");

    parts.forEach(part => {
      if (part.matName && part.qty) {
        const found = Object.values(materialData).find(m => m.name === part.matName);
        if (found) addPartRowTo("edit-part-rows", part.matName, part.qty);
      }
    });

    calculateTotalProductCost();

    document.getElementById("edit-product")?.classList.remove("d-none");
    document.getElementById("edit-product")?.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    console.error("❌ Error populating edit form:", err);
    showToast("❌ Error loading product data!", "error");
  } finally {
    toggleLoader(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("save-changes");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    toggleLoader();

    // Step 1: Gather core info
    const prodID = getField("edit-prodID");
    const productInfo = {
      productName: getField("edit-productName"),
      productType: getField("edit-productType"),
      compTime: getField("edit-compTime"),
      description: getField("edit-description"),
      retail: getField("edit-totalProductRetail"),
      cost: getField("edit-totalProductCost")
    };

    // Step 2: Collect parts into partsJSON
    const partRows = document.querySelectorAll("#edit-part-rows .part-row");
    const parts = [];

    partRows.forEach(row => {
      const part = row.querySelector(".part-input")?.value.trim();
      const qty = row.querySelector(".qty-input")?.value.trim();
      if (part && qty) {
        parts.push({ matName: part, qty });
      }
    });

    if (parts.length === 0) {
      showToast("⚠️ At least one part and quantity must be provided.", "error");
      toggleLoader();
      return;
    }

    productInfo.partsJSON = JSON.stringify(parts);

    const formData = {
      system: "products",
      action: "edit",
      prodID,
      productInfo
    };

    // Step 3: Submit
    try {
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      if (result.success) {
        showToast(result.data || "✅ Product updated!");
        const tabTarget = document.querySelector('[data-bs-target="#search-product"]');
        if (tabTarget) new bootstrap.Tab(tabTarget).show();
      } else {
        showToast(result.message || "❌ Error updating product data!", "error");
      }
    } catch (err) {
      console.error("🚨 Edit error:", err);
      showToast("❌ Error updating product data!", "error");
    } finally {
      toggleLoader();
    }
  });
});

async function initializeAddForm() {
  // Reset all input fields
  [
    "add-prodID",
    "add-productName",
    "add-productType",
    "add-compTime",
    "add-totalProductRetail",
    "add-totalProductCost",
    "add-cost",
    "add-retail",
    "add-description"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  // Load materials for autocomplete
  if (Object.keys(materialData).length === 0) {
    await setMaterialDataForEdit();
  }

  // Abort if still missing
  if (Object.keys(materialData).length === 0) {
    showToast("⚠️ Material data missing. Try reloading.", "warning");
    return;
  }

  // Reset part rows and add one blank
  const container = document.getElementById("add-part-rows");
  if (container) {
    container.innerHTML = "";
    addPartRowTo("add-part-rows");
  }

  // Reset badge count
  const badge = document.getElementById("add-partrow-header-display");
  if (badge) badge.textContent = "Parts - 1";
}

addProductForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  toggleLoader();

  try {
    const productName = getField("add-productName");
    const productType = getField("add-productType");
    const compTime = getField("add-compTime");
    const description = getField("add-description");
    const retail = getField("add-totalProductRetail");
    const cost = getField("add-totalProductCost");

    // Gather all parts into an array of objects
    const partRows = document.querySelectorAll("#add-part-rows .part-row");
    const parts = [];

    partRows.forEach(row => {
      const matName = row.querySelector(".part-input")?.value.trim();
      const qty = row.querySelector(".qty-input")?.value.trim();
      if (matName && qty) {
        parts.push({ matName, qty });
      }
    });

    if (parts.length === 0) {
      showToast("⚠️ At least one part and quantity must be provided.", "error");
      toggleLoader();
      return;
    }

    // Final array to send
    const productInfo = [
      productName,
      productType,
      compTime,
      JSON.stringify(parts),  // partsJSON goes into column 5
      description,
      cost,
      retail
    ];

    const res = await fetch(`${scriptURL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "products",
        action: "add",
        productInfo  // now matches what addProduct() expects
      })
    });

    const result = await res.json();
    if (result.success) {
      showToast("✅ Product added!");
      addProductForm.reset();
      document.getElementById("add-part-rows").innerHTML = "";
      addPartRowTo("add-part-rows");  // re-init with one blank row
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

  // Round unit price up to next $0.10
  const roundedUnitPrice = Math.ceil((parseFloat(material.unitPrice || 0)) * 10) / 10;
  const rowCost = roundedUnitPrice * qty;
  const rowRetail = rowCost * 2;

  costInput.value = formatCurrency(rowCost);
  retailInput.value = formatCurrency(rowRetail);
  calculateTotalProductCost();
}

function calculateTotalProductCost() {
  const pane = document.querySelector(".tab-pane.active");
  if (!pane) return;

  let totalCost = 0, totalRetail = 0;

  // ...inside calculateTotalProductCost()...
  pane.querySelectorAll(".totalRowCost").forEach(input => {
    const val = parseFloat((input.value || "0").replace(/[^0-9.\-]/g, ""));
    totalCost += isNaN(val) ? 0 : val;
  });
  
  pane.querySelectorAll(".totalRowRetail").forEach(input => {
    const val = parseFloat((input.value || "0").replace(/[^0-9.\-]/g, ""));
    totalRetail += isNaN(val) ? 0 : val;
  });

  const costField = pane.querySelector("[id$='totalProductCost']");
  const retailField = pane.querySelector("[id$='totalProductRetail']");

  if (costField) costField.value = formatCurrency(totalCost);
  if (retailField) retailField.value = formatCurrency(totalRetail);


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

function formatCurrency(num) {
  return `$${parseFloat(num).toFixed(2)}`;
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

