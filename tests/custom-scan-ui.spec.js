import { test, expect } from '@playwright/test';

test.describe('Custom Scan Modal Interactive UI Enhancements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#cookies');
    const scannerTabBtn = page.locator('button:has-text("Cookie Scanner")');
    await scannerTabBtn.click();
    await expect(page.locator('h2:has-text("Cookie Scanner")')).toBeVisible();
  });

  test('Interactive UI: + Add URL / Path, Remove seed, Advanced Path Filters toggle, and Conditional Recurrence fields', async ({ page }) => {
    // 1. Open the Custom Scan / Schedule modal
    const customModalBtn = page.locator('button[data-act="cc-schedule-scan-modal"]');
    await customModalBtn.click();
    const modal = page.locator('.modal[role="dialog"]');
    await expect(modal).toBeVisible();

    // 2. Test Scope selection (Deep Scan hides pages input, Custom Scan reveals it)
    const scopeSelect = modal.locator('#cc-scan-setup-type');
    const pageLimitField = modal.locator('#cc-scan-page-limit-field');
    await expect(pageLimitField).toBeVisible();

    await scopeSelect.selectOption('Deep Scan');
    await expect(pageLimitField).toBeHidden();

    await scopeSelect.selectOption('Custom Scan');
    await expect(pageLimitField).toBeVisible();

    // 3. Test + Add URL / Path and Remove seed button (×)
    const seedList = modal.locator('#cc-scan-seed-list');
    const initialSeedRows = seedList.locator('.cc-scan-seed-row');
    const initialCount = await initialSeedRows.count();

    const addSeedBtn = modal.locator('button[data-act="cc-add-scan-seed"]');
    await addSeedBtn.click();
    await expect(seedList.locator('.cc-scan-seed-row')).toHaveCount(initialCount + 1);

    // Fill in the new seed
    const newSeedInput = seedList.locator('.cc-scan-seed-row').last().locator('input.cc-scan-seed');
    await newSeedInput.fill('/careers');
    await expect(newSeedInput).toHaveValue('/careers');

    // Remove the added seed
    const removeBtn = seedList.locator('.cc-scan-seed-row').last().locator('button[data-act="cc-remove-scan-seed"]');
    await removeBtn.click();
    await expect(seedList.locator('.cc-scan-seed-row')).toHaveCount(initialCount);

    // 4. Test Advanced Path Filters toggle (+ Show / - Hide) if enabled in UI
    const advToggleBtn = modal.locator('#cc-scan-advanced-toggle');
    const advSection = modal.locator('#cc-scan-advanced-section');

    if (await advToggleBtn.isVisible().catch(() => false)) {
      // Initially hidden
      await expect(advSection).toBeHidden();
      await expect(advToggleBtn).toHaveText('+ Show Advanced Path Filters');

      // Click to show
      await advToggleBtn.click();
      await expect(advSection).toBeVisible();
      await expect(advToggleBtn).toHaveText('- Hide Advanced Path Filters');

      // Enter include and exclude paths
      const includeInput = modal.locator('#cc-scan-include-paths');
      const excludeInput = modal.locator('#cc-scan-exclude-paths');
      await includeInput.fill('/products, /blog/*');
      await excludeInput.fill('/admin, /checkout');

      await expect(includeInput).toHaveValue('/products, /blog/*');
      await expect(excludeInput).toHaveValue('/admin, /checkout');

      // Click to hide again
      await advToggleBtn.click();
      await expect(advSection).toBeHidden();
      await expect(advToggleBtn).toHaveText('+ Show Advanced Path Filters');
    }

    // 5. Test Frequency selection and Conditional Recurrence fields & Schedule button state
    const freqSelect = modal.locator('#cc-scan-frequency');
    const recurOptions = modal.locator('#cc-scan-recurrence-options');
    const weekdayWrap = modal.locator('#cc-scan-weekday-wrap');
    const monthdayWrap = modal.locator('#cc-scan-monthday-wrap');
    const scheduleBtn = modal.locator('#cc-btn-schedule-scan');

    // Initially 'Once' (One-time Only) -> recurrence fields hidden, Schedule for Later button disabled
    await expect(recurOptions).toBeHidden();
    await expect(scheduleBtn).toBeDisabled();

    // Select Daily -> options visible, weekday & monthday hidden, Schedule button enabled
    await freqSelect.selectOption('Daily');
    await expect(recurOptions).toBeVisible();
    await expect(weekdayWrap).toBeHidden();
    await expect(monthdayWrap).toBeHidden();
    await expect(scheduleBtn).toBeEnabled();

    // Select Weekly -> weekday visible, monthday hidden, Schedule button enabled
    await freqSelect.selectOption('Weekly');
    await expect(recurOptions).toBeVisible();
    await expect(weekdayWrap).toBeVisible();
    await expect(monthdayWrap).toBeHidden();
    await expect(scheduleBtn).toBeEnabled();

    // Select Monthly -> monthday visible, weekday hidden, Schedule button enabled
    await freqSelect.selectOption('Monthly');
    await expect(recurOptions).toBeVisible();
    await expect(monthdayWrap).toBeVisible();
    await expect(weekdayWrap).toBeHidden();
    await expect(scheduleBtn).toBeEnabled();

    // Select Once again -> all hidden, Schedule button disabled again
    await freqSelect.selectOption('Once');
    await expect(recurOptions).toBeHidden();
    await expect(scheduleBtn).toBeDisabled();

    // Close modal
    await modal.locator('button[data-act="close"]').first().click();
    await expect(modal).not.toBeVisible();
  });
});
