import ModuleView from "../../components/ModuleView.jsx";

export function createTrustCenterView(runtime) {
  const { I, btn, card, head } = runtime;
  return function(){
  return head("Govern","Trust Center","A public privacy hub at trust.aarohan.example, generated from your live records.", btn("Preview",null,null,"").replace('data-act="null"','data-act="toastm" data-arg="Opening trust.aarohan.example"')+btn("Publish","toastm","Trust Center published","p"))+
   '<div class="g g-7-5" style="align-items:start">'+card("Preview", '<div style="border:1px solid var(--line);border-radius:14px;overflow:hidden"><div style="background:#B45309;color:#fff;padding:22px"><div style="font-size:12px;opacity:.85">Aarohan Finance</div><b style="font-size:22px">Trust & Privacy</b><div style="opacity:.9;font-size:13px;margin-top:4px">How we protect and use your data</div></div><div style="padding:16px;display:grid;gap:10px">'+[["Privacy notice","v3.2 · 23 languages"],["Exercise your rights","Access, correct, erase, nominate, grievance"],["Grievance officer & DPO","Meera Iyer · dpo@aarohan.example"],["Subprocessors","24 vendors · updated 2 days ago"],["Security overview","Request access to reports"]].map(function(s){ return '<div class="li" style="border:1px solid var(--line-2);border-radius:12px"><span class="ic">'+I.doc+'</span><span><b>'+s[0]+'</b><small>'+s[1]+'</small></span><span class="dim">'+I.arrow.replace('<svg','<svg width="14" height="14"')+'</span></div>'; }).join("")+'</div></div>')+
   card("Sections", [["Privacy notice",true],["Rights portal",true],["DPO contact (Rule 9)",true],["Subprocessor list",true],["Security overview (gated)",true],["Cookie preferences",true],["Certifications",false]].map(function(s){ return '<div class="row" style="margin-bottom:10px"><button class="switch" role="switch" aria-checked="'+s[1]+'" data-act="sw" aria-label="'+s[0]+'"></button><span>'+s[0]+'</span></div>'; }).join(""))+'</div>';
};
}

export default function TrustCenter({ html }) {
  return <ModuleView html={html} />;
}
