export const TOP_TABS = [
  ["builder", "Banner Configuration"],
  ["scanner", "Cookie Scanner"],
  ["inventory", "Cookie Categories"],
  ["install", "Implementation"],
  ["blocking", "Auto Cookie Blocking"],
  ["records", "Consent Records"],
  ["dashboard", "Overview & Analytics"],
];

export const CONFIG_NAV_SECTIONS = [
  ["config", "Config", "gear"],
  ["language", "Language", "globe"],
  ["content", "Content", "doc"],
  ["layout", "Layout", "layout"],
  ["purposes", "Purposes", "shield"],
  ["frequency", "Display Frequency", "clock"],
  ["vendors", "Vendors", "truck"],
];

export const REGIONS = ["EEA & UK", "USA", "India", "Global"];

export function createCookieUiState() {
  return {
    topTab: "builder",
    builderSection: "config",
    region: "EEA & UK",
    previewMode: "banner",
    device: "Desktop",
    contentSub: "banner",
    vendorSub: "iab",
    vendorSearch: "",

    // Inventory Table State
    inventorySearch: "",
    inventoryCategory: "all",
    inventoryParty: "all",
    inventoryPage: 1,
    inventoryPageSize: 10,
    inventorySortBy: "lastDetected",
    inventorySortOrder: "desc",
    inventoryTotal: 0,
    inventoryLoading: false,
    inventoryError: null,

    // Records Table State
    recordsSearch: "",
    recordsRegion: "all",
    recordsAction: "all",
    recordsPage: 1,
    recordsPageSize: 25,
    recordsSortBy: "timestamp",
    recordsSortOrder: "desc",
    recordsTotal: 0,
    recordsLoading: false,
    recordsError: null,

    // Scanner History Table State
    scannerHistoryPage: 1,
    scannerHistoryPageSize: 10,
    scannerHistorySearch: "",
    scannerHistoryStatus: "all",
    scannerHistorySortBy: "createdAt",
    scannerHistorySortOrder: "desc",

    // Blocking Table State
    blockingSearch: "",
    blockingCategory: "all",
    blockingStatus: "all",

    // Report Modals State
    reportCookiesPage: 1,
    reportCookiesPageSize: 10,
    reportCookiesCategory: "all",
    reportCookiesSearch: "",

    scannerSub: "scan",
    blockingSub: "blocked",
    recordsSub: "receipts",
    installSub: "snippet",
    installCmpTab: "html",
    dashboardRange: 30,
    dashboardRegion: "all",
  };
}
