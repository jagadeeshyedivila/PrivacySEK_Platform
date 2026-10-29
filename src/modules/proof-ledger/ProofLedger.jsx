import ModuleView from "../../components/ModuleView.jsx";

export function createProofLedgerView(runtime) {
  const { D, S, btn, card, head, kpi, ledRow } = runtime;
  return function(){
  var f = S.lf || "All", map={All:"",Consent:"onsent",Rights:"ights",Guard:"Purpose Guard",Breach:"reach",Notices:"otice"};
  var rows = D.ledger.filter(function(e){ return !map[f] || (e[1]+e[2]).indexOf(map[f])>-1; });
  return head("Prove · Standout","Proof Ledger","Every privacy action, hash-chained so any later change is detectable. Generate a Regulator Pack for any person, obligation, incident or period.", btn("Verify chain","verify",null,"","lock")+btn("Generate Regulator Pack","pack",null,"t","chain"))+
   '<div class="g g4">'+kpi("Ledger entries","1.48M","Since go-live","#14B8A6")+kpi("Chain status",'<span style="color:var(--allow)">Verified</span>',"09:00 today · 0 breaks","#14B8A6")+kpi("Regulator Packs","23","This year","#3B82F6")+kpi("Retention","Hashed identifiers","Proof survives erasure","#3B82F6")+'</div>'+
   card(null,'<div class="chipsel" style="margin-bottom:6px">'+Object.keys(map).map(function(k){ return '<button aria-pressed="'+(f===k)+'" data-act="lf" data-arg="'+k+'">'+k+'</button>'; }).join("")+'</div>')+
   card("Timeline", '<div class="list" id="ledger">'+rows.map(ledRow).join("")+'</div>', '<span class="dim mono" style="font-size:12px">sha256 · prev-hash chained</span>', true);
};
}


export function registerProofLedgerActions(runtime, ACT, AFTER) {
  const { $, S, bar, btn, fmt, hash, ledgerAdd, modal, pill, render } = runtime;
  ACT.lf = function(f){ S.lf=f; render(); }
  ACT.verify = function(){ modal("Verifying chain","Recomputing hashes", '<div id="vf"></div>'); var n=0, el=$("#vf"); var t=setInterval(function(){ n+=137000; if(!$("#vf")){ clearInterval(t); return; } if(n>=1480000){ clearInterval(t); el.innerHTML='<div class="banner t"><span><b>Chain verified.</b> 1,480,212 entries · 0 breaks · head '+hash()+'</span></div>'; ledgerAdd("Ledger chain verified","1,480,212 entries"); } else el.innerHTML=bar(Math.round(n/14800))+'<p class="mono dim" style="margin-top:8px">'+fmt(n)+' entries checked</p>'; }, 160); }
  ACT.pack = function(){ modal("Generate Regulator Pack","Signed PDF + JSON, verifiable without workspace access", '<div class="g g2"><div class="field"><label for="rp-s">Scope</label><select id="rp-s"><option>A data principal</option><option>An obligation</option><option>An incident</option><option>A period</option></select></div><div class="field"><label for="rp-w">Subject</label><input id="rp-w" value="Customer #4471 (Priya K.)"></div><div class="field"><label for="rp-f">From</label><input id="rp-f" value="1 Jan 2026"></div><div class="field"><label for="rp-t">To</label><input id="rp-t" value="24 Oct 2026"></div></div><div id="rp-out"></div>', btn("Generate","packgo",null,"p")); }
  ACT.packgo = function(){ var o=$("#rp-out"), st=["Collecting 14 ledger entries","Attaching notices v3.2 (Marathi) and consent receipts","Adding Purpose Guard decisions with approvers","Building verification page with chain hashes","Signing PDF and JSON"], i=0;
  var tick=function(){ if(!$("#rp-out")) return; o.innerHTML=st.map(function(s,k){ return '<div class="row" style="margin-bottom:6px">'+(k<i?pill("ok","Done"):k===i?pill("info","Working"):pill("n","Queued"))+'<span>'+s+'</span></div>'; }).join(""); if(i<st.length){ i++; setTimeout(tick,450); } else {
    o.innerHTML='<div class="g g4" style="gap:8px">'+["Cover summary","Timeline of events","Notices & consents","Decisions & approvers","Rights requests","Verification page"].slice(0,4).map(function(p,k){ return '<div style="aspect-ratio:3/4;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);padding:10px;display:grid;align-content:space-between"><span class="mono dim" style="font-size:10px">p.'+(k+1)+'</span><b style="font-size:12px">'+p+'</b></div>'; }).join("")+'</div><div class="banner t" style="margin-top:12px"><span><b>Regulator Pack ready.</b> RP-2026-0024 · 9 pages · sha256 '+hash()+'</span></div>'; ledgerAdd("Regulator Pack generated","Customer #4471 · RP-2026-0024"); } }; tick(); }
}

export default function ProofLedger({ html }) {
  return <ModuleView html={html} />;
}
