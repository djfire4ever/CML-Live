// Restore Point 11:30PM 9/2/2025

// ----- Global Config -----
const SELECTORS = {
  searchInput: "searchInput",
  resultsContainer: "productSearchResults",
  rowTemplate: "rowTemplate",
  totalCostField: "totalCost",
  totalRetailField: "totalRetail",
  partBadge: "partrow-header-display",
  addProductForm: "addProductForm",
  addPartContainer: "part-rows",
  addProductPartsAccordion: "addProductPartsAccordion"
};

let productData = [];
let materialData = {}; // matID -> { matID, name, unitPrice }
let materialByName = {}; // name -> material object (fast lookup)
const maxParts = 15;

function roundUpToStep(value, step = 0.05) {
  return Math.ceil(value / step) * step;
}

// ----- DOM Ready -----
document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById(SELECTORS.searchInput);
  if (!searchInput) return;

  await loadMaterialData();
  await loadProducts();
  await loadDropdowns();

  searchInput.addEventListener("input", renderResults);
  renderResults();          // initial render
  setupAddProductForm();

  // Live totals for any part row input
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!el || !el.closest) return;
    if (el.matches(".part-input, .qty-input, input.totalRowCost, input.totalRowRetail")) {
      const partsContainer = el.closest(".part-rows");
      if (partsContainer) recalculateTotals(partsContainer);
    }
  });

  document.addEventListener("change", (e) => {
    const el = e.target;
    if (!el || !el.closest) return;
    if (el.matches(".part-input, .qty-input")) {
      const partsContainer = el.closest(".part-rows");
      if (partsContainer) recalculateTotals(partsContainer);
    }
  });

  // Show all datalist options on focus
  document.addEventListener("focusin", (e) => {
    const t = e.target;
    if (t?.tagName === "INPUT" && t.hasAttribute("list") && t.value) {
      const val = t.value;
      t.value = "";
      setTimeout(() => { t.value = val; t.setSelectionRange?.(val.length, val.length); }, 0);
    }
  });
});

// ----- Load Products -----
async function loadProducts() {
  toggleLoader(true);
  try {
    const res = await fetch(`${scriptURL}?action=getProdDataForSearch`);
    const json = await res.json();

    const data = Array.isArray(json) ? json : json.data || [];
    
    productData = data.map(product => {
      let parts = [];
      try {
        if (product[4]) {
          parts = JSON.parse(product[4]);
          // If the stored value was stringified twice (escaped quotes), JSON.parse
          // may return a string containing JSON. Try parsing again in that case.
          if (typeof parts === 'string') {
            try { parts = JSON.parse(parts); } catch (e2) { /* leave as-is */ }
          }
        } else {
          parts = [];
        }
      } catch (e) {
        parts = [];
      }
      // Ensure we always have an array
      if (!Array.isArray(parts)) parts = [];
      return {
        prodID: product[0],
        productName: product[1],
        productType: product[2],
        parts,
        description: product[5],
        cost: parseFloat(product[6]) || 0,
        retail: parseFloat(product[7]) || 0,
        lastUpdated: product[8] || "",
        raw: product
      };
    });
  } catch (err) {
    console.error("❌ Error loading product data:", err);
    productData = [];
  } finally { toggleLoader(false); }
}

// ----- Load Material Data -----
async function loadMaterialData() {
  toggleLoader(true);
  try {
    const res = await fetch(`${scriptURL}?action=getMatDataForSearch`);
    const raw = await res.json();
    materialData = {};
    materialByName = {};

    raw.forEach(row => {
      const id = row[0]?.trim();
      const name = row[1]?.trim();
      const supplierUrl = row[6]?.trim() || ""; // column G/7
      const unitPrice = parseFloat(row[7]?.replace(/[^0-9.]/g, "")) || 0; // column H/8
      const onHand = parseFloat(row[8]?.replace(/[^0-9.]/g, "")) || 0; // column I/9

      if (id && name) {
        const mat = { matID: id, name, supplierUrl, unitPrice, onHand };
        materialData[id] = mat;
        materialByName[name] = mat;
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
  } catch (err) {
    console.error("❌ Error loading materials:", err);
    showToast("❌ Failed to load materials", "error");
  } finally { 
    toggleLoader(false); 
  }
}

// ----- Render Products Accordion -----
function renderResults() {
  const searchInput = document.getElementById(SELECTORS.searchInput);
  const resultsContainer = document.getElementById(SELECTORS.resultsContainer);
  const template = document.getElementById(SELECTORS.rowTemplate);
  if (!searchInput || !resultsContainer || !template) return;

  const query = (searchInput.value || "").toLowerCase().trim();
  const words = query.split(/\s+/).filter(Boolean);

  const filtered = query
    ? productData.filter(prod => words.every(w =>
        Object.values(prod).some(val => (val?.toString() || "").toLowerCase().includes(w))
      ))
    : productData.slice();

  resultsContainer.innerHTML = "";

  filtered.forEach((prod) => {
    const prodID = prod.prodID?.toString() ?? "";
    const clone = template.content.cloneNode(true);
    const wrapper = clone.querySelector(".accordion-item");
    if (!wrapper) return;
    wrapper.dataset.prodId = prodID;

    // Wire collapse IDs
    [["h2.accordion-header", ".accordion-button", ".accordion-collapse", ""],
     [".parts-accordion h2.accordion-header", ".parts-accordion .accordion-button", ".parts-accordion .accordion-collapse", "parts-"]]
    .forEach(([header, btnSel, collapseSel, prefix]) => {
      const h = wrapper.querySelector(header);
      const b = h ? h.querySelector(".accordion-button") : null;
      const c = wrapper.querySelector(collapseSel);
      if (!h || !c) return;
      const hId = `${prefix}heading-${prodID}`;
      const cId = `${prefix}collapse-${prodID}`;
      h.id = hId;
      if (b) b.setAttribute("data-bs-target", `#${cId}`), b.setAttribute("aria-controls", cId);
      c.id = cId;
      c.setAttribute("aria-labelledby", hId);
      if (!prefix) c.setAttribute("data-bs-parent", `#${SELECTORS.resultsContainer}`);
    });

    // Populate fields
    const fields = {
      productName: wrapper.querySelector(".productName"),
      totalRetail: wrapper.querySelector(".totalRetail"),
      totalCostBody: wrapper.querySelector(".totalCost-body"),
      prodID: wrapper.querySelector(".prodID"),
      productType: wrapper.querySelector(".productType-legend"),
      prodDate: wrapper.querySelector(".prodDate"),
      nameBody: wrapper.querySelector(".productName-body"),
      description: wrapper.querySelector(".description"),
      totalRetailBody: wrapper.querySelector(".totalRetail-body"),
      inStockBody: wrapper.querySelector(".inStockValue"),          // body span
      inStockHeader: wrapper.querySelector(".inStockValue-header") // header span
    };

    // In renderResults, after selecting the inStock spans:
    const inStockValue = calculateInStock(prod);

    if (fields.inStockBody) {
      fields.inStockBody.textContent = inStockValue;
      fields.inStockBody.onclick = () => renderInStockModal(prod);
    }

    if (fields.inStockHeader) {
      fields.inStockHeader.textContent = inStockValue;
      fields.inStockHeader.onclick = () => renderInStockModal(prod);
    }

    // Populate other fields
    if (fields.totalCostBody) fields.totalCostBody.textContent = formatCurrency(prod.cost ?? 0);
    if (fields.totalRetailBody) fields.totalRetailBody.textContent = formatCurrency(prod.retail ?? 0);
    if (fields.productName) fields.productName.textContent = prod.productName ?? "";
    if (fields.totalRetail) fields.totalRetail.textContent = formatCurrency(prod.retail ?? 0);
    if (fields.prodID) fields.prodID.textContent = prod.prodID ?? "";
    if (fields.productType) fields.productType.textContent = prod.productType ?? "";
    if (fields.prodDate) fields.prodDate.textContent = formatDateForUser(prod.lastUpdated) || "—";

    // Prefill editable inputs
    const editableFields = [
      { span: fields.nameBody, inputCls: ".productName-input", value: prod.productName },
      { span: fields.description, inputCls: ".description-input", value: prod.description },
      { span: fields.productType, inputCls: ".productType-input", value: prod.productType }
    ];
    editableFields.forEach(f => {
      if (!f.span) return;
      f.span.textContent = f.value ?? "";
      const input = wrapper.querySelector(f.inputCls);
      if (input) {
        input.value = f.value ?? "";
        input.classList.add("d-none"); // ensure readonly by default
        attachAutogrow(input);
      }
    });

    // ProductType icon
    const iconElem = wrapper.querySelector(".productType-icon");
    if (iconElem) {
      iconElem.innerHTML = (prod.productType === "Product")
        ? '<i class="fa-solid fa-tag text-success"></i>'
        : prod.productType === "Rental"
          ? '<i class="fa-solid fa-key text-primary"></i>'
          : "";
    }

    // Populate parts (readonly)
    const partsContainer = wrapper.querySelector(".part-rows");
    if (partsContainer && Array.isArray(prod.parts)) {
      partsContainer.innerHTML = "";
      prod.parts.forEach(p => addPartRow(partsContainer, p.matName ?? p.name ?? "", p.qty ?? 0));
      recalculateTotals(partsContainer);
    }

    // Update parts header count
    const headerDisplay = wrapper.querySelector(".partrow-header-display");
    if (headerDisplay && partsContainer) {
      headerDisplay.textContent = `Parts • ${partsContainer.querySelectorAll(".part-row").length}`;
    }

    // Add Part button
    const addPartBtn = wrapper.querySelector(".addPartBtn");
    if (addPartBtn && partsContainer) {
      addPartBtn.addEventListener("click", () => {
        if (partsContainer.querySelectorAll(".part-row").length >= maxParts) return showToast("⚠️ Max parts reached","warning");
        addPartRow(partsContainer, "", 0, 0, 0, false, true);
        recalculateTotals(partsContainer);
        if (headerDisplay) headerDisplay.textContent = `Parts • ${partsContainer.querySelectorAll(".part-row").length}`;
      });
    }

    // Wire edit toggle (readonly by default)
    enableEditToggle(wrapper);

    resultsContainer.appendChild(clone);
  });

  // Update counters
  const totalCounter = document.getElementById("totalCounter");
  if (totalCounter) totalCounter.textContent = String(productData.length);
  const searchCounter = document.getElementById("searchCounter");
  if (searchCounter) searchCounter.textContent = String(filtered.length);
}

// ----- Enable Edit Toggle with Save/Delete wired to backend
function enableEditToggle(wrapper) {
  const editBtn = wrapper.querySelector(".edit-button");
  const saveBtn = wrapper.querySelector(".save-button");
  const cancelBtn = wrapper.querySelector(".cancel-button");
  const beforeDeleteBtn = wrapper.querySelector(".before-delete-button");
  const deleteBtn = wrapper.querySelector(".delete-button");

  if (!editBtn || !saveBtn || !cancelBtn || !beforeDeleteBtn || !deleteBtn) return;

  const fields = {
    productName: { span: wrapper.querySelector(".productName-body"), input: wrapper.querySelector(".productName-input") },
    description: { span: wrapper.querySelector(".description"), input: wrapper.querySelector(".description-input") },
    productType: { span: wrapper.querySelector(".productType-legend"), input: wrapper.querySelector(".productType-input") }
  };

  const iconElem = wrapper.querySelector(".productType-icon");
  const partsContainer = wrapper.querySelector(".part-rows");
  const addPartBtn = wrapper.querySelector(".addPartBtn");

  const toggleEditMode = (editing) => {
    // Buttons
    editBtn.classList.toggle("d-none", editing);
    saveBtn.classList.toggle("d-none", !editing);
    cancelBtn.classList.toggle("d-none", !editing);
    saveBtn.disabled = !editing; // initially disabled

    // Main fields
    Object.values(fields).forEach(f => {
      if (!f.span || !f.input) return;
      f.span.classList.toggle("d-none", editing);
      f.input.classList.toggle("d-none", !editing);
      if (editing) f.input.value = f.span.textContent.trim();
    });

    // Parts rows
    if (partsContainer) {
      partsContainer.querySelectorAll(".part-row").forEach((row, rowIndex) => {
        const nameInput = row.querySelector(".part-input");
        const qtyInput = row.querySelector(".qty-input");
        const nameSpan = row.querySelector(".part-name-span");
        const qtySpan = row.querySelector(".part-qty-span");
        const costInput = row.querySelector(".totalRowCost");
        const retailInput = row.querySelector(".totalRowRetail");
        const costSpan = row.querySelector(".part-cost-span");
        const retailSpan = row.querySelector(".part-retail-span");
        const removeBtn = row.querySelector(".remove-part");

        if (editing) {
          [nameInput, qtyInput, costInput, retailInput].forEach(el => el && el.classList.remove("d-none"));
          [nameSpan, qtySpan, costSpan, retailSpan].forEach(el => el && el.classList.add("d-none"));
          nameInput.value = nameSpan.textContent.trim();
          qtyInput.value = parseFloat(qtySpan.textContent) || 0;
          const parsedCost = parseFloat(costInput.dataset.raw || 0);
          const parsedRetail = parseFloat(retailInput.dataset.raw || 0);
          costInput.dataset.raw = String(parsedCost);
          retailInput.dataset.raw = String(parsedRetail);
          costInput.value = formatCurrency(parsedCost);
          retailInput.value = formatCurrency(parsedRetail);

          if (removeBtn) removeBtn.style.display = "";
        } else {
          [nameInput, qtyInput, costInput, retailInput].forEach(el => el && el.classList.add("d-none"));
          [nameSpan, qtySpan, costSpan, retailSpan].forEach(el => el && el.classList.remove("d-none"));
          nameSpan.textContent = nameInput.value;
          qtySpan.textContent = qtyInput.value;
          costSpan.textContent = formatCurrency(parseFloat(costInput.dataset.raw || 0));
          retailSpan.textContent = formatCurrency(parseFloat(retailInput.dataset.raw || 0));

          if (removeBtn) removeBtn.style.display = "none";
        }

        // Input listeners (enable save + recalc totals)
        if (editing && !row.dataset.listenersAttached) {
          if (nameInput) nameInput.addEventListener("input", () => { recalculateTotals(partsContainer); saveBtn.disabled = false; });
          if (qtyInput) qtyInput.addEventListener("input", () => { recalculateTotals(partsContainer); saveBtn.disabled = false; });
          if (removeBtn) removeBtn.addEventListener("click", () => { setTimeout(() => recalculateTotals(partsContainer), 0); saveBtn.disabled = false; });
          row.dataset.listenersAttached = "1";
        }
      });

      if (addPartBtn) addPartBtn.style.display = editing ? "" : "none";
    }
  };

  const updateIcon = () => {
    const val = fields.productType.input?.classList.contains("d-none")
      ? fields.productType.span?.textContent.trim()
      : fields.productType.input?.value;
    if (!iconElem) return;
    iconElem.innerHTML = val === "Product"
      ? '<i class="fa-solid fa-tag text-success"></i>'
      : val === "Rental"
        ? '<i class="fa-solid fa-key text-primary"></i>'
        : "";
  };

  // Edit/Cancel
  editBtn.addEventListener("click", () => { toggleEditMode(true); updateIcon(); });
  cancelBtn.addEventListener("click", () => { toggleEditMode(false); updateIcon(); });

  // Save wired to backend
  saveBtn.addEventListener("click", async () => {
    const prodID = wrapper.dataset.prodId;

    // normalize totals to numeric strings (strip currency formatting)
    const totalCostEl = partsContainer.querySelector(".totalCost-input");
    const totalRetailEl = partsContainer.querySelector(".totalRetail-input");
    const totalCostNumeric = parseFloat((totalCostEl?.textContent || totalCostEl?.value || '').toString().replace(/[^0-9.-]+/g, '')) || 0;
    const totalRetailNumeric = parseFloat((totalRetailEl?.textContent || totalRetailEl?.value || '').toString().replace(/[^0-9.-]+/g, '')) || 0;

    const partsArray = Array.from(partsContainer.querySelectorAll(".part-row"))
      .map(r => {
        const name = r.querySelector(".part-input")?.value.trim() || '';
        const qtyRaw = r.querySelector(".qty-input")?.value ?? r.querySelector(".part-qty-span")?.textContent ?? '0';
        const qtyNum = parseFloat(qtyRaw.toString().replace(/[^0-9.-]+/g, '')) || 0;
        // return qty as string to match Add behavior and other systems
        return { matName: name, qty: String(qtyNum) };
      })
      .filter(p => p.matName && parseFloat(p.qty) > 0);

    const productInfo = {
      productName: fields.productName.input.value,
      productType: fields.productType.input.value,
      description: fields.description.input.value,
      cost: totalCostNumeric,
      retail: totalRetailNumeric,
      parts: partsArray, // raw array for compatibility
      // Send partsJSON as a JSON string for the edit path. The edit backend
      // writes productObj[key] directly into the sheet, so sending a string
      // ensures the cell contains a proper JSON array string (no {key=value} form).
      partsJSON: JSON.stringify(partsArray)
    };

    toggleLoader();
    try {
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: "products", action: "edit", prodID, productInfo })
      });
      const result = await res.json();
      if (result.success) {
        showToast(result.data || "✅ Product updated!");
        toggleEditMode(false);
      } else {
        showToast(result.message || "❌ Error updating product!", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Error updating product!", "error");
    } finally { toggleLoader(); }
  });

  // Delete workflow
  beforeDeleteBtn.addEventListener("click", () => {
    const isDelete = beforeDeleteBtn.dataset.buttonState === "delete";
    beforeDeleteBtn.textContent = isDelete ? "Cancel" : "Delete";
    beforeDeleteBtn.dataset.buttonState = isDelete ? "cancel" : "delete";
    deleteBtn.classList.toggle("d-none", !isDelete);
  });

  deleteBtn.addEventListener("click", () => {
    const prodID = wrapper.dataset.prodId;
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
        wrapper.remove();
      } else showToast("⚠️ Could not delete product.", "error");
    })
    .catch(() => showToast("⚠️ Error deleting product.", "error"))
    .finally(toggleLoader);
  });

  if (fields.productType.input) fields.productType.input.addEventListener("input", updateIcon);

  // Start readonly
  toggleEditMode(false);
}

// ----- Add Part Row (attach listeners inline; no helper functions) -----
function addPartRow(partsContainer, name = "", qty = 0, cost = 0, retail = 0, isAddCard = false, editingRow = false) {
  const template = document.getElementById("partRowTemplate");
  if (!template) {
    console.warn("❌ Part row template not found!");
    return;
  }

  const clone = template.content.cloneNode(true);
  const row = clone.querySelector(".part-row");
  if (!row) return;

  const nameSpan = row.querySelector(".part-name-span");
  const nameInput = row.querySelector(".part-input");
  const qtySpan = row.querySelector(".part-qty-span");
  const qtyInput = row.querySelector(".qty-input");
  const costSpan = row.querySelector(".part-cost-span");
  const costInput = row.querySelector(".totalRowCost");
  const retailSpan = row.querySelector(".part-retail-span");
  const retailInput = row.querySelector(".totalRowRetail");
  const removeBtn = row.querySelector(".remove-part");

  // Readonly presentation
  nameSpan.textContent = name;
  qtySpan.textContent = String(qty);
  costSpan.textContent = formatCurrency(cost || 0);
  retailSpan.textContent = formatCurrency(retail || 0);

  // Prefill inputs
  if (nameInput) nameInput.value = name;
  if (qtyInput) qtyInput.value = qty;
  if (costInput) { costInput.dataset.raw = String(cost || 0); costInput.value = formatCurrency(cost || 0); }
  if (retailInput) { retailInput.dataset.raw = String(retail || 0); retailInput.value = formatCurrency(retail || 0); }

  // If this is an Add card row or explicitly requested as editable, show inputs
  if (isAddCard || editingRow) {
    if (nameInput) nameInput.classList.remove("d-none");
    if (qtyInput) qtyInput.classList.remove("d-none");
    if (costInput) costInput.classList.remove("d-none");
    if (retailInput) retailInput.classList.remove("d-none");
    if (nameSpan) nameSpan.classList.add("d-none");
    if (qtySpan) qtySpan.classList.add("d-none");
    if (costSpan) costSpan.classList.add("d-none");
    if (retailSpan) retailSpan.classList.add("d-none");
  } else {
    // ensure readonly inputs are hidden
    if (nameInput) nameInput.classList.add("d-none");
    if (qtyInput) qtyInput.classList.add("d-none");
    if (costInput) costInput.classList.add("d-none");
    if (retailInput) retailInput.classList.add("d-none");
    if (nameSpan) nameSpan.classList.remove("d-none");
    if (qtySpan) qtySpan.classList.remove("d-none");
    if (costSpan) costSpan.classList.remove("d-none");
    if (retailSpan) retailSpan.classList.remove("d-none");
  }

  // Attach listeners ONCE for this row:
  if (!row.dataset.listenersAttached) {
    // input -> sync span + totals
    if (nameInput) {
      nameInput.addEventListener("input", () => {
        // sync span (for live preview)
        if (nameSpan) nameSpan.textContent = nameInput.value;
        recalculateTotals(partsContainer);
        console.log("addPartRow: name input changed:", nameInput.value);
      });
    }
    if (qtyInput) {
      qtyInput.addEventListener("input", () => {
        if (qtySpan) qtySpan.textContent = qtyInput.value;
        recalculateTotals(partsContainer);
      });
    }

    // Remove button
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        console.log("addPartRow: remove button clicked");
        row.remove();
        recalculateTotals(partsContainer);
      });
    }

    row.dataset.listenersAttached = "1";
  }

  // Append the row to the container
  partsContainer.appendChild(row);

  // Immediately recalc totals so UI reflects this new row
  recalculateTotals(partsContainer);
}

// ----- Recalculate Totals
function recalculateTotals(partsContainer) {
  if (!partsContainer) return;

  let totalCost = 0;
  let totalRetail = 0;

  partsContainer.querySelectorAll(".part-row").forEach(row => {
    const name = (row.querySelector(".part-input")?.value || "").trim();
    const qty = parseFloat(row.querySelector(".qty-input")?.value) || 0;
    const mat = materialByName[name];
    const unitPrice = mat ? roundUpToStep(mat.unitPrice, 0.05) : 0;
    const cost = unitPrice * qty;
    const retail = cost * 2;

    totalCost += cost;
    totalRetail += retail;

    // Update both spans and inputs
    const costSpan = row.querySelector(".part-cost-span");
    const retailSpan = row.querySelector(".part-retail-span");
    const costInput = row.querySelector(".totalRowCost");
    const retailInput = row.querySelector(".totalRowRetail");

    if (costSpan) costSpan.textContent = formatCurrency(cost);
    if (retailSpan) retailSpan.textContent = formatCurrency(retail);
    if (costInput) {
      costInput.dataset.raw = String(cost || 0);
      if (!costInput.classList.contains("d-none")) {
        costInput.value = formatCurrency(cost || 0);
      }
    }
    if (retailInput) {
      retailInput.dataset.raw = String(retail || 0);
      if (!retailInput.classList.contains("d-none")) {
        retailInput.value = formatCurrency(retail || 0);
      }
    }
  });

  // ---- Update totals for Product Accordion (readonly view)
  const wrapper = partsContainer.closest(".accordion-item.product-accordion");
  if (wrapper) {
    const costSpan = wrapper.querySelector(".totalCost-body");
    const retailSpan = wrapper.querySelector(".totalRetail-body");
    if (costSpan) costSpan.textContent = formatCurrency(totalCost);
    if (retailSpan) retailSpan.textContent = formatCurrency(totalRetail);

    const badge = wrapper.querySelector(".partrow-header-display");
    if (badge) {
      badge.textContent = `Parts • ${partsContainer.querySelectorAll(".part-row").length}`;
    }
  }

  // Update totals for Add Product form
  const addForm = partsContainer.closest("#addProductForm");
  if (addForm) {
    const totalCostSpan = addForm.querySelector(".totalCost-input");
    const totalRetailSpan = addForm.querySelector(".totalRetail-input");

    if (totalCostSpan) totalCostSpan.textContent = formatCurrency(totalCost);
    if (totalRetailSpan) totalRetailSpan.textContent = formatCurrency(totalRetail);
  }
}

// ----- Setup Add Product Form -----
function setupAddProductForm() {
  const form = document.getElementById("addProductForm");
  const partContainer = document.getElementById("part-rows");
  const addBtn = document.getElementById("add-partRow");
  const productTypeInput = form.querySelector(".productType-input");
  const productTypeLegend = form.querySelector(".productType-legend");
  const prodNameInput = form.querySelector(".productName-input");
  const descInput = form.querySelector(".description-input");
  const prodDateSpan = form.querySelector(".prodDate");

  // Header references
  const headerWrapper = form.closest(".accordion-item")?.querySelector(".accordion-button");
  const headerProdName = headerWrapper?.querySelector(".productName");
  const headerTotalRetail = headerWrapper?.querySelector(".totalRetail");
  const headerIcon = headerWrapper?.querySelector(".productType-icon");

  if (!form || !partContainer || !addBtn) return;

  const totalCostSpan = form.querySelector(".totalCost-input");
  const totalRetailSpan = form.querySelector(".totalRetail-input");

  const resetForm = () => {
    [prodNameInput, productTypeInput, descInput].forEach(el => el && (el.value = ""));
    if (productTypeLegend) productTypeLegend.textContent = "";
    if (prodDateSpan) prodDateSpan.textContent = formatDateForUser(new Date()) || "—";
    partContainer.innerHTML = "";

    // Add initial blank part row
    addPartRow(partContainer, "", 0, 0, 0, true);

    // Reset totals in body
    if (totalCostSpan) totalCostSpan.textContent = formatCurrency(0);
    if (totalRetailSpan) totalRetailSpan.textContent = formatCurrency(0);

    // Update header
    if (headerProdName) headerProdName.textContent = "➕ Add New Product";
    if (headerTotalRetail) headerTotalRetail.textContent = formatCurrency(0);
    if (headerIcon) headerIcon.innerHTML = '<i class="fa-solid fa-box-open"></i>';
  };

  // Sync header totals
  const updateHeaderTotal = () => {
    if (headerTotalRetail && totalRetailSpan) {
      headerTotalRetail.textContent = totalRetailSpan.textContent;
    }
  };

  // Update header live
  if (prodNameInput && headerProdName) {
    prodNameInput.addEventListener("input", () => {
      headerProdName.textContent = prodNameInput.value || "➕ Add New Product";
    });
  }

  if (productTypeInput) {
    productTypeInput.addEventListener("input", () => {
      if (productTypeLegend) productTypeLegend.textContent = productTypeInput.value || "";
      if (headerIcon) {
        headerIcon.innerHTML =
          productTypeInput.value === "Product" ? '<i class="fa-solid fa-tag text-success"></i>' :
          productTypeInput.value === "Rental" ? '<i class="fa-solid fa-key text-primary"></i>' :
          '<i class="fa-solid fa-box-open"></i>';
      }
    });
  }

  if (prodNameInput) attachAutogrow(prodNameInput);
  if (descInput) attachAutogrow(descInput);

  // Add part row
  addBtn.addEventListener("click", () => {
    if (partContainer.querySelectorAll(".part-row").length >= maxParts) {
      return showToast("⚠️ Max parts reached", "warning");
    }
    addPartRow(partContainer, "", 0, 0, 0, true);
    recalculateTotals(partContainer);
    updateHeaderTotal();
  });

  // Recalculate totals on any input
  partContainer.addEventListener("input", () => {
    recalculateTotals(partContainer);
    updateHeaderTotal();
  });

  // Cancel button
  const cancelBtn = document.getElementById("addProductCancel");
  if (cancelBtn) cancelBtn.addEventListener("click", resetForm);

  // Submit handler
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    recalculateTotals(partContainer); // make sure totals are current
    updateHeaderTotal();

  const parts = Array.from(partContainer.querySelectorAll(".part-row")).map(r => {
    const nameEl = r.querySelector(".part-input, .part-name-span");
    const qtyEl  = r.querySelector(".qty-input, .part-qty-span");

    const matName = nameEl
      ? (nameEl.value?.trim?.() ?? nameEl.textContent?.trim?.() ?? "")
      : "";
    const qtyVal = qtyEl
      ? (qtyEl.value ?? qtyEl.textContent ?? "0")
      : "0";
    const qty = parseFloat(qtyVal.toString().replace(/[^0-9.-]/g, "")) || 0;

    // Use qty as string to match other systems (e.g. "3")
    return { matName, qty: String(qty) };
  }).filter(p => p.matName && p.qty > 0);

    if (!parts.length) return showToast("⚠️ At least one part and quantity must be provided.", "error");

    // Use numeric totals (strip currency formatting) when sending to backend
    const totalCostNumeric = parseFloat((totalCostSpan?.textContent || '').replace(/[^0-9.-]+/g, '')) || 0;
    const totalRetailNumeric = parseFloat((totalRetailSpan?.textContent || '').replace(/[^0-9.-]+/g, '')) || 0;

    // Backend expects an object with named fields (see addProduct in Apps Script)
    const productInfo = {
      productName: prodNameInput.value.trim(),
      productType: productTypeInput.value.trim(),
      parts: parts, 
      partsJSON: parts,
      description: descInput.value.trim(),
      cost: totalCostNumeric,
      retail: totalRetailNumeric
    };

    try {
      toggleLoader(true);
      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: "products", action: "add", productInfo })
      });

      const result = await res.json();
      if (result.success) {
        showToast("✅ Product added!");
        resetForm();
        await loadProducts();
        renderResults();
      } else {
        showToast(result.message || "❌ Error adding product", "error");
      }
    } catch (err) {
      console.error("Add error:", err);
      showToast("❌ Error adding product", "error");
    } finally {
      toggleLoader(false);
    }
  });

  resetForm();
}

/**
 * Attach autogrow behaviour to a textarea.
 * - Respects initial rows in HTML
 * - Grows vertically only (uses scrollHeight + small buffer)
 * - Works immediately for prefilled content and after element becomes visible
 * @param {HTMLTextAreaElement} textarea
 */
function attachAutogrow(textarea) {
  if (!textarea || textarea.tagName !== 'TEXTAREA') return;

  const BUFFER_PX = 3; // small buffer to avoid clipped last line
  const initialRows = parseInt(textarea.getAttribute('rows'), 10) || 1;

  const autoGrow = () => {
    // Reset so scrollHeight recalculates correctly
    textarea.style.height = 'auto';
    // Set to scrollHeight + buffer
    textarea.style.height = (textarea.scrollHeight + BUFFER_PX) + 'px';
  };

  // Ensure it grows when the user types
  textarea.addEventListener('input', autoGrow);
  // Also when focused (helps if become visible on focus)
  textarea.addEventListener('focus', autoGrow);

  // If element is hidden (display:none / .d-none), wait until it becomes visible
  const ensureVisibleAndGrow = () => {
    const visible = textarea.offsetParent !== null && getComputedStyle(textarea).display !== 'none';
    if (visible) {
      autoGrow();
      return;
    }
    // Observe attribute changes (class/style) on the element — most toggles use classList
    const mo = new MutationObserver(() => {
      if (textarea.offsetParent !== null && getComputedStyle(textarea).display !== 'none') {
        autoGrow();
        mo.disconnect();
      }
    });
    mo.observe(textarea, { attributes: true, attributeFilter: ['class', 'style'] });

    // fallback check in case visibility changes via other means
    const fallbackId = setInterval(() => {
      if (textarea.offsetParent !== null && getComputedStyle(textarea).display !== 'none') {
        autoGrow();
        clearInterval(fallbackId);
        mo.disconnect();
      }
    }, 50);
    // stop fallback after a short time
    setTimeout(() => clearInterval(fallbackId), 3000);
  };

  // Run after paint so clones or inserted elements measure correctly
  requestAnimationFrame(ensureVisibleAndGrow);

  // Integrate with form.reset if present — restore initial rows then autoGrow
  const form = textarea.closest('form');
  if (form) {
    const origReset = form.reset.bind(form);
    form.reset = function () {
      origReset();
      // restore initial rows as baseline (keeps consistent start height)
      textarea.rows = initialRows;
      textarea.style.height = '';
      // allow DOM to update, then recalc
      setTimeout(() => autoGrow(), 0);
    };
  }

  // Return the autoGrow for optional direct use
  return autoGrow;
}

/**
 * Calculate maximum number of products that can be made from current stock.
 * @param {Object} product - Product object containing parts array [{ matName, qty }]
 * @returns {number} Maximum number of products in stock
 */
function calculateInStock(product) {
  if (!product?.parts?.length) return 0;

  let minStock = Infinity;

  product.parts.forEach(part => {
    const material = materialByName[part.matName]; // look up by material name
    // Coerce qty to number (parts may store qty as string)
    const qty = parseFloat(part.qty) || 0;
    if (!material || qty <= 0) {
      minStock = 0; // missing material → cannot make product
      return;
    }

    const maxByPart = Math.floor((material.onHand || 0) / qty);
    if (maxByPart < minStock) minStock = maxByPart;
  });

  return minStock === Infinity ? 0 : minStock;
}

function renderInStockModal(product) {
  if (!product || !Array.isArray(product.parts)) return;

  const tbody = document.getElementById("inStockTableBody");
  const totalUnitsEl = document.getElementById("inStockTotalUnits");

  tbody.innerHTML = ""; // clear previous content
  let minUnits = Infinity;

  const partsData = product.parts.map(part => {
    const material = materialByName[part.matName];
    const needed = parseFloat(part.qty) || 0; // coerce qty
    const onHand = material?.onHand || 0;
    const supplierUrl = material?.supplierUrl || null;

    // Bottleneck calculation
    const maxUnits = needed > 0 ? Math.floor(onHand / needed) : 0;
    if (maxUnits < minUnits) minUnits = maxUnits;

    // Order Requirement per part
    const orderRequirement = Math.max(0, needed - onHand);

    return { ...part, onHand, needed, orderRequirement, supplierUrl };
  });

  // Sort: deficient parts first
  partsData.sort((a, b) => b.orderRequirement - a.orderRequirement);

  // Render rows
  partsData.forEach(part => {
    const row = document.createElement("tr");

    // Determine row text color and store it
    const textColor = part.orderRequirement > 0 ? "text-danger" : "text-success";

    // Clickable row if supplier URL exists
    if (part.supplierUrl) {
      row.style.cursor = "pointer";
      row.addEventListener("click", () => window.open(part.supplierUrl, "_blank"));
    }

    // Create cells and apply text color to each cell individually
    ["matName", "needed", "onHand", "orderRequirement"].forEach(key => {
      const cell = document.createElement("td");
      cell.textContent = part[key];
      cell.classList.add(textColor);       // ensures BS doesn’t override
      cell.style.backgroundColor = "#000"; // black background
      row.appendChild(cell);
    });

    // Hover effect: change background color of all cells
    row.addEventListener("mouseenter", () => {
      row.querySelectorAll("td").forEach(td => {
        td.style.backgroundColor = part.orderRequirement > 0 ? "#330000" : "#003300";
      });
    });
    row.addEventListener("mouseleave", () => {
      row.querySelectorAll("td").forEach(td => {
        td.style.backgroundColor = "#000";
      });
    });

    tbody.appendChild(row);
  });

  // Update total units possible at the top
  totalUnitsEl.textContent = minUnits === Infinity ? 0 : minUnits;

  // Show the modal
  const modalEl = document.getElementById("inStockModal");
  let bsModal = bootstrap.Modal.getInstance(modalEl);
  if (!bsModal) {
    bsModal = new bootstrap.Modal(modalEl);
  }
  bsModal.show();
}

