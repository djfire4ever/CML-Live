let materialData = [];

async function setMatDataForSearch() {
  try {
    const res = await fetch(`${scriptURL}?action=getMatDataForSearch`);
    const data = await res.json();
    materialData = Array.isArray(data) ? data.slice() : [];
  } catch (err) {
    console.error("❌ Error loading material data:", err);
    materialData = [];
  }
}

console.log("Test call:", typeof setMatDataForSearch);

document.addEventListener("DOMContentLoaded", async () => {
  console.log("📦 MaterialManager module loaded");

  const container = document.getElementById("materialRows");
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const saveBtn = document.getElementById("save-inventory-btn");

  // Initial load of material data for search
  toggleLoader(true);
  await setMatDataForSearch(); // used by edit and search
  toggleLoader(false);

  // Live search
  searchInput?.addEventListener("input", search);

  // ⚙️ Tab Switching Logic
  document.addEventListener("shown.bs.tab", async (e) => {
    const target = e.target.getAttribute("data-bs-target");

    if (target === "#search-material") {
      if (searchInput) searchInput.value = "";
      if (resultsBox) resultsBox.innerHTML = "";
      const counter = document.getElementById("searchCounter");
      if (counter) counter.textContent = "";
      searchInput?.focus();
    }

    if (target === "#add-material") {
      const priceInput = document.getElementById("add-matPrice");
      const qtyInput = document.getElementById("add-unitQty");
      const unitPriceInput = document.getElementById("add-unitPrice");

      const recalculate = () => {
        const price = parseFloat(priceInput?.value) || 0;
        const qty = parseFloat(qtyInput?.value) || 0;
        const unitPrice = qty > 0 ? price / qty : 0;
        if (unitPriceInput) unitPriceInput.value = unitPrice.toFixed(2);
      };

      priceInput?.addEventListener("change", recalculate);
      qtyInput?.addEventListener("change", recalculate);
    }

    if (target === "#add-inventory") {
      console.log("📦 Switching to Add Inventory tab");

      initializeRows(); // generates the .materials row

    setMatDataForSearch().then(() => {
      console.log("✅ Material data loaded before dropdown logic");
      loadDropdowns();
    });
    }
  });

  // ⚙️ Init inventory rows in case user starts on inventory tab
  initializeRows();
  loadDropdowns();

  // 💾 Save inventory button
  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveInventoryData();
  });

  // ➕/🗑️ Add/remove inventory material rows
  container?.addEventListener("click", (e) => {
    if (e.target.id === "add-material-btn") {
      addMaterialRow(container);
    } else if (e.target.classList.contains("remove-material-row")) {
      removeMaterialRow(e.target, container);
    }
  });

  // 🔍 Material selector change in inventory
  container?.addEventListener("change", (e) => {
    if (e.target.id === "inv-material") {
      handleMaterialLookup({ target: e.target });
    }
  });

  // 🧾 Search results logic (edit + delete)
  resultsBox?.addEventListener("click", (event) => {
    const row = event.target.closest(".search-result-row");

    if (row) {
      const matID = row.dataset.materialid;
      if (!matID) return showToast("❌ Material ID missing", "error");

      populateEditForm(matID);
      const tabTrigger = document.querySelector('[data-bs-target="#edit-material"]');
      tabTrigger.style.display = "inline-block";
      bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
      return;
    }

    const btn = event.target;
    const matID = btn.dataset.materialid?.trim();

    if (btn.classList.contains("before-delete-button")) {
      const isDelete = btn.dataset.buttonState === "delete";
      btn.previousElementSibling.classList.toggle("d-none", !isDelete);
      btn.textContent = isDelete ? "Cancel" : "Delete";
      btn.dataset.buttonState = isDelete ? "cancel" : "delete";
    }

    if (btn.classList.contains("delete-button") && matID) {
      toggleLoader(true);
      fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: "materials", action: "delete", matID })
      })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            showToast("✅ Material deleted!", "success");
            searchInput.value = "";
            resultsBox.innerHTML = "";
            setMatDataForSearch();
          } else {
            showToast("⚠️ Could not delete material.", "error");
          }
        })
        .catch(() => showToast("⚠️ Error occurred while deleting material.", "error"))
        .finally(() => toggleLoader(false));
    }
  });
});

// -------------------------
// ✅ Live Search Logic
// -------------------------
function search() {
  const inputEl = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const query = inputEl.value.toLowerCase().trim();

  let counterContainer = document.getElementById("counterContainer");
  if (!counterContainer) {
    counterContainer = document.createElement("div");
    counterContainer.id = "counterContainer";
    counterContainer.className = "d-inline-flex gap-3 align-items-center ms-3";
    inputEl.insertAdjacentElement("afterend", counterContainer);
  }

  const getOrCreateCounter = (id, text = "") => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("span");
      el.id = id;
      el.className = "px-2 py-1 border rounded fw-bold bg-dark text-info";
      el.textContent = text;
      counterContainer.appendChild(el);
    }
    return el;
  };

  const searchCounter = getOrCreateCounter("searchCounter");
  const totalCounter = getOrCreateCounter("totalCounter");

  toggleLoader(true);

  const words = query.split(/\s+/);
  const columns = [0, 1, 2, 3, 4, 5, 6];

  const results = query === "" ? [] : materialData.filter(row =>
    words.every(word =>
      columns.some(i => row[i]?.toString().toLowerCase().includes(word))
    )
  );

  searchCounter.textContent = query === "" ? "🔍" : `${results.length} Materials Found`;
  totalCounter.textContent = `Total Materials: ${materialData.length}`;

  resultsBox.innerHTML = "";
  const template = document.getElementById("rowTemplate").content;

  results.forEach(r => {
    const row = template.cloneNode(true);
    const tr = row.querySelector("tr");

    tr.classList.add("search-result-row");
    tr.dataset.materialid = r[0];
    tr.querySelector(".matID").textContent = r[0];
    tr.querySelector(".matName").textContent = r[1];
    tr.querySelector(".matPrice").textContent = r[2];
    tr.querySelector(".supplier").textContent = r[5];

    resultsBox.appendChild(row);
  });

  toggleLoader(false);
}

function showEditTab() {
  const editTab = document.querySelector('[data-bs-target="#edit-material"]');
  if (editTab) bootstrap.Tab.getOrCreateInstance(editTab).show();
}

// ✅ Populate Edit Form
function populateEditForm(matID) {
  const matIDField = document.getElementById("edit-matID");
  matIDField.value = matID;
  matIDField.removeAttribute("readonly");
  document.getElementById("edit-material-id").value = matID;

  loadDropdowns();
  toggleLoader(true);

  fetch(`${scriptURL}?action=getMaterialById&matID=${matID}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);

      const fields = [
        "matName", "matPrice", "unitType", "unitQty",
        "supplier", "supplierUrl", "unitPrice", "onHand",
        "outgoing", "lastUpdated", "reorderLevel"
      ];

      fields.forEach(field => {
        const el = document.getElementById(`edit-${field}`);
        if (el) el.value = (data[field] !== undefined && data[field] !== null) ? String(data[field]).trim() : "";
      });

      calculateAll();
    })
    .catch(err => {
      console.error("❌ Error fetching material:", err);
      showToast("❌ Error loading material data!", "error");
    })
    .finally(() => toggleLoader(false));
}

// Save changes from Edit Form
document.getElementById("save-changes").addEventListener("click", async () => {
  const matID = document.getElementById("edit-matID").value.trim();
  if (!matID) return showToast("❌ Material ID is missing.", "error");

  const now = new Date();
  document.getElementById("edit-lastUpdated").value = formatDateForUser(now); // UI only

  const fields = [
    "matName", "matPrice", "unitType", "unitQty", "supplier", "supplierUrl",
    "unitPrice", "incoming", "outgoing", "lastUpdated", "reorderLevel"
  ];

  const materialInfo = {};

  for (const field of fields) {
    const el = document.getElementById(`edit-${field}`);
    materialInfo[field] = (field === "lastUpdated") ? now : (el?.value.trim() || "");
  }

  // Override onHand with totalStock calculated value
  materialInfo.onHand = document.getElementById("edit-totalStock")?.value.trim() || "";

  toggleLoader(true);

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "materials", action: "edit", matID, materialInfo })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ Material updated successfully!", "success");
      document.getElementById("searchInput").value = "";
      document.getElementById("searchResults").innerHTML = "";
      await setMatDataForSearch();

      bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#search-material"]')).show();
    } else {
      showToast("❌ Error updating material data!", "error");
    }
  } catch (err) {
    console.error(err);
    showToast("❌ Error updating material data!", "error");
  } finally {
    toggleLoader(false);
  }
});

// Add Material Form Save Logic
addMaterialForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fields = [
    "matName", "matPrice", "unitType", "unitQty", "supplier",
    "supplierUrl", "unitPrice", "onHand", "lastUpdated", "reorderLevel"
  ];

  const materialInfo = {};
  for (const field of fields) {
    const el = document.getElementById(`add-${field}`);
    materialInfo[field] = el?.value.trim() || "";
  }

  toggleLoader(true);

  try {
    const response = await fetch(`${scriptURL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "materials", action: "add", materialInfo })
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ Material added successfully!", "success");
      addMaterialForm.reset();
      await setMatDataForSearch();

      bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#search-material"]')).show();
    } else {
      showToast("❌ Error adding material.", "error");
      console.error(result);
    }
  } catch (error) {
    console.error("Fetch error:", error);
    showToast("❌ Error adding material.", "error");
  } finally {
    toggleLoader(false);
  }
});

// Autocomplete material lookup handler
function handleMaterialLookup(e) {
  const input = e.target;
  const row = input.closest(".material-row");
  const name = input.value.trim();
  // console.log("🧪 Material Lookup:", name);
  // console.log("🧪 materialData:", materialData);

  if (!name || !row) return showToast("❌ Enter a material name", "warning");

  toggleLoader(true);

  const match = materialData.find(m => m[1].trim() === name);
  if (!match) {
    showToast(`No match found for "${name}"`, "warning");
    toggleLoader(false);
    return;
  }

  const fieldMap = {
    "inv-matID":        match[0],
    "inv-matName":      match[1],
    "inv-matPrice":     match[2],
    "inv-unitType":     match[3],
    "inv-unitQty":      match[4],
    "inv-supplier":     match[5],
    "inv-supplierUrl":  match[6],
    "inv-unitPrice":    match[7],
    "inv-onHand":       match[8],
    "inv-incoming":     match[9],
    "inv-lastUpdated":  match[11], // skip index 10 (outgoing)
  };

  for (const [id, value] of Object.entries(fieldMap)) {
    const el = row.querySelector(`#${id}`);
    if (el) el.value = value;
  }

  toggleLoader(false);
}

// ✅ Add a new Material Row
function addMaterialRow(container) {
  const rows = container.querySelectorAll(".material-row");
  if (rows.length >= 10) {
    showToast("🚫 Max 10 materials allowed.", "warning");
    return;
  }

  const firstRow = rows[0];
  const newRow = firstRow.cloneNode(true);

  // Clear inputs for new row
  clearMaterialInputs(newRow);

  // Always show remove button on cloned rows
  const removeBtn = newRow.querySelector(".remove-material-row");
  if (removeBtn) removeBtn.style.display = "inline-block";

  container.appendChild(newRow);

  // Reattach listeners for calculation
  attachAutoCalcListeners(newRow);
  refreshDeleteButtons();
}

// ✅ Remove a Material Row
function removeMaterialRow(target, container) {
  const rows = container.querySelectorAll(".material-row");
  if (rows.length > 1) {
    target.closest(".material-row").remove();
    refreshDeleteButtons();
  } else {
    showToast("⚠️ At least one row must remain.", "info");
  }
}

// ✅ Initialize all rows on page load or tab switch
function initializeRows() {
  document.querySelectorAll(".material-row").forEach((row, index) => {
    const updatedInput = row.querySelector("#inv-lastUpdated");
    if (updatedInput && !updatedInput.value) {
      updatedInput.value = formatDateForUser(new Date());
    }

    const removeBtn = row.querySelector(".remove-material-row");
    if (removeBtn) {
      removeBtn.style.display = index === 0 ? "none" : "inline-block";
    }

    attachAutoCalcListeners(row);
  });
}

// ✅ Clear all editable inputs in a material row
function clearMaterialInputs(row) {
  const inputSelectors = [
    "#inv-matID",
    "#inv-matName",
    "#inv-material",
    "#inv-unitPrice",
    "#inv-onHand",
    "#inv-incoming",
    "#inv-supplier",
    "#inv-supplierUrl",
    "#inv-matPrice",
    "#inv-unitQty"
  ];

  inputSelectors.forEach(selector => {
    const input = row.querySelector(selector);
    if (input) input.value = ""; // ✅ Always clear, even if readonly
  });

  const lastUpdatedInput = row.querySelector("#inv-lastUpdated");
  if (lastUpdatedInput) lastUpdatedInput.value = formatDateForUser(new Date());
}

// ✅ Show/hide delete buttons depending on row count
function refreshDeleteButtons() {
  const rows = document.querySelectorAll(".material-row");
  rows.forEach((row, i) => {
    const btn = row.querySelector(".remove-material-row");
    if (btn) btn.style.display = i === 0 ? "none" : "inline-block";
  });
}

// Save All Inventory Rows
async function saveInventoryData() {
  const rows = document.querySelectorAll(".material-row");
  const updates = [];

  rows.forEach((row, i) => {
    const matID = row.querySelector("#inv-matID")?.value.trim();
    if (!matID) {
      console.warn(`⏭️ Skipping row ${i + 1}: Missing matID`);
      return;
    }

    // Get editable fields
    const parseCurrency = (val) => parseFloat((val || "").replace(/[^0-9.-]+/g, ""));
    const matPrice = parseCurrency(row.querySelector("#inv-matPrice")?.value);
    const unitQty = parseFloat(row.querySelector("#inv-unitQty")?.value) || 0;
    const onHandInput = parseFloat(row.querySelector("#inv-onHand")?.value) || 0;
    const supplier = row.querySelector("#inv-supplier")?.value.trim() || "";
    const supplierUrl = row.querySelector("#inv-supplierUrl")?.value.trim() || "";

    // Derived values
    const onHandFinal = onHandInput + unitQty;
    const unitType = row.querySelector("#inv-unitType")?.value.trim() || "";
    const unitPrice = parseCurrency(row.querySelector("#inv-unitPrice")?.value);

    const now = new Date(); // Backend should parse this to date object

    updates.push({
      matID,
      matName: row.querySelector("#inv-matName")?.value.trim() || "",
      matPrice,
      unitQty,
      supplier,
      supplierUrl,
      unitType,
      unitPrice,
      onHand: onHandFinal,
      incoming: 0, // Reset to 0 after processing (assumed)
      outgoing: 0, // No change
      lastUpdated: now.toISOString(),
      reorderLevel: parseFloat(row.querySelector("#inv-reorderLevel")?.value) || 0,
    });
  });

  if (!updates.length) {
    return showToast("⚠️ No valid inventory rows to save.", "warning");
  }

  toggleLoader(true);

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: "materials",
        action: "editInventory",
        materialArray: updates,
      }),
    });

    const result = await response.json();

    if (result.success) {
      showToast("✅ All inventory data saved!", "success");
      document.getElementById("addInventoryForm")?.reset();
      await setMatDataForSearch();
      bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#search-material"]')).show();
      // Optionally refresh material data or clear form
    } else {
      showToast("❌ Failed to save inventory data.", "error");
    }

  } catch (err) {
    console.error("Fetch error:", err);
    showToast("❌ Error saving inventory data!", "error");
  } finally {
    toggleLoader(false);
  }
}

// ✅ Format Date for UI Display
function formatDateForUser(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US");
}

// ✅ Set value in a row safely
function setValue(row, selector, value) {
  const input = row.querySelector(selector);
  if (!input) {
    const matName = row.querySelector(".materials")?.value || "unknown";
    console.warn(`⚠️ Missing field ${selector} in row with material: ${matName}`);
    return;
  }
  input.value = value || "";
}

// ✅ Calculate inventory fields
function calculateInventoryFields({ matPrice, unitQty, onHand = 0, incoming = 0, outgoing = 0 } = {}) {
  const clean = val => parseFloat(val?.toString().replace(/[^0-9.]/g, "")) || 0;

  const price = clean(matPrice);
  const qty = clean(unitQty);
  const stockOnHand = clean(onHand);
  const incomingStock = clean(incoming);
  const outgoingStock = clean(outgoing);

  const unitPrice = qty !== 0 ? price / qty : 0;
  const totalStock = stockOnHand + incomingStock - outgoingStock;

  return {
    unitPrice: +unitPrice.toFixed(2),
    totalStock: +totalStock.toFixed(2)
  };
}

// ✅ Recalculate edit form + alert
function calculateAll() {
  const get = id => document.getElementById(`edit-${id}`)?.value;

  const { unitPrice, totalStock } = calculateInventoryFields({
    matPrice: get("matPrice"),
    unitQty: get("unitQty"),
    onHand: get("onHand"),
    incoming: get("incoming"),
    outgoing: get("outgoing")
  });

  const totalField = document.getElementById("edit-totalStock");
  if (totalField) totalField.value = totalStock;

  const unitField = document.getElementById("edit-unitPrice");
  if (unitField) unitField.value = unitPrice;

  checkLowStock();
}

// ✅ Auto-calc listeners for dynamic rows
function attachAutoCalcListeners(row) {
  const priceInput = row.querySelector('#inv-matPrice');
  const qtyInput = row.querySelector('#inv-unitQty');
  const unitPriceInput = row.querySelector('#inv-unitPrice');

  if (!priceInput || !qtyInput || !unitPriceInput) return;

  const update = () => {
    const { unitPrice } = calculateInventoryFields({
      matPrice: priceInput.value,
      unitQty: qtyInput.value
    });
    unitPriceInput.value = unitPrice ? unitPrice.toFixed(2) : "";
  };

  priceInput.addEventListener("change", update);
  qtyInput.addEventListener("change", update);
}

// ✅ Highlight low stock alert
function checkLowStock() {
  const total = parseFloat(document.getElementById("edit-totalStock")?.value) || 0;
  const reorder = parseFloat(document.getElementById("edit-reorderLevel")?.value) || 0;
  const alert = document.getElementById("reorderAlert");

  if (alert) alert.classList.toggle("d-none", total >= reorder);
}

// ✅ One-time listener setup for edit form
["onHand", "incoming", "outgoing", "matPrice", "unitQty", "reorderLevel"].forEach(field => {
  const el = document.getElementById(`edit-${field}`);
  if (el) el.addEventListener("change", calculateAll);
});
