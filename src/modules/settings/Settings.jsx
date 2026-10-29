import ModuleView from "../../components/ModuleView.jsx";

export function createSettingsView(runtime) {
  const { btn, card, curTab, head, pill, table, tabs } = runtime;
  return function(){
  var t=curTab("settings","org");
  var h=head("System","Settings","Organisation, people and security.")+tabs("settings",[["org","Organisation"],["users","Users & roles"],["sec","Security"]]);
  if(t==="org") return h+'<div class="g g2">'+card("Entity & role under DPDP", '<dl class="kv"><dt>Legal entity</dt><dd>Aarohan Finance Ltd</dd><dt>Role</dt><dd>Data Fiduciary</dd><dt>SDF status</dt><dd>'+pill("risk","Not yet notified · preparing")+'</dd><dt>Industry pack</dt><dd>NBFC & lending · RBI overlays</dd><dt>Business units</dt><dd>Retail Lending, Gold Loans, Digital & Cards</dd></dl><p class="dim" style="font-size:12.5px;margin-top:10px">SDF status is conferred by Central Government notification under s.10(1). Record the notification here when issued.</p>')+
    card("Deployment & residency", '<dl class="kv"><dt>Deployment</dt><dd>PrivacySEK cloud · dedicated database</dd><dt>Region</dt><dd>India (Mumbai)</dd><dt>Encryption</dt><dd>AES-256 at rest · TLS 1.2+ · customer-managed keys</dd><dt>Languages</dt><dd>23 enabled</dd></dl>')+'</div>';
  if(t==="users") return h+card("Users & roles", table(["Person","Role","Access","Last active"],[["Meera Iyer","DPO · Admin","All modules","Now"],["Arvind S.","Head of IT","Discovery, retention, second approver","10 min"],["Rohan S.","Growth lead","Consent (read), Purpose Guard requests","1 h"],["Kavya R.","Partnerships","Purpose Guard requests","11 min"],["Neha T.","Rights analyst","Rights requests","Now"],["External auditor","Read-only reviewer","Proof Ledger, reports","2 days"]]), btn("Invite","toastm","Invitation sent","sm"), true);
  return h+card("Security", [["Single sign-on (SAML · Okta)",true],["Two-person approval for erasure and destructive steps",true],["Separation of duties: reviewers are read-only",true],["Bring your own AI model keys",false],["IP allow-list",true],["Session timeout 30 minutes",true]].map(function(s){ return '<div class="row" style="margin-bottom:12px"><button class="switch" role="switch" aria-checked="'+s[1]+'" data-act="sw" aria-label="'+s[0]+'"></button><span>'+s[0]+'</span></div>'; }).join(""));
};
}

export default function Settings({ html }) {
  return <ModuleView html={html} />;
}
