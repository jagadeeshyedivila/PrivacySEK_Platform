import { RECORD_TYPES, listState } from "../ropaConfig.js";

export function registerDashboardActions(context, ACT) {
  const { $, S, ledgerAdd, render, toast, ui } = context;

  // Opens a list with a filter applied, e.g. "act|dpia=required"
  ACT["rp-dash-go"] = function(arg) {
    const p = String(arg || "").split("|");
    const type = p[0];
    const st = listState(ui, type);
    st.q = "";
    st.filters = {};
    st.page = 1;
    if (p[1]) {
      const i = p[1].indexOf("=");
      st.filters[p[1].slice(0, i)] = p[1].slice(i + 1);
    }
    S.tab.ropa = RECORD_TYPES[type].tab;
    if (RECORD_TYPES[type].tab === "par") ui.partyTab = type;
    ui.wiz = null;
    const c = $("#content");
    if (c) c.scrollTop = 0;
    render();
  };

  ACT["rp-issue-row"] = function(i) {
    const key = (ui.issueRows || [])[Number(i)];
    if (key) ACT["rp-open"](key);
  };

  ACT["rp-toggle-sdf"] = function(checked) {
    const store = context.getStore();
    store.settings = Object.assign({}, store.settings, { sdf: checked === "true" });
    context.saveStore(store);
    ledgerAdd("ROPA SDF checks " + (checked === "true" ? "enabled" : "disabled"), "Data Map & ROPA dashboard");
    render();
    toast(checked === "true" ? "SDF checks on: extra Significant Data Fiduciary checks included" : "SDF checks off");
  };
}
