import ModuleView from "../../components/ModuleView.jsx";

export function createRetentionView(runtime) {
  const { D, btn, card, curTab, head, pill, table, tabs } = runtime;
  return function(){
  var t=curTab("retention","sched");
  var h=head("Control","Retention & Deletion","Schedules attached to real data, 48-hour pre-erasure notices, legal holds and proof of deletion.", btn("New rule","toastm","Retention rule created","p","plus"))+tabs("retention",[["sched","Schedules"],["jobs","Deletion jobs"],["notices","Pre-erasure notices"],["holds","Legal holds"]]);
  if(t==="sched") return h+card("Retention schedules", table(["Data category","Rule","Trigger","Next run","Volume","Status"], D.retention.map(function(r){ return ['<b>'+r.c+'</b>', r.rule, r.trig, r.next, '<span class="mono">'+r.n+'</span>', pill(r.st==="Hold"?"risk":r.st==="Retain"?"n":"ok", r.st)]; })), null, true);
  if(t==="jobs") return h+card("Deletion jobs", table(["Job","Scope","Systems","Records","Status"], D.deletionJobs.map(function(j){ return ['<span class="mono">'+j[0]+'</span>','<b>'+j[1]+'</b>',j[2],'<span class="mono">'+j[3]+'</span>',pill(j[5],j[4])]; })), btn("Dry run all","toastm","Dry run queued for 2 jobs","sm"), true);
  if(t==="notices") return h+'<div class="banner t"><span><b>Rule 8 · Third Schedule.</b> Data principals are told at least 48 hours before erasure. Logging in or contacting you cancels the erasure.</span></div>'+card("Pre-erasure notices · dormant app users", table(["Batch","Sent","Channel","Erasure on","Returned","Status"], [["PEN-0112","2,904","SMS + email · 9 languages","2 Nov 02:00","118 logged in",pill("ok","Sent")],["PEN-0111","1,870","SMS + email","26 Oct 02:00","64 logged in",pill("ok","Erasure scheduled")]]), null, true);
  return h+card("Legal holds", table(["Hold","Scope","Reason","Owner","Review"], [["KYC records","customers.kyc, gl-db","RBI KYC Master Direction · PMLA retention","Compliance","Jan 2027"],["Litigation LH-07","3 customers","Pending suit, Pune","Legal","Monthly"],["Security logs","SIEM","Rule 6 · minimum one year","Security","Rolling"]])+'', null, true);
};
}

export default function Retention({ html }) {
  return <ModuleView html={html} />;
}
