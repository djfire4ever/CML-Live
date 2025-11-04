// qm-modules/carousel.js
export function initCarousel() {
  const carouselEl = document.querySelector("#quoteCarousel");
  if (!carouselEl) {
    console.error("❌ #quoteCarousel not found");
    return null;
  }
  const bsCarousel = new bootstrap.Carousel(carouselEl);
  console.log("✅ Bootstrap Carousel initialized", bsCarousel);
  return bsCarousel;
}

export function initStepsAndProgress(slidesSelector = "#quoteCarousel .carousel-item", progressSelector = "#progressBar") {
  const steps = document.querySelectorAll(".step");
  const progressBar = document.querySelector(progressSelector);
  const slides = document.querySelectorAll(slidesSelector);
  const totalSlides = slides.length;

  const slideFilled = Array(totalSlides).fill(false);
  let currentStep = 0;

  function isSlideFilled(slideEl) {
    const inputs = slideEl.querySelectorAll("input, select, textarea");
    return Array.from(inputs).some(input => input.value.trim() !== "");
  }

  function updateProgress() {
    slides.forEach((slide, idx) => {
      if (isSlideFilled(slide)) slideFilled[idx] = true;
    });

    steps.forEach((step, idx) => {
      step.classList.toggle("active", idx === currentStep);
      step.classList.toggle("filled", slideFilled[idx]);
    });

    const filledCount = slideFilled.filter(Boolean).length;
    const percent = (filledCount / totalSlides) * 100;
    if (progressBar) progressBar.style.setProperty("width", `${percent}%`, "important");
  }

  slides.forEach(slide => {
    slide.querySelectorAll("input, select, textarea").forEach(input => {
      input.addEventListener("input", updateProgress);
    });
  });

  const stepsData = {
    steps,
    slides,
    slideFilled,
    getCurrentStep: () => currentStep,
    setCurrentStep: idx => { currentStep = idx; updateProgress(); currentStep = idx; },
    updateProgress
  };

  window.stepsData = stepsData;
  return stepsData;
}
