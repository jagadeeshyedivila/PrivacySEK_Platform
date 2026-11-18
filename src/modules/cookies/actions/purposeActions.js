// Cookie purposes: Manage Purposes table, show/hide switch, add and edit.
// Registered after the inventory actions so cc-category-new / cc-category-edit open this form.
import { createPurposeManager } from "../banner/PurposeManager.js";
import { consentModelFlags, normalizePurpose, CONSENT_MODELS } from "../purposeModel.js";

export function registerActions(context, ACT) {
  const { state, ui, runtime, persist, cookieApi } = context;
  const manager = createPurposeManager(context);
  const manageOpen = () => Boolean(document.querySelector(".modal.cc-pm-modal"));

  // Re-opening replaces the search box, so put the caret back where it was
  function openManage() {
    const active = document.activeElement?.id === "cc-pm-search";
    const caret = active ? document.activeElement.selectionStart : null;
    runtime.modal("Manage Purposes", "Cookie purposes shown in the Preference Center",
      manager.renderManageBody(), `<button class="btn sm" data-act="close">Done</button>`, "cc-pm-modal");
    if (active) {
      const input = document.getElementById("cc-pm-search");
      if (input) { input.focus(); try { input.setSelectionRange(caret, caret); } catch { /* search inputs */ } }
    }
  }

  ACT["cc-purposes-manage"] = () => openManage();

  ACT["cc-purpose-search"] = value => {
    ui.ccPurposeSearch = value || "";
    openManage();
  };

  // On: shown in the Preference Center. Off: hidden. Purposes are never deleted.
  ACT["cc-purpose-toggle"] = async id => {
    const purpose = state.categories.find(p => p.id === id);
    if (!purpose || purpose.required) return;
    const showInPref = purpose.showInPref === false;
    const previous = { showInPref: purpose.showInPref, updatedAt: purpose.updatedAt };
    Object.assign(purpose, { showInPref, updatedAt: new Date().toISOString() });
    if (manageOpen()) openManage();
    runtime.render();
    try {
      const saved = await cookieApi.updateCategory(id, { showInPref });
      Object.assign(purpose, normalizePurpose(saved));
      runtime.toast(`${purpose.name} ${showInPref ? "shown in" : "hidden from"} the Preference Center`);
    } catch (err) {
      Object.assign(purpose, previous);
      if (manageOpen()) openManage();
      runtime.render();
      runtime.toast(`Could not update ${purpose.name}: ${err.message}`);
    }
  };

  function openForm(purpose, fromManage) {
    ui.ccPurposeFromManage = Boolean(fromManage);
    const back = fromManage ? "cc-purposes-manage" : "close";
    runtime.modal(
      purpose ? `Edit purpose: ${purpose.name}` : "Add purpose",
      purpose ? purpose.id : "Cookie purpose",
      manager.renderForm(purpose),
      `<button class="btn" data-act="${back}">Cancel</button>
       <button class="btn t" data-act="cc-purpose-save" data-arg="${purpose ? purpose.id : ""}">${purpose ? "Save changes" : "Add purpose"}</button>`,
      "cc-pm-form-modal",
    );
  }

  ACT["cc-category-new"] = arg => openForm(null, arg === "manage");
  ACT["cc-category-edit"] = (id, el) => {
    const purpose = state.categories.find(p => p.id === id);
    if (purpose) openForm(purpose, el?.dataset?.from === "manage" || manageOpen());
  };

  // Keeps the form consistent as the consent model changes: Always Active goes with
  // "Strictly necessary" and is always shown; leaving it switches the basis to Consent and
  // warns when a purpose that was Always Active becomes optional.
  ACT["cc-pf-model-change"] = (model, el) => {
    const form = el?.closest(".cc-pm-form");
    if (!form) return;
    const alwaysActive = model === "always_active";
    const basis = form.querySelector("#cc-pf-basis");
    if (basis) {
      if (alwaysActive) basis.value = "strictly_necessary";
      else if (basis.value === "strictly_necessary") basis.value = "consent";
    }
    const hint = form.querySelector("#cc-pf-model-hint");
    if (hint) hint.textContent = CONSENT_MODELS.find(m => m.id === model)?.hint || "";
    const shown = form.querySelector("#cc-pf-shown");
    if (shown) {
      shown.disabled = alwaysActive;
      if (alwaysActive) shown.checked = true;
    }
    form.querySelector("#cc-pf-shown-note")?.toggleAttribute("hidden", !alwaysActive);
    form.querySelector("#cc-pf-model-warn")?.toggleAttribute("hidden", alwaysActive || form.dataset.wasRequired !== "true");
  };

  const slug = s => String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

  function readForm(el, existing) {
    const dialog = el.closest('[role="dialog"]');
    const val = sel => dialog.querySelector(sel)?.value ?? "";
    const model = val("#cc-pf-model");
    let legalBasis = val("#cc-pf-basis");

    const name = val("#cc-pf-name").trim();
    const description = val("#cc-pf-desc").trim();
    if (!name) return { error: "Give the purpose a name." };
    if (!description) return { error: "Add a description for visitors." };
    if (model === "always_active") legalBasis = "strictly_necessary";
    else if (legalBasis === "strictly_necessary") return { error: "Strictly necessary purposes must be Always Active. Change the consent model or the legal basis." };

    // Only the fields the form shows. Personal data, regions, Consent Mode signals, IAB purposes
    // and sale/share are not edited here, so their stored values (or defaults) are kept.
    const doc = {
      name,
      description,
      ...consentModelFlags(model),
      legalBasis,
      showInPref: model === "always_active" || Boolean(dialog.querySelector("#cc-pf-shown")?.checked),
    };
    if (!existing) {
      doc.id = slug(val("#cc-pf-id")) || slug(name);
      if (!doc.id) return { error: "Use letters or numbers in the name or ID." };
      if (state.categories.some(p => p.id === doc.id)) return { error: `A purpose with the ID "${doc.id}" already exists.` };
    }
    return { doc };
  }

  ACT["cc-purpose-save"] = async (id, el) => {
    const existing = id ? state.categories.find(p => p.id === id) : null;
    const { doc, error } = readForm(el, existing);
    if (error) { runtime.toast(error); return; }
    try {
      if (existing) {
        const saved = await cookieApi.updateCategory(existing.id, doc);
        Object.assign(existing, normalizePurpose(saved));
      } else {
        const saved = await cookieApi.createCategory(doc);
        state.categories.push(normalizePurpose(saved));
        state.visitor.categories[saved.id] = Boolean(saved.required);
      }
    } catch (err) {
      runtime.toast(`Could not save the purpose: ${err.message}`);
      return;
    }
    ui.pcChoices = null; // the Preference Center picks up the new defaults next time it draws
    if (ui.ccPurposeFromManage) openManage(); else runtime.closeOv();
    persist(existing ? `${doc.name} updated` : `${doc.name} added`);
  };
}
