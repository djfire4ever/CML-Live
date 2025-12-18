// quote-manager.js

// === Module Imports ===
import { initSlide1Client } from "./qm-modules/slide1-client.js";
import { initSlide2Event } from "./qm-modules/slide2-event.js";
import { initSlide3Products } from './qm-modules/slide3-products.js';
import { initSlide4Other } from "./qm-modules/slide4-other.js";
// import { initSlide5Finalize } from "./qm-modules/slide5-finalize.js";
import { drawerEvents, initDrawers } from "./qm-modules/drawers.js";
import { setupInvoiceButton } from './qm-modules/invoice.js';
import { setupShoppingListButton } from './qm-modules/shoppinglist.js';
import { collectQuotePayload } from "./qm-modules/quote-payload.js";

// === Carousel Initialization ===
function initCarousel() {
  const carousel = document.querySelector("#quoteCarousel");
  if (!carousel) {
    console.error("❌ #quoteCarousel not found");
    return null;
  }
  const bsCarousel = new bootstrap.Carousel(carousel);
  // console.log("✅ Bootstrap Carousel initialized", bsCarousel);
  return bsCarousel;
}

// === Step Indicators, Progress, and Slide Completion ===
function initStepsAndProgress() {
  const steps = document.querySelectorAll(".step");
  const progressBar = document.getElementById("progressBar");
  const slides = document.querySelectorAll("#quoteCarousel .carousel-item");
  const totalSlides = slides.length;

  const slideFilled = Array(totalSlides).fill(false);
  let currentStep = 0;

  function isSlideFilled(slideEl, idx) {
    // Slide 3: check products in currentQuote
    if (idx === 2) {
      return Array.isArray(window.currentQuote?.products) && window.currentQuote.products.length > 0;
    }

    // All other slides: check inputs
    const inputs = slideEl.querySelectorAll("input, select, textarea");
    return Array.from(inputs).some(input => {
      const value = input.value.trim();

      if (input.type === "number") {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
      }
      if (value === "0" || value === "0%" || value === "$0.00") return false;

      return value !== "";
    });
  }

  function updateProgress() {
    slides.forEach((slide, idx) => {
      slideFilled[idx] = isSlideFilled(slide, idx);
    });

    steps.forEach((step, idx) => {
      step.classList.toggle("active", idx === currentStep);
      step.classList.toggle("filled", slideFilled[idx]);
    });

    const filledCount = slideFilled.filter(Boolean).length;
    const percent = (filledCount / totalSlides) * 80;
    if (progressBar) progressBar.style.setProperty("width", `${percent}%`, "important");
  }

  // Input listeners for slides (except Slide 3)
  slides.forEach((slide, idx) => {
    if (idx === 2) return; // Slide 3 doesn’t need input listeners
    slide.querySelectorAll("input, select, textarea").forEach(input =>
      input.addEventListener("input", updateProgress)
    );
  });

  // Interface to control steps externally
  const stepsData = {
    steps,
    slides,
    slideFilled,
    getCurrentStep: () => currentStep,
    setCurrentStep: idx => {
      currentStep = idx;
      updateProgress();
    },
    updateProgress
  };

  window.stepsData = stepsData;
  return stepsData;
}

// === Navigation Buttons ===
function initNavigation(bsCarousel, stepsData) {
  const { slides, getCurrentStep, setCurrentStep, updateProgress } = stepsData;
  const nextBtns = document.querySelectorAll(".nextBtn");
  const prevBtns = document.querySelectorAll(".prevBtn");

  function updateButtons() {
    const current = getCurrentStep();
    nextBtns.forEach(btn => btn.style.visibility = current === slides.length - 1 ? 'hidden' : 'visible');
    prevBtns.forEach(btn => btn.style.visibility = current === 0 ? 'hidden' : 'visible');
  }

  nextBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const current = getCurrentStep();
      if (current < slides.length - 1) {
        setCurrentStep(current + 1);
        bsCarousel.to(current + 1);
        updateButtons();
      }
    });
  });

  prevBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const current = getCurrentStep();
      if (current > 0) {
        setCurrentStep(current - 1);
        bsCarousel.to(current - 1);
        updateButtons();
      }
    });
  });

  stepsData.steps.forEach((step, idx) => {
    step.addEventListener("click", () => {
      setCurrentStep(idx);
      bsCarousel.to(idx);
      updateButtons();
    });
  });

  updateButtons();
  updateProgress();
}

// === Drawers Initialization ===
function initAppDrawers() {
  initDrawers();
}

// === Slide Initialization ===
async function initSlides() {
  // create the canonical object
  const rawQuote = {}; // shared mutable object

  // wrap it in a Proxy (without console traces)
  const currentQuote = new Proxy(rawQuote, {
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
    deleteProperty(target, prop) {
      return delete target[prop];
    }
  });

  // Expose the proxied object globally before handing it to slides
  window.currentQuote = currentQuote;

  // Pass the proxied object into the slide initializers
  await initSlide1Client(currentQuote, scriptURL);
  await initSlide2Event(currentQuote);
  await initSlide3Products(currentQuote, scriptURL);
  await initSlide4Other(currentQuote);

  // Ensure window.currentQuote remains set
  window.currentQuote = currentQuote;
}

// === Window Load Entry Point ===
window.addEventListener('load', async () => {
  const bsCarousel = initCarousel();
  if (!bsCarousel) return;

  const stepsData = initStepsAndProgress();
  initNavigation(bsCarousel, stepsData);

  // === 🔹 Add this block here (focus + optional clear) ===
  const carouselEl = document.getElementById("quoteCarousel");
  carouselEl.addEventListener("slid.bs.carousel", () => {
    if (stepsData.getCurrentStep() === 0) {
      const input = document.querySelector(".clientID-input");
      if (input) {
        input.focus();
        input.select();
      }

      // Optional: clear suggestions or fields
      const suggestions = document.querySelector(".client-suggestions");
      if (suggestions) {
        suggestions.style.display = "none";
      }
    }
  });
  // === end insert ===

  initAppDrawers();
  await initSlides();

  setupShoppingListButton(document.getElementById('openShoppingList'), scriptURL);
  setupInvoiceButton(document.getElementById('openInvoicePreview'), currentQuote, scriptURL);
});

// === OPTIONAL DEBUG BUTTON (Collapsible Table) ===
// Keep this part isolated so it’s easy to remove later.
(() => {
  const debugBtn = document.getElementById("debugQuoteBtn");
  if (!debugBtn) return;

  debugBtn.addEventListener("click", () => {
    if (!window.currentQuote) {
      console.warn("No currentQuote available");
      return;
    }

    // Deep copy to freeze snapshot
    const snapshot = JSON.parse(JSON.stringify(window.currentQuote));

    console.groupCollapsed("🧠 Current Quote Snapshot");
    for (const [key, value] of Object.entries(snapshot)) {
      if (Array.isArray(value)) {
        console.groupCollapsed(`${key} [Array: ${value.length}]`);
        console.table(value);
        console.groupEnd();
      } else if (typeof value === "object" && value !== null) {
        console.groupCollapsed(`${key} [Object]`);
        console.table(value);
        console.groupEnd();
      } else {
        console.log(`${key}:`, value);
      }
    }
    console.groupEnd();
  });
})();

