// qm-modules/slide1-client.js
import { notifyDrawer } from "./drawers.js";

let clientData = [];
const SKIP_CLIENT_FETCH = true; // toggle to false for real fetch

const TIERS = {
  New:      { iconBgColor: "success" },
  Silver:   { iconBgColor: "secondary" },
  Gold:     { iconBgColor: "warning" },
  Platinum: { iconBgColor: "primary" }
};

const getTierData = tier => TIERS[tier] || TIERS.New;

function populateClientFields(client) {
  const setText = (selector, value) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = value || "";
  };

  if (!client) {
    ["firstName","nickName","lastName","tier","email","street","city","state","zip","memberSince","birthday"].forEach(s => setText(`.${s}`, ""));
    setText(".tier", "New");
    return;
  }

  setText(".firstName", client.firstName);
  setText(".nickName", client.nickName);
  setText(".lastName", client.lastName);
  setText(".tier", client.tier);

  // Update tier icon
  const tierData = getTierData(client?.tier || "New");
  const iconBg = document.querySelector(".tier-icon-bg");
  if (iconBg) {
    iconBg.className = `bi bi-award tier-icon-bg position-absolute text-${tierData.iconBgColor}`;
    iconBg.style.pointerEvents = "none";
  }

  setText(".email", client.email);
  setText(".street", client.street);
  setText(".city", client.city);
  setText(".state", client.state);
  setText(".zip", client.zip);
  setText(".memberSince", client.memberSince ? formatDateForUser(client.memberSince) : "");
  setText(".birthday", client.birthday ? formatDateForUser(client.birthday) : "");
}

async function loadClients(scriptURL) {
  toggleLoader(true, { message: "Loading clients..." });
  try {
    let data;
    if (SKIP_CLIENT_FETCH) {
      data = [
        { clientID: "1234567890", firstName: "Test", lastName: "User", nickName: "Tester", tier: "New", email: "test@example.com", street: "123 Main St", city: "Anytown", state: "NY", zip: "10001", memberSince: "2023-01-01", birthday: "1990-01-01", raw: { balance: 0 } },
        { clientID: "2345678901", firstName: "Thomas", lastName: "Jefferson", nickName: "TJ", tier: "Gold", email: "thomas.jefferson@example.com", street: "456 Elm St", city: "Charlottesville", state: "VA", zip: "22903", memberSince: "2022-07-04", birthday: "1743-04-13", raw: { balance: 0 } },
        { clientID: "3456789012", firstName: "Alexander", lastName: "Hamilton", nickName: "Alex", tier: "Silver", email: "alex.hamilton@example.com", street: "789 Oak St", city: "New York", state: "NY", zip: "10004", memberSince: "2022-01-11", birthday: "1755-01-11", raw: { balance: 0 } },
        { clientID: "4567890123", firstName: "King", lastName: "George", nickName: "KG", tier: "Platinum", email: "king.george@example.com", street: "10 Downing St", city: "London", state: "UK", zip: "SW1A 2AA", memberSince: "1714-10-25", birthday: "1683-06-04", raw: { balance: 0 } }
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

export async function initSlide1Client(currentQuote, scriptURL) {
  await loadClients(scriptURL);

  const input = document.querySelector(".clientID-input");
  if (input) {
    input.focus();
    input.select();
  }
  const suggestions = document.querySelector(".client-suggestions");
  if (!input || !suggestions) return;

  // 🔥 NEW — handle built-in browser "X" clear button + fix suggestion clearing
  input.addEventListener("input", () => {

    // (2) User clicked the native search input "X"
    if (input.value === "") {
      suggestions.innerHTML = "";
      suggestions.style.display = "none";
      populateClientFields(null);
      return;
    }

    const query = input.value.trim().toLowerCase();

    // (3) FIXED buggy clear case
    if (!query) {
      suggestions.innerHTML = "";
      suggestions.style.display = "none";
      return;
    }

    const matches = clientData.filter(c =>
      [c.clientID, c.firstName, c.lastName, c.nickName]
      .some(f => String(f||"").toLowerCase().includes(query))
    );

    if (!matches.length) {
      suggestions.innerHTML = "";
      suggestions.style.display = "none";
      return;
    }

    suggestions.innerHTML = matches.map(c =>
      `<li class="list-group-item" data-id="${c.clientID}">${c.firstName} ${c.lastName} (${c.clientID})</li>`
    ).join("");

    suggestions.style.display = "block";
  });

  // Click suggestion
  suggestions.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;

    const client = clientData.find(c => String(c.clientID) === String(li.dataset.id));
    if (!client) return;

    populateClientFields(client);
    input.value = `${client.firstName} ${client.lastName}`;

    Object.assign(currentQuote, {
      clientID: client.clientID,
      firstName: client.firstName,
      lastName: client.lastName,
      clientName: `${client.firstName} ${client.lastName}`,
      email: client.email,
      tier: client.tier,
      street: client.street,
      city: client.city,
      state: client.state,
      zip: client.zip,
      memberSince: client.memberSince,
      birthday: client.birthday
    });

    // Progress tracking
    const stepsData = window.stepsData;
    if (stepsData && stepsData.slides) {
      const slideEl = input.closest('.carousel-item');
      if (slideEl) {
        const idx = Array.from(stepsData.slides).indexOf(slideEl);
        if (idx >= 0) stepsData.slideFilled[idx] = true;
      }
      if (typeof stepsData.updateProgress === 'function') stepsData.updateProgress();
    }

    notifyDrawer("quoteSummaryDrawer", {
      name: currentQuote.clientName,
      clientID: currentQuote.clientID,
      tier: currentQuote.tier
    });

    suggestions.style.display = "none";
    showToast(`Loaded client: ${currentQuote.clientName}`, "info");
  });

  // Hide suggestions when clicking elsewhere
  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.style.display = "none";
    }
  });
}
