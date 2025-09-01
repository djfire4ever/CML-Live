// ✅ Wait for DOM Load
document.addEventListener("DOMContentLoaded", async () => {
    const searchInput = document.getElementById("searchInput");
    const searchTabBtn = document.querySelector('[data-bs-target="#tab-search"]');
    const resultsBox = document.getElementById("searchResults");
  
    if (searchInput) searchInput.addEventListener("input", search);
    else console.error("❌ Search input not found!");
  
    if (searchTabBtn) {
      searchTabBtn.addEventListener("shown.bs.tab", () => {
        if (searchInput) searchInput.value = "";
        if (resultsBox) resultsBox.innerHTML = "";
        const sc = document.getElementById("searchCounter");
        if (sc) sc.textContent = "";
        searchInput?.focus();
      });
    } else {
      console.error("❌ Search tab button not found!");
    }
  
    if (resultsBox) resultsBox.innerHTML = "";
    toggleLoader();
    await setDataForSearch();
    setTimeout(toggleLoader, 500);
  });
  
  // ✅ Global Search Data
  let data = [];
  
  // ✅ Fetch Data
  async function setDataForSearch() {
    try {
      const response = await fetch(scriptURL + "?action=getDataForSearch");
      const result = await response.json();
      data = result.slice();
    } catch (error) {
      console.error("❌ Error loading data:", error);
    }
  }
  
  // ✅ Search Function
function search() {
  const searchInputVal = document.getElementById("searchInput").value.toLowerCase().trim();
  const searchWords = searchInputVal.split(/\s+/);
  const resultsContainer = document.getElementById("clientsAccordion");
  resultsContainer.innerHTML = "";

  const resultsArray = searchInputVal === "" ? [] : data.filter(r =>
    searchWords.every(word =>
      [0,1,2,3].some(i => r[i].toString().toLowerCase().includes(word))
    )
  );

  const searchCounter = document.getElementById("searchCounter");
  const totalCounter = document.getElementById("totalCounter");

  if (searchCounter) {
    if (searchInputVal === "") searchCounter.style.display = "none";
    else {
      searchCounter.textContent = `${resultsArray.length} Clients Found`;
      searchCounter.style.display = "inline-block";
    }
  }
  if (totalCounter) totalCounter.textContent = `${data.length} Total Clients`;

  if (!resultsArray.length) {
    if (searchCounter) searchCounter.textContent = "🔍";
    return;
  }

  resultsArray.forEach(r => {
    const template = document.getElementById("rowTemplate").content.cloneNode(true);
    const accordionItem = template.querySelector(".accordion-item");

    accordionItem.querySelector(".accordion-button").setAttribute("data-bs-target", `#collapse-${r[0]}`);
    accordionItem.querySelector(".accordion-collapse").id = `collapse-${r[0]}`;
    accordionItem.querySelector(".accordion-header").id = `heading-${r[0]}`;
    accordionItem.querySelector(".client-name").textContent = `${r[1]} ${r[2]}`;

    const infoDiv = accordionItem.querySelector(".client-info");
    infoDiv.innerHTML = `
      <div><strong>Phone:</strong> <span class="field" data-field="clientID">${r[0]}</span></div>
      <div><strong>Email:</strong> <span class="field" data-field="email">${r[4]}</span></div>
      <div><strong>Nick:</strong> <span class="field" data-field="nickName">${r[3]}</span></div>
      <div><strong>Address:</strong> 
        <span class="field" data-field="street">${r[5]}</span>, 
        <span class="field" data-field="city">${r[6]}</span>, 
        <span class="field" data-field="state">${r[7]}</span> 
        <span class="field" data-field="zip">${r[8]}</span>
      </div>
    `;

    const deleteBtn = accordionItem.querySelector(".before-delete-button");
    const confirmBtn = accordionItem.querySelector(".delete-button");

    deleteBtn.dataset.clientid = r[0];
    confirmBtn.dataset.clientid = r[0];

    // Create Edit button
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-sm btn-info mt-2";
    editBtn.textContent = "Edit";
    infoDiv.appendChild(editBtn);

    let isEditing = false;
    let originalValues = {};

    editBtn.addEventListener("click", () => {
      if (!isEditing) {
        // Start editing
        isEditing = true;
        originalValues = {};
        accordionItem.querySelectorAll(".field").forEach(span => {
          const value = span.textContent;
          originalValues[span.dataset.field] = value;
          const input = document.createElement("input");
          input.value = value;
          input.className = "form-control form-control-sm mb-1";
          input.dataset.field = span.dataset.field;
          span.replaceWith(input);
        });

        // Change button to Save / Cancel
        editBtn.textContent = "Save";
        const cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "btn btn-sm btn-secondary mt-2 ms-2";
        cancelBtn.textContent = "Cancel";
        editBtn.after(cancelBtn);

        cancelBtn.addEventListener("click", () => {
          // Revert inputs back to spans
          accordionItem.querySelectorAll("input").forEach(input => {
            const span = document.createElement("span");
            span.textContent = originalValues[input.dataset.field];
            span.className = "field";
            span.dataset.field = input.dataset.field;
            input.replaceWith(span);
          });
          editBtn.textContent = "Edit";
          cancelBtn.remove();
          isEditing = false;
        });

      } else {
        // Save changes
        const updatedInfo = {};
        accordionItem.querySelectorAll("input").forEach(input => {
          updatedInfo[input.dataset.field] = input.value.trim();
        });

        fetch(scriptURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ system: "clients", action: "edit", clientID: r[0], clientInfo: updatedInfo })
        })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            showToast("✅ Client updated!", "success");
            search(); // refresh accordion
          } else {
            showToast("❌ Update failed.", "error");
          }
        })
        .catch(() => showToast("❌ Update error.", "error"));
      }
    });

    // Delete functionality
    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      const isDelete = deleteBtn.dataset.buttonState === "delete";
      confirmBtn.classList.toggle("d-none", !isDelete);
      deleteBtn.textContent = isDelete ? "Cancel" : "Delete";
      deleteBtn.dataset.buttonState = isDelete ? "cancel" : "delete";
    });

    confirmBtn.addEventListener("click", async e => {
      e.stopPropagation();
      const clientID = e.currentTarget.dataset.clientid;
      if (!clientID) return showToast("⚠️ Client ID missing", "error");

      try {
        const res = await fetch(scriptURL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ system: "clients", action: "delete", clientID })
        });
        const result = await res.json();
        if (result.success) {
          showToast("✅ Client deleted!", "success");
          search();
        } else showToast("⚠️ Could not delete client.", "error");
      } catch {
        showToast("⚠️ Error occurred while deleting client.", "error");
      }
    });

    resultsContainer.appendChild(accordionItem);
  });
}
  
// ✅ Populate Edit Form
function populateEditForm(clientID) {
  document.getElementById("edit-clientID").value = clientID;
  document.getElementById("edit-clientID-hidden").value = clientID;
  toggleLoader();

  fetch(scriptURL + `?action=getClientById&clientID=${clientID}`)
    .then(res => res.json())
    .then(client => {
      ["firstName", "lastName", "nickName", "email", "street", "city", "state", "zip"].forEach(field => {
        const el = document.getElementById(`edit-${field}`);
        if (el) el.value = client[field] || "";
      });
    })
    .catch(err => {
      console.error("❌ Error loading client data:", err);
      showToast("❌ Error loading client data!", "error");
    })
    .finally(toggleLoader);
}

// ✅ Save Edited Client
const saveEditBtn = document.getElementById("save-changes");

saveEditBtn?.addEventListener("click", async () => {
  const clientID = document.getElementById("edit-clientID").value.trim();
  if (!clientID) return showToast("❌ Phone number is missing.", "error");

  const clientInfo = ["firstName", "lastName", "nickName", "email", "street", "city", "state", "zip"].reduce((info, field) => {
    info[field] = document.getElementById("edit-" + field).value.trim();
    return info;
  }, {});

  if (!clientInfo.firstName || !clientInfo.lastName || !clientInfo.email)
    return showToast("❌ First Name, Last Name, and Email are required.", "error");

  toggleLoader();

  try {
    const response = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "clients", action: "edit", clientID, clientInfo })
    });

    const result = await response.json();
    if (result.success) {
      showToast("✅ Client updated!", "success");
      document.getElementById("searchInput").value = "";
      document.getElementById("searchResults").innerHTML = "";
      setDataForSearch();
      document.querySelector('[data-bs-target="#tab-search"]')?.click();
    } else {
      showToast("❌ Failed to update.", "error");
    }
  } catch (err) {
    showToast("❌ Update error.", "error");
  } finally {
    toggleLoader();
  }
  window.scrollTo(0, 0);
});

// ✅ Add New Client
const addClientForm = document.getElementById("addClientForm");

addClientForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const clientInfo = ["clientID", "firstName", "lastName", "nickName", "email", "street", "city", "state", "zip"].reduce((info, field) => {
    info[field] = document.getElementById(field).value.trim();
    return info;
  }, {});

  if (!clientInfo.clientID || !clientInfo.firstName || !clientInfo.lastName) // Add this is you want to make email required " || !clientInfo.email"
    return showToast("❌ Missing required fields.", "error");

  toggleLoader();

  try {
    const response = await fetch(scriptURL + "?action=add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "clients", action: "add", clientID: clientInfo.clientID, clientInfo })
    });

    const result = await response.json();
    if (result.success) {
      showToast("✅ Client added!");
      addClientForm.reset();
      setDataForSearch();
      new bootstrap.Tab(document.querySelector('[data-bs-target="#tab-search"]')).show();
    } else {
      showToast("❌ Add failed.", "error");
    }
  } catch (err) {
    showToast("❌ Add error.", "error");
  } finally {
    toggleLoader();
  }
});

window.simulateIframeError = function() {
  throw new Error("Simulated iframe error");
};

function boom() {
  throw new Error("Simulated iframe error");
}
window.boom = boom;
