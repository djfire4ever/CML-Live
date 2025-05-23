// ✅ Initialize Material Tab on Load
document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");

  // Preload material data
  toggleLoader(true);
  await setMatDataForSearch();
  toggleLoader(false);

  // Search input event
  searchInput?.addEventListener("input", search);

  // Reset search tab on activation
  document.querySelector('[data-bs-target="#search-material"]')
    ?.addEventListener("shown.bs.tab", () => {
      if (!searchInput || !resultsBox) return;
      searchInput.value = "";
      resultsBox.innerHTML = "";
      document.getElementById("searchCounter")?.textContent = "";
      searchInput.focus();
    });

  // Add tab change logic for Add Material price/qty
  document.querySelector('[data-bs-target="#add-material"]')
    ?.addEventListener("shown.bs.tab", () => {
      document.querySelectorAll("#addForm input.matPrice, #addForm input.unitQty")
        .forEach(input => {
          input.addEventListener("change", ({ target }) => {
            const form = target.form;
            if (form?.id !== "addForm") return;

            const price = form.querySelector(".matPrice")?.value;
            const qty = form.querySelector(".unitQty")?.value;
            const unitPriceInput = form.querySelector(".unitPrice");

            const { unitPrice } = calculateInventoryFields({ matPrice: price, unitQty: qty });
            if (unitPriceInput) unitPriceInput.value = unitPrice?.toFixed(2) || "";
          });
        });
    });
});

// ✅ Search Function
function search() {
  const inputEl = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const query = inputEl.value.toLowerCase().trim();

  // Ensure counter container exists
  let counterContainer = document.getElementById("counterContainer");
  if (!counterContainer) {
    counterContainer = document.createElement("div");
    counterContainer.id = "counterContainer";
    counterContainer.className = "d-inline-flex gap-3 align-items-center ms-3";
    inputEl.insertAdjacentElement("afterend", counterContainer);
  }

  // Ensure counters exist
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

  // Update counters
  searchCounter.textContent = query === "" ? "🔍" : `${results.length} Materials Found`;
  totalCounter.textContent = `Total Materials: ${materialData.length}`;

  // Render results
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

// ✅ Handle Edit & Delete from Search Table
document.getElementById("searchResults")?.addEventListener("click", (event) => {
  const row = event.target.closest(".search-result-row");

  if (row) {
    const matID = row.dataset.materialid;
    if (!matID) return showToast("❌ Material ID missing", "error");

    populateEditForm(matID);
    bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#edit-material"]')).show();
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
          document.getElementById("searchInput").value = "";
          document.getElementById("searchResults").innerHTML = "";
          setMatDataForSearch();
        } else {
          showToast("⚠️ Could not delete material.", "error");
        }
      })
      .catch(() => showToast("⚠️ Error occurred while deleting material.", "error"))
      .finally(() => toggleLoader(false));
  }
});
  
document.addEventListener("DOMContentLoaded", async () => {
  console.log("📦 MaterialManager module loaded");

  const container = document.getElementById("materialRows");
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const searchCounter = document.getElementById("searchCounter");
  const saveBtn = document.getElementById("save-inventory-btn");

  toggleLoader(true);
  await setMatDataForSearch();
  toggleLoader(false);

  // ✅ Inventory Tab Setup
  document.querySelector('[data-bs-target="#inventory-material"]')
    ?.addEventListener("shown.bs.tab", () => {
      initializeRows();    // 🧱 Only runs when inventory tab is shown
      loadDropdowns();     // 🔽 Now safe here
    });

  // ✅ Search Tab Setup
  document.querySelector('[data-bs-target="#search-material"]')
    ?.addEventListener("shown.bs.tab", () => {
      if (searchInput) searchInput.value = "";
      if (resultsBox) resultsBox.innerHTML = "";
      if (searchCounter) searchCounter.textContent = "";
      searchInput?.focus();
    });

  // ✅ Run inventory setup immediately if it's already the default visible tab
  const activeTab = document.querySelector(".tab-pane.active")?.id;
  if (activeTab === "inventory-material") {
    initializeRows();
    loadDropdowns();
  }

  // ✅ Inventory Save Button
  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    saveInventoryData();
  });

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

// Save All Inventory Rows
async function saveInventoryData() {
  console.log("📝 Saving inventory data...");

  const rows = document.querySelectorAll(".material-row");
  console.log(`Found ${rows.length} rows.`);

  toggleLoader(true);

  for (const row of rows) {
    const matID = row.querySelector(".matID")?.value.trim() || "";
    if (!matID) {
      console.warn("⏭️ Skipping row without matID.");
      continue;
    }

    const matName = row.querySelector(".matName")?.value.trim() || matID;
    const unitQty = row.querySelector(".unitQty")?.value.trim() || "";

    // Sync incoming with unitQty for consistency
    const incomingInput = row.querySelector(".incoming");
    if (incomingInput) incomingInput.value = unitQty;

    const materialInfo = {
      matName,
      matPrice: row.querySelector(".matPrice")?.value.trim() || "",
      unitType: row.querySelector(".unitType")?.value.trim() || "",
      unitQty,
      supplier: row.querySelector(".supplier")?.value.trim() || "",
      supplierUrl: row.querySelector(".supplierUrl")?.value.trim() || "",
      unitPrice: row.querySelector(".unitPrice")?.value.trim() || "",
      incoming: unitQty,
      lastUpdated: new Date()
    };

    try {
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "materials",
          action: "edit",
          matID,
          materialInfo
        })
      });

      const result = await res.json();
      console.log(`✅ Result for ${matName}:`, result);

      if (result.success) {
        showToast(`✅ Saved ${matName}`, "success");
        clearMaterialInputs(row);
      } else {
        showToast(`❌ Failed to save ${matName}`, "error");
      }
    } catch (err) {
      console.error(`❌ Error saving ${matName}:`, err);
      showToast(`❌ Error saving ${matName}`, "error");
    }
  }

  toggleLoader(false);
}

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

// Global material dataset (cached)
let materialData = [];

// ✅ Fetch and Store Material Data
async function setMatDataForSearch() {
  try {
    const res = await fetch(`${scriptURL}?action=getMatDataForSearch`);
    const data = await res.json();

    if (Array.isArray(data)) {
      materialData = data.slice(); // ✅ update global cache
    } else {
      console.warn("⚠️ Expected an array but got:", data);
      materialData = []; // Fallback to avoid errors downstream
    }
  } catch (err) {
    console.error("❌ Error loading material data:", err);
  }
}

// Autocomplete material lookup handler
function handleMaterialLookup(e) {
  const input = e.target;
  const row = input.closest(".material-row");
  const name = input.value.trim();

  if (!name || !row) return showToast("❌ Enter a material name", "warning");

  toggleLoader(true);

  const match = materialData.find(m => m[1].trim() === name);
  if (!match) {
    showToast(`No match found for "${name}"`, "warning");
    toggleLoader(false);
    return;
  }

  const fieldMap = {
    ".matID": match[0],
    ".matName": match[1],
    ".matPrice": match[2],
    ".unitType": match[3],
    ".unitQty": match[4],
    ".supplier": match[5],
    ".supplierUrl": match[6],
    ".unitPrice": match[7],
    ".onHand": match[8],
    ".incoming": match[9]
  };

  for (const [selector, value] of Object.entries(fieldMap)) {
    const el = row.querySelector(selector);
    if (el) el.value = value;
  }

  toggleLoader(false);
}

// Add a new material row to container
function addMaterialRow(container) {
  const rows = container.querySelectorAll(".material-row");
  if (rows.length >= 10) {
    showToast("🚫 Max 10 materials allowed.", "warning");
    return;
  }

  const newRow = rows[0].cloneNode(true);

  // Reset all input values in new row
  newRow.querySelectorAll("input").forEach(input => input.value = "");
  
  // Ensure hidden matID input exists and reset it
  let matIDField = newRow.querySelector(".matID");
  if (!matIDField) {
    matIDField = document.createElement("input");
    matIDField.type = "hidden";
    matIDField.classList.add("matID");
    newRow.appendChild(matIDField);
  }
  matIDField.value = "";

  newRow.querySelector(".lastUpdated").value = formatDateForUser(new Date());

  // Show delete button on all but first row
  const removeBtn = newRow.querySelector(".remove-material-row");
  if (removeBtn) removeBtn.style.display = "inline-block";

  container.appendChild(newRow);

  attachAutoCalcListeners(newRow);
  refreshDeleteButtons();
}

// Remove material row if more than 1 remains
function removeMaterialRow(target, container) {
  const rows = container.querySelectorAll(".material-row");
  if (rows.length > 1) {
    target.closest(".material-row").remove();
    refreshDeleteButtons();
  } else {
    showToast("⚠️ At least one row must remain.", "info");
  }
}

function initializeRows() {
  document.querySelectorAll(".material-row").forEach((row, index) => {
    const lastUpdated = row.querySelector(".lastUpdated");
    if (lastUpdated) {
      lastUpdated.value = formatDateForUser(new Date());
    }

    const deleteBtn = row.querySelector(".remove-material-row");
    if (deleteBtn) {
      deleteBtn.style.display = index === 0 ? "none" : "inline-block";
    }

    attachAutoCalcListeners(row);
  });
}

// ♻️ Clear inputs in a material row (except lastUpdated)
function clearMaterialInputs(row) {
  row.querySelectorAll("input").forEach(input => {
    if (!input.classList.contains("lastUpdated")) input.value = "";
  });
  row.querySelector(".lastUpdated").value = formatDateForUser(new Date());
}

// ✅ Show/hide delete buttons depending on row count
function refreshDeleteButtons() {
  const allRows = document.querySelectorAll(".material-row");
  allRows.forEach((row, i) => {
    const btn = row.querySelector(".remove-material-row");
    if (btn) btn.style.display = i === 0 ? "none" : "inline-block";
  });
}

  // ✅ Inventory Add/Remove Material Row Buttons
  container?.addEventListener("click", (e) => {
    if (e.target.id === "add-material-btn") {
      addMaterialRow(container);
    } else if (e.target.classList.contains("remove-material-row")) {
      removeMaterialRow(e.target, container);
    }
  });

  // ✅ Inventory Material Lookup Handler
  container?.addEventListener("change", (e) => {
    if (e.target.classList.contains("materials")) {
      handleMaterialLookup({ target: e.target });
    }
  });

  // ✅ Search Input Listener
  if (searchInput) {
    searchInput.addEventListener("input", search);
  }
});

// ✅ Format Date for UI Display (MM/DD/YYYY)
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

// 🧮 Single calculation helper (shared)
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

// 🧼 Setup listeners for all relevant inputs (edit form + add form + rows)
// Replace these IDs and selectors with your actual field IDs or container selectors
const allFields = [
  ...document.querySelectorAll("#editForm input[id^='edit-']"),
  ...document.querySelectorAll("#addForm input.matPrice, #addForm input.unitQty"),
  ...document.querySelectorAll(".material-row input.matPrice, .material-row input.unitQty")
];

allFields.forEach(input => {
  input.addEventListener("change", (e) => {
    const target = e.target;

    // If in edit form
    if (target.id && target.id.startsWith("edit-")) {
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
    // If in add material form (not inventory rows)
    else if (target.form && target.form.id === "addForm") {
      const priceInput = target.form.querySelector(".matPrice");
      const qtyInput = target.form.querySelector(".unitQty");
      const unitPriceInput = target.form.querySelector(".unitPrice");

      const { unitPrice } = calculateInventoryFields({
        matPrice: priceInput?.value,
        unitQty: qtyInput?.value
      });

      if (unitPriceInput) unitPriceInput.value = unitPrice ? unitPrice.toFixed(2) : "";
    }
    // If in inventory material rows
    else {
      const row = target.closest(".material-row");
      if (!row) return;

      const priceInput = row.querySelector(".matPrice");
      const qtyInput = row.querySelector(".unitQty");
      const unitPriceInput = row.querySelector(".unitPrice");

      const { unitPrice } = calculateInventoryFields({
        matPrice: priceInput?.value,
        unitQty: qtyInput?.value
      });

      if (unitPriceInput) unitPriceInput.value = unitPrice ? unitPrice.toFixed(2) : "";
    }
  });
});

// 🚨 Keep checkLowStock separate for clarity & single responsibility
function checkLowStock() {
  const total = parseFloat(document.getElementById("edit-totalStock")?.value) || 0;
  const reorder = parseFloat(document.getElementById("edit-reorderLevel")?.value) || 0;
  const alert = document.getElementById("reorderAlert");

  if (alert) alert.classList.toggle("d-none", total >= reorder);
}

// 🔄 Attach calc listeners on dynamic row inputs
function attachAutoCalcListeners(row) {
  const priceInput = row.querySelector(".matPrice");
  const qtyInput = row.querySelector(".unitQty");
  const unitPriceInput = row.querySelector(".unitPrice");

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

// 🔁 Recalculate all edit form fields and check alerts
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

// 🔁 Set up listeners for auto recalculation on change
["onHand", "incoming", "outgoing", "matPrice", "unitQty", "reorderLevel"].forEach(field => {
  const el = document.getElementById(`edit-${field}`);
  if (el) el.addEventListener("change", calculateAll);
});




// // 🎯 Get trimmed input value from selector
// function getTrimmedValue(row, selector) {
//   return row.querySelector(selector)?.value.trim() || "";
// }

// // 📅 Set default date for 'add' form (on DOM ready)
// document.addEventListener("DOMContentLoaded", () => {
//   const field = document.getElementById("add-lastUpdated");
//   if (field) field.value = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
// });

// // 🧮 Core Calculation Utility
// function calculateUnitPrice(price, qty) {
//   const p = parseFloat(price);
//   const q = parseFloat(qty);
//   return (!isNaN(p) && !isNaN(q) && q !== 0) ? (p / q) : 0;
// }

// // 🧲 Attach calc logic to dynamic material row
// function attachAutoCalcListeners(row) {
//   const matPriceInput = row.querySelector(".matPrice");
//   const unitQtyInput = row.querySelector(".unitQty");
//   const unitPriceInput = row.querySelector(".unitPrice");

//   if (!matPriceInput || !unitQtyInput || !unitPriceInput) return;

//   const update = () => {
//     const unitPrice = calculateUnitPrice(matPriceInput.value, unitQtyInput.value);
//     unitPriceInput.value = unitPrice ? unitPrice.toFixed(2) : "";
//   };

//   matPriceInput.addEventListener("change", update);
//   unitQtyInput.addEventListener("change", update);
// }

// // 📊 Stock formula: onHand + incoming - outgoing
// function calculateTotalStock(onHand, incoming, outgoing) {
//   return (parseFloat(onHand) || 0) + (parseFloat(incoming) || 0) - (parseFloat(outgoing) || 0);
// }

// // 🚨 Toggle low stock alert
// function checkLowStock() {
//   const total = parseFloat(document.getElementById("edit-totalStock")?.value) || 0;
//   const reorder = parseFloat(document.getElementById("edit-reorderLevel")?.value) || 0;
//   const alert = document.getElementById("reorderAlert");

//   if (alert) alert.classList.toggle("d-none", total >= reorder);
// }

// // 🧮 Main inventory calculation (Edit Form only)
// function calculateAll() {
//   const getVal = id => parseFloat(document.getElementById(`edit-${id}`)?.value.replace(/[^0-9.]/g, "") || 0);

//   const matPrice = getVal("matPrice");
//   const unitQty = getVal("unitQty");
//   const onHand = getVal("onHand");
//   const incoming = getVal("incoming");
//   const outgoing = getVal("outgoing");

//   const unitPrice = calculateUnitPrice(matPrice, unitQty);
//   const totalStock = calculateTotalStock(onHand, incoming, outgoing);

//   const totalField = document.getElementById("edit-totalStock");
//   if (totalField) totalField.value = totalStock;

//   const unitField = document.getElementById("edit-unitPrice");
//   if (unitField) unitField.value = unitPrice.toFixed(2);

//   checkLowStock();
// }

// // 🔁 Watch changes to auto-recalculate totals
// ["onHand", "incoming", "outgoing", "matPrice", "unitQty", "reorderLevel"].forEach(field => {
//   const el = document.getElementById(`edit-${field}`);
//   if (el) el.addEventListener("change", calculateAll);
// });

