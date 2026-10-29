import ModuleView from "../../components/ModuleView.jsx";
import { platformApi } from "../../platform/platformApi.js";

const CATS = {"Identity":[["Full name","pii"],["Date of birth","pii"],["Aadhaar","spi"],["PAN","spi"],["Passport","spi"],["Voter ID","spi"],["Photo","spi"]],"Contact":[["Mobile","pii"],["Email","pii"],["Address","pii"]],"Financial":[["Bank account","spi"],["UPI ID","spi"],["Card number","spi"],["Income","spi"],["CIBIL score","spi"],["Transaction history","spi"]],"Digital":[["IP address","pii"],["Device ID","pii"],["Cookie data","pii"],["Location","pii"]]};

export function createDataMapRopaView(runtime) {
  const { D, btn, card, head, kpi, pill, sevPill, table, tag } = runtime;
  return function(){
  return head("Find","Data Map & ROPA","Records of processing that stay connected to reality. Industry pack active: NBFC & lending.", btn("Import spreadsheet","toastm","Template downloaded: ropa_import.xlsx")+btn("Export register","toastm","Register exported for the regulator")+btn("Register activity","wiz",null,"p","plus"))+
   '<div class="g g4">'+kpi("Processing activities",D.ropa.length+42,"Across 3 business units","#14B8A6")+kpi("Linked systems","31","From discovery","#3B82F6")+kpi("Attestations due","4","Owners reminded","#F59E0B")+kpi("High-risk activities","9","6 with DPIA","#EF4444")+'</div>'+
   card("Processing register", table(["Activity","Purpose","Lawful basis","Data categories","Systems","Recipients","Retention","Risk","Attestation"], D.ropa.map(function(r){ return ['<b>'+r.n+'</b><span class="sub">'+r.own+'</span>', r.p, tag(r.b, r.b==="Consent"?"pii":"ref"), '<span class="muted">'+r.cats+'</span>', r.sys, r.v, r.ret, sevPill(r.risk), r.att.indexOf("Due")>-1||r.att.indexOf("DPIA")>-1?pill("risk",r.att):pill("ok",r.att)]; }), "ropaRow"), null, true);
};
}


export function registerDataMapRopaActions(runtime, ACT, AFTER) {
  const { D, S, btn, closeOv, drawer, esc, ledgerAdd, modal, render, sevPill, tag, toast } = runtime;
  ACT.ropaRow = function(i){ var r=D.ropa[i]; drawer(r.n,"Processing activity · "+r.own, '<dl class="kv"><dt>Purpose</dt><dd>'+r.p+'</dd><dt>Lawful basis</dt><dd>'+r.b+'</dd><dt>Data categories</dt><dd>'+r.cats+'</dd><dt>Systems</dt><dd>'+r.sys+'</dd><dt>Recipients</dt><dd>'+r.v+'</dd><dt>Retention</dt><dd>'+r.ret+'</dd><dt>Risk</dt><dd>'+sevPill(r.risk)+'</dd></dl><div class="banner t"><span>Linked to '+(2+i%3)+' discovered assets. Changes underneath flag this record for review.</span></div>', btn("Start DPIA",null,null).replace('data-act="null"','data-go="assess"')+btn("Request attestation","toastm","Attestation requested","p")); }
  ACT.wiz = function(step){ S.wiz = step==null ? {s:0,n:"Gold loan top-up",p:"Credit decision",b:"Consent",cats:{"Full name":1,"PAN":1,"Aadhaar":1}} : S.wiz; if(step!=null && step!=="") S.wiz.s=+step;
  var w=S.wiz, st=["Basics","Flow","Data","Compliance","Review"];
  var stepper='<div class="stepper" style="--n:5">'+st.map(function(x,k){ return '<div class="stp '+(k<w.s?"done":k===w.s?"cur":"")+'"><div class="ln"></div><span>'+(k+1)+'. '+x+'</span></div>'; }).join("")+'</div>';
  var body=stepper;
  if(w.s===0) body+='<div class="g g2"><div class="field"><label for="w-n">Activity name</label><input id="w-n" value="'+esc(w.n)+'"></div><div class="field"><label for="w-p">Purpose</label><input id="w-p" value="'+esc(w.p)+'"></div><div class="field"><label for="w-bu">Business unit</label><select id="w-bu"><option>Gold Loans</option><option>Retail Lending</option></select></div><div class="field"><label for="w-o">Owner</label><select id="w-o"><option>Gold Loans ops</option><option>Lending Ops</option></select></div></div>';
  if(w.s===1) body+='<div class="g g2"><div class="field"><label for="w-src">Source of data</label><select id="w-src"><option>Directly from the data principal</option><option>Public source</option><option>Third party</option></select></div><div class="field"><label for="w-sys">Applications / systems</label><select id="w-sys"><option>gl-db (Oracle) · discovered</option><option>LOS · discovered</option></select></div><div class="field"><label for="w-rec">Recipients</label><select id="w-rec"><option>None</option><option>Partner NBFC</option><option>CIBIL</option></select></div><div class="field"><label for="w-x">Cross-border</label><select id="w-x"><option>No transfer outside India</option><option>Yes</option></select></div></div>';
  if(w.s===2) body+=Object.keys(CATS).map(function(g){ return '<div><div class="sec-t">'+g+'</div><div class="chipsel">'+CATS[g].map(function(c){ return '<button aria-pressed="'+(!!w.cats[c[0]])+'" data-act="wcat" data-arg="'+c[0]+'">'+c[0]+(c[1]==="spi"?tag("SPI","spi"):"")+'</button>'; }).join("")+'</div></div>'; }).join("");
  if(w.s===3) body+='<div class="g g2"><div class="field"><label for="w-b">Lawful basis</label><select id="w-b"><option>Consent (s.6)</option><option>Legitimate use: voluntarily provided (s.7(a))</option><option>Legitimate use: legal obligation</option></select></div><div class="field"><label for="w-r">Retention</label><input id="w-r" value="8 years after loan closure"></div></div><div class="banner"><span><b>DPIA suggested.</b> Aadhaar and PAN with automated credit decisions are a high-risk combination.</span></div>';
  if(w.s===4) body+='<dl class="kv"><dt>Activity</dt><dd>'+esc(w.n)+'</dd><dt>Purpose</dt><dd>'+esc(w.p)+'</dd><dt>Data</dt><dd><div class="tags">'+Object.keys(w.cats).map(function(c){ var spi=["Aadhaar","PAN","Passport","Voter ID","Photo","Bank account","UPI ID","Card number","Income","CIBIL score","Transaction history"].indexOf(c)>-1; return tag(c, spi?"spi":"pii"); }).join("")+'</div></dd><dt>Basis</dt><dd>Consent (s.6)</dd><dt>Retention</dt><dd>8 years after loan closure</dd></dl>';
  var foot=(w.s>0?btn("Back","wiz",w.s-1):"")+(w.s<4?btn("Next","wiz",w.s+1,"p"):btn("Register activity","wizdone",null,"p"));
  modal("Register processing activity","Add to your ROPA · industry pack active",body,foot);
}
  ACT.wcat = function(c){ if(S.wiz.cats[c]) delete S.wiz.cats[c]; else S.wiz.cats[c]=1; ACT.wiz(""); }
  ACT.wizdone = function(){
    var newActivity = {n:S.wiz.n,p:S.wiz.p,b:"Consent",cats:Object.keys(S.wiz.cats).join(", "),sys:"gl-db",v:"—",own:"Gold Loans",ret:"8 years after loan closure",risk:"High",att:"Attested today"};
    D.ropa.unshift(newActivity);
    platformApi.registerRopaActivity(newActivity).catch(err => {
      console.warn("Failed to persist ROPA activity in MongoDB:", err.message);
    });
    ledgerAdd("Processing activity registered", S.wiz.n);
    closeOv();
    render();
    toast("Activity registered. DPIA screening created.");
  }
}

export default function DataMapRopa({ html }) {
  return <ModuleView html={html} />;
}
