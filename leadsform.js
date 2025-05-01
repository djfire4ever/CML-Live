// ✅ Listen for message to refresh leads
window.addEventListener("message", function(event) {
  if (event.data && event.data.action === "refreshLeads") {
    console.log("🔄 Refreshing leads list...");
    loadLeads();
  }
});

// Attach listener
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logActionForm")?.addEventListener("submit", submitLogAction);
});

document.addEventListener("DOMContentLoaded", () => {
  const contactMethodPhone = document.getElementById("contactMethodPhone");
  const contactMethodEmail = document.getElementById("contactMethodEmail");
  const phoneField = document.getElementById("phoneField");
  const emailField = document.getElementById("emailField");
  const phoneInput = document.getElementById("phone");
  const emailInput = document.getElementById("email");
  const submitBtn = document.getElementById("submitLead");
  const leadForm = document.getElementById("leadForm");
  const leadModalEl = document.getElementById("leadModal");
  const leadModal = window.bootstrap?.Modal.getOrCreateInstance(document.getElementById("leadModal")); // ✅ grab modal instance

  function toggleFields() {
    if (!contactMethodPhone || !contactMethodEmail) return;

    const phoneChecked = contactMethodPhone.checked;
    const emailChecked = contactMethodEmail.checked;

    phoneField.style.display = phoneChecked ? "block" : "none";
    emailField.style.display = emailChecked ? "block" : "none";

    phoneInput.required = phoneChecked;
    emailInput.required = emailChecked;
  }

  if (contactMethodPhone && contactMethodEmail) {
    toggleFields();
    contactMethodPhone.addEventListener("change", toggleFields);
    contactMethodEmail.addEventListener("change", toggleFields);
  }

  submitBtn?.addEventListener("click", () => {
    if (!contactMethodPhone.checked && !contactMethodEmail.checked) {
      alert("Please select at least one preferred contact method.");
      return;
    }

    if (leadForm?.checkValidity()) {
      handleLeadSubmission(leadModal); // ✅ pass modal instance
    } else {
      leadForm?.reportValidity();
    }
  });

  document.getElementById("statusFilter")?.addEventListener("change", filterLeads);
  document.getElementById("searchBar")?.addEventListener("input", filterLeads);

  if (document.querySelector("#leadsTable tbody")) {
    loadLeads();
  }
});

async function handleLeadSubmission(leadModal) {
  const getValue = id => document.getElementById(id)?.value.trim() || "";

  const firstName = getValue("firstName");
  const lastName = getValue("lastName");
  const phone = getValue("phone");
  const email = getValue("email");
  const leadSource = getValue("leadSource") || "N/A";
  const interestLevel = getValue("interestLevel") || "N/A";
  const inquiryType = getValue("inquiryType") || "N/A";
  const notes = getValue("notes") || "N/A";
  const bestTime = getValue("bestTime") || "N/A";

  const contactMethodPhone = document.getElementById("contactMethodPhone").checked;
  const contactMethodEmail = document.getElementById("contactMethodEmail").checked;

  if (!firstName) {
    return showToast("First Name is required!", "warning", true);
  }

  if (!contactMethodPhone && !contactMethodEmail) {
    return showToast("Please select at least one preferred contact method.", "warning", true);
  }

  const preferredContact = [
    contactMethodPhone ? "Phone" : null,
    contactMethodEmail ? "Email" : null,
  ].filter(Boolean).join(", ");

  const leadData = {
    firstName,
    lastName,
    phone: contactMethodPhone ? phone : "",
    email: contactMethodEmail ? email : "",
    preferredContact,
    bestTime,
    leadSource,
    interestLevel,
    inquiryType,
    notes,
    status: "New",
    leadDate: new Date(),
    followupDate: ""
  };

  console.log("Sending lead data:", leadData);

  try {
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "leads", action: "add", leadInfo: leadData })
    });

    const result = await res.json();

    if (result.success) {
      showToast("✅ Thank you. We will contact you shortly.", "success", true);
      bootstrap.Modal.getInstance(document.getElementById("leadModal"))?.hide();
      document.getElementById("leadForm")?.reset();

      // ✅ Send postMessage to leads.html to refresh leads
      const leadsIframe = parent.document.getElementById("content-frame");
      if (leadsIframe && leadsIframe.contentWindow) {
        leadsIframe.contentWindow.postMessage({ action: "refreshLeads" }, "*");
      }

    } else {
      showToast("❌ Error: " + (result.error || "Unknown error"), "danger", true);
    }
  } catch (err) {
    console.error("❌ Error submitting lead:", err);
    showToast("❌ Failed to submit. Check console for details.", "danger", true);
  }
}

let leadsData = [];

async function loadLeads() {
  const url = `${scriptURL}?system=leads&action=getLeads`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const result = await response.json();

    console.log("✅ Leads loaded:", result); // <== For debugging

    if (result && !result.error) {
      leadsData = result;
      renderLeads(leadsData); // ✅ Corrected call
    } else {
      showToast("⚠️ Failed to load leads: " + (result.error || "Unknown error"), "warning", true);
    }
  } catch (err) {
    console.error("❌ Error fetching leads:", err);
    showToast("❌ Could not load leads. See console for details.", "danger", true);
  }
}

// ==============================
// 📊 RENDER TABLE ROWS
// ==============================
// helper (put this near the top of your leadsform.js)
function formatMmDdYyyy(input) {
  if (!input) return "";
  const d = new Date(input);
  if (isNaN(d)) return "";
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  const y = d.getFullYear();
  return `${m}/${day}/${y}`;
}

// …inside your renderLeads(data) function, replace the direct date cells with formatted versions:
function renderLeads(data) {
  const tbody = document.querySelector("#leadsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  data.forEach(lead => {
    const leadDateRaw = lead["LeadDate"];
    const firstContactRaw = lead["FirstContact"];
    const nextFollowUpRaw = lead["NextFollowUpDate"];
    const actionDateRaw = lead["ActionDate"]; 

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${lead["LeadID"]||""}</td>
      <td>${lead["FirstName"]||""} ${lead["LastName"]||""}</td>
      <td>${lead["Phone#"]||""}</td>
      <td>${lead["Email"]||""}</td>
      <td>${lead["LeadSource"]||""}</td>
      <td>${lead["Status"]||""}</td>
      <td>${formatMmDdYyyy(firstContactRaw)}</td>
      <td>${formatMmDdYyyy(actionDateRaw) || "N/A"}</td>
      <td>${formatMmDdYyyy(nextFollowUpRaw) || "N/A"}</td>
      <td>
        <button class="btn btn-warning btn-sm" onclick="openLogModal(${lead.LeadID})">
          Log Action
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ==============================
// 📝 LOG LEAD ACTION
// ==============================
let currentLeadID = null;  // Global variable to store the current Lead ID

// Function to open the Log Action modal and pre-populate the form
function openLogModal(leadID) {

  // Store the Lead ID globally
  currentLeadID = leadID;

  // Open the modal
  const modal = new bootstrap.Modal(document.getElementById("logActionModal"));
  modal.show();
}

async function submitLogAction(event) {
  event.preventDefault();

  const leadID = currentLeadID;
  console.log("Current Lead ID:", leadID);

  // Get Action Type and Notes from form
  const actionType = document.getElementById("actionType")?.value || "";
  const actionNotes = document.getElementById("actionNotes")?.value || "";

  // Get the Follow Up Interval from the visible input field
  const customFollowUpEl = document.getElementById("customFollowUpInterval");
  console.log("Custom Follow Up Interval Value:", customFollowUpEl.value);

  let followUpInterval = parseInt(customFollowUpEl.value.trim(), 10);

  // Validate the Follow Up Interval (positive integer)
  if (isNaN(followUpInterval) || followUpInterval <= 0) {
    console.error("Invalid follow-up interval, defaulting to 0");
    followUpInterval = 0; // Default to 0 if invalid
  }

  // Set the value into the hidden followUpInterval input for backend processing
  const hiddenFollowUpEl = document.getElementById("followUpInterval");
  if (hiddenFollowUpEl) {
    hiddenFollowUpEl.value = followUpInterval; // Set the validated value
  }

  // Log the form data being sent to backend
  console.log("Action Type:", actionType);
  console.log("Action Notes:", actionNotes);
  console.log("Follow Up Interval:", followUpInterval);

  // Show loader to indicate form submission in progress
  toggleLoader(true);

  try {
    // Prepare the data payload
    const payload = {
      system: "leads",
      action: "logAction",
      leadID,
      actionType,
      notes: actionNotes,
      followUpInterval // This is the interval that may have been changed by the user
    };

    // Send the form data to the backend
    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // Process the response from backend
    const result = await res.json();
    console.log("Backend Response:", result);

    // Hide the loader after form submission is complete
    toggleLoader(false);

    // If action was logged successfully, reset form and close modal
    if (result.success) {
      const form = document.getElementById("logActionForm");
      if (form) form.reset();

      const modal = bootstrap.Modal.getInstance(document.getElementById("logActionModal"));
      if (modal) modal.hide();

      showToast("✅ Action logged successfully!", "success");

      // Refresh leads list and badges (optional)
      const leadsResponse = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: "leads", action: "getLeads" })
      });

      const leadsResult = await leadsResponse.json();
      if (leadsResult.success && Array.isArray(leadsResult.data)) {
        if (typeof parent?.updateLeadBadge === "function") {
          parent.updateLeadBadge(leadsResult.data);
        } else if (typeof updateLeadBadge === "function") {
          updateLeadBadge(leadsResult.data);
        }
      }
    } else {
      // Handle error in logging action
      console.log("Action failed:", result.message);
      showToast("⚠️ Action failed to log: " + (result.message || "Unknown error"), "warning");
    }

  } catch (error) {
    // Handle any unexpected errors during the fetch
    toggleLoader(false);
    console.error("❌ Error submitting action:", error);
    showToast("🚨 An error occurred while logging the action.", "danger");
  }
}

// Helper function for posting JSON data
async function postData(url = '', data = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error(`HTTP error! Status: ${res.status}`);
  }
  return res.json();
}

function filterLeads() {
  // Placeholder to fix crash — implement filtering later
  console.log("filterLeads placeholder called");
}

// Attach listener
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logActionForm")?.addEventListener("submit", submitLogAction);
});

// This is a test