# Build prompt: Data Map & ROPA module (PrivacySEK demo app)

> Hand this whole file to the AI developer. It describes **what** to build, **how it must fit the existing template**, and **every validation rule and on-screen result** the demo needs.
> Prototype source: `MODULE WISE DEMOS/ROPA/ROPA.html`. Target: `src/modules/ropa/` in `privacysek-platform`.

---

## 0. Ground rules (read first)

1. **Client demo, dummy data only.** No backend work is required. All data lives in `localStorage`, exactly like Data Discovery (`src/modules/discovery/discoveryData.js`). Keep the existing optional `platformApi.registerRopaActivity()` call when an activity is created, wrapped in `.catch()` so it never blocks the demo.
2. **Match the existing template, not the prototype's look.** The prototype (`ROPA.html`) defines the *features and fields*. The *UI* must use the app's shared helpers and CSS tokens: `head`, `tabs`, `curTab`, `card`, `kpi`, `table`, `pill`, `tag`, `sevPill`, `bar`, `btn`, `modal`, `drawer`, `toast`, `ledgerAdd`, `tableEmptyState`, `copyButton`, `esc`, `$`, and classes such as `.card`, `.g g2/g3/g4`, `.field`, `.kv`, `.banner`, `.stepper/.stp`, `.chipsel`, `.btn sm o/p/t`. Don't invent a new visual language; don't copy the prototype's CSS.
3. **Follow the Data Discovery module's structure** (it is the reference implementation):
   - one shell file that builds a `context` (`runtime` + `ui` state + `getStore/saveStore/resetStore`), renders `head(...) + tabs(...)`, then delegates to a per-tab renderer;
   - one `register*Actions(context, ACT)` file per tab;
   - all interactions through the engine's delegated events: `data-act` (click), `data-input-act` (typing, value passed), `select[data-act]` (change, value passed), `data-change-act` (checkbox, `"true"/"false"` passed). The engine restores focus after `render()`, so live re-rendering on input is fine.
   - prefix every action, id and CSS class with `rp-` to avoid collisions (Discovery uses `dd-`).
4. **Replace, don't add beside.** The current 5-step "Register activity" wizard (`ACT.wiz`, `ACT.wcat`, `ACT.wizdone`) and the single register table are removed. The new Processing Activities tab is the only way to create an activity. Nothing else in the app references these actions (checked), so removal is safe. Keep the sidebar key `ropa` and title "Data Map & ROPA".
5. **Brand and data.** Use the Aarohan Finance tenant (NBFC, India, DPDP-first, also GDPR for EU customers). No "PrivacyPillar", "Acme", "Northwind" names. Use DPDP terms (Data Fiduciary, Data Principal, Data Processor).
6. **Legal text in the UI is demo guidance.** Every rule message cites its source (e.g. "DPDP Act s.8(5)") so it reads credibly, and the Dashboard footer says: "Compliance checks are illustrative guidance for this demo, not legal advice."

---

## 1. Files to create / change

```
src/modules/ropa/
  DataMapRopa.jsx            shell: context, header, tabs, router, reset demo data   (rewrite)
  ropaConfig.js              tabs, option lists, wizard step specs, role permissions
  ropaData.js                Aarohan seed + get/save/reset (localStorage key "privacysek.ropa.demo.v1")
  ropaRules.js               the validation + compliance rule engine (pure functions, no DOM)
  ropa.css                   only what the shared stylesheet lacks (prefix rp-)
  shared/RopaWizard.js       generic step-form renderer used by every record type
  shared/ComplianceDock.js   the live "Compliance check" side panel
  dashboard/RopaDashboard.jsx
  activities/RopaActivities.jsx
  assets/RopaAssets.jsx
  parties/RopaParties.jsx        (Vendors / Customers / Companies / Others sub-tabs)
  policies/RopaPolicies.jsx
  documentation/RopaDocumentation.jsx
  customFields/RopaCustomFields.jsx
  actions/dashboardActions.js
  actions/recordActions.js       (list, search, paging, open, delete: shared by all record types)
  actions/wizardActions.js       (field input, step nav, save, result screen)
  actions/customFieldActions.js
```
`src/app/routes.jsx` keeps the same three exports (`createDataMapRopaView`, `registerDataMapRopaActions`, default component). Don't touch other modules.

---

## 2. Header and tabs

**Header:** `head("Find", "Data Map & ROPA", "Records of processing for Aarohan Finance, kept in step with Data Discovery. Industry pack: NBFC & lending.", actions)`

Header actions (left to right):
- `View as` select: **Admin**, **DPO**, **Viewer** (demo role switch, see §9). Default = role derived from `D.org.user.role` (Meera Iyer, DPO → "DPO").
- `Reset demo data` (`btn ... "o"`), opening a confirm modal (copy Discovery's pattern; never use `confirm()`).
- `Export register` → toast "Register exported (CSV) for the regulator" + `ledgerAdd("ROPA register exported", "<n> activities")`.

**Tabs** (`tabs("ropa", [...])`, counts live):

| key | label |
|---|---|
| `dash` | Dashboard |
| `act` | Processing Activities · {n} |
| `ast` | Assets · {n} |
| `par` | Third Parties · {n} |
| `pol` | Policies · {n} |
| `doc` | Documentation · {n} |
| `cf` | Custom Fields |

Third Parties has a second row of sub-tabs (pill buttons, same style Discovery uses for Connections / Pod Connections): **Vendors · Customers · Companies · Others**.

---

## 3. List screens (same pattern for every record type)

Each record tab shows: a toolbar (search input with `data-input-act="rp-search"`, filter selects where listed, primary `+ Add …` button), then a `card` with `table(...)`, then pagination (10 per page, "Showing 1–10 of 23").

- Every row has a **Risk** pill (activities and assets) and an **Issues** chip (count of open warnings from `ropaRules`, colored by highest severity; "✓ Clean" if none).
- Row click opens the record in the wizard in **view/edit mode** at step 1, with the last-updated stamp top right.
- Row actions: Edit, Delete (Delete opens a confirm modal naming the record; Viewer and DPO can't delete, so the button is disabled with a tooltip: "Your role can't delete records").
- Empty / no-match states use `tableEmptyState` with a "Clear search" reset.
- Search matches all visible columns, case-insensitive.

| Tab | Columns | Filters |
|---|---|---|
| Processing Activities | ID · Name (+ business unit sub-line) · Role · Lawful basis · Data principals · Cross-border · DPIA · Risk · Issues · Last updated | Lawful basis, Risk, DPIA status, Business unit |
| Assets | ID · Name · Purpose · Storage location · Linked activities · Critical · AI · Risk · Issues · Last updated | Storage type, Critical |
| Vendors / Customers / Companies / Others | ID · Name · Country · Website · Audit type (Vendors only) · Linked activities · Last updated | Country |
| Policies | ID · Name · Policy type · Version · Owner · Next review · Last updated | Policy type |
| Documentation | ID · Name · Link · Linked to · Last updated | none |

IDs are readable: `PA-001`, `AS-001`, `VN-001`, `CU-001`, `CO-001`, `OT-001`, `PO-001`, `DC-001`.

---

## 4. The shared wizard (`shared/RopaWizard.js`)

Driven entirely by step specs in `ropaConfig.js`. A field spec is:
```js
{ k: "law", l: "Lawful basis", t: "select" | "multi" | "text" | "textarea" | "date" | "url" | "email" | "number",
  req: true, opts: "lawfulBasis" /* or a function(data) => options */, showIf: (d) => boolean,
  help: "static helper text", max: 120 }
```

Layout (desktop): **left = form (2-column `.g g2` grid), right = Compliance check dock (≈320px, sticky)**. On phones the dock collapses into a bar above the footer ("3 issues · Risk: High ▾") that expands on tap.

Behaviour:
- **Stepper** across the top (`.stepper`); steps are clickable; each shows a state dot: not visited, complete (✓), has errors (red count), has warnings (amber count).
- **Conditional fields** appear and disappear immediately when the controlling answer changes (prototype's `showIf`, e.g. "AI purpose" only when AI = Yes). When a field is hidden its value is cleared, and any error on it disappears.
- **Validation timing:** a field is validated on blur and on every change after it has been touched once; all fields of a step are validated on **Next**; all steps on **Save**. Untouched fields never show red before the first Next.
- **Inline error** under the field (`.field.err` + message); **inline result** under the field (a one-line helper that changes with the value, see §6). Errors block Next and Save. Warnings and info never block.
- Next on a step with errors: the stepper dot turns red, focus moves to the first invalid field, toast "Fix 2 fields on this step to continue".
- Save with errors on an earlier step: jump to that step, toast "Step 3 · Data storage has 1 missing field".
- **Read-only mode** (Viewer, or DPO deleting): inputs disabled, banner "View only. Your role can't edit records." Navigation still works.
- **Cancel** with unsaved changes opens a modal: "Discard changes to Customer onboarding?" (Keep editing / Discard).
- Multi-selects use `.chipsel` toggle buttons (same as the old wizard's data-category chips), not raw checkboxes.

---

## 5. Record types: steps and fields

Option lists below replace the prototype's generic ones with Aarohan/DPDP-relevant values. Keep the prototype's field keys where they exist so seed data maps across.

### 5.1 Processing Activity: 6 steps (+1 if custom fields exist)

**Step 1 · Business process**
| key | Label | Type | Req | Options / rules |
|---|---|---|---|---|
| entity | Entity (legal name) | select | ✓ | from Companies list (Aarohan Finance Ltd, Aarohan Gold Loans Pvt Ltd, Aarohan Finance (EU) B.V.) |
| bu | Business unit | select | ✓ | Retail Lending, Gold Loans, Digital & Cards, Collections, HR, Growth, Risk, Compliance |
| regs | Applicable regulation(s) | multi | ✓ | DPDP Act 2023 (India), EU GDPR, UK GDPR, RBI Master Directions (sectoral), PMLA 2002 |
| role | Processing capacity | select | ✓ | options depend on `regs` (§6 R-01) |
| date | Date of initial assessment | date | ✓ | not in the future |
| dpo | DPO / grievance contact | select | ✓ | Meera Iyer (DPO), Arjun Rao (Deputy DPO) |

**Step 2 · Processing activity**
| key | Label | Type | Req | Options / rules |
|---|---|---|---|---|
| name | Activity name | text | ✓ | 3–80 chars, unique (case-insensitive) |
| sub | Sub-processing activities | text | | comma-separated, shown as chips |
| desc | Description | textarea | ✓ | 20–600 chars, live counter |
| purp | Purpose(s) | multi | ✓ | Credit decision, Loan disbursal, KYC & AML, Collateral valuation, Collections, Customer support, Marketing, Fraud prevention, Payroll, Recruitment, Analytics |
| law | Lawful basis | select | ✓ | options depend on `regs` (R-02) |
| dpc | Data principal categories | multi | ✓ | Customers, Prospects / leads, Co-borrowers & guarantors, Nominees, Employees, Job applicants, Website & app visitors, Children (under 18) |
| cat | Personal data categories | multi | ✓ | Identity, Contact, Government identifiers (Aadhaar, PAN, Voter ID, Passport), Financial (bank, income, bureau, transactions), Biometric / photo, Location, Voice recordings, Device & online identifiers, Employment |
| attr | Data attributes | multi | ✓ | options filtered by `cat` (e.g. Government identifiers → Aadhaar number, PAN, Passport no., Voter ID) |
| ai | Uses AI, ML or automated decision-making? | select | ✓ | Yes / No |
| aip | AI purpose | text | ✓ if ai=Yes | |
| adm | Decision made without human review? | select | ✓ if ai=Yes | Yes / No |
| owner | Business process owner | select | ✓ | user list |
| poc | Point of contact | select | ✓ | user list |
| apps | Applications & systems | multi | ✓ | **from Data Discovery connections** (core-banking-db, los-db, gl-db, finacle-core, Salesforce CRM, moengage-campaigns, sap-successfactors, s3-kyc-docs, freshdesk-support…) |
| mode | Collection mode | multi | ✓ | Mobile app, Website, Branch form, Call centre, Partner API, Video KYC |
| freq | Collection frequency | select | ✓ | Continuous, Daily, Weekly, Monthly, One-time |
| srct | Data source | select | ✓ | Directly from the data principal, Third party, Public source |
| srcj | Source jurisdiction | multi | ✓ | India, Germany, Netherlands, United Kingdom, Singapore, United States, UAE |
| dpia | DPIA required? | select | ✓ | Yes / No / Not yet decided: **pre-filled by the rule engine** (R-10), user can override |

**Step 3 · Data storage**
ssys (Storage systems, multi, ✓, from Discovery connections) · sjur (Storage jurisdiction, multi, ✓) · hold (Who can access, multi, ✓: Employees, Contractors, Vendors) · afq (Access frequency, select, ✓) · bak (Backup available?, ✓) · bjur (Backup jurisdiction, multi, ✓ if bak=Yes) · copy (Personal data copies?, ✓) · csys (Copy storage system, text, ✓ if copy=Yes)

**Step 4 · Data transfer**
int (Internal transfer?, ✓) · irec (Internal recipients, multi, ✓ if int=Yes: business units) · ipur (Internal purpose, text, ✓ if int=Yes) · ext (External transfer?, ✓) · erec (External recipients, multi, ✓ if ext=Yes: **from Vendors list**) · epur (External purpose, text, ✓ if ext=Yes) · erole (Recipient role, select, ✓ if ext=Yes: Data Processor, Independent Data Fiduciary, Joint Data Fiduciary, Sub-processor, Government / regulator) · dpa (Contract / DPA signed?, ✓ if ext=Yes) · dpal (DPA link, url, ✓ if dpa=Yes) · xb (Cross-border transfer?, ✓) · xc (Recipient countries, multi, ✓ if xb=Yes) · xr (Restrictions noted, textarea, ✓ if xb=Yes) · xm (Transfer mode, select, ✓ if xb=Yes: API, SFTP, Cloud replication, Email, Remote access) · xs (Safeguards, multi, ✓ if xb=Yes and EU/UK GDPR selected: Adequacy decision, Standard Contractual Clauses, Binding Corporate Rules, Explicit consent (Art. 49), Contract necessity (Art. 49)) · xl (Safeguard document link, url, ✓ if xs not empty)

**Step 5 · Retention & disposal**
ret (Retention period, select, ✓): Until consent is withdrawn · 1 year (minimum log retention) · 3 years after last interaction · 5 years after relationship ends (RBI KYC / PMLA) · 8 years after loan closure (books of account) · Custom… → when Custom, show `retn` (number, ✓, 1–50) + `retu` (Months/Years, ✓) + `rett` (trigger text, ✓)
retp (Retention reason, text, ✓) · dm (Disposal method, select, ✓: Secure wipe, Cryptographic erasure, Physical destruction, Anonymisation) · do (Disposal owner, select, ✓)

**Step 6 · Security measures**
sec (Security measures applied?, ✓) · rest (At rest, multi, ✓ if Yes: AES-256 encryption, Disk encryption, Tokenisation, Masking, Aadhaar Data Vault) · tr (In transit, multi, ✓ if Yes: TLS 1.3, TLS 1.2, HTTPS, VPN / private link) · orgm (Organisational, multi, ✓ if Yes: Role-based access, MFA, Access logs retained ≥ 1 year, Quarterly access review, Backups tested, Vendor security clauses, Staff privacy training)

**Step 7 · Additional details** (only when Custom Fields exist): renders each custom field with its own type, required flag and options.

After the last step: **Save** → result screen (§7).

### 5.2 Asset: 6 steps
1 **Description**: name (✓, unique), purp (✓), desc · optional **"Import from Data Discovery"** select at the top: picking a discovered connection pre-fills name, storage type, location and data categories from Discovery's classification, with a banner "Pre-filled from Data Discovery · last scan 2 Nov 2026".
2 **Association**: resp (✓), area (✓), dist (multi ✓), linked activities (multi, from Processing Activities)
3 **Data storage**: stype (On-premises / Cloud / Hybrid ✓), etype (Owning entity, select ✓, from Companies), host (Hosting provider, from Vendors), cat (multi ✓), ds (multi ✓), net (✓), loc (Storage location ✓), sup (Vendor support access? ✓)
4 **Supplier**: supp (from Vendors), contract (text)
5 **Asset information**: pol (Policies, multi ✓, from Policies tab), del (Deletion period ✓), crit (Business-critical? ✓), secm (Security measures, multi ✓)
6 **Artificial intelligence**: ai (✓), aid (✓ if Yes), hr (High-risk AI? ✓ if Yes), train (Org data used to train? ✓ if Yes)

### 5.3 Third party (Vendor / Customer / Company / Other): one 5-step form
1 **Description**: name (✓, unique within type), etype (multi ✓), desc, web (url ✓)
2 **Address**: addr (✓), city (✓), state (✓), zip (✓, see V-08), country (✓)
3 **Association**: resp (✓), area (✓)
4 **Audit** (shown for all four types; required for Vendors, optional for the rest): atype (✓: Audit not required, Written confirmation, Audit statement / SOC 2 / ISO 27001 certificate, Self-assessment questionnaire, On-site audit), afreq (✓)
5 **Contact**: cname (✓), cemail (email ✓), crole (✓), cphone (optional, V-09)

Vendors also show a read-only **"Vendor Risk"** box when the name matches the Vendor Risk module's list (`D.vendors`): risk level, score, DPA status, with a link button `data-go="vendors"`.

### 5.4 Policy: 1 step
name (✓), ptype (✓: Privacy notice, Cookie policy, Retention policy, Information security policy, Grievance redressal policy, Vendor management policy), resp (✓), ver (✓, V-10), eff (Effective date, date ✓), next (Next review date, date ✓, after eff), link (url ✓)

### 5.5 Documentation: 1 step
name (✓), link (url ✓), desc, linked (multi: any activity, asset or vendor). Duplicate link → warning "This link is already saved as 'DPA – MoEngage'".

---

## 6. Rule engine (`ropaRules.js`): validations and live results

Two layers:
- **Field validation (V-xx):** format/required. Severity **error**; blocks Next/Save.
- **Compliance rules (R-xx):** read the whole record, return results with severity **error** (blocks Save), **warning** (amber, allowed), **info** (teal guidance) or **suggest** (offers a one-click fix button). Each result: `{ id, sev, step, field, title, message, cite, fix? }`.

Export pure functions: `validateField(spec, value, record, store)`, `evaluateRecord(type, record, store) → { results, riskScore, riskBand, completeness, dpiaRecommended }`. The wizard calls `evaluateRecord` on every change, so the dock and helpers update live.

### 6.1 Field validations

| ID | Applies to | Rule | Message |
|---|---|---|---|
| V-01 | any required | non-empty (multi: ≥1 chip) | "{Label} is required" |
| V-02 | name fields | 3–80 chars, trimmed | "Use 3 to 80 characters" |
| V-03 | name fields | unique within record type, case-insensitive | "An activity called 'KYC verification' already exists (PA-002)" + "Open it" link |
| V-04 | desc | 20–600 chars | "Add a little more detail (at least 20 characters)" · live counter "128 / 600" |
| V-05 | url fields | `^https://[^\s]+\.[^\s]{2,}` | "Enter a full https:// link". If it starts with http:// → "Use https:// for document links" |
| V-06 | email | standard email regex | "Enter a valid email, like name@aarohan.example" |
| V-07 | date (initial assessment, effective) | not in the future | "Date can't be in the future" |
| V-08 | zip | if country = India: `^[1-9][0-9]{5}$` ("Indian PIN codes have 6 digits and don't start with 0"); Germany/Netherlands: 4–5 digits; UK: postcode pattern; otherwise 3–10 alphanumerics | |
| V-09 | phone | India: `^(\+91[\s-]?)?[6-9]\d{9}$`; others: `^\+\d{7,15}$` | "Enter a 10-digit Indian mobile number" |
| V-10 | policy version | `^v\d+(\.\d+){0,2}$` | "Use a version like v3 or v3.2" |
| V-11 | next review date | after effective date | "Review date must be after the effective date" |
| V-12 | custom retention | number 1–50 | "Enter a period between 1 and 50" |
| V-13 | custom field key | `^[a-z][a-z0-9_]{1,39}$`, unique | "Use lowercase letters, numbers and underscores" |
| V-14 | custom field options | Dropdown/Multi Select need ≥2 unique options | "Add at least 2 different options" |

### 6.2 Compliance rules: Processing Activity

| ID | Trigger | Sev | Result shown | Cite |
|---|---|---|---|---|
| R-01 | `regs` changes | suggest | Role options adapt: DPDP-only → *Data Fiduciary, Data Processor, Significant Data Fiduciary*; GDPR-only → *Controller, Processor, Joint controller*; both → all, labelled "(DPDP)" / "(GDPR)". If the selected role no longer fits: "Under the DPDP Act a controller is called a **Data Fiduciary**." [Switch to Data Fiduciary] | DPDP s.2(i), GDPR Art. 4(7) |
| R-02 | `regs` changes | suggest | Lawful-basis options adapt. DPDP: Consent (s.6), Voluntarily provided for a specified purpose (s.7(a)), State function (s.7(b)), Legal obligation (s.7(c)), Court order (s.7(d)), Medical emergency (s.7(e)), Employment purposes (s.7(i)). GDPR: Art. 6(1)(a)–(f). If "Legitimate interest" is chosen with DPDP in scope → **warning** "The DPDP Act has no legitimate-interest basis. Use consent or one of the s.7 legitimate uses for Indian data principals." | DPDP s.4, s.7 |
| R-03 | purp includes Marketing AND law ≠ Consent | warning | "Marketing needs consent. None of the s.7 legitimate uses cover promotional messages." [Set basis to Consent] | DPDP s.6, s.7 |
| R-04 | law = Consent | info | Helper under the field: "Consent must be free, specific, informed, unconditional and unambiguous, and as easy to withdraw as to give. Linked consent notice: *Loan application notice v4* (Consent module)." | DPDP s.6(1), s.6(4) |
| R-05 | dpc includes Children | error if purp includes Marketing or Analytics; else info | Error: "Behavioural monitoring and targeted advertising directed at children aren't allowed." Info: "Verifiable consent from a parent or lawful guardian is required before processing." and law is forced to Consent | DPDP s.9(1), s.9(3) |
| R-06 | cat includes Government identifiers with Aadhaar number in attr | info + warning | Info: "Store Aadhaar numbers only in an Aadhaar Data Vault and mask them in displays." Warning if Step 6 `rest` lacks *Aadhaar Data Vault* or *Tokenisation*: "Aadhaar is collected but no vault or tokenisation is listed in security measures." [Go to step 6] | UIDAI Aadhaar Data Vault circular; DPDP Rule 6 |
| R-07 | ai = Yes | warning if dpia ≠ Yes | "AI or automated decisions on personal data usually need a DPIA." If org is SDF: info "Significant Data Fiduciaries must do due diligence that algorithmic software doesn't put data principals' rights at risk." | DPDP Rules 2025, Rule 13(3) |
| R-08 | ai = Yes AND adm = Yes AND purp includes Credit decision | warning | "Fully automated credit decisions: record a human-review route and explain the decision logic in the notice." | RBI Digital Lending Directions (fair practices) |
| R-09 | srct = Third party | info | "Record where the data comes from and that the source had a valid basis to share it." | DPDP s.8(1) |
| R-10 | always | suggest | **DPIA recommendation** computed from the risk score (§6.5): score ≥ 50, or any of children / AI with sensitive data / large-scale financial or government identifiers → pre-fill `dpia = Yes` with chip "Recommended". If the user sets No while recommended → warning "DPIA recommended (score 72). Add a reason if you decide not to run one." and a `dpiaWhy` textarea appears (required). | DPDP s.10(2)(c) (SDF), GDPR Art. 35 |
| R-11 | sjur or bjur includes any country ≠ India, while xb = No | error | "Data is stored in Singapore, which counts as a cross-border transfer. Set 'Cross-border transfer' to Yes on step 4." [Fix it] | DPDP s.16 |
| R-12 | xb = Yes | info | "Transfers outside India are allowed unless the country is restricted by a government notification under s.16(1). Sectoral rules still apply." List the chosen countries as chips. | DPDP s.16 |
| R-13 | xb = Yes AND cat includes Financial AND purp includes Loan disbursal / payments | warning | "Payment system data must be stored only in India under RBI's localisation directive. Confirm only a copy is processed abroad." | RBI payment data storage circular (2018) |
| R-14 | xb = Yes AND org is SDF AND xc not empty | info | "As an SDF, check whether any category is notified for localisation and that no traffic data leaves India." | DPDP Rules 2025, Rule 13(4) |
| R-15 | xb = Yes AND EU/UK GDPR selected AND xs empty | error | "Choose a transfer safeguard for EU/UK data (SCCs, BCRs or adequacy)." | GDPR Art. 30(1)(e), Arts. 45–49 |
| R-16 | xs includes Adequacy decision AND any xc ∉ {United Kingdom} | warning | "Confirm each recipient country has an EU adequacy decision. If not, use SCCs." | GDPR Art. 45 |
| R-17 | ext = Yes AND erole = Data Processor AND dpa = No | warning (high) | "You must have a valid contract with every Data Processor. Add the signed DPA." Also flags the vendor's row in Third Parties. | DPDP s.8(2), GDPR Art. 28(3) |
| R-18 | erec includes a vendor with DPA "Missing" in Vendor Risk | warning | "Partner NBFC (co-lending) has no DPA on file in Vendor Risk." [Open Vendor Risk] | Vendor Risk module data |
| R-19 | ret chosen vs law/purp | warning | KYC & AML or Legal obligation with retention < 5 years → "RBI KYC rules and PMLA require KYC records for 5 years after the relationship ends." Marketing with retention > 3 years after last interaction → "Erase marketing data once the purpose is served or consent is withdrawn." Consent basis with ret ≠ "Until consent is withdrawn" and no withdrawal trigger → info "Make sure data is erased when consent is withdrawn." | PMLA s.12, DPDP s.8(7), s.6(6) |
| R-20 | ret chosen | info | Helper: "Erase personal data once the purpose is no longer served, unless a law requires you to keep it. Processing logs must be kept for at least 1 year." | DPDP s.8(7), Rules 2025 Rule 8(3) |
| R-21 | sec = No | warning (high) | "A Data Fiduciary must protect personal data with reasonable security safeguards." [Set to Yes] | DPDP s.8(5), Rule 6 |
| R-22 | sec = Yes, checks the Rule 6 list | warning per missing item | Checklist in the dock: ☐ Encryption or masking at rest · ☐ Encryption in transit · ☐ Access control (Role-based access or MFA) · ☐ Access logs kept ≥ 1 year · ☐ Backups. Each unticked item says what to add. | DPDP Rules 2025, Rule 6 |
| R-23 | tr includes only TLS 1.2 or HTTPS | info | "TLS 1.3 is recommended for new integrations." | best practice |
| R-24 | date older than 12 months | warning | "Last assessed 14 months ago. Request re-attestation from the owner." [Request attestation] (toast + ledger) | accountability |
| R-25 | completeness | info | **Record completeness meter** against GDPR Art. 30(1)(a)–(g) when GDPR is selected (controller details, purposes, categories of data subjects & data, recipients, third-country transfers, erasure time limits, security measures) and against a DPDP checklist when DPDP is selected (purpose, lawful basis, notice link, data categories, retention, processors & contracts, safeguards, grievance contact). Shown as "6 of 7 Art. 30 items" with the missing ones listed. | GDPR Art. 30(1), DPDP s.5, s.8 |

### 6.3 Compliance rules: Asset
| ID | Trigger | Sev | Message |
|---|---|---|---|
| A-01 | crit = Yes AND secm empty | error | "Business-critical assets need at least one security measure." |
| A-02 | ai = Yes AND hr = Yes | warning | "High-risk AI asset: link it to a DPIA and an AI Governance review." [Open AI Governance] |
| A-03 | train = Yes AND cat includes Financial or Government identifiers | warning | "Training models on customer financial data needs a clear purpose and basis. Check the linked activities." |
| A-04 | loc ≠ India | info | "Hosted outside India. Linked activities must show a cross-border transfer." Also cross-checks R-11 on each linked activity. |
| A-05 | sup = Yes AND supp empty | warning | "Vendor support access is on, but no supplier is named." |
| A-06 | asset not linked to any activity | info | "Not used by any processing activity yet. Link one so the register stays complete." |
| A-07 | imported from Discovery AND Discovery finds Very High PII not in `cat` | suggest | "Data Discovery found Aadhaar and PAN in this source." [Add Government identifiers] |

### 6.4 Compliance rules: Third party / Policy / Documentation
| ID | Trigger | Sev | Message |
|---|---|---|---|
| T-01 | Vendor with atype = Audit not required AND linked to an activity with Government identifiers or Financial data | warning | "This vendor handles sensitive data. Ask for at least a written confirmation or certificate." |
| T-02 | Vendor country ≠ India | info | "Overseas vendor: activities that send data here are cross-border transfers." |
| T-03 | Vendor has no linked activity | info | "Not linked to any activity." |
| T-04 | web domain ≠ contact email domain | info | "The contact email domain doesn't match the website. Check it's the right contact." |
| P-01 | next review date passed | warning | "Review overdue by 23 days." (also shown in the list as an amber pill) |
| P-02 | next review > 12 months after effective | info | "Policies are usually reviewed at least once a year." |
| P-03 | ptype = Grievance redressal policy | info | "Must cover responding to data principals within 90 days." (DPDP Rules 2025, Rule 14(3)) |
| P-04 | same name and same version exists | error | "Version v3.2 of this policy already exists." |

### 6.5 Risk score (activities)
Start at 0, add weights, cap at 100. Shown as a dial/bar in the dock that animates as answers change.
- Government identifiers +20 · Financial +15 · Biometric/photo +15 · Voice +10 · Children +25
- AI = Yes +15 · fully automated decision (adm = Yes) +10
- Cross-border +10 (+5 more if outside India and no safeguard)
- External transfer to processor without DPA +15
- Security = No +20 · each missing Rule 6 item +3
- Continuous collection +5 · Third-party source +5

Bands: 0–29 **Low** (`sevPill("Low")`), 30–59 **Medium**, 60–100 **High**. The list's Risk column and the Dashboard use the same function.

---

## 7. Results and feedback on screen

This is what makes the demo interactive. Every input should visibly produce something.

1. **Inline helper under each field** changes with the value (R-04, R-12, R-20 style), in `.dim` text with a small icon. Examples: picking "5 years after relationship ends" shows "Matches RBI KYC record-keeping ✓"; ticking "Children (under 18)" shows a red result immediately if Marketing is a purpose.
2. **Compliance check dock** (right side, live):
   - Risk score bar + band pill, with "+20 Government identifiers" style reasons listed under it (top 4).
   - DPIA recommendation card: "DPIA recommended" / "Not required" with the reason.
   - Results grouped **Errors → Warnings → Guidance**, each with title, one-line message, cite tag (`tag("DPDP s.8(5)","ref")`), and a fix button where defined (`data-act="rp-fix" data-arg="R-17"`, applies the change, re-renders, toast "Updated: Cross-border transfer set to Yes").
   - Completeness meter (R-25).
   - Clicking a result jumps to its step and focuses the field.
3. **Stepper dots** show per-step error/warning counts.
4. **Save → result screen** (replaces the form inside the same card, not a modal):
   - Headline: "Customer onboarding registered as PA-009" (or "updated").
   - Three tiles: Risk (band + score), DPIA (Recommended / Not required), Open issues (n warnings).
   - Buttons: **Start DPIA** (`data-go="assess"`, shown when recommended; ledger "DPIA screening created for PA-009"), **Request attestation** (toast + ledger), **View in register**, **Add another**.
   - Writes `ledgerAdd("Processing activity registered", "PA-009 · Customer onboarding")` (or "updated"), plus toast.
5. **Delete** writes `ledgerAdd("Processing activity deleted", ...)`. Deleting a vendor, asset or policy that is linked elsewhere opens a modal listing the links: "Used by 3 activities. Remove the links and delete?"
6. **Lists reflect rules:** the Issues chip, the Risk pill, the overdue-review pill for policies, and "DPA missing" tags on vendors.

---

## 8. Dashboard tab

Everything is computed from the store, nothing hard-coded. Clicking a tile or bar opens the relevant list with the filter applied.

Row 1 (`.g g4`, 8 `kpi` tiles over two rows): Processing activities · Assets · Vendors · DPIA required (n, sub "x not started") · Uses AI · Cross-border · Open compliance issues (sub "x high") · Policies due for review.

Row 2 (`.g g2`):
- **Activities by lawful basis**: horizontal bars (use `bar()` styling), DPDP and GDPR bases labelled.
- **Cross-border transfers**: activity → country chips, with a safeguard tag or "No safeguard" warning tag.

Row 3 (`.g g2`):
- **Risk distribution**: High / Medium / Low counts as a stacked bar + list of the top 5 highest-score activities.
- **Recently updated**: last 5 records of any type, with type tag and time; click opens the record.

Row 4: **Compliance issues** card: a table of the top 10 open warnings across the register (record, issue, cite, step), each opening the wizard at that field.

Header strip above the KPIs: a `banner` "Aarohan Finance is an **SDF candidate**. Showing extra SDF checks (annual DPIA and audit, algorithmic due diligence)." with a toggle **SDF checks: On/Off** (`data-change-act="rp-toggle-sdf"`). Turning it off removes R-07(SDF), R-14 and the SDF banner text, and the issue counts update live. This is a good live demo moment.

Footer: "Compliance checks are illustrative guidance for this demo, not legal advice."

---

## 9. Roles (demo)

| Role | View | Create | Edit | Delete | Custom fields |
|---|---|---|---|---|---|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |
| DPO | ✓ | ✓ | ✓ | – | ✓ |
| Viewer | ✓ | – | – | – | – |

Disabled buttons keep a `title` explaining why. Switching "View as" re-renders and shows toast "Viewing as Viewer (read-only)".

---

## 10. Custom Fields tab

- Table: Label · Key · Type · Required · Options · Used in · Actions (Delete).
- **Add custom field** modal: Label (✓, unique), Key (auto-slug from label as you type, editable, V-13), Type (Text, Number, Date, Dropdown, Multi select), Options (shown for Dropdown/Multi; type then Enter to add a chip, V-14), Required toggle, **live preview** of the field as it will appear in the wizard.
- Saved fields appear as Step 7 "Additional details" in the Processing Activity wizard. Deleting a field that has values asks first: "3 activities have a value for 'Branch code'. Delete the field and its values?"

---

## 11. Seed data (`ropaData.js`): Aarohan Finance

Seed enough data that every widget and at least one example of each warning type shows on first load.

**Companies (3):** Aarohan Finance Ltd (India, Mumbai 400051), Aarohan Gold Loans Pvt Ltd (India, Kochi 682011), Aarohan Finance (EU) B.V. (Netherlands, Amsterdam 1017).

**Processing activities (9).** Convert the 7 existing `D.ropa` rows and add 2:
1. Loan origination: Consent; Govt IDs + Financial; AI No; LOS, core-banking-db; ext → CIBIL, Partner NBFC; retention 8 years after loan closure; High; DPIA Yes. *Shows R-18 (Partner NBFC DPA missing).*
2. KYC verification: Legal obligation s.7(c); Aadhaar, PAN, photo; core-banking-db, s3-kyc-docs; retention 5 years after relationship ends; Aadhaar Data Vault ✓. *Clean record example.*
3. Gold loan valuation: Consent; photo, address; gl-db; Medium; attestation date 14 months ago. *Shows R-24.*
4. Diwali campaign: Consent; Marketing; moengage-campaigns, Salesforce CRM; retention 3 years after last interaction; Medium.
5. Collections calling: s.7(a) voluntarily provided; voice recordings; Recovery Associates; High.
6. Payroll: s.7(i) employment; SAP SuccessFactors (EU hosting) with xb = Yes, SCCs. *Cross-border example.*
7. Credit scoring model: Consent; AI Yes, adm Yes; High; DPIA Yes (in progress). *Shows R-08.*
8. **New:** EU customer servicing: EU GDPR + DPDP; Aarohan Finance (EU) B.V.; Freshdesk; xb = Yes to India; safeguard SCCs. *GDPR completeness example.*
9. **New:** App analytics: Consent; device IDs, location; events_raw → BigQuery; storage in United States but **xb = No**. *Shows R-11 as a deliberate error so the demo can fix it live.* Store it as saved-with-issue (seeded records may break rules; only Save in the UI enforces them).

**Assets (8)** from Discovery: core-banking-db, los-db, gl-db, finacle-core, s3-kyc-docs, Salesforce CRM, moengage-campaigns, sap-successfactors, each linked to the activities above.

**Vendors (9)** = the Vendor Risk list (MoEngage, Freshdesk, Partner NBFC (co-lending), Recovery Associates, Amazon Web Services, Salesforce, SAP, Mailchimp) with matching country and DPA status; add CIBIL (TransUnion CIBIL) as a credit bureau.
**Customers (2):** corporate co-lending partners. **Others (2):** statutory auditor LLP, UIDAI (government).
**Policies (6):** Privacy notice v4.1, Cookie policy v2.0, Retention policy v1.4 (review overdue → P-01), Information security policy v3.0, Grievance redressal policy v1.1, Vendor management policy v2.2.
**Documentation (4):** DPA – MoEngage, DPA template – processors, SCCs – SAP, DPIA – Credit scoring model.
**Custom fields (1):** "Branch code" (Text, optional), so Step 7 is visible in the demo.

Users: Meera Iyer (DPO), Arjun Rao (Deputy DPO), Kavya Menon (Lending Ops), Rohit Shah (Compliance), Ananya Das (Growth), Vikram Pillai (IT Security), Sana Qureshi (HR).

Dates: relative to "today" so the demo never goes stale (e.g. `daysAgo(14)`).

---

## 12. Acceptance checklist (the developer must verify each)

- [ ] Sidebar "Data Map & ROPA" opens the new module; the old register table and 5-step wizard are gone; no console errors.
- [ ] All 7 tabs render with live counts; Third Parties sub-tabs work; Reset demo data restores the seed.
- [ ] Every prototype field from `ROPA.html` (all 6 activity steps, 6 asset steps, 5 entity steps, policy, documentation, custom fields) exists in the new forms.
- [ ] Conditional fields show/hide instantly and clear their value when hidden.
- [ ] V-01…V-14 fire with the exact messages; errors block Next/Save; warnings don't.
- [ ] Changing Regulations changes the Role and Lawful-basis options (R-01, R-02).
- [ ] Live demo script works end to end: open **App analytics** → dock shows R-11 error → click **Fix it** → error clears, risk score updates → Save → result screen recommends DPIA → **Start DPIA** goes to Assessments and a Proof Ledger entry exists.
- [ ] Ticking Children with Marketing shows the s.9(3) error immediately.
- [ ] SDF toggle on the Dashboard changes issue counts live.
- [ ] Viewer role: everything read-only, disabled buttons explain why.
- [ ] Data survives a page reload (localStorage) and the app still works in demo mode without the backend.
- [ ] Looks native in light and dark theme and at phone width (dock collapses).

---

## 13. Sources behind the rules (for the team, not shown in the UI)

- GDPR Art. 30: required contents of the record of processing: https://gdpr-info.eu/art-30-gdpr/
- DPDP Rules 2025 notified 13 Nov 2025; Data Fiduciary obligations (Rules 3, 5–16) apply from 13 May 2027; Rule 8(3) 1-year log retention; Rule 13(3)/(4) SDF algorithmic due diligence and traffic-data restriction; Rule 14(3) 90-day response: https://ssrana.in/articles/meity-notifies-final-digital-personal-data-protection-rules-2025/
- Rule 6 safeguards (encryption, masking, tokenisation, access control, logs, backups), 48-hour pre-erasure notice, SDF annual DPIA and audit: https://www.lawrbit.com/article/digital-personal-data-protection-rules-2025
- DPDP Act 2023 sections used: s.4 & s.7 (grounds and legitimate uses), s.6 (consent), s.8(2) (processor contract), s.8(5) (security safeguards), s.8(7) (erasure), s.9 (children), s.10 (SDF), s.16 (cross-border).
- Sectoral: RBI KYC Master Direction / PMLA s.12 (5-year KYC record keeping), RBI payment data storage directive (2018), UIDAI Aadhaar Data Vault requirement, Companies Act s.128 (8-year books of account).
