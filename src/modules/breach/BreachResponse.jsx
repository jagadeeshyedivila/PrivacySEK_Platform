import ModuleView from "../../components/ModuleView.jsx";

export function createBreachResponseView(runtime) {
  const { D, btn, card, curTab, head, pill, sevPill, table, tabs, tag } = runtime;
  return function(){
  var t=curTab("breach","inc");
  var h=head("Prove","Breach Response","Personal data breaches with the Board intimation, the 72-hour report, CERT-In's 6 hours and notices to people on one timeline.", btn("Declare incident","toastm","Incident INC-2026-020 opened","d","alert"))+tabs("breach",[["inc","INC-2026-019"],["all","All incidents"],["drafts","Notifications"],["play","Playbooks"]]);
  if(t==="all") return h+card(null, table(["Incident","Title","Severity","Affected","Found","Source","Status"], D.incidents.map(function(x){ return ['<span class="mono"><b>'+x.id+'</b></span>',x.n,sevPill(x.sev),x.ppl,x.found,'<span class="muted">'+x.src+'</span>',pill(x.st==="Closed"?"ok":"act",x.st)]; })), null, true);
  if(t==="drafts") return h+'<div class="g g2">'+[["Data Protection Board · initial intimation","Sent 22 Oct 10:42","ok","Nature, extent, timing, location and likely impact of the breach. Impact on 2,318 data principals is being established."],["Data Protection Board · detailed report (72h)","Due in 41 hours","risk","Updated facts, cause (public access policy on bucket), mitigation, findings, remedial steps and notifications made."],["CERT-In incident report","Sent 22 Oct 14:05","ok","Reported under the 2022 Directions within 6 hours, with logs preserved."],["Affected data principals","Draft ready · 9 languages","info","What happened, likely consequences, what we are doing, what you can do (watch for misuse of PAN), and who to contact."]].map(function(n){ return '<div class="card" style="padding:16px;display:grid;gap:8px"><div class="row"><b>'+n[0]+'</b><span class="sp"></span>'+pill(n[2],n[1])+'</div><p class="muted" style="font-size:13.5px">'+n[3]+'</p><div class="row">'+btn("Open draft","toastm","Draft opened","sm")+'</div></div>'; }).join("")+'</div>';
  if(t==="play") return h+'<div class="g g3">'+[["Personal data breach (DPDP)","Board without delay · 72h report · notify people","12 steps"],["Ransomware","Isolate, preserve logs, CERT-In 6h","18 steps"],["Misdirected communication","Recall, notify, assess","8 steps"],["Lost device","Remote wipe, verify encryption","6 steps"],["Vendor breach","Contract clauses, joint notification","10 steps"],["Insider data export","Purpose Guard evidence, HR, legal","9 steps"]].map(function(p){ return '<div class="card" style="padding:16px;display:grid;gap:6px"><b>'+p[0]+'</b><span class="muted" style="font-size:13px">'+p[1]+'</span><span class="dim mono" style="font-size:12px">'+p[2]+'</span></div>'; }).join("")+'</div>';
  var tl=[["22 Oct 09:58","DSPM finding: public bucket with PAN","Discovery"],["22 Oct 10:15","Incident declared · severity High","Meera I."],["22 Oct 10:31","Public access blocked · bucket made private","Security (two approvers)"],["22 Oct 10:42","Initial intimation sent to the Board","DPO"],["22 Oct 14:05","CERT-In report submitted","CISO"],["23 Oct 16:30","Access logs reviewed: 3 external IPs","Security"],["24 Oct 11:00","Affected principals confirmed: 2,318","Person Finder"]];
  return h+'<div class="g g4"><div class="clock hot"><small>Board · detailed report</small><b id="clk72b">41:00:00</b><span class="dim" style="font-size:12px">Rule 7(2) · 72 hours</span></div><div class="clock"><small>Board · initial</small><b style="color:var(--allow)">Sent</b><span class="dim" style="font-size:12px">Without delay · 10:42</span></div><div class="clock"><small>CERT-In</small><b style="color:var(--allow)">Sent</b><span class="dim" style="font-size:12px">6 hours · 14:05</span></div><div class="clock warm"><small>Data principals</small><b>2,318</b><span class="dim" style="font-size:12px">Notice draft ready</span></div></div>'+
   '<div class="g g-7-5">'+card("Timeline", '<div class="list">'+tl.map(function(e){ return '<div class="lg"><span class="t">'+e[0]+'</span><span class="dotc"></span><span><b>'+e[1]+'</b><small>'+e[2]+'</small></span><span></span></div>'; }).join("")+'</div>', null, true)+
   '<div class="g" style="align-content:start">'+card("Impact", '<dl class="kv"><dt>Data</dt><dd><div class="tags">'+tag("PAN","spi")+tag("Email","pii")+'</div></dd><dt>Systems</dt><dd>s3://af-exports/2026/</dd><dt>People</dt><dd>2,318 data principals</dd><dt>Cause</dt><dd>Bucket policy changed during migration</dd><dt>Impact</dt><dd>Download by 3 external IPs confirmed; misuse not yet established</dd></dl>')+
   card("Containment", [["Block public access",true],["Rotate exposed credentials",true],["Preserve logs for CERT-In",true],["Delete exported files after evidence capture",false],["Notify affected principals",false]].map(function(c,k){ return '<div class="row" style="margin-bottom:8px"><button class="switch" role="switch" aria-checked="'+c[1]+'" data-act="sw" aria-label="'+c[0]+'"></button><span>'+c[0]+'</span>'+(k===3?'<span class="sp"></span>'+tag("2 approvers"):'')+'</div>'; }).join(""))+'</div></div>';
};
}


export function registerBreachResponseActions(runtime, ACT, AFTER) {
  const { startClock } = runtime;
  AFTER.breach = function(){ startClock(); }
}

export default function BreachResponse({ html }) {
  return <ModuleView html={html} />;
}
