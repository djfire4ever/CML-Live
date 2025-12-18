// qm-modules/slide4-other.js

// import { notifyDrawer } from "./drawers.js";

export async function initSlide4Other(currentQuote = {}) {
  // ------------------------
  // Overlay Controls
  // ------------------------
  function openOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;
    overlay.classList.remove("d-none");
    overlay.classList.add("show");

    // Update overlay inputs when opened
    if (overlayId === "addOnFeesOverlay") {
      document.getElementById("deliveryFee").value = currentQuote.deliveryFee || 0;
      document.getElementById("setupFee").value = currentQuote.setupFee || 0;
      document.getElementById("otherFee").value = currentQuote.otherFee || 0;
    } else if (overlayId === "balanceDetailsOverlay") {
      document.getElementById("deposit").value = currentQuote.deposit || 0;
      document.getElementById("amountPaid").value = currentQuote.amountPaid || 0;
    } else if (overlayId === "discountOverlay") {
      document.getElementById("discount").value = currentQuote.discount || 0;
    }
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
    // --- Product totals ---
    const totalProductRetail = currentQuote.products?.reduce(
      (sum, p) => sum + (p.retailPrice * p.qty),
      0
    ) || 0;

    const totalProductCost = currentQuote.products?.reduce(
      (sum, p) => sum + (p.costPrice * p.qty),
      0
    ) || 0;

    currentQuote.totalProductRetail = totalProductRetail;
    currentQuote.totalProductCost = totalProductCost;

    // --- Other inputs ---
    const deliveryFee = parseFloat(document.getElementById("deliveryFee")?.value) || 0;
    const setupFee = parseFloat(document.getElementById("setupFee")?.value) || 0;
    const otherFee = parseFloat(document.getElementById("otherFee")?.value) || 0;
    const addonsTotal = deliveryFee + setupFee + otherFee;

    const discount = parseFloat(document.getElementById("discount")?.value) || 0;
    const deposit = parseFloat(document.getElementById("deposit")?.value) || 0;
    const amountPaid = parseFloat(document.getElementById("amountPaid")?.value) || 0;

    Object.assign(currentQuote, {
      deliveryFee,
      setupFee,
      otherFee,
      addonsTotal,
      discount,
      deposit,
      amountPaid
    });

    // --- Calculations ---
    const taxRate = 0.08875;
    const subTotal1 = parseFloat((totalProductRetail * taxRate).toFixed(2));
    const subTotal2 = parseFloat((totalProductRetail + subTotal1).toFixed(2));
    const subTotal3 = parseFloat((totalProductRetail * (discount / 100)).toFixed(2));
    const discountedTotal = parseFloat((subTotal2 - subTotal3).toFixed(2));
    const grandTotal = parseFloat((discountedTotal + addonsTotal).toFixed(2));
    const appliedPayment = amountPaid > 0 ? amountPaid : deposit;
    const balanceDue = parseFloat((grandTotal - appliedPayment).toFixed(2));

    Object.assign(currentQuote, {
      subTotal1,
      subTotal2,
      subTotal3,
      discountedTotal,
      grandTotal,
      balanceDue
    });

    // --- Update UI: Tiles ---
    const fmt = val => `$${val.toFixed(2)}`;
    document.getElementById("discountedTotal").textContent = fmt(discountedTotal);
    document.getElementById("balanceDue").textContent = fmt(balanceDue);
    document.getElementById("addonsTotal").textContent = fmt(addonsTotal);
    document.getElementById("addonsTotalSummary").textContent = fmt(addonsTotal);
    document.getElementById("discountSummary").textContent = `${discount}%`;
    document.getElementById("balanceDueSummary").textContent = fmt(balanceDue);

    // --- Update overlays live ---
    ["deliveryFee","setupFee","otherFee"].forEach(id => {
      const el = document.getElementById(id);
      if (el && el !== document.activeElement) el.value = currentQuote[id] || 0;
    });
    ["deposit","amountPaid"].forEach(id => {
      const el = document.getElementById(id);
      if (el && el !== document.activeElement) el.value = currentQuote[id] || 0;
    });
    const discountEl = document.getElementById("discount");
    if (discountEl && discountEl !== document.activeElement) discountEl.value = currentQuote.discount || 0;

  }

  // ------------------------
  // Slide 4 input update handlers
  // ------------------------
  function updateAddOns() {
    recalcTotals();
    markSlideFilled();
  }

  function updateDiscount() {
    let discount = parseFloat(document.getElementById("discount")?.value) || 0;
    discount = Math.max(0, Math.min(discount, 100));
    currentQuote.discount = discount;
    recalcTotals();
    markSlideFilled();
  }

  function updateBalance() {
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
  document.getElementById("addOnFeesCard")?.addEventListener("click", () => openOverlay("addOnFeesOverlay"));
  ["deliveryFee","setupFee","otherFee"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", updateAddOns)
  );
  document.getElementById("saveAddOnFees")?.addEventListener("click", () => closeOverlay("addOnFeesOverlay"));

  document.getElementById("balanceDetailsCard")?.addEventListener("click", () => openOverlay("balanceDetailsOverlay"));
  ["deposit","amountPaid"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", updateBalance)
  );
  document.getElementById("saveBalanceDetails")?.addEventListener("click", () => closeOverlay("balanceDetailsOverlay"));

  document.getElementById("discountCard")?.addEventListener("click", () => openOverlay("discountOverlay"));
  document.getElementById("discount")?.addEventListener("input", updateDiscount);
  document.getElementById("saveDiscount")?.addEventListener("click", () => closeOverlay("discountOverlay"));

  // ------------------------
  // Listen for live updates from other slides
  // ------------------------
  document.addEventListener("quoteDataChanged", recalcTotals);

  // Initial calculation to populate tiles and overlays
  recalcTotals();
}
