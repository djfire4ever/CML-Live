const SELECTORS = {
  saveChangesBtn: "save-changes",
  addMaterialForm: "addMaterialForm",
  editFieldsPrefix: "edit-",
  addFieldsPrefix: "add-",
  searchInput: "searchInput",
  searchResults: "searchResults",
  searchMaterialTab: '[data-bs-target="#search-material"]',
  materialRowsContainer: "materialRowsContainer",
  addMaterialRowBtn: "addMaterialRowBtn"
};
const MAX_ROWS = 10;

// ✅ DOMContentLoaded Entry Point
document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("materialRows");
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const searchCounter = document.getElementById("searchCounter");
  const saveBtn = document.getElementById("save-inventory-btn");
  const addRowBtn = document.getElementById("addMaterialRowBtn");

  // 🔄 Load material data and dropdowns
  toggleLoader(true);
  await setMatDataForSearch();
  loadDropdowns();
  toggleLoader(false);

  // 🔍 SEARCH TAB: Reset input/results when tab shown
  const searchTab = document.querySelector('[data-bs-target="#search-material"]');
  if (searchTab) {
    searchTab.addEventListener("shown.bs.tab", () => {
      if (searchInput && resultsBox) {
        searchInput.value = "";
        resultsBox.innerHTML = "";
        if (searchCounter) searchCounter.textContent = "";
        searchInput.focus();
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", search);
    }
  }

  // ➕ ADD MATERIAL TAB: Auto-calculate unit price
  const addMatTab = document.querySelector('[data-bs-target="#add-material"]');
  if (addMatTab) {
    addMatTab.addEventListener("shown.bs.tab", () => {
      const priceInput = document.querySelector("#add-matPrice");
      const qtyInput = document.querySelector("#add-unitQty");
      const unitInput = document.querySelector("#add-unitPrice");
      const lastUpdated = document.getElementById("add-lastUpdated");

      if (lastUpdated) {
        lastUpdated.value = formatDateForUser(new Date());
      }

      if (priceInput && qtyInput && unitInput) {
        const recalculate = () => {
          const price = parseFloat(priceInput.value) || 0;
          const qty = parseFloat(qtyInput.value) || 0;
          unitInput.value = qty ? (price / qty).toFixed(2) : "0.00";
        };

        priceInput.addEventListener("input", recalculate);
        qtyInput.addEventListener("input", recalculate);
      }
    });
  }

  // 📦 ADD INVENTORY TAB: Initialize first row and bind add button
  const addInvTab = document.querySelector('[data-bs-target="#add-inventory"]');
  if (addInvTab) {
    addInvTab.addEventListener("shown.bs.tab", () => {
      if (!container) return;

      let firstRow = container.querySelector(".material-row");
      if (!firstRow) {
        addMaterialRow(container);
        firstRow = container.querySelector(".material-row");
      }

      if (firstRow) {
        initializeMaterialRow(firstRow);
      }

      if (addRowBtn && !addRowBtn.dataset.bound) {
        addRowBtn.addEventListener("click", () => addMaterialRow(container));
        addRowBtn.dataset.bound = "true";
      }

      loadDropdowns();
    });
  }

  // 💾 SAVE: Trigger inventory save
  if (saveBtn) {
    saveBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveInventoryData();
    });
  }

  // 🧠 DELEGATE: Handle clicks and changes inside inventory container
  if (container) {
    container.addEventListener("click", (e) => {
      const target = e.target;
      if (target.classList.contains("add-inventory-btn")) {
        addMaterialRow(container);
      } else if (target.classList.contains("remove-material-row")) {
        removeMaterialRow(target, container);
      }
    });

    container.addEventListener("change", (e) => {
      const target = e.target;
      if (target.classList.contains("inv-material")) {
        const row = target.closest(".material-row");
        const name = target.value.trim();
        const match = materialData.find(m => m[1]?.trim() === name);

        if (!row || !match) {
          showToast(`No match for "${name}"`, "warning");
          return;
        }

        populateMaterialData(row, match);
      }
    });
  }

  // ✏️ EDIT MATERIAL FORM: Recalculate on input
  const editPrice = document.getElementById("edit-matPrice");
  const editQty = document.getElementById("edit-unitQty");

  if (editPrice && editQty) {
    [editPrice, editQty].forEach(input =>
      input.addEventListener("input", () => calculateAllStaticForm("edit-"))
    );
  }
});

// ✅ Handle Edit & Delete buttons from Search Results Table
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

// ✅ Search Function
function search() {
  const inputEl = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  const query = inputEl.value.toLowerCase().trim();

  // Ensure counter container exists next to input
  let counterContainer = document.getElementById("counterContainer");
  if (!counterContainer) {
    counterContainer = document.createElement("div");
    counterContainer.id = "counterContainer";
    counterContainer.className = "d-inline-flex gap-3 align-items-center ms-3";
    inputEl.insertAdjacentElement("afterend", counterContainer);
  }

  // Helper to get or create individual counters
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
  const columns = [0, 1, 2, 3, 4, 5, 6]; // Columns to search in your materialData rows

  // Filter materialData based on all words matching at least one of the specified columns
  const results = query === "" ? [] : materialData.filter(row =>
    words.every(word =>
      columns.some(i => row[i]?.toString().toLowerCase().includes(word))
    )
  );

  // Update counters
  searchCounter.textContent = query === "" ? "🔍" : `${results.length} Materials Found`;
  totalCounter.textContent = `Total Materials: ${materialData.length}`;

  // Render search results
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

// Populate Edit Form
async function populateEditForm(matID) {
  const matIDField = document.getElementById(`${SELECTORS.editFieldsPrefix}matID`);
  if (!matIDField) {
    console.warn("Edit matID field missing");
    return;
  }

  matIDField.value = matID;
  matIDField.removeAttribute("readonly");

  const editMaterialId = document.getElementById("edit-material-id");
  if (editMaterialId) editMaterialId.value = matID;

  loadDropdowns(); // keep if dropdowns need refreshing
  toggleLoader(true);

  try {
    const res = await fetch(`${scriptURL}?action=getMaterialById&matID=${encodeURIComponent(matID)}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    const fields = [
      "matName", "matPrice", "unitType", "unitQty",
      "supplier", "supplierUrl", "unitPrice", "onHand",
      "incoming", "outgoing", "lastUpdated", "reorderLevel"
    ];

    fields.forEach(field => {
      const el = document.getElementById(`${SELECTORS.editFieldsPrefix}${field}`);
      if (!el) return;

      if (field === "lastUpdated") {
        el.value = formatDateForUser(data[field]);
      } else {
        el.value = data[field] != null ? String(data[field]).trim() : "";
      }
    });

    // Add input listeners for live calculation
    ["matPrice", "unitQty"].forEach(id => {
      const input = document.getElementById(`${SELECTORS.editFieldsPrefix}${id}`);
      if (input) {
        input.removeEventListener("input", calculateAllStaticForm);
        input.addEventListener("input", calculateAllStaticForm);
      }
    });

    calculateAllStaticForm();

  } catch (err) {
    console.error("❌ Error fetching material:", err);
    showToast("❌ Error loading material data!", "error");
  } finally {
    toggleLoader(false);
  }
}

// Save changes from Edit Form
document.getElementById(SELECTORS.saveChangesBtn)?.addEventListener("click", async (e) => {
  e.preventDefault();

  const matID = document.getElementById(`${SELECTORS.editFieldsPrefix}matID`)?.value.trim();
  if (!matID) {
    showToast("❌ Material ID is missing.", "error");
    return;
  }

  const now = new Date();
  const lastUpdatedEl = document.getElementById(`${SELECTORS.editFieldsPrefix}lastUpdated`);
  if (lastUpdatedEl) lastUpdatedEl.value = formatDateForUser(now); // UI only

  const fields = [
    "matName", "matPrice", "unitType", "unitQty", "supplier", "supplierUrl",
    "onHand", "unitPrice", "incoming", "outgoing", "lastUpdated", "reorderLevel"
  ];

  const materialInfo = {};
  for (const field of fields) {
    const el = document.getElementById(`${SELECTORS.editFieldsPrefix}${field}`);
    materialInfo[field] = field === "lastUpdated" ? now : (el?.value.trim() || "");
  }

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

      // Clear search input/results
      const searchInput = document.getElementById(SELECTORS.searchInput);
      const searchResults = document.getElementById(SELECTORS.searchResults);
      if (searchInput) searchInput.value = "";
      if (searchResults) searchResults.innerHTML = "";

      // Refresh material data
      await setMatDataForSearch();

      // Switch to search tab
      const searchTabEl = document.querySelector(SELECTORS.searchMaterialTab);
      if (searchTabEl) {
        bootstrap.Tab.getOrCreateInstance(searchTabEl).show();
      }
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

// Add Material Form submission handler
document.getElementById(SELECTORS.addMaterialForm)?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fields = [
    "matName", "matPrice", "unitType", "unitQty", "supplier",
    "lastUpdated", "supplierUrl", "unitPrice", "onHand", "reorderLevel"
  ];

  const materialInfo = {};
  for (const field of fields) {
    const el = document.getElementById(`${SELECTORS.addFieldsPrefix}${field}`);
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

      // Reset form
      document.getElementById(SELECTORS.addMaterialForm).reset();

      // Refresh search data
      await setMatDataForSearch();

      // Switch to search tab
      const searchTabEl = document.querySelector(SELECTORS.searchMaterialTab);
      if (searchTabEl) bootstrap.Tab.getOrCreateInstance(searchTabEl).show();

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

// Save All Inventory Rows function
async function saveInventoryData() {
  console.log("📝 Saving inventory data...");

  const rows = document.querySelectorAll(".material-row");
  console.log(`Found ${rows.length} rows.`);

  if (rows.length === 0) {
    showToast("⚠️ No inventory rows to save.", "warning");
    return;
  }

  toggleLoader(true);

  for (const row of rows) {
    const matID = row.querySelector(".inv-matID")?.value.trim();
    if (!matID) {
      console.warn("⏭️ Skipping row without matID.");
      continue;
    }

    const matName = row.querySelector(".inv-matName")?.value.trim() || matID;
    const unitQty = parseFloat(row.querySelector(".inv-unitQty")?.value.trim() || "0");
    const rawPrice = row.querySelector(".inv-matPrice")?.value.trim() || "0";
    const matPrice = parseFloat(rawPrice.replace(/[^\d.]/g, ""));

    const onHandField = row.querySelector(".inv-onHand");
    const originalOnHand = parseFloat(onHandField?.dataset.original || "0");
    const newOnHand = originalOnHand + unitQty;
    if (onHandField) onHandField.value = newOnHand;

    const incomingInput = row.querySelector(".inv-incoming");
    if (incomingInput) incomingInput.value = unitQty;

    const materialInfo = {
      matName,
      matPrice,
      unitType: row.querySelector(".inv-unitType")?.value.trim() || "",
      unitQty,
      supplier: row.querySelector(".inv-supplier")?.value.trim() || "",
      supplierUrl: row.querySelector(".inv-supplierUrl")?.value.trim() || "",
      unitPrice: row.querySelector(".inv-unitPrice")?.value.trim() || "",
      incoming: unitQty,
      onHand: newOnHand,
      reorderLevel: row.querySelector(".inv-reorderLevel")?.value.trim() || "",
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
      } else {
        showToast(`❌ Failed to save ${matName}`, "error");
      }
    } catch (err) {
      console.error(`❌ Error saving ${matName}:`, err);
      showToast(`❌ Error saving ${matName}`, "error");
    }
  }

  toggleLoader(false);

  // ✅ Reset the form and clear all inventory rows
  const form = document.getElementById(SELECTORS.addMaterialForm);
  if (form) form.reset();

  const container = document.getElementById("materialRows");
  if (container) container.innerHTML = ""; // Clear all material rows from inventory

  // ✅ Switch to the Search tab via Bootstrap 5 API
  const searchTabBtn = document.querySelector('[data-bs-target="#search-material"]');
  if (searchTabBtn) {
    const tabInstance = bootstrap.Tab.getInstance(searchTabBtn) || new bootstrap.Tab(searchTabBtn);
    tabInstance.show();
  }
}

function calculateAllStaticForm(prefix) {
  const get = id => document.getElementById(`${prefix}${id}`)?.value;
  const set = (id, val) => {
    const el = document.getElementById(`${prefix}${id}`);
    if (el) el.value = val;
  };

  const matPrice = parseFloat(get("matPrice")) || 0;
  const unitQty = parseFloat(get("unitQty")) || 0;
  const onHand = parseFloat(get("onHand")) || 0;
  const incoming = parseFloat(get("incoming")) || 0;
  // const outgoing = parseFloat(get("outgoing")) || 0;
  const unitPrice = unitQty !== 0 ? matPrice / unitQty : 0;
  const totalStock = onHand + incoming;

  set("unitPrice", unitPrice.toFixed(2));
  set("totalStock", totalStock.toFixed(2));

  if (prefix === "edit-") checkLowStock(prefix);
}

function checkLowStock(prefix = "edit-") {
  const total = parseFloat(document.getElementById(`${prefix}totalStock`)?.value) || 0;
  const reorder = parseFloat(document.getElementById(`${prefix}reorderLevel`)?.value) || 0;
  const alert = document.getElementById("reorderAlert");
  if (alert) alert.classList.toggle("d-none", total >= reorder);
}

// 🔄 Add Inventory Part Row Logic
function initializeMaterialRow(row) {
  const nameInput = row.querySelector(".inv-material");
  const priceInput = row.querySelector(".inv-matPrice");
  const qtyInput = row.querySelector(".inv-unitQty");
  const unitPriceOutput = row.querySelector(".inv-unitPrice");
  const onHandInput = row.querySelector(".inv-onHand");
  const removeBtn = row.querySelector(".remove-material-row");

  if (!nameInput || !priceInput || !qtyInput || !unitPriceOutput || !onHandInput || !removeBtn) {
    console.warn("⚠️ Missing expected elements in material row.");
    return;
  }

  const recalculate = () => {
    const price = parseFloat(priceInput.value) || 0;
    const qty = parseFloat(qtyInput.value) || 0;
    const unitPrice = qty ? price / qty : 0;
    unitPriceOutput.value = unitPrice.toFixed(2);

    // Update onHand: originalOnHand + unitQty
    const originalOnHand = parseFloat(onHandInput.dataset.original || "0");
    const newOnHand = originalOnHand + qty;
    onHandInput.value = newOnHand;
  };

  nameInput.addEventListener("change", () => {
    const name = nameInput.value.trim();
    const match = materialData.find(m => m[1].trim() === name);
    if (!match) {
      showToast(`No match found for "${name}"`, "warning");
      return;
    }
    populateMaterialData(row, match);
    recalculate();
  });

  priceInput.addEventListener("input", recalculate);
  qtyInput.addEventListener("input", recalculate);

  removeBtn.addEventListener("click", () => {
    const container = row.parentElement;
    if (!container) return;
    const allRows = container.querySelectorAll(".material-row");
    if (allRows.length <= 1) {
      showToast("⚠️ At least one row must remain.", "info");
      return;
    }
    row.remove();
  });
}

// ➕ Add new material row
function addMaterialRow(container) {
  if (!container) {
    console.warn("⚠️ addMaterialRow: Missing container.");
    return;
  }

  const rows = container.querySelectorAll(".material-row");
  if (typeof MAX_ROWS !== "undefined" && rows.length >= MAX_ROWS) {
    showToast(`🚫 Max ${MAX_ROWS} materials allowed.`, "warning");
    return;
  }

  const template = rows[0];
  if (!template) {
    console.warn("⚠️ addMaterialRow: No template row found.");
    return;
  }

  const newRow = template.cloneNode(true);
  newRow.querySelectorAll("input").forEach(input => (input.value = ""));

  const lastUpdatedInput = newRow.querySelector(".inv-lastUpdated");
  if (lastUpdatedInput) {
    lastUpdatedInput.value = formatDateForUser(new Date());
  }

  container.appendChild(newRow);
  initializeMaterialRow(newRow);
}

// 📥 Populate a row with matched material data
function populateMaterialData(row, match) {
  const fields = [
    "matID", "matName", "matPrice", "unitType",
    "unitQty", "supplier", "supplierUrl", "unitPrice",
    "onHand", "incoming", "outgoing", "lastUpdated", "reorderLevel"
  ];

  fields.forEach((key, i) => {
    const el = row.querySelector(`.inv-${key}`);
    if (el) {
      console.log(`Setting ${key} to:`, match[i]); // 🔍 Debug log here
      el.value = match[i];

      if (key === "onHand") el.dataset.original = match[i];
    } else {
      console.warn(`⚠️ Missing element: .inv-${key}`);
    }
  });

  const lastUpdated = row.querySelector(".inv-lastUpdated");
  if (lastUpdated) {
    lastUpdated.value = formatDateForUser(new Date());
  }
}


