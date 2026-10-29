export function registerActions(context, ACT) {
  const {
    state, runtime, ui, TOP_TABS, CONFIG_NAV_SECTIONS, REGIONS,
    ALL_LANGUAGES, LANGUAGE_TRANSLATIONS, REGION_COUNTRY_OPTIONS,
    createDefaultBannerConfig, resetCookieDemoState, saveCookieDemoState,
    safe, dateLabel, dateOnly, isoNow, clone, getRelativeTime, getActiveTranslations,
    persist, recordConsent, readDialogField, validateScanSeeds, nextScanScheduleDate, renderers,
    cookieApi,
  } = context;
  const showPublishHistoryModal = renderers.banner.showPublishHistoryModal;

  const reloadInventory = async () => {
    try {
      ui.inventoryLoading = true;
      runtime.render();
      const res = await cookieApi.getInventory({
        page: ui.inventoryPage || 1,
        pageSize: ui.inventoryPageSize || 10,
        search: ui.inventorySearch || "",
        category: ui.inventoryCategory || "all",
        party: ui.inventoryParty || "all",
        sortBy: ui.inventorySortBy || "lastDetected",
        sortOrder: ui.inventorySortOrder || "desc",
        paginate: true,
      });

      if (res && res.cookies) {
        state.inventoryCookies = res.cookies;
        ui.inventoryTotal = res.total;
        if (res.pagination) {
          ui.inventoryPage = res.pagination.page;
          ui.inventoryPageSize = res.pagination.pageSize;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch paginated inventory:", err.message);
    } finally {
      ui.inventoryLoading = false;
      runtime.render();
    }
  };

  // Cookie Inventory Actions
  let inventorySearchTimer = null;
  ACT["cc-search-inventory"] = q => {
    ui.inventorySearch = q;
    ui.inventoryPage = 1;
    state.inventoryCookies = null;
    runtime.render();
    clearTimeout(inventorySearchTimer);
    inventorySearchTimer = setTimeout(() => {
      reloadInventory();
    }, 250);
  };
  ACT["cc-clear-inventory-search"] = () => {
    ui.inventorySearch = "";
    ui.inventoryPage = 1;
    state.inventoryCookies = null;
    runtime.render();
    reloadInventory();
  };
  ACT["cc-filter-category"] = cat => {
    ui.inventoryCategory = cat;
    ui.inventoryPage = 1;
    state.inventoryCookies = null;
    runtime.render();
    reloadInventory();
  };
  ACT["cc-filter-party"] = party => {
    ui.inventoryParty = party;
    ui.inventoryPage = 1;
    state.inventoryCookies = null;
    runtime.render();
    reloadInventory();
  };
  ACT["cc-inventory-sort"] = col => {
    if (ui.inventorySortBy === col) {
      ui.inventorySortOrder = ui.inventorySortOrder === "asc" ? "desc" : "asc";
    } else {
      ui.inventorySortBy = col;
      ui.inventorySortOrder = "asc";
    }
    ui.inventoryPage = 1;
    state.inventoryCookies = null;
    runtime.render();
    reloadInventory();
  };
  ACT["cc-inventory-page"] = p => {
    ui.inventoryPage = Math.max(1, Number(p) || 1);
    reloadInventory();
  };
  ACT["cc-inventory-page-size"] = s => {
    ui.inventoryPageSize = Math.max(1, Number(s) || 10);
    ui.inventoryPage = 1;
    reloadInventory();
  };
  ACT["cc-inventory-reset-filters"] = () => {
    ui.inventorySearch = "";
    ui.inventoryCategory = "all";
    ui.inventoryParty = "all";
    ui.inventoryPage = 1;
    reloadInventory();
  };
  ACT["cc-cookie-new"] = () => {
    const body = `
      <div class="g g2">
        <div class="field"><label>Cookie Name</label><input id="cc-ck-name" type="text" placeholder="_new_cookie"></div>
        <div class="field"><label>Domain</label><input id="cc-ck-domain" type="text" value="demo.privacysek.example"></div>
        <div class="field"><label>Provider</label><input id="cc-ck-provider" type="text" placeholder="PrivacySEK"></div>
        <div class="field">
          <label>Category</label>
          <select id="cc-ck-category">
            ${state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Party</label>
          <select id="cc-ck-party">
            <option value="First-party">First-party</option>
            <option value="Third-party">Third-party</option>
          </select>
        </div>
        <div class="field"><label>Duration</label><input id="cc-ck-duration" type="text" value="12 months"></div>
      </div>
      <div class="field" style="margin-top:8px;">
        <label>Description / Purpose</label>
        <textarea id="cc-ck-desc" rows="2" placeholder="Explain what this cookie does..."></textarea>
      </div>
    `;
    runtime.modal("Add New Cookie to Inventory", "Register custom cookie definition", body, `
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn t" data-act="cc-cookie-save-new">Save Cookie</button>
    `);
  };
  ACT["cc-cookie-save-new"] = async (_arg, element) => {
    const name = readDialogField(element, "#cc-ck-name")?.trim();
    if (!name) { runtime.toast("Cookie name is required"); return; }
    const newCookie = {
      name,
      domain: readDialogField(element, "#cc-ck-domain") || "demo.privacysek.example",
      provider: readDialogField(element, "#cc-ck-provider") || "Internal",
      category: readDialogField(element, "#cc-ck-category") || "functional",
      party: readDialogField(element, "#cc-ck-party") || "First-party",
      duration: readDialogField(element, "#cc-ck-duration") || "Session",
      description: readDialogField(element, "#cc-ck-desc") || "User-defined cookie",
      secure: true,
      httpOnly: false,
    };
    try {
      const created = await cookieApi.createCookie(newCookie);
      state.cookies.unshift(created);
      runtime.closeOv();
      runtime.toast(`Cookie ${name} added to inventory`);
      await reloadInventory();
    } catch (err) {
      runtime.toast(`Failed to save cookie: ${err.message}`);
    }
  };
  ACT["cc-cookie-delete"] = async id => {
    try {
      await cookieApi.deleteCookie(id);
      state.cookies = state.cookies.filter(c => c.id !== id);
      runtime.toast("Cookie removed from inventory");
      await reloadInventory();
    } catch (err) {
      runtime.toast(`Failed to delete cookie: ${err.message}`);
    }
  };
  ACT["cc-cookie-edit"] = id => {
    const cookie = state.cookies.find(item => item.id === id);
    if (!cookie) return;
    const body = `
      <div class="g g2">
        <div class="field"><label for="cc-edit-cookie-name">Cookie Name</label><input id="cc-edit-cookie-name" type="text" value="${safe(cookie.name)}"></div>
        <div class="field"><label for="cc-edit-cookie-domain">Domain</label><input id="cc-edit-cookie-domain" type="text" value="${safe(cookie.domain)}"></div>
        <div class="field"><label for="cc-edit-cookie-provider">Provider</label><input id="cc-edit-cookie-provider" type="text" value="${safe(cookie.provider)}"></div>
        <div class="field">
          <label for="cc-edit-cookie-category">Category</label>
          <select id="cc-edit-cookie-category">
            ${state.categories.map(category => `<option value="${safe(category.id)}" ${cookie.category === category.id ? "selected" : ""}>${safe(category.name)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label for="cc-edit-cookie-party">Party</label>
          <select id="cc-edit-cookie-party">
            <option value="First-party" ${cookie.party === "First-party" ? "selected" : ""}>First-party</option>
            <option value="Third-party" ${cookie.party === "Third-party" ? "selected" : ""}>Third-party</option>
          </select>
        </div>
        <div class="field"><label for="cc-edit-cookie-duration">Duration</label><input id="cc-edit-cookie-duration" type="text" value="${safe(cookie.duration)}"></div>
      </div>
      <div class="field" style="margin-top:8px;">
        <label for="cc-edit-cookie-desc">Description / Purpose</label>
        <textarea id="cc-edit-cookie-desc" rows="2">${safe(cookie.description)}</textarea>
      </div>
    `;
    runtime.modal(`Edit Cookie: ${safe(cookie.name)}`, "Update cookie inventory record", body, `
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn t" data-act="cc-cookie-save-edit" data-arg="${safe(cookie.id)}">Save Changes</button>
    `);
  };
  ACT["cc-cookie-save-edit"] = async (id, element) => {
    const cookie = state.cookies.find(item => item.id === id);
    const name = readDialogField(element, "#cc-edit-cookie-name")?.trim();
    const domain = readDialogField(element, "#cc-edit-cookie-domain")?.trim();
    const provider = readDialogField(element, "#cc-edit-cookie-provider")?.trim();
    if (!cookie) return;
    if (!name || !domain || !provider) {
      runtime.toast("Cookie name, domain, and provider are required");
      return;
    }
    const updates = {
      name,
      domain,
      provider,
      category: readDialogField(element, "#cc-edit-cookie-category") || cookie.category,
      party: readDialogField(element, "#cc-edit-cookie-party") || cookie.party,
      duration: readDialogField(element, "#cc-edit-cookie-duration")?.trim() || "",
      description: readDialogField(element, "#cc-edit-cookie-desc")?.trim() || "",
    };
    try {
      const updated = await cookieApi.updateCookie(id, updates);
      Object.assign(cookie, updated);
      runtime.closeOv();
      runtime.toast(`Cookie ${name} updated`);
      await reloadInventory();
    } catch (err) {
      runtime.toast(`Failed to update cookie: ${err.message}`);
    }
  };

  // Category new & edit
  ACT["cc-category-new"] = () => {
    const body = `
      <div class="field"><label>Category ID (lowercase)</label><input id="cc-new-cat-id" type="text" placeholder="marketing"></div>
      <div class="field"><label>Category Name</label><input id="cc-new-cat-name" type="text" placeholder="Marketing & Campaigns"></div>
      <div class="field"><label>Description</label><textarea id="cc-new-cat-desc" rows="3" placeholder="Describe the purpose of this category..."></textarea></div>
    `;
    runtime.modal("Add Cookie Category / Purpose", "Create new classification purpose", body, `
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn t" data-act="cc-confirm-category-new">Save Purpose</button>
    `);
  };
  ACT["cc-confirm-category-new"] = (_arg, element) => {
    const id = readDialogField(element, "#cc-new-cat-id")?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const name = readDialogField(element, "#cc-new-cat-name")?.trim();
    const desc = readDialogField(element, "#cc-new-cat-desc")?.trim();
    if (!id || !name) { runtime.toast("Category ID and Name are required"); return; }
    state.categories.push({ id, name, description: desc || name, required: false, defaultState: false, showInPref: true });
    state.visitor.categories[id] = false;
    runtime.closeOv();
    persist(`Category ${name} created`);
  };
  ACT["cc-category-delete"] = id => {
    state.categories = state.categories.filter(c => c.id !== id);
    delete state.visitor.categories[id];
    persist("Category removed");
  };
  ACT["cc-category-edit"] = id => {
    const category = state.categories.find(item => item.id === id);
    if (!category || category.required) return;
    const body = `
      <div class="field"><label for="cc-edit-category-name">Category Name</label><input id="cc-edit-category-name" type="text" value="${safe(category.name)}"></div>
      <div class="field"><label for="cc-edit-category-description">Description</label><textarea id="cc-edit-category-description" rows="3">${safe(category.description)}</textarea></div>
      <div class="field">
        <label for="cc-edit-category-default">Default Preference</label>
        <select id="cc-edit-category-default">
          <option value="false" ${category.defaultState ? "" : "selected"}>Opt-Out (Off until consent)</option>
          <option value="true" ${category.defaultState ? "selected" : ""}>Opt-In (On by default)</option>
        </select>
      </div>
    `;
    runtime.modal(`Edit ${safe(category.name)} Purpose`, "Update preference center category", body, `
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn t" data-act="cc-category-save-edit" data-arg="${safe(category.id)}">Save Changes</button>
    `);
  };
  ACT["cc-category-save-edit"] = (id, element) => {
    const category = state.categories.find(item => item.id === id);
    const name = readDialogField(element, "#cc-edit-category-name")?.trim();
    if (!category) return;
    if (category.required) {
      runtime.toast("Required categories cannot be edited");
      return;
    }
    if (!name) {
      runtime.toast("A category name is required");
      return;
    }
    category.name = name;
    category.description = readDialogField(element, "#cc-edit-category-description")?.trim() || "";
    category.defaultState = readDialogField(element, "#cc-edit-category-default") === "true";
    runtime.closeOv();
    persist(`Category ${name} updated`);
  };


}
