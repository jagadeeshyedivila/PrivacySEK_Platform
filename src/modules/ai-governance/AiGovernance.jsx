import ModuleView from "../../components/ModuleView.jsx";

export function createAiGovernanceView(runtime) {
  const { D, btn, card, head, kpi, pill, sevPill, table } = runtime;
  return function(){
  return head("Govern","AI Governance","AI systems and use cases that touch personal data, their risk tier and the guardrails Purpose Guard applies.", btn("Register AI system","toastm","AI system registered","p","plus"))+
   '<div class="g g4">'+kpi("AI systems","5","2 high risk","#3B82F6")+kpi("Prompts with SPI masked","312","Last 7 days","#F59E0B")+kpi("Assessments due","2","Rule 13 algorithm check","#EF4444")+kpi("System cards","3 shared","Board, auditor, customer","#14B8A6")+'</div>'+
   card("AI inventory", table(["AI system","Type","Personal data","Risk tier","Human oversight","Status"], D.ai.map(function(a){ return ['<b>'+a.n+'</b>',a.type,'<span class="muted">'+a.data+'</span>',sevPill(a.tier),a.hl,pill(/Assess|DPIA/.test(a.st)?"risk":"ok",a.st)]; }), "aiRow"), '<span class="dim" style="font-size:12.5px">EU AI Act tiers · DPDP Rule 13</span>', true);
};
}


export function registerAiGovernanceActions(runtime, ACT, AFTER) {
  const { D, btn, drawer, sevPill } = runtime;
  ACT.aiRow = function(i){ var a=D.ai[i]; drawer(a.n,"System card · "+a.type,'<dl class="kv"><dt>Purpose</dt><dd>'+(i===0?"Assist credit officers in loan decisions":i===1?"Flag suspicious transactions":"Assist staff")+'</dd><dt>Personal data</dt><dd>'+a.data+'</dd><dt>Risk tier</dt><dd>'+sevPill(a.tier)+'</dd><dt>Oversight</dt><dd>'+a.hl+'</dd><dt>Guardrails</dt><dd>Purpose Guard: no SPI in prompts; outputs logged</dd><dt>Owner</dt><dd>Risk</dd></dl><div class="banner"><span>'+(i===0?"Rule 13 algorithmic check scheduled with the annual DPIA.":"Next review in 90 days.")+'</span></div>', btn("Share system card","toastm","System card shared as PDF","p")); }
}

export default function AiGovernance({ html }) {
  return <ModuleView html={html} />;
}
