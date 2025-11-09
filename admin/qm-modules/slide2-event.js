// qm-modules/slide2-event.js
import { notifyDrawer } from "./drawers.js";

// =========================================================
// Slide 2: Event Details - QM Module
// =========================================================
export function initSlide2Event(currentQuote) {
  const eventDateInput = document.getElementById("eventDate");
  const eventLocationInput = document.getElementById("eventLocation");
  const dueDateInput = document.getElementById("dueDate");
  const eventNotesInput = document.getElementById("eventNotes");
  const eventThemeInput = document.getElementById("eventTheme");

  if (!eventDateInput || !eventLocationInput) {
    console.warn("⚠️ Slide 2 event inputs not found");
    return;
  }

  function updateSummary() {
    const eventDateValue = eventDateInput.value || "";
    const eventLocationValue = eventLocationInput.value || "";
    const dueDateValue = dueDateInput?.value || "";
    const eventNotesValue = eventNotesInput?.value || "";
    const eventThemeValue = eventThemeInput?.value || "";

    // --- Update shared quote state ---
    Object.assign(currentQuote, {
      eventDate: eventDateValue,
      dueDate: dueDateValue,
      eventLocation: eventLocationValue,
      eventNotes: eventNotesValue,
      eventTheme: eventThemeValue
    });

    // --- Notify summary drawer using unified state ---
    notifyDrawer("quoteSummaryDrawer", {
      eventDate: eventDateValue,
      eventLocation: eventLocationValue
    });
  }

  // --- Event listeners (on input & blur) ---
  [eventDateInput, eventLocationInput, dueDateInput, eventNotesInput, eventThemeInput].forEach(el => {
    if (el) {
      el.addEventListener("input", updateSummary);
      el.addEventListener("blur", updateSummary);
    }
  });
}

// =========================================================
// Optional Getter for Aggregation
// =========================================================
export function getEventDetails() {
  return {
    eventDate: formatDateForServer(document.getElementById("eventDate")?.value) || "",
    dueDate: formatDateForServer(document.getElementById("dueDate")?.value) || "",
    eventLocation: document.getElementById("eventLocation")?.value || "",
    eventNotes: document.getElementById("eventNotes")?.value || "",
    eventTheme: document.getElementById("eventTheme")?.value || ""
  };
}
