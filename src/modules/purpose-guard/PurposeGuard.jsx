import ModuleView from "../../components/ModuleView.jsx";
import { platformApi } from "../../platform/platformApi.js";
import { loadConsentState } from "../consent/consentData.js";
import { principalById } from "../../platform/principals.js";

const SIM = {
 moe:[[16902,"allow","Marketing consent is active"],[1201,"mask","Consent covers offers but not partner sharing: mobile masked"],[137,"block","Marketing consent withdrawn"]],
 partner:[[4420,"approve","Purpose differs from collection and the DPA is not signed"]],
 bq:[[18240,"mask","Aadhaar, PAN and mobile tokenised for analytics"]],
 csv:[[240112,"block","Bulk KYC export to an unmanaged device is not permitted"]],
 ai:[[1,"mask","SPI removed from the prompt before it leaves"]]
};

const FEEDV = {allow:"Allow",mask:"Mask",approve:"Needs approval",block:"Block",mix:"Mixed"};

// Children's data (DPDP s.9(3)): what may and may not be done with an under-18's records.
// Exempt purposes come from the Fourth Schedule (Rule 12) and are allowed with the reason shown.
export const CHILD_RULES = {
  deny: [["marketing","Marketing offers"],["profiling","Profiling / credit propensity"],["targeted_ads","Targeted advertising"],["behavioural_tracking","Behavioural tracking and analytics"]],
  allow: [["kyc","KYC (legal obligation)"],["account_service","Account and loan servicing"],["safety_location","Real-time location for safety (Fourth Schedule Part B)"]]
};

// Simulator: the Money Smart learner dataset is all children
const CHILD_DATASET = "3";
const CHILD_SIM = {
  "Marketing offers":[[9870,"block","Children's data: no targeted marketing (s.9(3))"]],
  "Analytics":[[9870,"block","Children's data: no behavioural tracking (s.9(3))"]],
  "Co-lending":[[9870,"block","Children's data: sharing for this purpose is not permitted (s.9(2))"]],
  "Customer survey":[[6120,"approve","Guardian-verified records only. Needs DPO approval"],[3750,"block","No verified guardian consent"]],
  "Account service":[[6120,"allow","Exempt purpose with verified guardian consent"],[3750,"block","No verified guardian consent (Rule 10)"]]
};

// Withdrawal blocks come from Consent's propagation records (one per withdrawal)
function withdrawalBlocks() {
  try { return (loadConsentState().propagations || []); } catch (e) { return []; }
}

function feedTable(runtime) {
  const { D, pill, table } = runtime; return table(["Time","Activity","Requested by","Destination","Records","Decision"], D.guard.feed.map(function(f){ return ['<span class="mono dim">'+f[0]+'</span>','<b>'+f[1]+'</b>',f[2],f[3],'<span class="mono">'+f[4]+'</span>', f[5]==="mix"?'<div class="tags">'+pill("allow","16,902")+pill("mask","1,201")+pill("block","137")+'</div>':pill(f[5],FEEDV[f[5]])]; }), "feedRow"); 
}

export function createPurposeGuardView(runtime) {
  const { D, S, btn, card, curTab, head, kpi, pill, table, tabs } = runtime;
  return function(){
  var t=curTab("guard","live");
  var h=head("Control · Standout","Purpose Guard","Checks purpose and consent the moment customer data is used. Every decision is written to the Proof Ledger.", btn("New policy","policy",null,"","plus")+btn("Simulate an export","tab","guard|sim","t","play"))+
    tabs("guard",[["live","Live decisions"],["sim","Simulate"],["policies","Policies · "+D.guard.policies.length],["restrict","Restrictions"],["appr","Approvals · "+S.approvals.length]]);
  if(t==="restrict"){
    var wd=withdrawalBlocks();
    return h+'<div class="g" style="align-items:start">'+
      card('Children: no tracking, profiling or targeted ads <span class="tag">Built-in · s.9(3)</span>',
        '<p class="muted" style="font-size:13px;margin:0 0 10px">Applies to every record whose data principal is under 18. It cannot be switched off or deleted.</p>'+
        table(["Purpose","Decision","Why"], CHILD_RULES.deny.map(function(r){ return ['<b>'+r[1]+'</b>',pill("block","Block"),'<span class="muted">Not allowed for children (s.9(3))</span>']; }).concat(CHILD_RULES.allow.map(function(r){ return ['<b>'+r[1]+'</b>',pill("allow","Allow"),'<span class="muted">'+(r[0]==="safety_location"?"Exempt purpose (Rule 12). The s.9(2) well-being duty still applies":"Allowed with verified guardian consent")+'</span>']; })))+
        '<p class="muted" style="font-size:12.5px;margin:10px 0 0">A Fourth Schedule exemption lifts only s.9(1) and s.9(3). The duty not to harm a child\'s well-being (s.9(2)) always applies.</p>')+
      card('Withdrawn consent: blocked uses <span class="tag">Built-in · s.6(6)</span>',
        wd.length?table(["Rule","Principal","Purposes","Since"], wd.map(function(p){ var who=principalById(p.principalId); return ['<span class="mono">'+p.guardPolicy+'</span>', (who?who.displayName:(p.principalId||"—"))+'<span class="sub mono">'+p.consentId+'</span>', '<span class="muted">'+p.purposes.join(", ")+'</span>', '<span class="mono dim">'+new Date(p.createdAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"})+'</span>']; })):'<div class="empty">No withdrawals yet. A block is added here the moment consent is withdrawn in Consent.</div>',
        btn("Open Consent",null,null,"sm").replace('data-act="null"','data-go="consent"'))+
    '</div>';
  }
  if(t==="live") return h+'<div class="g g4">'+kpi("Decisions today","2,418","Across 9 connected systems","#3B82F6")+kpi("Allowed","2,013","83%","#14B8A6")+kpi("Masked","1,201 fields","Analytics, AI prompts","#F59E0B")+kpi("Blocked","137 records",'<span style="color:var(--block);font-weight:600">consent withdrawn</span>',"#EF4444")+'</div>'+
    card('Live decision feed <span class="v ok" style="margin-left:8px">Live</span>', '<div id="feed">'+feedTable(runtime)+'</div>', '<span class="dim" style="font-size:12.5px">Click a decision for its full context</span>', true);
  if(t==="sim") return h+'<div class="g g-7-5" style="align-items:start">'+card("Simulate a data use", '<div class="g g2"><div class="field"><label for="sm-d">Dataset</label><select id="sm-d"><option value="0">Diwali campaign list · 18,240 customers</option><option value="1">Loan leads · 4,420 leads</option><option value="2">KYC table · 240,112 customers</option><option value="3">Money Smart learners · 9,870 children</option></select></div><div class="field"><label for="sm-to">Destination</label><select id="sm-to"><option value="moe">MoEngage (messaging processor)</option><option value="partner">Partner NBFC (external)</option><option value="bq">BigQuery (analytics)</option><option value="csv">CSV download to laptop</option><option value="ai">AI assistant prompt</option></select></div><div class="field"><label for="sm-p">Purpose</label><select id="sm-p"><option>Marketing offers</option><option>Analytics</option><option>Co-lending</option><option>Customer survey</option><option>Account service</option></select></div><div class="field"><label for="sm-who">Requested by</label><select id="sm-who"><option>Rohan S. · Growth</option><option>Kavya R. · Partnerships</option><option>Vikram P. · Analyst</option></select></div></div><div style="margin-top:14px">'+btn("Evaluate","simrun",null,"p","play")+'</div>')+
    '<div id="sim-out">'+card("Result", '<div class="empty">Choose a dataset, destination and purpose, then evaluate. Purpose Guard checks every record against consent, purpose, sensitivity, destination and jurisdiction.</div>')+'</div></div>';
  if(t==="policies") return h+card("Policies", table(["Policy","When","Then","Scope","Hits","On"], D.guard.policies.map(function(p,i){ return ['<b>'+p.n+'</b>','<span class="muted">'+p.when+'</span>', pill(p.then, {block:"Block",mask:"Mask",approve:"Needs approval",allow:"Allow"}[p.then]), p.scope, '<span class="mono">'+p.hits+'</span>', p.builtIn?'<span class="tag" title="Required by law: cannot be switched off">Built-in</span>':'<button class="switch" role="switch" aria-checked="'+p.on+'" data-act="sw" aria-label="Enable policy"></button>']; })), btn("Templates","toastm","Policy templates for DPDP purposes opened","sm"), true);
  return h+(S.approvals.length?'<div class="g g3">'+S.approvals.map(function(a,i){ return '<div class="card" style="padding:16px;display:grid;gap:10px"><div class="row"><span class="mono dim">'+a.id+'</span><span class="sp"></span>'+pill("approve","Needs approval")+'</div><b style="font-size:15px">'+a.n+'</b><dl class="kv" style="grid-template-columns:90px minmax(0,1fr)"><dt>Requested by</dt><dd>'+a.by+'</dd><dt>Reason</dt><dd>'+a.why+'</dd><dt>Risk</dt><dd style="color:var(--block)">'+a.risk+'</dd><dt>Waiting</dt><dd>'+a.age+'</dd></dl><div class="row">'+btn("Reject","appr",i+"|r","d sm")+btn("Approve with masking","appr",i+"|m","sm")+btn("Approve","appr",i+"|a","p sm")+'</div></div>'; }).join("")+'</div>':card(null,'<div class="empty">No approvals waiting. Every decision is in the Proof Ledger.</div>'));
};
}


export function registerPurposeGuardActions(runtime, ACT, AFTER) {
  const { $, D, S, btn, card, curTab, drawer, fmt, hash, ledgerAdd, modal, nowT, pill, render, table, toast } = runtime;
  AFTER.guard = function(){ if(curTab("guard","live")!=="live") return; var pool=[["Loan status SMS","Ops · system","Gupshup","3,210","allow"],["Collections export","Collections · Neha T.","Recovery Associates","1,104","mask"],["Marketing sync","Growth · system","MoEngage","912","block"],["Copilot prompt with PAN","Support · agent","AI assistant","1","mask"],["Bulk lead share","Partnerships","Partner NBFC","2,100","approve"],["Dashboard refresh","Data · scheduled","BigQuery","88,410","mask"]];
  S.feedTimer=setInterval(function(){ var p=pool[Math.floor(Math.random()*pool.length)]; D.guard.feed.unshift([nowT()].concat(p)); D.guard.feed=D.guard.feed.slice(0,9); var f=$("#feed"); if(f){ f.innerHTML=feedTable(runtime); var r=f.querySelector("tbody tr"); if(r) r.classList.add("hl"); } }, 3500); }
  ACT.feedRow = function(i){ var f=D.guard.feed[i]; var v=f[5]==="mix"?"block":f[5];
  drawer(f[1], f[0]+" · "+f[3], '<div class="row">'+pill(v, f[5]==="mix"?"Mixed: allow · mask · block":FEEDV[v])+'</div><dl class="kv"><dt>Requested by</dt><dd>'+f[2]+'</dd><dt>Destination</dt><dd>'+f[3]+'</dd><dt>Records</dt><dd class="mono">'+f[4]+'</dd><dt>Purpose</dt><dd>'+(f[3]==="BigQuery"?"Analytics":f[3]==="Partner NBFC"?"Co-lending":"Marketing offers")+'</dd><dt>Policy matched</dt><dd>'+D.guard.policies[f[5]==="mask"?1:f[5]==="approve"?2:0].n+'</dd><dt>Consent check</dt><dd>Per record against 1.21M receipts</dd><dt>Ledger</dt><dd class="mono">'+hash()+'</dd></dl>'+
   (f[5]==="mix"?'<div class="card">'+table(["Outcome","Records","Why"],[[pill("allow","Allow"),"16,902","Marketing consent active"],[pill("mask","Mask"),"1,201","Consent covers offers, not partner sharing: mobile masked"],[pill("block","Block"),"137","Consent withdrawn (incl. Customer #4471 at 14:02)"]])+'</div>':""), btn("Open in Proof Ledger",null,null).replace('data-act="null"','data-go="ledger"')); }
  ACT.simrun = function(){ var to=$("#sm-to").value, res=$("#sm-d").value===CHILD_DATASET?CHILD_SIM[$("#sm-p").value]:SIM[to], tot=res.reduce(function(a,r){return a+r[0];},0); var out=$("#sim-out");
  out.innerHTML=card("Evaluating…",'<div class="row">'+pill("info","Resolving consent for "+fmt(tot)+" records")+'</div>');
  setTimeout(function(){ out.innerHTML=card("Result · "+fmt(tot)+" records", res.map(function(r){ var pct=Math.round(r[0]/tot*100); return '<div style="margin-bottom:12px"><div class="row">'+pill(r[1],FEEDV[r[1]])+'<b class="mono">'+fmt(r[0])+'</b><span class="sp"></span><span class="dim mono">'+pct+'%</span></div><div class="bar '+(r[1]==="block"?"r":r[1]==="mask"?"w":"")+'" style="margin:8px 0"><span style="width:'+pct+'%;'+(r[1]==="approve"?"background:#3B82F6":"")+'"></span></div><span class="muted" style="font-size:13px">'+r[2]+'</span></div>'; }).join("")+'<div class="row" style="margin-top:6px">'+btn("Write decision to Proof Ledger","simledger",null,"p sm")+'</div>'); },900); }
  ACT.simledger = function(){ ledgerAdd("Purpose Guard decision", $("#sm-to").selectedOptions[0].text); toast("Decision written to the Proof Ledger"); }
  ACT.appr = function(a){
    var p=a.split("|"), x=S.approvals[+p[0]];
    S.approvals.splice(+p[0],1);
    platformApi.submitGuardDecision(x.id, p[1]).catch(err => {
      console.warn("Failed to persist Purpose Guard decision in MongoDB:", err.message);
    });
    ledgerAdd({r:"Approval rejected",m:"Approved with masking",a:"Approval granted"}[p[1]], x.id+" · "+x.n);
    render();
    toast({r:"Rejected. Requester notified with the reason.",m:"Approved with identifiers masked.",a:"Approved and recorded in the Proof Ledger."}[p[1]]);
  }
  ACT.policy = function(){ modal("New Purpose Guard policy","Policies are versioned and every change is recorded", '<div class="g g3"><div class="field"><label for="np-p">If purpose is</label><select id="np-p"><option>Marketing</option><option>Analytics</option><option>Co-lending</option><option>Any</option></select></div><div class="field"><label for="np-d">and data includes</label><select id="np-d"><option>Aadhaar / PAN</option><option>Mobile</option><option>Children\'s data</option><option>Any personal data</option></select></div><div class="field"><label for="np-to">and destination is</label><select id="np-to"><option>External partner</option><option>Messaging tool</option><option>AI assistant</option><option>Endpoint download</option></select></div></div><div><div class="sec-t">Then</div><div class="chipsel" id="np-v">'+["Allow","Warn","Require justification","Mask","Needs approval","Block","Escalate to incident"].map(function(v,k){ return '<button aria-pressed="'+(k===4)+'" data-act="chip">'+v+'</button>'; }).join("")+'</div></div><div class="field"><label for="np-a">Approver</label><select id="np-a"><option>DPO (Meera Iyer)</option><option>Head of Security</option></select></div>', btn("Save as draft","toastm","Policy saved as draft")+btn("Activate policy","toastm","Policy activated and versioned in the Proof Ledger","p")); }
  ACT.chip = function(a, el){ el.parentNode.querySelectorAll("button").forEach(function(b){ b.setAttribute("aria-pressed", b===el); }); }
}

export default function PurposeGuard({ html }) {
  return <ModuleView html={html} />;
}
