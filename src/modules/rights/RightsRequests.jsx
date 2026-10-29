import ModuleView from "../../components/ModuleView.jsx";
import { platformApi } from "../../platform/platformApi.js";

const RSTEPS=["Received","Verified","Located","Fulfilled","Reviewed","Responded"];

function dsrDrawer(runtime) {
  const { S, btn, drawer, pill, table } = runtime; var r=S.curDsr; var step = S.dsrStep[r.id]!=null ? S.dsrStep[r.id] : r.step;
  var stp='<div class="stepper">'+RSTEPS.map(function(x,k){ return '<div class="stp '+(k<step?"done":k===step?"cur":"")+'"><div class="ln"></div><span>'+x+'</span></div>'; }).join("")+'</div>';
  var body=stp+'<div class="g g3" style="gap:10px"><div class="clock '+(parseInt(r.due)<=5?"hot":"")+'"><small>Statutory clock</small><b>'+(r.due==="Done"||r.due==="—"?r.due:r.due+" left")+'</b><span class="dim" style="font-size:12px">'+(r.t==="Grievance"?"Rule 14 · 90 days":"Policy SLA · 30 days")+'</span></div><div class="clock"><small>Identity</small><b style="font-size:16px">'+(step>=1?"Verified · OTP":"Pending")+'</b></div><div class="clock"><small>Language</small><b style="font-size:16px">'+r.lang+'</b></div></div>'+
   '<dl class="kv"><dt>Type</dt><dd>'+r.t+' · '+r.ref+'</dd><dt>Data principal</dt><dd>'+r.who+'</dd><dt>Channel</dt><dd>'+r.ch+'</dd><dt>Received</dt><dd>'+r.rec+' 2026</dd></dl>';
  if(r.t==="Grievance") body+='<div class="banner r"><span><b>Escalation risk.</b> If not resolved, the data principal may complain to the Data Protection Board (s.13(3)).</span></div><div class="field"><label for="g-r">Response (Tamil and English)</label><textarea id="g-r">We have reviewed your complaint about promotional calls after you withdrew consent. Calls stopped on 29 July. We have confirmed with our collections partner that your number is excluded, and Purpose Guard now blocks marketing use of your record.</textarea></div>';
  else body+='<div><div class="sec-t">Located data · Person Finder</div><div class="card">'+table(["System","Fields","Action"],[["Salesforce CRM","name, email, mobile",r.t==="Erasure"?"Delete":r.t==="Correction"?"Correct":"Include"],["Core (core-db)","Aadhaar, PAN, address",r.t==="Erasure"?pill("risk","Retain · KYC hold"):"Include"],["MoEngage","mobile, consent flags",r.t==="Erasure"?"Delete":"Include"]])+'</div></div>';
  drawer(r.id, r.t+" · "+r.who, body, btn("Write to ledger","toastm","Step recorded in the Proof Ledger")+(step<5?btn("Advance to "+RSTEPS[step+1],"dsradv",null,"p"):pill("ok","Responded")), true);

}

export function createRightsRequestsView(runtime) {
  const { D, btn, card, curTab, head, kpi, pill, table, tabs } = runtime;
  return function(){
  var t=curTab("rights","queue");
  var h=head("Prove","Rights Requests","Access, correction, erasure, nomination and grievances under sections 11 to 14, with statutory clocks and evidence.", btn("Open public portal",null,null,"").replace('data-act="null"','data-act="tab" data-arg="rights|portal"')+btn("Manual request","toastm","Request created from a branch form","p","plus"))+
    tabs("rights",[["queue","All requests"],["grv","Grievances · 2"],["nom","Nominations"],["portal","Rights portal"]]);
  var list = t==="grv"?D.rights.filter(function(r){return r.t==="Grievance";}) : t==="nom"?D.rights.filter(function(r){return r.t==="Nomination";}) : D.rights;
  if(t==="portal") return h+'<div class="g g2" style="align-items:start">'+card("Public rights portal · rights.aarohan.example", '<div class="phone"><div class="ph-top"></div><div class="ph-b"><div style="background:#B45309;color:#fff;border-radius:12px;padding:12px"><b>Data Principal Rights</b><div style="font-size:11.5px;opacity:.9">Access, correct, erase or nominate. Available in 23 languages.</div></div><label style="font-weight:600">What right are you exercising?</label><select style="height:36px;border-radius:8px;border:1px solid #E3E7ED;padding:0 8px"><option>Access my data · s.11</option><option>Correct my data · s.12(2)(a)</option><option>Complete my data · s.12(2)(b)</option><option>Update my data · s.12(2)(c)</option><option>Delete my data · s.12(3)</option><option>Nominate someone · s.14</option><option>Raise a grievance · s.13</option></select><label style="font-weight:600">Registered mobile</label><input style="height:36px;border-radius:8px;border:1px solid #E3E7ED;padding:0 8px" value="+91 98••• ••210"><button class="btn t" style="justify-content:center">Verify with OTP</button><span style="color:#5E6A84;font-size:11px">Response within 90 days (Rule 14). Contact: dpo@aarohan.example</span></div></div>')+card("Portal settings", '<dl class="kv"><dt>Languages</dt><dd>23</dd><dt>Identifiers</dt><dd>Customer ID, mobile, email</dd><dt>Verification</dt><dd>OTP; video KYC for erasure of loan records</dd><dt>Nominee verification</dt><dd>Death certificate or incapacity proof + ID</dd><dt>Clock</dt><dd>90 days for grievances (Rule 14)</dd></dl>')+'</div>';
  return h+(t==="queue"?'<div class="g g4">'+kpi("Open","75","0 overdue","#14B8A6")+kpi("Due in 7 days","5","3 grievances","#F59E0B")+kpi("Median time to close","9 days","Target 30","#3B82F6")+kpi("Closed on time","98%",'<span class="tr">+7 pts</span> this quarter',"#14B8A6")+'</div>':'')+
   card(null, table(["Request","Type","Data principal","Channel","Received","Clock","Status"], list.map(function(r){ return ['<span class="mono"><b>'+r.id+'</b></span>', r.t+'<span class="sub mono">'+r.ref+'</span>', r.who, '<span class="muted">'+r.ch+'</span>', r.rec, r.due==="Done"||r.due==="—"?'<span class="dim">'+r.due+'</span>':'<span class="mono" style="color:var(--'+(parseInt(r.due)<=5?"block":parseInt(r.due)<=15?"mask":"text-2")+')">'+r.due+' left</span>', pill(r.st==="Escalated"?"act":r.st==="Awaiting approval"||r.st==="Drafting"?"risk":r.st==="Responded"||r.st==="Verified"?"ok":"info", r.st)]; }), "dsr"), null, true);
};
}


export function registerRightsRequestsActions(runtime, ACT, AFTER) {
  const { D, S, curTab, ledgerAdd, render, toast } = runtime;
  ACT.dsr = function(i){ var tab=curTab("rights","queue"); var list = tab==="grv"?D.rights.filter(function(r){return r.t==="Grievance";}) : tab==="nom"?D.rights.filter(function(r){return r.t==="Nomination";}) : D.rights; var r=list[i]; S.curDsr=r; dsrDrawer(runtime); }
  ACT.dsradv = function(){
    var r=S.curDsr;
    var s=(S.dsrStep[r.id]!=null?S.dsrStep[r.id]:r.step)+1;
    S.dsrStep[r.id]=s;
    r.st=RSTEPS[s];
    platformApi.advanceRightsStep(r.id, s).catch(err => {
      console.warn("Failed to persist rights step advance in MongoDB:", err.message);
    });
    ledgerAdd("Rights request: "+RSTEPS[s], r.id+" · "+r.t);
    dsrDrawer(runtime);
    render();
    toast(r.id+" moved to "+RSTEPS[s]);
  }
}

export default function RightsRequests({ html }) {
  return <ModuleView html={html} />;
}
