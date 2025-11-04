import { notifyDrawer } from "./drawers.js";

export function initSlide2Event() {
  const eventDateInput = document.getElementById("eventDate");
  const eventLocationInput = document.getElementById("eventLocation");

  if (!eventDateInput || !eventLocationInput) {
    console.warn("⚠️ Slide 2 event inputs not found");
    return;
  }

  function updateSummary() {
    const eventDateValue = eventDateInput.value || "";
    const eventLocationValue = eventLocationInput.value || "";

    // Notify summary drawer using unified state
    notifyDrawer("summaryDrawer", {
      eventDate: eventDateValue,
      eventLocation: eventLocationValue
    });
  }

  // Listen for changes or blur events
  eventDateInput.addEventListener("input", updateSummary);
  eventLocationInput.addEventListener("input", updateSummary);
  eventDateInput.addEventListener("blur", updateSummary);
  eventLocationInput.addEventListener("blur", updateSummary);
}

// Optional: getter for payload aggregation
export function getEventDetails() {
  return {
    eventDate: formatDateForServer(document.getElementById("eventDate")?.value) || "",
    dueDate: formatDateForServer(document.getElementById("dueDate")?.value) || "",
    eventLocation: document.getElementById("eventLocation")?.value || "",
    eventNotes: document.getElementById("eventNotes")?.value || "",
    eventTheme: document.getElementById("eventTheme")?.value || ""
  };
}
