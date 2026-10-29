import ModuleView from "../../components/ModuleView.jsx";
import { platformApi } from "../../platform/platformApi.js";

export function createDiscoveryView(runtime) {
  const { D, I, bar, btn, card, curTab, esc, head, kpi, pill, sevPill, table, tabs, tag } = runtime;
  return function(){
  var t = curTab("discovery","overview");
  var h = head("Find", "Data Discovery", "Metadata-first discovery across "+D.sources.length+" sources. Raw values are evaluated in place and not copied into PrivacySEK.", btn("Add source","addsource",null,"","plus")+btn("Run scan","scan",null,"p","play"))+
    tabs("discovery",[["overview","Overview"],["assets","Assets"],["sources","Sources"],["findings","Security posture · 5"]]);
  if(t==="overview"){
    var types=[["Mobile number",88],["Email",81],["Name",77],["PAN",54],["Aadhaar",41],["Bank account",33],["Income",28],["Voice recordings",12]];
    return h+'<div class="g g4">'+kpi("Sources connected","12","1 needs attention","#14B8A6")+kpi("Data assets","1,240","+18 since last scan","#3B82F6")+kpi("Records profiled","4.2M","68% contain PII","#F59E0B")+kpi("Exposed assets","2",'<span style="color:var(--block);font-weight:600">Public · outside approved</span>',"#EF4444")+'</div>'+
     '<div class="g g2">'+card("Sensitivity", '<div class="row" style="gap:24px"><div class="donut" style="background:conic-gradient(#EF4444 0 22%,#F59E0B 22% 51%,#14B8A6 51% 100%)"><div><b>1,240</b><small>assets</small></div></div><div class="legend"><span><i style="background:#EF4444"></i>High / SPI · 273</span><span><i style="background:#F59E0B"></i>Medium · 360</span><span><i style="background:#14B8A6"></i>Low · 607</span><span class="dim" style="font-size:12px">Indian identifiers recognised: Aadhaar, PAN, UPI ID, voter ID, passport, IFSC</span></div></div>')+
      card("Top data categories", types.map(function(x){ return '<div class="row" style="margin-bottom:8px"><span style="width:130px">'+x[0]+'</span><div style="flex:1">'+bar(x[1], x[0].match(/PAN|Aadhaar|Bank|Income|Voice/)?"r":"")+'</div></div>'; }).join(""))+'</div>'+
     '<div id="scanbox"></div>'+card("Recently classified", table(["Asset","Source","Classified","Confidence","Sensitivity"], D.assets.slice(0,5).map(function(a){ return ['<b>'+a.n+'</b>', a.src, '<div class="tags">'+a.cls.slice(0,3).map(function(c){return tag(c[0],c[1]);}).join("")+'</div>', bar(a.conf), sevPill(a.sens)]; }), "asset"), null, true);
  }
  if(t==="assets") return h+card("Data asset inventory · "+D.assets.length+" of 1,240", table(["Asset","Source","Owner","Classified data","Records","Location","Sensitivity","Last scan"], D.assets.map(function(a){ return ['<b>'+a.n+'</b>', a.src, a.own==="Unassigned"?pill("risk","Unassigned"):a.own, '<div class="tags">'+a.cls.map(function(c){return tag(c[0],c[1]);}).join("")+'</div>', '<span class="mono">'+a.rows+'</span>', a.loc, sevPill(a.sens), '<span class="dim">'+a.scan+'</span>']; }), "asset"), '<input class="field" style="height:32px;border:1px solid var(--line);border-radius:8px;padding:0 10px;background:var(--surface)" placeholder="Filter assets" aria-label="Filter assets">', true);
  if(t==="sources") return h+'<div class="g g4">'+D.sources.map(function(s){ return '<div class="card" style="padding:16px;display:grid;gap:8px"><div class="row"><span class="li ic" style="padding:0;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--surface-2)">'+I.db+'</span><b>'+s[0]+'</b></div><span class="muted" style="font-size:13px">'+s[1]+'</span>'+pill(s[2], s[2]==="ok"?"Connected · read-only":s[2]==="risk"?"Token expires in 3 days":"Not connected")+'</div>'; }).join("")+'</div>';
  return h+card("Data security posture findings", table(["Finding","Asset","Severity","Open for","Recommended fix",""], D.findings.map(function(f,i){ return ['<b>'+f.n+'</b>', '<span class="mono">'+esc(f.a)+'</span>', pill(f.sev, f.sev==="act"?"Critical":"High"), f.age, '<span class="muted">'+f.fix+'</span>', f.done?pill("ok","Remediated"):btn("Remediate","remediate",i,"sm")]; })), null, true);
};
}


export function registerDiscoveryActions(runtime, ACT, AFTER) {
  const { $, D, I, S, bar, btn, card, drawer, ledgerAdd, modal, pill, render, sevPill, table, tag, toast } = runtime;
  ACT.scan = function(){ S.tab.discovery="overview"; render(); var box=$("#scanbox"); var steps=["Connecting 12 sources (read-only)","Profiling schemas and metadata","Classifying columns with confidence scores","Comparing with last scan: 18 new assets, 3 new SPI fields","Updating data map, ROPA links and risk scores"]; var i=0;
  box.innerHTML=card("Scan in progress",'<div id="scl"></div>'); var tick=function(){ var el=$("#scl"); if(!el) return; el.innerHTML=steps.map(function(s,k){ return '<div class="row" style="margin-bottom:6px">'+(k<i?pill("ok","Done"):k===i?pill("info","Running"):pill("n","Queued"))+'<span>'+s+'</span></div>'; }).join(""); if(i<steps.length){ i++; setTimeout(tick,700); } else { toast("Scan complete: 18 new assets, 3 new SPI fields"); ledgerAdd("Discovery scan completed","12 sources · 18 new assets"); } }; tick(); }
  ACT.asset = function(i){ var a=D.assets[i];
  drawer(a.n, a.src+" · "+a.loc, '<div class="row">'+sevPill(a.sens)+'<span class="mono dim">'+a.rows+' records</span></div>'+
   '<div><div class="sec-t">Classification · review suggestions</div><div class="card">'+table(["Field","Detected as","Confidence","Signals",""], a.cls.map(function(c,k){ return ['<span class="mono">'+c[0].toLowerCase().replace(/ /g,"_")+'</span>', tag(c[0],c[1]), bar(Math.max(70,a.conf-k*4)), '<span class="dim" style="font-size:12px">pattern · column name · checksum</span>', '<button class="btn sm" data-act="toastm" data-arg="Classification accepted">Accept</button>']; }))+'</div></div>'+
   '<dl class="kv"><dt>Owner</dt><dd>'+a.own+'</dd><dt>Linked processing</dt><dd>'+(i<2?"Loan origination, KYC verification":i===8?"Diwali campaign":"—")+'</dd><dt>Retention rule</dt><dd>'+(i===2?"Marketing leads · 24 months":"By linked processing")+'</dd><dt>Access</dt><dd>'+(i===6?"214 users (over-broad)":"Role-based · 12 users")+'</dd></dl>',
   btn("Assign owner","toastm","Owner assigned and notified")+btn("Link to processing","toastm","Linked to processing activity","p"));
}
  ACT.remediate = function(i){
    D.findings[i].done = true;
    platformApi.remediateFinding(D.findings[i].a).catch(err => {
      console.warn("Failed to persist finding remediation in MongoDB:", err.message);
    });
    ledgerAdd("Security finding remediated", D.findings[i].a);
    render();
    toast("Remediation applied and recorded in the Proof Ledger");
  }
  ACT.addsource = function(){ modal("Connect a data source","Read-only, metadata-first",'<div class="g g3">'+["PostgreSQL","MySQL","Oracle","SQL Server","MongoDB","Snowflake","BigQuery","Databricks","Amazon S3","Azure Blob","Salesforce","Zoho CRM","HubSpot","MoEngage","CleverTap","Freshdesk","Google Workspace","Microsoft 365","SAP","Finacle (file extract)","Endpoint agent"].map(function(n){ return '<button class="btn" style="justify-content:flex-start;height:44px" data-act="toastm" data-arg="'+n+' connector configured with read-only credentials">'+I.db+n+'</button>'; }).join("")+'</div><p class="dim" style="font-size:12.5px">Credentials are stored in a vault, scoped to read-only, and rotated. Raw values are evaluated in place.</p>'); }
}

export default function Discovery({ html }) {
  return <ModuleView html={html} />;
}
