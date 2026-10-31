import { test, expect } from '@playwright/test';

test.describe('Desktop Sidebar Expand/Collapse & Responsiveness Tests', () => {

  test('Desktop: Sidebar expands, collapses, displays tooltips, adjusts main content, and persists across reload', async ({ page }) => {
    // 1. Ensure desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    // Reset any previous localStorage preference
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('psk_sidebar_collapsed'));
    await page.reload();

    const app = page.locator('#app');
    const rail = page.locator('#rail');
    const collapseBtn = page.locator('.rail-collapse-btn');
    const mainContent = page.locator('#content');

    // Default expanded state
    await expect(app).not.toHaveClass(/collapsed/);
    await expect(rail).not.toHaveClass(/collapsed/);
    await expect(collapseBtn).toHaveAttribute('aria-label', 'Collapse sidebar');
    await expect(page.locator('.rail-brand .word')).toBeVisible();

    const initialRailWidth = await rail.evaluate(el => el.getBoundingClientRect().width);
    expect(initialRailWidth).toBeGreaterThan(200);

    const initialContentWidth = await mainContent.evaluate(el => el.getBoundingClientRect().width);

    // 2. Click collapse button
    await collapseBtn.click();

    // Verify collapsed state
    await expect(app).toHaveClass(/collapsed/);
    await expect(rail).toHaveClass(/collapsed/);
    await expect(collapseBtn).toHaveAttribute('aria-label', 'Expand sidebar');
    await expect(page.locator('.rail-brand .word')).toBeHidden();

    // Allow CSS grid column transition to settle
    await page.waitForTimeout(260);

    const collapsedRailWidth = await rail.evaluate(el => el.getBoundingClientRect().width);
    expect(collapsedRailWidth).toBeLessThanOrEqual(72);
    expect(collapsedRailWidth).toBeGreaterThanOrEqual(60);

    // Main content width should have expanded smoothly
    const expandedContentWidth = await mainContent.evaluate(el => el.getBoundingClientRect().width);
    expect(expandedContentWidth).toBeGreaterThan(initialContentWidth);

    // 3. Test tooltip appearance on hover in collapsed mode
    const cookieNavBtn = page.locator('button[data-go="cookies"]');
    const cookieTooltip = cookieNavBtn.locator('.rail-tooltip');

    // Hover over nav button
    await cookieNavBtn.hover();
    await expect(cookieTooltip).toBeVisible();
    await expect(cookieTooltip).toContainText('Cookie Consent');

    // 4. Test Persistence across page reload
    await page.reload();
    await expect(page.locator('#app')).toHaveClass(/collapsed/);
    await expect(page.locator('#rail')).toHaveClass(/collapsed/);
    await expect(page.locator('.rail-collapse-btn')).toHaveAttribute('aria-label', 'Expand sidebar');

    // 5. Test Persistence across navigation to other views
    await page.locator('button[data-go="cookies"]').click();
    await expect(page.locator('#crumb')).toContainText('Cookie Consent');
    await expect(page.locator('#app')).toHaveClass(/collapsed/);

    await page.locator('button[data-go="ropa"]').click();
    await expect(page.locator('#crumb')).toContainText('Data Map & ROPA');
    await expect(page.locator('#app')).toHaveClass(/collapsed/);

    // 6. Test Keyboard shortcut (Ctrl+B) to expand
    await page.keyboard.press('Control+b');
    await expect(page.locator('#app')).not.toHaveClass(/collapsed/);
    await expect(page.locator('.rail-brand .word')).toBeVisible();

    // Verify preference updated in localStorage
    const storedPref = await page.evaluate(() => localStorage.getItem('psk_sidebar_collapsed'));
    expect(storedPref).toBe('false');

    // 7. Click expand/collapse button back to expanded
    await page.keyboard.press('Control+b');
    await expect(page.locator('#app')).toHaveClass(/collapsed/);

    await page.locator('.rail-collapse-btn').click();
    await expect(page.locator('#app')).not.toHaveClass(/collapsed/);
    await expect(page.locator('.rail-collapse-btn')).toHaveAttribute('aria-label', 'Collapse sidebar');
  });

  test('Mobile & Tablet: Collapse toggle button is hidden and responsive navigation drawer remains intact', async ({ page }) => {
    // 1. Tablet viewport (768 x 1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/#cookies');

    const collapseBtn = page.locator('.rail-collapse-btn');
    await expect(collapseBtn).toBeHidden();

    // Hamburger menu button should be visible
    const menuBtn = page.locator('.menu-btn');
    await expect(menuBtn).toBeVisible();

    // Opening drawer
    await menuBtn.click();
    const rail = page.locator('#rail');
    await expect(rail).toHaveClass(/open/);

    // Closing drawer via scrim
    const scrim = page.locator('.scrim');
    await expect(scrim).toBeVisible();
    await scrim.click();
    await expect(rail).not.toHaveClass(/open/);

    // 2. Mobile viewport (375 x 812)
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(collapseBtn).toBeHidden();
    await expect(menuBtn).toBeVisible();

    await menuBtn.click();
    await expect(rail).toHaveClass(/open/);
    await page.locator('.scrim').click({ force: true });
    await expect(rail).not.toHaveClass(/open/);
  });
});
