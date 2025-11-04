// qm-modules/quote-payload.js
import { getEventDetails } from "./slide2-event.js";

/**
 * Collects all data from each slide and combines into a single quote payload
 * Modular replacement for collectQuoteFormData("add")
 */
export function collectQuotePayload() {
  // --- Slide 1: Client info ---
  const client = {
    firstName: document.querySelector(".firstName")?.textContent.trim() || "",
    nickName: document.querySelector(".nickName")?.textContent.trim() || "",
    lastName: document.querySelector(".lastName")?.textContent.trim() || "",
    email: document.querySelector(".email")?.textContent.trim() || "",
    phone: document.querySelector(".clientID-input")?.value.trim() || "",
    street: document.querySelector(".street")?.textContent.trim() || "",
    city: document.querySelector(".city")?.textContent.trim() || "",
    state: document.querySelector(".state")?.textContent.trim() || "",
    zip: document.querySelector(".zip")?.textContent.trim() || "",
    tier: document.querySelector(".tier")?.textContent.trim() || "New",
    memberSince: document.querySelector(".memberSince")?.textContent.trim() || "",
    birthday: document.querySelector(".birthday")?.textContent.trim() || ""
  };

  // --- Slide 2: Event info ---
  const event = getEventDetails(); // reads #eventDate, #dueDate, #eventLocation, #eventNotes, #eventTheme

  // --- Merge into payload ---
  const quotePayload = {
    ...client,
    ...event,
    timestamp: new Date().toISOString()
    // future: append totals, products, payments, fees, discounts, etc.
  };

  console.log("📦 Quote payload collected:", quotePayload);
  return quotePayload;
}
