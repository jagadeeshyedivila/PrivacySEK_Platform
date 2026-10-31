import { test, expect } from '@playwright/test';

test.describe('Cookie Consent Overview & Analytics Dashboard Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#cookies');
    const analyticsTabBtn = page.locator('button:has-text("Overview & Analytics")');
    await expect(analyticsTabBtn).toBeVisible({ timeout: 10000 });
    await analyticsTabBtn.click();
    await expect(page.locator('h2:has-text("Overview & Analytics")')).toBeVisible();
  });

  test('KPI cards display accurate aggregated metrics for scans, cookie types, and classifications', async ({ page }) => {
    // 1. Verify 6 requested KPI cards are rendered
    const kpiContainer = page.locator('.cc-dashboard-kpis');
    await expect(kpiContainer).toBeVisible();

    const totalScansKpi = kpiContainer.locator('.cc-dashboard-kpi', { hasText: 'Total Scans' });
    const deepScansKpi = kpiContainer.locator('.cc-dashboard-kpi', { hasText: 'Deep Scans' });
    const customScansKpi = kpiContainer.locator('.cc-dashboard-kpi', { hasText: 'Custom Scans' });
    const totalCookiesKpi = kpiContainer.locator('.cc-dashboard-kpi', { hasText: 'Total Cookies Identified' });
    const partyKpi = kpiContainer.locator('.cc-dashboard-kpi', { hasText: '1st-Party vs 3rd-Party' });
    const pendingKpi = kpiContainer.locator('.cc-dashboard-kpi', { hasText: 'Cookies Pending Classification' });

    await expect(totalScansKpi).toBeVisible();
    await expect(deepScansKpi).toBeVisible();
    await expect(customScansKpi).toBeVisible();
    await expect(totalCookiesKpi).toBeVisible();
    await expect(partyKpi).toBeVisible();
    await expect(pendingKpi).toBeVisible();

    // Verify numerical values are present
    const totalScansText = await totalScansKpi.locator('strong').textContent();
    expect(Number(totalScansText)).toBeGreaterThan(0);

    const deepScansText = await deepScansKpi.locator('strong').textContent();
    expect(Number(deepScansText)).toBeGreaterThan(0);

    const customScansText = await customScansKpi.locator('strong').textContent();
    expect(Number(customScansText)).toBeGreaterThanOrEqual(0);

    // Sum of Deep + Custom equals Total Scans
    expect(Number(deepScansText) + Number(customScansText)).toBe(Number(totalScansText));

    // Verify inventory cookie metrics
    const totalCookiesText = await totalCookiesKpi.locator('strong').textContent();
    expect(Number(totalCookiesText)).toBeGreaterThan(0);

    const partyText = await partyKpi.locator('strong').textContent();
    expect(partyText).toContain('/');
  });

  test('Displays Scan Activity Over Time and Category-wise Cookie Distribution charts', async ({ page }) => {
    // 1. Scan Activity Over Time Chart
    const scanActivityPanel = page.locator('.cc-dashboard-panel', { hasText: 'Scan Activity Over Time' });
    await expect(scanActivityPanel).toBeVisible();
    await expect(scanActivityPanel.locator('.cc-dashboard-legend')).toContainText('Deep Scan');
    await expect(scanActivityPanel.locator('.cc-dashboard-legend')).toContainText('Custom Scan');
    await expect(scanActivityPanel.locator('.cc-dashboard-trend-chart')).toBeVisible();
    await expect(scanActivityPanel.locator('.cc-dashboard-trend-summary')).toContainText('total scans');

    // 2. Category-wise Cookie Distribution Chart
    const categoryPanel = page.locator('.cc-dashboard-panel', { hasText: 'Category-wise Cookie Distribution' });
    await expect(categoryPanel).toBeVisible();
    await expect(categoryPanel.locator('.cc-dashboard-dist-bar')).toBeVisible();
    await expect(categoryPanel.locator('.cc-dashboard-dist-list')).toBeVisible();

    // Verify presence of canonical categories including Marketing
    await expect(categoryPanel.locator('.cc-dashboard-dist-item', { hasText: 'Strictly Necessary' })).toBeVisible();
    await expect(categoryPanel.locator('.cc-dashboard-dist-item', { hasText: 'Marketing' })).toBeVisible();
    await expect(categoryPanel.locator('.cc-dashboard-dist-item', { hasText: 'Analytics' })).toBeVisible();
  });

  test('Filter bar updates all metrics and charts consistently, and Reset Filters restores defaults', async ({ page }) => {
    const filters = page.locator('.cc-dashboard-filters');
    await expect(filters).toBeVisible();

    // Verify presence of all 4 filters
    const rangeSelect = filters.locator('select[data-act="cc-dashboard-range"]');
    const scanTypeSelect = filters.locator('select[data-act="cc-dashboard-scantype"]');
    const domainSelect = filters.locator('select[data-act="cc-dashboard-domain"]');
    const categorySelect = filters.locator('select[data-act="cc-dashboard-category"]');

    await expect(rangeSelect).toBeVisible();
    await expect(scanTypeSelect).toBeVisible();
    await expect(domainSelect).toBeVisible();
    await expect(categorySelect).toBeVisible();

    // Initially, Reset Filters button is not visible
    const resetBtn = filters.locator('button[data-act="cc-dashboard-reset-filters"]');
    await expect(resetBtn).not.toBeVisible();

    // 1. Test Scan Type filter -> Filter to "Deep Scan"
    const totalScansKpi = page.locator('.cc-dashboard-kpis .cc-dashboard-kpi', { hasText: 'Total Scans' });
    const initialTotalText = await totalScansKpi.locator('strong').textContent();

    await scanTypeSelect.selectOption('Deep Scan');
    await expect(resetBtn).toBeVisible();

    // Custom Scans KPI should become 0 when filtered strictly to Deep Scan
    const customScansKpi = page.locator('.cc-dashboard-kpis .cc-dashboard-kpi', { hasText: 'Custom Scans' });
    await expect(customScansKpi.locator('strong')).toHaveText('0');

    // 2. Test Category filter -> Filter to "Marketing"
    await categorySelect.selectOption('marketing');
    const categoryPanel = page.locator('.cc-dashboard-panel', { hasText: 'Category-wise Cookie Distribution' });
    await expect(categoryPanel.locator('.cc-dashboard-dist-item.active')).toContainText('Marketing');

    // 3. Test Reset Filters
    await resetBtn.click();
    await expect(resetBtn).not.toBeVisible();
    await expect(scanTypeSelect).toHaveValue('all');
    await expect(categorySelect).toHaveValue('all');

    // Total Scans restored
    await expect(totalScansKpi.locator('strong')).toHaveText(initialTotalText);
  });
});
