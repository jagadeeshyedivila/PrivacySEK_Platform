import { test, expect } from "@playwright/test";
import { BRANDING_DEFAULT, LINKS_DEFAULT } from "../src/modules/cookies/cookieData.js";

// Branding (logo, brand name, button style, font), Links & Contact, close behaviour and
// backdrop: each setting must reach the banner and the Preference Center.
// The banner draft is saved before each test and written back after it.
const API = "http://localhost:3001/api/cookies";
// 4×2 teal PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAYAAAB/qH1jAAAAEklEQVR4nGNgYPj/H4oZGBgYAEL8A/0oxW2QAAAAAElFTkSuQmCC", "base64");

let original;

async function open(page) {
  await page.goto("/#cookies");
  await expect(page.locator(".privacysek-banner-config")).toBeVisible();
}
const section = (page, id) => page.click(`button[data-act="cc-set-builder-section"][data-arg="${id}"]`);

test.describe("Banner branding, links and behaviour", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ request }) => {
    original = (await (await request.get(`${API}/state`)).json()).draft;
  });

  test.afterEach(async ({ request }) => {
    if (!original) return;
    const { _id, ...draft } = original;
    await request.put(`${API}/banner/draft`, {
      data: {
        ...draft,
        branding: draft.branding || { ...BRANDING_DEFAULT },
        links: draft.links || { ...LINKS_DEFAULT },
        secondaryButtonStyle: draft.secondaryButtonStyle || "outline",
        config: { ...draft.config, closeAction: draft.config?.closeAction || "dismiss", backdrop: Boolean(draft.config?.backdrop) },
      },
    });
  });

  test("uploaded logo shows on the banner and in the Preference Center, and can be removed", async ({ page }) => {
    await open(page);
    await section(page, "branding");
    const chooser = page.waitForEvent("filechooser");
    await page.click('button[data-act="cc-brand-upload"]');
    await (await chooser).setFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
    await expect(page.locator(".cc-brand-thumb img")).toBeVisible();
    await expect(page.locator(".cc-banner-logo")).toBeVisible();

    await page.click('button[data-act="cc-set-preview-mode"][data-arg="preference"]');
    await expect(page.locator(".pc-header .pc-brand-logo")).toBeVisible();

    // Hide it in the Preference Center only
    await page.click('button[data-act="cc-draft-toggle"][data-arg="branding.showLogoInPreference"]');
    await expect(page.locator(".pc-header .pc-brand-logo")).toHaveCount(0);

    await page.click('button[data-act="cc-brand-logo-remove"]');
    await expect(page.locator(".cc-brand-thumb img")).toHaveCount(0);
  });

  test("theme, accent and the Reject button style reach the banner", async ({ page }) => {
    await open(page);
    await section(page, "layout");
    await page.click('button[data-act="cc-set-theme"][data-arg="dark"]');
    await expect(page.locator(".cc-rendered-banner-card")).toHaveCSS("background-color", "rgb(17, 24, 39)");
    await page.click('button[data-act="cc-set-theme"][data-arg="light"]');
    await expect(page.locator(".cc-rendered-banner-card")).toHaveCSS("background-color", "rgb(255, 255, 255)");

    await page.click('.cc-color-swatch[data-arg="#6366F1"]');
    await expect(page.locator(".cc-btn-accept")).toHaveCSS("background-color", "rgb(99, 102, 241)");

    await section(page, "branding");
    await page.click('button[data-act="cc-draft-select"][data-arg="equal"]');
    await expect(page.locator(".cc-btn-reject").first()).toHaveCSS("background-color", "rgb(99, 102, 241)");
    await page.selectOption("#cc-brand-font", "georgia");
    await expect(page.locator(".cc-banner-container")).toHaveCSS("font-family", /Georgia/);
  });

  test("links: cookie policy link, labels, new tab; USA keeps the Do Not Sell button", async ({ page }) => {
    await open(page);
    await section(page, "content");
    await expect(page.locator(".cc-banner-cookie-link")).toBeVisible();
    await page.fill("#cc-link-cookie-text", "Our Cookies");
    await expect(page.locator(".cc-banner-cookie-link")).toHaveText("Our Cookies");
    await expect(page.locator("#cc-link-cookie-text")).toBeFocused();

    await page.click('button[data-act="cc-draft-toggle"][data-arg="links.newTab"]');
    await expect(page.locator(".cc-banner-cookie-link")).not.toHaveAttribute("target", "_blank");
    await page.click('button[data-act="cc-draft-toggle"][data-arg="links.showCookiePolicy"]');
    await expect(page.locator(".cc-banner-cookie-link")).toHaveCount(0);

    // The Do Not Sell label is no longer editable; the USA banner keeps the standard wording
    await expect(page.locator("#cc-link-dns")).toHaveCount(0);
    await page.click('button[data-act="cc-set-region"][data-arg="USA"]');
    await expect(page.locator('[data-act="cc-preview-visitor-gpc"]')).toHaveText(/Do Not Sell/);
  });

  test("privacy contact appears in the Preference Center", async ({ page }) => {
    await open(page);
    await section(page, "content");
    await page.fill("#cc-link-contact-email", "dpo@example.test");
    await page.click('button[data-act="cc-set-preview-mode"][data-arg="preference"]');
    await page.click('.pc-tab[data-arg="privacy"]');
    const item = page.locator('.pc-acc-item[data-pc-item="contact"]');
    await item.locator(".pc-acc-trigger").click();
    await expect(item.locator('.pc-contact a[href="mailto:dpo@example.test"]')).toBeVisible();
  });

  test("close as reject, and the dimmed backdrop", async ({ page }) => {
    await open(page);
    await section(page, "config");
    // Works from either starting state; afterEach restores the saved draft
    const toggle = page.locator('button[data-act="cc-draft-toggle"][data-arg="config.backdrop"]');
    const wasOn = (await toggle.getAttribute("aria-checked")) === "true";
    await toggle.click();
    await expect(page.locator(".cc-banner-backdrop")).toHaveCount(wasOn ? 0 : 1);
    if (wasOn) await page.click('button[data-act="cc-draft-toggle"][data-arg="config.backdrop"]');
    await expect(page.locator(".cc-banner-backdrop")).toBeVisible();

    await page.selectOption("#cc-cfg-close-action", "reject");
    await page.click('[data-act="cc-preview-visitor-close"]');
    await expect(page.getByText("closed the banner, optional cookies off").first()).toBeVisible();
  });
});
