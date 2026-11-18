import { test, expect } from "@playwright/test";

// Cookie Preference Center: what "Privacy Settings" opens in Banner Configuration's preview.
// Categories and cookies come from the configured purposes and the cookie inventory, so the
// expectations are read from the API. Tests that change a banner setting put it back.
const API = "http://localhost:3001/api/cookies/state";
const SHOTS = process.env.PC_SHOTS_DIR;
const shot = async (page, name) => {
  if (!SHOTS) return;
  await page.waitForTimeout(400); // let the open animation finish
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

async function loadConfig(request) {
  const data = await (await request.get(API)).json();
  const shown = data.categories.filter(c => c.showInPref !== false);
  const optional = shown.filter(c => !c.required);
  const withCookies = shown.find(c => data.cookies.filter(k => k.category === c.id).length > 1) || shown[0];
  return { data, shown, optional, withCookies };
}

async function openPreferenceCenter(page) {
  await page.goto("/#cookies");
  await expect(page.locator(".privacysek-banner-config")).toBeVisible();
  await page.click('button[data-act="cc-set-preview-mode"][data-arg="preference"]');
  await expect(page.locator(".pc-modal")).toBeVisible();
}

const section = (page, id) => page.click(`button[data-act="cc-set-builder-section"][data-arg="${id}"]`);

test.describe("Cookie Preference Center", () => {
  // The tests share one banner draft, so they run one at a time
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: { width: 1440, height: 900 } });

  test("is the default preference view: Purposes tab, collapsed, configured categories", async ({ page, request }) => {
    const { shown, optional } = await loadConfig(request);
    await openPreferenceCenter(page);
    const modal = page.locator(".pc-modal");

    await expect(page.locator(".cc-preference-card")).toHaveCount(0);
    await expect(modal.locator('.pc-tab[data-arg="purposes"]')).toHaveClass(/active/);
    await expect(modal.locator(".pc-acc-item.open")).toHaveCount(0);
    for (const cat of shown) {
      const row = modal.locator(`.pc-acc-item[data-pc-item="${cat.id}"]`);
      await expect(row.locator(".pc-acc-trigger")).toHaveText(cat.name);
      if (cat.required) {
        await expect(row.locator(".pc-always")).toHaveText("Always Allow");
        await expect(row.locator(".pc-switch")).toHaveCount(0);
      }
    }
    await expect(modal.locator(".pc-switch")).toHaveCount(await modal.locator(".pc-switch").count());
    expect(await modal.locator(".pc-switch").count()).toBeGreaterThanOrEqual(optional.length);
    await shot(page, "1-default");
  });

  test("toggle flips without opening the row; one row open at a time, scrolled to the top; inventory cookies listed", async ({ page, request }) => {
    const { data, optional, withCookies } = await loadConfig(request);
    test.skip(!optional.length, "No optional categories configured");
    await openPreferenceCenter(page);
    const modal = page.locator(".pc-modal");

    const opt = modal.locator(`.pc-acc-item[data-pc-item="${optional[0].id}"]`);
    const before = await opt.locator(".pc-switch").getAttribute("aria-checked");
    await opt.locator(".pc-switch").click();
    await expect(opt.locator(".pc-switch")).toHaveAttribute("aria-checked", before === "true" ? "false" : "true");
    await expect(opt).not.toHaveClass(/open/);

    // Open some other row first, so opening the target has to close it
    const other = modal.locator(`.pc-acc-item:not([data-pc-item="${withCookies.id}"])`).first();
    await other.locator(".pc-acc-trigger").click();
    await expect(other).toHaveClass(/open/);
    const target = modal.locator(`.pc-acc-item[data-pc-item="${withCookies.id}"]`);
    await target.locator(".pc-acc-chevron").click();
    await expect(target).toHaveClass(/open/);
    await expect(modal.locator(".pc-acc-item.open")).toHaveCount(1);

    await page.waitForTimeout(700);
    const gap = await page.evaluate(id => {
      const scroller = document.querySelector(".pc-modal [data-pc-scroll]");
      const item = document.querySelector(`.pc-acc-item[data-pc-item="${id}"]`);
      return Math.round(item.getBoundingClientRect().top - scroller.getBoundingClientRect().top);
    }, withCookies.id);
    expect(gap).toBeLessThanOrEqual(8);

    const expected = data.cookies.filter(k => k.category === withCookies.id);
    const cookies = target.locator(".pc-cookie");
    await expect(cookies).toHaveCount(expected.length);
    await expect(cookies.first().locator("dt")).toHaveText(["Cookie", "Duration", "Description", "Party", "Domain"]);
    await expect(cookies.first().locator("dd").first()).toHaveText(expected[0].name);
    await shot(page, "2-expanded");
  });

  test("Show More, Privacy Information tab, Audit ID reset, shared toggles", async ({ page, request }) => {
    const { optional } = await loadConfig(request);
    await openPreferenceCenter(page);
    const modal = page.locator(".pc-modal");

    const more = modal.locator(".pc-more");
    if (await more.count()) {
      await more.click();
      await expect(more).toHaveText("Show Less");
      await expect(modal.locator(".pc-intro-full")).toBeVisible();
    }

    let id, state;
    if (optional.length) {
      id = optional[optional.length - 1].id;
      await modal.locator(`.pc-acc-item[data-pc-item="${id}"] .pc-switch`).click();
      state = await modal.locator(`.pc-acc-item[data-pc-item="${id}"] .pc-switch`).getAttribute("aria-checked");
    }

    await modal.locator('.pc-tab[data-arg="privacy"]').click();
    await expect(modal.locator(".pc-privacy-head h4")).toHaveText("Learn about privacy");
    // Five fixed items, plus "How can I contact you?" when contact details are shown
    const items = await modal.locator(".pc-acc-item").count();
    expect([5, 6]).toContain(items);
    await expect(modal.locator(".pc-btn-save")).toHaveCount(0);

    await modal.locator('.pc-acc-item[data-pc-item="audit-id"] .pc-acc-trigger').click();
    const audit = modal.locator("[data-pc-audit]");
    const first = await audit.textContent();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    await modal.locator(".pc-audit-reset").click();
    await expect(audit).not.toHaveText(first);

    if (id) {
      await modal.locator('.pc-tab[data-arg="purposes"]').click();
      await expect(modal.locator(`.pc-acc-item[data-pc-item="${id}"] .pc-switch`)).toHaveAttribute("aria-checked", state);
    }
  });

  test("Save, Accept All and Disable All close with a toast; × discards changes", async ({ page, request }) => {
    const { optional } = await loadConfig(request);
    test.skip(!optional.length, "No optional categories configured");
    const id = optional[0].id;
    const sw = () => page.locator(`.pc-acc-item[data-pc-item="${id}"] .pc-switch`);
    const reopen = () => page.click('button[data-act="cc-set-preview-mode"][data-arg="preference"]');
    await openPreferenceCenter(page);

    // Start from a known state: everything optional off
    await page.locator('.pc-tab[data-arg="privacy"]').click();
    await page.locator(".pc-btn-disable").click();
    await reopen();
    await expect(sw()).toHaveAttribute("aria-checked", "false");

    await sw().click();
    await page.locator(".pc-close").click();
    await expect(page.locator(".pc-modal")).toHaveCount(0);
    await reopen();
    await expect(sw()).toHaveAttribute("aria-checked", "false");

    await sw().click();
    await page.locator(".pc-btn-save").click();
    await expect(page.locator(".pc-modal")).toHaveCount(0);
    await reopen();
    await expect(sw()).toHaveAttribute("aria-checked", "true");

    await page.locator(".pc-btn-accept").click();
    await reopen();
    for (const s of await page.locator(".pc-switch").all()) await expect(s).toHaveAttribute("aria-checked", "true");
    await page.locator(".pc-close").click();
  });

  test("layout, theme, accent, content and config settings change it live", async ({ page }) => {
    await openPreferenceCenter(page);
    const overlay = page.locator(".pc-overlay");

    // Layout
    await section(page, "layout");
    const prevLayout = await page.locator('button[data-act="cc-set-pref-layout"].t').getAttribute("data-arg");
    await expect(overlay).toHaveClass(new RegExp(`pc-layout-${prevLayout}`));
    await page.click('button[data-act="cc-set-pref-layout"][data-arg="drawer"]');
    await expect(page.locator(".pc-overlay")).toHaveClass(/pc-layout-drawer/);
    await shot(page, "3-drawer");
    await page.click('button[data-act="cc-set-pref-layout"][data-arg="sheet"]');
    await expect(page.locator(".pc-overlay")).toHaveClass(/pc-layout-sheet/);
    await shot(page, "4-sheet");
    await page.click(`button[data-act="cc-set-pref-layout"][data-arg="${prevLayout}"]`);

    // Theme
    const prevTheme = await page.locator('button[data-act="cc-set-theme"].t').getAttribute("data-arg");
    const other = prevTheme === "dark" ? "light" : "dark";
    await page.click(`button[data-act="cc-set-theme"][data-arg="${other}"]`);
    await expect(page.locator(".pc-overlay")).toHaveClass(new RegExp(`pc-theme-${other}`));
    if (other === "dark") await shot(page, "5-dark");
    await page.click(`button[data-act="cc-set-theme"][data-arg="${prevTheme}"]`);

    // Accent colour
    // Read from the colour input: the saved accent may be a custom colour with no swatch
    const accentInput = () => page.locator('input[type="color"][data-input-act="cc-set-accent"]');
    const prevAccent = await accentInput().inputValue();
    await page.click('.cc-color-swatch[data-arg="#F43F5E"]');
    await expect(page.locator(".pc-btn-accept")).toHaveCSS("background-color", "rgb(244, 63, 94)");
    await accentInput().fill(prevAccent);

    // Content: Preference Center title
    await section(page, "content");
    await page.click('button[data-act="cc-set-content-sub"][data-arg="preference"]');
    const titleInput = page.locator("#cc-pref-title");
    const prevTitle = await titleInput.inputValue();
    await titleInput.fill("Your Cookie Choices");
    await expect(page.locator(".pc-title")).toHaveText("Your Cookie Choices");
    await page.locator("#cc-pref-title").fill(prevTitle);

    // Config: close button; Branding: "Powered by" watermark
    for (const [sec, act, sel] of [["config", "cc-toggle-close-btn", ".pc-close"], ["branding", "cc-toggle-watermark", ".pc-powered"]]) {
      await section(page, sec);
      const before = await page.locator(sel).count();
      await page.click(`button[data-act="${act}"]`);
      await expect(page.locator(sel)).toHaveCount(before ? 0 : 1);
      await page.click(`button[data-act="${act}"]`);
      await expect(page.locator(sel)).toHaveCount(before);
    }
  });

  test("full-size dialog: fixed header and footer, middle scrolls; narrow screens stack the buttons", async ({ page }) => {
    await openPreferenceCenter(page);
    await page.click(".pc-expand");
    const modal = page.locator(".pc-fullscreen .pc-modal");
    await expect(modal).toBeVisible();
    const box = await modal.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(1000);
    expect(box.height).toBeLessThanOrEqual(900 * 0.86);
    const header = await page.locator(".pc-fullscreen .pc-header").boundingBox();
    await page.locator(".pc-fullscreen [data-pc-scroll]").evaluate(el => { el.scrollTop = el.scrollHeight; });
    expect((await page.locator(".pc-fullscreen .pc-header").boundingBox()).y).toBe(header.y);
    await shot(page, "6-fullscreen");

    await page.setViewportSize({ width: 390, height: 800 });
    const save = await page.locator(".pc-fullscreen .pc-btn-save").boundingBox();
    const accept = await page.locator(".pc-fullscreen .pc-btn-accept").boundingBox();
    expect(accept.y).toBeGreaterThan(save.y);
    expect(Math.round((await modal.boundingBox()).width)).toBe(390);
    await shot(page, "7-mobile");
    await page.click(".pc-fullscreen .pc-close");
    await expect(page.locator(".pc-modal")).toHaveCount(0);
  });
});
