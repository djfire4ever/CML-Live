// qm-modules/slide4-other.js
import { notifyDrawer } from "./drawers.js";

export async function initSlide4Other(currentQuote = {}) {
  // ------------------------
  // Overlay Controls
  // ------------------------
  function openOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.classList.remove("d-none");
    overlay.classList.add("show");
  }

  function closeOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.classList.remove("show");
    overlay.classList.add("d-none");
  }

  // ------------------------
  // Core Calculation Chain
  // ------------------------
  function recalcTotals() {
    const totalProductRetail = currentQuote.totalProductRetail || 0; // ✅ now reliable
    const addonsTotal = currentQuote.addonsTotal || 0;
    const discount = currentQuote.discount || 0;
    const deposit = currentQuote.deposit || 0;
    const amountPaid = currentQuote.amountPaid || 0;

    const discountAmount = totalProductRetail * (discount / 100);
    const discountedTotal = totalProductRetail - discountAmount;
    const grandTotal = discountedTotal + addonsTotal;
    const appliedPayment = amountPaid > 0 ? amountPaid : deposit;
    const balanceDue = grandTotal - appliedPayment;

    // Update quote object
    Object.assign(currentQuote, {
      discountedTotal,
      grandTotal,
      balanceDue
    });

    // Reflect in UI
    document.getElementById("discountedTotal").textContent = `$${discountedTotal.toFixed(2)}`;
    document.getElementById("balanceDue").textContent = `$${balanceDue.toFixed(2)}`;

    // Notify drawers
    notifyDrawer("summaryDrawer", { discountedTotal, grandTotal });
    notifyDrawer("balanceDrawer", { total: grandTotal, paid: appliedPayment, balance: balanceDue });
  }

  // ------------------------
  // Overlay-Specific Updates
  // ------------------------
  function updateAddOns() {
    const deliveryFee = parseFloat(document.getElementById("deliveryFee")?.value) || 0;
    const setupFee = parseFloat(document.getElementById("setupFee")?.value) || 0;
    const otherFee = parseFloat(document.getElementById("otherFee")?.value) || 0;
    const addonsTotal = deliveryFee + setupFee + otherFee;

    Object.assign(currentQuote, { deliveryFee, setupFee, otherFee, addonsTotal });

    document.getElementById("addonsTotal").textContent = `$${addonsTotal.toFixed(2)}`;
    document.getElementById("addonsTotalSummary").textContent = `$${addonsTotal.toFixed(2)}`;

    notifyDrawer("summaryDrawer", { addonsTotal });
    recalcTotals();
    markSlideFilled();
  }

  function updateDiscount() {
    let discount = parseFloat(document.getElementById("discount")?.value) || 0;
    discount = Math.max(0, Math.min(discount, 100));
    currentQuote.discount = discount;

    document.getElementById("discount").value = discount;
    document.getElementById("discountSummary").textContent = `${discount}%`;

    recalcTotals();
    markSlideFilled();
  }

  function updateBalance() {
    const deposit = parseFloat(document.getElementById("deposit")?.value) || 0;
    const amountPaid = parseFloat(document.getElementById("amountPaid")?.value) || 0;

    Object.assign(currentQuote, { deposit, amountPaid });

    recalcTotals();
    markSlideFilled();
  }

  // ------------------------
  // Mark Slide Filled
  // ------------------------
  function markSlideFilled() {
    const stepsData = window.stepsData;
    if (!stepsData?.slides) return;

    const slideEl = document.getElementById("slide4OtherCarouselItem");
    if (!slideEl) return;

    const idx = Array.from(stepsData.slides).indexOf(slideEl);
    if (idx < 0) return;

    const filled = [
      currentQuote.deliveryFee,
      currentQuote.setupFee,
      currentQuote.otherFee,
      currentQuote.deposit,
      currentQuote.amountPaid,
      currentQuote.discount
    ].some(v => v > 0);

    stepsData.slideFilled[idx] = filled;
    stepsData.updateProgress?.();
  }

  // ------------------------
  // Event Listeners
  // ------------------------
  // Add-On Fees Overlay
  document.getElementById("addOnFeesCard")?.addEventListener("click", () => openOverlay("addOnFeesOverlay"));
  ["deliveryFee", "setupFee", "otherFee"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", updateAddOns)
  );
  document.getElementById("saveAddOnFees")?.addEventListener("click", () => {
    updateAddOns();
    closeOverlay("addOnFeesOverlay");
  });
  document.getElementById("cancelAddOnFees")?.addEventListener("click", () => closeOverlay("addOnFeesOverlay"));

  // Balance Overlay
  document.getElementById("balanceDetailsCard")?.addEventListener("click", () => openOverlay("balanceDetailsOverlay"));
  ["deposit", "amountPaid"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", updateBalance)
  );
  document.getElementById("saveBalanceDetails")?.addEventListener("click", () => {
    updateBalance();
    document.getElementById("balanceDueSummary").textContent = document.getElementById("balanceDue")?.textContent;
    closeOverlay("balanceDetailsOverlay");
  });
  document.getElementById("cancelBalanceDetails")?.addEventListener("click", () => closeOverlay("balanceDetailsOverlay"));

  // Discount Overlay
  document.getElementById("discountCard")?.addEventListener("click", () => openOverlay("discountOverlay"));
  document.getElementById("discount")?.addEventListener("input", updateDiscount);
  document.getElementById("saveDiscount")?.addEventListener("click", () => {
    updateDiscount();
    closeOverlay("discountOverlay");
  });
  document.getElementById("cancelDiscount")?.addEventListener("click", () => closeOverlay("discountOverlay"));
}
