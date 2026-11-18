import { test, expect } from "@playwright/test";

// Banner preview: full-size view (like the Preference Center's) and the visitor's language
// picker inside the banner and the Preference Center instead of the preview header.
// Neither changes stored data: the preview language is not saved by itself.

async function open(page) {
  await page.goto("/#cookies");
  await expect(page.locator(".privacysek-banner-config")).toBeVisible();
  await page.click('button[data-act="cc-set-preview-mode"][data-arg="banner"]');
  await expect(page.locator(".cc-browser-viewport .cc-rendered-banner-card")).toBeVisible();
}

test.describe("Banner preview: full size and language", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: { width: 1440, height: 900 } });

  test("language picker sits in the banner and the Preference Center, not the preview header", async ({ page }) => {
    await open(page);
    await expect(page.locator('.cc-preview-header [data-act="cc-change-preview-lang"]')).toHaveCount(0);

    const picker = page.locator('.cc-banner-lang select[data-act="cc-change-preview-lang"]');
    const options = await picker.locator("option").count();
    test.skip(options < 2, "Fewer than two languages enabled");
    const second = await picker.locator("option").nth(1).getAttribute("value");
    await picker.selectOption(second);
    await expect(page.locator('.cc-banner-lang select[data-act="cc-change-preview-lang"]')).toHaveValue(second);

    await page.click('button[data-act="cc-set-preview-mode"][data-arg="preference"]');
    await expect(page.locator('.pc-header .pc-lang select')).toHaveValue(second);

    // Back to the first language so the preview reads as before
    const first = await page.locator(".pc-header .pc-lang select option").first().getAttribute("value");
    await page.locator(".pc-header .pc-lang select").selectOption(first);
    await page.locator(".pc-close").click();
  });

  test("banner opens full size over a mock page; Privacy Settings opens the full-size Preference Center and closing returns", async ({ page }) => {
    await open(page);
    await page.click('.cc-browser-viewport [data-act="cc-banner-fullscreen"][data-arg="on"]');
    const stage = page.locator(".cc-bn-stage");
    await expect(stage).toBeVisible();
    await expect(stage.locator(".cc-rendered-banner-card")).toBeVisible();
    await expect(page.locator(".cc-browser-viewport .cc-rendered-banner-card")).toHaveCount(0);
    const box = await stage.boundingBox();
    expect(Math.round(box.width)).toBe(1440);
    expect(Math.round(box.height)).toBe(900);

    await stage.locator('[data-act="cc-set-preview-mode"][data-arg="preference"]').first().click();
    await expect(page.locator(".pc-overlay.pc-fullscreen")).toBeVisible();
    await expect(page.locator(".cc-bn-stage")).toHaveCount(0);

    await page.locator(".pc-fullscreen .pc-close").click();
    await expect(page.locator(".cc-bn-stage .cc-rendered-banner-card")).toBeVisible();

    await page.click(".cc-bn-stage-exit");
    await expect(page.locator(".cc-bn-stage")).toHaveCount(0);
    await expect(page.locator(".cc-browser-viewport .cc-rendered-banner-card")).toBeVisible();
  });

  test("a choice closes the banner; the badge reopens the Preference Center; replay shows the banner", async ({ page }) => {
    await open(page);
    // Badge on for this test (Config switch mirrors Display Frequency); put back at the end
    await page.click('button[data-act="cc-set-builder-section"][data-arg="config"]');
    const configSwitch = page.locator('.cc-config-editor-pane button[data-act="cc-toggle-badge-show"]');
    const badgeWasOn = (await configSwitch.getAttribute("aria-checked")) === "true";
    if (!badgeWasOn) await configSwitch.click();
    await expect(page.locator('.cc-config-editor-pane button[data-act="cc-toggle-badge-show"]')).toHaveAttribute("aria-checked", "true");
    try {
      const viewport = page.locator(".cc-browser-viewport");
      await expect(viewport.locator(".cc-floating-badge")).toHaveCount(0); // not before a choice

      await viewport.locator('[data-act="cc-preview-visitor-accept"]').click();
      await expect(viewport.locator(".cc-rendered-banner-card")).toHaveCount(0);
      await expect(viewport.locator(".cc-floating-badge")).toBeVisible();
      await expect(viewport.locator(".cc-sim-replay")).toBeVisible();

      // Badge → Preference Center; × → nothing reopens (the choice was already made)
      await viewport.locator(".cc-floating-badge").click();
      await expect(page.locator(".pc-overlay")).toBeVisible();
      await page.locator(".pc-close").click();
      await expect(viewport.locator(".cc-rendered-banner-card")).toHaveCount(0);
      await expect(viewport.locator(".cc-floating-badge")).toBeVisible();

      // Saving from the badge-opened Preference Center also leaves the banner closed
      await viewport.locator(".cc-floating-badge").click();
      await page.locator(".pc-btn-save").click();
      await expect(page.locator(".pc-overlay")).toHaveCount(0);
      await expect(viewport.locator(".cc-rendered-banner-card")).toHaveCount(0);

      // Replay the first visit
      await viewport.locator(".cc-sim-replay").click();
      await expect(viewport.locator(".cc-rendered-banner-card")).toBeVisible();
      await expect(viewport.locator(".cc-floating-badge")).toHaveCount(0);

      // From the banner: Privacy Settings, then × returns to the banner (no choice yet)
      await viewport.locator('.cc-rendered-banner-card [data-act="cc-set-preview-mode"][data-arg="preference"]').click();
      await page.locator(".pc-close").click();
      await expect(viewport.locator(".cc-rendered-banner-card")).toBeVisible();
    } finally {
      if (!badgeWasOn) await page.click('.cc-config-editor-pane button[data-act="cc-toggle-badge-show"]');
    }
  });

  test("full size shows a larger banner, and choices there close it too", async ({ page }) => {
    await open(page);
    await page.click('.cc-browser-viewport [data-act="cc-banner-fullscreen"][data-arg="on"]');
    const card = page.locator(".cc-bn-stage .cc-rendered-banner-card");
    await expect(card).toBeVisible();
    const zoom = await card.evaluate(el => parseFloat(getComputedStyle(el).zoom));
    expect(zoom).toBeGreaterThanOrEqual(1.3);

    await page.locator('.cc-bn-stage [data-act="cc-preview-visitor-reject"]').click();
    await expect(page.locator(".cc-bn-stage .cc-rendered-banner-card")).toHaveCount(0);
    await expect(page.locator(".cc-bn-stage .cc-sim-replay")).toBeVisible();
    await page.locator(".cc-bn-stage .cc-sim-replay").click();
    await expect(page.locator(".cc-bn-stage .cc-rendered-banner-card")).toBeVisible();
    await page.click(".cc-bn-stage-exit");
  });

  test("Escape leaves full size, and the zoom button toggles back", async ({ page }) => {
    await open(page);
    await page.click('.cc-browser-viewport [data-act="cc-banner-fullscreen"][data-arg="on"]');
    await expect(page.locator(".cc-bn-stage")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".cc-bn-stage")).toHaveCount(0);

    await page.click('.cc-browser-viewport [data-act="cc-banner-fullscreen"][data-arg="on"]');
    await page.click('.cc-bn-stage .cc-banner-zoom-btn[data-arg="off"]');
    await expect(page.locator(".cc-bn-stage")).toHaveCount(0);
  });
});
