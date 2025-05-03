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
    setTimeout(() => toggleLoader(false), 2000); // Delay ensures it always hides
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
        searchCounter.classList.add("px-2", "py-1", "border", "rounded", "fw-bold", "bg-success", "text-dark");
        counterContainer.appendChild(searchCounter);
    }

    let totalCounter = document.getElementById("totalCounter");
    if (!totalCounter) {
        totalCounter = document.createElement("span");
        totalCounter.id = "totalCounter";
        totalCounter.classList.add("px-3", "py-1", "border", "rounded", "fw-bold", "bg-light", "text-dark");
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
  
  function updateUnitPrice() { // for Add Material Form
    const price = parseFloat(document.getElementById("add-matPrice")?.value || 0);
    const qty = parseFloat(document.getElementById("add-unitQty")?.value || 0);
    const unitPrice = qty > 0 ? price / qty : 0;
    const unitField = document.getElementById("add-unitPrice");
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

// Add Inventory Form // 
// ✅ On DOM load
document.addEventListener("DOMContentLoaded", () => {
  toggleLoader();
  setTimeout(toggleLoader, 300); // Simulated loader

  fetchMaterialData();
  initializeRows();
  attachMaterialListeners();

  document.getElementById("save-inventory-btn")?.addEventListener("click", e => {
    e.preventDefault();
    saveInventoryData();
  });

  // Add material row
  document.getElementById("materialRows")?.addEventListener("click", e => {
    if (e.target.id === "add-material-btn") {
      const container = document.getElementById("materialRows");
      const rows = container.querySelectorAll(".material-row");

      if (rows.length >= 10) {
        showToast("🚫 You can only add up to 10 materials.", "warning");
        return;
      }

      const newRow = rows[0].cloneNode(true);
      newRow.querySelectorAll("input").forEach(input => input.value = "");
      newRow.querySelector(".lastUpdated").value = new Date(); // ISO default
      newRow.querySelector(".remove-material-row").style.display = "inline-block";

      container.appendChild(newRow);
      attachMaterialListeners();
      refreshDeleteButtons();
    }
  });

  // Remove material row
  document.getElementById("materialRows")?.addEventListener("click", e => {
    if (e.target.classList.contains("remove-material-row")) {
      const row = e.target.closest(".material-row");
      const allRows = document.querySelectorAll(".material-row");
      if (allRows.length > 1) {
        row.remove();
        refreshDeleteButtons();
      } else {
        showToast("⚠️ At least one row must remain.", "info");
      }
    }
  });

  // Load dropdowns
  loadDropdowns();
});

// 🧱 Initialize Material Rows
function initializeRows() {
    document.querySelectorAll(".material-row").forEach((row, i) => {
      const now = new Date();
      row.querySelector(".lastUpdated").value = formatDateForUser(now); // 👁️ For display only
      const deleteBtn = row.querySelector(".remove-material-row");
      if (deleteBtn) deleteBtn.style.display = i === 0 ? "none" : "inline-block";
    });
  }
    
  function calculateUnitPrice(price, qty) { // Add Inventory Form???
    const parsedPrice = parseFloat(price);
    const parsedQty = parseFloat(qty);
  
    if (isNaN(parsedPrice) || isNaN(parsedQty) || parsedQty === 0) {
        return 0;
    }
  
    return parsedPrice / parsedQty;
  }
  
  function calculateUnitPriceInRow(row) { // Add Inventory Form???
    const price = parseFloat(row.querySelector(".matPrice")?.value || 0);
    const qty = parseFloat(row.querySelector(".unitQty")?.value || 0);
    const unitField = row.querySelector(".unitPrice");
  
    const unit = qty > 0 ? price / qty : 0;
    if (unitField) unitField.value = unit.toFixed(2);
  }
  
  function attachMaterialListeners() { // Add Inventory Form???
    document.querySelectorAll(".materials").forEach(input => {
      input.removeEventListener("change", handleMaterialLookup);
      input.addEventListener("change", handleMaterialLookup);
    });
  
    document.querySelectorAll(".material-row").forEach(row => {
      const priceInput = row.querySelector(".matPrice");
      const qtyInput = row.querySelector(".incoming");
      const onHandInput = row.querySelector(".onHand");
      const outgoingInput = row.querySelector(".outgoing");
      const unitField = row.querySelector(".unitPrice");
      const totalStockField = row.querySelector(".totalStock");
  
      // 🧮 Function to calculate Unit Price
      function calculateUnitPrice(price, qty) {
        return (parseFloat(price) / parseFloat(qty)) || 0;
      }
  
      // 🧮 Function to calculate Total Stock
      function calculateTotalStock(onHand, incoming, outgoing) {
        return (parseFloat(onHand) || 0) + (parseFloat(incoming) || 0) - (parseFloat(outgoing) || 0);
      }
  
      function handlePriceQtyChange() {
        const price = priceInput?.value.trim() || "";
        const qty = qtyInput?.value.trim() || "";
        const onHand = onHandInput?.value.trim() || "";
        const outgoing = outgoingInput?.value.trim() || "";
  
        // 🧮 Unit Price Calculation
        const unitPrice = calculateUnitPrice(price, qty);
        if (unitField) unitField.value = unitPrice.toFixed(2); // Update unit price
  
        // 🧮 Total Stock Calculation (onHand + incoming - outgoing)
        const totalStock = calculateTotalStock(onHand, qty, outgoing);
        if (totalStockField) totalStockField.value = totalStock; // Update total stock
      }
  
      // Add event listeners to the necessary fields
      [priceInput, qtyInput, onHandInput, outgoingInput].forEach(input => {
        if (input) {
          input.removeEventListener("change", handlePriceQtyChange); // Remove previous listeners
          input.addEventListener("change", handlePriceQtyChange);    // Add new listeners
        }
      });
    });
  }
    
  function handlePriceQtyChange(row) {
    const matPrice = row.querySelector(".matPrice")?.value.trim() || "";
    const unitQty = row.querySelector(".unitQty")?.value.trim() || "";
    const unitField = row.querySelector(".unitPrice");
  
    const unitPrice = calculateUnitPrice(matPrice, unitQty);
    if (unitField) unitField.value = unitPrice.toFixed(2);
  }
  
  function handleIncomingChange(row) {
    const incomingQty = parseFloat(row.querySelector(".incoming").value || 0);
    const onHandField = row.querySelector(".onHand");
    const previousOnHand = parseFloat(onHandField.value || 0);
    const newOnHand = previousOnHand + incomingQty;
    onHandField.value = newOnHand.toFixed(2); // Update onHand with new value
  }

  const incomingInput = row.querySelector(".incoming");
    if (incomingInput) {
      incomingInput.addEventListener("change", () => handleIncomingChange(row));
    }

// 🔍 Handle Lookup by Material Name
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

  const fields = {
      ".matID": match[0],
      ".matName": match[1],
      ".matPrice": match[2],
      ".unitType": match[3],
      ".unitQty": match[4], // Make sure this is the field for units per package
      ".supplier": match[5],
      ".supplierUrl": match[6],
      ".unitPrice": match[7], // Unit price may be pre-calculated in your data
      ".onHand": match[8], // If onHand data is available
      ".incoming": match[9]
  };

  for (let selector in fields) {
      const el = row.querySelector(selector);
      if (el) el.value = fields[selector];
  }

  toggleLoader();
}

// 💾 Save Inventory Form
async function saveInventoryData() {
  const rows = document.querySelectorAll(".material-row");
  toggleLoader();

  for (const row of rows) {
    const matID = row.querySelector(".matID")?.value.trim();
    const matName = row.querySelector(".matName")?.value.trim() || matID;
    if (!matID) continue;

    const matPrice = row.querySelector(".matPrice")?.value.trim() || "";
    const unitQty = row.querySelector(".unitQty")?.value.trim() || "";
    const incoming = row.querySelector(".incoming")?.value.trim() || "";
    const onHand = row.querySelector(".onHand")?.value.trim() || "";

    const materialInfo = {
      matName,
      matPrice,
      unitType: row.querySelector(".unitType")?.value.trim() || "",
      supplier: row.querySelector(".supplier")?.value.trim() || "",
      supplierUrl: row.querySelector(".supplierUrl")?.value.trim() || "",
      unitPrice: row.querySelector(".unitPrice")?.value.trim() || "",
      onHand, // Ensure you're saving the updated onHand value
      incoming,
      lastUpdated: new Date() // Save the current date
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
