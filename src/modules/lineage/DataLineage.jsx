import ModuleView from "../../components/ModuleView.jsx";

const LE = [[0,3,""],[1,4,""],[1,5,""],[2,4,""],[3,4,""],[3,6,"x"],[4,7,""],[6,8,""],[4,9,"p"],[3,10,""],[4,11,"a"],[9,12,"p"],[7,12,"p"]];

const LN = [["Web & app",60,60,"Channel"],["Branch tablets",60,190,"Channel"],["Call centre",60,320,"Channel"],["LOS (los-db)",300,60,"System"],["Core (core-db)",300,190,"System"],["Gold loan (gl-db)",300,320,"System"],["Salesforce CRM",540,40,"SaaS · Singapore"],["BigQuery",540,150,"Warehouse"],["MoEngage",540,260,"Vendor"],["S3 exports (public)",540,370,"Storage"],["CIBIL",780,60,"Bureau"],["Partner NBFC",780,200,"Vendor"],["Analyst laptop",780,340,"Endpoint"]];

export function createDataLineageView(runtime) {
  const { S, btn, card, head, tag } = runtime;
  return function(){
  var sel = S.sel.ln!=null ? S.sel.ln : 4;
  var edges = LE.map(function(e){ var a=LN[e[0]], b=LN[e[1]]; var c = e[2]==="x"?"#F59E0B":e[2]==="p"?"#EF4444":e[2]==="a"?"#3B82F6":"var(--text-3)";
    var on = e[0]===sel||e[1]===sel; return '<path d="M'+(a[1]+170)+' '+(a[2]+22)+' C'+(a[1]+210)+' '+(a[2]+22)+' '+(b[1]-40)+' '+(b[2]+22)+' '+b[1]+' '+(b[2]+22)+'" fill="none" stroke="'+c+'" stroke-width="'+(on?2.4:1.3)+'" stroke-dasharray="'+(e[2]?"6 5":"0")+'" opacity="'+(on?1:.55)+'"/>'; }).join("");
  var nodes = LN.map(function(n,i){ return '<g class="node'+(i===sel?" sel":"")+'" data-act="lnsel" data-arg="'+i+'"><rect x="'+n[1]+'" y="'+n[2]+'" width="170" height="44" rx="10"/><text x="'+(n[1]+12)+'" y="'+(n[2]+19)+'" style="fill:var(--text);font-weight:600">'+n[0]+'</text><text x="'+(n[1]+12)+'" y="'+(n[2]+34)+'" style="font-size:11px">'+n[3]+'</text></g>'; }).join("");
  var n = LN[sel], out = LE.filter(function(e){return e[0]===sel;}).map(function(e){return LN[e[1]][0];}), inn = LE.filter(function(e){return e[1]===sel;}).map(function(e){return LN[e[0]][0];});
  return head("Find","Data Lineage","How customer data moves between channels, systems, vendors and endpoints. Risky paths are highlighted.", btn("Export map","toastm","Lineage exported as PDF and JSON"))+
   '<div class="g g-8-4">'+card("Live lineage · 13 nodes · 13 flows", '<div class="tw"><svg class="graph" viewBox="0 0 980 430" style="min-width:760px">'+edges+nodes+'</svg></div><div class="row" style="margin-top:8px;font-size:12.5px"><span class="row" style="gap:6px"><i style="width:18px;border-top:2px dashed #EF4444;display:inline-block"></i>Public exposure</span><span class="row" style="gap:6px"><i style="width:18px;border-top:2px dashed #F59E0B;display:inline-block"></i>Cross-border transfer</span><span class="row" style="gap:6px"><i style="width:18px;border-top:2px dashed #3B82F6;display:inline-block"></i>Needs approval</span></div>')+
   card(n[0], '<dl class="kv"><dt>Type</dt><dd>'+n[3]+'</dd><dt>Receives from</dt><dd>'+(inn.join(", ")||"—")+'</dd><dt>Sends to</dt><dd>'+(out.join(", ")||"—")+'</dd><dt>Personal data</dt><dd><div class="tags">'+tag("Aadhaar","spi")+tag("PAN","spi")+tag("Mobile","pii")+'</div></dd></dl>'+
     (sel===9||sel===12?'<div class="banner r" style="margin-top:14px"><span><b>Risky path.</b> PAN values reach a public location.</span></div>':'')+'<div class="row" style="margin-top:14px">'+btn("Find a person's data here",null,null,"sm").replace('data-act="null"','data-go="finder"')+btn("Apply masking policy","toastm","Masking policy applied via Purpose Guard","sm")+'</div>')+'</div>';
};
}


export function registerDataLineageActions(runtime, ACT, AFTER) {
  const { S, render } = runtime;
  ACT.lnsel = function(i){ S.sel.ln=+i; render(); }
}

export default function DataLineage({ html }) {
  return <ModuleView html={html} />;
}
