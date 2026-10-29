export const NAV = [
 [null,[["cockpit","Obligation Cockpit","home","star"]]],
 ["Find",[["discovery","Data Discovery","search"],["lineage","Data Lineage","flow"],["ropa","Data Map & ROPA","map"],["finder","Person Finder","user","star"]]],
 ["Control",[["notices","Notices","doc"],["consent","Consent","check"],["cookies","Cookie Consent","cookie"],["guard","Purpose Guard","shield","star"],["retention","Retention & Deletion","clock"],["vendors","Vendor Risk","truck"]]],
 ["Prove",[["rights","Rights Requests","inbox","3"],["breach","Breach Response","alert","1"],["assess","Assessments","clip"],["ledger","Proof Ledger","chain","star"],["reports","Reports","chart"]]],
 ["Govern",[["ai","AI Governance","spark"],["training","Training","grad"],["trust","Trust Center","globe"],["workflows","Workflows","flow"]]],
 ["System",[["integrations","Integrations","plug"],["settings","Settings","gear"]]]
];
export const TITLES = {}; NAV.forEach(function(g){ g[1].forEach(function(i){ TITLES[i[0]] = [g[0]||"Home", i[1]]; }); });
