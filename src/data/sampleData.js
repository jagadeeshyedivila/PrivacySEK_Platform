/* Sample data for the PrivacySEK demo. Fictional organisation: Aarohan Finance Ltd (NBFC). All people and figures are illustrative. */
const sampleData = {
org:{name:"Aarohan Finance Ltd", short:"AF", bu:["All business units","Retail Lending","Gold Loans","Digital & Cards"], role:"Data Fiduciary · SDF candidate", user:{name:"Meera Iyer", role:"Data Protection Officer", init:"MI"}},

duties:[
 {id:"notice", n:"Notice in clear language", ref:"s.5 · Rule 3", st:"ok", stt:"Met", owner:"Privacy", ev:"214 notices · 23 languages", next:"—", score:96, sig:["All 12 live notices itemise data and purposes","Withdrawal and Board complaint links present","Marathi v3.2 published 2 Oct"]},
 {id:"consent", n:"Consent and withdrawal", ref:"s.6", st:"risk", stt:"At risk", owner:"Growth", ev:"1.21M receipts", next:"Re-consent 5,092 records on old notice", score:78, sig:["5,092 consents captured under notice v2.x","Withdrawal sync to MoEngage: 2.4 min average","Consent Manager integration ready for 13 Nov 2026"]},
 {id:"legit", n:"Legitimate uses recorded", ref:"s.7", st:"ok", stt:"Met", owner:"Legal", ev:"18 activities", next:"—", score:92, sig:["KYC, PMLA and employment bases recorded","2 activities flagged for counsel review"]},
 {id:"accuracy", n:"Accuracy and completeness", ref:"s.8(3)", st:"ok", stt:"Met", owner:"Operations", ev:"41 corrections", next:"—", score:90, sig:["Correction fan-out confirmed by all recipients"]},
 {id:"security", n:"Reasonable security safeguards", ref:"s.8(5) · Rule 6", st:"risk", stt:"At risk", owner:"Security", ev:"412 controls", next:"Close public S3 bucket with PAN", score:74, sig:["1 public bucket holds PAN values","Logs retained 365 days","Masking policies on 6 of 8 exports"]},
 {id:"breach", n:"Breach intimation", ref:"s.8(6) · Rule 7", st:"act", stt:"Clock running", owner:"Security", ev:"INC-2026-019", next:"Detailed report to Board in 41h", score:70, sig:["Initial intimation sent 10:42","CERT-In report sent 14:05","72-hour report draft 60% complete"]},
 {id:"retention", n:"Retention and erasure", ref:"s.8(7) · Rule 8", st:"ok", stt:"Met", owner:"IT", ev:"9 schedules", next:"—", score:88, sig:["48-hour pre-erasure notices automated","KYC legal hold documented"]},
 {id:"contact", n:"DPO contact published", ref:"s.8(9) · Rule 9", st:"ok", stt:"Met", owner:"Privacy", ev:"Trust Center", next:"—", score:100, sig:["Published on Trust Center and every rights response"]},
 {id:"children", n:"Children's data", ref:"s.9 · Rules 10–12", st:"risk", stt:"At risk", owner:"Product", ev:"38 records", next:"Verify 38 guardian consents", score:62, sig:["38 minor co-applicant records without verified guardian","No behavioural tracking on minor profiles"]},
 {id:"sdf", n:"Significant Data Fiduciary duties", ref:"s.10 · Rule 13", st:"ok", stt:"Prepared", owner:"DPO", ev:"Annual DPIA 72%", next:"Finish annual DPIA by 30 Nov", score:84, sig:["DPO based in India appointed","Independent auditor shortlisted","Algorithmic check on credit model scheduled"]},
 {id:"rights", n:"Rights and grievances", ref:"s.11–14 · Rule 14", st:"act", stt:"3 due", owner:"DPO", ev:"75 requests", next:"Answer 3 grievances in 4 days", score:81, sig:["0 overdue requests","3 grievances due within 4 days","Nominations: 12 recorded"]},
 {id:"transfer", n:"Cross-border transfer", ref:"s.16 · Rule 15", st:"ok", stt:"Met", owner:"Legal", ev:"6 transfers", next:"—", score:93, sig:["No transfers to restricted countries","SDF localisation list monitored"]},
 {id:"processor", n:"Processor contracts", ref:"s.8(2)", st:"risk", stt:"At risk", owner:"Procurement", ev:"38 vendors", next:"Sign DPA with Partner NBFC", score:76, sig:["3 vendors without signed DPA","Questionnaires overdue: 2"]},
 {id:"account", n:"Accountability and evidence", ref:"s.8(1)", st:"ok", stt:"Met", owner:"DPO", ev:"Ledger 1.48M entries", next:"—", score:97, sig:["Proof Ledger chain verified 09:00 today"]}
],

assets:[
 {n:"customers.kyc", src:"PostgreSQL · core-db", own:"Lending Ops", cls:[["Aadhaar","spi"],["PAN","spi"],["Name","pii"],["DOB","pii"]], sens:"High", rows:"2.4M", loc:"AWS ap-south-1", conf:98, scan:"Today 06:10"},
 {n:"loan_applications", src:"PostgreSQL · los-db", own:"Lending Ops", cls:[["Income","spi"],["Bank account","spi"],["Mobile","pii"]], sens:"High", rows:"860K", loc:"AWS ap-south-1", conf:96, scan:"Today 06:12"},
 {n:"Leads 2026", src:"Salesforce", own:"Growth", cls:[["Email","pii"],["Mobile","pii"],["City","pii"]], sens:"Medium", rows:"412K", loc:"Salesforce (SG)", conf:94, scan:"Today 05:40"},
 {n:"s3://af-exports/2026/", src:"Amazon S3", own:"Unassigned", cls:[["PAN","spi"],["Email","pii"]], sens:"Exposed", rows:"18K files", loc:"AWS ap-south-1 · public", conf:91, scan:"Today 06:30"},
 {n:"events_raw", src:"BigQuery", own:"Data", cls:[["Device ID","pii"],["IP address","pii"]], sens:"Low", rows:"1.1B", loc:"GCP asia-south1", conf:88, scan:"Yesterday"},
 {n:"gold_loan_vault", src:"Oracle · gl-db", own:"Gold Loans", cls:[["Aadhaar","spi"],["Photo","spi"],["Address","pii"]], sens:"High", rows:"640K", loc:"On-premise · Mumbai", conf:97, scan:"Today 04:55"},
 {n:"call_recordings/", src:"Azure Blob", own:"Contact Centre", cls:[["Voice","spi"],["Mobile","pii"]], sens:"High", rows:"92K files", loc:"Azure Central India", conf:83, scan:"Yesterday"},
 {n:"support_tickets", src:"Freshdesk", own:"Support", cls:[["Email","pii"],["Free text","pii"]], sens:"Medium", rows:"233K", loc:"Freshdesk (IN)", conf:79, scan:"Today 03:20"},
 {n:"campaign_audience", src:"MoEngage", own:"Growth", cls:[["Mobile","pii"],["Consent flags","pii"]], sens:"Medium", rows:"1.3M", loc:"MoEngage (IN)", conf:95, scan:"Today 06:00"},
 {n:"hr_payroll", src:"SAP SuccessFactors", own:"HR", cls:[["PAN","spi"],["Salary","spi"],["Bank account","spi"]], sens:"High", rows:"4.2K", loc:"SAP (EU)", conf:99, scan:"Today 02:10"}
],
sources:[["PostgreSQL","3 databases","ok"],["Salesforce","1 org","ok"],["Amazon S3","14 buckets","ok"],["BigQuery","2 projects","ok"],["Oracle Database","1 instance","ok"],["Azure Blob","3 containers","ok"],["Freshdesk","1 helpdesk","ok"],["MoEngage","1 workspace","ok"],["SAP SuccessFactors","1 tenant","ok"],["Google Workspace","Drive · 412 users","risk"],["Microsoft 365","Pending consent","n"],["Finacle","File extract","ok"]],
findings:[
 {n:"Public bucket contains PAN values", a:"s3://af-exports/2026/", sev:"act", age:"2 days", fix:"Block public access and move to private bucket"},
 {n:"Copy of KYC table outside approved locations", a:"analyst laptop share · 'kyc_dump.csv'", sev:"act", age:"5 days", fix:"Delete copy and notify owner"},
 {n:"Unencrypted column with bank account numbers", a:"loan_applications.bank_acct", sev:"risk", age:"12 days", fix:"Apply column encryption or tokenisation"},
 {n:"Over-broad access: 214 users can read call recordings", a:"call_recordings/", sev:"risk", age:"1 month", fix:"Restrict to Contact Centre QA group"},
 {n:"Stale data beyond retention (leads older than 24 months)", a:"Leads 2026", sev:"risk", age:"Today", fix:"Run retention job"}
],

ropa:[
 {n:"Loan origination", p:"Credit decision and disbursal", b:"Consent", cats:"KYC, income, bureau", sys:"LOS, core-db, CIBIL", v:"CIBIL, Partner bank", own:"Lending Ops", ret:"8 years after closure", risk:"High", att:"Attested 2 Oct"},
 {n:"KYC verification", p:"Legal obligation (RBI KYC, PMLA)", b:"s.7(c) legal obligation", cats:"Aadhaar, PAN, photo", sys:"core-db, DigiLocker", v:"UIDAI, NSDL", own:"Compliance", ret:"5 years after relationship ends", risk:"High", att:"Attested 18 Sep"},
 {n:"Gold loan valuation", p:"Collateral assessment", b:"Consent", cats:"Photo, address, ornament details", sys:"gl-db", v:"—", own:"Gold Loans", ret:"8 years", risk:"Medium", att:"Due"},
 {n:"Diwali campaign", p:"Marketing offers", b:"Consent", cats:"Mobile, email, segment", sys:"Salesforce, MoEngage", v:"MoEngage", own:"Growth", ret:"24 months after last contact", risk:"Medium", att:"Attested 20 Oct"},
 {n:"Collections calling", p:"Recovery of dues", b:"s.7(a) voluntarily provided", cats:"Mobile, loan details, voice", sys:"Dialer, call_recordings", v:"Collection agency", own:"Collections", ret:"3 years", risk:"High", att:"Attested 1 Oct"},
 {n:"Payroll", p:"Employment", b:"s.7(i) employment", cats:"PAN, salary, bank", sys:"SAP SuccessFactors", v:"SAP", own:"HR", ret:"8 years", risk:"Medium", att:"Attested 5 Sep"},
 {n:"Credit scoring model", p:"Automated credit assessment", b:"Consent", cats:"Bureau, income, transactions", sys:"Model platform", v:"—", own:"Risk", ret:"Model life + 3 years", risk:"High", att:"DPIA in progress"}
],

consentProfiles:[
 {n:"Personal loan application", proc:"Loan origination", purposes:[["KYC & identity verification","legal_obligation",["Full name","DOB","Aadhaar","PAN","Address"]],["Credit assessment","consent",["Income","Bank statements","Bureau report"]],["Offers on related products","consent",["Mobile","Email"]],["Sharing with co-lending partner","consent",["Loan details","KYC summary"]]], ch:"web · app · branch", v:"v3.2", st:"Live", rec:"412,880"},
 {n:"Gold loan", proc:"Gold loan valuation", purposes:[["KYC","legal_obligation",["Aadhaar","PAN","Photo"]],["Valuation","consent",["Ornament details","Photo"]]], ch:"branch tablet (offline)", v:"v2.4", st:"Live", rec:"288,104"},
 {n:"Marketing preferences", proc:"Diwali campaign", purposes:[["Offers by SMS & WhatsApp","consent",["Mobile"]],["Offers by email","consent",["Email"]],["Personalisation","consent",["Segment","App events"]]], ch:"web · app · email", v:"v3.1", st:"Re-consent", rec:"1,302,447"},
 {n:"Minor co-applicant (guardian)", proc:"Loan origination", purposes:[["Account opening","consent",["Name","DOB","Guardian ID"]]], ch:"branch", v:"v1.3", st:"Live", rec:"1,214"}
],
notices:[
 {n:"Personal loan privacy notice", v:"v3.2", langs:23, st:"Published", upd:"2 Oct 2026", cov:"Loan origination, KYC"},
 {n:"Gold loan notice", v:"v2.4", langs:14, st:"Published", upd:"11 Sep 2026", cov:"Gold loan valuation"},
 {n:"Marketing & offers notice", v:"v3.1", langs:23, st:"Published", upd:"20 Oct 2026", cov:"Diwali campaign"},
 {n:"Website cookie notice", v:"v1.8", langs:23, st:"Published", upd:"15 Oct 2026", cov:"Website analytics"},
 {n:"Employee privacy notice", v:"v1.2", langs:3, st:"Draft", upd:"Today", cov:"Payroll, HR"},
 {n:"Co-lending partner notice", v:"v1.0", langs:1, st:"In review", upd:"Yesterday", cov:"Partner sharing"}
],

guard:{
 policies:[
  {n:"Marketing exports need active marketing consent", when:"Purpose = Marketing · Destination = messaging tools", then:"block", scope:"Per record", hits:"1,482 / 7d", on:true},
  {n:"Mask identifiers for analytics", when:"Destination = BigQuery, Snowflake · Data = Aadhaar, PAN, mobile", then:"mask", scope:"Per field", hits:"18,904 / 7d", on:true},
  {n:"Partner sharing needs DPO approval", when:"Destination = external partner · Purpose differs from collection", then:"approve", scope:"Per request", hits:"12 / 7d", on:true},
  {n:"Block children's data in ad audiences", when:"Data principal age < 18 · Destination = ad platforms", then:"block", scope:"Per record", hits:"38 / 7d", on:true},
  {n:"Large off-hours export alert", when:"Records > 50,000 · Time 22:00–06:00", then:"approve", scope:"Per request", hits:"2 / 7d", on:true},
  {n:"AI tools: no SPI in prompts", when:"Destination = AI assistants · Data = SPI", then:"mask", scope:"Per field", hits:"312 / 7d", on:true},
  {n:"Cross-border to restricted countries", when:"Destination country on restricted list", then:"block", scope:"Per request", hits:"0 / 7d", on:true}
 ],
 feed:[
  ["14:03:01","Diwali campaign export","Growth · Rohan S.","MoEngage","18,240","mix"],
  ["13:58:44","Analytics refresh","Data · scheduled","BigQuery","2.1M","mask"],
  ["13:52:10","Loan leads share","Partnerships · Kavya R.","Partner NBFC","4,420","approve"],
  ["13:47:37","Support copilot prompt","Support · agent","AI assistant","1","mask"],
  ["13:41:02","Collections dialer sync","Collections · system","Dialer","9,880","allow"],
  ["13:30:19","CSV export: KYC table","Analyst · Vikram P.","Laptop download","240,112","block"],
  ["13:22:51","CRM to email sync","Growth · system","Mailchimp","62,104","allow"]
 ],
 approvals:[
  {id:"APR-118", n:"Share 4,420 loan leads with Partner NBFC", by:"Kavya R. · Partnerships", why:"Co-lending pilot for Q4", risk:"Purpose differs from collection; DPA not signed", age:"11 min"},
  {id:"APR-117", n:"Export 61,200 customers to agency for survey", by:"Arjun M. · CX", why:"Annual NPS survey", risk:"Large export; 4,120 records without survey consent", age:"2 h"},
  {id:"APR-115", n:"Off-hours export of 72K records", by:"Data platform · scheduled", why:"Month-end reconciliation", risk:"Off-hours, large volume", age:"9 h"}
 ]
},

retention:[
 {c:"Marketing leads", rule:"24 months after last contact", trig:"Last contact", next:"Tonight 02:00", n:"18,420", st:"Active"},
 {c:"Dormant app users", rule:"3 years inactivity · 48h notice (Rule 8)", trig:"Inactivity", next:"2 Nov", n:"2,904 notices sent", st:"Notices sent"},
 {c:"KYC records", rule:"5 years after relationship ends · PMLA", trig:"Account closure", next:"—", n:"Legal hold", st:"Hold"},
 {c:"Call recordings", rule:"180 days", trig:"Created", next:"Daily 03:00", n:"1,240 / day", st:"Active"},
 {c:"Rejected loan applications", rule:"2 years", trig:"Decision date", next:"1 Nov", n:"31,880", st:"Active"},
 {c:"Security logs", rule:"Minimum 1 year (Rule 6)", trig:"Created", next:"—", n:"Retain", st:"Retain"}
],
deletionJobs:[["DEL-2209","Marketing leads > 24 months","Salesforce, MoEngage","18,420","Dry run complete","approve"],["DEL-2208","Withdrawn consent: Diwali","MoEngage","137","Completed","allow"],["DEL-2207","Erasure DSR-2026-0479","4 systems","1 person","Awaiting approval","approve"],["DEL-2206","Call recordings > 180 days","Azure Blob","1,240","Completed","allow"]],

vendors:[
 {n:"MoEngage", svc:"Customer messaging", data:"Mobile, consent flags, app events", loc:"India", dpa:"Signed", q:100, risk:"Medium", sc:58, sub:3},
 {n:"Freshdesk", svc:"Support ticketing", data:"Email, tickets", loc:"India", dpa:"Signed", q:100, risk:"Low", sc:24, sub:4},
 {n:"Partner NBFC (co-lending)", svc:"Co-lending", data:"Loan and KYC summary", loc:"India", dpa:"Missing", q:40, risk:"High", sc:81, sub:1},
 {n:"Recovery Associates", svc:"Collections agency", data:"Mobile, dues", loc:"India", dpa:"Signed", q:75, risk:"High", sc:72, sub:0},
 {n:"Amazon Web Services", svc:"Cloud hosting", data:"All systems", loc:"India (Mumbai)", dpa:"Signed", q:100, risk:"Low", sc:18, sub:12},
 {n:"Salesforce", svc:"CRM", data:"Leads, customers", loc:"Singapore", dpa:"Signed", q:100, risk:"Medium", sc:44, sub:9},
 {n:"SAP", svc:"HR & payroll", data:"Employee data", loc:"EU", dpa:"Signed", q:90, risk:"Medium", sc:39, sub:6},
 {n:"Mailchimp", svc:"Email", data:"Email, name", loc:"USA", dpa:"Renewal due", q:85, risk:"Medium", sc:52, sub:5}
],
templates:["DPDP processor assessment","Information security baseline","SIG Lite-style questionnaire","RBI IT outsourcing checks","ISO 27001 controls","Cloud provider review","AI vendor assessment","Collections agency conduct","Subprocessor change review","Offboarding & data return"],

rights:[
 {id:"DSR-2026-0482", t:"Access", ref:"s.11", who:"Priya K.", ch:"Rights portal · Marathi", rec:"14 Oct", due:"61 days", st:"Located", step:2, lang:"Marathi"},
 {id:"DSR-2026-0481", t:"Correction", ref:"s.12(2)(a)", who:"Rahul D.", ch:"Branch · Pune", rec:"13 Oct", due:"60 days", st:"Fulfilled", step:3, lang:"English"},
 {id:"DSR-2026-0479", t:"Erasure", ref:"s.12(3)", who:"Ananya S.", ch:"Email", rec:"2 Oct", due:"12 days", st:"Awaiting approval", step:4, lang:"English"},
 {id:"DSR-2026-0476", t:"Withdraw consent", ref:"s.6(4)", who:"Imran Q.", ch:"App", rec:"1 Oct", due:"Done", st:"Responded", step:5, lang:"Urdu"},
 {id:"GRV-2026-0471", t:"Grievance", ref:"s.13", who:"Lakshmi N.", ch:"Call centre · Tamil", rec:"27 Jul", due:"4 days", st:"Escalated", step:3, lang:"Tamil"},
 {id:"GRV-2026-0468", t:"Grievance", ref:"s.13", who:"Suresh P.", ch:"Rights portal", rec:"25 Jul", due:"2 days", st:"Drafting", step:3, lang:"Hindi"},
 {id:"NOM-2026-0466", t:"Nomination", ref:"s.14", who:"Farah A.", ch:"App", rec:"20 Sep", due:"—", st:"Verified", step:5, lang:"English"},
 {id:"DSR-2026-0460", t:"Access", ref:"s.11", who:"Vijay R.", ch:"Rights portal", rec:"18 Sep", due:"Done", st:"Responded", step:5, lang:"Telugu"}
],

incidents:[
 {id:"INC-2026-019", n:"Public S3 bucket exposed PAN values", sev:"High", st:"Notification", ppl:"2,318", found:"22 Oct 09:58", src:"Discovery · DSPM finding"},
 {id:"INC-2026-017", n:"Lost branch tablet (encrypted)", sev:"Low", st:"Closed", ppl:"0", found:"8 Oct 17:20", src:"Branch report"},
 {id:"INC-2026-014", n:"Misdirected loan statement emails", sev:"Medium", st:"Closed", ppl:"41", found:"19 Sep 11:05", src:"Customer complaint"}
],

assessments:[
 {n:"Credit scoring model v4", t:"SDF annual DPIA", p:72, own:"Risk", due:"30 Nov", r:"High"},
 {n:"New CRM rollout", t:"DPIA", p:40, own:"IT", due:"15 Nov", r:"Medium"},
 {n:"Co-lending data share", t:"Transfer & sharing assessment", p:90, own:"Legal", due:"28 Oct", r:"High"},
 {n:"Collections calling", t:"Legitimate use assessment", p:100, own:"Collections", due:"Done", r:"Medium"},
 {n:"DPDP gap assessment 2026", t:"Gap assessment", p:100, own:"DPO", due:"Done", r:"—"},
 {n:"Support copilot", t:"AI impact assessment", p:55, own:"Support", due:"20 Nov", r:"Limited"}
],
atemplates:["DPDP gap assessment","DPIA (DPDP)","SDF annual DPIA & audit","Legitimate use assessment","Children's data assessment","Cross-border transfer assessment","AI impact assessment","GDPR DPIA (Art. 35)","Vendor onboarding","Privacy by design review","ISO 27701 readiness","Breach post-incident review"],

ledger:[
 ["24 Oct 14:05:12","Regulator Pack generated","Customer #4471 · by Meera I.","91aa…5e08"],
 ["24 Oct 14:03:01","Purpose Guard blocked export row","Diwali campaign → MoEngage · policy PG-01","2c6f…d013"],
 ["24 Oct 14:02:55","Consent withdrawn: marketing","Customer #4471 · app · Marathi","e19c…77b2"],
 ["24 Oct 13:52:10","Approval requested","APR-118 · Partner NBFC share","7d10…aa42"],
 ["24 Oct 10:42:00","Breach intimation sent to Board","INC-2026-019 · initial","c3e8…0f19"],
 ["23 Oct 18:20:44","Correction fan-out confirmed","DSR-2026-0481 · 5 of 5 systems","4b77…e2c1"],
 ["23 Oct 11:09:31","Notice published","Marketing & offers v3.1 · 23 languages","f0a2…19bd"],
 ["22 Oct 09:41:19","Consent given: marketing, analytics","Customer #4471 · web · Marathi","b08d…4a90"],
 ["22 Oct 09:41:07","Notice v3.2 shown","Customer #4471 · Marathi","7f3a…c21e"],
 ["21 Oct 16:02:08","DPIA approved","Collections calling · Legal, Security, DPO","a91c…3d55"]
],

ai:[
 {n:"Credit scoring v4", type:"ML model · in-house", data:"Bureau, income, transactions", tier:"High", st:"DPIA in progress", hl:"Human-in-the-loop"},
 {n:"Fraud detection", type:"ML model · in-house", data:"Transactions, device", tier:"High", st:"Monitoring", hl:"Human-on-the-loop"},
 {n:"Support copilot", type:"LLM · vendor", data:"Tickets (masked)", tier:"Limited", st:"Guardrails on", hl:"Human-in-the-loop"},
 {n:"Collections voice bot", type:"Voice AI · vendor", data:"Mobile, dues", tier:"Limited", st:"Assessment due", hl:"Human escalation"},
 {n:"Marketing copy assistant", type:"LLM · vendor", data:"None", tier:"Minimal", st:"Approved", hl:"—"}
],
training:[["Branch operations","DPDP for frontline staff",86,"31 Oct"],["Contact centre","Handling rights requests",91,"31 Oct"],["Marketing","Consent and purpose",64,"31 Oct"],["Engineering","Privacy by design",52,"15 Nov"],["Collections","Fair collections and data",77,"15 Nov"],["Leadership","DPDP for boards",100,"Done"]],
workflows:[["DSAR SLA escalation","Request SLA at 50%, 75%, 90%","4 nodes","Active"],["Breach 72-hour clock","Breach declared","6 nodes","Active"],["Consent expiry & renewal","Consent expires in 30 days","3 nodes","Active"],["Unknown cookie governance","New tracker detected","3 nodes","Active"],["Minor DSAR (s.9)","Request filed for a minor","8 nodes","Active"],["New vendor onboarding","Vendor created","5 nodes","Draft"],["Critical risk alert","Finding severity = critical","3 nodes","Active"]],
integrations:[["PostgreSQL","Database","ok"],["Oracle Database","Database","ok"],["MongoDB","Database","n"],["Snowflake","Warehouse","n"],["BigQuery","Warehouse","ok"],["Databricks","Warehouse","n"],["Amazon S3","Storage","ok"],["Azure Blob","Storage","ok"],["Salesforce","CRM","ok"],["Zoho CRM","CRM","n"],["HubSpot","CRM","n"],["MoEngage","Messaging","ok"],["CleverTap","Messaging","n"],["Mailchimp","Email","ok"],["Freshdesk","Support","ok"],["ServiceNow","ITSM","n"],["Okta","Identity","ok"],["Microsoft Entra ID","Identity","n"],["Splunk","SIEM","ok"],["Slack","Collaboration","ok"],["Finacle","Core banking","ok"],["SAP","ERP / HR","ok"],["Google Workspace","Collaboration","risk"],["Microsoft 365","Collaboration","n"]],
langs:["English","हिन्दी","मराठी","தமிழ்","తెలుగు","বাংলা","ગુજરાતી","ಕನ್ನಡ","മലയാളം","ଓଡ଼ିଆ","ਪੰਜਾਬੀ","اردو","অসমীয়া"]
};

export default sampleData;
