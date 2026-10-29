import ModuleView from "../../components/ModuleView.jsx";

export function createTrainingView(runtime) {
  const { D, bar, btn, card, head, kpi, table } = runtime;
  return function(){
  return head("Govern","Training","Role-based DPDP training with certificates. Completions are recorded as evidence.", btn("Assign course","toastm","Course assigned to 2 teams","p","plus"))+
   '<div class="g g4">'+kpi("Learners","2,140","6 teams","#3B82F6")+kpi("Completion","79%",'<span class="tr">+12 pts</span> this month',"#14B8A6")+kpi("Certificates issued","1,690","Signed by DPO","#14B8A6")+kpi("Policy attestations","94%","Acceptable use v2","#F59E0B")+'</div>'+
   card("Completion by team", table(["Team","Course","Completion","Due"], D.training.map(function(t){ return ['<b>'+t[0]+'</b>',t[1],bar(t[2],t[2]<60?"r":t[2]<80?"w":""),t[3]]; })), null, true);
};
}

export default function Training({ html }) {
  return <ModuleView html={html} />;
}
