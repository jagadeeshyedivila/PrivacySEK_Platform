import { RECORD_TYPES, DENY_MSG, can, has, listState } from "../ropaConfig.js";
import { findRecord } from "../ropaData.js";
import { newWizard, openWizard, isDirty } from "../shared/RopaWizard.js";
import { plural } from "../shared/format.js";

// Records elsewhere in the register that point at this one
export function findLinks(store, type, rec) {
  const links = [];
  const add = (t, r, why) => links.push({ type: t, id: r.id, name: r.name, why });
  if (type === "act") {
    (store.ast || []).filter(a => has(a.acts, rec.id)).forEach(a => add("ast", a, "linked activity"));
    (store.doc || []).filter(d => has(d.linked, rec.id)).forEach(d => add("doc", d, "linked record"));
  } else if (type === "ast") {
    (store.doc || []).filter(d => has(d.linked, rec.id)).forEach(d => add("doc", d, "linked record"));
  } else if (type === "ven" || type === "cus" || type === "oth") {
    (store.act || []).filter(a => has(a.erec, rec.name)).forEach(a => add("act", a, "external recipient"));
    if (type === "ven") (store.ast || []).filter(a => a.host === rec.name || a.supp === rec.name).forEach(a => add("ast", a, "hosting provider or supplier"));
    (store.doc || []).filter(d => has(d.linked, rec.id)).forEach(d => add("doc", d, "linked record"));
  } else if (type === "com") {
    (store.act || []).filter(a => a.entity === rec.name).forEach(a => add("act", a, "entity"));
    (store.ast || []).filter(a => a.etype === rec.name).forEach(a => add("ast", a, "owning entity"));
  } else if (type === "pol") {
    (store.ast || []).filter(a => has(a.pol, rec.name)).forEach(a => add("ast", a, "policy"));
  }
  return links;
}

function removeLinks(store, type, rec) {
  const drop = (arr, v) => (arr || []).filter(x => x !== v);
  if (type === "act") {
    (store.ast || []).forEach(a => { a.acts = drop(a.acts, rec.id); });
  } else if (type === "ven" || type === "cus" || type === "oth") {
    (store.act || []).forEach(a => { a.erec = drop(a.erec, rec.name); });
    (store.ast || []).forEach(a => { if (a.host === rec.name) delete a.host; if (a.supp === rec.name) delete a.supp; });
  } else if (type === "com") {
    (store.act || []).forEach(a => { if (a.entity === rec.name) delete a.entity; });
    (store.ast || []).forEach(a => { if (a.etype === rec.name) delete a.etype; });
  } else if (type === "pol") {
    (store.ast || []).forEach(a => { a.pol = drop(a.pol, rec.name); });
  }
  (store.doc || []).forEach(d => { d.linked = drop(d.linked, rec.id); });
}

function linkSummary(links) {
  const by = {};
  links.forEach(l => { by[l.type] = (by[l.type] || 0) + 1; });
  return Object.keys(by).map(t => plural(by[t], RECORD_TYPES[t].noun, RECORD_TYPES[t].plural)).join(" and ");
}

export function registerRecordActions(context, ACT) {
  const { $, S, closeOv, esc, ledgerAdd, modal, render, toast, ui } = context;

  function scrollTop() { const c = $("#content"); if (c) c.scrollTop = 0; }

  // Opens a record (or a new one) in the wizard on the tab it belongs to
  function showWizard(type, wiz) {
    S.tab.ropa = RECORD_TYPES[type].tab;
    if (RECORD_TYPES[type].tab === "par") ui.partyTab = type;
    ui.wiz = wiz;
    ui.dockOpen = false;
    closeOv();
    scrollTop();
    render();
  }
  context.showWizard = showWizard;

  ACT["rp-new"] = function(type) {
    if (!can(ui, "create")) return toast(DENY_MSG.create);
    showWizard(type, newWizard(context, type));
  };

  ACT["rp-open"] = function(arg) {
    const p = String(arg || "").split("|");
    const w = openWizard(context, p[0], p[1], p[2] ? Number(p[2]) : 0, p[3] || null);
    if (!w) return toast("That record no longer exists");
    showWizard(p[0], w);
  };

  ACT["rp-row"] = function(i) {
    const key = ui.rowIds[Number(i)];
    if (key) ACT["rp-open"](key);
  };

  // Kept for the command palette's "Register processing activity" shortcut
  ACT.wiz = function() {
    if (!can(ui, "create")) { location.hash = "ropa"; return toast(DENY_MSG.create); }
    const w = newWizard(context, "act");
    if (S.view !== "ropa") { ui.wiz = w; S.tab.ropa = "act"; location.hash = "ropa"; return; }
    showWizard("act", w);
  };

  ACT["rp-search"] = function(val, el) {
    const st = listState(ui, el.getAttribute("data-table") || ui.listType);
    st.q = val || "";
    st.page = 1;
    render();
  };

  ACT["rp-clear-search"] = function(arg, el) {
    const st = listState(ui, (el && el.getAttribute("data-table")) || ui.listType);
    st.q = "";
    st.filters = {};
    st.page = 1;
    render();
  };

  ACT["rp-filter"] = function(val, el) {
    const st = listState(ui, el.getAttribute("data-table"));
    st.filters[el.getAttribute("data-arg")] = val || "";
    st.page = 1;
    render();
  };

  ACT["rp-filter-clear"] = function(arg) {
    const p = String(arg).split("|");
    const st = listState(ui, p[0]);
    delete st.filters[p[1]];
    st.page = 1;
    render();
  };

  // Toggles one filter value, e.g. "act|stage|2" from the lifecycle overview
  ACT["rp-filter-toggle"] = function(arg) {
    const p = String(arg).split("|");
    const st = listState(ui, p[0]);
    st.filters[p[1]] = st.filters[p[1]] === p[2] ? "" : p[2];
    st.page = 1;
    render();
  };

  ACT["rp-page"] = function(page, el) {
    listState(ui, el.getAttribute("data-table")).page = Math.max(1, Number(page) || 1);
    render();
  };

  ACT["rp-page-size"] = function(size, el) {
    const st = listState(ui, el.getAttribute("data-table"));
    st.pageSize = Number(size) || 10;
    st.page = 1;
    render();
  };

  ACT["rp-party-tab"] = function(t) {
    if (ui.wiz && RECORD_TYPES[ui.wiz.type].tab === "par" && isDirty(ui.wiz)) return ACT["rp-cancel"]("party:" + t);
    if (ui.wiz && RECORD_TYPES[ui.wiz.type].tab === "par") ui.wiz = null;
    ui.partyTab = t;
    render();
  };

  ACT["rp-delete"] = function(arg) {
    if (!can(ui, "delete")) return toast(DENY_MSG.delete);
    const p = String(arg).split("|");
    const store = context.getStore();
    const rec = findRecord(store, p[0], p[1]);
    if (!rec) return;
    const links = findLinks(store, p[0], rec);
    const body = links.length
      ? '<p>Used by ' + linkSummary(links) + '. Remove the links and delete?</p><div class="list card">' + links.map(l =>
          '<div class="li"><span class="mono dim">' + esc(l.id) + '</span><span><b>' + esc(l.name) + '</b><small>' + esc(l.why) + '</small></span><span></span></div>').join("") + '</div>'
      : '<p>Delete <b>' + esc(rec.name) + '</b> (' + esc(rec.id) + ')? This can\'t be undone.</p>';
    modal("Delete " + esc(RECORD_TYPES[p[0]].noun) + "?", esc(rec.id), body,
      '<button class="btn sm o" data-act="close">Cancel</button>' +
      '<button class="btn sm" style="background:var(--block);color:#fff" data-act="rp-confirm-delete" data-arg="' + esc(arg) + '">' + (links.length ? "Remove links and delete" : "Delete") + '</button>');
  };

  ACT["rp-confirm-delete"] = function(arg) {
    const p = String(arg).split("|");
    const store = context.getStore();
    const rec = findRecord(store, p[0], p[1]);
    if (!rec) return closeOv();
    removeLinks(store, p[0], rec);
    store[p[0]] = store[p[0]].filter(r => r.id !== rec.id);
    context.saveStore(store);
    if (ui.wiz && ui.wiz.id === rec.id) ui.wiz = null;
    ledgerAdd(RECORD_TYPES[p[0]].label + " deleted", rec.id + " · " + rec.name);
    closeOv();
    render();
    toast(RECORD_TYPES[p[0]].label + " deleted: " + rec.name);
  };
}
