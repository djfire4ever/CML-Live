// ✅ Attach Event Listeners to View Buttons
document.querySelectorAll(".view-button").forEach(button => {
    button.addEventListener("click", function(event) {
        const invoiceID = event.currentTarget.dataset.invoiceid;

        if (!invoiceID) {
            console.error("❌ Error: Missing invoiceID!");
            return;
        }

        populateViewForm(invoiceID);

        // Use Bootstrap's Tab system to switch to the Edit tab
        const viewTab = document.querySelector('[data-bs-target="#tab-view"]');
        if (viewTab) {
            const tab = new bootstrap.Tab(viewTab);
            tab.show(); // Switch to the tab-view tab
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    // ✅ Handle search input event listener
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", search);
    } else {
        console.error("❌ Search input not found!");
    }

// ✅ Handle search tab functionality (shown event)
const searchTabButton = document.querySelector('button[data-bs-target="#tab-search"]');
  if (searchTabButton) {
      searchTabButton.addEventListener("shown.bs.tab", function () {
        const searchInput = document.getElementById("searchInput");
        const searchResults = document.getElementById("searchResults");
        const searchCounter = document.getElementById("searchCounter");

        if (searchInput) {
            searchInput.value = "";
            searchInput.focus(); // auto-focus
        }

        if (searchResults) searchResults.innerHTML = "";

        if (searchCounter) {
            searchCounter.textContent = ""; // clear counter
            searchCounter.classList.add("text-success", "text-dark", "fw-bold");
        }
    });
      } else {
        console.error("❌ Search tab not found!");
    }

    // ✅ Clear and load fresh data
    const searchResultsBox = document.getElementById("searchResults");
    if (searchResultsBox) {
        searchResultsBox.innerHTML = "";
    }

    // Load data for search and toggle loader
    toggleLoader();
    setDataForSearch();
    setTimeout(toggleLoader, 2000); // ⏱️ slight delay
});

// ✅ Global Data Storage for Searching
let invoicedata = [];

// ✅ Load Data for Search
function setDataForSearch() {
    fetch(scriptURL + "?action=getInvDataForSearch")
        .then(response => response.json())
        .then(invoicedataReturned => {
            invoicedata = invoicedataReturned.slice();
        })
        .catch(error => console.error("❌ Error loading data:", error));
}

// ✅ Search Invoices Locally
function search() {
    const searchInputEl = document.getElementById("searchInput");
    const searchResultsBox = document.getElementById("searchResults");

    // ✅ Locate or create the counter container
    let counterContainer = document.getElementById("counterContainer");
    if (!counterContainer) {
        counterContainer = document.createElement("div");
        counterContainer.id = "counterContainer";
        counterContainer.classList.add("d-inline-flex", "gap-3", "align-items-center", "ms-3");
        searchInputEl.parentNode.insertBefore(counterContainer, searchInputEl.nextSibling);
    }

    // ✅ Locate or create the searchCounter
    let searchCounter = document.getElementById("searchCounter");
    if (!searchCounter) {
        searchCounter = document.createElement("span");
        searchCounter.id = "searchCounter";
        searchCounter.classList.add("px-2", "py-1", "border", "rounded", "fw-bold", "bg-success", "text-dark");
        counterContainer.appendChild(searchCounter);
    }

    // ✅ Locate or create the totalCounter
    let totalCounter = document.getElementById("totalCounter");
    if (!totalCounter) {
        totalCounter = document.createElement("span");
        totalCounter.id = "totalCounter";
        totalCounter.classList.add("px-3", "py-1", "border", "rounded", "fw-bold", "bg-light", "text-dark");
        searchCounter.insertAdjacentElement("afterend", totalCounter);
    }

    // ✅ Start Loader before performing search
    toggleLoader();

    // ✅ Perform the search logic
    const searchInput = searchInputEl.value.toLowerCase().trim();
    const searchWords = searchInput.split(/\s+/);
    const searchColumns = [0,1,2,3]; // Adjust column indices based on your data structure

    const resultsArray = searchInput === "" ? [] : invoicedata.filter(function (r) {
        return searchWords.every(function (word) {
            return searchColumns.some(function (colIndex) {
                return r[colIndex].toString().toLowerCase().includes(word);
            });
        });
    });

    // ✅ Update the counters after search
    searchCounter.textContent = searchInput === "" ? "🔍" : `${resultsArray.length} Invoices Found`;
    totalCounter.textContent = `Total Invoices: ${invoicedata.length}`;

    // ✅ Clear previous results and render new search results
    searchResultsBox.innerHTML = "";

    const template = document.getElementById("rowTemplate").content;

    resultsArray.forEach(r => {
        const row = document.getElementById("rowTemplate").content.cloneNode(true);
        const tr = row.querySelector("tr");
        tr.querySelector(".invoiceID").textContent = r[0];
        tr.querySelector(".invoiceDate").textContent = r[1];
        tr.querySelector(".firstName").textContent = r[2];
        tr.querySelector(".lastName").textContent = r[3];
        tr.querySelector(".eventDate").textContent = r[10];
        tr.querySelector(".eventLocation").textContent = r[11];
        tr.dataset.invoiceID = r[0];

            
        tr.addEventListener("click", async () => {
            toggleLoader(true);
            await populateViewForm(r[0]);
            new bootstrap.Tab(document.querySelector('[data-bs-target="#tab-view"]')).show();
            toggleLoader(false);
          });

          searchResultsBox.appendChild(row);
    });

    // ✅ Hide Loader after the search results are displayed
    toggleLoader();
}

// Example event handler for the view button
document.getElementById("searchResults").addEventListener("click", async function (event) {
    const target = event.target;
    if (target.classList.contains("view-button")) {
        const invoiceID = target.dataset.invoiceid?.trim();
        if (!invoiceID) return console.error("❌ Missing invoiceID");

        toggleLoader(true); // Show loader immediately

        try {
            await populateViewForm(invoiceID); // Wait until data loads

            // Switch tabs *after* data is populated
            const viewTab = document.querySelector('[data-bs-target="#tab-view"]');
            if (viewTab) {
                const tab = new bootstrap.Tab(viewTab);
                tab.show();
            }

        } catch (e) {
            console.error("❌ Failed to view invoice:", e);
        } finally {
            toggleLoader(false);
        }
    }
});
  
function populateViewForm(invoiceID) {
    const invoiceIDField = document.getElementById("invoiceID");
    invoiceIDField.value = invoiceID;
    invoiceIDField.removeAttribute("readonly");
  
    toggleLoader(true);
  
    return fetch(scriptURL + `?action=getInvoiceById&invoiceID=${invoiceID}`)
      .then(async response => {
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch (err) {
          throw new Error("Failed to parse JSON: " + err.message + "\nResponse text: " + text);
        }
      })
      .then(invoiceInfo => {
        if (invoiceInfo.error) throw new Error(invoiceInfo.error);
  
        ["invoiceID", "invDate", "firstName", "lastName", "phone", "email", "street", "city", "state", "zip", "eventDate", "eventLocation"].forEach(field => {
          const input = document.getElementById(field);
          if (input) input.value = invoiceInfo[field] || "";
        });
  
        window.currentInvoiceData = invoiceInfo;
  
        const viewButton = document.getElementById("view-Button");
        if (viewButton && invoiceInfo.pdfLink) {
          viewButton.dataset.pdfLink = invoiceInfo.pdfLink;
        }
  
        document.getElementById("view-Button").addEventListener("click", openPDFfromInput);
        document.getElementById("send-Button").addEventListener("click", openEmailModal);
      })
      .catch(error => {
        console.error("❌ Error fetching invoice data:", error);
        showToast("❌ Error loading invoice data!", "error");
      })
      .finally(() => {
        toggleLoader(false);
      });
  }
    
// ✅ Handle View Clicks Dynamically
document.getElementById("searchResults").addEventListener("click", function (event) {
    const editButton = event.target.closest(".view-button");
    if (editButton) {
        const invoiceID = editButton.dataset.invoiceid;
        if (!invoiceID) {
            console.error("❌ Error: Missing invoiceID!");
            return;
        }
        populateViewForm(invoiceID);

        // Use Bootstrap's Tab system to switch to the Edit tab
        const viewTab = document.querySelector('[data-bs-target="#tab-view"]');
        if (viewTab) {
            const tab = new bootstrap.Tab(viewTab);
            tab.show(); // Switch to the tab-view tab
        }
    }
});

// PDF section

// --- DOM Ready Setup ---
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("view-Button").addEventListener("click", openPDFfromInput);
    document.getElementById("send-Button").addEventListener("click", openEmailModal);
});

// --- Open PDF in New Window ---
function openPDFfromInput() {
    const viewBtn = document.getElementById("view-Button");
    const pdfUrl = viewBtn.dataset.pdfLink;

    if (!pdfUrl) {
        showToast("PDF not available for this invoice.", "error");
        return;
    }

    const windowFeatures = `width=900,height=700,top=100,left=200,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,status=no`;
    window.open(pdfUrl, "_blank", windowFeatures);
}

// --- Email Templates ---
const emailTemplates = {
    invoice: (info) => ({
      subject: `Invoice #${info.invoiceID} - ${info.eventDate}`,
      message: `Hi ${info.firstName},
  
  Thank you again for booking with us!
  
  Please find your invoice for the event on ${info.eventDate} at ${info.eventLocation}.
  
  You can view or download your invoice here:
  ${info.pdfLink}
  
  If you have any questions, feel free to reach out.
  
  Best regards,  
  Your Company Name`
    })
  };
  
// --- Open Email Modal with Pre-Filled Template ---
function openEmailModal() {
    const invoiceInfo = window.currentInvoiceData;

    if (!invoiceInfo || !invoiceInfo.email || !invoiceInfo.invoiceID) {
        showToast("❌ Missing invoice info for email", "error");
        return;
    }

    // Fill email modal fields using the template
    const { subject, message } = emailTemplates.invoice(invoiceInfo);

    document.getElementById("emailTo").value = invoiceInfo.email;
    document.getElementById("emailSubject").value = subject;
    document.getElementById("emailMessage").value = message;

    // Store the PDF link in the form dataset
    const emailForm = document.getElementById("emailForm");
    if (emailForm) {
        emailForm.dataset.pdfUrl = invoiceInfo.pdfLink;
    }

    // Show the modal
    const emailModal = new bootstrap.Modal(document.getElementById("emailModal"));
    emailModal.show();
}

// --- Send Email Handler ---
function sendEditedEmail() {
    const emailForm = document.getElementById("emailForm");
    const email = document.getElementById("emailTo").value;
    const subject = document.getElementById("emailSubject").value;
    const message = document.getElementById("emailMessage").value;
    const pdfUrl = emailForm ? emailForm.dataset.pdfUrl : null;  // Get the PDF link

    if (!email || !subject || !message || !pdfUrl) {
        showToast("❌ Missing email details", "error");
        return;
    }

    fetch('/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            subject,
            message,  // This will be sent as an HTML message
            pdfUrl    // Include the link to the PDF
        })
    })
    .then(response => response.json())
    .then(invoicedata => {
        if (invoicedata.success) {
            showToast(`✅ Email sent successfully to ${email}`, "success");
            const emailModal = bootstrap.Modal.getInstance(document.getElementById("emailModal"));
            if (emailModal) emailModal.hide();
        }
    })
    .catch(error => {
        showToast(`❌ Error sending email: ${error.message}`, "error");
    });
}

function openPDFfromInput() {
    const viewBtn = document.getElementById("view-Button");
    const pdfUrl = viewBtn.dataset.pdfLink;
      if (!pdfUrl) {
          showToast("PDF not available for this invoice.", "error");
          return;
      }
      
    // Customize window features
    const windowFeatures = `
      width=900,
      height=700,
      top=100,
      left=200,
      resizable=yes,
      scrollbars=yes,
      toolbar=no,
      menubar=no,
      status=no
    `;
     
    window.open(pdfUrl, "_blank", windowFeatures);
  }
  