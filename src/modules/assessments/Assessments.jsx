import ModuleView from "../../components/ModuleView.jsx";

export function createAssessmentsView(runtime) {
  const { D, bar, btn, card, curTab, head, sevPill, table, tabs } = runtime;
  return function(){
  var t=curTab("assess","act");
  var h=head("Prove","Assessments","DPIAs, the annual SDF DPIA and audit, legitimate-use, transfer and AI assessments, pre-filled from your data map.", btn("New assessment","toastm","Assessment created from template","p","plus"))+tabs("assess",[["act","Active"],["tpl","Templates · "+D.atemplates.length]]);
  if(t==="tpl") return h+'<div class="g g4">'+D.atemplates.map(function(n){ return '<div class="card" style="padding:16px;display:grid;gap:6px"><b>'+n+'</b><span class="dim" style="font-size:12.5px">Branching questions · scoring · approval route</span></div>'; }).join("")+'</div>';
  return h+card(null, table(["Assessment","Template","Progress","Owner","Due","Risk"], D.assessments.map(function(a){ return ['<b>'+a.n+'</b>', a.t, bar(a.p), a.own, a.due, a.r==="—"?'<span class="dim">—</span>':sevPill(a.r)]; }), "assessRow"), null, true);
};
}


export function registerAssessmentsActions(runtime, ACT, AFTER) {
  const { D, bar, btn, drawer } = runtime;
  ACT.assessRow = function(i){ var a=D.assessments[i]; var secs=[["Describe the processing",100],["Necessity and proportionality",100],["Risks to data principals",a.p>60?80:30],["Algorithmic fairness check (Rule 13)",a.p>60?50:0],["Mitigations",a.p>80?60:0],["Review and sign-off",0]];
  drawer(a.n, a.t+" · owner: "+a.own, '<div class="row">'+bar(a.p)+'</div>'+secs.map(function(s){ return '<div class="row"><span style="flex:1">'+s[0]+'</span><div style="width:160px">'+bar(s[1], s[1]<50?"r":s[1]<100?"w":"")+'</div></div>'; }).join("")+
  '<div><div class="sec-t">Risk matrix</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;max-width:320px">'+[1,2,3,4,2,3,4,4,2,2,3,4,1,2,2,3].map(function(v,k){ var c=["#14B8A6","#5EEAD4","#F59E0B","#EF4444"][v-1]; return '<div style="aspect-ratio:1;border-radius:6px;background:'+c+';opacity:'+(k===6||k===11?1:.35)+'"></div>'; }).join("")+'</div><p class="dim" style="font-size:12px;margin-top:6px">Likelihood × severity. Two risks highlighted.</p></div>', btn("Send for review","toastm","Sent to Legal, Security and DPO","p")); }
}

export default function Assessments({ html }) {
  return <ModuleView html={html} />;
}
