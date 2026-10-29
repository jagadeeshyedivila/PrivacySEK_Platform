import ModuleView from "../../components/ModuleView.jsx";

export function createVendorRiskView(runtime) {
  const { D, I, bar, btn, card, curTab, head, kpi, pill, sevPill, table, tabs } = runtime;
  return function(){
  var t=curTab("vendors","inv");
  var h=head("Control","Vendor Risk","Every processor and partner that receives personal data, with contracts, DPAs, subprocessors and a risk rating.", btn("Send assessment","sendq",null,"")+btn("Add vendor","toastm","Vendor added to the register","p","plus"))+tabs("vendors",[["inv","Inventory"],["q","Assessments"],["tpl","Templates · "+D.templates.length]]);
  if(t==="inv") return h+'<div class="g g4">'+kpi("Vendors","38","24 process personal data","#3B82F6")+kpi("High risk","4","2 without signed DPA","#EF4444")+kpi("Questionnaires open","6","2 overdue","#F59E0B")+kpi("Subprocessor changes","3","Review this week","#14B8A6")+'</div>'+
    card("Vendor register", table(["Vendor","Service","Personal data","Location","DPA","Assessment","Risk"], D.vendors.map(function(v){ return ['<b>'+v.n+'</b>', v.svc, '<span class="muted">'+v.data+'</span>', v.loc, pill(v.dpa==="Signed"?"ok":v.dpa==="Missing"?"act":"risk", v.dpa), bar(v.q, v.q<60?"r":v.q<90?"w":""), sevPill(v.risk)]; }), "vendor"), null, true);
  if(t==="q") return h+card("Assessments in progress", table(["Vendor","Template","Sent","Progress","Due"], [["Partner NBFC","DPDP processor assessment","18 Oct",bar(40,"r"),"28 Oct"],["Recovery Associates","Collections agency conduct","10 Oct",bar(75,"w"),"Overdue"],["Mailchimp","Subprocessor change review","22 Oct",bar(85),"31 Oct"],["Support copilot vendor","AI vendor assessment","20 Oct",bar(55,"w"),"5 Nov"]])+'', '<span class="dim" style="font-size:12.5px">Vendors answer through a secure link, no login needed</span>', true);
  return h+'<div class="g g4">'+D.templates.map(function(n){ return '<div class="card" style="padding:16px;display:grid;gap:8px"><span class="ic" style="width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:var(--accent-bg);color:var(--accent)">'+I.clip.replace('<svg','<svg width="16" height="16"')+'</span><b>'+n+'</b><span class="dim" style="font-size:12.5px">'+(12+n.length%20)+' questions · scored</span></div>'; }).join("")+'</div>';
};
}


export function registerVendorRiskActions(runtime, ACT, AFTER) {
  const { D, btn, drawer, modal, pill, tag } = runtime;
  ACT.vendor = function(i){ var v=D.vendors[i]; drawer(v.n, v.svc+" · "+v.loc, '<div class="row" style="gap:18px"><div class="donut" style="width:96px;background:conic-gradient('+(v.sc>70?"#EF4444":v.sc>40?"#F59E0B":"#14B8A6")+' '+v.sc*3.6+'deg,var(--surface-2) 0)"><div><b>'+v.sc+'</b><small>risk</small></div></div><dl class="kv" style="flex:1"><dt>Personal data</dt><dd>'+v.data+'</dd><dt>DPA</dt><dd>'+pill(v.dpa==="Signed"?"ok":v.dpa==="Missing"?"act":"risk",v.dpa)+'</dd><dt>Subprocessors</dt><dd>'+v.sub+'</dd><dt>Questionnaire</dt><dd>'+v.q+'% complete</dd></dl></div>'+
  (v.dpa==="Missing"?'<div class="banner r"><span><b>No signed DPA.</b> Purpose Guard routes all sharing with this vendor for approval (s.8(2)).</span></div>':'')+'<div><div class="sec-t">Linked processing</div><div class="tags">'+tag("Loan origination")+tag("Diwali campaign")+'</div></div>', btn("Send questionnaire","sendq")+btn("Request DPA signature","toastm","DPA sent for e-signature","p")); }
  ACT.sendq = function(){ modal("Send assessment","Vendor answers through a secure link", '<div class="g g2"><div class="field"><label for="sq-v">Vendor</label><select id="sq-v">'+D.vendors.map(function(v){return "<option>"+v.n+"</option>";}).join("")+'</select></div><div class="field"><label for="sq-t">Template</label><select id="sq-t">'+D.templates.map(function(v){return "<option>"+v+"</option>";}).join("")+'</select></div><div class="field"><label for="sq-d">Due</label><input id="sq-d" value="7 November 2026"></div><div class="field"><label for="sq-c">Vendor contact</label><input id="sq-c" value="privacy@vendor.example"></div></div>', btn("Send","toastm","Assessment sent. Reminders scheduled.","p")); }
}

export default function VendorRisk({ html }) {
  return <ModuleView html={html} />;
}
