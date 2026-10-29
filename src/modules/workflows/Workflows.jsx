import ModuleView from "../../components/ModuleView.jsx";

export function createWorkflowsView(runtime) {
  const { D, btn, card, head, pill, table } = runtime;
  return function(){
  return head("Govern","Workflows","No-code automations: triggers, conditions and actions across every module.", btn("New workflow","toastm","Blank workflow created","p","plus"))+
   '<div class="g g-7-5" style="align-items:start">'+card("DSAR SLA escalation · v1 · active", '<div class="flow-canvas"><svg width="100%" height="380" style="position:absolute;inset:0" aria-hidden="true"><path d="M300 75 C300 110 160 110 160 150" stroke="var(--text-3)" fill="none" stroke-dasharray="5 4"/><path d="M300 75 C300 110 420 110 420 150" stroke="var(--text-3)" fill="none" stroke-dasharray="5 4"/><path d="M420 200 C420 240 300 240 300 280" stroke="#14B8A6" fill="none" stroke-dasharray="5 4"/><path d="M420 200 C420 240 540 240 540 280" stroke="#EF4444" fill="none" stroke-dasharray="5 4"/></svg>'+
     '<div class="fnode tr" style="left:205px;top:24px"><small>Trigger</small><b>Request SLA at 50 / 75 / 90%</b></div><div class="fnode ac" style="left:40px;top:150px"><small>Action</small><b>Email request owner</b></div><div class="fnode co" style="left:325px;top:150px"><small>Condition</small><b>Critical (> 90%)?</b></div><div class="fnode ac" style="left:205px;top:280px"><small>Action · yes</small><b>Alert DPO + escalate</b></div><div class="fnode" style="left:445px;top:280px"><small>Action · no</small><b>Log warning</b></div></div>')+
   card("All workflows", table(["Workflow","Trigger","Size","Status"], D.workflows.map(function(w){ return ['<b>'+w[0]+'</b>','<span class="muted">'+w[1]+'</span>',w[2],pill(w[3]==="Active"?"ok":"n",w[3])]; })), null, true)+'</div>';
};
}

export default function Workflows({ html }) {
  return <ModuleView html={html} />;
}
