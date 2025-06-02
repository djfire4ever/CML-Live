let materialData = {};
const maxParts = 15;
const retailMultiplier = 2.0;
let prodData = [];

// ✅ DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("searchInput");

    if (searchInput) {
        searchInput.addEventListener("input", search);
    } else {
        console.error("❌ Search input not found!");
    }

    // ✅ Search Tab
    document.querySelector('button[data-bs-target="#search-product"]')?.addEventListener("shown.bs.tab", () => {
        const searchInput = document.getElementById("searchInput");
        const searchResultsBox = document.getElementById("searchResults");
        const searchCounter = document.getElementById("searchCounter");

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

    // ✅ Add Tab (FULLY INLINE)
    document.querySelector('button[data-bs-target="#add-product"]')?.addEventListener("shown.bs.tab", () => {
        const partRows = document.getElementById("add-part-rows");

        // Reset form first (so no clearing happens after)
        document.getElementById("addProductForm")?.reset();

        // Clear inputs except those inside part rows container
        const inputsToClear = document.querySelectorAll("#add-product input:not(#add-part-rows input), #add-product textarea:not(#add-part-rows textarea)");
        inputsToClear.forEach(input => input.value = "");

        // Now clear part rows container and add initial row with qty=1
        if (partRows) {
            partRows.innerHTML = "";
            addPartRowTo("add-part-rows", "", 1);
        }

        // Reset cost and retail previews
        const costPreview = document.getElementById("costPreview");
        const retailPreview = document.getElementById("retailPreview");
        if (costPreview) costPreview.textContent = "$0.00";
        if (retailPreview) retailPreview.textContent = "$0.00";
    });

    // ✅ Edit Tab (Still placeholder unless you need logic inline too)
    document.querySelector('button[data-bs-target="#edit-product"]')?.addEventListener("shown.bs.tab", () => {
        console.log("✏️ Edit tab shown – insert inline logic here if needed");
    });

    // ✅ Load initial data
    toggleLoader();
    setProdDataForSearch();
    setTimeout(toggleLoader, 500);

    fetch(`${scriptURL}?action=getMatDataForSearch`)
        .then(res => res.json())
        .then(rawData => {
            materialData = {};
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
        })
        .catch(err => {
            console.error("❌ Error loading materials:", err);
            showToast("❌ Error loading materials!", "error");
        });
});

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
        row.querySelector(".cost").textContent = Number(r[46]).toLocaleString("en-US", { style: "currency", currency: "USD" });
        row.querySelector(".retail").textContent = Number(r[45]).toLocaleString("en-US", { style: "currency", currency: "USD" });
        row.querySelector(".delete-button").dataset.productid = r[0];

        // ✅ Add this line to handle edit action:
        tr.addEventListener("click", () => editProductById(r[0]));

        searchResultsBox.appendChild(row);
    });

    toggleLoader();
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

// ✅ Unified Edit Handler
async function editProductById(prodID) {
  if (!prodID) return;

  try {
    toggleLoader(true);

    const res = await fetch(`${scriptURL}?system=products-new&action=getById&prodID=${prodID}`);
    const product = await res.json();

    if (product.error) {
      showToast(product.error, "error");
      return;
    }

    // Fill static form fields
    document.getElementById("edit-prodID").value = product.prodID || "";
    setField("edit-productName", product.productName || "");
    setField("edit-productType", product.productType || "");
    setField("edit-compTime", product.compTime || "");
    setField("edit-description", product.description || "");
    // setField("edit-totalProductCost", Number(product.cost || 0).toFixed(2));
    // setField("edit-totalProductRetail", Number(product.retail || 0).toFixed(2));

    // Clear existing part rows
    clearPartRows("edit-part-rows");

    // Parse parts array from backend
    let parts = [];
    try {
      parts = JSON.parse(product.partsJSON || "[]");
    } catch (err) {
      console.warn("⚠️ Could not parse partsJSON:", product.partsJSON);
    }

    // Add part rows, keep track for calculation
    const rows = [];
    for (const part of parts) {
      const matName = materialData[part.matID]?.name || "";
      const row = addPartRowTo("edit-part-rows", part.matName || "", part.qty || 1);
      if (row) {
        calculateAndUpdate(row);
        rows.push(row);
      }
    }
    calculateTotalProductCost("edit");
    updatePartsBadgeCount("edit");

    // Activate the edit tab
    const tabTrigger = document.querySelector('[data-bs-target="#edit-product"]');
    if (tabTrigger) new bootstrap.Tab(tabTrigger).show();

  } catch (err) {
    console.error("❌ Error loading product:", err);
    showToast("❌ Error loading product data!", "error");
  } finally {
    toggleLoader(false);
  }
}

// ✅ Utility functions
function getField(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function setField(id, value = "") {
  const el = document.getElementById(id);
  if (el) {
    if (id.endsWith("totalProductCost") || id.endsWith("totalProductRetail")) {
      el.value = Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
    } else {
      el.value = value;
    }
  }
}
// Part Row Functions
function addPartRowTo(containerId, partName = "", qty = 1) {
  const container = document.getElementById(containerId);
  if (!container) return null;

  // Determine mode based on containerId
  const mode = containerId.startsWith("add-") ? "add" : "edit";

  const quantity = (qty === undefined || qty === null) ? 1 : qty;

  const row = document.createElement("div");
  row.className = "row mb-2 part-row";

  row.innerHTML = `
    <div class="col-md-5">
      <input type="text" class="form-control part-input" list="row-parts-selector" value="${partName}" />
    </div>
    <div class="col-md-2">
      <input type="number" class="form-control qty-input" min="0" step="1" value="${quantity}" />
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control totalRowCost" readonly />
    </div>
    <div class="col-md-2">
      <input type="text" class="form-control totalRowRetail" readonly />
    </div>
    <div class="col-md-1 d-flex align-items-center">
      <button type="button" class="btn btn-sm btn-danger" 
        onclick="this.closest('.part-row').remove(); calculateTotalProductCost('${mode}'); updatePartsBadgeCount('${mode}');">
        🗑️
      </button>
    </div>
  `;

  container.appendChild(row);

  const partInput = row.querySelector(".part-input");
  const qtyInput = row.querySelector(".qty-input");

  if (qtyInput) {
    qtyInput.value = quantity;
  }

  if (partInput) {
    partInput.addEventListener("change", () => {
      calculateAndUpdate(row);
      calculateTotalProductCost(mode);
      updatePartsBadgeCount(mode);
    });
  }

  if (qtyInput) {
    qtyInput.addEventListener("change", () => {
      calculateAndUpdate(row);
      calculateTotalProductCost(mode);
      updatePartsBadgeCount(mode);
    });
  }

  // Initial calculation for the new row
  if (partName || qty !== undefined) {
    calculateAndUpdate(row);
    calculateTotalProductCost(mode);
    updatePartsBadgeCount(mode);
  }

  return row;
}

function clearPartRows(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
}

document.addEventListener("DOMContentLoaded", () => {
  // Add tab ➕ Part
  document.getElementById("add-partRow")?.addEventListener("click", () => {
    addPartRowTo("add-part-rows", "", 1);
  });

  // Edit tab ➕ Part
  document.getElementById("edit-partRow")?.addEventListener("click", () => {
    addPartRowTo("edit-part-rows");
  });
});

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
  const rowRetail = rowCost * retailMultiplier;

  costInput.value = rowCost.toLocaleString("en-US", { style: "currency", currency: "USD" });
  retailInput.value = rowRetail.toLocaleString("en-US", { style: "currency", currency: "USD" });

  // Removed: calculateTotalProductCost();
}

function calculateTotalProductCost(mode = "edit") {
  const prefix = mode === "add" ? "add-" : "edit-";
  let totalCost = 0;
  let totalRetail = 0;

  const rows = document.querySelectorAll(`#${prefix}part-rows .part-row`);

  rows.forEach(row => {
    const costInput = row.querySelector(".totalRowCost");
    const retailInput = row.querySelector(".totalRowRetail");

    const cost = parseFloat(costInput?.value.replace(/[^0-9.-]+/g, "") || 0);
    const retail = parseFloat(retailInput?.value.replace(/[^0-9.-]+/g, "") || 0);

    totalCost += cost;
    totalRetail += retail;
  });

  const costField = document.getElementById(`${prefix}totalProductCost`);
  const retailField = document.getElementById(`${prefix}totalProductRetail`);
  if (costField) costField.value = totalCost.toLocaleString("en-US", { style: "currency", currency: "USD" });
  if (retailField) retailField.value = totalRetail.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function updatePartsBadgeCount(mode = "edit") {
  const prefix = mode === "add" ? "add-" : "edit-";
  const badgeId = `${prefix}partrow-header-display`;
  const partRowsContainer = document.getElementById(`${prefix}part-rows`);
  const totalRetailField = document.getElementById(`${prefix}totalProductRetail`);
  const badge = document.getElementById(badgeId);

  if (!badge || !partRowsContainer || !totalRetailField) return;

  const count = partRowsContainer.querySelectorAll(".part-row").length;
  // FIX: Strip non-numeric characters for correct parsing
  const retailValue = parseFloat(
    (totalRetailField.value || "0").replace(/[^0-9.-]+/g, "")
  ) || 0;

  const retailFormatted = retailValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  badge.textContent = `Parts - ${count} • ${retailFormatted}`;
}

// Edit Form Save Logic
document.addEventListener("DOMContentLoaded", () => {
  const saveBtn = document.getElementById("save-changes");
  if (!saveBtn) return;

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    toggleLoader(true);

    // Gather product core info
    const formData = {
      system: "products-new",  // Make sure this matches your backend
      action: "edit",
      prodID: getField("edit-prodID"),  // Use visible readonly input ONLY
      productInfo: {
        productName: getField("edit-productName"),
        productType: getField("edit-productType"),
        compTime: getField("edit-compTime"),
        description: getField("edit-description"),
        totalRetail: parseFloat(getField("edit-totalProductRetail").replace(/[^0-9.-]+/g, "")) || 0,
        totalCost: parseFloat(getField("edit-totalProductCost").replace(/[^0-9.-]+/g, "")) || 0,
        parts: []  // We’ll build this array next
      }
    };

    // Collect parts info from part rows
    const partRows = document.querySelectorAll("#edit-part-rows .part-row");
    let partCount = 0;

    partRows.forEach(row => {
      const partName = row.querySelector(".part-input")?.value.trim() || "";
      const qtyStr = row.querySelector(".qty-input")?.value.trim() || "";
      const qty = Number(qtyStr);

      if (partName && qty > 0) {
        partCount++;
        formData.productInfo.parts.push({ matName: partName, qty });  // Adjust keys to match backend
      }
    });

    if (partCount === 0) {
      showToast("⚠️ At least one part and quantity must be provided.", "error");
      toggleLoader(false);
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
      const { prodID, cost, retail } = result.data || {};
      showToast(`✅ Product ${prodID} updated. Cost: $${cost}, Retail: $${retail}`);
      const tabTarget = document.querySelector('[data-bs-target="#search-product"]');
      if (tabTarget) new bootstrap.Tab(tabTarget).show();
      } else {
        showToast(result.message || "❌ Error updating product data!", "error");
      }
    } catch (err) {
      console.error("🚨 Edit error:", err);
      showToast("❌ Error updating product data!", "error");
    } finally {
      toggleLoader(false);
    }
  });
});

async function initializeAddForm() {
  // Clear all static input fields
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

  // Load materials data if not loaded yet
  if (Object.keys(materialData).length === 0) {
    await setMaterialDataForEdit();
  }

  // Reset part rows and add one empty row by default
  const container = document.getElementById("add-part-rows");
  if (container) {
    container.innerHTML = "";
    addPartRowTo("add-part-rows", "", 1); // empty part name, default qty = 1
  }

  // Reset part count badge and totals
  updatePartsBadgeCount("add");
  calculateTotalProductCost("add");
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

    const parts = [];
    partRows.forEach(row => {
      const part = row?.querySelector(".part-input")?.value?.trim();
      const qty = row?.querySelector(".qty-input")?.value?.trim();
      if (part && qty) parts.push({ name: part, qty: Number(qty) });
    });

    const productInfo = {
      productName,
      productType,
      compTime,
      description,
      parts,
      totalCost: Number(cost),
      totalRetail: Number(retail)
    };

    const res = await fetch(`${scriptURL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "products-new", action: "add", productInfo })
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

