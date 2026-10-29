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

  // Tag rules
  ACT["cc-tag-new"] = () => {
    runtime.modal("Add Script Tag Rule", "Configure dynamic tag blocking", `
      <div class="field"><label>Host Domain</label><input id="cc-tag-host" type="text" placeholder="analytics.example.com"></div>
      <div class="field"><label>Script URL Pattern</label><input id="cc-tag-src" type="text" placeholder="https://analytics.example.com/track.js"></div>
      <div class="field">
        <label>Consent Category</label>
        <select id="cc-tag-cat">
          ${state.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
        </select>
      </div>
    `, `<button class="btn" data-act="close">Cancel</button><button class="btn t" data-act="cc-tag-save-new">Add Tag</button>`);
  };
  ACT["cc-tag-save-new"] = async (_arg, element) => {
    const host = readDialogField(element, "#cc-tag-host")?.trim();
    if (!host) { runtime.toast("Host is required"); return; }
    const newTag = {
      name: host,
      host,
      source: readDialogField(element, "#cc-tag-src")?.trim() || `https://${host}/script.js`,
      type: "JavaScript",
      category: readDialogField(element, "#cc-tag-cat") || "analytics",
      status: "Enabled",
    };
    try {
      const created = await cookieApi.createTag(newTag);
      state.blockedTags.push(created);
      runtime.closeOv();
      runtime.toast(`Tag rule for ${host} added to MongoDB`);
      runtime.render();
    } catch (err) {
      runtime.toast(`Failed to save tag rule: ${err.message}`);
    }
  };
  ACT["cc-tag-edit"] = id => {
    const tag = state.blockedTags.find(item => item.id === id);
    if (!tag) return;
    const body = `
      <div class="field"><label for="cc-edit-tag-host">Host Domain</label><input id="cc-edit-tag-host" type="text" value="${safe(tag.host)}"></div>
      <div class="field"><label for="cc-edit-tag-source">Script URL Pattern</label><input id="cc-edit-tag-source" type="text" value="${safe(tag.source)}"></div>
      <div class="field">
        <label for="cc-edit-tag-category">Consent Category</label>
        <select id="cc-edit-tag-category">
          ${state.categories.map(category => `<option value="${safe(category.id)}" ${tag.category === category.id ? "selected" : ""}>${safe(category.name)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="cc-edit-tag-status">Rule Status</label>
        <select id="cc-edit-tag-status">
          <option value="Enabled" ${tag.status === "Enabled" ? "selected" : ""}>Enabled</option>
          <option value="Disabled" ${tag.status === "Disabled" ? "selected" : ""}>Disabled</option>
        </select>
      </div>
    `;
    runtime.modal("Edit Script Tag Rule", "Update dynamic tag blocking rule", body, `
      <button class="btn" data-act="close">Cancel</button>
      <button class="btn t" data-act="cc-tag-save-edit" data-arg="${safe(tag.id)}">Save Changes</button>
    `);
  };
  ACT["cc-tag-save-edit"] = async (id, element) => {
    const tag = state.blockedTags.find(item => item.id === id);
    const host = readDialogField(element, "#cc-edit-tag-host")?.trim();
    const source = readDialogField(element, "#cc-edit-tag-source")?.trim();
    if (!tag || !host || !source) {
      runtime.toast("Host and script URL pattern are required");
      return;
    }
    const updates = {
      host,
      source,
      category: readDialogField(element, "#cc-edit-tag-category") || tag.category,
      status: readDialogField(element, "#cc-edit-tag-status") || tag.status,
    };
    try {
      const updated = await cookieApi.updateTag(id, updates);
      Object.assign(tag, updated);
      runtime.closeOv();
      runtime.toast(`Tag rule for ${host} updated in MongoDB`);
      runtime.render();
    } catch (err) {
      runtime.toast(`Failed to update tag rule: ${err.message}`);
    }
  };
  ACT["cc-tag-delete"] = async id => {
    try {
      await cookieApi.deleteTag(id);
      state.blockedTags = state.blockedTags.filter(t => t.id !== id);
      runtime.toast("Tag rule deleted from MongoDB");
      runtime.render();
    } catch (err) {
      runtime.toast(`Failed to delete tag rule: ${err.message}`);
    }
  };
}
