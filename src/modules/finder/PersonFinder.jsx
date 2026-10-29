import ModuleView from "../../components/ModuleView.jsx";

function findResults(runtime) {
  const { bar, btn, card, table } = runtime;
  var res=[["Salesforce CRM","Contact · 003Q8…","name, email, mobile, city",98],["Core (core-db)","customers.kyc","Aadhaar, PAN, address, DOB",96],["LOS (los-db)","loan_applications","income, bank account",95],["BigQuery","events_raw","device ID, app events",91],["MoEngage","user profile","mobile, consent flags",88],["Freshdesk","2 tickets","email, free text",79]];
  return card("Priya K. · Customer #4471 · found in 6 systems", table(["System","Record","Fields found","Match","Action"], res.map(function(r){ return ['<b>'+r[0]+'</b>','<span class="mono">'+r[1]+'</span>','<span class="muted">'+r[2]+'</span>',bar(r[3]),'<span class="tag">'+(r[0]==="Core (core-db)"?"Legal hold · KYC":"Eligible")+'</span>']; })), btn("Access package","accesspack",null,"sm")+btn("Correct","fanout",null,"sm")+btn("Erasure dry run","dryrun",null,"sm t"), true)+
   '<p class="dim" style="font-size:12.5px;margin-top:10px">Lookup sha256:5c1e…a07f · values shown as redacted previews · search recorded in the Proof Ledger</p>';

}

export function createPersonFinderView(runtime) {
  const { S, btn, card, head } = runtime;
  return function(){
  return head("Find","Person Finder","Find one data principal across every connected system. Identifiers are hashed in your browser before they reach a connector.")+
   card(null,'<div class="g" style="grid-template-columns:minmax(0,1fr) 200px auto;align-items:end" id="pf-form"><div class="field"><label for="pf-id">Identifier</label><input id="pf-id" value="priya.k@example.in"></div><div class="field"><label for="pf-t">Type</label><select id="pf-t"><option>Email</option><option>Mobile</option><option>Customer ID</option><option>PAN</option></select></div>'+btn("Find this person","find",null,"t","search")+'</div><style>@media(max-width:700px){#pf-form{grid-template-columns:minmax(0,1fr)!important}}</style>')+
   '<div id="pf-out">'+(S.found?findResults(runtime):'<div class="card empty">Enter an identifier to search 12 connected systems.</div>')+'</div>';
};
}


export function registerPersonFinderActions(runtime, ACT, AFTER) {
  const { $, I, S, btn, card, d, hash, ledgerAdd, modal, pill, table } = runtime;
  ACT.find = function(){ var out=$("#pf-out"); var st=["Hash identifier (SHA-256) in browser","Traverse asset graph across 12 connectors","Resolve matches against PII findings","Rank by confidence"]; var i=0;
  var tick=function(){ out.innerHTML=card("Searching", st.map(function(s,k){ return '<div class="row" style="margin-bottom:6px">'+(k<i?pill("ok","Done"):k===i?pill("info","Running"):pill("n","Queued"))+'<span>'+s+'</span></div>'; }).join("")); if(i<st.length){ i++; setTimeout(tick,520); } else { S.found=true; out.innerHTML=findResults(runtime); ledgerAdd("Person Finder search","sha256:5c1e…a07f · 6 systems"); } }; tick(); }
  ACT.accesspack = function(){ modal("Access package · s.11","DSR-2026-0482 · Priya K.", '<div class="card" style="padding:18px;display:grid;gap:10px"><b>Summary of your personal data held by Aarohan Finance</b><dl class="kv"><dt>Identity</dt><dd>Name, date of birth, Aadhaar (masked), PAN (masked)</dd><dt>Contact</dt><dd>Email, mobile, address</dd><dt>Loan</dt><dd>Personal loan PL-88412, income, bank account</dd><dt>Purposes</dt><dd>KYC (legal obligation), credit assessment (consent), offers (consent withdrawn 24 Oct)</dd><dt>Shared with</dt><dd>CIBIL (bureau), MoEngage (processor), AWS (processor)</dd></dl><p class="dim" style="font-size:12.5px">Available in English and Marathi. DPO contact: dpo@aarohan.example</p></div>', btn("Send securely","toastm","Access package sent through the rights portal","p")); }
  ACT.fanout = function(){ var sys=["crm_primary","core_db","los_db","bigquery","moengage"]; modal("Correction fan-out · s.12(2)(a)","Address update · DSR-2026-0481", '<dl class="kv"><dt>Field</dt><dd class="mono">address</dd><dt>Old value</dt><dd class="mono" style="color:var(--block)">12 MG Road, Pune 411001</dd><dt>New value</dt><dd class="mono" style="color:var(--allow)">45 FC Road, Pune 411004</dd></dl><div class="card" id="fo">'+sys.map(function(s){ return '<div class="li"><span class="ic">'+I.db+'</span><span class="mono">'+s+'</span><span data-s>'+pill("n","Queued")+'</span></div>'; }).join("")+'</div><div id="fo-c"></div>', btn("Dispatch correction","fogo",null,"p")); }
  ACT.fogo = function(){ var rows=d.querySelectorAll("#fo [data-s]"), i=0; var t=setInterval(function(){ if(i<rows.length){ rows[i].innerHTML=pill("ok","Confirmed"); i++; } else { clearInterval(t); $("#fo-c").innerHTML='<div class="banner t"><span><b>Certificate issued.</b> 5 of 5 systems confirmed · sha256 '+hash()+'</span></div>'; ledgerAdd("Correction fan-out confirmed","DSR-2026-0481 · 5 of 5 systems"); } }, 450); }
  ACT.dryrun = function(){ modal("Erasure dry run · s.12(3)","Nothing is deleted until two approvers confirm", table(["System","Rows affected","Action"],[["Salesforce CRM","1 contact","Delete"],["BigQuery","1,204 events","Anonymise"],["MoEngage","1 profile","Delete"],["Freshdesk","2 tickets","Redact"],["Core (core-db)","—",pill("risk","Retained · KYC legal hold")],["LOS (los-db)","—",pill("risk","Retained · active loan")]])+'<div class="banner"><span>Retention exceptions are explained in the response to the data principal.</span></div>', btn("Request second approval","toastm","Second approver notified: Arvind S., Head of IT")+btn("Approve as first approver","toastm","First approval recorded in the Proof Ledger","p")); }
}

export default function PersonFinder({ html }) {
  return <ModuleView html={html} />;
}
