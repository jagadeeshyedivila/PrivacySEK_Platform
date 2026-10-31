import { test, expect } from '@playwright/test';

test.describe('Scheduled Scan Run Now Execution & Status Reconciliation', () => {

  test('Once schedule: Running state displays Running… and transitions to Completed with Run Again once finished', async ({ page }) => {
    // 1. Create a Once schedule directly via API
    const scheduleId = `sched-test-${Date.now()}`;
    const schedulePayload = {
      id: scheduleId,
      url: 'https://example.com',
      type: 'Custom Scan',
      frequency: 'Once',
      pages: 1,
      depth: 1,
      duration: 30,
      urls: ['https://example.com'],
      enabled: true,
      lastRunStatus: null,
      lastRunAt: null,
      nextRunAt: null,
    };

    const res = await page.request.post('http://localhost:3001/api/scanner/schedules', {
      data: schedulePayload,
    });
    expect(res.status()).toBe(201);

    // 2. Open Cookie Scanner page
    await page.goto('/#cookies');
    const scannerTabBtn = page.locator('button:has-text("Cookie Scanner")');
    await scannerTabBtn.click();
    await expect(page.locator('h2:has-text("Cookie Scanner")')).toBeVisible();

    // Verify schedule appears in Saved Automated Schedules table
    const scheduleRow = page.locator('.card:has-text("Saved Automated Schedules") table tbody tr').filter({
      has: page.locator(`button[data-act="cc-run-scheduled-scan"][data-arg="${scheduleId}"]`)
    });
    await expect(scheduleRow).toBeVisible();

    // 3. Click Run Now button
    const runBtn = scheduleRow.locator('button[data-act="cc-run-scheduled-scan"]');
    await expect(runBtn).toHaveText('Run Now');
    await runBtn.click();

    // 4. Verify that while scan is initiated, button shows Running… and is disabled
    await expect(runBtn).toHaveText('Running…');
    await expect(runBtn).toBeDisabled();

    // 5. Wait for scan to complete and verify status transitions to Completed
    const statusPill = scheduleRow.locator('.v');
    await expect(statusPill).toHaveText('Completed', { timeout: 25000 });

    // 6. Verify that once completed:
    // - Status is Completed (not stuck in Running)
    await expect(statusPill).toHaveText('Completed');
    // - Next Run column shows Completed (Once)
    await expect(scheduleRow).toContainText('Completed (Once)');
    // - Action button changes to Run Again (not stuck on active Run Now / Running)
    await expect(scheduleRow.locator('button[data-act="cc-run-scheduled-scan"]')).toHaveText('Run Again');
    await expect(scheduleRow.locator('button[data-act="cc-run-scheduled-scan"]')).toBeEnabled();

    // 7. Verify persistence across page reload
    await page.reload();
    await page.locator('button:has-text("Cookie Scanner")').click();
    const reloadedRow = page.locator('.card:has-text("Saved Automated Schedules") table tbody tr').filter({
      has: page.locator(`button[data-act="cc-run-scheduled-scan"][data-arg="${scheduleId}"]`)
    });
    await expect(reloadedRow.locator('.v')).toHaveText('Completed');
    await expect(reloadedRow.locator('button[data-act="cc-run-scheduled-scan"]')).toHaveText('Run Again');

    // Clean up schedule
    await page.request.delete(`http://localhost:3001/api/scanner/schedules/${scheduleId}`);
  });
});
