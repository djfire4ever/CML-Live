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
    const searchInput = document.getElementById("searchInput").value.toLowerCase().trim();
    const searchResultsBox = document.getElementById("searchResults");
    const searchWords = searchInput.split(/\s+/);
    const searchColumns = [0, 1, 2, 3];
    const resultsArray = searchInput === "" ? [] : data.filter(r =>
      searchWords.every(word =>
        searchColumns.some(i => r[i].toString().toLowerCase().includes(word))
      )
    );
  
    const searchCounter = document.getElementById("searchCounter");
    const totalCounter = document.getElementById("totalCounter");
  
    if (searchCounter) {
      if (searchInput === "") {
        searchCounter.style.display = "none";
      } else {
        searchCounter.textContent = `${resultsArray.length} Clients Found`;
        searchCounter.style.display = "inline-block";
      }
    }
  
    if (searchResultsBox) {
      searchResultsBox.innerHTML = "";
      totalCounter.textContent = `${data.length} Total Clients`;
  
      if (resultsArray.length === 0) {
        searchCounter.textContent = "🔍";
      } else {
        resultsArray.forEach(r => {
          const row = document.getElementById("rowTemplate").content.cloneNode(true);
          const tr = row.querySelector("tr");
          tr.querySelector(".clientID").textContent = r[0];
          tr.querySelector(".firstName").textContent = r[1];
          tr.querySelector(".lastName").textContent = r[2];
          tr.querySelector(".nickName").textContent = r[3];
          tr.dataset.clientid = r[0];
  
          const deleteBtn = tr.querySelector(".before-delete-button");
          const confirmBtn = tr.querySelector(".delete-button");
  
          deleteBtn.dataset.clientid = r[0];
          confirmBtn.dataset.clientid = r[0];
  
          tr.addEventListener("click", async () => {
            // toggleLoader(true);
            await populateEditForm(r[0]);
            new bootstrap.Tab(document.querySelector('[data-bs-target="#tab-edit"]')).show();
            // toggleLoader(false);
          });
  
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
  
            // toggleLoader(true);
            try {
              const res = await fetch(scriptURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ system: "clients", action: "delete", clientID })
              });
              const result = await res.json();
              if (result.success) {
                showToast("✅ Client deleted!", "success");
                document.getElementById("searchInput").value = "";
                searchResultsBox.innerHTML = "";
                await setDataForSearch();
              } else showToast("⚠️ Could not delete client.", "error");
            } catch {
              showToast("⚠️ Error occurred while deleting client.", "error");
            } finally {
              // toggleLoader(false);
            }
          });
  
          searchResultsBox.appendChild(tr);
        });
      }
    }
    // toggleLoader(false);
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
