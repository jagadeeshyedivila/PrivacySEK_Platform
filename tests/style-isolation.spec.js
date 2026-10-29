import { test, expect } from "@playwright/test";

test.describe("D. Style Isolation & CSS Leakage Verification", () => {
  test("Banner Configuration root class .privacysek-banner-config isolates workspace", async ({ page }) => {
    await page.goto("/#cookies");
    await page.waitForTimeout(300);

    // Ensure the root isolation class exists
    const bannerConfig = page.locator(".privacysek-banner-config");
    await expect(bannerConfig).toBeVisible();

    // Verify workspace grid and sidebar are children of .privacysek-banner-config
    await expect(bannerConfig.locator(".cc-workspace-grid")).toBeVisible();
    await expect(bannerConfig.locator(".cc-config-sidebar")).toBeVisible();
    await expect(bannerConfig.locator(".cc-preview-pane")).toBeVisible();
  });

  test("When switching to other Cookie submodules, Banner Config elements are not present", async ({ page }) => {
    await page.goto("/#cookies");
    await page.waitForTimeout(300);

    // Switch to Scanner
    await page.click('button.cc-top-nav-btn:has-text("Cookie Scanner")');
    await expect(page.locator(".privacysek-banner-config")).toHaveCount(0);
    await expect(page.locator(".cc-workspace-grid")).toHaveCount(0);
    await expect(page.locator(".cc-preview-pane")).toHaveCount(0);

    // Switch to Categories
    await page.click('button.cc-top-nav-btn:has-text("Cookie Categories")');
    await expect(page.locator(".privacysek-banner-config")).toHaveCount(0);

    // Switch to Dashboard
    await page.click('button.cc-top-nav-btn:has-text("Overview & Analytics")');
    await expect(page.locator(".privacysek-banner-config")).toHaveCount(0);
  });

  test("Shared typography and global button styling in other modules remain intact", async ({ page }) => {
    await page.goto("/#cockpit");
    await page.waitForTimeout(300);

    const btn = page.locator('.ph .acts button.btn').first();
    if (await btn.count() > 0) {
      const fontSize = await btn.evaluate(el => window.getComputedStyle(el).fontSize);
      expect(fontSize).toBe("13.5px"); // Standard global .btn font-size
    }

    // Check Purpose Guard table & typography
    await page.goto("/#guard");
    await page.waitForTimeout(300);
    await expect(page.locator(".ph h1")).toHaveText("Purpose Guard");
    const h1FontSize = await page.locator(".ph h1").evaluate(el => window.getComputedStyle(el).fontSize);
    const viewport = page.viewportSize();
    const expectedSize = (viewport && viewport.width <= 900) ? "22px" : "26px";
    expect(h1FontSize).toBe(expectedSize); // Standard global .ph h1 font-size (26px on desktop, 22px on <=900px)
  });

  test("Responsive layout: Mobile navigation rail collapse and layout integrity", async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/#cookies");
    await page.waitForTimeout(300);

    // Verify mobile hamburger menu button appears in mobile view
    await expect(page.locator(".menu-btn")).toBeVisible();

    // Verify Banner Config stacks gracefully without horizontal scrolling of the body
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // No horizontal overflow regression

    await page.screenshot({ path: "test-screenshots/responsive-mobile-cookies.png" });
  });

  test("Responsive layout: Tablet viewport layout integrity", async ({ page }) => {
    // Set viewport to tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/#cookies");
    await page.waitForTimeout(300);

    await expect(page.locator(".privacysek-banner-config")).toBeVisible();
    await page.screenshot({ path: "test-screenshots/responsive-tablet-cookies.png" });
  });
});
