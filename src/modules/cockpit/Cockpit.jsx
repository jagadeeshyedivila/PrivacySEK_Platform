import ModuleView from "../../components/ModuleView.jsx";

const JUR_DUTIES = {
 GDPR:[["Lawful basis recorded","Art. 6","ok","Met"],["Consent demonstrable","Art. 7","risk","At risk"],["Records of processing","Art. 30","ok","Met"],["DPIA for high risk","Art. 35","risk","1 open"],["Processor contracts","Art. 28","risk","2 missing"],["Breach notification 72h","Art. 33","ok","Ready"],["Data subject rights in 1 month","Art. 12–22","ok","Met"],["International transfers","Chapter V","ok","SCCs on file"]],
 CCPA:[["Notice at collection","§1798.100","ok","Met"],["Right to know / delete / correct","§1798.105–110","ok","Met"],["Opt-out of sale or sharing","§1798.120","risk","Signal not honoured on 1 site"],["Limit use of sensitive PI","§1798.121","ok","Met"],["Service provider contracts","§1798.140","risk","1 missing"],["Risk assessments","CPPA regs","n","Not in scope"]]
};

export function createCockpitView(runtime) {
  const { D, I, S, bar, btn, card, head, kpi, ledRow, pill, stl, table } = runtime;
  return function(){
  var days = Math.round((new Date(2027,4,13) - new Date(2026,9,24))/864e5);
  var score = Math.round(D.duties.reduce(function(a,x){return a+x.score;},0)/D.duties.length);
  var rows, cols;
  if(S.jur==="DPDP"){
    cols=["Duty","Status","Owner","Evidence","Next action"];
    rows=D.duties.map(function(x){ return ['<b>'+x.n+'</b><span class="sub mono">'+x.ref+'</span>', pill(stl(x.st), x.stt), x.owner, '<span class="mono">'+x.ev+'</span>', '<span class="muted">'+x.next+'</span>']; });
  } else {
    cols=["Obligation","Status"]; rows=JUR_DUTIES[S.jur].map(function(x){ return ['<b>'+x[0]+'</b><span class="sub mono">'+x[1]+'</span>', pill(x[2], x[3])]; });
  }
  var actions=[["alert","Detailed breach report due to the Board","INC-2026-019 · 41 hours left","breach","act"],["inbox","3 grievances due within 4 days","Rule 14 · 90-day clock","rights","act"],["shield","3 Purpose Guard approvals waiting","Partner share · survey export · off-hours","guard","risk"],
    ["check","5,092 consents under an older notice","Trigger a re-consent campaign","consent","risk"],["search","Public bucket holds PAN values","s3://af-exports/2026/","discovery","act"],["user","38 minor records need guardian verification","s.9 · Rule 10","consent","risk"]];
  var al = actions.map(function(a){ return '<div class="li" style="cursor:pointer" data-go="'+a[3]+'"><span class="ic" style="color:var(--'+(a[4]==="act"?"block":"mask")+')">'+I[a[0]]+'</span><span><b>'+a[1]+'</b><small>'+a[2]+'</small></span><span class="dim">'+I.arrow.replace('<svg','<svg width="16" height="16"')+'</span></div>'; }).join("");
  var pillars=[["Find",86,"1,240 assets · 98% classified"],["Control",79,"Consent, Purpose Guard, vendors"],["Prove",88,"Rights, breach, evidence"]];
  return head("Saturday, 24 October 2026 · "+D.org.bu[S.bu], 'Good afternoon, Meera', "Your DPDP duties, what needs a decision today, and the clocks that are running.",
      btn("Board pack","boardpack",null,"","down")+btn("Regulator Pack","pack",null,"t","chain"))+
   '<div class="banner r"><span style="color:var(--block)">'+I.alert.replace('<svg','<svg width="20" height="20"')+'</span><span><b>Breach clock running.</b> Detailed report on INC-2026-019 is due to the Data Protection Board in 41 hours.</span><span class="r">'+btn("Open incident",null,null,"sm").replace('data-act="null"','data-go="breach"')+'</span></div>'+
   '<div class="g g4">'+
     '<div class="card kpi" style="--k:#14B8A6"><small>DPDP readiness</small><div class="row" style="gap:14px"><div class="donut" style="width:74px;background:conic-gradient(#14B8A6 '+score*3.6+'deg,var(--surface-2) 0)"><div><b style="font-size:17px">'+score+'</b></div></div><span>'+D.duties.filter(function(x){return x.st==="ok";}).length+' of '+D.duties.length+' duties met<br><span class="tr">+6 this month</span></span></div></div>'+
     kpi("Days to 13 May 2027", days, "Main DPDP duties and penalties apply", "#3B82F6")+
     kpi("Open rights requests", "75", '<span class="tr">0 overdue</span> · 3 grievances due', "#F59E0B")+
     kpi("Purpose Guard today", "2,418", '<span style="color:var(--block);font-weight:600">137 blocked</span> · 1,201 masked', "#EF4444")+
   '</div>'+
   '<div class="g g-8-4">'+card((S.jur==="DPDP"?"DPDP duties":S.jur+" obligations")+' <span class="dim mono" style="font-weight:400;font-size:12px;margin-left:6px">'+(S.jur==="DPDP"?"Act 2023 · Rules 2025":"jurisdiction lens")+'</span>', table(cols, rows, S.jur==="DPDP"?"duty":null), '<span class="dim" style="font-size:12.5px">Status computed from live signals</span>', true)+
   '<div class="g" style="align-content:start">'+card("Needs your decision", '<div class="list">'+al+'</div>', null, true)+
   card("Statutory clocks", '<div class="g" style="gap:10px"><div class="clock hot"><small>Board report · Rule 7</small><b id="clk72">41:00:00</b><span class="muted" style="font-size:12.5px">INC-2026-019</span></div><div class="clock warm"><small>Grievance · Rule 14</small><b>4 days</b><span class="muted" style="font-size:12.5px">GRV-2026-0471 · Tamil</span></div><div class="clock"><small>Pre-erasure notices · Rule 8</small><b>2,904 sent</b><span class="muted" style="font-size:12.5px">Erasure runs 2 Nov</span></div></div>')+'</div></div>'+
   '<div class="g g3">'+pillars.map(function(p){ return card(p[0], '<div class="row"><b style="font-size:26px;letter-spacing:-.03em">'+p[1]+'</b><span class="dim">/ 100</span></div>'+bar(p[1])+'<p class="muted" style="margin-top:8px;font-size:13px">'+p[2]+'</p>'); }).join("")+'</div>'+
   card("Latest evidence", '<div class="list">'+D.ledger.slice(0,4).map(ledRow).join("")+'</div>', btn("Open Proof Ledger",null,null,"sm").replace('data-act="null"','data-go="ledger"'), true);
};
}


export function registerCockpitActions(runtime, ACT, AFTER) {
  const { D, I, bar, btn, drawer, esc, pill, startClock, stl } = runtime;
  AFTER.cockpit = function(){ startClock(); }
  ACT.duty = function(i){ var x=D.duties[i];
  drawer(x.n, x.ref+" · owner: "+x.owner,
   '<div class="row">'+pill(stl(x.st), x.stt)+'<span class="dim">Score</span><div style="flex:1">'+bar(x.score, x.score<70?"r":x.score<85?"w":"")+'</div></div>'+
   '<div><div class="sec-t">Live signals</div><div class="list card">'+x.sig.map(function(s){ return '<div class="li"><span class="ic">'+I.spark+'</span><span>'+esc(s)+'</span><span></span></div>'; }).join("")+'</div></div>'+
   '<dl class="kv"><dt>Evidence</dt><dd class="mono">'+x.ev+'</dd><dt>Next action</dt><dd>'+x.next+'</dd><dt>Last attested</dt><dd>18 Oct 2026 by '+x.owner+' lead</dd><dt>Source</dt><dd>DPDP Act 2023, DPDP Rules 2025</dd></dl>'+
   '<p class="dim" style="font-size:12.5px">Operational mapping, not legal advice. Confirm interpretation with counsel.</p>',
   btn("Request attestation","toastm","Attestation requested from "+x.owner)+btn("Add evidence to ledger","toastm","Evidence linked and written to the Proof Ledger","p"));
}
}

export default function Cockpit({ html }) {
  return <ModuleView html={html} />;
}
