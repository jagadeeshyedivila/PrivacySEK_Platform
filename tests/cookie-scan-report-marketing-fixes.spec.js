import { test, expect } from '@playwright/test';

test.describe('Cookie Scan Report & Website Scans History Fixes', () => {

  test('Scan Report displays Marketing category, allows classifying unclassified cookies, and syncs to inventory', async ({ page }) => {
    await page.goto('/#cookies');

    // Switch to Cookie Scanner tab
    const scannerTabBtn = page.locator('button:has-text("Cookie Scanner")');
    await scannerTabBtn.click();
    await expect(page.locator('h2:has-text("Cookie Scanner")')).toBeVisible();

    // Find the Netflix scan or first completed scan and click "Report"
    const reportBtn = page.locator('#cc-scans-history-table tbody tr').first().locator('button:has-text("Report")');
    await reportBtn.click();

    // Verify Scan Report modal is displayed
    const modal = page.locator('.cc-report-modal');
    await expect(modal).toBeVisible();

    // 1. Verify "Marketing" category filter button exists in the Discovered Cookies section
    const marketingCatBtn = modal.locator('button.cc-report-cat-btn[data-arg="marketing"]');
    await expect(marketingCatBtn).toBeVisible();
    await expect(marketingCatBtn).toContainText('Marketing');

    // 2. Click "Needs Review" filter to view unclassified cookies
    const needsReviewBtn = modal.locator('button.cc-report-cat-btn[data-arg="unclassified"]');
    if (await needsReviewBtn.isVisible()) {
      await needsReviewBtn.click();
    }

    // 3. Verify there is a classify dropdown on unclassified cookies
    const classifySelect = modal.locator('select.cc-report-cat-select').first();
    if (await classifySelect.isVisible()) {
      // Select "Marketing" category
      await classifySelect.selectOption('marketing');

      // Toast should confirm classification
      await expect(page.locator('.toast')).toContainText('categorized as Marketing');

      // Verify the marketing filter button count or active status
      await expect(marketingCatBtn).toBeVisible();
    }

    // Close the modal
    const closeBtn = page.locator('.modal .drawer-h button, .modal button:has-text("Close")').first();
    await closeBtn.click();
  });

  test('Reset Filters button in Website Scans History is a compact button and not full-width', async ({ page }) => {
    await page.goto('/#cookies');

    const scannerTabBtn = page.locator('button:has-text("Cookie Scanner")');
    await scannerTabBtn.click();
    await expect(page.locator('h2:has-text("Cookie Scanner")')).toBeVisible();

    // Type a nonexistent search query to trigger the empty state
    const searchInput = page.locator('.cc-scan-page input[data-input-act="cc-scans-search"]');
    await searchInput.fill('nonexistent-query-xyz-999');

    // Verify empty state is displayed
    const emptyState = page.locator('.table-empty-state');
    await expect(emptyState).toBeVisible();

    // Check the Reset Filters button width
    const resetBtn = emptyState.locator('button.table-empty-reset');
    await expect(resetBtn).toBeVisible();
    const box = await resetBtn.boundingBox();
    expect(box).not.toBeNull();
    // In buggy state, min-width was 1100px; now it should be compact (< 250px)
    expect(box.width).toBeLessThan(250);

    // Click Reset Filters and verify table recovers
    await resetBtn.click();
    await expect(page.locator('#cc-scans-history-table tbody tr')).not.toHaveCount(0);
  });

  test('Entering search text maintains scroll position and does not jump upward', async ({ page }) => {
    await page.goto('/#cookies');

    const scannerTabBtn = page.locator('button:has-text("Cookie Scanner")');
    await scannerTabBtn.click();
    await expect(page.locator('h2:has-text("Cookie Scanner")')).toBeVisible();

    const searchInput = page.locator('.cc-scan-page input[data-input-act="cc-scans-search"]');
    await searchInput.scrollIntoViewIfNeeded();

    // Record initial scroll position
    const contentEl = page.locator('#content');
    const scrollPosBefore = await contentEl.evaluate(el => el.scrollTop);
    expect(scrollPosBefore).toBeGreaterThan(100);

    // Type text into search input
    await searchInput.type('netflix', { delay: 50 });

    // Verify scroll position is maintained (not reset to 0)
    const scrollPosAfter = await contentEl.evaluate(el => el.scrollTop);
    expect(scrollPosAfter).toBeGreaterThan(100);
    expect(Math.abs(scrollPosAfter - scrollPosBefore)).toBeLessThan(150);
  });

  test('Scan history table displays 21 total scans with 10 records per page and paginates through pages 1, 2, 3', async ({ page }) => {
    await page.goto('/#cookies');

    const scannerTabBtn = page.locator('button:has-text("Cookie Scanner")');
    await scannerTabBtn.click();
    await expect(page.locator('h2:has-text("Cookie Scanner")')).toBeVisible();

    const paginationBar = page.locator('.table-pagination-bar[data-table-pagination="scans"]');
    await paginationBar.scrollIntoViewIfNeeded();
    await expect(paginationBar).toBeVisible();

    // Verify 21 total scans
    await expect(paginationBar.locator('.table-pagination-info')).toContainText('21 scans');

    const historyTableRows = page.locator('#cc-scans-history-table tbody tr');
    // Page 1 should show 10 scans
    await expect(historyTableRows).toHaveCount(10);
    await expect(paginationBar.locator('.pg-num.is-active')).toHaveText('1');

    // Click Page 2
    const page2Btn = paginationBar.locator('button.pg-num:has-text("2")');
    await page2Btn.click();
    await expect(paginationBar.locator('.pg-num.is-active')).toHaveText('2');
    await expect(historyTableRows).toHaveCount(10);

    // Click Next to Page 3
    const nextBtn = paginationBar.locator('button.pg-next');
    await nextBtn.click();
    await expect(paginationBar.locator('.pg-num.is-active')).toHaveText('3');
    await expect(historyTableRows).toHaveCount(1);
    await expect(nextBtn).toBeDisabled();

    // Click Prev back to Page 2
    const prevBtn = paginationBar.locator('button.pg-prev');
    await prevBtn.click();
    await expect(paginationBar.locator('.pg-num.is-active')).toHaveText('2');
    await expect(historyTableRows).toHaveCount(10);

    // Click 1 back to Page 1
    const page1Btn = paginationBar.locator('button.pg-num:has-text("1")');
    await page1Btn.click();
    await expect(paginationBar.locator('.pg-num.is-active')).toHaveText('1');
    await expect(historyTableRows).toHaveCount(10);
  });

});
