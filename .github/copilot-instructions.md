# Copilot / AI agent instructions — CML-Live

This file contains concise, project-specific guidance for automated code edits and PRs. Follow these notes when making changes so behavior remains consistent.

## Big picture
- Project: static admin UI (HTML/CSS/JS) served with optional Netlify Functions in `netlify/functions/`.
- Frontend is plain JS (no build tool). Scripts are loaded from HTML and `config.js` sets runtime globals like `scriptURL`.
- Backend API is reached by fetch calls to `scriptURL` (query param `action` or POST JSON). Example: `fetch(`${scriptURL}?action=getProdDataForSearch`)` or POST body `{ system: 'products', action: 'edit', ... }`.

## Key files & patterns to read first
- `config.js` — global helpers: `scriptURL`, `toggleLoader()`, `showToast()`, `formatCurrency()`, `loadScripts()` and dropdown loaders. Many pages rely on these helpers.
- `productmanager.js` — complex UI logic: product list rendering, templates (`rowTemplate`, `partRowTemplate`), data-shapes, edit/save/delete flows, `addPartRow()`, `recalculateTotals()`, `enableEditToggle()` and `setupAddProductForm()`.
- `netlify/functions/leadProxy.js` — server-side handler used in production (called as `/.netlify/functions/leadProxy`).
- HTML files (e.g., `productmanager.html`) — contain templates and IDs referenced by JS (accordion templates, datalists, form IDs). JS relies on exact IDs/classes.

## Important runtime conventions
- scriptURL switching: `global.js` sets `scriptURL` depending on hostname. Do not change its shape (string path) unless you update all fetch usage. Note: production path is `/.netlify/functions/leadProxy`.
- Data from backend is often a 2D array of columns. `productmanager.js` parses rows like:
  - product row: index mapping used in `loadProducts()` — prodID = row[0], name=row[1], parts JSON in row[4], cost=row[6], retail=row[7], lastUpdated=row[8].
  - material row: `loadMaterialData()` expects row[0]=id, row[1]=name, row[6]=supplierUrl, row[7]=unitPrice, row[8]=onHand.
- Parts are stored as JSON in product rows (string in column 4). Parts objects use `{ matName, qty }`.

## DOM / selector conventions (do not rename casually)
- Common IDs in `productmanager.js` are listed in the `SELECTORS` object: `searchInput`, `productSearchResults`, `rowTemplate`, `partRowTemplate`, `addProductForm`, `part-rows`, etc. JS expects those exact IDs.
- Templates: HTML `<template id="rowTemplate">` and `<template id="partRowTemplate">` are cloned by JS. Changing structure requires updating the JS that queries inner selectors (e.g., `.part-input`, `.qty-input`).

## Backend contract and payload shapes
- Query endpoints: `?action=getProdDataForSearch`, `?action=getMatDataForSearch`, `?action=dropdownLists`, `?action=versionCheck`.
- POST payloads: JSON body uses `{ system: 'products', action: 'add'|'edit'|'delete', ... }` for product mutations. Keep the `system`/`action` shape when editing backend calls.

## UI behavior & business rules worth preserving
- Rounding: `roundUpToStep(value, step=0.05)` is used for unit price rounding. If changing, update all callers (pricing and totals).
- maxParts constant (`maxParts = 15`) limits parts per product. Update cautiously and keep validation both client/server-side.
- calculateInStock(product) computes how many products can be built from `material.onHand` and `part.qty`. It returns 0 when materials missing.

## Safe edit checklist for PRs
1. Search for selector/ID changes across HTML and JS (they must match). Use the `SELECTORS` object in `productmanager.js` as the canonical list.
2. When changing API shape, update `netlify/functions/leadProxy.js` and any Google Script endpoints consistently (watch `scriptURL`).
3. Keep user-facing text and currency formatting via `formatCurrency()` in `config.js`.
4. Run pages in browser (open `productmanager.html`) to manual smoke-test interactive flows: add product, edit, delete, open parts modal.

## Examples (use these references in edits)
- To parse materials: see `loadMaterialData()` in `productmanager.js` (columns usage and `datalist` population id `row-parts-selector`).
- To add a part row programmatically: `addPartRow(partsContainer, name, qty, cost, retail, isAddCard, editingRow)`.
- To update totals visually: call `recalculateTotals(partsContainer)` after DOM changes.

## When to ask the maintainer
- Any change to `scriptURL` logic, API `action` names, or the data column ordering.
- Any change to template IDs or the HTML structure inside templates.

If anything above is unclear or you want examples added (e.g., a small local run guide for Netlify Dev), tell me what you'd like clarified and I'll update this file.
