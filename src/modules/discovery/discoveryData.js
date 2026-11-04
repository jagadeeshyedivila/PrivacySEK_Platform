// Discovery data store, persisted in MongoDB through moduleStore, with Aarohan Finance seed data
import { createModuleStore } from "../../platform/moduleStore.js";

export const OVERVIEW_SEED = {
  scan: {
    totalTB: 10,
    piiTB: 1.0,
    piiPct: 10,
    lastScan: "Today 06:10",
    piiTBByRisk: { veryHigh: 0.4, high: 0.3, medium: 0.2, low: 0.1 }
  },
  accuracy: { pct: 95, autoAccepted: 1178, needsReview: 62 },
  inventory: {
    sources: 12,
    schemas: 38,
    tables: 412,
    columnsScanned: 6820,
    piiColumns: 1240,
    failedTables: 3
  },
  riskColumns: { veryHigh: 304, high: 430, medium: 278, low: 228 }, // sums to 1240
  confidenceBands: { "90-100": 78, "80-89": 17, "<80": 5 }, // % of PII columns
  topPii: [
    ["Email", 200, 94, 99, "High"],
    ["Mobile number", 176, 90, 99, "High"],
    ["Full name", 142, 86, 98, "Medium"],
    ["Date of birth", 96, 82, 97, "Medium"],
    ["Father's name", 88, 74, 93, "Medium"],
    ["PAN", 41, 95, 100, "Very high"],
    ["Bank account", 33, 88, 99, "Very high"],
    ["Aadhaar", 19, 91, 100, "Very high"],
    ["Card number", 45, 96, 100, "Very high"],
    ["Voter ID", 35, 90, 99, "Very high"],
    ["Passport number", 30, 92, 100, "Very high"],
    ["GSTIN", 28, 90, 98, "Very high"],
    ["Driving licence", 25, 88, 97, "Very high"],
    ["Password hash", 24, 94, 100, "Very high"],
    ["Ration card", 24, 89, 98, "Very high"],
    ["UPI ID", 30, 89, 98, "High"],
    ["Annual salary", 24, 84, 95, "High"],
    ["IFSC code", 28, 85, 96, "Medium"],
    ["Occupation", 20, 81, 93, "Medium"],
    ["Loan account number", 18, 79, 90, "Medium"],
    ["Nominee name", 34, 75, 91, "Low"],
    ["IP address", 30, 78, 92, "Low"],
    ["Landline number", 28, 77, 90, "Low"],
    ["Customer ID", 22, 76, 89, "Low"]
  ],
  bySource: [
    ["core-banking-db", "postgresql", 3.1, 0.42, 9, 96, 380],
    ["los-db", "postgresql", 2.2, 0.24, 6, 71, 262],
    ["gl-db", "oracle", 1.4, 0.12, 4, 48, 150],
    ["Salesforce CRM", "salesforce", 1.0, 0.09, 5, 64, 140],
    ["BigQuery Analytics", "bigquery", 0.9, 0.05, 6, 52, 118],
    ["Other 4 sources", "mixed", 1.4, 0.08, 8, 81, 190]
  ],
  failedTablesList: [
    { conn: "los-db", schema: "los_temp", table: "loan_collateral_temp", reason: "Permission denied: SELECT privilege required on schema 'los_temp'", failedAt: "Today 06:08 AM" },
    { conn: "core-banking-db", schema: "reconcile", table: "payment_reconciliation_stage", reason: "Connection timeout after 30,000ms reflecting foreign-key constraints", failedAt: "Today 06:09 AM" },
    { conn: "gl-db", schema: "archive_vault", table: "archive_vault_2024", reason: "Corrupted table metadata catalog dictionary block", failedAt: "Today 06:10 AM" }
  ],
  trend30d: [
    { day: 1, date: "Oct 3", cols: 1052, scan: null },
    { day: 2, date: "Oct 4", cols: 1055, scan: null },
    { day: 3, date: "Oct 5", cols: 1058, scan: null },
    { day: 4, date: "Oct 6", cols: 1062, scan: null },
    { day: 5, date: "Oct 7", cols: 1068, scan: "Sprint Scan #41 (+16)" },
    { day: 6, date: "Oct 8", cols: 1070, scan: null },
    { day: 7, date: "Oct 9", cols: 1075, scan: null },
    { day: 8, date: "Oct 10", cols: 1081, scan: null },
    { day: 9, date: "Oct 11", cols: 1089, scan: null },
    { day: 10, date: "Oct 12", cols: 1098, scan: null },
    { day: 11, date: "Oct 13", cols: 1105, scan: null },
    { day: 12, date: "Oct 14", cols: 1114, scan: "Bi-weekly Ingestion #42 (+19)" },
    { day: 13, date: "Oct 15", cols: 1120, scan: null },
    { day: 14, date: "Oct 16", cols: 1128, scan: null },
    { day: 15, date: "Oct 17", cols: 1136, scan: null },
    { day: 16, date: "Oct 18", cols: 1144, scan: null },
    { day: 17, date: "Oct 19", cols: 1152, scan: null },
    { day: 18, date: "Oct 20", cols: 1162, scan: null },
    { day: 19, date: "Oct 21", cols: 1171, scan: null },
    { day: 20, date: "Oct 22", cols: 1180, scan: "Schema Refresh #43 (+18)" },
    { day: 21, date: "Oct 23", cols: 1188, scan: null },
    { day: 22, date: "Oct 24", cols: 1195, scan: null },
    { day: 23, date: "Oct 25", cols: 1202, scan: null },
    { day: 24, date: "Oct 26", cols: 1208, scan: null },
    { day: 25, date: "Oct 27", cols: 1215, scan: null },
    { day: 26, date: "Oct 28", cols: 1221, scan: null },
    { day: 27, date: "Oct 29", cols: 1227, scan: null },
    { day: 28, date: "Oct 30", cols: 1232, scan: null },
    { day: 29, date: "Oct 31", cols: 1236, scan: null },
    { day: 30, date: "Today 06:10", cols: 1240, scan: "Full Reflection Today (+8)" }
  ],
  unstructured: {
    totalTB: 1.8,
    // 92,000 call recordings (asset call_recordings/) + 56,000 documents and images
    totalFiles: 148000,
    scannedFiles: 56000, // content-scanned documents and images
    fileTypesCount: 14,
    sensitiveFiles: 4100, // content-scanned files with SPI or PII
    accuracyPct: 91,
    autoAccepted: 3731,
    needsReview: 369,
    // Classified from call metadata only; spoken content is not transcribed
    metadataOnly: [
      { ext: "WAV", count: 92000, source: "azure-loan-archive · call_recordings/", holds: "Voice recording and caller number" }
    ],
    topTypes: [
      { ext: "PDF", count: 21000, sensitive: 2150, risk: "VH" },
      { ext: "XLSX", count: 12000, sensitive: 980, risk: "H" },
      { ext: "JPG", count: 9500, sensitive: 540, risk: "VH" },
      { ext: "DOCX", count: 6500, sensitive: 220, risk: "M" },
      { ext: "CSV", count: 4000, sensitive: 150, risk: "M" },
      { ext: "TXT", count: 2000, sensitive: 60, risk: "L" }
    ],
    // Document classes; `contains` lists the entities that decide the class
    topEntities: [
      { name: "Aadhaar card scans", count: 1850, risk: "VH", min: 92, max: 100,
        contains: [{ name: "Aadhaar", cls: "SPI" }, { name: "Name", cls: "PII" }, { name: "Date of birth", cls: "PII" }, { name: "Address", cls: "PII" }] },
      { name: "PAN card images", count: 1240, risk: "VH", min: 93, max: 99,
        contains: [{ name: "PAN", cls: "SPI" }, { name: "Name", cls: "PII" }, { name: "Date of birth", cls: "PII" }, { name: "Father's name", cls: "PII" }] },
      { name: "Salary slips / Form 16", count: 620, risk: "H", min: 85, max: 96,
        contains: [{ name: "Salary", cls: "PII" }, { name: "Employer", cls: "PII" }, { name: "PAN", cls: "SPI", unconfirmed: true }, { name: "Bank account", cls: "SPI", unconfirmed: true }],
        verify: "Matched by document layout only. Salary is PII; the PAN (always on Form 16) and bank account (often on salary slips) were not extracted, so whether these files hold SPI is unconfirmed" },
      { name: "Bank statements", count: 390, risk: "VH", min: 88, max: 98,
        contains: [{ name: "Bank account", cls: "SPI" }, { name: "Name", cls: "PII" }, { name: "Address", cls: "PII" }, { name: "Transactions", cls: "PII" }] }
    ]
  }
};

export function buildDetailedFindings() {
  const sources = [
    { name: "core-banking-db", type: "postgresql", piiCols: 380, schemas: ["customers", "accounts", "cards", "transactions", "loans", "payments", "kyc", "gl", "audit"] },
    { name: "los-db", type: "postgresql", piiCols: 262, schemas: ["leads", "origination", "underwriting", "disbursement", "collateral", "crm"] },
    { name: "gl-db", type: "oracle", piiCols: 150, schemas: ["gold_vault", "appraisals", "custody", "auction"] },
    { name: "Salesforce CRM", type: "salesforce", piiCols: 140, schemas: ["sales", "service", "marketing", "onboarding", "community"] },
    { name: "BigQuery Analytics", type: "bigquery", piiCols: 118, schemas: ["telemetry", "clickstream", "risk_models", "bi_reporting", "ml_features", "archive"] },
    { name: "Other 4 sources", type: "mixed", piiCols: 190, schemas: ["payroll", "treasury", "gateway", "switch", "vendor_sync", "reconcile", "tokens", "backup"] }
  ];

  const typesDef = [
    { type: "Email", cat: "Contact Information", target: 200, rk: "H", min: 94, max: 99 },
    { type: "Mobile number", cat: "Contact Information", target: 176, rk: "H", min: 90, max: 99 },
    { type: "Full name", cat: "Demographic Information", target: 142, rk: "M", min: 86, max: 98 },
    { type: "Date of birth", cat: "Demographic Information", target: 96, rk: "M", min: 82, max: 97 },
    { type: "Father's name", cat: "Demographic Information", target: 88, rk: "M", min: 74, max: 93 },
    { type: "PAN", cat: "Financial Information", target: 41, rk: "VH", min: 95, max: 100 },
    { type: "Bank account", cat: "Financial Information", target: 33, rk: "VH", min: 88, max: 99 },
    { type: "Aadhaar", cat: "Demographic Information", target: 19, rk: "VH", min: 91, max: 100 },
    { type: "Card number", cat: "Financial Information", target: 45, rk: "VH", min: 96, max: 100 },
    { type: "Voter ID", cat: "Demographic Information", target: 35, rk: "VH", min: 90, max: 99 },
    { type: "Passport number", cat: "Demographic Information", target: 30, rk: "VH", min: 92, max: 100 },
    { type: "GSTIN", cat: "Financial Information", target: 28, rk: "VH", min: 90, max: 98 },
    { type: "Driving licence", cat: "Demographic Information", target: 25, rk: "VH", min: 88, max: 97 },
    { type: "Password hash", cat: "Authentication and Secrets", target: 24, rk: "VH", min: 94, max: 100 },
    { type: "Ration card", cat: "Demographic Information", target: 24, rk: "VH", min: 89, max: 98 },
    { type: "UPI ID", cat: "Financial Information", target: 30, rk: "H", min: 89, max: 98 },
    { type: "Annual salary", cat: "Financial Information", target: 24, rk: "H", min: 84, max: 95 },
    { type: "IFSC code", cat: "Financial Information", target: 28, rk: "M", min: 85, max: 96 },
    { type: "Occupation", cat: "Demographic Information", target: 20, rk: "M", min: 81, max: 93 },
    { type: "Loan account number", cat: "Financial Information", target: 18, rk: "M", min: 79, max: 90 },
    { type: "Nominee name", cat: "Demographic Information", target: 34, rk: "L", min: 75, max: 91 },
    { type: "IP address", cat: "Online Identifiers", target: 30, rk: "L", min: 78, max: 92 },
    { type: "Landline number", cat: "Contact Information", target: 28, rk: "L", min: 77, max: 90 },
    { type: "Customer ID", cat: "Online Identifiers", target: 22, rk: "L", min: 76, max: 89 }
  ];

  let mToLCount = 114;
  const findings = [];
  let colIdx = 1;

  for (const t of typesDef) {
    for (let i = 0; i < t.target; i++) {
      let rk = t.rk;
      if (rk === "M" && mToLCount > 0 && (t.type === "Father's name" || t.type === "Date of birth" || t.type === "Full name")) {
        rk = "L";
        mToLCount--;
      }
      findings.push({
        id: `col-${colIdx++}`,
        type: t.type,
        cat: t.cat,
        rk,
        min: t.min,
        max: t.max
      });
    }
  }

  // Assign confidence scores: exactly 967 in 90-100, 211 in 80-89, 62 in <80
  let b90 = 967;
  let b80 = 211;
  let bLow = 62;

  findings.forEach((f, idx) => {
    let conf;
    if (bLow > 0 && (f.min < 80 || idx % 20 === 0)) {
      conf = 72 + (idx % 8); // 72 to 79
      bLow--;
    } else if (b80 > 0 && (f.min < 90 || idx % 5 === 0)) {
      conf = 80 + (idx % 10); // 80 to 89
      b80--;
    } else {
      conf = 90 + (idx % 11); // 90 to 100
      b90--;
    }
    f.conf = conf;
    f.accepted = conf >= 80;
  });

  // Assign to source connections strictly matching exact counts
  const sourceQuotas = [
    { src: sources[0], remaining: 380 },
    { src: sources[1], remaining: 262 },
    { src: sources[2], remaining: 150 },
    { src: sources[3], remaining: 140 },
    { src: sources[4], remaining: 118 },
    { src: sources[5], remaining: 190 }
  ];

  // Tables are grouped by data category inside each schema, so a source never shows more
  // tables with detections than its inventory holds
  const TABLE_BY_CAT = {
    "Contact Information": "contact_details", "Demographic Information": "party_profile",
    "Financial Information": "financial_details", "Online Identifiers": "device_sessions",
    "Biometric Identifiers": "biometric_refs", "Authentication and Secrets": "credentials"
  };
  const perSource = {};
  const perTableCol = {};
  let srcIdx = 0;
  findings.forEach((f, i) => {
    while (sourceQuotas[srcIdx].remaining === 0) {
      srcIdx = (srcIdx + 1) % sourceQuotas.length;
    }
    const cur = sourceQuotas[srcIdx];
    f.connName = cur.src.name;
    f.connType = cur.src.type;
    const n = perSource[cur.src.name] = (perSource[cur.src.name] || 0) + 1;
    const sch = cur.src.schemas[(n - 1) % cur.src.schemas.length];
    f.schema = sch;
    const cleanType = f.type.toLowerCase().replace(/'/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    f.tableName = sch === "customers" ? "customers.kyc" : `${sch}.${TABLE_BY_CAT[f.cat] || "records"}`;
    const base = f.type === "Aadhaar" ? "aadhaar_no" :
                 f.type === "PAN" ? "pan_no" :
                 f.type === "Email" ? "email_address" :
                 f.type === "Mobile number" ? "mobile_number" :
                 cleanType;
    const colKey = `${cur.src.name}::${f.tableName}::${base}`;
    const dup = perTableCol[colKey] = (perTableCol[colKey] || 0) + 1;
    f.colName = dup === 1 ? base : `${base}_${dup}`;
    f.sample = f.type === "Aadhaar" ? "•••• •••• 9281" :
               f.type === "PAN" ? "ABCDE••••F" :
               f.type === "Email" ? "cust••••@aarohan.fin" :
               f.type === "Mobile number" ? "+91 98••••••21" :
               f.type === "Bank account" ? "••••••••9842" :
               f.type === "Card number" ? "4•••  ••••  ••••  1043" :
               "••••••••";
    cur.remaining--;
    srcIdx = (srcIdx + 1) % sourceQuotas.length;
  });

  return findings;
}

export function assertSeedTotalsReconciliation(seed = OVERVIEW_SEED, findings = null) {
  const issues = [];
  const topPiiSum = seed.topPii.reduce((sum, item) => sum + item[1], 0);
  if (topPiiSum !== 1240) issues.push(`topPii sum ${topPiiSum} !== 1240`);
  if (seed.inventory.piiColumns !== 1240) issues.push(`piiColumns ${seed.inventory.piiColumns} !== 1240`);

  const riskSum = seed.riskColumns.veryHigh + seed.riskColumns.high + seed.riskColumns.medium + seed.riskColumns.low;
  if (riskSum !== 1240) issues.push(`riskColumns sum ${riskSum} !== 1240`);
  if (seed.riskColumns.veryHigh !== 304 || seed.riskColumns.high !== 430 || seed.riskColumns.medium !== 278 || seed.riskColumns.low !== 228) {
    issues.push("riskColumns breakdown mismatch: expected 304/430/278/228");
  }

  const bySourceTbScanned = Math.round(seed.bySource.reduce((s, r) => s + r[2], 0) * 10) / 10;
  const bySourceTbPii = Math.round(seed.bySource.reduce((s, r) => s + r[3], 0) * 100) / 100;
  if (bySourceTbScanned !== 10.0) issues.push(`bySource TB scanned ${bySourceTbScanned} !== 10.0`);
  if (bySourceTbPii !== 1.00) issues.push(`bySource TB PII ${bySourceTbPii} !== 1.00`);
  if (seed.scan.totalTB !== 10) issues.push(`scan.totalTB ${seed.scan.totalTB} !== 10`);
  if (seed.scan.piiTB !== 1.0) issues.push(`scan.piiTB ${seed.scan.piiTB} !== 1.0`);

  const bySourceSchemas = seed.bySource.reduce((s, r) => s + r[4], 0);
  const bySourceTables = seed.bySource.reduce((s, r) => s + r[5], 0);
  const bySourcePiiCols = seed.bySource.reduce((s, r) => s + r[6], 0);
  if (bySourceSchemas !== 38) issues.push(`bySource schemas ${bySourceSchemas} !== 38`);
  if (bySourceTables !== 412) issues.push(`bySource tables ${bySourceTables} !== 412`);
  if (bySourcePiiCols !== 1240) issues.push(`bySource piiCols ${bySourcePiiCols} !== 1240`);
  if (seed.inventory.sources !== 12) issues.push(`inventory.sources ${seed.inventory.sources} !== 12`);
  if (seed.inventory.schemas !== 38) issues.push(`inventory.schemas ${seed.inventory.schemas} !== 38`);
  if (seed.inventory.tables !== 412) issues.push(`inventory.tables ${seed.inventory.tables} !== 412`);
  if (seed.inventory.failedTables !== 3) issues.push(`inventory.failedTables ${seed.inventory.failedTables} !== 3`);

  if (seed.accuracy.autoAccepted + seed.accuracy.needsReview !== 1240) {
    issues.push(`accuracy sum ${seed.accuracy.autoAccepted + seed.accuracy.needsReview} !== 1240`);
  }
  if (Math.round((seed.accuracy.autoAccepted / 1240) * 100) !== 95) {
    issues.push("accuracy pct !== 95");
  }

  if (findings) {
    if (findings.length !== 1240) issues.push(`findings.length ${findings.length} !== 1240`);
    const fVh = findings.filter(f => f.rk === "VH").length;
    const fH = findings.filter(f => f.rk === "H").length;
    const fM = findings.filter(f => f.rk === "M").length;
    const fL = findings.filter(f => f.rk === "L").length;
    if (fVh !== 304 || fH !== 430 || fM !== 278 || fL !== 228) {
      issues.push(`findings risk mismatch: VH:${fVh}, H:${fH}, M:${fM}, L:${fL}`);
    }
    const fConfLow = findings.filter(f => f.conf < 80).length;
    const fAuto = findings.filter(f => f.accepted).length;
    if (fConfLow !== 62 || fAuto !== 1178) {
      issues.push(`findings accuracy mismatch: review=${fConfLow}, auto=${fAuto}`);
    }
  }

  if (issues.length > 0) {
    console.error("[DEV-CHECK FAILED] Seed totals reconciliation errors:", issues);
    return false;
  }
  console.info("[DEV-CHECK PASSED] All seed totals reconcile exactly (1,240 cols; 304/430/278/228 risk; 10 TB scanned; 1.00 TB PII; 12 sources; 38 schemas; 412 tables; 95% accuracy; 62 need review; 3 failed tables).");
  return true;
}

// Execute dev-only check at load time
assertSeedTotalsReconciliation(OVERVIEW_SEED);

const RC = (n, k, c, r) => ({ n, k, c, r });

export function createInitialDiscoveryData() {
  return {
    connections: [
      {
        id: "c-core-db",
        name: "core-banking-db",
        type: "postgresql",
        kind: "S",
        desc: "Primary transaction processing database for customer accounts and balances",
        status: "ok",
        created: "10/12/2026, 06:10 AM",
        updated: "10/30/2026, 08:45 AM",
        failed: 1,
        fields: { host: "core-db.internal.aarohan.fin", port: 5432, db: "core_banking", user: "psek_reader", pw: "••••••••" },
        tables: [
          {
            name: "customers.kyc",
            cols: [
              { col: "customer_id", cat: "Online Identifiers", cl: "Customer ID", rk: "H" },
              { col: "aadhaar_no", cat: "Demographic Information", cl: "Aadhaar Card", rk: "VH" },
              { col: "pan_no", cat: "Financial Information", cl: "PAN Card", rk: "VH" },
              { col: "full_name", cat: "Demographic Information", cl: "Full Name", rk: "H" },
              { col: "date_of_birth", cat: "Demographic Information", cl: "Date of Birth", rk: "M" },
              { col: "mobile_number", cat: "Contact Information", cl: "Phone Number", rk: "H" },
              { col: "email_address", cat: "Contact Information", cl: "Email Address", rk: "H" },
              { col: "permanent_address", cat: "Demographic Information", cl: "Residential Address", rk: "M" },
              { col: "biometric_fingerprint_ref", cat: "Biometric Identifiers", cl: "Biometric Template", rk: "VH" }
            ]
          },
          {
            name: "accounts_master",
            cols: [
              { col: "account_no", cat: "Financial Information", cl: "Bank Account", rk: "VH" },
              { col: "account_type", cat: "Financial Information", cl: "Product Type", rk: "L" },
              { col: "ifsc_code", cat: "Financial Information", cl: "Bank Routing IFSC", rk: "M" },
              { col: "balance_amount", cat: "Financial Information", cl: "Account Balance", rk: "H" }
            ]
          },
          {
            name: "debit_cards",
            cols: [
              { col: "card_token", cat: "Financial Information", cl: "Card Token", rk: "H" },
              { col: "masked_pan", cat: "Financial Information", cl: "Masked Card Number", rk: "M" }
            ]
          }
        ]
      },
      {
        id: "c-los-db",
        name: "los-db",
        type: "postgresql",
        kind: "S",
        desc: "Loan origination system database handling retail and MSME loan workflows",
        status: "ok",
        created: "10/14/2026, 07:20 AM",
        updated: "10/30/2026, 09:12 AM",
        failed: 1,
        fields: { host: "los.internal.aarohan.fin", port: 5432, db: "los_production", user: "psek_ro", pw: "••••••••" },
        tables: [
          {
            name: "loan_applications",
            cols: [
              { col: "application_id", cat: "Online Identifiers", cl: "Application ID", rk: "M" },
              { col: "applicant_name", cat: "Demographic Information", cl: "Full Name", rk: "H" },
              { col: "annual_income", cat: "Financial Information", cl: "Income Assessment", rk: "H" },
              { col: "bank_acct", cat: "Financial Information", cl: "Bank Account Number", rk: "VH" },
              { col: "cibil_score", cat: "Financial Information", cl: "Credit Score", rk: "M" },
              { col: "employer_name", cat: "Demographic Information", cl: "Employment Record", rk: "M" }
            ]
          },
          {
            name: "disbursements",
            cols: [
              { col: "disbursement_id", cat: "Financial Information", cl: "Transaction Ref", rk: "L" },
              { col: "beneficiary_bank_acct", cat: "Financial Information", cl: "Bank Account Number", rk: "VH" },
              { col: "disbursed_amount", cat: "Financial Information", cl: "Loan Disbursal", rk: "M" },
              { col: "upi_vpa", cat: "Financial Information", cl: "UPI Handle", rk: "H" }
            ]
          }
        ]
      },
      {
        id: "c-gl-db",
        name: "gl-db",
        type: "oracle",
        kind: "S",
        desc: "Oracle database storing collateral valuation and gold loan vault ledgers",
        status: "ok",
        created: "10/15/2026, 08:30 AM",
        updated: "10/29/2026, 11:20 AM",
        failed: 1,
        fields: { host: "gl-db.mumbai.aarohan.fin", port: 1521, db: "GLVAULT", user: "psek_audit", pw: "••••••••" },
        tables: [
          {
            name: "gold_loan_vault",
            cols: [
              { col: "ornament_packet_id", cat: "Online Identifiers", cl: "Asset Identifier", rk: "L" },
              { col: "borrower_aadhaar", cat: "Demographic Information", cl: "Aadhaar Card", rk: "VH" },
              { col: "borrower_photo_ref", cat: "Biometric Identifiers", cl: "Photo Facial Geometry", rk: "VH" },
              { col: "residential_address", cat: "Demographic Information", cl: "Residential Address", rk: "M" }
            ]
          }
        ]
      },
      {
        id: "c-salesforce",
        name: "Salesforce CRM",
        type: "salesforce",
        kind: "S",
        desc: "Customer acquisition and retail loan leads pipeline org",
        status: "ok",
        created: "10/16/2026, 10:15 AM",
        updated: "10/30/2026, 07:45 AM",
        failed: 0,
        fields: { host: "aarohanfinance.my.salesforce.com", port: 443, db: "Production", user: "integration_psek", pw: "••••••••" },
        tables: [
          {
            name: "leads_2026",
            cols: [
              { col: "lead_name", cat: "Demographic Information", cl: "Full Name", rk: "H" },
              { col: "email_address", cat: "Contact Information", cl: "Email Address", rk: "H" },
              { col: "mobile_phone", cat: "Contact Information", cl: "Phone Number", rk: "H" },
              { col: "city_location", cat: "Demographic Information", cl: "City / Region", rk: "L" }
            ]
          }
        ]
      },
      {
        id: "c-bigquery",
        name: "BigQuery Analytics",
        type: "bigquery",
        kind: "S",
        desc: "Analytical data lake for loan telemetry and customer event tracking",
        status: "ok",
        created: "10/18/2026, 11:00 AM",
        updated: "10/29/2026, 04:30 PM",
        failed: 0,
        fields: { host: "bigquery.googleapis.com", port: 443, db: "af-analytics-prod", user: "sa-psek-discovery", pw: "••••••••" },
        tables: [
          {
            name: "events_raw",
            cols: [
              { col: "device_fingerprint_id", cat: "Online Identifiers", cl: "Device ID", rk: "L" },
              { col: "ip_address", cat: "Online Identifiers", cl: "IP Address", rk: "L" },
              { col: "session_token", cat: "Authentication and Secrets", cl: "Session Token", rk: "H" }
            ]
          }
        ]
      },
      {
        id: "c-s3-docs",
        name: "s3-kyc-docs",
        type: "s3",
        kind: "U",
        desc: "Amazon S3 bucket collection for uploaded Aadhaar, PAN and bank statement PDFs",
        status: "ok",
        created: "10/19/2026, 01:15 PM",
        updated: "10/30/2026, 09:30 AM",
        failed: 0,
        fields: { tenant: "af-kyc-documents-ap-south-1", group: "production-buckets", client: "AKIA_PSEK_AUDIT_KEY", secret: "••••••••" },
        tables: []
      },
      {
        id: "c-azure-blob",
        name: "azure-loan-archive",
        type: "azureblob",
        kind: "U",
        desc: "Azure Blob storage for call recordings, loan agreements and voice verifications",
        status: "ok",
        created: "10/20/2026, 02:40 PM",
        updated: "10/28/2026, 05:10 PM",
        failed: 0,
        fields: { tenant: "aarohan-finance-azure", group: "call-recordings-archive", client: "sp-psek-scanner", secret: "••••••••" },
        tables: []
      },
      {
        id: "c-freshdesk",
        name: "freshdesk-support",
        type: "mysql",
        kind: "S",
        desc: "Customer support ticket database and borrower grievance inquiries",
        status: "ok",
        created: "10/21/2026, 03:00 PM",
        updated: "10/29/2026, 02:15 PM",
        failed: 0,
        fields: { host: "freshdesk.db.aarohan.fin", port: 3306, db: "support_tickets", user: "psek_ro", pw: "••••••••" },
        tables: [
          {
            name: "support_tickets",
            cols: [
              { col: "ticket_id", cat: "Online Identifiers", cl: "Ticket Reference", rk: "L" },
              { col: "customer_email", cat: "Contact Information", cl: "Email Address", rk: "H" },
              { col: "grievance_free_text", cat: "Demographic Information", cl: "Unstructured Notes", rk: "M" }
            ]
          }
        ]
      },
      {
        id: "c-moengage",
        name: "moengage-campaigns",
        type: "postgresql",
        kind: "S",
        desc: "Marketing communication engine and loan offer messaging database",
        status: "ok",
        created: "10/22/2026, 09:30 AM",
        updated: "10/30/2026, 06:10 AM",
        failed: 0,
        fields: { host: "moengage-sync.aarohan.fin", port: 5432, db: "campaign_audience", user: "psek_reader", pw: "••••••••" },
        tables: [
          {
            name: "campaign_audience",
            cols: [
              { col: "phone_number", cat: "Contact Information", cl: "Phone Number", rk: "H" },
              { col: "opt_in_consent_status", cat: "Demographic Information", cl: "Consent Flags", rk: "M" },
              { col: "preferred_language", cat: "Demographic Information", cl: "Locale Preference", rk: "L" }
            ]
          }
        ]
      },
      {
        id: "c-sap-hr",
        name: "sap-successfactors",
        type: "hana",
        kind: "S",
        desc: "Internal employee HR, payroll disbursements and statutory PF records",
        status: "ok",
        created: "10/23/2026, 11:45 AM",
        updated: "10/29/2026, 04:20 PM",
        failed: 0,
        fields: { host: "hana-cloud.sap.aarohan.fin", port: 30015, db: "AF_HR_PROD", user: "psek_audit", pw: "••••••••" },
        tables: [
          {
            name: "hr_payroll",
            cols: [
              { col: "employee_pan", cat: "Financial Information", cl: "PAN Card", rk: "VH" },
              { col: "salary_ctc_amount", cat: "Financial Information", cl: "Compensation Data", rk: "VH" },
              { col: "salary_account_no", cat: "Financial Information", cl: "Bank Account Number", rk: "VH" },
              { col: "pf_uan_no", cat: "Demographic Information", cl: "UAN Provident Fund", rk: "H" }
            ]
          }
        ]
      },
      {
        id: "c-google-drive",
        name: "google-workspace-drive",
        type: "gdrive",
        kind: "U",
        desc: "Employee Google Drive shares containing spreadsheet exports and branch scans",
        status: "risk",
        created: "10/24/2026, 04:15 PM",
        updated: "10/30/2026, 10:15 AM",
        failed: 0,
        fields: { tenant: "aarohanfinance.com", group: "Drive - 412 Users", client: "gsuite-psek-scanner", secret: "••••••••" },
        tables: []
      },
      {
        id: "c-finacle-core",
        name: "finacle-core",
        type: "oracle",
        kind: "S",
        desc: "Core banking batch extract files and daily reconciliation ledgers",
        status: "ok",
        created: "10/25/2026, 05:00 PM",
        updated: "10/30/2026, 05:40 AM",
        failed: 0,
        fields: { host: "finacle-batch.aarohan.fin", port: 1521, db: "FINPROD", user: "psek_batch", pw: "••••••••" },
        tables: [
          {
            name: "daily_reconciliation",
            cols: [
              { col: "txn_reference", cat: "Financial Information", cl: "Transaction ID", rk: "L" },
              { col: "remitter_account", cat: "Financial Information", cl: "Bank Account", rk: "VH" },
              { col: "beneficiary_upi", cat: "Financial Information", cl: "UPI ID", rk: "H" }
            ]
          }
        ]
      }
    ],

    pods: [
      {
        n: "scanner-pod-mumbai-01",
        url: "https://pod-01.mumbai.privacysek.internal",
        v: "1.9.4",
        st: "Running",
        cr: "10/12/2026, 05:40 AM"
      },
      {
        n: "scanner-pod-blr-02",
        url: "https://pod-02.blr.privacysek.internal",
        v: "1.9.4",
        st: "Running",
        cr: "10/15/2026, 08:15 AM"
      }
    ],

    jobs: [
      {
        id: "j-kyc-daily",
        name: "Daily_Core_KYC_Scan",
        src: "core-banking-db",
        type: "Database",
        dur: "1h",
        cron: "0 2 * * *",
        samp: true,
        cr: "10/20/2026, 02:00 AM",
        up: "10/30/2026, 03:00 AM",
        st: "Completed"
      },
      {
        id: "j-los-weekly",
        name: "Weekly_LOS_Scan",
        src: "los-db",
        type: "Database",
        dur: "45m",
        cron: "0 4 * * 1",
        samp: true,
        cr: "10/22/2026, 04:00 AM",
        up: "10/28/2026, 04:45 AM",
        st: "Completed"
      },
      {
        id: "j-s3-audit",
        name: "S3_KYC_Unstructured_Audit",
        src: "s3-kyc-docs",
        type: "File Store",
        dur: "2h",
        cron: "",
        samp: false,
        cr: "10/25/2026, 11:30 PM",
        up: "10/25/2026, 11:30 PM",
        st: "Paused"
      },
      {
        id: "j-salesforce-leads",
        name: "Salesforce_Leads_Profiler",
        src: "Salesforce CRM",
        type: "Database",
        dur: "30m",
        cron: "0 6 * * *",
        samp: true,
        cr: "10/26/2026, 06:00 AM",
        up: "10/30/2026, 06:30 AM",
        st: "Completed"
      }
    ],

    profilers: [
      {
        n: "Indian Identifiers",
        rec: [
          RC("Aadhaar Number Recognizer", "IN_AADHAAR", "12-digit Indian national identity number with Verhoeff validation", "VH"),
          RC("PAN Card Recognizer", "IN_PAN", "Permanent Account Number issued by the Income Tax Department", "VH"),
          RC("UPI ID Recognizer", "IN_UPI", "Unified Payments Interface virtual payment address (@okaxis, @okhdfcbank)", "H"),
          RC("Voter ID / EPIC Recognizer", "IN_VOTER_ID", "Electoral Photo Identity Card alphanumeric format", "H"),
          RC("Indian Passport Recognizer", "IN_PASSPORT", "Standard 8-character Indian passport number", "VH"),
          RC("Bank IFSC Code Recognizer", "IN_IFSC", "11-character Indian Financial System Code", "M"),
          RC("GSTIN Recognizer", "IN_GSTIN", "15-digit Goods and Services Tax Identification Number", "M")
        ]
      },
      {
        n: "Authentication and Secrets",
        rec: [
          RC("Api Key Recognizer", "API_KEY", "Generic high-entropy API authentication token", "VH"),
          RC("Aws Access Key Id Recognizer", "AWS_ACCESS_KEY_ID", "Amazon Web Services access key identifier", "VH"),
          RC("Jwt Token Recognizer", "JWT_TOKEN", "Signed JSON Web Token for stateless sessions", "VH"),
          RC("Database Password String", "DB_PASSWORD", "Plaintext database connection password credential", "VH"),
          RC("RSA Private Key Block", "RSA_PRIVATE_KEY", "PEM-encoded private cryptographic key", "VH")
        ]
      },
      {
        n: "Biometric Identifiers",
        rec: [
          RC("Fingerprint Template Recognizer", "FINGERPRINT_ISO", "ISO/IEC 19794-2 fingerprint minutiae biometric template", "VH"),
          RC("Face Geometry Template", "FACIAL_TEMPLATE", "Facial recognition vector embedding", "VH"),
          RC("Iris Scan Code", "IRIS_SCAN", "Biometric iris pattern encoding", "VH")
        ]
      },
      {
        n: "Contact Information",
        rec: [
          RC("Mobile Number (India)", "IN_MOBILE", "10-digit Indian phone number prefixed with +91 or 0", "H"),
          RC("Email Address Recognizer", "EMAIL_ADDR", "Standard RFC 5322 electronic mail address", "H"),
          RC("Mailing Address Recognizer", "POSTAL_ADDR", "Postal pin code and residential street address", "M")
        ]
      },
      {
        n: "Financial Identifiers",
        rec: [
          RC("Bank Account Number", "BANK_ACCT_NO", "Retail and commercial bank account numbers", "VH"),
          RC("Credit Card Number (PCI-DSS)", "CREDIT_CARD", "Visa, Mastercard, RuPay primary account number", "VH"),
          RC("Income Tax Acknowledgement", "ITR_ACK_NO", "Income Tax Return e-filing acknowledgement number", "H")
        ]
      },
      {
        n: "Children's Data",
        rec: [
          RC("Child Age Recognizer", "CHILD_AGE", "Explicit indication of minor age under 18 years", "H"),
          RC("Guardian Relation Note", "GUARDIAN_REL", "Legal guardian authorization relationship", "M")
        ]
      },
      {
        n: "Healthcare & Medical",
        rec: [
          RC("Medical Diagnosis Record", "DIAGNOSIS_NOTE", "Clinical condition or treatment summary", "VH"),
          RC("Health Insurance Policy ID", "HEALTH_INS_ID", "ABHA / TPA health insurance scheme identifier", "H")
        ]
      },
      {
        n: "KYC & Demographic Data",
        rec: [
          RC("Date of Birth String", "DOB_DATE", "Calendar date of birth indicating age", "M"),
          RC("Father / Spouse Name", "RELATIVE_NAME", "Family relative identity record for KYC verification", "M")
        ]
      }
    ],

    customProfilers: [
      {
        n: "Aarohan High Risk Onboarding",
        rec: [
          RC("Aadhaar Number Recognizer", "IN_AADHAAR", "12-digit Indian national identity number with Verhoeff validation", "VH"),
          RC("PAN Card Recognizer", "IN_PAN", "Permanent Account Number issued by the Income Tax Department", "VH"),
          RC("Bank Account Number", "BANK_ACCT_NO", "Retail and commercial bank account numbers", "VH"),
          RC("Mobile Number (India)", "IN_MOBILE", "10-digit Indian phone number prefixed with +91 or 0", "H")
        ]
      }
    ],

    tasks: [
      {
        id: "t1",
        t: "Review exposed S3 export bucket with PAN values (s3://af-exports/2026/)",
        o: "Meera Iyer",
        st: "Open"
      },
      {
        id: "t2",
        t: "Confirm tokenisation for loan_applications.bank_acct in los-db",
        o: "Lending Ops",
        st: "In Progress"
      },
      {
        id: "t3",
        t: "Restrict access to call_recordings container in azure-loan-archive",
        o: "Security Ops",
        st: "Open"
      },
      {
        id: "t4",
        t: "Investigate unencrypted customer copy on analyst laptop share",
        o: "Compliance Team",
        st: "In Progress"
      },
      {
        id: "t5",
        t: "Verify retention purge for leads older than 24 months in Salesforce",
        o: "Growth Team",
        st: "Open"
      }
    ],

    findings: [
      {
        id: "f1",
        n: "Public bucket contains PAN values",
        a: "s3://af-exports/2026/",
        sev: "act",
        age: "2 days",
        fix: "Block public access and move to private bucket",
        done: false
      },
      {
        id: "f2",
        n: "Copy of KYC table outside approved locations",
        a: "analyst laptop share · 'kyc_dump.csv'",
        sev: "act",
        age: "5 days",
        fix: "Delete copy and notify owner",
        done: false
      },
      {
        id: "f3",
        n: "Unencrypted column with bank account numbers",
        a: "loan_applications.bank_acct",
        sev: "risk",
        age: "12 days",
        fix: "Apply column encryption or tokenisation",
        done: false
      },
      {
        id: "f4",
        n: "Over-broad access: 214 users can read call recordings",
        a: "call_recordings/",
        sev: "risk",
        age: "1 month",
        fix: "Restrict to Contact Centre QA group",
        done: false
      },
      {
        id: "f5",
        n: "Stale data beyond retention (leads older than 24 months)",
        a: "leads_2026",
        sev: "risk",
        age: "Today",
        fix: "Run retention job",
        done: false
      }
    ],

    unstructuredResults: [
      {
        fileName: "customer_kyc_batch_104.pdf",
        source: "s3-kyc-docs",
        path: "s3://af-exports/2026/kyc/",
        categories: ["Aadhaar Card", "PAN Card", "Address Proof"],
        sensitiveFiles: 1,
        risk: "VH",
        scannedAt: "Today 07:15 AM"
      },
      {
        fileName: "loan_agreement_signed_9921.pdf",
        source: "s3-kyc-docs",
        path: "s3://af-exports/2026/agreements/",
        categories: ["Bank Account", "Income Proof"],
        sensitiveFiles: 1,
        risk: "VH",
        scannedAt: "Today 07:18 AM"
      },
      {
        fileName: "telecom_call_verif_782.wav",
        source: "azure-loan-archive",
        path: "call_recordings/2026-10/",
        categories: ["Voice", "Phone Number"],
        sensitiveFiles: 1,
        risk: "H",
        scannedAt: "Yesterday 04:30 PM"
      }
    ],

    overviewFindings: buildDetailedFindings(),
    dataVersion: DATA_VERSION
  };
}

export const DATA_VERSION = 3;

// Connections, jobs, tasks, custom profilers and posture findings are saved; the rest
// (detections, pods, built-in profilers, unstructured results) is rebuilt from the seed
const discoveryStore = createModuleStore("discovery", createInitialDiscoveryData);

export function getDiscoveryData() {
  return discoveryStore.get();
}

export function saveDiscoveryData(data) {
  return discoveryStore.save(data);
}

// Async: resolves once the server has restored the demo data
export function resetDiscoveryData() {
  return discoveryStore.reset();
}
