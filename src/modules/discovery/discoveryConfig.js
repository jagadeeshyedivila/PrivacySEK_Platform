// Discovery module configuration & constants
// Aarohan Finance (NBFC, India, DPDP compliance)


export const DISCOVERY_TABS = [
  ["overview", "Overview"],
  ["assets", "Assets"],
  ["connections", "Connections"],
  ["jobs", "Jobs"],
  ["profilers", "Profilers"],
  ["posture", "Security posture"]
];

export const RISK_LEVELS = {
  VH: { key: "VH", label: "Very High", sev: "act", spi: true, color: "#d64545" },
  H: { key: "H", label: "High", sev: "act", spi: false, color: "#e8a020" },
  M: { key: "M", label: "Medium", sev: "risk", spi: false, color: "#2fcf7c" },
  L: { key: "L", label: "Low", sev: "ok", spi: false, color: "#9aa3b5" }
};

export const CONNECTOR_CATALOG = {
  S: [
    { name: "PostgreSQL", logo: "postgresql", group: "Database", desc: "Open-source relational database emphasizing extensibility and SQL compliance.", port: 5432, sys: "POSTGRES", icon: "db" },
    { name: "MySQL", logo: "mysql", group: "Database", desc: "Open-source relational database management system for web applications.", port: 3306, sys: "MYSQL", icon: "db" },
    { name: "Oracle Database", logo: "oracle", group: "Database", desc: "Enterprise multi-model database for high-throughput OLTP and GL ledgers.", port: 1521, sys: "ORACLE", icon: "db" },
    { name: "Microsoft SQL Server", logo: "mssql", group: "Database", desc: "Enterprise-grade relational database developed by Microsoft.", port: 1433, sys: "MSSQL", icon: "db" },
    { name: "SAP HANA", logo: "hana", group: "Database", desc: "In-memory, column-oriented relational database developed by SAP.", port: 30015, sys: "HANA", icon: "db" },
    { name: "BigQuery", logo: "bigquery", group: "Data warehouse", desc: "Serverless enterprise data warehouse for analytics and machine learning.", port: 443, sys: "BIGQUERY", icon: "db" },
    { name: "Snowflake", logo: "snowflake", group: "Data warehouse", desc: "Cloud data platform supporting multi-cluster warehouse architectures.", port: 443, sys: "SNOWFLAKE", icon: "db" },
    { name: "Salesforce CRM", logo: "salesforce", group: "SaaS application", desc: "Customer relationship management platform for customer leads and KYC.", port: 443, sys: "SALESFORCE", icon: "cloud" }
  ],
  U: [
    { name: "Amazon S3", logo: "s3", group: "Object storage", desc: "Scalable object storage bucket service for document uploads and backups.", port: 443, sys: "S3", icon: "cloud" },
    { name: "Azure Blob Storage", logo: "azureblob", group: "Object storage", desc: "Massively scalable and secure object storage for unstructured audio & call files.", port: 443, sys: "AZUREBLOB", icon: "cloud" },
    { name: "Google Cloud Storage", logo: "gcs", group: "Object storage", desc: "Unified object storage for unstructured document archives and telemetry.", port: 443, sys: "GCS", icon: "cloud" },
    { name: "Google Drive", logo: "gdrive", group: "File collaboration", desc: "Cloud office file storage used to store spreadsheets, KYC PDFs and team docs.", port: 443, sys: "GDRIVE", icon: "doc" },
    { name: "OneDrive", logo: null, group: "File collaboration", desc: "Cloud file storage used across Microsoft 365 enterprise tenants.", port: 443, sys: "ONEDRIVE", icon: "doc" }
  ]
};

// Connection `type` values (as stored on connections) → logo file in /public/connectors
const TYPE_LOGOS = {
  postgresql: "postgresql", postgres: "postgresql", mysql: "mysql", oracle: "oracle", mssql: "mssql",
  hana: "hana", bigquery: "bigquery", snowflake: "snowflake", salesforce: "salesforce",
  s3: "s3", azureblob: "azureblob", gcs: "gcs", gdrive: "gdrive"
};

export function connectorLogoKey(type) {
  return TYPE_LOGOS[String(type || "").toLowerCase()] || null;
}

export function connectorLogoUrl(type) {
  const k = connectorLogoKey(type);
  return k ? `/connectors/${k}.svg` : null;
}

// Logo chip with a lettered fallback when no logo file exists (e.g. OneDrive)
export function connectorBadge(esc, name, logoKey, size = "md") {
  const url = logoKey ? `/connectors/${logoKey}.svg` : null;
  const initials = String(name || "?").split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return `<span class="dd-logo dd-logo-${size}" aria-hidden="true">${url
    ? `<img src="${url}" alt="" loading="lazy" decoding="async" />`
    : `<span class="dd-logo-fallback">${esc(initials)}</span>`}</span>`;
}

export function createDefaultDiscoveryUiState() {
  return {
    tab: "overview",
    mode: "S", // 'S' for Structured, 'U' for Unstructured
    overviewFilters: {
      type: "S", // 'All' | 'S' | 'U'
      conn: "",
      cat: "",
      tab: "",
      col: "",
      rk: "",
      cls: "",
      minConf: 0,
      period: "last_scan",
      piiSearch: "",
      showAllPii: false
    },
    expandedConnections: { "core-banking-db": true },
    expandedTables: { "core-banking-db::customers.kyc": true },
    findingsSearch: "",
    assetsSearch: "",
    assetsSensFilter: "",
    assetsPage: 1,
    assetsPageSize: 10,
    connSubTab: "conn", // 'conn' | 'pod'
    connSearch: "",
    connView: "list", // 'list' | 'cat'
    connCatType: "S", // 'S' | 'U'
    connCatSearch: "",
    jobsSearch: "",
    jobsView: "list", // 'list' | 'form'
    profilersSubTab: "D", // 'D' for Default, 'C' for Custom
    profilersSearch: "",
    activeProfiler: null, // null | profilerName
    recognizerRiskFilter: "",
    recognizerSearch: "",
    postureSearch: ""
  };
}

export function getUserRole(D) {
  const r = (D?.org?.user?.role || "").toLowerCase();
  if (r.includes("viewer") || r.includes("auditor") || r.includes("read")) return "Viewer";
  if (r.includes("analyst")) return "Analyst";
  return "Admin"; // Default to Admin for full demo capabilities
}

export function canPerform(role, action) {
  // role: 'Admin' | 'Analyst' | 'Viewer'
  // action: 'create' | 'edit' | 'delete' | 'view'
  if (action === "view") return true;
  if (role === "Admin") return true;
  if (role === "Analyst") return action === "create" || action === "edit";
  return false; // Viewer is read-only
}
