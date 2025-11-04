// quote-manager.js
// === Module Imports ===
import { initSlide1Client } from "./qm-modules/slide1-client.js";
import { initSlide2Event } from "./qm-modules/slide2-event.js";
import { initSlide3Products } from './qm-modules/slide3-products.js';
import { drawerEvents, initDrawers } from "./qm-modules/drawers.js";
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

  function isSlideFilled(slideEl) {
    const inputs = slideEl.querySelectorAll("input, select, textarea");
    return Array.from(inputs).some(input => input.value.trim() !== "");
  }

function updateProgress() {
  slides.forEach((slide, idx) => {
    if (idx === 2) {
      // 🔹 Slide 3 uses product tiles instead of input fields
      const grid = slide.querySelector(".product-grid");
      const productTiles = grid ? grid.querySelectorAll(".product-tile") : [];
      slideFilled[idx] = productTiles.length > 0;
    } else {
      // Default rule: mark as filled if any field has a value
      slideFilled[idx] = isSlideFilled(slide);
    }
  });

  // Update visual step indicators
  steps.forEach((step, idx) => {
    step.classList.toggle("active", idx === currentStep);
    step.classList.toggle("filled", slideFilled[idx]);
  });

  // Update progress bar width
  const filledCount = slideFilled.filter(Boolean).length;
  const percent = (filledCount / totalSlides) * 80;
  if (progressBar) progressBar.style.setProperty("width", `${percent}%`, "important");
}

  // Input listeners for normal slides
  slides.forEach(slide => {
    slide.querySelectorAll("input, select, textarea").forEach(input =>
      input.addEventListener("input", updateProgress)
    );
  });

  // 🔹 Listen for product changes from Slide 3
  if (typeof drawerEvents !== "undefined") {
    drawerEvents.addEventListener("slide3ProductsChanged", updateProgress);
  }

  // Return control interface
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
async function initSlides(scriptURL) {
  await initSlide1Client(scriptURL); 
  await initSlide2Event(scriptURL);
  await initSlide3Products(scriptURL);
  // Future slides can be added here, e.g.:
  // await initSlide4DiscountsFees();
}

// === Window Load Entry Point ===
window.addEventListener('load', async () => {
  // Carousel
  const bsCarousel = initCarousel();
  if (!bsCarousel) return;

  // Steps / progress
  const stepsData = initStepsAndProgress();
  initNavigation(bsCarousel, stepsData);

  // Drawers
  initAppDrawers();

  // Slide modules
  const scriptURL = window.scriptURL; // Already defined globally in global.js
  await initSlides(scriptURL);
});
