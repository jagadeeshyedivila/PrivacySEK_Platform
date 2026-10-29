import { test, expect } from "@playwright/test";

test.describe("B. Banner Configuration Functional & Visual Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#cookies");
    await page.waitForTimeout(300);
  });

  test("Workspace header, status, regions and top actions render properly", async ({ page }) => {
    await expect(page.locator(".privacysek-banner-config")).toBeVisible();
    await expect(page.locator(".cc-sub-header-title")).toHaveText("Banner Configuration");
    await expect(page.locator(".cc-publish-status-pill")).toBeVisible();

    // Verify region buttons exist
    const regions = ["EEA & UK", "USA", "India", "Global"];
    for (const reg of regions) {
      await expect(page.locator(`.cc-region-btn:has-text("${reg}")`)).toBeVisible();
    }

    // Verify top action buttons
    await expect(page.locator('button[data-act="cc-reset-banner-confirm"]')).toBeVisible();
    await expect(page.locator('button[data-act="cc-save-draft"]')).toBeVisible();
    await expect(page.locator('button[data-act="cc-publish-modal"]')).toBeVisible();
  });

  test("Sidebar switches between all 7 configuration sections without page refresh", async ({ page }) => {
    const sections = [
      { id: "config", title: "Regional & Feature Configuration" },
      { id: "language", title: "Languages & Multi-Language Support" },
      { id: "content", title: "Banner & Preference Center Content" },
      { id: "layout", title: "Layout, Position & Styling" },
      { id: "purposes", title: "Purposes & Cookie Categories" },
      { id: "frequency", title: "Display Frequency & Revisit" },
      { id: "vendors", title: "Vendors & Frameworks" },
    ];

    for (const s of sections) {
      await page.click(`button.cc-sidebar-item[data-arg="${s.id}"]`);
      await expect(page.locator(".cc-editor-header h3")).toHaveText(s.title);
      await expect(page.locator(".cc-preview-pane")).toBeVisible(); // Live preview remains visible
    }
  });

  test("Region selection switches active preset and updates preview text", async ({ page }) => {
    // Switch to USA
    await page.click('button.cc-region-btn:has-text("USA")');
    await expect(page.locator('button.cc-region-btn:has-text("USA")')).toHaveClass(/active/);
    await expect(page.locator(".cc-preview-header")).toContainText("USA");
    // USA includes "Do Not Sell / Share" button
    await expect(page.locator('button[data-act="cc-preview-visitor-gpc"]')).toBeVisible();

    // Switch to India
    await page.click('button.cc-region-btn:has-text("India")');
    await expect(page.locator('button.cc-region-btn:has-text("India")')).toHaveClass(/active/);
    await expect(page.locator(".cc-preview-header")).toContainText("India");
    await expect(page.locator(".cc-banner-title")).toContainText("DPDP Act");

    // Switch back to EEA & UK
    await page.click('button.cc-region-btn:has-text("EEA & UK")');
    await expect(page.locator('button.cc-region-btn:has-text("EEA & UK")')).toHaveClass(/active/);
  });

  test("Banner and Preference Center preview modes toggle correctly", async ({ page }) => {
    // Initially on Banner
    await expect(page.locator(".cc-banner-container")).toBeVisible();
    await expect(page.locator(".cc-preference-overlay")).toHaveCount(0);

    // Switch to Preference
    await page.click('button.cc-view-toggle-btn[data-arg="preference"]');
    await expect(page.locator(".cc-preference-overlay")).toBeVisible();
    await expect(page.locator(".cc-preference-card h3")).toContainText("Privacy Preferences");

    // Capture preference center preview screenshot
    await page.screenshot({ path: "test-screenshots/banner-config-preference-center.png" });

    // Switch back to Banner
    await page.click('button.cc-view-toggle-btn[data-arg="banner"]');
    await expect(page.locator(".cc-banner-container")).toBeVisible();
  });

  test("Device selector adjusts viewport container width (Desktop, Tablet, Mobile)", async ({ page }) => {
    const frame = page.locator(".cc-browser-frame");

    // Default Desktop
    await expect(frame).toHaveClass(/device-desktop/);

    // Switch to Tablet
    await page.click('button.cc-device-btn[data-arg="Tablet"]');
    await expect(frame).toHaveClass(/device-tablet/);

    // Switch to Mobile
    await page.click('button.cc-device-btn[data-arg="Mobile"]');
    await expect(frame).toHaveClass(/device-mobile/);

    // Switch back to Desktop
    await page.click('button.cc-device-btn[data-arg="Desktop"]');
    await expect(frame).toHaveClass(/device-desktop/);
  });

  test("Live content input immediately reflects in the live preview", async ({ page }) => {
    await page.click('button.cc-sidebar-item[data-arg="content"]');

    const titleInput = page.locator("#cc-content-title");
    await titleInput.fill("Automated Live Testing Notice Title");

    // Verify title in live preview is updated in real time
    await expect(page.locator(".cc-banner-title")).toHaveText("Automated Live Testing Notice Title");

    // Verify draft dirty indicator
    await expect(page.locator(".cc-publish-status-pill")).toHaveClass(/dirty/);
  });

  test("Multi-select language support works and allows multiple active languages", async ({ page }) => {
    await page.click('button.cc-sidebar-item[data-arg="language"]');

    const langCards = page.locator(".cc-language-card");
    const initialCount = await page.locator(".cc-language-card.enabled").count();
    expect(initialCount).toBeGreaterThan(1); // Multiple languages selected by default

    // Toggle a language on/off
    await page.locator('.cc-language-card:has-text("Japanese")').click();
    await expect(page.locator('.cc-language-card:has-text("Japanese")')).toHaveClass(/enabled/);
  });

  test("Save, Publish, and Publish History modals work correctly", async ({ page }) => {
    // Save draft
    await page.click('button[data-act="cc-save-draft"]');
    await expect(page.locator(".toast")).toBeVisible();

    // Open Publish Modal
    await page.click('button[data-act="cc-publish-modal"]');
    await expect(page.locator(".modal")).toBeVisible();
    await expect(page.locator(".modal h2")).toContainText("Publish Cookie Consent Banner");
    await page.click('.modal button[data-act="close"]');
    await expect(page.locator(".modal")).toHaveCount(0);

    // Open Publish History Modal
    await page.click('button[data-act="cc-open-publish-history"]');
    await expect(page.locator(".modal")).toBeVisible();
    await expect(page.locator(".cc-history-table")).toBeVisible();
    await page.screenshot({ path: "test-screenshots/banner-config-publish-history.png" });
    await page.click('.modal button[data-act="close"]');
  });

  test("Interactive visitor testing in live preview records consent decisions", async ({ page }) => {
    // Click Accept All in preview
    await page.click('button.cc-btn-accept');
    await expect(page.locator(".toast")).toContainText("Accepted All Categories");

    // Take screenshot of banner configuration
    await page.screenshot({ path: "test-screenshots/banner-config-main.png" });
  });
});
