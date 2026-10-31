import { test, expect } from '@playwright/test';

test.describe('Cookie Scanner Scan History Pagination Tests', () => {

  test('Pagination navigates pages (1, 2, 3, Next, Prev, First, Last) and adjusts page size correctly', async ({ page }) => {
    // Generate 21 mock scans
    const mockScans = Array.from({ length: 21 }, (_, i) => ({
      id: `scan-${1000 + i}`,
      url: `https://example-${i + 1}.com/`,
      type: i % 2 === 0 ? "Deep Scan" : "Quick Scan",
      createdAt: new Date(Date.now() - i * 3600000).toISOString(),
      status: "Completed",
      cookiesCount: i + 1,
      thirdPartyCount: i * 2,
      pagesCount: 5,
      duration: "12s",
      cookies: [],
      trackers: [],
      pages: [`https://example-${i + 1}.com/`],
      failedPages: [],
      complianceStatus: "Compliant"
    }));

    // Intercept /api/scanner/history to return 21 scans
    await page.route('**/api/scanner/history*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockScans)
      });
    });

    await page.goto('/#cookies');
    const scannerTabBtn = page.locator('button:has-text("Cookie Scanner")');
    await scannerTabBtn.click();
    await expect(page.locator('h2:has-text("Cookie Scanner")')).toBeVisible();

    // Verify pagination bar exists for the scans table
    const paginationBar = page.locator('.table-pagination-bar[data-table-pagination="scans"]');
    await expect(paginationBar).toBeVisible();

    const historyTableRows = page.locator('#cc-scans-history-table tbody tr');

    // Page 1 should show 1-10 of 21 scans
    await expect(paginationBar.locator('.table-pagination-info')).toContainText('Showing 1–10 of 21 scans');
    await expect(historyTableRows).toHaveCount(10);
    await expect(historyTableRows.first()).toContainText('scan-1000');
    await expect(historyTableRows.last()).toContainText('scan-1009');

    // Page 1 active button
    await expect(paginationBar.locator('.pg-num.is-active')).toHaveText('1');

    // Click Page 2 button
    const page2Btn = paginationBar.locator('button.pg-num:has-text("2")');
    await page2Btn.click();

    // Verify Page 2 content
    await expect(paginationBar.locator('.table-pagination-info')).toContainText('Showing 11–20 of 21 scans');
    await expect(historyTableRows).toHaveCount(10);
    await expect(historyTableRows.first()).toContainText('scan-1010');
    await expect(historyTableRows.last()).toContainText('scan-1019');
    await expect(paginationBar.locator('.pg-num.is-active')).toHaveText('2');

    // Click "Next ›" button
    const nextBtn = paginationBar.locator('button.pg-next');
    await nextBtn.click();

    // Verify Page 3 content (last page, only 1 scan)
    await expect(paginationBar.locator('.table-pagination-info')).toContainText('Showing 21–21 of 21 scans');
    await expect(historyTableRows).toHaveCount(1);
    await expect(historyTableRows.first()).toContainText('scan-1020');
    await expect(paginationBar.locator('.pg-num.is-active')).toHaveText('3');
    await expect(nextBtn).toBeDisabled();

    // Click "‹ Prev" button
    const prevBtn = paginationBar.locator('button.pg-prev');
    await prevBtn.click();

    // Back on Page 2
    await expect(paginationBar.locator('.table-pagination-info')).toContainText('Showing 11–20 of 21 scans');
    await expect(historyTableRows).toHaveCount(10);
    await expect(historyTableRows.first()).toContainText('scan-1010');

    // Click "«" (First page) button
    const firstBtn = paginationBar.locator('button.pg-first');
    await firstBtn.click();

    // Back on Page 1
    await expect(paginationBar.locator('.table-pagination-info')).toContainText('Showing 1–10 of 21 scans');
    await expect(historyTableRows).toHaveCount(10);
    await expect(historyTableRows.first()).toContainText('scan-1000');

    // Change per-page dropdown to 25
    const pageSizeSelect = paginationBar.locator('select.table-page-size-select');
    await pageSizeSelect.selectOption('25');

    // Verify Page 1 now shows all 21 scans and totalPages becomes 1
    await expect(paginationBar.locator('.table-pagination-info')).toContainText('Showing 1–21 of 21 scans');
    await expect(historyTableRows).toHaveCount(21);
    await expect(paginationBar.locator('.pg-num')).toHaveCount(1);
    await expect(paginationBar.locator('button.pg-next')).toBeDisabled();
    await expect(paginationBar.locator('button.pg-prev')).toBeDisabled();
  });
});
