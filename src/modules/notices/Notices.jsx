import ModuleView from "../../components/ModuleView.jsx";

const NOTICE = {
 English:"Aarohan Finance uses your personal data to process your loan application. Data we collect: name, date of birth, Aadhaar (for KYC), PAN, income details and bank statements. Purposes: KYC verification (legal obligation); credit assessment (consent); offers on related products (consent, optional). You can withdraw consent at any time from the app, as easily as you gave it. To use your rights or raise a grievance, contact our DPO at dpo@aarohan.example. You may also complain to the Data Protection Board of India.",
 "हिन्दी":"आरोहण फाइनेंस आपके ऋण आवेदन पर कार्रवाई के लिए आपके व्यक्तिगत डेटा का उपयोग करता है। हम ये डेटा एकत्र करते हैं: नाम, जन्म तिथि, आधार (केवाईसी के लिए), पैन, आय का विवरण और बैंक स्टेटमेंट। उद्देश्य: केवाईसी सत्यापन (कानूनी दायित्व); क्रेडिट मूल्यांकन (सहमति); संबंधित उत्पादों पर ऑफ़र (सहमति, वैकल्पिक)। आप ऐप से किसी भी समय अपनी सहमति उतनी ही आसानी से वापस ले सकते हैं जितनी आसानी से आपने दी थी। अपने अधिकारों के उपयोग या शिकायत के लिए हमारे डीपीओ से dpo@aarohan.example पर संपर्क करें। आप भारतीय डेटा संरक्षण बोर्ड में भी शिकायत कर सकते हैं।",
 "मराठी":"आरोहण फायनान्स तुमच्या कर्ज अर्जाची प्रक्रिया करण्यासाठी तुमचा वैयक्तिक डेटा वापरते. आम्ही हा डेटा गोळा करतो: नाव, जन्मतारीख, आधार (केवायसीसाठी), पॅन, उत्पन्नाचा तपशील आणि बँक स्टेटमेंट. उद्देश: केवायसी पडताळणी (कायदेशीर बंधन); पत मूल्यांकन (संमती); संबंधित उत्पादनांवरील ऑफर (संमती, ऐच्छिक). तुम्ही दिलेली संमती ॲपमधून कधीही तितक्याच सहजपणे मागे घेऊ शकता. तुमचे अधिकार वापरण्यासाठी किंवा तक्रारीसाठी आमच्या डीपीओशी dpo@aarohan.example वर संपर्क साधा. तुम्ही भारताच्या डेटा संरक्षण मंडळाकडेही तक्रार करू शकता."
};

export function createNoticesView(runtime) {
  const { D, btn, card, head, kpi, pill, table } = runtime;
  return function(){
  return head("Control","Notices","Itemised, standalone notices in English and 22 Indian languages, versioned and linked to the consents they support.", btn("Create notice","toastm","Draft notice created from the Personal loan template","p","plus"))+
   '<div class="g g4">'+kpi("Total notices","12","3 drafts in review","#14B8A6")+kpi("Languages","23","English + 22 scheduled","#3B82F6")+kpi("Consents on current version","93%","5,092 on older versions","#F59E0B")+kpi("Rule 3 checks","12 / 12","Itemised · withdraw · Board link","#14B8A6")+'</div>'+
   card("Notice library", table(["Notice","Version","Languages","Covers","Status","Updated"], D.notices.map(function(n){ return ['<b>'+n.n+'</b>', '<span class="mono">'+n.v+'</span>', n.langs, '<span class="muted">'+n.cov+'</span>', pill(n.st==="Published"?"ok":n.st==="Draft"?"n":"info", n.st), '<span class="dim">'+n.upd+'</span>']; }), "notice"), null, true);
};
}


export function registerNoticesActions(runtime, ACT, AFTER) {
  const { D, I, S, btn, drawer, esc, tag } = runtime;
  ACT.notice = function(i, lang){ var n=D.notices[i||0]; S.nl = lang||S.nl||"English"; var txt = NOTICE[S.nl] || NOTICE.English;
  drawer(n.n, n.v+" · "+n.st, '<div class="chipsel">'+Object.keys(NOTICE).map(function(l){ return '<button aria-pressed="'+(S.nl===l)+'" data-act="noticeLang" data-arg="'+(i||0)+'|'+l+'">'+l+'</button>'; }).join("")+'<button disabled>+20 more</button></div>'+
   '<div class="card" style="padding:18px;font-size:14.5px;line-height:1.7;font-family:var(--f-sans),\'Nirmala UI\',\'Noto Sans Devanagari\',sans-serif">'+esc(txt)+'</div>'+
   '<div><div class="sec-t">Rule 3 checks</div><div class="tags">'+tag("Standalone","pii")+tag("Itemised data","pii")+tag("Specific purposes","pii")+tag("Withdrawal link","pii")+tag("Board complaint link","pii")+'</div></div>'+
   '<div><div class="sec-t">Version history</div><div class="list card"><div class="li"><span class="ic">'+I.doc+'</span><span><b>v3.2 · current</b><small>Published 2 Oct 2026 · Marathi and Tamil reviewed by native linguists</small></span><span></span></div><div class="li"><span class="ic">'+I.doc+'</span><span><b>v3.1</b><small>Added co-lending partner purpose</small></span><span></span></div><div class="li"><span class="ic">'+I.doc+'</span><span><b>v2.4</b><small>5,092 consents still on this version</small></span>'+btn("Re-consent",null,null,"sm").replace('data-act="null"','data-go="consent"')+'</div></div></div><p class="dim" style="font-size:12px">Sample translations for demonstration.</p>',
   btn("New version","toastm","New version drafted from v3.2")+btn("Publish","toastm","Notice published and written to the Proof Ledger","p"));
}
  ACT.noticeLang = function(a){ var p=a.split("|"); ACT.notice(+p[0], p[1]); }
}

export default function Notices({ html }) {
  return <ModuleView html={html} />;
}
