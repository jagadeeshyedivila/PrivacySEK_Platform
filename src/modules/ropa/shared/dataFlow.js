// Per-record data flow: builds a graph from a processing activity, checks it, and renders it.
// Nodes are places that hold or receive personal data; everything else is a label on them.
import { DISCOVERY_HINTS, DPC_CHILD, isYes, has } from "../ropaConfig.js";
import { lawShort, plural } from "./format.js";
import { renderResult } from "./ComplianceDock.js";

export const LANES = ["Sources", "Collection", "Processing", "Systems & storage", "Sharing", "End of life"];

/* ---------------- locations ---------------- */

function homeCountry(d, store) {
  const c = (store.com || []).find(x => x.name === d.entity);
  return (c && c.country) || "India";
}

// Where a system is hosted: the Assets register first, then Data Discovery hints
function systemLoc(name, store) {
  const a = (store.ast || []).find(x => x.name === name || x.dsrc === name);
  if (a && a.loc) return { c: a.loc, from: "Asset " + a.id };
  const h = DISCOVERY_HINTS[name];
  if (h && h.loc) return { c: h.loc, from: "Data Discovery" };
  return null;
}

// Where a recipient is: the ROPA third-party record first, then Vendor Risk
function partyLoc(name, store, vendors) {
  const p = ["ven", "cus", "com", "oth"].map(t => (store[t] || []).find(x => x.name === name)).find(Boolean);
  if (p && p.country) return p.country;
  const v = (vendors || []).find(x => x.n === name);
  return v && v.loc ? v.loc : null;
}

/* ---------------- graph ---------------- */

const SEV_RANK = { error: 2, warning: 1 };

// Which nodes a rule finding belongs to, by the field it points at
function targetsFor(r, nodes) {
  const f = r.field || "";
  const lane = (i, pre) => nodes.filter(n => n.lane === i && (!pre || n.id.indexOf(pre) === 0));
  const byId = id => nodes.filter(n => n.id === id);
  if (f === "dpc") { const child = byId("dpc:" + DPC_CHILD); return child.length && r.id === "R-05" ? child : lane(0, "dpc:"); }
  if (f === "srct") return byId("src");
  if (["mode", "freq", "srcj"].indexOf(f) > -1) return byId("col");
  if (["ssys", "sjur", "hold", "afq"].indexOf(f) > -1) return nodes.filter(n => n.stores);
  if (f === "apps") return lane(3, "sys:");
  if (f === "bak" || f === "bjur") return byId("bak");
  if (f === "copy" || f === "csys") return byId("copy");
  if (["sec", "rest", "tr", "orgm"].indexOf(f) > -1) return lane(3, "sys:");
  if (["int", "irec", "ipur"].indexOf(f) > -1) return lane(4, "bu:");
  if (["ext", "erec", "epur", "erole", "dpa", "dpal"].indexOf(f) > -1) {
    const named = lane(4, "ven:").filter(n => (r.message || "").indexOf(n.title) > -1);
    return named.length ? named : lane(4, "ven:");
  }
  if (["xb", "xc", "xr", "xm", "xs", "xl"].indexOf(f) > -1) return nodes.filter(n => n.foreign && n.lane >= 3);
  if (["ret", "retn", "retu", "rett", "retp", "dm", "do"].indexOf(f) > -1) return byId("end");
  return [];
}

export function buildFlow(d, ev, ctx) {
  const store = ctx.store, vendors = ctx.vendorRisk || [];
  const home = homeCountry(d, store);
  const nodes = [], edges = [], checks = [];
  const add = n => { const o = Object.assign({ items: [], lines: [], chips: [], locs: [], issues: [] }, n); o.foreign = o.locs.some(c => c !== home); nodes.push(o); return o; };
  const link = (a, b, extra) => edges.push(Object.assign({ from: a.id, to: b.id, cls: b.foreign ? "xb" : "" }, extra));
  const check = (sev, title, message, go, node) => {
    const p = go.split("|");
    checks.push({ id: "F-" + (checks.length + 1), sev, title, message, step: Number(p[0]), field: p[1] });
    if (node) node.issues.push({ sev, title });
  };
  const cats = (d.cat || []).join(", ");

  // 1 Sources: who the data is about, and any indirect source
  const srcj = d.srcj || [];
  const sources = (d.dpc || []).map(p => add({ id: "dpc:" + p, lane: 0, kind: "Data principal", title: p, go: "1|dpc" }));
  if (d.srct === "Third party" || d.srct === "Public source") sources.push(add({ id: "src", lane: 0, kind: "Indirect source", title: d.srct === "Third party" ? "Third-party source" : "Public source", go: "1|srct" }));
  if (!sources.length) sources.push(add({ id: "gap:dpc", lane: 0, gap: true, title: "Data principals not recorded", go: "1|dpc" }));

  // 2 Collection: channels are grouped because the form doesn't pair them with principals
  const col = (d.mode || []).length
    ? add({ id: "col", lane: 1, kind: "Collection", title: plural(d.mode.length, "channel"), items: d.mode, lines: [["Frequency", d.freq], ["From", srcj.join(", ")]], go: "1|mode" })
    : add({ id: "col", lane: 1, gap: true, title: "Collection channels not recorded", go: "1|mode" });
  sources.forEach(s => link(s, col, { cls: "" }));

  // 3 Processing: purpose, lawful basis and AI are properties of this node, not steps
  const chips = [];
  if (isYes(d.ai)) chips.push(isYes(d.adm) ? "Automated decision" : "Uses AI");
  if (d.dpia === "Yes") chips.push("DPIA " + (d.dpiaState || "Not started").toLowerCase());
  const proc = add({ id: "proc", lane: 2, kind: "Processing activity", title: d.name || "Untitled activity", items: d.purp || [],
    lines: [["Lawful basis", d.law ? lawShort(d.law) : ""], ["Data", (d.cat || []).length ? plural((d.cat || []).length, "category", "categories") + " · " + plural((d.attr || []).length, "attribute") : ""]], chips, go: "1|purp" });
  link(col, proc, { cls: "", title: cats });

  // 4 Systems & storage
  const apps = d.apps || [], ssys = d.ssys || [];
  const sjur = d.sjur || [];
  const systems = apps.concat(ssys.filter(s => apps.indexOf(s) < 0));
  const sysNodes = systems.map(s => {
    const loc = systemLoc(s, store);
    const stores = has(ssys, s);
    const n = add({ id: "sys:" + s, lane: 3, kind: [has(apps, s) && "Processes", stores && "Stores"].filter(Boolean).join(" · "), title: s,
      locs: loc ? [loc.c] : [], unknownLoc: !loc, lines: loc ? [["Location from", loc.from]] : [], stores, go: stores ? "2|ssys" : "1|apps" });
    if (!loc) check("info", "Location of " + s + " unknown", "Add " + s + " to Assets or connect it in Data Discovery so its hosting country can be checked.", "2|ssys", null);
    else if (stores && sjur.length && sjur.indexOf(loc.c) < 0) check("warning", s + " is hosted in " + loc.c, loc.from + " places " + s + " in " + loc.c + ", but Storage jurisdiction lists " + sjur.join(", ") + ".", "2|sjur", n);
    link(proc, n, { title: cats });
    return n;
  });
  if (!ssys.length) link(proc, add({ id: "gap:ssys", lane: 3, gap: true, title: "Storage systems not recorded", go: "2|ssys" }));
  if (isYes(d.bak)) link(proc, add({ id: "bak", lane: 3, kind: "Backup", title: "Backup copy", locs: d.bjur || [], go: "2|bak" }));
  if (isYes(d.copy)) link(proc, add({ id: "copy", lane: 3, kind: "Copy", title: d.csys || "Personal data copy", go: "2|csys" }));

  // 5 Sharing: internal teams, external recipients, and countries not covered by a recipient
  const shares = [];
  if (isYes(d.int)) (d.irec || []).forEach(b => shares.push(add({ id: "bu:" + b, lane: 4, kind: "Internal team", title: b, locs: [home], lines: [["Purpose", d.ipur]], go: "3|irec" })));
  if (isYes(d.ext)) {
    (d.erec || []).forEach(v => {
      const c = partyLoc(v, store, vendors);
      const vr = vendors.find(x => x.n === v);
      const n = add({ id: "ven:" + v, lane: 4, kind: d.erole || "External recipient", title: v, locs: c ? [c] : [], unknownLoc: !c,
        lines: [["Purpose", d.epur], ["DPA", vr ? vr.dpa : d.dpa === "Yes" ? "Signed" : d.dpa === "No" ? "Not signed" : ""]], go: "3|erec" });
      if (c && c !== home && !isYes(d.xb)) check("error", "Transfer to " + v + " isn't recorded as cross-border", v + " is in " + c + ", so sharing with it is a transfer outside " + home + ". Set Cross-border transfer to Yes.", "3|xb", n);
      else if (c && c !== home && (d.xc || []).indexOf(c) < 0) check("warning", c + " missing from recipient countries", v + " is in " + c + ". Add it to Recipient countries.", "3|xc", n);
      shares.push(n);
    });
    if (!(d.erec || []).length) shares.push(add({ id: "gap:erec", lane: 4, gap: true, title: "External recipients not recorded", go: "3|erec" }));
  }
  if (isYes(d.xb)) (d.xc || []).filter(c => !shares.some(s => has(s.locs, c))).forEach(c => shares.push(add({ id: "cty:" + c, lane: 4, kind: "Cross-border recipient", title: "Recipient in " + c, locs: [c],
    lines: [["Mode", d.xm], ["Safeguards", (d.xs || []).join(", ") || "None recorded"]], go: "3|xc" })));
  const holders = sysNodes.filter(n => n.stores);
  const from = holders.length ? holders : [proc];
  if (shares.length) shares.forEach(s => from.forEach(f => link(f, s, { title: cats + (s.foreign ? " · " + [d.xm].concat(d.xs || []).filter(Boolean).join(", ") : "") })));
  else add({ id: "noshare", lane: 4, muted: true, kind: "Sharing", title: "Not shared", go: "3|int" });

  // 6 End of life: drawn as one connector under the diagram from the stored data
  const retTitle = d.ret === "Custom…" ? [d.retn, (d.retu || "").toLowerCase(), d.rett].filter(Boolean).join(" ") : d.ret;
  const end = d.ret
    ? add({ id: "end", lane: 5, kind: "Retention & disposal", title: retTitle, lines: [["Reason", d.retp], ["Method", d.dm], ["Owner", d.do]], go: "4|ret" })
    : add({ id: "end", lane: 5, gap: true, title: "Retention not recorded", go: "4|ret" });
  const last = nodes.filter(n => n.lane === 3).pop() || proc;
  edges.push({ from: last.id, to: end.id, under: true, cls: "quiet", title: "Retention applies to everything stored" });

  // Rule-engine findings, placed on the nodes they concern
  ev.results.filter(r => SEV_RANK[r.sev]).forEach(r => {
    const t = targetsFor(r, nodes);
    (t.length ? t : [proc]).forEach(n => n.issues.push({ sev: r.sev, title: r.title }));
  });
  nodes.forEach(n => {
    n.sev = n.issues.reduce((s, i) => (SEV_RANK[i.sev] || 0) > (SEV_RANK[s] || 0) ? i.sev : s, null);
  });
  // A cross-border edge into a node with an error is drawn as a problem, not just a transfer
  edges.forEach(e => { const to = nodes.find(n => n.id === e.to); if (e.cls === "xb" && to && to.sev === "error") e.cls = "xb e"; });

  const countries = [];
  nodes.forEach(n => n.locs.forEach(c => { if (countries.indexOf(c) < 0) countries.push(c); }));
  return {
    nodes, edges, checks, home, countries,
    stats: {
      systems: sysNodes.length,
      recipients: shares.filter(s => !s.gap).length,
      crossBorder: edges.filter(e => e.cls.indexOf("xb") > -1).length,
      flagged: nodes.filter(n => n.sev).length
    }
  };
}

/* ---------------- render ---------------- */

function renderNode(context, n, home) {
  const { esc } = context;
  const p = n.go.split("|");
  const lines = n.lines.filter(l => l[1]).map(l => '<div><dt>' + esc(l[0]) + '</dt><dd>' + esc(l[1]) + '</dd></div>').join("");
  const items = n.items.length ? '<p class="rp-node-items">' + esc(n.items.join(", ")) + '</p>' : "";
  const loc = n.locs.length
    ? n.locs.map(c => '<span class="rp-loc' + (c !== home ? " x" : "") + '">' + esc(c) + '</span>').join("")
    : n.unknownLoc ? '<span class="rp-loc u">Location unknown</span>' : "";
  const iss = n.issues.length ? '<span class="rp-node-iss ' + (n.sev === "error" ? "e" : "w") + '">' + plural(n.issues.length, "issue") + '</span>' : "";
  const foot = loc || iss || n.chips.length ? '<div class="rp-node-f">' + n.chips.map(c => '<span class="rp-loc">' + esc(c) + '</span>').join("") + loc + iss + '</div>' : "";
  const tip = n.gap ? "Add this in the form" : n.issues.length ? n.issues.map(i => i.title).join("\n") : "Open " + n.title + " in the form";
  return '<button type="button" class="rp-node' + (n.sev === "error" ? " e" : n.sev === "warning" ? " w" : "") + (n.gap ? " gap" : "") + (n.muted ? " muted" : "") + '"' +
    ' data-node="' + esc(n.id) + '" data-act="rp-jump" data-arg="' + esc(p[0] + "|" + p[1]) + '" title="' + esc(tip) + '">' +
    (n.kind ? '<span class="rp-node-k">' + esc(n.kind) + '</span>' : "") + '<b>' + esc(n.title) + '</b>' + items +
    (lines ? '<dl>' + lines + '</dl>' : "") + foot + '</button>';
}

export function renderFlow(context, d, ev, ctx) {
  const { esc } = context;
  const g = buildFlow(d, ev, ctx);
  const s = g.stats;
  const stat = (label, val, tone) => '<div class="rp-fstat' + (tone ? " " + tone : "") + '"><small>' + label + '</small><b>' + val + '</b></div>';
  const lanes = LANES.map((t, i) => '<div class="rp-lane"><div class="rp-lane-h"><span>' + String(i + 1).padStart(2, "0") + '</span>' + t + '</div>' +
    '<div class="rp-lane-b">' + g.nodes.filter(n => n.lane === i).map(n => renderNode(context, n, g.home)).join("") + '</div></div>').join("");
  const checks = g.checks.length
    ? '<div class="rp-grp"><div class="sec-t">Flow checks · ' + g.checks.length + '</div>' + g.checks.map((c, i) => renderResult(context, c, i, true)).join("") + '</div>'
    : '<div class="rp-dock-sec rp-clean">✓ Locations in the flow match what the record declares</div>';
  return '<div class="rp-flow-view">' +
    '<div class="rp-fstats">' +
      stat("Systems", s.systems) + stat("Recipients", s.recipients) +
      stat("Countries", esc(g.countries.join(", ") || "—")) +
      stat("Cross-border flows", s.crossBorder, s.crossBorder ? "w" : "") +
      stat("Nodes with issues", s.flagged, s.flagged ? "e" : "") +
    '</div>' +
    '<div class="rp-flow-scroll"><div class="rp-flow" data-edges="' + esc(JSON.stringify(g.edges)) + '">' +
      '<svg class="rp-flow-svg" aria-hidden="true"></svg>' + lanes + '</div></div>' +
    '<div class="rp-flow-key"><span><i class="k-n"></i>Data flow</span><span><i class="k-x"></i>Cross-border</span><span><i class="k-e"></i>Cross-border with an error</span><span><i class="k-q"></i>Retention</span>' +
      '<span class="dim">Select a node to edit it in the form. Countries come from Assets, Data Discovery and Third Parties.</span></div>' +
    checks + '</div>';
}

/* ---------------- edges: drawn after paint, from where the nodes actually are ---------------- */

const xmlEsc = s => String(s || "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
let observer = null;

function draw(flow) {
  const svg = flow.querySelector(".rp-flow-svg");
  let edges = [];
  try { edges = JSON.parse(flow.getAttribute("data-edges") || "[]"); } catch (e) { return; }
  const box = flow.getBoundingClientRect();
  const rect = id => {
    const el = flow.querySelector('[data-node="' + CSS.escape(id) + '"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 };
  };
  let low = 0;
  flow.querySelectorAll("[data-node]").forEach(el => { low = Math.max(low, el.getBoundingClientRect().bottom - box.top); });
  const paths = edges.map(e => {
    const a = rect(e.from), b = rect(e.to);
    if (!a || !b) return "";
    let d;
    if (e.under) {
      const y = low + 22, r = 10;
      d = "M" + a.cx + "," + a.b + " V" + (y - r) + " Q" + a.cx + "," + y + " " + (a.cx + r) + "," + y + " H" + (b.cx - r) + " Q" + b.cx + "," + y + " " + b.cx + "," + (y - r) + " V" + (b.b + 4);
    } else {
      const x1 = a.r, y1 = a.cy, x2 = b.l - 4, y2 = b.cy, dx = Math.max(20, (x2 - x1) / 2);
      d = "M" + x1 + "," + y1 + " C" + (x1 + dx) + "," + y1 + " " + (x2 - dx) + "," + y2 + " " + x2 + "," + y2;
    }
    const m = e.cls.indexOf("e") > -1 && e.cls.indexOf("xb") > -1 ? "rp-ar-e" : e.cls.indexOf("xb") > -1 ? "rp-ar-x" : "rp-ar";
    return '<path class="rp-edge ' + e.cls + '" data-from="' + xmlEsc(e.from) + '" data-to="' + xmlEsc(e.to) + '" d="' + d + '" marker-end="url(#' + m + ')">' +
      (e.title ? '<title>' + xmlEsc(e.title) + '</title>' : "") + '</path>';
  }).join("");
  const marker = id => '<marker id="' + id + '" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="' + id + '" d="M0,0 L8,4 L0,8 z"/></marker>';
  svg.setAttribute("width", flow.scrollWidth);
  svg.setAttribute("height", flow.scrollHeight);
  svg.innerHTML = '<defs>' + marker("rp-ar") + marker("rp-ar-x") + marker("rp-ar-e") + '</defs>' + paths;

  // Hovering a node highlights the flows in and out of it
  flow.querySelectorAll("[data-node]").forEach(el => {
    const id = el.getAttribute("data-node");
    el.onmouseenter = el.onfocus = () => {
      flow.classList.add("hl");
      svg.querySelectorAll("path.rp-edge").forEach(p => p.classList.toggle("on", p.getAttribute("data-from") === id || p.getAttribute("data-to") === id));
    };
    el.onmouseleave = el.onblur = () => flow.classList.remove("hl");
  });
}

export function drawFlows() {
  const flows = document.querySelectorAll(".rp-flow");
  if (observer) { observer.disconnect(); observer = null; }
  if (!flows.length) return;
  flows.forEach(draw);
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => flows.forEach(f => { if (f.isConnected) draw(f); }));
    flows.forEach(f => observer.observe(f));
  }
}
