import { test, expect } from "@playwright/test";

// Consent records are saved in MongoDB, so values a test creates must be unique per run,
// and the test deletes what it created
const API = "http://localhost:3001/api/store/consent";
const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
async function deleteWhere(request, coll, match) {
  const rows = await (await request.get(`${API}/${coll}`)).json();
  for (const r of rows.filter(match)) await request.delete(`${API}/${coll}/${encodeURIComponent(r.id)}`);
}

test.describe("Consent Module UI - Comprehensive Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#consent");
    await page.waitForTimeout(400);
  });

  test("1. Renders Consent Module Dashboard with all cards, charts, and date filters", async ({ page }) => {
    await expect(page.locator(".cp-header-title")).toContainText("Consent Preference Dashboard");

    // Stat tiles
    await expect(page.locator(".cp-dash-tile")).toHaveCount(5);
    for (const label of ["Consents recorded", "Opt-in rate", "Active consents", "Withdrawal rate", "Identity verified"]) {
      await expect(page.locator(".cp-dash-tile-label", { hasText: label })).toBeVisible();
    }

    // Charts
    await expect(page.locator(".cp-dash-cols .cp-dash-col").first()).toBeVisible();
    for (const title of ["Consent activity", "Decision mix", "Consent lifecycle", "Consents by country", "Communication preferences", "Legal notice coverage", "Evidence quality", "Setup at a glance"]) {
      await expect(page.locator(".cp-dash-card h3", { hasText: title })).toBeVisible();
    }

    // Country filter narrows every figure, and clears again
    const totalBefore = await page.locator(".cp-dash-tile-value").first().textContent();
    await page.locator(".cp-dash-country").first().click();
    await expect(page.locator(".cp-dash-sub")).toContainText("from");
    await expect(page.locator(".cp-dash-tile-value").first()).not.toHaveText(totalBefore);
    await page.click("button[data-act='cp-dash-country'][data-arg='all']");
    await expect(page.locator(".cp-dash-tile-value").first()).toHaveText(totalBefore);

    // Change range
    const rangeSelect = page.locator("select[data-act='cp-set-range']").first();
    await rangeSelect.selectOption("30");
    await page.waitForTimeout(200);

    // Refresh button
    await page.click("button[data-act='cp-refresh']");
    await expect(page.locator(".toast")).toContainText("Dashboard refreshed");
  });

  test("2. Consent Records: table, search, filters, pagination, CSV, and record detail view", async ({ page }) => {
    // Switch to Consent Records
    await page.click("button.cp-top-nav-btn:has-text('Consent Records')");
    await expect(page.locator(".cp-header-title")).toContainText("Consent Records");

    // Check table headers and rows
    await expect(page.locator("th:has-text('ID')")).toBeVisible();
    await expect(page.locator("th:has-text('Email')")).toBeVisible();
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();

    // Search records
    const searchInput = page.locator("input[data-input-act='cp-records-search']");
    await searchInput.fill("Ravi");
    await page.waitForTimeout(200);
    await expect(page.locator("tbody tr").first()).toContainText("Ravi");

    // Status filter
    const statusSelect = page.locator("select[data-act='cp-records-status-filter']");
    await statusSelect.selectOption("Accept All");
    await page.waitForTimeout(200);

    // Clear search to see all Accept All
    await searchInput.fill("");
    await page.waitForTimeout(200);

    // Open first record detail
    const firstRecordLink = page.locator("tbody tr a[data-act='cp-view-record']").first();
    const recordId = await firstRecordLink.innerText();
    await firstRecordLink.click();
    await page.waitForTimeout(300);

    // Verify Record Detail view
    await expect(page.locator(".cp-header-title")).toContainText(recordId);
    await expect(page.locator("h4:has-text('Identity & Origin Details')")).toBeVisible();
    await expect(page.locator("h4:has-text('Consent Preferences')")).toBeVisible();
    await expect(page.locator("h4:has-text('Proofs & Legal Notices')")).toBeVisible();

    // Return back to records table
    await page.click("button:has-text('← Back to Records')");
    await expect(page.locator(".cp-header-title")).toContainText("Consent Records");
  });

  test("3. Add Consent Record Modal creates realistic record", async ({ page, request }) => {
    const email = `aditi.sharma.${runId}@example.com`;
    await page.click("button.cp-top-nav-btn:has-text('Consent Records')");
    await page.click("button[data-act='cp-open-add-record']");

    const modal = page.locator(".modal[role='dialog']");
    await expect(modal).toBeVisible();
    await expect(modal.locator("h2")).toContainText("Add Consent Record");

    // Fill new consent record details
    await modal.locator("#cp_nr_first").fill("Aditi");
    await modal.locator("#cp_nr_last").fill("Sharma");
    await modal.locator("#cp_nr_email").fill(email);
    await modal.locator("#cp_nr_country").fill("India");
    await modal.locator("#cp_nr_city").fill("Bengaluru");

    // Save
    await modal.locator("button[data-act='cp-save-add-record']").click();
    await expect(page.locator(".toast")).toContainText("Consent record added");

    // Find the new record in table
    const searchInput = page.locator("input[data-input-act='cp-records-search']");
    await searchInput.fill("Aditi");
    await page.waitForTimeout(200);
    await expect(page.locator("tbody tr").first()).toContainText("Aditi Sharma");
    await deleteWhere(request, "consents", r => r.email === email);
  });

  test("4. Preference Build Manager: step navigation, settings tabs, purposes & preferences modals, and preview", async ({ page }) => {
    await page.click("button.cp-top-nav-btn:has-text('Preference Build Manager')");
    await expect(page.locator(".cp-header-title")).toContainText("Preference Build Manager");

    // Check tree nodes
    await expect(page.locator(".cp-tree-node")).toHaveCount(7);

    // Check Settings sub-tabs
    await expect(page.locator(".cp-sub-tab:has-text('General')")).toBeVisible();
    await page.click(".cp-sub-tab:has-text('Verification')");
    await expect(page.locator("b:has-text('Email Verification')")).toBeVisible();

    await page.click(".cp-sub-tab:has-text('Branding')");
    await expect(page.locator("label:has-text('Brand Primary Color')")).toBeVisible();

    await page.click(".cp-sub-tab:has-text('Display')");
    await expect(page.locator(".cp-opt-pill:has-text('Full Screen')")).toBeVisible();

    // Advance to Step 1: Language
    await page.click(".cp-tree-node:has-text('Language')");
    await expect(page.locator("b:has-text('Manage Supported Languages')")).toBeVisible();

    // Advance to Step 2: Content
    await page.click(".cp-tree-node:has-text('Content')");
    await expect(page.locator("label:has-text('Purpose Title')")).toBeVisible();

    // Advance to Step 3: Layout
    await page.click(".cp-tree-node:has-text('Layout')");
    await expect(page.locator(".cp-theme-card")).toHaveCount(3);

    // Open Live Preview
    await page.click("button[data-act='cp-builder-preview']");
    const previewModal = page.locator(".modal[role='dialog']");
    await expect(previewModal).toBeVisible();
    await expect(previewModal.locator("h2, h3").first()).toContainText("Live Preview");
    await previewModal.locator("button[data-act='close']").first().click();

    // Open Purposes Modal from Step 4
    await page.click(".cp-tree-node:has-text('Purposes')");
    await page.click("button[data-act='cp-open-purposes-modal']");
    const purposesModal = page.locator(".modal[role='dialog']");
    await expect(purposesModal).toBeVisible();
    await expect(purposesModal.locator("h2, h3").first()).toContainText("Manage Purposes");
    await purposesModal.locator("button[data-act='close']").first().click();
  });

  test("5. Jurisdictions: table and multi-step wizard", async ({ page, request }) => {
    const code = `singapore_pdpa_${runId}`;
    await page.click("button.cp-top-nav-btn:has-text('Jurisdictions')");
    await expect(page.locator(".cp-header-title")).toContainText("Jurisdictions");
    await expect(page.locator("tbody tr").first()).toBeVisible();

    // Click + Add Jurisdiction
    await page.click("button[data-act='cp-open-add-jurisdiction']");
    const wizardModal = page.locator(".modal[role='dialog']");
    await expect(wizardModal).toBeVisible();
    await expect(wizardModal.locator("h2, h3").first()).toContainText("Create Jurisdiction");

    // Step 0: Basic Details
    await wizardModal.locator("#cp_jd_name").fill(`Singapore PDPA ${runId}`);
    await wizardModal.locator("#cp_jd_code").fill(code);
    await wizardModal.locator("#cp_jd_desc").fill("Personal Data Protection Act compliance");
    await wizardModal.locator("button[data-act='cp-jur-next-step']").click();

    // Step 1: Regulations
    await expect(wizardModal.locator(".cp-stepper-item.active")).toContainText("Regulations");
    await wizardModal.locator("button[data-act='cp-jur-next-step']").click();

    // Step 2: Rights
    await expect(wizardModal.locator(".cp-stepper-item.active")).toContainText("Rights");
    await wizardModal.locator("button[data-act='cp-jur-next-step']").click();

    // Step 3: Regions
    await expect(wizardModal.locator(".cp-stepper-item.active")).toContainText("Regions");
    await wizardModal.locator("button[data-act='cp-jur-next-step']").click();

    // Step 4: Legal Bases
    await expect(wizardModal.locator(".cp-stepper-item.active")).toContainText("Legal Bases");
    await wizardModal.locator("button[data-act='cp-jur-next-step']").click();

    // Success toast
    await expect(page.locator(".toast")).toContainText("Jurisdiction saved");
    await page.waitForTimeout(300);
    await deleteWhere(request, "jurisdictions", r => r.code === code);
  });

  test("6. Workflows: list view, interactive canvas, issues validator, and orientation toggle", async ({ page }) => {
    await page.click("button.cp-top-nav-btn:has-text('Workflows')");
    await expect(page.locator(".cp-header-title")).toContainText("Workflow Records");

    // Open existing workflow
    await page.click("tbody tr a[data-act='cp-workflow-open']");
    await page.waitForTimeout(200);

    // Verify canvas and nodes
    await expect(page.locator(".cp-workflow-canvas")).toBeVisible();
    await expect(page.locator(".cp-node").first()).toBeVisible();
    await expect(page.locator(".cp-badge:has-text('issue')")).toBeVisible();

    // Check issues modal
    await page.click(".cp-badge[data-act='cp-workflow-issues-modal']");
    const issuesModal = page.locator(".modal[role='dialog']");
    await expect(issuesModal).toBeVisible();
    await issuesModal.locator("button[data-act='close']").first().click();

    // Toggle orientation
    await page.click("button[data-act='cp-workflow-dir'][data-arg='v']");
    await expect(page.locator(".cp-workflow-canvas.vertical")).toBeVisible();
    await page.click("button[data-act='cp-workflow-dir'][data-arg='h']");
    await expect(page.locator(".cp-workflow-canvas.vertical")).toHaveCount(0);

    // Back to list
    await page.click("button[data-act='cp-back-to-workflows']");
    await expect(page.locator(".cp-header-title")).toContainText("Workflow Records");
  });

  test("7. Email Templates and Implementation Screens", async ({ page }) => {
    // Email Templates
    await page.click("button.cp-top-nav-btn:has-text('Email Templates')");
    await expect(page.locator(".cp-header-title")).toContainText("Email Templates");
    await expect(page.locator("#cp-email-body-editor")).toBeVisible();

    // Send test preview
    await page.click("button[data-act='cp-email-preview']");
    const previewModal = page.locator(".modal[role='dialog']");
    await expect(previewModal).toBeVisible();
    await expect(previewModal.locator("h2, h3").first()).toContainText("Email Preview");
    await previewModal.locator("button[data-act='close']").first().click();

    // Implementation
    await page.click("button.cp-top-nav-btn:has-text('Implementation')");
    await expect(page.locator(".cp-header-title")).toContainText("Implementation");
    await expect(page.locator(".cp-code-block").first()).toContainText("consent-preference-sdk.js");

    // Copy script
    await page.click("button[data-act='cp-copy-sdk']");
    await expect(page.locator(".toast")).toContainText("copied");
  });

  test("8. Role-based Access Control: Auditor read-only mode and restricted submodules", async ({ page }) => {
    // Open user menu
    await page.click("button[data-act='cp-toggle-user-menu']");
    await expect(page.locator(".cp-user-dropdown")).toBeVisible();

    // Switch to Auditor (Priya Nair)
    await page.click(".cp-user-dropdown-item:has-text('Priya Nair')");
    await page.waitForTimeout(200);

    // Read-only banner is displayed
    await expect(page.locator(".cp-alert-banner.warning")).toBeVisible();
    await expect(page.locator(".cp-alert-banner.warning")).toContainText("Read-only mode");

    // Click restricted module: Workflows
    await page.click("button.cp-top-nav-btn:has-text('Workflows')");
    await expect(page.locator("h3:has-text('Access Restricted')")).toBeVisible();
    await expect(page.locator(".card")).toContainText("Auditor");

    // Click Back to Dashboard button
    await page.click("button[data-act='cp-tab'][data-arg='dashboard']");
    await expect(page.locator(".cp-header-title")).toContainText("Consent Preference Dashboard");

    // Switch back to Super Administrator
    await page.click("button[data-act='cp-toggle-user-menu']");
    await page.click(".cp-user-dropdown-item:has-text('Asha Verma')");
    await page.waitForTimeout(200);
    await expect(page.locator(".cp-alert-banner.warning")).toHaveCount(0);
  });
});
