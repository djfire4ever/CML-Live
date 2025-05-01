// ✅ Utility: Show Edit Tab
function showEditTab() {
    const editTab = document.querySelector('[data-bs-target="#edit-product"]');
    if (editTab) new bootstrap.Tab(editTab).show();
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
    setTimeout(toggleLoader, 2000);
});

// ✅ Product Data
let prodData = [];

// ✅ Load Search Data
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

    const searchCounter = getOrCreateCounter("searchCounter", ["px-2", "py-1", "border", "rounded", "fw-bold", "bg-success", "text-dark"], counterContainer);
    const totalCounter = getOrCreateCounter("totalCounter", ["px-3", "py-1", "border", "rounded", "fw-bold", "bg-light", "text-dark"], counterContainer, searchCounter);

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
        row.querySelector(".prodID").textContent = r[0];
        row.querySelector(".productName").textContent = r[1];
        row.querySelector(".productType").textContent = r[2];
        row.querySelector(".cost").textContent = r[46];
        row.querySelector(".retail").textContent = r[45];
        row.querySelector(".edit-button").dataset.productid = r[0];
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

    // Handle Edit
    const editBtn = target.closest(".edit-button");
    if (editBtn) {
        const prodID = editBtn.dataset.productid;
        if (!prodID) return console.error("❌ Error: Missing prodID!");
        populateEditForm(prodID);
        showEditTab();
    }
});

// ✅ Utility functions
function getField(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function setField(id, value = "") {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

// ✅ Populate edit form
async function populateEditForm(prodID) {
    try {
      toggleLoader(true);
  
      // Ensure material data is available
      if (Object.keys(materialData).length === 0) await setMaterialDataForEdit();
      if (Object.keys(materialData).length === 0) {
        console.warn("⚠️ Material data is empty.");
        console.log("📦 Loaded materialData:", materialData);
        showToast("⚠️ Material data missing. Please reload the page.", "warning");
        return;
      }
  
      // Set product ID and basic fields
      setField("edit-prodID", prodID);
      document.getElementById("edit-prodID").removeAttribute("readonly");
      setField("edit-prodID-hidden", prodID);
  
      // Load dropdowns for select elements
      loadDropdowns();
  
      // Fetch product details from the backend
      const res = await fetch(`${scriptURL}?action=getProductById&prodID=${prodID}`);
      if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
      const data = await res.json();
      if (!data || data.error) throw new Error(data?.error || "No product data found");
  
      // Populate basic fields
      ["productName", "productType", "compTime", "retail", "cost", "description"].forEach(field =>
        setField(`edit-${field}`, data[field] || "")
      );
  
      // Clear existing part rows before populating new ones
      clearPartRows("edit-part-rows");
  
      // Populate part rows (only up to the max allowed parts)
      for (let i = 1; i <= maxParts; i++) {
        const partName = data[`part${i}`];
        const qty = data[`qty${i}`];
        if (partName && qty) {
          const material = Object.values(materialData).find(m => m.name === partName);
          if (material) {
            // Add each part row based on material data and quantity
            addPartRowTo("edit-part-rows", partName, qty);
          } else {
            console.warn(`⚠️ Part "${partName}" not found in materialData!`);
          }
        }
      }
  
      // Recalculate the total product cost after loading all part rows
      calculateTotalProductCost();
  
      // Show the edit pane and scroll into view
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
  
  // ✅ DOM Ready logic for material data loading
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      // Ensure material data is loaded as soon as the page is ready
      await setMaterialDataForEdit();
    } catch (err) {
      console.error("❌ Failed to load material data", err);
      showToast("❌ Failed to load material data!", "error");
    }
  });
  
// Edit form save
document.addEventListener("DOMContentLoaded", () => {
    const saveBtn = document.getElementById("save-changes");
    saveBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      toggleLoader();
  
      const formData = {
        system: "products",
        action: "edit",
        prodID: getField("edit-prodID"),
        productName: getField("edit-productName"),
        productType: getField("edit-productType"),
        compTime: getField("edit-compTime"),
        description: getField("edit-description"),
        retail: getField("totalProductRetail"),
        cost: getField("totalProductCost")
      };
  
      // Directly collect part rows instead of using collectPartRows()
      const partRows = document.querySelectorAll("#edit-part-rows .part-row");
      const parts = {};
      let validCount = 0;
  
      partRows.forEach((row, i) => {
        const part = row.querySelector(".part-input")?.value.trim();
        const qty = row.querySelector(".qty-input")?.value.trim();
  
        if (part && qty) {
          validCount++;
          parts[`part${i + 1}`] = part;
          parts[`qty${i + 1}`] = qty;
        }
      });
  
      if (validCount === 0) {
        showToast("⚠️ At least one part and quantity must be provided.", "error");
        toggleLoader();
        return;
      }
  
      Object.assign(formData, parts);
  
      try {
        const res = await fetch(scriptURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
  
        const result = await res.json();
        if (result.success) {
          showToast("✅ Product updated!");
          document.getElementById("searchInput").value = "";
          document.getElementById("searchResults").innerHTML = "";
          setProdDataForSearch();
          document.querySelector('[data-bs-target="#search-product"]')?.click();
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
  
// Add form submit
addProductForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  toggleLoader();

  const fields = ["productName", "productType", "compTime", "description", "retail", "cost"];
  const productInfo = fields.map(getField);

  for (let i = 1; i <= 20; i++) {
    productInfo.push(getField(`part${i}`));
    productInfo.push(getField(`qty${i}`));
  }

  try {
    const res = await fetch(`${scriptURL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "products", action: "add", productInfo })
    });

    const result = await res.json();
    if (result.success) {
      showToast("✅ Product added!");
      addProductForm.reset();
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

