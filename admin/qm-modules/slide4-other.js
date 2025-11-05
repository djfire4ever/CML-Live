// qm-modules/slide4-other.js

// =========================================================
// Slide 4: Other - QM Module
// =========================================================
export function initSlide4Other() {

  function openOverlay(overlay) {
    overlay.classList.remove("d-none");
    overlay.classList.add("show");
  }

  function closeOverlay(overlay) {
    overlay.classList.remove("show");
    overlay.classList.add("d-none");
  }

  function updateTotalsAddOns() {
    const delivery = parseFloat(document.getElementById("overlayDeliveryFee").value) || 0;
    const setup = parseFloat(document.getElementById("overlaySetupFee").value) || 0;
    const other = parseFloat(document.getElementById("overlayOtherFee").value) || 0;
    const total = delivery + setup + other;
    document.getElementById("overlayAddonsTotal").textContent = `$${total.toFixed(2)}`;
  }

  function updateTotalsBalance() {
    const deposit = parseFloat(document.getElementById("overlayDeposit").value) || 0;
    const paid = parseFloat(document.getElementById("overlayPaid").value) || 0;
    const balance = deposit - paid;
    document.getElementById("overlayBalance").textContent = `$${balance.toFixed(2)}`;
  }

  function updateTotalsDiscount() {
    let val = parseFloat(document.getElementById("overlayDiscountValue").value) || 0;
    if (val < 0) val = 0;
    if (val > 100) val = 100;
  }

  // ------------------------
  // Add-On Fees
  // ------------------------
  const addOnOverlay = document.getElementById("addOnFeesOverlay");
  document.getElementById("addOnFeesCard").addEventListener("click", () => openOverlay(addOnOverlay));

  ["overlayDeliveryFee","overlaySetupFee","overlayOtherFee"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateTotalsAddOns);
  });

  document.getElementById("saveAddOnFees").addEventListener("click", () => {
    updateTotalsAddOns();
    document.getElementById("addonsTotalSummary").textContent = document.getElementById("overlayAddonsTotal").textContent;
    closeOverlay(addOnOverlay);
  });
  document.getElementById("cancelAddOnFees").addEventListener("click", () => closeOverlay(addOnOverlay));

  // ------------------------
  // Balance Details
  // ------------------------
  const balanceOverlay = document.getElementById("balanceDetailsOverlay");
  document.getElementById("balanceDetailsCard").addEventListener("click", () => openOverlay(balanceOverlay));

  ["overlayDeposit","overlayPaid"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateTotalsBalance);
  });

  document.getElementById("saveBalanceDetails").addEventListener("click", () => {
    updateTotalsBalance();
    document.getElementById("balanceDueSummary").textContent = document.getElementById("overlayBalance").textContent;
    closeOverlay(balanceOverlay);
  });
  document.getElementById("cancelBalanceDetails").addEventListener("click", () => closeOverlay(balanceOverlay));

  // ------------------------
  // Discount
  // ------------------------
  const discountOverlay = document.getElementById("discountOverlay");
  document.getElementById("discountCard").addEventListener("click", () => openOverlay(discountOverlay));

  document.getElementById("overlayDiscountValue").addEventListener("input", updateTotalsDiscount);

  document.getElementById("saveDiscount").addEventListener("click", () => {
    updateTotalsDiscount();
    const val = parseFloat(document.getElementById("overlayDiscountValue").value) || 0;
    document.getElementById("discountSummary").textContent = `${val}%`;
    closeOverlay(discountOverlay);
  });
  document.getElementById("cancelDiscount").addEventListener("click", () => closeOverlay(discountOverlay));
}
