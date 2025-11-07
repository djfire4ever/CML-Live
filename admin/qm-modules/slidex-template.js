// qm-modules/slidex-template.js

// =========================================================
// Slide X Template - QM Module
// =========================================================
export async function initSlideX(currentQuote = {}) {
  // ------------------------
  // Overlay Control
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
  // Totals / State Calculations
  // ------------------------
  function updateTotalsExample() {
    // Example calculation
    const value1 = parseFloat(document.getElementById("exampleInput1")?.value) || 0;
    const value2 = parseFloat(document.getElementById("exampleInput2")?.value) || 0;
    const total = value1 + value2;

    document.getElementById("exampleTotal")?.textContent = `$${total.toFixed(2)}`;

    // Store values in quote object
    currentQuote.value1 = value1;
    currentQuote.value2 = value2;
    currentQuote.exampleTotal = total;

    markSlideFilled();
  }

  // ------------------------
  // Progress / Step Marking
  // ------------------------
  function markSlideFilled() {
    const stepsData = window.stepsData;
    if (!stepsData || !stepsData.slides) return;

    const slideEl = document.getElementById("slideXCarouselItem"); // Add this id to your slide <div class="carousel-item">
    if (!slideEl) return;

    const idx = Array.from(stepsData.slides).indexOf(slideEl);
    if (idx >= 0) {
      const filled = Object.values(currentQuote).some(v => v !== null && v !== undefined && v !== "");
      stepsData.slideFilled[idx] = filled;
      if (typeof stepsData.updateProgress === "function") stepsData.updateProgress();
    }
  }

  // ------------------------
  // Overlay Event Listeners
  // ------------------------
  document.getElementById("exampleCard")?.addEventListener("click", () => openOverlay("exampleOverlay"));
  ["exampleInput1", "exampleInput2"].forEach(id =>
    document.getElementById(id)?.addEventListener("input", updateTotalsExample)
  );
  document.getElementById("saveExample")?.addEventListener("click", () => {
    updateTotalsExample();
    document.getElementById("exampleSummary")?.textContent = document.getElementById("exampleTotal")?.textContent;
    closeOverlay("exampleOverlay");
  });
  document.getElementById("cancelExample")?.addEventListener("click", () => closeOverlay("exampleOverlay"));
}
