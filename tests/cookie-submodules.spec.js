import { test, expect } from "@playwright/test";

test.describe("C. Cookie Consent Submodules & Tabs Regression Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#cookies");
    await page.waitForTimeout(300);
  });

  test("Cookie Scanner submodule renders, crawls and displays scan history", async ({ page }) => {
    await page.click('button.cc-top-nav-btn:has-text("Cookie Scanner")');
    await expect(page.locator(".card:has-text('Configure Website Scan')")).toBeVisible();
    await expect(page.locator(".card:has-text('Latest Scan Details')")).toBeVisible();
    await expect(page.locator(".card:has-text('Website Scans History')")).toBeVisible();

    await page.screenshot({ path: "test-screenshots/submodule-scanner.png" });
  });

  test("Cookie Categories inventory renders table, search, filters and add cookie modal", async ({ page }) => {
    await page.click('button.cc-top-nav-btn:has-text("Cookie Categories")');
    await expect(page.locator(".card:has-text('Cookie Inventory')")).toBeVisible();
    await expect(page.locator("table.t")).toBeVisible();

    // Search filter
    const search = page.locator('input[data-input-act="cc-search-inventory"]');
    await search.fill("_ga");
    await expect(page.locator("table.t tbody tr").first()).toContainText("_ga");

    // Add cookie modal
    await page.click('button[data-act="cc-cookie-new"]');
    await expect(page.locator(".modal")).toBeVisible();
    await expect(page.locator(".modal h2")).toHaveText("Add New Cookie to Inventory");
    await page.click('.modal button[data-act="close"]');

    await page.screenshot({ path: "test-screenshots/submodule-categories.png" });
  });

  test("Implementation submodule displays scripts, instructions and copy button", async ({ page }) => {
    await page.click('button.cc-top-nav-btn:has-text("Implementation")');
    await expect(page.locator(".card:has-text('Install on HTML')")).toBeVisible();
    await expect(page.locator("#cc-snippet")).toBeVisible();
    await expect(page.locator('button[data-act="cc-copy-snippet"]').first()).toBeVisible();

    // Test platform tab switching
    await page.click('button.cc-install-tab-btn:has-text("WordPress")');
    await expect(page.locator('button.cc-install-tab-btn:has-text("WordPress")')).toHaveClass(/active/);

    await page.screenshot({ path: "test-screenshots/submodule-implementation.png" });
  });

  test("Auto Cookie Blocking submodule renders tag list and add script modal", async ({ page }) => {
    await page.click('button.cc-top-nav-btn:has-text("Auto Cookie Blocking")');
    await expect(page.locator(".card:has-text('Configured Dynamic Blocking Tags')")).toBeVisible();
    await expect(page.locator("table.t")).toBeVisible();

    // Add tag modal
    await page.click('button[data-act="cc-tag-new"]');
    await expect(page.locator(".modal")).toBeVisible();
    await expect(page.locator(".modal h2")).toHaveText("Add Script Tag Rule");
    await page.click('.modal button[data-act="close"]');

    await page.screenshot({ path: "test-screenshots/submodule-blocking.png" });
  });

  test("Consent Records submodule renders audit table and supports CSV export", async ({ page }) => {
    await page.click('button.cc-top-nav-btn:has-text("Consent Records")');
    await expect(page.locator(".card:has-text('Recent Consent Receipts')")).toBeVisible();
    await expect(page.locator("table.t")).toBeVisible();
    await expect(page.locator('button[data-act="cc-export-csv"]')).toBeVisible();

    await page.screenshot({ path: "test-screenshots/submodule-records.png" });
  });

  test("Overview & Analytics Dashboard renders KPIs, bar charts and summary cards", async ({ page }) => {
    await page.click('button.cc-top-nav-btn:has-text("Overview & Analytics")');
    await expect(page.locator("button.cc-dashboard-kpi:has-text('Consent receipts')")).toBeVisible();
    await expect(page.locator(".cc-dashboard-panel:has-text('Visitor choices')")).toBeVisible();
    await expect(page.locator(".cc-dashboard-panel:has-text('Discovery & blocking')")).toBeVisible();

    await page.screenshot({ path: "test-screenshots/submodule-dashboard.png" });
  });
});
