import ModuleView from "../../components/ModuleView.jsx";

export function createIntegrationsView(runtime) {
  const { D, btn, card, head, pill, table } = runtime;
  return function(){
  return head("System","Integrations","Read-only connectors for discovery, sync connectors for consent and deletion, APIs and webhooks for everything else.")+
   '<div class="g g4">'+D.integrations.map(function(x){ return '<div class="card" style="padding:14px;display:grid;gap:8px"><div class="row"><span style="width:32px;height:32px;border-radius:9px;display:grid;place-items:center;background:var(--surface-2);font-weight:700;font-size:13px">'+x[0][0]+'</span><span><b style="display:block">'+x[0]+'</b><span class="dim" style="font-size:12px">'+x[1]+'</span></span></div>'+(x[2]==="ok"?pill("ok","Connected"):x[2]==="risk"?pill("risk","Re-authorise"):'<button class="btn sm" data-act="toastm" data-arg="'+x[0]+' connector configured">Connect</button>')+'</div>'; }).join("")+'</div>'+
   '<div class="g g2">'+card("API keys", table(["Key","Scope","Last used"],[["pk_live_••••3f2a","Consent check (read)","2 s ago"],["pk_live_••••91bd","Consent write","1 min ago"],["sk_live_••••77e0","Admin · rotated 12 Oct","Yesterday"]]), btn("New key","toastm","Key created. Copy it now; it won't be shown again.","sm"), true)+card("Webhooks", table(["Event","Endpoint","Status"],[["consent.withdrawn","crm.aarohan.example/hooks",pill("ok","200 OK")],["guard.blocked","siem.aarohan.example",pill("ok","200 OK")],["dsr.status_changed","servicenow",pill("ok","200 OK")],["breach.declared","pager.aarohan.example",pill("ok","200 OK")]]), '<span class="dim" style="font-size:12px">346 event types</span>', true)+'</div>';
};
}

export default function Integrations({ html }) {
  return <ModuleView html={html} />;
}
