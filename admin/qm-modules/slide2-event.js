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

  function updateQuoteState() {
    // --- Update shared quote state ---
    Object.assign(currentQuote, {
      eventDate: eventDateInput.value || "",
      dueDate: dueDateInput?.value || "",
      eventLocation: eventLocationInput.value || "",
      eventNotes: eventNotesInput?.value || "",
      eventTheme: eventThemeInput?.value || ""
    });

    // --- Notify summary drawer using unified state ---
    notifyDrawer("quoteSummaryDrawer", {
      name: currentQuote.clientName,
      clientID: currentQuote.clientID,
      tier: currentQuote.tier,
      eventDate: currentQuote.eventDate,
      eventLocation: currentQuote.eventLocation
    });

    // Optionally update other drawers if needed:
    notifyDrawer("runningTotalDrawer", {}); // reads from currentQuote internally
  }

  // --- Attach listeners ---
  [eventDateInput, eventLocationInput, dueDateInput, eventNotesInput, eventThemeInput].forEach(el => {
    if (!el) return;
    el.addEventListener("input", updateQuoteState);
    el.addEventListener("blur", updateQuoteState);
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
