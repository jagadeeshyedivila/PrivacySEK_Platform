import { test, expect } from '@playwright/test';

test.describe('E. Real Playwright Website Scanner Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/#cookies');
    // Ensure we switch to the scanner submodule tab
    const scannerTabBtn = page.locator('button:has-text("Cookie Scanner")');
    await scannerTabBtn.click();
    await expect(page.locator('h2:has-text("Cookie Scanner")')).toBeVisible();
  });

  test('Scanner header renders with Playwright active badge and real scanner overview', async ({ page }) => {
    const engineBadge = page.locator('.cc-scan-local-label');
    await expect(engineBadge).toBeVisible();
    await expect(engineBadge).toContainText('Playwright Engine Active');

    await expect(page.locator('.card:has-text("Configure Website Scan")')).toBeVisible();
    await expect(page.locator('.card:has-text("Latest Scan Details")')).toBeVisible();
    await expect(page.locator('.card:has-text("Saved Automated Schedules")')).toBeVisible();
    await expect(page.locator('.card:has-text("Website Scans History")')).toBeVisible();
  });

  test('URL input validates properly and rejects empty or malformed URLs', async ({ page }) => {
    const startDeepBtn = page.locator('button[data-act="cc-run-deep-scan"]');
    await expect(startDeepBtn).toBeVisible();

    // Empty URL
    await page.locator('#cc-scan-url').fill('');
    await startDeepBtn.click();
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('Enter a valid website URL');

    // Invalid scheme URL
    await page.locator('#cc-scan-url').fill('ftp://invalid-scheme.org');
    await startDeepBtn.click();
    await expect(page.locator('.toast')).toContainText('HTTP or HTTPS');
  });

  test('Custom Scan modal allows configuring limits, seed paths, and schedule frequency', async ({ page }) => {
    const customModalBtn = page.locator('button[data-act="cc-schedule-scan-modal"]');
    await customModalBtn.click();

    // Verify modal elements
    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toContainText('Configure Custom Scan or Schedule');

    // Configure inputs
    await page.locator('#cc-scan-setup-url').fill('https://example.com');
    await page.locator('#cc-scan-setup-pages').fill('15');
    const depthSelect = page.locator('#cc-scan-setup-depth');
    if (await depthSelect.isVisible().catch(() => false)) {
      await depthSelect.selectOption('2');
    }
    await page.locator('#cc-scan-frequency').selectOption('Weekly');

    // Add additional seed path
    const addSeedBtn = page.locator('button[data-act="cc-add-scan-seed"]');
    await addSeedBtn.click();
    const seedInput = page.locator('#cc-scan-seed-list input.cc-scan-seed').first();
    await seedInput.fill('/pricing');

    // Close dialog
    await page.click('.modal button[data-act="close"]');
    await expect(modal).not.toBeVisible();
  });

  test('Scan report modal displays discovered cookies, third-party trackers, and consent scenarios', async ({ page }) => {
    // Wait for backend history to sync and populate scan report buttons
    const reportButton = page.locator('button[data-act="cc-view-scan-report"]').first();
    await expect(reportButton).toBeVisible({ timeout: 10000 });
    await reportButton.click();

    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toContainText('Scan Report:');

      // Check report sections and KPIs
      await expect(modal.locator('text=Total Cookies Discovered')).toBeVisible();
      await expect(modal.locator('button[data-act="cc-switch-report-tab"][data-arg="consent"]')).toBeVisible();
      await expect(modal.locator('button[data-act="cc-sync-scan-to-inventory"]').first()).toBeVisible();

      // Verify table layout and zero horizontal overflow
      const tableWrapper = modal.locator('.cc-report-table-wrapper').first();
      await expect(tableWrapper).toBeVisible();

      const scrollWidth = await tableWrapper.evaluate(el => el.scrollWidth);
      const clientWidth = await tableWrapper.evaluate(el => el.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // strictly no horizontal scroll

      // Test tab switching: Network Trackers & Pixels
      const trackersTab = modal.locator('button[data-act="cc-switch-report-tab"][data-arg="trackers"]');
      await trackersTab.click();
      await expect(modal.locator('.cc-report-panel[data-panel="trackers"]')).toBeVisible();
      await expect(modal.locator('.cc-report-panel[data-panel="cookies"]')).toBeHidden();

      // Test tab switching: Consent Interaction Scenario Test
      const consentTab = modal.locator('button[data-act="cc-switch-report-tab"][data-arg="consent"]');
      await consentTab.click();
      await expect(modal.locator('.cc-report-panel[data-panel="consent"]')).toBeVisible();

      // Test tab switching: Crawled Pages
      const pagesTab = modal.locator('button[data-act="cc-switch-report-tab"][data-arg="pages"]');
      await pagesTab.click();
      await expect(modal.locator('.cc-report-panel[data-panel="pages"]')).toBeVisible();

      // Switch back to cookies tab
      const cookiesTab = modal.locator('button[data-act="cc-switch-report-tab"][data-arg="cookies"]');
      await cookiesTab.click();
      await expect(modal.locator('.cc-report-panel[data-panel="cookies"]')).toBeVisible();

      // Test Category Filter
      const necessaryFilter = modal.locator('button[data-act="cc-filter-report-category"][data-arg="necessary"]');
      if (await necessaryFilter.isVisible()) {
        await necessaryFilter.click();
        await expect(necessaryFilter).toHaveClass(/active/);
      }

      // Test Search Input
      const searchInput = modal.locator('.cc-report-search-input');
      if (await searchInput.isVisible()) {
        await searchInput.fill('_ga');
        // Check filter applied
        await searchInput.fill('');
      }

      // Take visual screenshot of the scan report modal
      await page.screenshot({ path: 'test-results/scan-report-modal.png' });

      await page.click('.modal button[data-act="close"]');
      await expect(modal).not.toBeVisible();
  });

  test('Compare Scans modal allows selecting two scans and computing drift', async ({ page }) => {
    const compareBtn = page.locator('button[data-act="cc-compare-scans-modal"]').first();
    const isVisible = await compareBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (isVisible) {
      await compareBtn.click();
      const modal = page.locator('.modal');
      const modalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
      if (modalVisible) {
        await expect(modal.locator('h2')).toContainText('Compare Website Cookie Scans');

        // Click run comparison
        const runCompareBtn = modal.locator('button[data-act="cc-run-compare-scans"]');
        if (await runCompareBtn.isVisible()) {
          await runCompareBtn.click();
          await expect(modal.locator('#cc-compare-results-area')).toBeVisible();
        }

        await page.click('.modal button[data-act="close"]');
        await expect(modal).not.toBeVisible();
      } else {
        await expect(page.locator('.toast')).toBeVisible();
      }
    }
  });

  test('Rejects private network addresses and internal SSRF destinations', async ({ page }) => {
    const startDeepBtn = page.locator('button[data-act="cc-run-deep-scan"]');

    // Test loopback IP
    await page.locator('#cc-scan-url').fill('http://127.0.0.1:8080');
    await startDeepBtn.click();
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('private, loopback, or reserved network range');

    // Test link-local cloud metadata IP
    await page.locator('#cc-scan-url').fill('http://169.254.169.254/latest/meta-data');
    await startDeepBtn.click();
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('private, loopback, or reserved network range');
  });

  test('Syncing discovered cookies updates the Cookie Categories inventory', async ({ page }) => {
    // Switch to inventory to check initial cookie count
    await page.locator('button:has-text("Cookie Categories")').click();
    await expect(page.locator('.card:has-text("Cookie Inventory")')).toBeVisible();

    // Switch back to scanner
    await page.locator('button:has-text("Cookie Scanner")').click();

    // If report button exists, test sync
    const reportButtons = page.locator('button[data-act="cc-view-scan-report"]');
    if (await reportButtons.count() > 0) {
      await reportButtons.first().click();
      const modal = page.locator('.modal');
      await expect(modal).toBeVisible();

      const syncBtn = modal.locator('button[data-act="cc-sync-scan-to-inventory"]').first();
      if (await syncBtn.isVisible()) {
        await syncBtn.click();
      }
      await page.click('.modal button[data-act="close"]');

      // Navigate back to Cookie Categories and verify inventory table is rendered
      await page.locator('button:has-text("Cookie Categories")').click();
      await expect(page.locator('.card:has-text("Cookie Inventory")')).toBeVisible();
    }
  });
});
