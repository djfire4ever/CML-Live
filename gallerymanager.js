document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("inStockModal");
  const modalHeaderSpan = modal.querySelector("#inStockModalLabel");
  const saveButton = modal.querySelector("#saveGalleryChanges");
  const galleryGrid = modal.querySelector("#galleryGrid");

  let gallerySlots = [];
  let currentProdID = null;
  let currentProductName = "";

  // ===== Helpers =====
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

// ===== Create 8 slots =====
function createSlots() {
  const galleryGrid = document.getElementById("galleryGrid");
  if (!galleryGrid) {
    console.error("Gallery grid element not found in DOM!");
    return;
  }

  galleryGrid.innerHTML = "";
  gallerySlots = [];

  for (let i = 0; i < 8; i++) {
    const slot = document.createElement("div");
    slot.className = "gallery-slot";
    slot.dataset.index = i;

    const imgContainer = document.createElement("div");
    imgContainer.className = "slot-image-container";
    slot.appendChild(imgContainer);

    const buttons = document.createElement("div");
    buttons.className = "slot-buttons";
    slot.appendChild(buttons);

    if (i !== 0) {
      const captionDiv = document.createElement("div");
      captionDiv.className = "slot-caption";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "caption-input";
      input.placeholder = "Caption...";
      captionDiv.appendChild(input);
      slot.appendChild(captionDiv);
    }

    galleryGrid.appendChild(slot);
    gallerySlots.push(slot);
  }
}

// ===== Clear Slot =====
function clearSlot(slot, isThumbnail = false) {
  slot.innerHTML = "";
  slot.classList.remove("empty");

  const imgContainer = document.createElement("div");
  imgContainer.className = "slot-image-container";

  if (isThumbnail) {
    // Badge for thumbnail always
    const badge = document.createElement("span");
    badge.className = "slot-badge";
    badge.textContent = "📌Thumbnail";
    imgContainer.appendChild(badge);

    const noThumb = document.createElement("div");
    noThumb.className = "text-center text-muted no-thumb-text";
    noThumb.textContent = "No Thumbnail";
    imgContainer.appendChild(noThumb);
  } else {
    // Empty placeholder
    slot.classList.add("empty");
    imgContainer.textContent = "+ Add Image";
  }

  slot.appendChild(imgContainer);

  // Buttons (top-right) only for non-thumbnail
  if (!isThumbnail) {
    const buttons = document.createElement("div");
    buttons.className = "slot-buttons";

    const btnStar = document.createElement("button");
    btnStar.type = "button";
    btnStar.className = "btn btn-sm btn-outline-warning set-main";
    btnStar.textContent = "⭐";
    buttons.appendChild(btnStar);

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn btn-sm btn-outline-danger delete-image";
    btnDel.textContent = "🗑";
    buttons.appendChild(btnDel);

    slot.appendChild(buttons);
  }

  // Caption
  const captionDiv = document.createElement("div");
  captionDiv.className = "slot-caption";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Caption...";
  input.className = "caption-input";
  captionDiv.appendChild(input);
  slot.appendChild(captionDiv);

  slot.file = null;
}

// ===== Render Slot =====
function renderSlot(slot, data, index) {
  slot.classList.remove("empty");

  const imgContainer = slot.querySelector(".slot-image-container");
  const buttons = slot.querySelector(".slot-buttons");

  imgContainer.innerHTML = "";
  buttons.innerHTML = "";

  // === Slot 0 (Thumbnail) ===
  if (index === 0) {
    const badge = document.createElement("span");
    badge.className = "slot-badge";
    badge.textContent = "📌Thumbnail";
    imgContainer.appendChild(badge);

    if (data?.url) {
      const img = document.createElement("img");
      img.src = convertGoogleDriveLink(data.url);
      img.alt = "Thumbnail";
      imgContainer.appendChild(img);
    } else {
      slot.classList.add("empty");
      const noThumb = document.createElement("div");
      noThumb.className = "text-center text-muted no-thumb-text";
      noThumb.textContent = "No Thumbnail";
      imgContainer.appendChild(noThumb);
    }

    // DO NOT append caption for slot0
    return;
  }

  // === Slots 1–7 ===
  const captionInput = slot.querySelector(".caption-input");
  captionInput.value = data?.caption || "";

  if (data?.url) {
    const img = document.createElement("img");
    img.src = convertGoogleDriveLink(data.url);
    img.alt = `Gallery image ${index}`;
    imgContainer.appendChild(img);

    // Buttons
    const btnStar = document.createElement("button");
    btnStar.type = "button";
    btnStar.className = "btn btn-sm btn-outline-warning set-main";
    btnStar.textContent = "⭐";
    buttons.appendChild(btnStar);

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "btn btn-sm btn-outline-danger delete-image";
    btnDel.textContent = "🗑";
    buttons.appendChild(btnDel);

  } else {
    slot.classList.add("empty");
    imgContainer.textContent = "+ Add Image";
  }
}

function populateGalleryModal(gallery, prodID, productName) {
  console.log("========================================");
  console.log("📌 populateGalleryModal START");
  console.log("🆔 Product ID:", prodID);
  console.log("🏷️ Product Name:", productName);
  console.log("📥 Raw gallery object:", gallery);

  const modal = document.getElementById("galleryManagerModal");
  const galleryGrid = modal.querySelector(".gallery-grid");

  // Set product name in modal title
  const titleSpan = modal.querySelector("#galleryProductName");
  if (titleSpan) titleSpan.textContent = productName;

  // Clear previous grid
  galleryGrid.innerHTML = "";

  const slots = [];

  // Create 9 slots (0 = thumbnail, 1-8 = images)
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement("div");
    slot.className = "gallery-slot";
    slot.dataset.index = i;

    slots.push(slot);
    galleryGrid.appendChild(slot);
  }

  // --- Slot 0: Thumbnail ---
  const thumbData = gallery.thumbnail || null;
  renderSlot(slots[0], thumbData, 0);

  // --- Slots 1–8: Other images ---
  let imgIndex = 0;
  for (let i = 1; i < 9; i++) {
    const imgData = gallery.images?.[imgIndex] || null;
    renderSlot(slots[i], imgData, i);
    if (imgData) imgIndex++;
  }

  console.log(`✅ Final images count after populate: ${imgIndex}`);
  console.log("🎨 Slots rendered for Product:", prodID, "-", productName);
  console.log("========================================");

  // Show modal
  new bootstrap.Modal(modal).show();

  // Reset on modal close
  modal.addEventListener("hidden.bs.modal", () => {
    slots.forEach((slot, idx) => clearSlot(slot, idx === 0));
  }, { once: true });
}

  // ===== Event Delegation =====
document.addEventListener("DOMContentLoaded", () => {
  // Find the gallery modal explicitly
  const galleryModal = document.getElementById("galleryManagerModal");
  if (!galleryModal) return;

  const galleryGrid = galleryModal.querySelector("#galleryGrid");
  if (!galleryGrid) {
    console.warn("Gallery Grid not found in Gallery Manager Modal!");
    return;
  }

  // Now attach the event listener only to the gallery modal's grid
  galleryGrid.addEventListener("click", (e) => {
    const slot = e.target.closest(".gallery-slot");
    if (!slot) return;

    // Ignore clicks on caption input
    if (e.target.closest(".caption-input")) return;

    // Set Main
    if (e.target.closest(".set-main")) {
      const gallerySlots = Array.from(galleryGrid.querySelectorAll(".gallery-slot"));
      const idx = gallerySlots.indexOf(slot);
      if (idx === 0) return console.warn("⚠️ Cannot set thumbnail as main.");

      // Remove main badge from all other slots
      gallerySlots.forEach((s, i) => {
        if (i === 0 || s === slot) return;
        const mb = s.querySelector(".main-badge");
        if (mb) mb.remove();
      });

      // Add badge to clicked slot if not present
      const box = slot.querySelector(".slot-image-container");
      if (!box.querySelector(".main-badge")) {
        const mainBadge = document.createElement("span");
        mainBadge.className = "slot-badge main-badge";
        mainBadge.textContent = "⭐ Main";
        box.appendChild(mainBadge);
      }
      return;
    }

    // Delete
    if (e.target.closest(".delete-image")) {
      const gallerySlots = Array.from(galleryGrid.querySelectorAll(".gallery-slot"));
      const idx = gallerySlots.indexOf(slot);
      clearSlot(slot, idx === 0);
      return;
    }

    // Open file picker for empty space or image (not main badge)
    if (!e.target.closest(".main-badge")) {
      openFilePickerForSlot(slot);
    }
  });
});

  // ===== File Handling =====
  function openFilePickerForSlot(slot) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file, slot);
    });
  }

  function handleFile(file, slot) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const imgContainer = slot.querySelector(".slot-image-container");
      imgContainer.innerHTML = "";
      const img = document.createElement("img");
      img.src = ev.target.result;
      imgContainer.appendChild(img);

      const idx = gallerySlots.indexOf(slot);
      if (idx !== 0) {
        const buttons = slot.querySelector(".slot-buttons");
        if (!buttons.querySelector(".set-main")) {
          const btnStar = document.createElement("button");
          btnStar.type = "button";
          btnStar.className = "btn btn-sm btn-outline-warning set-main";
          btnStar.textContent = "⭐";
          buttons.appendChild(btnStar);
        }
        if (!buttons.querySelector(".delete-image")) {
          const btnDel = document.createElement("button");
          btnDel.type = "button";
          btnDel.className = "btn btn-sm btn-outline-danger delete-image";
          btnDel.textContent = "🗑";
          buttons.appendChild(btnDel);
        }
      }

      slot.file = file;
    };
    reader.readAsDataURL(file);
  }

  // ===== Collect State =====
  function collectState() {
    return gallerySlots.map((slot, idx) => {
      const img = slot.querySelector(".slot-image-container img");
      const caption = slot.querySelector(".caption-input")?.value || "";
      return {
        file: slot.file || null,
        url: img ? img.src : null,
        caption,
        isThumbnail: idx === 0,
        isMain: idx !== 0 && !!slot.querySelector(".main-badge"),
        sortOrder: idx + 1
      };
    });
  }

if (saveButton) {
  saveButton.addEventListener("click", async () => {
    console.log("========================================");
    console.log("💾 Save Gallery START");
    console.log("🆔 Current Product ID:", currentProdID);
    console.log("🏷️ Current Product Name:", currentProductName);

    if (!currentProdID) {
      console.warn("⚠️ No product selected. Aborting save.");
      return showToast?.("⚠️ No product selected", "warning");
    }

    const state = collectState();
    console.log("📥 Collected gallery state from frontend:", JSON.stringify(state, null, 2));

    const payload = {
      system: "galleries",
      action: "edit",
      prodID: currentProdID,
      productName: currentProductName,
      thumbnail: null,
      images: []
    };

    // ----- Handle Thumbnail (Slot 0) -----
    const thumb = state[0];

    if (thumb.file) {
      // User uploaded a new thumbnail
      payload.thumbnail = {
        fileName: thumb.file.name,
        fileMime: thumb.file.type,
        fileData: await fileToBase64(thumb.file),
        caption: thumb.caption,
        sortOrder: 1,
        isMain: true
      };
      console.log("📌Thumbnail from file:", payload.thumbnail.fileName);

    } else if (thumb.url) {
      // Existing URL from backend (previously saved thumbnail)
      payload.thumbnail = {
        url: thumb.url,
        caption: thumb.caption,
        sortOrder: 1,
        isMain: true
      };
      console.log("📌Thumbnail from URL:", payload.thumbnail.url);

    } else {
      // NO thumbnail—do NOT send anything
      payload.thumbnail = null;
      console.warn("⚠️ No thumbnail selected, slot0 is empty. Nothing will be sent for thumbnail.");
    }

    // ----- Handle Remaining Images (slots 1+) -----
    const otherImgs = await Promise.all(
      state.slice(1).map((img, idx) => {
        if (img.file) {
          return fileToBase64(img.file).then(b64 => ({
            fileName: img.file.name,
            fileMime: img.file.type,
            fileData: b64,
            caption: img.caption,
            sortOrder: idx + 2,
            isMain: img.isMain
          }));
        } else if (img.url) {
          return {
            url: img.url,
            caption: img.caption,
            sortOrder: idx + 2,
            isMain: img.isMain
          };
        }
        console.log(`🕳️ Slot ${idx + 1} is empty, skipping.`);
        return null;
      })
    ).then(arr => arr.filter(Boolean));

    payload.images = otherImgs; // <-- DO NOT push thumbnail again

    console.log("📦 Final payload to send:", JSON.stringify(payload, null, 2));

    // ----- Send Payload -----
    try {
      if (typeof toggleLoader === "function") toggleLoader(true);
      console.log("🌐 Sending payload to backend...");

      const res = await fetch(scriptURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      console.log("📤 Server response:", result);

    if (result.success) {
      console.log("✅ Gallery saved successfully!");
      showToast?.("✅ Gallery saved!", "success");
      if (result.gallery) {
        populateGalleryModal(result.gallery, currentProdID, currentProductName);
      }
    } else {
      console.warn("❌ Save failed:", result.message);
      showToast?.(result.message || "❌ Error saving gallery", "danger");
    }
    } catch (err) {
      console.error("❌ Network / Save error:", err);
      showToast?.("❌ Network error saving gallery", "danger");
    } finally {
      if (typeof toggleLoader === "function") toggleLoader(false);
      console.log("💾 Save Gallery END");
      console.log("========================================");
    }
  });
}

  // ===== Open Gallery Modal =====
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".openGalleryBtn");
    if (!btn) return;

    const productCard = btn.closest(".product-accordion");
    if (!productCard) return;

    currentProdID = productCard.dataset.prodId;
    currentProductName =
      productCard.querySelector(".productName-input")?.value ||
      productCard.querySelector(".productName-header")?.textContent ||
      "Unnamed Product";

    openGalleryModal(currentProdID, currentProductName);
  });

// ===== Open Gallery Modal =====
async function openGalleryModal(prodID, productName) {
  currentProdID = prodID;
  currentProductName = productName;

  const modal = document.getElementById("galleryManagerModal");
  if (!modal) {
    console.error("Gallery modal not found in DOM!");
    return;
  }

  const modalHeaderSpan = modal.querySelector(".modal-title span");
  if (modalHeaderSpan) modalHeaderSpan.textContent = productName;

  createSlots(); // Always 8 empty slots

  try {
    toggleLoader(true); // Show loader immediately

    console.log("Fetching gallery for prodID:", prodID);
    const res = await fetch(`${scriptURL}?action=getGalleryByProdId&prodID=${prodID}`);
    const data = await res.json();
    console.log("Raw data from backend:", data);

    const gallery = data?.success ? data.gallery : { thumbnail: null, images: [] };
    console.log("Gallery object used for rendering:", gallery);

    // --- Render thumbnail (slot0) ---
    renderSlot(gallerySlots[0], gallery.thumbnail || null, 0);

    // --- Render remaining images (slots 1–7) ---
    for (let i = 1; i < 8; i++) {
      const imgData = gallery.images?.[i - 1] || null;
      renderSlot(gallerySlots[i], imgData, i);
    }
  } catch (err) {
    console.error("Error fetching gallery:", err);
    gallerySlots.forEach((slot, idx) => renderSlot(slot, null, idx));
    showToast("⚠️ Error loading gallery", "danger");
  } finally {
    toggleLoader(false); // Always hide loader before modal opens
  }

  new bootstrap.Modal(modal).show();

    modal.addEventListener("hidden.bs.modal", () => {
      gallerySlots.forEach((slot, idx) => clearSlot(slot, idx === 0));
      currentProdID = null;
      currentProductName = "";
    });
  }
});

