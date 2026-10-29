import React from "react";
import { createRoot } from "react-dom/client";
import { NAV, TITLES } from "../app/navigation.js";
import { renderSidebar } from "../app/Sidebar.js";
import { renderTopbar } from "../app/Topbar.js";
import { MODULE_ACTIONS, MODULE_COMPONENTS, MODULE_RENDERERS } from "../app/routes.jsx";
import { createMarkupHelpers } from "../components/ui/markup.js";
import { I, MARK } from "../components/icons/icons.js";
import { createRuntimeHelpers, escapeHtml } from "../utils/helpers.js";
import { formatNumber } from "../utils/formatters.js";
let mounted = false;

/**
 * Mounts the PrivacySEK platform demo into a DOM element.
 * The shared runtime coordinates module renderers, actions, and application state.
 */
export function mountPlatform(rootEl, data) {
if (mounted) return function(){};
mounted = true;
var D = data, d = document;
var $ = function(s, r){ return (r||d).querySelector(s); };
var esc = escapeHtml;
var fmt = formatNumber;

/* ---------------- icons ---------------- */


/* ---------------- navigation ---------------- */
var S = { view:"cockpit", tab:{}, jur:"DPDP", bu:0, feedTimer:null, approvals:D.guard.approvals.slice(), dsrStep:{}, wiz:null, cats:{}, sel:{} };

var { pill, tag, bar, card, kpi, table, tabs, curTab, head, btn, stl } = createMarkupHelpers({ S, esc, I });
var { hash, nowT, ledgerAdd, sevPill } = createRuntimeHelpers({ D, pill });

/* ---------------- overlays ---------------- */
function closeOv(){ d.querySelectorAll(".scrim,.drawer,.modal").forEach(function(e){ e.remove(); }); }
function drawer(title, sub, body, foot, wide){ closeOv();
  d.body.insertAdjacentHTML("beforeend", '<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-label="'+esc(title)+'"'+(wide?' style="width:min(760px,100%)"':'')+'><div class="drawer-h"><div><div class="eyebrow">'+(sub||"")+'</div><h2>'+title+'</h2></div><button class="ibtn" style="margin-left:auto" data-act="close" aria-label="Close">'+I.x+'</button></div><div class="drawer-b">'+body+'</div>'+(foot?'<div class="drawer-f">'+foot+'</div>':'')+'</aside>'); }
function modal(title, sub, body, foot, cls){ closeOv();
  d.body.insertAdjacentHTML("beforeend", '<div class="scrim" data-act="close"></div><div class="modal '+(cls||"")+'" role="dialog" aria-label="'+esc(title)+'"><div class="drawer-h"><div><div class="eyebrow">'+(sub||"")+'</div><h2>'+title+'</h2></div><button class="ibtn" style="margin-left:auto" data-act="close" aria-label="Close">'+I.x+'</button></div><div class="drawer-b">'+body+'</div>'+(foot?'<div class="drawer-f">'+foot+'</div>':'')+'</div>'); }
function toast(m){ var t=$(".toast"); if(t) t.remove(); d.body.insertAdjacentHTML("beforeend",'<div class="toast" role="status">'+I.check.replace('<svg','<svg width="16" height="16"')+esc(m)+'</div>'); setTimeout(function(){ var x=$(".toast"); if(x) x.remove(); }, 3200); }

/* ---------------- shell ---------------- */
function shell(){
  rootEl.innerHTML =
  '<div class="app">'+renderSidebar({ D, I, MARK, NAV, S })+
  '<div class="main">'+renderTopbar({ I, S })+
  '<div class="content" id="content"></div></div></div>'+
  '<button class="tour-fab" data-act="tour" data-arg="0"><i></i>Guided demo</button>';
}
function go(v){
  if(!VIEWS[v]) v="cockpit"; S.view=v; clearInterval(S.feedTimer);
  d.querySelectorAll(".nav button").forEach(function(b){ b.setAttribute("aria-current", b.getAttribute("data-go")===v ? "page" : "false"); });
  var t = TITLES[v]; $("#crumb").innerHTML = '<span>'+t[0]+'</span><span>/</span><b>'+t[1]+'</b>';
  render(); try{ if(location.hash.slice(1)!==v) history.replaceState(null,"","#"+v); }catch(e){}
  $("#rail").classList.remove("open"); var sc=$(".scrim"); if(sc && !$(".drawer") && !$(".modal")) sc.remove();
  $("#content").scrollTop = 0;
}
function render(){ clearInterval(S.feedTimer); var html=VIEWS[S.view](); contentRoot.render(React.createElement(MODULE_COMPONENTS[S.view], { html:html })); if(AFTER[S.view]) AFTER[S.view](); }

/* ======================= VIEWS ======================= */
var VIEWS = {}, AFTER = {}, ACT = {};

/* ---------- Cockpit ---------- */



function startClock(){ var end = Date.now()+41*3600e3 - (S.clockOff||0); clearInterval(S.clk); S.clk=setInterval(function(){ var el=d.getElementById("clk72")||d.getElementById("clk72b"); if(!el){ return; } var s=Math.max(0,Math.floor((end-Date.now())/1000)); var h=Math.floor(s/3600), m=Math.floor(s%3600/60), x=s%60; d.querySelectorAll("#clk72,#clk72b").forEach(function(e){ e.textContent=(h<10?"0":"")+h+":"+(m<10?"0":"")+m+":"+(x<10?"0":"")+x; }); },1000); }


/* ---------- Discovery ---------- */






/* ---------- Lineage ---------- */





/* ---------- ROPA ---------- */







/* ---------- Person Finder ---------- */








/* ---------- Notices ---------- */





/* ---------- Consent ---------- */





/* ---------- Cookies ---------- */




/* ---------- Purpose Guard ---------- */












/* ---------- Retention ---------- */


/* ---------- Vendors ---------- */




/* ---------- Rights ---------- */






/* ---------- Breach ---------- */



/* ---------- Assessments ---------- */



/* ---------- Proof Ledger ---------- */

function ledRow(e){ return '<div class="lg"><span class="t">'+e[0]+'</span><span class="dotc"></span><span><b>'+esc(e[1])+'</b><small>'+esc(e[2])+'</small></span><span class="h">'+e[3]+'<span>prev ✓</span></span></div>'; }





/* ---------- Reports ---------- */




/* ---------- AI governance ---------- */



/* ---------- Training ---------- */


/* ---------- Trust Center ---------- */


/* ---------- Workflows ---------- */


/* ---------- Integrations ---------- */


/* ---------- Settings ---------- */


/* ======================= ACTIONS ======================= */
ACT.tab = function(a){ var p=a.split("|"); S.tab[p[0]]=p[1]; if(S.view!==p[0]) { go(p[0]); } else { clearInterval(S.feedTimer); render(); } };
ACT.close = closeOv;
ACT.sw = function(a, el){ el.setAttribute("aria-checked", el.getAttribute("aria-checked")==="true"?"false":"true"); };
ACT.toastm = function(m){ closeOv(); toast(m); };
ACT.theme = function(){ var r=d.documentElement; var dark = r.getAttribute("data-theme")==="dark" || (!r.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches); r.setAttribute("data-theme", dark?"light":"dark"); };
ACT.jur = function(j){ S.jur=j; d.querySelectorAll(".jur button").forEach(function(b){ b.setAttribute("aria-pressed", b.getAttribute("data-arg")===j); }); if(S.view!=="cockpit") go("cockpit"); else render(); };
ACT.bu = function(){ S.bu=(S.bu+1)%D.org.bu.length; $("#bu-l").textContent=D.org.bu[S.bu]; render(); toast("Showing "+D.org.bu[S.bu]); };
ACT.menu = function(){ $("#rail").classList.add("open"); d.body.insertAdjacentHTML("beforeend",'<div class="scrim" data-act="closemenu"></div>'); };
ACT.closemenu = function(){ $("#rail").classList.remove("open"); closeOv(); };
ACT.notif = function(){ drawer("Notifications","Today", '<div class="list card">'+[["alert","Breach report due in 41 hours","INC-2026-019"],["shield","New approval: Partner NBFC share","APR-118 · 11 min"],["inbox","Grievance escalated","GRV-2026-0471"],["search","Scan found 3 new SPI fields","Discovery"],["truck","Mailchimp DPA renewal due","Vendor Risk"]].map(function(n){ return '<div class="li"><span class="ic">'+I[n[0]]+'</span><span><b>'+n[1]+'</b><small>'+n[2]+'</small></span><span></span></div>'; }).join("")+'</div>'); };

/* command palette */
ACT.cmd = function(){ var items=[]; NAV.forEach(function(g){ g[1].forEach(function(i){ items.push([i[1], "go:"+i[0], g[0]||"Home"]); }); });
  items=items.concat([["Simulate an export","tab:guard|sim","Action"],["Generate Regulator Pack","act:pack","Action"],["Register processing activity","act:wiz","Action"],["Find a person","go:finder","Action"],["Verify ledger chain","act:verify","Action"],["Toggle theme","act:theme","Action"]]);
  modal("Search or jump to","", '<input id="cmd-q" placeholder="Type a module, request ID or action" aria-label="Search" style="height:44px;border:1px solid var(--line);border-radius:12px;padding:0 14px;background:var(--surface-2)"><div class="cmd-l" id="cmd-l"></div>', "", "cmd");
  var draw=function(q){ $("#cmd-l").innerHTML=items.filter(function(x){ return !q || x[0].toLowerCase().indexOf(q.toLowerCase())>-1; }).slice(0,12).map(function(x){ return '<button data-act="cmdgo" data-arg="'+x[1]+'"><span>'+x[0]+'</span><small>'+x[2]+'</small></button>'; }).join("") || '<div class="empty">No matches</div>'; };
  draw(""); var q=$("#cmd-q"); q.focus(); q.addEventListener("input", function(){ draw(q.value); }); };
ACT.cmdgo = function(a){ closeOv(); var p=a.split(":"); if(p[0]==="go") go(p[1]); else if(p[0]==="tab") ACT.tab(p[1]); else ACT[p[1]](); };

/* guided demo */
var TOUR=[
 ["cockpit",null,"Start with obligations, not modules","The Obligation Cockpit lists every DPDP duty with live status, owner, evidence and the clocks that are running."],
 ["finder",null,"Find one customer everywhere","Person Finder hashes the identifier in the browser and locates Priya across six systems. Try Find, then Correct or Erasure dry run."],
 ["consent",null,"Consent in 23 languages","Profiles map each purpose to data categories and lawful basis. Trigger the re-consent campaign for 5,092 customers on an old notice."],
 ["guard","sim","Purpose Guard: the standout","Choose MoEngage and evaluate. 137 records are blocked because consent was withdrawn, 1,201 are masked, the rest go through."],
 ["rights",null,"Rights with statutory clocks","Open a request and advance it step by step. Every step is written to the Proof Ledger."],
 ["breach",null,"Breach response on one timeline","Board intimation, CERT-In's 6 hours and the 72-hour report count down together, with drafts ready."],
 ["ledger",null,"Proof in one click","Verify the hash chain, then generate a Regulator Pack for Customer #4471."]
];
ACT.tour = function(i){ i=+i; var t=TOUR[i]; if(t[1]) S.tab[t[0]]=t[1]; go(t[0]); var old=$(".tour"); if(old) old.remove(); var fab=$(".tour-fab"); if(fab) fab.hidden=true;
  d.body.insertAdjacentHTML("beforeend",'<div class="tour" role="dialog" aria-label="Guided demo"><span class="eyebrow">Guided demo · '+(i+1)+' of '+TOUR.length+'</span><b>'+t[2]+'</b><p>'+t[3]+'</p><div class="row">'+(i>0?'<button class="btn sm" data-act="tour" data-arg="'+(i-1)+'">Back</button>':'')+'<span class="sp"></span><button class="btn sm" data-act="tourend">End</button>'+(i<TOUR.length-1?'<button class="btn sm t" data-act="tour" data-arg="'+(i+1)+'">Next</button>':'<button class="btn sm t" data-act="tourend">Finish</button>')+'</div></div>'); };
ACT.tourend = function(){ var t=$(".tour"); if(t) t.remove(); var f=$(".tour-fab"); if(f) f.hidden=false; };

var moduleRuntime = { $, D, I, S, bar, btn, card, closeOv, curTab, d, drawer, esc, fmt, head, hash, kpi, ledRow, ledgerAdd, modal, nowT, pill, render, sevPill, startClock, stl, table, tabs, tag, toast };
Object.keys(MODULE_RENDERERS).forEach(function(key){ VIEWS[key] = MODULE_RENDERERS[key](moduleRuntime); });
Object.keys(MODULE_ACTIONS).forEach(function(key){ MODULE_ACTIONS[key](moduleRuntime, ACT, AFTER); });

/* ======================= EVENTS ======================= */
d.addEventListener("click", function(e){
  var g=e.target.closest("[data-go]"); if(g){ e.preventDefault(); closeOv(); go(g.getAttribute("data-go")); return; }
  var a=e.target.closest("[data-act]"); if(!a || a.tagName==="SELECT") return;
  var fn=ACT[a.getAttribute("data-act")]; if(fn){ e.preventDefault(); fn(a.getAttribute("data-arg"), a); }
});
d.addEventListener("change", function(e){
  var a=e.target.closest("select[data-act]");
  if(a && ACT[a.getAttribute("data-act")]) ACT[a.getAttribute("data-act")](a.value, a);
  var c=e.target.closest("[data-change-act]");
  if(c && ACT[c.getAttribute("data-change-act")]) ACT[c.getAttribute("data-change-act")](c.checked ? "true" : "false", c);
});
d.addEventListener("input", function(e){ var a=e.target.closest("[data-input-act]"); if(a && ACT[a.getAttribute("data-input-act")]) ACT[a.getAttribute("data-input-act")](a.value, a); });
d.addEventListener("keydown", function(e){ if((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); ACT.cmd(); } if(e.key==="Escape"){ closeOv(); $("#rail").classList.remove("open"); } });
window.addEventListener("hashchange", function(){ var h=location.hash.slice(1); if(h && h!==S.view && VIEWS[h]) go(h); });

shell();
var contentRoot = createRoot($("#content"));
var start=(location.hash||"").slice(1); go(VIEWS[start]?start:"cockpit");
return function(){ clearInterval(S.feedTimer); clearInterval(S.clk); setTimeout(function(){ contentRoot.unmount(); },0); };
}
