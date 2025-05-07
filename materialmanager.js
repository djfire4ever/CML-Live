// ✅ Global Search Data Store
let materialdata = [];

// ✅ Fetch Search Data and Initialize Page
document.addEventListener("DOMContentLoaded", async () => {
    const searchInput = document.getElementById("searchInput");
    const searchTabBtn = document.querySelector('[data-bs-target="#search-material"]'); // or your actual tab
    const resultsBox = document.getElementById("searchResults");
  
    if (searchInput) {
      searchInput.addEventListener("input", search);
    }
  
    if (searchTabBtn) {
      searchTabBtn.addEventListener("shown.bs.tab", () => {
        if (searchInput) searchInput.value = "";
        if (resultsBox) resultsBox.innerHTML = "";
        document.getElementById("searchCounter").textContent = "";
        searchInput?.focus();
      });
    }
  
    resultsBox.innerHTML = "";
    toggleLoader(true);
    await setMatDataForSearch();
    setTimeout(() => toggleLoader(false), 500); // Delay ensures it always hides
  });
  
// ✅ Fetch and Store Material Data
async function setMatDataForSearch() {
    try {
      const res = await fetch(scriptURL + "?action=getMatDataForSearch");
      const data = await res.json();
      materialdata = data.slice(); // clone for local use
    } catch (err) {
      console.error("❌ Error loading data:", err);
    }
  }
  
// ✅ Perform Search
function search() {
    const searchInputEl = document.getElementById("searchInput");
    const searchResultsBox = document.getElementById("searchResults");
    const searchInput = searchInputEl.value.toLowerCase().trim();

    // Ensure counters exist
    let counterContainer = document.getElementById("counterContainer");
    if (!counterContainer) {
        counterContainer = document.createElement("div");
        counterContainer.id = "counterContainer";
        counterContainer.classList.add("d-inline-flex", "gap-3", "align-items-center", "ms-3");
        searchInputEl.parentNode.insertBefore(counterContainer, searchInputEl.nextSibling);
    }

    let searchCounter = document.getElementById("searchCounter");
    if (!searchCounter) {
        searchCounter = document.createElement("span");
        searchCounter.id = "searchCounter";
        searchCounter.classList.add("px-2", "py-1", "border", "rounded", "fw-bold", "bg-dark", "text-info");
        counterContainer.appendChild(searchCounter);
    }

    let totalCounter = document.getElementById("totalCounter");
    if (!totalCounter) {
        totalCounter = document.createElement("span");
        totalCounter.id = "totalCounter";
        totalCounter.classList.add("px-3", "py-1", "border", "rounded", "fw-bold", "bg-dark", "text-info");
        searchCounter.insertAdjacentElement("afterend", totalCounter);
    }

    // Show loader while searching
    toggleLoader();

    const searchWords = searchInput.split(/\s+/);
    const searchColumns = [0, 1, 2, 3, 4, 5, 6];

    const resultsArray = searchInput === "" ? [] : materialdata.filter(r =>
        searchWords.every(word =>
            searchColumns.some(colIndex =>
                r[colIndex].toString().toLowerCase().includes(word)
            )
        )
    );

    // Update counters
    searchCounter.textContent = searchInput === "" ? "🔍" : `${resultsArray.length} Materials Found`;
    totalCounter.textContent = `Total Materials: ${materialdata.length}`;

    // Render results
    searchResultsBox.innerHTML = "";
    const template = document.getElementById("rowTemplate").content;

    resultsArray.forEach(r => {
        const row = template.cloneNode(true);
        const tr = row.querySelector("tr");
      
        tr.classList.add("search-result-row");
        tr.dataset.materialid = r[0];
      
        tr.querySelector(".matID").textContent = r[0];
        tr.querySelector(".matName").textContent = r[1];
        tr.querySelector(".matPrice").textContent = r[2];
        tr.querySelector(".supplier").textContent = r[5];
      
        searchResultsBox.appendChild(row);
      });
            
    toggleLoader(); // Done searching
}

// ✅ Unified Event Delegation: Edit & Delete
document.getElementById("searchResults").addEventListener("click", event => {
    const row = event.target.closest(".search-result-row");
    if (row) {
      const matID = row.dataset.materialid;
      if (!matID) {
        showToast("❌ Material ID missing", "error");
        return;
      }
      populateEditForm(matID);
      new bootstrap.Tab(document.querySelector('[data-bs-target="#edit-material"]')).show();
      return;
    }
  
    // keep delete logic
    const target = event.target;
    if (target.classList.contains("before-delete-button")) {
      const isDelete = target.dataset.buttonState === "delete";
      target.previousElementSibling.classList.toggle("d-none", !isDelete);
      target.textContent = isDelete ? "Cancel" : "Delete";
      target.dataset.buttonState = isDelete ? "cancel" : "delete";
      return;
    }
  
    if (target.classList.contains("delete-button")) {
      const matID = target.dataset.materialid?.trim();
      if (!matID) {
        showToast("⚠️ Material ID missing", "error");
        return;
      }
  
      toggleLoader();
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
        .finally(() => toggleLoader());
    }
  });
  
  document.getElementById("save-changes").addEventListener("click", async function () {
    const matID = document.getElementById("edit-matID").value.trim();
    if (!matID) {
      showToast("❌ Material ID is missing.", "error");
      return;
    }
  
    const now = new Date(); // ✅ Raw JS Date object
    document.getElementById("edit-lastUpdated").value = formatDateForUser(now); // ✅ Only show formatted to user
  
    const fields = [
      "matName", "matPrice", "unitType", "unitQty", "supplier", "supplierUrl",
      "unitPrice", "incoming", "outgoing", "lastUpdated", "reorderLevel"
    ];
  
    const materialInfo = fields.reduce((info, field) => {
      const el = document.getElementById("edit-" + field);
      if (field === "lastUpdated") {
        info[field] = now; // ✅ Save raw date object (or now.toISOString() if needed for Sheets)
      } else {
        info[field] = el?.value.trim() || "";
      }
      return info;
    }, {});
  
    // ✅ Override onHand with calculated totalStock
    materialInfo.onHand = document.getElementById("edit-totalStock")?.value.trim() || "";
  
    toggleLoader();
  
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
  
        const tabTrigger = document.querySelector('[data-bs-target="#search-material"]');
        if (tabTrigger) new bootstrap.Tab(tabTrigger).show();
      } else {
        showToast("❌ Error updating material data!", "error");
      }
    } catch (err) {
      showToast("❌ Error updating material data!", "error");
      console.error(err);
    } finally {
      toggleLoader();
    }
  });

  function formatDateForUser(date) {
    return new Date(date).toLocaleDateString("en-US"); // 👁️ For UI only
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    const lastUpdatedField = document.getElementById("add-lastUpdated");
    if (lastUpdatedField) {
      const today = new Date();
      lastUpdatedField.value = today;
    }
  });
  
  function updateUnitPrice() {
    const priceField = document.getElementById("inv-matPrice");
    const qtyField = document.getElementById("inv-unitQty");
    const unitField = document.getElementById("inv-unitPrice");
  
    // Parse matPrice and unitQty as numbers, removing non-numeric characters
    const price = parseFloat(priceField?.value.replace(/[^0-9.]/g, "") || 0);
    const qty = parseFloat(qtyField?.value.replace(/[^0-9.]/g, "") || 0);
  
    // Debugging: Log the parsed values
    console.log("updateUnitPrice triggered");
    console.log("Parsed matPrice:", price);
    console.log("Parsed unitQty:", qty);
  
    // Handle edge cases
    if (isNaN(price) || isNaN(qty)) {
      console.warn("Invalid input: matPrice or unitQty is not a number");
      if (unitField) unitField.value = "0.00";
      return;
    }
  
    // Prevent division by zero
    if (qty === 0) {
      console.warn("Unit quantity is zero, cannot calculate unit price");
      if (unitField) unitField.value = "0.00";
      return;
    }
  
    // Calculate unit price
    const unitPrice = price / qty;
  
    // Debugging: Log the calculated unitPrice
    console.log("Calculated unitPrice:", unitPrice);
  
    // Update the unitPrice field
    if (unitField) unitField.value = unitPrice.toFixed(2);
  }
  
  // Trigger on change
  ["add-matPrice", "add-unitQty"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", updateUnitPrice);
  });

// ✅ Submit Add Material Form
addMaterialForm?.addEventListener("submit", async function (event) {
    event.preventDefault();
  
    const fields = [
      "matName", "matPrice", "unitType", "unitQty", "supplier",
      "supplierUrl", "unitPrice", "onHand", "lastUpdated", "reorderLevel"
    ];
  
    const materialInfo = {};
    for (let field of fields) {
      const el = document.getElementById("add-" + field);
      materialInfo[field] = el?.value.trim() || "";
    }
  
    toggleLoader();
  
    try {
      const response = await fetch(`${scriptURL}?action=add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "materials",
          action: "add",
          materialInfo
        })
      });
  
      const result = await response.json();
  
      if (result.success) {
        showToast("✅ Material added successfully!");
        addMaterialForm.reset();
        setMatDataForSearch(); // Refresh searchable material list
        new bootstrap.Tab(document.querySelector('[data-bs-target="#search-material"]')).show();
      } else {
        showToast("❌ Error adding material.", "error");
        console.error(result);
      }
    } catch (error) {
      showToast("❌ Error adding material.", "error");
      console.error("Fetch error:", error);
    } finally {
      toggleLoader();
    }
  });
    
  // ✅ Set a field value safely
  function setValue(row, selector, value) { // Edit Material Form???
    const input = row.querySelector(selector);
    if (!input) {
      const matName = row.querySelector(".materials")?.value || "unknown";
      console.warn(`Missing field for selector: ${selector} in row with material: ${matName}`);
      return;
    }
    input.value = value || "";
  }
    
  // ✅ Utility function to format ISO date for display
  function formatDateForUser(isoDate) {
    if (!isoDate) return "";
    return new Date(isoDate).toLocaleDateString("en-US");
  }
  
  // ✅ Show or hide delete buttons
  function refreshDeleteButtons() {
    const allRows = document.querySelectorAll(".material-row");
    allRows.forEach((row, i) => {
      const btn = row.querySelector(".remove-material-row");
      if (btn) btn.style.display = i === 0 ? "none" : "inline-block";
    });
  }
  
///////////////////////////////// checkpoint 2

// ✅ Populate Edit Form
function populateEditForm(matID) {
    const matIDField = document.getElementById("edit-matID");
    matIDField.value = matID;
    matIDField.removeAttribute("readonly");
    document.getElementById("edit-material-id").value = matID;

    loadDropdowns();
    toggleLoader();

    fetch(`${scriptURL}?action=getMaterialById&matID=${matID}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error(data.error);

            const fields = [
                "matName", "matPrice", "unitType", "unitQty",
                "supplier", "supplierUrl", "unitPrice", "onHand", "outgoing", "lastUpdated", "reorderLevel"
            ];

            fields.forEach(field => {
                const el = document.getElementById(`edit-${field}`);
                if (el) el.value = data[field] || "";
            });
            
            calculateAll();
            toggleLoader(); // ✅ Hide loader when done
        })
        .catch(err => {
            console.error("❌ Error fetching material:", err);
            showToast("❌ Error loading material data!", "error");
            toggleLoader(); // Still hide loader even on error
        });
}

// 🧮 Total Stock Calculation // Edit Material Form
function calculateTotalStock(onHand, incoming, outgoing) {
    return (parseFloat(onHand) || 0) + (parseFloat(incoming) || 0) - (parseFloat(outgoing) || 0);
}

// 🔔 Reorder Alert // Edit Material Form
function checkLowStock() { 
    const total = parseFloat(document.getElementById("edit-totalStock")?.value) || 0;
    const reorder = parseFloat(document.getElementById("edit-reorderLevel")?.value) || 0;
    const alert = document.getElementById("reorderAlert");
    if (!alert) return;

    alert.classList.toggle("d-none", total >= reorder);
}

// ✏️ Main Calculation // Edit Inventory Form???
function calculateAll() { 
    const getVal = id => parseFloat(document.getElementById(id)?.value.replace(/[^0-9.]/g, "") || 0);

    const onHand = getVal("edit-onHand");
    const incoming = getVal("edit-incoming");
    const outgoing = getVal("edit-outgoing");
    const matPrice = getVal("edit-matPrice");
    const unitQty = getVal("edit-unitQty");

    const total = calculateTotalStock(onHand, incoming, outgoing);
    console.log("✅ Inputs:", { matPrice, unitQty });
    const unitPrice = calculateUnitPrice(matPrice, unitQty);

    const totalField = document.getElementById("edit-totalStock");
    if (totalField) totalField.value = total;

    const unitField = document.getElementById("edit-unitPrice");
    if (unitField) unitField.value = unitPrice.toFixed(2);

    checkLowStock();
}

// 📥 Watch Changes
["onHand", "incoming", "outgoing", "matPrice", "unitQty", "reorderLevel"].forEach(field => {
    const el = document.getElementById(`edit-${field}`);
    if (el) el.addEventListener("change", calculateAll);
});

// 🌐 Load All Material Data Once
let materialsData = [];
function fetchMaterialData() {
    fetch(`${scriptURL}?action=getMatDataForSearch`)
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                materialsData = data;
            } else {
                console.error("⚠️ Invalid material data structure");
            }
        })
        .catch(err => console.error("❌ Failed to fetch material data:", err));
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed.");

  const container = document.getElementById("materialRows");
  const saveBtn = document.getElementById("save-inventory-btn");

  toggleLoader();
  setTimeout(toggleLoader, 300);

  fetchMaterialData();
  initializeRows();
  loadDropdowns();

  // 🔘 Save button logic
  saveBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Save button clicked");
    saveInventoryData();
  });

  // 🧱 Handle add/remove buttons
  container?.addEventListener("click", (e) => {
    const target = e.target;

    // ➕ Add material row
    if (target.id === "add-material-btn") {
      const rows = container.querySelectorAll(".material-row");

      if (rows.length >= 10) {
        showToast("🚫 You can only add up to 10 materials.", "warning");
        return;
      }

      // Clone the first row and reset fields
      const newRow = rows[0].cloneNode(true);

      let matIDField = newRow.querySelector(".matID");
      if (!matIDField) {
        matIDField = document.createElement("input");
        matIDField.type = "hidden";
        matIDField.classList.add("matID");
        newRow.appendChild(matIDField);
      }
      matIDField.value = "";

      newRow.querySelectorAll("input").forEach(input => input.value = "");
      newRow.querySelector(".lastUpdated").value = formatDateForUser(new Date());

      newRow.querySelector(".remove-material-row").style.display = "inline-block";

      container.appendChild(newRow);

      attachAutoCalcListeners(newRow);
      refreshDeleteButtons();
    }

    // ➖ Remove material row
    if (target.classList.contains("remove-material-row")) {
      const row = target.closest(".material-row");
      const allRows = container.querySelectorAll(".material-row");

      if (allRows.length > 1) {
        row.remove();
        refreshDeleteButtons();
      } else {
        showToast("⚠️ At least one row must remain.", "info");
      }
    }
  });

  // 🧲 Delegated material name selection logic (fixes dynamic row issue)
  container?.addEventListener("change", (e) => {
    const target = e.target;
    if (target.classList.contains("materials")) {
      handleMaterialLookup({ target });
    }
  });
});

// 🔁 Format date for user-friendly display
function formatDateForUser(date) {
  return date.toLocaleDateString("en-US");
}

// 🧮 Attach calculation logic
function attachAutoCalcListeners(row) {
  const matPriceInput = row.querySelector('.matPrice');
  const unitQtyInput = row.querySelector('.unitQty');
  const unitPriceInput = row.querySelector('.unitPrice');

  if (!matPriceInput || !unitQtyInput || !unitPriceInput) return;

  function cleanCurrency(str) {
    return parseFloat(str.replace(/[^0-9.]/g, ''));
  }

  function calculateUnitPrice() {
    const matPrice = cleanCurrency(matPriceInput.value);
    const unitQty = parseFloat(unitQtyInput.value);

    if (!isNaN(matPrice) && !isNaN(unitQty) && unitQty !== 0) {
      unitPriceInput.value = (matPrice / unitQty).toFixed(2);
    } else {
      unitPriceInput.value = '';
    }
  }

  matPriceInput.addEventListener('change', calculateUnitPrice);
  unitQtyInput.addEventListener('change', calculateUnitPrice);
}

// 🧱 Initialize starting rows
function initializeRows() {
  document.querySelectorAll(".material-row").forEach((row, index) => {
    row.querySelector(".lastUpdated").value = formatDateForUser(new Date());

    const deleteBtn = row.querySelector(".remove-material-row");
    if (deleteBtn) deleteBtn.style.display = index === 0 ? "none" : "inline-block";

    attachAutoCalcListeners(row);
  });
}

// 🔍 Populate fields from selected material
function handleMaterialLookup(e) {
  const input = e.target;
  const name = input.value.trim();
  const row = input.closest(".material-row");
  if (!name || !row) return showToast("❌ Enter a material name", "warning");

  toggleLoader();

  const match = materialsData.find(m => m[1].trim() === name);
  if (!match) {
    showToast(`No data found for "${name}"`, "warning");
    toggleLoader();
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

  Object.entries(fieldMap).forEach(([selector, value]) => {
    const el = row.querySelector(selector);
    if (el) el.value = value;
  });

  console.log("unitQty value:", row.querySelector(".unitQty")?.value);
  console.log("matPrice value:", row.querySelector(".matPrice")?.value);
  console.log("unitPrice value:", row.querySelector(".unitPrice")?.value);

  toggleLoader();
}

// 💾 Save Inventory Form
async function saveInventoryData() {
  console.log("Saving inventory data...");

  const rows = document.querySelectorAll(".material-row");
  console.log(`Found ${rows.length} material rows.`);

  toggleLoader();

  for (const row of rows) {
    const matID = row.querySelector(".matID")?.value.trim();
    const matName = row.querySelector(".matName")?.value.trim() || matID;
    if (!matID) {
      console.log("Skipping row due to missing matID.");
      continue;
    }

    const unitQtyInput = row.querySelector(".unitQty");
    const incomingInput = row.querySelector(".incoming");

    // Sync unitQty with incoming (ensures they are the same)
    if (unitQtyInput && incomingInput) {
      incomingInput.value = unitQtyInput.value.trim();
    }

    // Now extract values (incoming and unitQty are synced)
    const matPrice = row.querySelector(".matPrice")?.value.trim() || "";
    const unitQty = unitQtyInput?.value.trim() || "";
    const incoming = incomingInput?.value.trim() || "";

    const materialInfo = {
      matName,
      matPrice,
      unitType: row.querySelector(".unitType")?.value.trim() || "",
      unitQty, // Add unitQty for storage
      supplier: row.querySelector(".supplier")?.value.trim() || "",
      supplierUrl: row.querySelector(".supplierUrl")?.value.trim() || "",
      unitPrice: row.querySelector(".unitPrice")?.value.trim() || "",
      incoming, // Save synced value for incoming
      lastUpdated: new Date() // Save the current date
    };

    console.log("Sending material data to backend:", materialInfo);

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
      console.log("Save result:", result);

      if (result.success) {
        showToast(`✅ Saved ${matName}`, "success");
        row.querySelectorAll("input").forEach(input => {
          if (!input.classList.contains("lastUpdated")) input.value = "";
        });
        row.querySelector(".lastUpdated").value = formatDateForUser(new Date()); // Update lastUpdated for display
      } else {
        showToast(`❌ Failed to save ${matName}`, "error");
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast(`❌ Error saving ${matName}`, "error");
    }
  }

  toggleLoader();
}
