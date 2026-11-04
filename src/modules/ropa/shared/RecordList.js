// Generic list screen for ROPA record types: toolbar, table, pagination
import { RECORD_TYPES, DENY_MSG, can, listState } from "../ropaConfig.js";
import { openIssues } from "../ropaRules.js";
import { fmtStamp, ago } from "./format.js";

// Each record with its rule-engine summary, computed once per render
export function annotate(context, type) {
  const store = context.getStore();
  return (store[type] || []).map(rec => ({ rec, iss: openIssues(type, rec, store, context.rulesCtx(type, rec.id)) }));
}

// cfg: { cols:[{label, cell(rec, iss), text(rec, iss)}], filters:[{key,label,options(rows)->[[v,l]], match(rec,v,iss), hidden}],
//        noId (a column shows the ID itself), before (html above the list), footer (html below it), rowActions(rec) (extra buttons) }
export function filterRows(context, type, cfg) {
  const st = listState(context.ui, type);
  const q = (st.q || "").trim().toLowerCase();
  return annotate(context, type).filter(row => {
    const okFilters = (cfg.filters || []).every(f => {
      const v = st.filters[f.key];
      return !v || f.match(row.rec, v, row.iss);
    });
    if (!okFilters) return false;
    if (!q) return true;
    return cfg.cols.some(c => String(c.text ? c.text(row.rec, row.iss) : "").toLowerCase().indexOf(q) > -1);
  });
}

export function renderRecordList(context, type, cfg) {
  const { btn, card, esc, table, tableEmptyState, tablePagination, tableToolbar, tag, ui } = context;
  const meta = RECORD_TYPES[type];
  const st = listState(ui, type);
  const all = context.getStore()[type] || [];
  const rows = filterRows(context, type, cfg);
  const pageSize = st.pageSize || 10;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  if (st.page > pages) st.page = pages;
  const pageRows = rows.slice((st.page - 1) * pageSize, st.page * pageSize);
  ui.rowIds = pageRows.map(r => type + "|" + r.rec.id);

  const canCreate = can(ui, "create"), canEdit = can(ui, "edit"), canDelete = can(ui, "delete");
  const addBtn = '<button class="btn sm p" data-act="rp-new" data-arg="' + type + '"' + (canCreate ? "" : ' disabled title="' + DENY_MSG.create + '"') + '>+ ' + esc(meta.add) + '</button>';

  const visibleFilters = (cfg.filters || []).filter(f => !f.hidden).map(f => ({
    id: "rp-flt-" + type + "-" + f.key, label: f.label, act: "rp-filter", arg: f.key, table: type,
    value: st.filters[f.key] || "",
    options: [{ value: "", label: "All" }].concat(f.options(all).map(o => ({ value: o[0], label: o[1] })))
  }));
  const hiddenActive = (cfg.filters || []).filter(f => f.hidden && st.filters[f.key]);

  const toolbar = tableToolbar({
    search: { placeholder: "Search " + meta.plural + "…", value: st.q, inputAct: "rp-search", clearAct: "rp-clear-search", table: type },
    filters: visibleFilters,
    actions: [addBtn]
  }) + (hiddenActive.length ? '<div class="row rp-active-f">' + hiddenActive.map(f =>
    '<span class="tag ref">' + esc(f.label) + ': ' + esc(f.display ? f.display(st.filters[f.key]) : st.filters[f.key]) + '</span>' +
    '<button class="btn sm o" data-act="rp-filter-clear" data-arg="' + type + "|" + f.key + '">Clear</button>').join("") + '</div>' : "");

  const cols = (cfg.noId ? [] : ["ID"]).concat(cfg.cols.map(c => c.label), ["Last updated", ""]);
  const tableRows = pageRows.map(row => {
    const r = row.rec;
    const arg = esc(type + "|" + r.id);
    return (cfg.noId ? [] : ['<span class="mono">' + esc(r.id) + '</span>'])
      .concat(cfg.cols.map(c => c.cell(r, row.iss)))
      .concat([
        (r.upd ? '<span class="dim rp-small" title="' + fmtStamp(r.upd) + '">' + ago(r.upd) + '</span>' : '<span class="dim">—</span>'),
        '<div class="row rp-row-acts">' + (cfg.rowActions ? cfg.rowActions(r) : "") +
          '<button class="btn sm o" data-act="rp-open" data-arg="' + arg + '"' + (canEdit ? "" : ' title="' + DENY_MSG.edit + '. Opens read-only."') + '>' + (canEdit ? "Edit" : "View") + '</button>' +
          '<button class="btn sm d" data-act="rp-delete" data-arg="' + arg + '"' + (canDelete ? "" : ' disabled title="' + DENY_MSG.delete + '"') + '>Delete</button>' +
        '</div>'
      ]);
  });

  let body;
  if (!rows.length) {
    const filtered = st.q || Object.keys(st.filters).some(k => st.filters[k]);
    body = '<div class="card-b">' + (filtered
      ? tableEmptyState({ title: "No " + meta.plural + " match", description: "Nothing matches your search or filters.", resetAct: "rp-clear-search", resetText: "Clear search" })
      : tableEmptyState({ title: "No " + meta.plural + " yet", description: canCreate ? "Add the first one with the button above." : "Nothing has been recorded yet." })) + '</div>';
  } else {
    body = table(cols, tableRows, "rp-row") +
      tablePagination({ page: st.page, pageSize, totalRecords: rows.length }, { pageAct: "rp-page", sizeAct: "rp-page-size", table: type, unit: meta.plural });
  }
  ui.listType = type;
  return (cfg.before || "") + '<section class="card rp-list">' + toolbar + body + '</section>' + (cfg.footer || "");
}

// Option lists for filter selects built from distinct values
export function distinct(rows, fn) {
  const seen = [];
  rows.forEach(r => { const v = fn(r); (Array.isArray(v) ? v : [v]).forEach(x => { if (x && seen.indexOf(x) < 0) seen.push(x); }); });
  return seen.sort().map(v => [v, v]);
}

export function moreTags(tag, list, n) {
  const arr = list || [];
  if (!arr.length) return '<span class="dim">—</span>';
  return '<div class="tags">' + arr.slice(0, n || 2).map(x => tag(x)).join("") + (arr.length > (n || 2) ? tag("+" + (arr.length - (n || 2))) : "") + '</div>';
}
