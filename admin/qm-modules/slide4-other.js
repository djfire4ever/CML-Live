// qm-modules/slide4-other.js

export async function initSlide4Other(currentQuote = {}) {
  function openOverlay(overlayId) {
    const overlay = document.getElementById(overlayId);
    if (!overlay) return;

    overlay.classList.remove("d-none");
    overlay.classList.add("show");

    // Populate overlay fields
    const fields = {
      addOnFeesOverlay: {
        deliveryFee: currentQuote.deliveryFee || 0,
        setupFee: currentQuote.setupFee || 0,
        otherFee: currentQuote.otherFee || 0,
      },
      balanceDetailsOverlay: {
        deposit: currentQuote.deposit || 0,
        amountPaid: currentQuote.amountPaid || 0,
        paymentMethod: currentQuote.paymentMethod || "",
      },
      discountOverlay: {
        discount: currentQuote.discount || 0,
      }
    };

    Object.entries(fields[overlayId] || {}).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });

    // Close overlay when clicking outside (self-cleaning)
    const outsideClickHandler = e => {
      if (e.target === overlay) {
        overlay.classList.replace("show", "d-none");
        overlay.removeEventListener("click", outsideClickHandler);
      }
    };
    overlay.addEventListener("click", outsideClickHandler);

    // Close overlay when save button clicked
    const saveBtn = overlay.querySelector("button[id^='save']");
    if (saveBtn) {
      saveBtn.addEventListener(
        "click",
        () => {
          overlay.classList.replace("show", "d-none");
          overlay.removeEventListener("click", outsideClickHandler);
        },
        { once: true }
      );
    }
  }

  document.getElementById("paymentMethod")?.addEventListener("change", e => {
    currentQuote.paymentMethod = e.target.value;
  });

  // ------------------------
  // Core Calculation Chain
  // ------------------------
  function recalcTotals() {
    const totalProductRetail = currentQuote.products?.reduce((sum, p) => sum + (p.retailPrice * p.qty), 0) || 0;
    const totalProductCost = currentQuote.products?.reduce((sum, p) => sum + (p.costPrice * p.qty), 0) || 0;

    currentQuote.totalProductRetail = totalProductRetail;
    currentQuote.totalProductCost = totalProductCost;

    const deliveryFee = parseFloat(document.getElementById("deliveryFee")?.value) || 0;
    const setupFee = parseFloat(document.getElementById("setupFee")?.value) || 0;
    const otherFee = parseFloat(document.getElementById("otherFee")?.value) || 0;
    const addonsTotal = deliveryFee + setupFee + otherFee;

    const discount = parseFloat(document.getElementById("discount")?.value) || 0;
    const deposit = parseFloat(document.getElementById("deposit")?.value) || 0;
    const amountPaid = parseFloat(document.getElementById("amountPaid")?.value) || 0;

    Object.assign(currentQuote, { deliveryFee, setupFee, otherFee, addonsTotal, discount, deposit, amountPaid });

    const taxRate = 0.08875;
    const subTotal1 = +(totalProductRetail * taxRate).toFixed(2);
    const subTotal2 = +(totalProductRetail + subTotal1).toFixed(2);
    const subTotal3 = +(totalProductRetail * (discount / 100)).toFixed(2);
    const discountedTotal = +(subTotal2 - subTotal3).toFixed(2);
    const grandTotal = +(discountedTotal + addonsTotal).toFixed(2);
    const appliedPayment = amountPaid > 0 ? amountPaid : deposit;
    const balanceDue = +(grandTotal - appliedPayment).toFixed(2);

    Object.assign(currentQuote, { subTotal1, subTotal2, subTotal3, discountedTotal, grandTotal, balanceDue });

    const fmt = val => `$${val.toFixed(2)}`;
    document.getElementById("discountedTotal").textContent = fmt(discountedTotal);
    document.getElementById("balanceDue").textContent = fmt(balanceDue);
    document.getElementById("addonsTotal").textContent = fmt(addonsTotal);
    document.getElementById("addonsTotalSummary").textContent = fmt(addonsTotal);
    document.getElementById("discountSummary").textContent = `${discount}%`;
    document.getElementById("balanceDueSummary").textContent = fmt(balanceDue);

    ["deliveryFee","setupFee","otherFee","deposit","amountPaid","discount"].forEach(id => {
      const el = document.getElementById(id);
      if (el && el !== document.activeElement) el.value = currentQuote[id] || 0;
    });
  }

  // Input Update Handlers
  const updateAddOns = () => { recalcTotals(); markSlideFilled(); };
  const updateDiscount = () => {
    let discount = parseFloat(document.getElementById("discount")?.value) || 0;
    discount = Math.max(0, Math.min(discount, 100));
    currentQuote.discount = discount;
    recalcTotals();
    markSlideFilled();
  };
  const updateBalance = () => { recalcTotals(); markSlideFilled(); };

  // Mark Slide Filled
  function markSlideFilled() {
    const stepsData = window.stepsData;
    if (!stepsData?.slides) return;
    const slideEl = document.getElementById("slide4OtherCarouselItem");
    if (!slideEl) return;
    const idx = Array.from(stepsData.slides).indexOf(slideEl);
    if (idx < 0) return;
    stepsData.slideFilled[idx] = [
      currentQuote.deliveryFee,
      currentQuote.setupFee,
      currentQuote.otherFee,
      currentQuote.deposit,
      currentQuote.amountPaid,
      currentQuote.discount
    ].some(v => v > 0);
    stepsData.updateProgress?.();
  }

  // Event Listeners
  document.getElementById("addOnFeesCard")?.addEventListener("click", () => openOverlay("addOnFeesOverlay"));
  ["deliveryFee","setupFee","otherFee"].forEach(id => document.getElementById(id)?.addEventListener("input", updateAddOns));

  document.getElementById("balanceDetailsCard")?.addEventListener("click", () => openOverlay("balanceDetailsOverlay"));
  ["deposit","amountPaid"].forEach(id => document.getElementById(id)?.addEventListener("input", updateBalance));

  document.getElementById("discountCard")?.addEventListener("click", () => openOverlay("discountOverlay"));
  document.getElementById("discount")?.addEventListener("input", updateDiscount);

  // Listen for live updates from other slides
  document.addEventListener("quoteDataChanged", recalcTotals);

  // Initial calculation
  recalcTotals();
}
