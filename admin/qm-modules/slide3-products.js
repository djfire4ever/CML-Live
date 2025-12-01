// qm-modules/slide3-products.js
import { notifyDrawer } from "./drawers.js";

let products = [];       // currently selected products
let productData = [];    // cached product info
let editingIndex = null;

const SKIP_PRODUCT_FETCH = true;

export async function initSlide3Products(currentQuote, scriptURL) {
  const grid = document.querySelector(".product-grid");
  const overlay = document.getElementById("product-overlay");
  const overlayTitle = document.getElementById("overlay-title");

  const nameSelect = document.getElementById("productNameSelect");
  const qtyInput = document.getElementById("qty");
  const costSpan = document.getElementById("costPrice");
  const retailSpan = document.getElementById("retailPrice");
  const totalCostSpan = document.getElementById("totalProductCost");
  const totalRetailSpan = document.getElementById("totalProductRetail");
  const closeBtn = document.getElementById("closeProduct");

  async function loadProductData() {
    toggleLoader?.(true, { message: "Loading products..." });
    try {
      const rawData = SKIP_PRODUCT_FETCH
        ? [
            [1, "Chocolate Covered Marshmallows-Deluxe (Gold/Color) (Holographic Bag)", "", "", JSON.stringify([{ matName: "Cardstock-110 lb White", qty: 3 }, { matName: "LED Lights", qty: 3 }]), "", 10.5, 21],
            [2, "Test Product B", "", "", JSON.stringify([{ matName: "Cricut Mat", qty: 1 }, { matName: "Double-Sided Tape", qty: 6 }]), "", 5, 10],
            [3, "Test Product C", "", "", JSON.stringify([{ matName: "HP Instant Ink & Paper", qty: 1 }, { matName: "3D Tape-White", qty: 20 }]), "", 7.25, 14.5],
            [4, "Test Product D", "", "", JSON.stringify([{ matName: "Cardstock-110 lb White", qty: 5 }, { matName: "Photo Paper-Glossy", qty: 1 }]), "", 2.5, 5],
            [5, "Test Product E", "", "", JSON.stringify([{ matName: "Happy Birthday Neon Sign", qty: 1 }]), "", 12, 2]
          ]
        : await (async () => {
            const res = await fetch(`${scriptURL}?action=getProdDataForSearch`);
            if (!res.ok) throw new Error(`Status: ${res.status}`);
            return await res.json();
          })();

      productData = rawData
        .filter(r => r[0] && r[1])
        .map(r => ({
          prodID: String(r[0]).trim(),
          productName: String(r[1]).trim(),
          partsJSON: r[4] ? JSON.parse(r[4]) : [],
          costPrice: parseFloat(r[6]) || 0,
          retailPrice: parseFloat(r[7]) || 0
        }));

      console.log("➡️ Product data loaded", productData);
    } catch (err) {
      console.error("❌ Failed to load product data:", err);
      showToast?.("❌ Failed to load product list", "error");
    } finally {
      toggleLoader?.(false);
    }
  }

  function populateDropdown() {
    nameSelect.innerHTML = `<option value="" disabled selected>Select a product</option>`;
    productData.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.productName;
      opt.textContent = p.productName;
      nameSelect.appendChild(opt);
    });
  }

  function updateOverlayTotals() {
    const qty = parseInt(qtyInput.value, 10) || 0;
    const cost = parseFloat(costSpan.textContent) || 0;
    const retail = parseFloat(retailSpan.textContent) || 0;

    totalCostSpan.textContent = `$${(qty * cost).toFixed(2)}`;
    totalRetailSpan.textContent = `$${(qty * retail).toFixed(2)}`;
  }

  nameSelect.addEventListener("change", () => {
    const prod = productData.find(p => p.productName === nameSelect.value);
    if (!prod) return;

    costSpan.textContent = prod.costPrice.toFixed(2);
    retailSpan.textContent = prod.retailPrice.toFixed(2);
    updateOverlayTotals();
  });

  qtyInput.addEventListener("input", updateOverlayTotals);

  // -------------------- Render grid --------------------
  function renderGrid() {
    grid.innerHTML = "";

    products.forEach((prod, idx) => {
      const tile = document.createElement("div");
      tile.className = "product-tile project-theme-tile";
      tile.innerHTML = `
        <div class="name" title="${prod.productName}">${prod.productName}</div>
        <div class="bottom-row text-warning">
          <div class="price">${prod.qty} × $${prod.retailPrice.toFixed(2)} = $${(prod.qty * prod.retailPrice).toFixed(2)}</div>
          <span class="delete">&times;</span>
        </div>
      `;

      tile.querySelector(".delete").addEventListener("click", e => {
        e.stopPropagation();
        products.splice(idx, 1);
        renderGrid();
        markSlideFilled();
      });

      tile.addEventListener("click", e => {
        if (!e.target.classList.contains("delete")) openOverlay(prod);
      });

      grid.appendChild(tile);
    });

    const addTile = document.createElement("div");
    addTile.className = "add-product-tile project-theme-tile";
    addTile.innerHTML = `<i class="bi bi-plus"></i> Product`;
    addTile.addEventListener("click", () => openOverlay());
    grid.appendChild(addTile);

    updateProductTotals();
  }

  // -------------------- Update totals & notify drawers --------------------
  function updateProductTotals() {
    const count = products.length;
    const totalRetail = products.reduce((sum, p) => sum + p.qty * p.retailPrice, 0);

    currentQuote.products = products;
    currentQuote.productsCount = count;
    currentQuote.totalProductRetail = totalRetail;

    // ✅ Update the summary line DOM
    const summaryCard = document.querySelector("#productSummaryCard .summary-line");
    if (summaryCard) {
      const countSpan = summaryCard.querySelector(".count");
      const totalSpan = summaryCard.querySelector(".total");

      if (countSpan) countSpan.textContent = `${count} item${count !== 1 ? "s" : ""}`;
      if (totalSpan) totalSpan.textContent = `$${totalRetail.toFixed(2)}`;
    }

    // ✅ Notify other drawers
    notifyDrawer("quoteSummaryDrawer", {
      productCount: count,
      productTotal: `$${totalRetail.toFixed(2)}`,
      productList: products.map(p => ({
        name: p.productName,
        qty: p.qty,
        retail: p.retailPrice,
        total: (p.qty * p.retailPrice).toFixed(2)
      }))
    });

    notifyDrawer("runningTotalDrawer", { quote: currentQuote });

    dispatchQuoteChanged();
  }

  // -------------------- Overlay controls --------------------
  function openOverlay(prod = null, idx = null) {
    editingIndex = idx;
    overlay.classList.remove("d-none");
    overlay.classList.add("show");

    overlayTitle.textContent = prod ? "Edit Product" : "Add Product";
    nameSelect.value = prod?.productName || "";
    qtyInput.value = prod?.qty || 1;
    costSpan.textContent = prod?.costPrice?.toFixed(2) || "0.00";
    retailSpan.textContent = prod?.retailPrice?.toFixed(2) || "0.00";

    updateOverlayTotals();
  }

  function closeOverlay() {
    overlay.classList.remove("show");
    overlay.classList.add("d-none");
    editingIndex = null;
  }

  cancelBtn.addEventListener("click", closeOverlay);

  saveBtn.addEventListener("click", () => {
    const name = nameSelect.value.trim();
    if (!name) return overlay.classList.add("d-none");

    const prodInfo = productData.find(p => p.productName === name);
    if (!prodInfo) return overlay.classList.add("d-none");

    const qty = parseInt(qtyInput.value, 10) || 1;
    products.push({
      productName: prodInfo.productName,
      costPrice: prodInfo.costPrice,
      retailPrice: prodInfo.retailPrice,
      qty,
      partsJSON: Array.isArray(prodInfo.partsJSON) ? prodInfo.partsJSON : []
    });

    renderGrid();
    closeOverlay();
  });

  deleteBtn.addEventListener("click", () => {
    if (editingIndex !== null) {
      products.splice(editingIndex, 1);
      renderGrid();
      closeOverlay();
    }
  });

  // -------------------- Slide progress --------------------
  function markSlideFilled() {
    const stepsData = window.stepsData;
    if (!stepsData?.slides) return;

    const slideEl = grid.closest(".carousel-item");
    const idx = Array.from(stepsData.slides).indexOf(slideEl);
    if (idx >= 0) stepsData.slideFilled[idx] = products.length > 0;

    stepsData.updateProgress?.();
  }

  await loadProductData();
  populateDropdown();
  renderGrid();
}
