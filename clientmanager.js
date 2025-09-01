// ----- Tier mapping -----
const TIER_MAP = { New: 0, Bronze: 1, Silver: 2, Gold: 3, Platinum: 4 };
const TIER_NAMES = Object.fromEntries(Object.entries(TIER_MAP).map(([name, id]) => [id, name]));
const TIER_COLORS = { New: "secondary", Bronze: "secondary", Silver: "info", Gold: "warning", Platinum: "danger" };
const TIER_ICONS = { New: "🆕", Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎" };
const getTierIcon = tier => TIER_ICONS[tier] || "🏷️";

// ----- Email Templates Allowed -----
const EMAIL_TEMPLATES_ALLOWED_KEYS = ["lead", "thankyou", "promo", "uploadlink"];

document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.getElementById("searchInput");
  const resultsContainer = document.getElementById("clientsSearchResults");
  const addClientForm = document.getElementById("addClientFormAccordion");
  const FIELDS = ["clientID","firstName","lastName","nickName","email","street","city","state","zip","tier"];

  let data = [];
  let activeTierFilter = null;
  let templates = {}; // Loaded from backend

  // Load templates from backend
  async function loadEmailTemplates() {
    toggleLoader(true);
    try {
      const res = await fetch(scriptURL + "?action=getEmailTemplates");
      const tplData = await res.json();
      if (!Array.isArray(tplData)) return;
      templates = {};
      tplData.forEach(t => templates[t.type] = { subject: t.subject, body: t.body });
    } catch (err) {
      console.error(err);
      showToast("❌ Error loading email templates", "error");
    } finally {
      toggleLoader(false);
    }
  }

  // Clear Tier Filter
  document.getElementById("clearTierFilterBtn")?.addEventListener("click", () => {
    activeTierFilter = null;
    window.location.hash = "";
    renderResults();
  });

  await Promise.all([loadClients(), loadEmailTemplates()]);

  searchInput?.addEventListener("input", renderResults);
  addClientForm?.addEventListener("submit", addClient);
  document.getElementById("addCancelBtn")?.addEventListener("click", () => addClientForm.reset());

  // ---- Load clients ----
  async function loadClients() {
    toggleLoader(true);
    try {
      const res = await fetch(scriptURL + "?action=getDataForSearch");
      data = await res.json();
      const hash = window.location.hash;
      if (hash.startsWith("#tier=")) activeTierFilter = decodeURIComponent(hash.replace("#tier=", ""));
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

    let results = val || activeTierFilter ? [...data] : [];

    if (activeTierFilter) results = results.filter(r => (r[10] || "New") === activeTierFilter);
    if (val) results = results.filter(r => words.every(w => [0,1,2,3,10].some(i => r[i].toString().toLowerCase().includes(w))));

    document.getElementById("searchCounter").textContent = results.length;
    document.getElementById("totalCounter").textContent = data.length;

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
      collapseEl.addEventListener("shown.bs.collapse", () => item.scrollIntoView({ behavior: "smooth", block: "center" }));

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

      // Toggle edit mode
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
        const updated = FIELDS.reduce((obj,f) => { obj[f] = item.querySelector(`.${f}-input`).value.trim(); return obj; }, {});
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

      // ---- Email dropdown ----
      const emailMenu = item.querySelector(".email-template-dropdown");
      if (emailMenu && values.email) {
        emailMenu.innerHTML = "";
        EMAIL_TEMPLATES_ALLOWED_KEYS.forEach(key => {
          if (templates[key]) {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.className = "dropdown-item";
            a.href = "#";
            a.textContent = key.charAt(0).toUpperCase() + key.slice(1);
            a.addEventListener("click", e => {
              e.preventDefault();
              openEmailModal(values, templates[key]);
            });
            li.appendChild(a);
            emailMenu.appendChild(li);
          }
        });
      } else if (emailMenu) {
        emailMenu.innerHTML = `<li><span class="dropdown-item text-muted">No email</span></li>`;
      }

      resultsContainer.appendChild(item);
    });
  }
});

// ---- Add client ----
async function addClient(e) {
  e.preventDefault();
  const clientInfo = FIELDS.reduce((obj,f) => ({ ...obj, [f]: document.getElementById(f).value.trim() }), {});
  if (!clientInfo.clientID || !clientInfo.firstName || !clientInfo.lastName) 
    return showToast("❌ Missing required fields", "error");

  toggleLoader(true);
  try {
    const res = await fetch(scriptURL + "?action=add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system: "clients", action: "add", clientID: clientInfo.clientID, clientInfo })
    });
    const result = await res.json();
    showToast(result.success ? "✅ Client added!" : "❌ Add failed", result.success ? "success" : "error");
    if (result.success) addClientForm.reset();
    await loadClients();
  } catch {
    showToast("❌ Add error", "error");
  } finally { toggleLoader(false); }
}

// ---- Open email modal with placeholders replaced ----
function openEmailModal(client, template) {
  const modalEl = document.getElementById("emailModal");
  const modal = new bootstrap.Modal(modalEl);

  // Pre-fill recipient and subject
  document.getElementById("emailTo").value = client.email;
  document.getElementById("emailSubject").value = template.subject;

  // Replace placeholders in body
  let body = template.body;
  Object.keys(client).forEach(key => {
    const re = new RegExp(`{{${key}}}`, "g");
    body = body.replace(re, client[key] || "");
  });

  // Handle upload link placeholder if present
  if (body.includes("{{uploadLink}}")) {
    const uploadLink = `https://cml-live-test.netlify.app/clientuploadform.html?` +
                       `clientID=${encodeURIComponent(client.clientID)}` +
                       `&firstName=${encodeURIComponent(client.firstName)}` +
                       `&lastName=${encodeURIComponent(client.lastName)}` +
                       `&email=${encodeURIComponent(client.email)}`;

    body = body.replace(/{{uploadLink}}/g, uploadLink);
  }

  document.getElementById("emailBody").value = body;
  modal.show();

  // Bind send button
  document.getElementById("sendEmailBtn").onclick = async () => {
    await sendEmail(
      client.email,
      template.subject,
      document.getElementById("emailBody").value,
      modal
    );
  };
}

// ---- Send email ----
async function sendEmail(to, subject, body, modal) {
  toggleLoader(true);
  try {
    const payload = {
      system: "clients",   // matches backend system
      action: "sendEmail", // matches doPost routing
      to,                  // recipient email
      subject,             // email subject
      body                 // email body
    };

    const res = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    showToast(result.success ? "📧 Email sent!" : "❌ Email failed", result.success ? "success" : "error");
    if (result.success) modal?.hide();

  } catch (err) {
    console.error(err);
    showToast("❌ Email send failed", "error");
  } finally {
    toggleLoader(false);
  }
}

