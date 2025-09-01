// ----- Tier mapping -----
const TIER_MAP = { New: 0, Bronze: 1, Silver: 2, Gold: 3, Platinum: 4 };
const TIER_NAMES = Object.fromEntries(Object.entries(TIER_MAP).map(([name, id]) => [id, name]));

// ----- Tier badge colors -----
const TIER_COLORS = { New: "secondary", Bronze: "secondary", Silver: "info", Gold: "warning", Platinum: "danger" };

// ----- Tier icon mapping -----
const TIER_ICONS = { New: "🆕", Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎" };

// ----- Function to return icon by tier -----
const getTierIcon = tier => TIER_ICONS[tier] || "🏷️";

document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("searchInput");
  const resultsContainer = document.getElementById("clientsSearchResults");
  const addClientForm = document.getElementById("addClientFormAccordion");
  const FIELDS = ["clientID","firstName","lastName","nickName","email","street","city","state","zip","tier"];
  
  let data = [];
  let activeTierFilter = null; // Track tier filter from dashboard

  // Clear Tier Filter button
  document.getElementById("clearTierFilterBtn")?.addEventListener("click", () => {
    activeTierFilter = null;
    window.location.hash = "";
    // showToast("📊 Showing all clients", "info");
    renderResults();
  });

  await loadClients();

  searchInput?.addEventListener("input", renderResults);
  addClientForm?.addEventListener("submit", addClient);
  document.getElementById("addCancelBtn")?.addEventListener("click", () => addClientForm.reset());

  // ---- Load clients ----
  async function loadClients() {
    toggleLoader(true);
    try {
      const res = await fetch(scriptURL + "?action=getDataForSearch");
      data = await res.json();

      // Check for tier filter in URL hash
      const hash = window.location.hash;
      if (hash.startsWith("#tier=")) {
        activeTierFilter = decodeURIComponent(hash.replace("#tier=", ""));
        // showToast(`📊 Showing ${activeTierFilter} clients`, "info");
      }

      renderResults();
    } catch (err) {
      console.error(err);
      showToast("⚠️ Failed to load data", "error");
    } finally {
      toggleLoader(false);
    }
  }

  // ---- Render results ----
  function renderResults() {
    const val = searchInput.value.toLowerCase().trim();
    const words = val.split(/\s+/);
    resultsContainer.innerHTML = "";

    // Start with all clients
    let results = val || activeTierFilter ? [...data] : [];

    // Apply tier filter if active
    if (activeTierFilter) {
      results = results.filter(r => (r[10] || "New") === activeTierFilter);
    }

    // Apply search filter
    if (val) {
      results = results.filter(r => 
        words.every(w => [0,1,2,3,10].some(i => r[i].toString().toLowerCase().includes(w)))
      );
    }

    // Update counters
    document.getElementById("searchCounter").textContent = results.length;
    document.getElementById("totalCounter").textContent = data.length;

    // Render each accordion row
    results.forEach(r => {
      const template = document.getElementById("rowTemplate").content.cloneNode(true);
      const item = template.querySelector(".accordion-item");
      const clientID = r[0];

      const headerBtn = item.querySelector(".accordion-button");
      const collapseEl = item.querySelector(".accordion-collapse");
      const headerEl = item.querySelector(".accordion-header");

      headerBtn.setAttribute("data-bs-target", `#collapse-${clientID}`);
      collapseEl.id = `collapse-${clientID}`;
      headerEl.id = `heading-${clientID}`;

      collapseEl.addEventListener("shown.bs.collapse", () => {
        item.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      const values = {
        clientID: r[0], firstName: r[1], lastName: r[2], nickName: r[3],
        email: r[4], street: r[5], city: r[6], state: r[7], zip: r[8],
        tierID: r[9] || 0, tier: r[10] || "New"
      };

      headerBtn.innerHTML = `
        <div class="row w-100 align-items-center">
          <div class="col-2 text-truncate">📞 ${values.clientID || "N/A"}</div>
          <div class="col-8 text-truncate">👤 ${values.firstName} ${values.lastName}</div>
          <div class="col-2 text-end">${getTierIcon(values.tier)}</div>
        </div>
      `;
      if (values.tier !== "New") headerBtn.classList.add(`bg-${TIER_COLORS[values.tier]}`, "text-black");

      FIELDS.forEach(f => {
        const span = item.querySelector(`.${f}`);
        const input = item.querySelector(`.${f}-input`);
        if (span) {
          span.textContent = f === "tier" ? values[f] : values[f] || "";
          if (f === "tier") span.dataset.tierId = values.tierID;
          if (f === "tier") span.className = "tier";
        }
        if (input) input.value = values[f] || "";
      });

      const editBtn = item.querySelector(".edit-button");
      const saveBtn = item.querySelector(".save-button");
      const cancelBtn = item.querySelector(".cancel-button");
      const deleteBtn = item.querySelector(".delete-button");
      const beforeDeleteBtn = item.querySelector(".before-delete-button");
      const tierInput = item.querySelector(".tier-input");

      const toggleEditMode = editing => {
        FIELDS.forEach(f => {
          item.querySelector(`.${f}`)?.classList.toggle("d-none", editing);
          item.querySelector(`.${f}-input`)?.classList.toggle("d-none", !editing);
        });
        [editBtn, saveBtn, cancelBtn, tierInput].forEach(el => 
          el.classList.toggle("d-none", el !== editBtn ? !editing : editing)
        );
      };

      const resetValues = () => {
        FIELDS.forEach(f => {
          item.querySelector(`.${f}`).textContent = values[f] || "";
          item.querySelector(`.${f}-input`).value = values[f] || "";
        });
        tierInput.value = values.tier;
      };

      editBtn.addEventListener("click", () => toggleEditMode(true));
      cancelBtn.addEventListener("click", () => { resetValues(); toggleEditMode(false); });

      saveBtn.addEventListener("click", async () => {
        const updated = FIELDS.reduce((obj,f) => {
          obj[f] = item.querySelector(`.${f}-input`).value.trim();
          return obj;
        }, {});
        const currentTier = tierInput?.value;
        const previousTierID = item.querySelector(".tier").dataset.tierId;
        const tierChanged = currentTier && currentTier !== values.tier;

        toggleLoader(true);
        try {
          const payload = tierChanged 
            ? { system:"clients", action:"updateTier", clientID, newTier: currentTier, changeType:"manual", previousTierID, notes:"Changed via edit mode" }
            : { system:"clients", action:"edit", clientID, clientInfo: updated };
          const res = await fetch(scriptURL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
          const result = await res.json();
          showToast(result.success ? "✅ Client updated!" : "⚠️ Update failed", result.success?"success":"error");
          await loadClients();
        } catch {
          showToast("⚠️ Update failed","error");
        } finally { toggleLoader(false); }
      });

      beforeDeleteBtn.addEventListener("click", () => {
        const isDelete = beforeDeleteBtn.dataset.buttonState === "delete";
        deleteBtn.classList.toggle("d-none", !isDelete);
        beforeDeleteBtn.textContent = isDelete ? "Cancel" : "Delete";
        beforeDeleteBtn.dataset.buttonState = isDelete ? "cancel" : "delete";
      });

      deleteBtn.addEventListener("click", async () => {
        toggleLoader(true);
        try {
          const res = await fetch(scriptURL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({system:"clients", action:"delete", clientID}) });
          const result = await res.json();
          showToast(result.success ? "✅ Client deleted!" : "⚠️ Delete failed", result.success ? "success":"error");
          await loadClients();
        } catch {
          showToast("⚠️ Delete failed","error");
        } finally { toggleLoader(false); }
      });

      resultsContainer.appendChild(item);
    });
  }

  // ---- Add client ----
  async function addClient(e) {
    e.preventDefault();
    const clientInfo = FIELDS.reduce((obj,f) => ({ ...obj, [f]: document.getElementById(f).value.trim() }), {});
    if(!clientInfo.clientID || !clientInfo.firstName || !clientInfo.lastName)
      return showToast("❌ Missing required fields","error");

    toggleLoader(true);
    try {
      const res = await fetch(scriptURL + "?action=add", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({system:"clients", action:"add", clientID: clientInfo.clientID, clientInfo})
      });
      const result = await res.json();
      showToast(result.success ? "✅ Client added!" : "❌ Add failed", result.success?"success":"error");
      if(result.success) addClientForm.reset();
      await loadClients();
    } catch {
      showToast("❌ Add error","error");
    } finally { toggleLoader(false); }
  }

});
