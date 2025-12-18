// qm-modules/shoppinglist.js

let materialData = [];
const SKIP_MATERIAL_FETCH = true; // toggle mock vs real fetch

// -------------------- LOAD MATERIALS --------------------
export async function loadMaterials(scriptURL) {
  if (materialData.length > 0) return materialData;

  toggleLoader?.(true, { message: "Loading materials..." });

  try {
    let rawData;

    if (SKIP_MATERIAL_FETCH) {
      rawData = [
        [1, "Cardstock-110 lb White", 0.2, "sheet", "1", "Acme Paper Co.", "https://acmepaper.com", 0.2, 50, 20, 5, 10],
        [2, "LED Lights", 0.5, "string", "1", "BrightTech", "https://brighttech.com", 0.5, 100, 50, 10, 20],
        [3, "Cricut Mat", 5, "unit", "1", "Cricut Supplies", "https://cricut.com", 5, 30, 10, 0, 5],
        [4, "Double-Sided Tape", 0.25, "roll", "1", "TapeCo", "https://tapeco.com", 0.25, 80, 40, 5, 15],
        [5, "HP Instant Ink & Paper", 1, "unit", "1", "HP Supplies", "https://hp.com", 1, 100, 50, 0, 0],
        [6, "3D Tape-White", 0.5, "roll", "1", "TapeCo", "https://tapeco.com", 0.5, 50, 20, 0, 0],
      ];
    } else {
      const res = await fetch(`${scriptURL}?action=getMatDataForSearch`);
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      rawData = await res.json();
    }

    materialData = rawData.map(r => ({
      matID: r[0],
      matName: r[1],
      matPrice: r[2],
      unitType: r[3],
      unitQty: r[4],
      supplier: r[5],
      supplierUrl: r[6],
      unitPrice: r[7],
      onHand: r[8],
      incoming: r[9],
      outgoing: r[10],
      reorderLevel: r[11]
    }));

    return materialData;
  } catch (err) {
    console.error("❌ Failed to load materials:", err);
    showToast?.("❌ Failed to load materials", "error");
    materialData = [];
    return [];
  } finally {
    toggleLoader?.(false);
  }
}

// -------------------- COMPUTE AND RENDER SHOPPING LIST --------------------
export async function renderShoppingList(currentQuote, scriptURL) {
  if (!currentQuote?.products?.length) {
    const tbodyEmpty = document.getElementById("shoppinglist-body");
    if (tbodyEmpty) tbodyEmpty.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No products added yet.</td></tr>`;
    return;
  }

  const tbody = document.getElementById("shoppinglist-body");
  if (!tbody) return;

  const materials = await loadMaterials(scriptURL);

  const matMap = {};
  currentQuote.products.forEach(prod => {
    const prodQty = parseFloat(prod.qty) || 1;

    prod.partsJSON.forEach(part => {
      const partName = part.matName.trim().toLowerCase();
      const qtyPerUnit = parseFloat(part.qty) || 0;

      // Live DB guarantees this always exists
      const mat = materials.find(m => m.matName.toLowerCase() === partName);

      matMap[mat.matID] = matMap[mat.matID] || {
        matID: mat.matID,
        matName: mat.matName,
        unitType: mat.unitType,
        supplier: mat.supplier,
        supplierUrl: mat.supplierUrl,
        totalNeeded: 0,
        onHand: parseFloat(mat.onHand),
        incoming: parseFloat(mat.incoming),
        outgoing: parseFloat(mat.outgoing),
        reorderLevel: parseFloat(mat.reorderLevel)
      };

      matMap[mat.matID].totalNeeded += qtyPerUnit * prodQty;
    });
  });

  const matList = Object.values(matMap);
  tbody.innerHTML = "";

  matList.forEach(mat => {
    const row = document.createElement("tr");
    const needed = Number(mat.totalNeeded) || 0;
    const onHand = Number(mat.onHand) || 0;
    const incoming = Number(mat.incoming) || 0;
    const outgoing = Number(mat.outgoing) || 0;
    const netAvailable = onHand + incoming - outgoing;

    const shortfall = needed > netAvailable;
    const reorder = netAvailable < (Number(mat.reorderLevel) || 0);

    row.innerHTML = `
      <td>${mat.matName || "—"}</td>
      <td class="text-center">${needed}</td>
      <td class="text-center">${onHand}</td>
      <td class="text-center">${shortfall ? '<span class="text-danger fw-bold">Shortfall</span>' : '<span class="text-success">OK</span>'}</td>
      <td>${mat.supplier || "—"}</td>
      <td class="text-center">${reorder ? '<span class="text-warning fw-bold">⚠️</span>' : '<span class="text-muted">—</span>'}</td>
    `;

    // Add clickable behavior if supplierUrl exists
    if (mat.supplierUrl) {
      row.classList.add("clickable-row");

      // Ensure pointer cursor on all cells
      row.querySelectorAll("td").forEach(td => td.style.cursor = "pointer");

      row.addEventListener("click", () => {
        window.open(mat.supplierUrl, "_blank");
      });
    }

    tbody.appendChild(row);
  });

  console.log("🛒 Shopping list rendered:", matList);
}

// -------------------- SETUP BUTTON --------------------
export function setupShoppingListButton(buttonEl, scriptURL) {
  if (!buttonEl) return;

  buttonEl.addEventListener("click", async () => {
    const q = window.currentQuote;
    if (!q) return;

    try {
      await renderShoppingList(q, scriptURL);
    } catch (err) {
      console.error("❌ Shopping list injection failed:", err);
    }
  });
}

// -------------------- DEBUG HOOKS --------------------
window.renderShoppingList = renderShoppingList;
window.loadMaterials = loadMaterials;
window.setupShoppingListButton = setupShoppingListButton;
