import { notifyDrawer } from "./drawers.js";

let clientData = [];

// --- Toggle to skip fetching clients for testing ---
const SKIP_CLIENT_FETCH = true; // set to false to enable real fetch

// --- Populate client fields in the form ---
function populateClientFields(client) {
  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value || "";
  };

  if (!client) {
    setText(".firstName", "");
    setText(".nickName", "");
    setText(".lastName", "");
    setText(".tier", "New");
    setText(".email", "");
    setText(".street", "");
    setText(".city", "");
    setText(".state", "");
    setText(".zip", "");
    setText(".memberSince", "");
    setText(".birthday", "");
    return;
  }

  setText(".firstName", client.firstName);
  setText(".nickName", client.nickName);
  setText(".lastName", client.lastName);
  setText(".tier", client.tier);
  setText(".email", client.email);
  setText(".street", client.street);
  setText(".city", client.city);
  setText(".state", client.state);
  setText(".zip", client.zip);
  setText(".memberSince", client.memberSince ? formatDateForUser(client.memberSince) : "");
  setText(".birthday", client.birthday ? formatDateForUser(client.birthday) : "");
}

// --- Load client data from server (or skip for testing) ---
async function loadClients(scriptURL) {
  toggleLoader(true, { message: "Loading clients..." });
  try {
    let data;

    if (SKIP_CLIENT_FETCH) {
      data = [
        { clientID: "1234567890", firstName: "Test", lastName: "User", nickName: "Tester", email: "test@example.com", raw: { balance: 0 } },
        { clientID: "2345678901", firstName: "Thomas", lastName: "Jefferson", nickName: "TJ", email: "thomas.jefferson@example.com", raw: { balance: 0 } },
        { clientID: "3456789012", firstName: "Alexander", lastName: "Hamilton", nickName: "Alex", email: "alex.hamilton@example.com", raw: { balance: 0 } },
        { clientID: "4567890123", firstName: "King", lastName: "George", nickName: "KG", email: "king.george@example.com", raw: { balance: 0 } }
      ];
    } else {
      const res = await fetch(`${scriptURL}?action=getDataForSearch`);
      const json = await res.json();
      data = Array.isArray(json) ? json : json.data || [];
    }

    clientData = data.map(r => ({
      clientID: r.clientID || "",
      firstName: r.firstName || "",
      lastName: r.lastName || "",
      nickName: r.nickName || "",
      email: r.email || "",
      street: r.street || "",
      city: r.city || "",
      state: r.state || "",
      zip: r.zip || "",
      tier: r.tier || "New",
      memberSince: r.memberSince || "",
      birthday: r.birthday || "",
      raw: r
    }));

    console.log("➡️ Client data loaded", clientData);
  } catch (err) {
    console.error("❌ Error loading client data:", err);
    clientData = [];
    showToast("⚠️ Failed to load client database", "error");
  } finally {
    toggleLoader(false);
  }
}

// --- Initialize Slide 1 (client search & progress integration) ---
export async function initSlide1Client(scriptURL) {
  await loadClients(scriptURL);

  const input = document.querySelector(".clientID-input");
  const suggestions = document.querySelector(".client-suggestions");
  if (!input || !suggestions) return;

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      suggestions.style.display = "none";
      suggestions.innerHTML = "";
      return;
    }

    const matches = clientData.filter(client =>
      [client.clientID, client.firstName, client.lastName, client.nickName]
        .some(f => String(f || "").toLowerCase().includes(query))
    );

    if (!matches.length) {
      suggestions.style.display = "none";
      suggestions.innerHTML = "";
      return;
    }

    suggestions.innerHTML = matches.map(c =>
      `<li class="list-group-item" data-id="${c.clientID}">
        ${c.firstName} ${c.lastName} (${c.clientID})
      </li>`).join("");
    suggestions.style.display = "block";
  });

  suggestions.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;

    const client = clientData.find(c => String(c.clientID) === String(li.dataset.id));
    if (!client) return;

    populateClientFields(client);
    input.value = `${client.firstName} ${client.lastName}`;

    // Update progress
    const stepsData = window.stepsData;
    if (stepsData && stepsData.slides) {
      const slideEl = input.closest('.carousel-item');
      if (slideEl) {
        const idx = Array.from(stepsData.slides).indexOf(slideEl);
        if (idx >= 0) stepsData.slideFilled[idx] = true;
      }
      if (typeof stepsData.updateProgress === 'function') stepsData.updateProgress();
    }

    // --- Notify summary drawer using unified state ---
    notifyDrawer("summaryDrawer", {
      name: `${client.firstName} ${client.lastName}`,
      clientID: client.clientID,
      email: client.email
    });

    suggestions.style.display = "none";
    showToast(`Loaded client: ${client.firstName} ${client.lastName}`, "info");
  });

  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.style.display = "none";
    }
  });
}
