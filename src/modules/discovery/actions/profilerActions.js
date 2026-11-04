export function registerProfilerActions(context, ACT) {
  const { $, closeOv, esc, ledgerAdd, modal, render, toast, ui } = context;

  ACT["dd-set-profilers-subtab"] = function(tab) {
    ui.profilersSubTab = tab;
    render();
  };

  ACT["dd-profilers-search"] = function(val) {
    ui.profilersSearch = val || "";
    render();
  };

  ACT["dd-profilers-clear-search"] = function() {
    ui.profilersSearch = "";
    render();
  };

  ACT["dd-view-recognizers"] = function(name) {
    ui.activeProfiler = name;
    ui.recognizerRiskFilter = "";
    ui.recognizerSearch = "";
    render();
  };

  ACT["dd-close-recognizers"] = function() {
    ui.activeProfiler = null;
    render();
  };

  ACT["dd-filter-recognizer-risk"] = function(risk) {
    ui.recognizerRiskFilter = risk || "";
    render();
  };

  ACT["dd-recognizer-search"] = function(val) {
    ui.recognizerSearch = val || "";
    render();
  };

  ACT["dd-recognizer-clear-search"] = function() {
    ui.recognizerSearch = "";
    render();
  };

  ACT["dd-recognizer-reset-filters"] = function() {
    ui.recognizerRiskFilter = "";
    ui.recognizerSearch = "";
    render();
  };

  // Custom profiler creation state
  let customFormState = { name: "", selected: {} };

  function renderCustomProfilerModal(errorMessage = "") {
    const store = context.getStore();
    const defaults = store.profilers || [];
    const selectedList = defaults.filter(p => customFormState.selected[p.n]);
    const totalRecognizers = selectedList.reduce((sum, p) => sum + (p.rec?.length || 0), 0);

    const bodyHtml = `
      <div id="dd-custom-prof-err" class="dd-form-error" style="margin-bottom:12px">${esc(errorMessage)}</div>

      <div class="dd-form-group">
        <label class="dd-form-label required" for="dd_cp_name">Profiler Name</label>
        <input
          id="dd_cp_name"
          class="dd-form-input"
          type="text"
          placeholder="e.g. Retail Lending Onboarding Profiler"
          value="${esc(customFormState.name)}"
          data-input-act="dd-custom-prof-name"
        />
        <div class="dd-form-hint">Unique business name for this custom combination of identifier detectors.</div>
      </div>

      <div class="dd-grid-2" style="margin-top:14px">
        <div>
          <label class="dim" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:6px">AVAILABLE DEFAULT PROFILERS</label>
          <div style="border:1px solid var(--line);border-radius:6px;padding:8px;max-height:220px;overflow-y:auto;background:var(--surface)">
            ${defaults.map(p => `
              <label style="display:flex;align-items:center;gap:8px;padding:5px 6px;cursor:pointer;font-size:13px;border-radius:4px">
                <input
                  type="checkbox"
                  style="width:auto"
                  data-act="dd-custom-prof-toggle"
                  data-arg="${esc(p.n)}"
                  ${customFormState.selected[p.n] ? 'checked' : ''}
                />
                <span>${esc(p.n)} <small class="dim">(${(p.rec || []).length})</small></span>
              </label>
            `).join("")}
          </div>
        </div>

        <div>
          <label class="dim" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:6px">
            INCLUDED RECOGNIZERS (${totalRecognizers})
          </label>
          <div style="border:1px solid var(--line);border-radius:6px;padding:8px;max-height:220px;overflow-y:auto;background:var(--surface-2)">
            ${selectedList.length ? selectedList.map(p => `
              <div style="padding:4px 8px;margin-bottom:4px;background:var(--surface);border:1px solid var(--line);border-radius:4px;font-size:12px">
                <b>${esc(p.n)}</b>
                <span class="dim" style="display:block;font-size:11px">${(p.rec || []).length} active recognizers</span>
              </div>
            `).join("") : '<div class="empty" style="padding:16px;font-size:12px">Select at least one profiler library from the left panel.</div>'}
          </div>
        </div>
      </div>
    `;

    const footHtml = `
      <button class="btn sm o" data-act="close">Cancel</button>
      <button class="btn sm p" data-act="dd-save-custom-profiler">
        Save Custom Profiler
      </button>
    `;

    modal("Create Custom Profiler", "Combine specialized recognizers into an operational detection pack", bodyHtml, footHtml, "modal-wide");
  }

  ACT["dd-open-custom-profiler-modal"] = function() {
    customFormState = { name: "", selected: {} };
    renderCustomProfilerModal();
  };

  ACT["dd-custom-prof-name"] = function(val) {
    customFormState.name = val || "";
  };

  ACT["dd-custom-prof-toggle"] = function(name) {
    customFormState.selected[name] = !customFormState.selected[name];
    renderCustomProfilerModal();
  };

  ACT["dd-save-custom-profiler"] = function() {
    const name = ($("#dd_cp_name")?.value || customFormState.name || "").trim();
    const store = context.getStore();
    const defaults = store.profilers || [];
    const selectedList = defaults.filter(p => customFormState.selected[p.n]);

    if (!name) {
      renderCustomProfilerModal("Profiler name is required.");
      return;
    }

    const allCustoms = store.customProfilers || [];
    if (allCustoms.some(p => p.n.toLowerCase() === name.toLowerCase())) {
      renderCustomProfilerModal("A custom profiler with this name already exists.");
      return;
    }

    if (!selectedList.length) {
      renderCustomProfilerModal("Please select at least one profiler library.");
      return;
    }

    const compiledRecs = selectedList.flatMap(p => p.rec || []);
    const newCustom = {
      n: name,
      rec: compiledRecs
    };

    store.customProfilers = store.customProfilers || [];
    store.customProfilers.push(newCustom);
    context.saveStore(store);

    closeOv();
    ui.profilersSubTab = "C";
    toast(`Custom profiler "${name}" created with ${compiledRecs.length} recognizers`);
    ledgerAdd("Custom profiler created", `${name} (${compiledRecs.length} rules)`);
    render();
  };

  ACT["dd-delete-custom-profiler"] = function(idxStr) {
    const store = context.getStore();
    const idx = Number(idxStr);
    const profiler = (store.customProfilers || [])[idx];
    const profName = profiler?.n || "Custom Profiler";

    if (profiler) {
      store.customProfilers.splice(idx, 1);
      context.saveStore(store);
      toast(`Profiler "${profName}" deleted`);
      ledgerAdd("Custom profiler deleted", profName);
      render();
    }
  };
}
