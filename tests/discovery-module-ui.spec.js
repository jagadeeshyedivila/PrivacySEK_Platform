import { test, expect } from "@playwright/test";

test.describe("Data Discovery Module - Comprehensive Feature Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#discovery");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(300);
    const demoBtn = page.locator("button:has-text('Continue in Demo Mode')");
    if (await demoBtn.isVisible({ timeout: 500 }).catch(() => false)) {
      await demoBtn.click();
    }
    await expect(page.locator("h1:has-text('Data Discovery')")).toBeVisible({ timeout: 10000 });
  });

  test("1. Overview dashboard, drill-downs, Detections and Classification tabs", async ({ page }) => {
    const drawer = page.locator(".drawer[role='dialog']");

    // Overview: mode, KPI strip, priority findings and charts only
    await expect(page.locator(".dd-mode-btn.active")).toContainText("Structured");
    await expect(page.locator(".dd-kpi-strip .dd-inventory-tile")).toHaveCount(6);
    await expect(page.locator(".dd-inventory-tile:has-text('Data sources') b")).toContainText("12");
    await expect(page.locator(".dd-inventory-tile:has-text('Columns scanned') b")).toContainText("6,820");
    await expect(page.locator(".dd-inventory-tile:has-text('Personal data columns') b")).toContainText("1,122");
    await expect(page.locator(".dd-inventory-tile:has-text('SPI columns') b")).toContainText("306");
    await expect(page.locator(".dd-inventory-tile:has-text('Needs review') b")).toContainText("90");
    await expect(page.locator(".dd-prio-row")).toHaveCount(6);
    await expect(page.locator(".dd-prio-row").first()).toContainText("Critical");
    await expect(page.locator(".dd-mini-row:has-text('Non-personal data')")).toContainText("5,608");
    await expect(page.locator(".dd-sig")).toHaveCount(6);
    // Restored hero: sensitivity footprint and classification accuracy
    await expect(page.locator(".dd-fp-stat b:has-text('10 TB')")).toBeVisible();
    await expect(page.locator(".dd-fp-stat b:has-text('1.0 TB')")).toBeVisible();
    await expect(page.locator(".dd-acc-gauge text")).toContainText("95%");
    await expect(page.locator(".dd-acc-split")).toContainText("1,178");
    await expect(page.locator(".dd-hbar-row:has-text('core-banking-db')")).toBeVisible();
    await expect(page.locator("svg.dd-trend")).toBeVisible();
    // Detail no longer lives on the Overview
    await expect(page.locator(".dd-tree-list")).toHaveCount(0);
    await expect(page.locator(".dd-sticky-filter-bar")).toHaveCount(0);

    // Failed tables drawer from the Unclassified tile
    await page.click(".dd-kpi-strip [data-act='dd-view-failed-tables']");
    await expect(drawer.locator("h2")).toContainText("Failed Tables Report");
    await expect(drawer).toContainText("loan_collateral_temp");
    await page.click(".drawer button[data-act='close']");
    await expect(drawer).toHaveCount(0);

    // Drill-down: SPI tile opens Detections filtered to SPI
    await page.click(".dd-kpi-strip button:has-text('SPI columns')");
    await expect(page.locator("button[data-act='tab'][data-arg^='discovery|detections']")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".dd-filter-chip:has-text('Class: SPI')")).toBeVisible();
    await expect(page.locator(".card-h span.dim").first()).toContainText("306 column detections");
    await page.click("button[data-act='dd-reset-filters']");

    // Detections: ranked types, drawer, search, heatmap, filters, tree
    await expect(page.locator(".dd-pii-type-item b:has-text('Email')")).toBeVisible();
    await page.click("button[data-act='dd-toggle-all-pii']");
    await expect(page.locator(".dd-pii-type-item b:has-text('Aadhaar')")).toBeVisible();
    for (const gone of ["Address", "Biometric template", "PIN code", "Device ID", "Loan amount", "Credit score"]) {
      await expect(page.locator(".dd-pii-type-item b", { hasText: new RegExp(`^${gone}$`) })).toHaveCount(0);
    }
    await expect(page.locator(".dd-pii-type-item b:has-text('Card number')")).toBeVisible();
    const typeSearch = page.locator("input[data-input-act='dd-search-pii-types']");
    await typeSearch.fill("PAN");
    await page.waitForTimeout(200);
    await page.click(".dd-pii-type-item:has-text('PAN')");
    await expect(drawer.locator("h2")).toContainText("Detected Columns: PAN");
    await page.click(".drawer button[data-act='close']");
    await typeSearch.fill("");

    await page.locator(".dd-heatmap-cell").first().click();
    await expect(page.locator(".dd-filter-chip").first()).toBeVisible();
    const connSelect = page.locator("select[data-act='dd-set-filter'][data-arg='conn']");
    await connSelect.selectOption("core-banking-db");
    const connHeader = page.locator(".dd-tree-header:has-text('core-banking-db')");
    await connHeader.click();
    await connHeader.click();
    await expect(page.locator(".dd-table-subgroup-title:has-text('customers.kyc')")).toBeVisible();
    await page.locator(".dd-table-subgroup tr.click").first().click();
    await expect(drawer.locator("h2")).toContainText("Column Classification");
    await expect(drawer).toContainText("Sensitivity Class");
    await page.click(".drawer button[data-act='close']");
    await page.locator("button[data-act='dd-collapse-all-conns']").click();
    await expect(page.locator(".dd-tree-content")).toHaveCount(0);
    await page.locator("button[data-act='dd-expand-all-conns']").click();
    await expect(page.locator(".dd-tree-content").first()).toBeVisible();
    await page.click("button[data-act='dd-reset-filters']");
    await expect(connSelect).toHaveValue("");
    await page.locator("button[data-act='dd-export-csv']").first().click();
    await expect(page.locator(".toast").first()).toContainText("CSV export started", { timeout: 6000 });

    // Files view
    await page.click("[data-act='dd-set-view'][data-arg='detView:files']");
    await expect(page.locator("h3:has-text('Classified files')")).toBeVisible();
    await expect(page.locator("tbody")).toContainText("customer_kyc_batch_104.pdf");

    // Classification tab
    await page.click("button[data-act='tab'][data-arg='discovery|classification']");
    await expect(page.locator(".dd-cls-row:has-text('Non-personal data')")).toContainText("5,608");
    await expect(page.locator("h3:has-text('Review outcome')")).toHaveCount(0);
    await expect(page.getByText("95% classification accuracy")).toBeVisible();
    await expect(page.locator("h3:has-text('Classification policy')")).toBeVisible();

    // Risk & posture sub-views
    await page.click("button[data-act='tab'][data-arg^='discovery|posture']");
    await page.click("[data-act='dd-set-view'][data-arg='postureView:exposure']");
    await expect(page.locator("h3:has-text('Privacy risks')")).toBeVisible();
    await expect(page.locator("h3:has-text('Security risks')")).toBeVisible();
    await expect(page.locator(".dd-exp-table tr:has-text('s3://af-exports/2026/') .dd-exp-dot.security")).toHaveCount(2);
    await page.click("[data-act='dd-set-view'][data-arg='postureView:access']");
    await expect(page.locator(".dd-status-off")).toContainText("Not connected");
    await expect(page.locator("h3:has-text('Purpose Guard decisions')")).toBeVisible();
    await page.click("[data-act='dd-set-view'][data-arg='postureView:findings']");

    // Unstructured overview
    await page.click("button[data-act='tab'][data-arg='discovery|overview']");
    await page.click("button[data-act='dd-set-mode'][data-arg='U']");
    await expect(page.locator(".dd-inv-label:has-text('Storage sources')")).toBeVisible();
    await expect(page.locator(".dd-fp-stat b:has-text('1.8 TB')")).toBeVisible();
    await expect(page.locator(".dd-acc-gauge text")).toContainText("91%");
    await expect(page.locator(".dd-doc.verify")).toContainText("Salary slips / Form 16");
    await expect(page.locator(".dd-doc.verify .dd-verify-pill")).toContainText("Needs verification");
    await page.click("button[data-act='dd-set-mode'][data-arg='S']");
    await expect(page.locator(".dd-mode-btn.active")).toContainText("Structured");
  });

  test("2. Assets Tab: Table, Search, Sensitivity Filter, Pagination, and Drawer", async ({ page }) => {
    await page.click("button[data-act='tab'][data-arg='discovery|assets']");
    await expect(page.locator(".table-toolbar-title")).toContainText("Data Asset Inventory");

    // Filter by search
    const searchInput = page.locator("input[data-input-act='dd-assets-search']");
    await searchInput.fill("kyc");
    await page.waitForTimeout(200);
    await expect(page.locator("tbody tr").first()).toContainText("customers.kyc");

    // Clear search
    await page.click("button[data-act='dd-assets-clear-search']");
    await expect(searchInput).toHaveValue("");

    // Filter by sensitivity
    const sensSelect = page.locator("select[data-act='dd-assets-filter-sens']");
    await sensSelect.selectOption("High");
    await page.waitForTimeout(200);
    await expect(page.locator("tbody tr").first()).toBeVisible();

    // Open Asset Drawer
    await page.locator("tbody tr.click").first().click();
    const assetDrawer = page.locator(".drawer[role='dialog']");
    await expect(assetDrawer).toBeVisible();
    await expect(assetDrawer.locator("button:has-text('View Lineage')")).toBeVisible();
    await expect(assetDrawer.locator("button:has-text('Link to Processing')")).toBeVisible();

    // Click Accept classification
    const acceptBtn = assetDrawer.locator("button[data-act='dd-accept-classification']").first();
    if (await acceptBtn.isVisible()) {
      await acceptBtn.click();
      await expect(page.locator(".toast")).toContainText("Classification accepted");
    }

    await page.click(".drawer button[data-act='close']");
    await expect(assetDrawer).toHaveCount(0);
  });

  test("3. Connections Tab: List, Pods, Catalog, Add Modal with Test, and Edit Modal", async ({ page }) => {
    await page.click("button[data-act='tab'][data-arg^='discovery|connections']");
    await expect(page.locator("h3:has-text('Data Connections')")).toBeVisible();

    // Switch to Pod Connections sub-tab
    await page.click("button[data-act='dd-set-conn-subtab'][data-arg='pod']");
    await expect(page.locator("h3:has-text('Active Discovery Scanner Pods')")).toBeVisible();
    await expect(page.locator("tbody tr").first()).toContainText("scanner-pod-mumbai-01");

    // Switch back to Connections sub-tab
    await page.click("button[data-act='dd-set-conn-subtab'][data-arg='conn']");
    await expect(page.locator("h3:has-text('Data Connections')")).toBeVisible();

    // Click + Add Connection to open Catalog
    await page.click("button[data-act='dd-open-catalog']");
    await expect(page.locator("h2:has-text('Connect Tools & Services')")).toBeVisible();
    await expect(page.locator(".dd-catalog-tile b:has-text('PostgreSQL')")).toBeVisible();

    // Select PostgreSQL connector to open form modal
    await page.click(".dd-catalog-tile:has-text('PostgreSQL')");
    const connModal = page.locator(".modal[role='dialog']");
    await expect(connModal).toBeVisible();
    await expect(connModal.locator("h2")).toContainText("Add PostgreSQL Connection");

    // Fill Connection form
    await connModal.locator("#dd_cf_name").fill("test-warehouse-db");
    await connModal.locator("#dd_cf_host").fill("warehouse.internal.fin");
    await connModal.locator("#dd_cf_db").fill("warehouse_prod");
    await connModal.locator("#dd_cf_user").fill("ro_psek");
    await connModal.locator("#dd_cf_pw").fill("SecretPass123!");

    // Test Connection probe
    await connModal.locator("button[data-act='dd-test-conn']").click();
    await expect(connModal.locator("#dd-test-result")).toContainText("Connection successful");

    // Save Connection
    await connModal.locator("button[data-act='dd-save-conn']").click();
    await expect(page.locator(".toast")).toContainText("Connection \"test-warehouse-db\" added");
    await expect(page.locator("table.t tbody")).toContainText("test-warehouse-db");

    // Edit Connection
    await page.click("tbody tr:has-text('test-warehouse-db') button:has-text('Edit')");
    const editModal = page.locator(".modal[role='dialog']");
    await expect(editModal).toBeVisible();
    await editModal.locator("#dd_cf_desc").fill("Updated test warehouse description");
    await editModal.locator("button[data-act='dd-save-conn']").click();
    await expect(page.locator(".toast")).toContainText("updated successfully");

    // Delete Connection
    await page.click("tbody tr:has-text('test-warehouse-db') button:has-text('🗑')");
    const confirmModal = page.locator(".modal[role='dialog']");
    await expect(confirmModal).toBeVisible();
    await confirmModal.locator("button[data-act='dd-delete-conn']").click();
    await expect(page.locator(".toast")).toContainText("deleted");
  });

  test("4. Jobs Tab: List, Search, Add Job Form with Validation, and Run Simulation", async ({ page }) => {
    await page.click("button[data-act='tab'][data-arg='discovery|jobs']");
    await expect(page.locator("h3:has-text('Discovery Scan Jobs')")).toBeVisible();

    // Open Add Job form
    await page.click("button[data-act='dd-open-job-form']");
    await expect(page.locator("h2:has-text('Create New Discovery Scan Job')")).toBeVisible();

    // Test form validation: empty submit
    await page.click("button[data-act='dd-submit-new-job']");
    await expect(page.locator("#dd_jne")).toContainText("Job name is required");

    // Fill valid job
    await page.locator("#dd_jn").fill("Auto_Audit_Core_Banking");
    await page.locator("#dd_js").selectOption("core-banking-db");
    await page.locator("#dd_jd").fill("30m");

    // Submit Job
    await page.click("button[data-act='dd-submit-new-job']");
    await expect(page.locator(".toast")).toContainText("created");
    await expect(page.locator("table.t tbody")).toContainText("Auto_Audit_Core_Banking");

    // View Job details
    await page.click("tbody tr:has-text('Auto_Audit_Core_Banking') button:has-text('View')");
    const jobModal = page.locator(".modal[role='dialog']");
    await expect(jobModal).toBeVisible();
    await expect(jobModal.locator("h2")).toContainText("Job Configuration: Auto_Audit_Core_Banking");
    await jobModal.locator("button[data-act='close']").first().click();

    // Delete Job
    await page.click("tbody tr:has-text('Auto_Audit_Core_Banking') button:has-text('🗑')");
    await expect(page.locator(".toast")).toContainText("Job \"Auto_Audit_Core_Banking\" deleted");
  });

  test("5. Profilers Tab: Default & Custom Profilers, Recognizer Library Drilldown, and Custom Profiler Modal", async ({ page }) => {
    await page.click("button[data-act='tab'][data-arg='discovery|profilers']");
    await expect(page.locator("h3:has-text('Profilers & Recognizers Library')")).toBeVisible();

    // Drill down into "Indian Identifiers"
    await page.click("tbody tr a:has-text('Indian Identifiers')");
    await expect(page.locator("h2:has-text('Indian Identifiers')")).toBeVisible();
    await expect(page.locator(".dd-recognizer-title:has-text('Aadhaar Number Recognizer')")).toBeVisible();
    await expect(page.locator(".dd-recognizer-title:has-text('PAN Card Recognizer')")).toBeVisible();

    // Filter recognizers by risk level: Very High
    await page.click("button[data-act='dd-filter-recognizer-risk'][data-arg='VH']");
    await expect(page.locator(".dd-recognizer-card").first()).toBeVisible();

    // Back to profilers list
    await page.click("button[data-act='dd-close-recognizers']");
    await expect(page.locator("h3:has-text('Profilers & Recognizers Library')")).toBeVisible();

    // Create Custom Profiler modal
    await page.click("button[data-act='dd-open-custom-profiler-modal']");
    const profilerModal = page.locator(".modal[role='dialog']");
    await expect(profilerModal).toBeVisible();

    // Fill custom profiler
    await profilerModal.locator("#dd_cp_name").fill("Custom KYC Indian Pack");
    await profilerModal.locator("input[data-act='dd-custom-prof-toggle'][data-arg='Indian Identifiers']").check();
    await profilerModal.locator("button[data-act='dd-save-custom-profiler']").click();

    await expect(page.locator(".toast")).toContainText("Custom profiler \"Custom KYC Indian Pack\" created");
    await expect(page.locator("table.t tbody")).toContainText("Custom KYC Indian Pack");
  });

  test("6. Security Posture Tab: Findings Table, Remediate Action, and Remediation Tasks", async ({ page }) => {
    await page.click("button[data-act='tab'][data-arg^='discovery|posture']");
    await expect(page.locator("h3:has-text('Data Security Posture Findings')")).toBeVisible();
    await expect(page.locator("h3:has-text('Remediation Tasks')")).toBeVisible();

    // Remediate first open finding
    const remediateBtn = page.locator("button[data-act='dd-remediate-finding']").first();
    if (await remediateBtn.isVisible()) {
      await remediateBtn.click();
      await expect(page.locator(".toast")).toContainText("Remediation applied");
    }

    // Create Task from finding
    const taskBtn = page.locator("button[data-act='dd-create-task-from-finding']").first();
    if (await taskBtn.isVisible()) {
      await taskBtn.click();
      await expect(page.locator(".toast")).toContainText("Remediation task created");
    }

    // Change Task status dropdown
    const taskSelect = page.locator("select[data-act='dd-change-task-status']").first();
    await taskSelect.selectOption("Done");
    await expect(page.locator(".toast")).toContainText("Task status updated to Done");
  });

  test("7. Global Reset Data Action", async ({ page }) => {
    await page.click("button[data-act='dd-reset-demo-data']");
    const resetModal = page.locator(".modal[role='dialog']");
    await expect(resetModal).toBeVisible();
    await expect(resetModal.locator("h2")).toContainText("Reset Discovery data?");
    await resetModal.locator("button[data-act='dd-confirm-reset-demo-data']").click();
    await expect(page.locator(".toast")).toContainText("Discovery data restored");
  });
});
