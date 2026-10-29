import ModuleView from "../../components/ModuleView.jsx";

function lineChart(vals, labels, color){ var w=520,h=170,p=28,max=100,min=Math.min.apply(null,vals)-10; var x=function(i){return p+i*(w-2*p)/(vals.length-1);}, y=function(v){return h-p-(v-min)/(max-min)*(h-2*p);};
  var path=vals.map(function(v,i){return (i?"L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1);}).join(" ");
  return '<svg viewBox="0 0 '+w+' '+h+'" style="width:100%;height:auto">'+[min,(min+max)/2,max].map(function(g){ return '<line x1="'+p+'" x2="'+(w-p)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--line)" /><text x="2" y="'+(y(g)+4)+'" font-size="10" fill="var(--text-3)">'+Math.round(g)+'%</text>'; }).join("")+
   '<path d="'+path+' L'+x(vals.length-1)+' '+(h-p)+' L'+x(0)+' '+(h-p)+'Z" fill="'+color+'" opacity=".12"/><path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2.2"/>'+
   vals.map(function(v,i){ return (i===vals.length-1?'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="4" fill="'+color+'"/><text x="'+(x(i)-8)+'" y="'+(y(v)-10)+'" font-size="11" font-weight="600" fill="var(--text)">'+v+'%</text>':'')+'<text x="'+(x(i)-10)+'" y="'+(h-8)+'" font-size="10" fill="var(--text-3)">'+labels[i]+'</text>'; }).join("")+'</svg>'; }

export function createReportsView(runtime) {
  const { btn, card, head, table } = runtime;
  return function(){
  var mo=["May","Jun","Jul","Aug","Sep","Oct"];
  var stack=[[88,9,3],[86,10,4],[84,11,5],[83,12,5],[84,11,5],[83,12,5]];
  return head("Prove","Reports","Operational evidence across every module, and a board pack in one click.", btn("Schedule","toastm","Board pack scheduled quarterly with DPO approval")+btn("Generate Q3 board pack","boardpack",null,"p","down"))+
   '<div class="g g2">'+card("Rights requests closed on time", lineChart([84,87,91,93,96,98],mo,"#14B8A6"))+card("Consents under current notice", lineChart([61,66,74,80,88,93],mo,"#3B82F6"))+'</div>'+
   '<div class="g g2">'+card("Purpose Guard outcomes", '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;align-items:end;height:170px">'+stack.map(function(s,i){ return '<div style="display:grid;gap:4px;height:100%;align-content:end"><div style="display:flex;flex-direction:column-reverse;height:140px;border-radius:6px;overflow:hidden"><div style="height:'+s[0]+'%;background:#14B8A6"></div><div style="height:'+s[1]+'%;background:#F59E0B"></div><div style="height:'+s[2]+'%;background:#EF4444"></div></div><span class="dim mono" style="font-size:10.5px;text-align:center">'+mo[i]+'</span></div>'; }).join("")+'</div><div class="legend" style="grid-auto-flow:column;margin-top:10px"><span><i style="background:#14B8A6"></i>Allow</span><span><i style="background:#F59E0B"></i>Mask</span><span><i style="background:#EF4444"></i>Block</span></div>')+
   card("Scheduled reports", table(["Report","Audience","Cadence","Next"],[["Board privacy pack","Board & audit committee","Quarterly","1 Jan"],["DPO weekly","DPO, CISO","Weekly","Mon 09:00"],["Rights SLA","Operations heads","Monthly","1 Nov"],["Vendor risk","Procurement","Monthly","1 Nov"]]), null, true)+'</div>';
};
}


export function registerReportsActions(runtime, ACT, AFTER) {
  const { btn, modal } = runtime;
  ACT.boardpack = function(){ modal("Q3 2026 board privacy pack","Ready for approval", '<div class="g g3" style="gap:10px">'+[["DPDP duties met","11 / 14"],["Rights on time","98%"],["Consents on current notice","93%"],["Vendors with DPA","88%"],["Breaches","1 open · 2 closed"],["Days to 13 May 2027",""+Math.round((new Date(2027,4,13)-new Date(2026,9,24))/864e5)]].map(function(k){ return '<div class="clock"><small>'+k[0]+'</small><b>'+k[1]+'</b></div>'; }).join("")+'</div><p class="muted">Includes trends, open risks with owners, the breach summary for INC-2026-019 and the plan to 13 May 2027.</p>', btn("Send to DPO for approval","toastm","Sent for approval. It will be shared with the board once approved.","p")); }
}

export default function Reports({ html }) {
  return <ModuleView html={html} />;
}
