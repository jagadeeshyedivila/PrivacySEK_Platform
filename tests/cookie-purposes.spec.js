import { test, expect } from "@playwright/test";
import { normalizePurpose } from "../src/modules/cookies/purposeModel.js";

// Cookie purposes in Banner Configuration → Purposes and the Manage Purposes table.
// Purposes are switched on/off, not deleted. Tests put back what they change through the API.
const API = "http://localhost:3001/api/cookies";

async function purposes(request) {
  return (await (await request.get(`${API}/categories`)).json());
}

async function openPurposes(page) {
  await page.goto("/#cookies");
  await expect(page.locator(".privacysek-banner-config")).toBeVisible();
  await page.click('button[data-act="cc-set-builder-section"][data-arg="purposes"]');
  await expect(page.locator(".cc-pm-list")).toBeVisible();
}

const openPreference = page => page.click('button[data-act="cc-set-preview-mode"][data-arg="preference"]');

test.describe("Cookie purposes", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Purposes section lists every purpose with a switch and Edit, and no delete", async ({ page, request }) => {
    const list = await purposes(request);
    await openPurposes(page);
    await expect(page.locator(".cc-pm-list-row")).toHaveCount(list.length);
    await expect(page.locator('[data-act="cc-category-delete"]')).toHaveCount(0);
    for (const p of list) {
      const row = page.locator(`.cc-pm-list-row[data-purpose="${p.id}"]`);
      await expect(row.locator(".cc-pm-list-name strong")).toHaveText(p.name);
      const sw = row.locator(".switch");
      if (p.required) await expect(sw).toBeDisabled();
      else await expect(sw).toHaveAttribute("aria-checked", String(p.showInPref !== false));
    }
  });

  test("Manage Purposes table: search, count, columns", async ({ page, request }) => {
    const list = await purposes(request);
    await openPurposes(page);
    await page.click('button[data-act="cc-purposes-manage"]');
    const modal = page.locator(".modal.cc-pm-modal");
    await expect(modal).toBeVisible();
    await expect(modal.locator("thead th")).toHaveText(["Purpose", "Consent model", "Legal basis", "Cookies", "Status", "Last updated", "Actions"]);
    await expect(modal.locator("tbody tr[data-purpose]")).toHaveCount(list.length);
    await expect(modal.locator(".cc-pm-count")).toHaveText(`${list.length} purpose${list.length === 1 ? "" : "s"}`);

    const target = list[list.length - 1];
    await modal.locator("#cc-pm-search").fill(target.name.slice(0, 5));
    await expect(page.locator(".modal.cc-pm-modal tbody tr[data-purpose]").first()).toBeVisible();
    await expect(page.locator(`.modal.cc-pm-modal tbody tr[data-purpose="${target.id}"]`)).toBeVisible();
    await page.locator("#cc-pm-search").fill("zzz-no-such-purpose");
    await expect(page.locator(".modal.cc-pm-modal .cc-pm-empty")).toBeVisible();
    await page.locator("#cc-pm-search").fill("");
    await page.click('.modal.cc-pm-modal [data-act="close"]');
  });

  test("switching a purpose off hides it in the Preference Center; on shows it again", async ({ page, request }) => {
    const optional = (await purposes(request)).find(p => !p.required && p.showInPref !== false && !(p.regions || []).length);
    test.skip(!optional, "No visible optional purpose");
    await openPurposes(page);
    await openPreference(page);
    const row = () => page.locator(`.pc-acc-item[data-pc-item="${optional.id}"]`);
    await expect(row()).toHaveCount(1);

    const sw = () => page.locator(`.cc-pm-list-row[data-purpose="${optional.id}"] .switch`);
    await sw().click();
    await expect(sw()).toHaveAttribute("aria-checked", "false");
    await expect(row()).toHaveCount(0);
    expect((await purposes(request)).find(p => p.id === optional.id).showInPref).toBe(false);

    await sw().click();
    await expect(sw()).toHaveAttribute("aria-checked", "true");
    await expect(row()).toHaveCount(1);
    expect((await purposes(request)).find(p => p.id === optional.id).showInPref).toBe(true);
  });

  test("form shows only name, ID, description, consent model, legal basis and visibility; saving keeps the other stored fields", async ({ page, request }) => {
    const optional = (await purposes(request)).find(p => !p.required);
    test.skip(!optional, "No optional purpose");
    // Effective values (stored, or the defaults for fields never stored), so the restore never blanks them
    const effective = normalizePurpose(optional);
    const original = { description: optional.description, googleSignals: effective.googleSignals, saleOrShare: effective.saleOrShare };
    // Marker values the form cannot edit
    await request.put(`${API}/categories/${optional.id}`, { data: { googleSignals: ["analytics_storage", "ad_storage"], saleOrShare: true } });
    try {
      await openPurposes(page);
      await expect(page.locator(".cc-pm-list-meta")).toHaveCount(0);
      await page.click(`.cc-pm-list-row[data-purpose="${optional.id}"] [data-act="cc-category-edit"]`);
      const form = page.locator(".modal.cc-pm-form-modal");
      for (const sel of ["#cc-pf-data", 'input[name="cc-pf-region"]', 'input[name="cc-pf-signal"]', 'input[name="cc-pf-iab"]', "#cc-pf-sale"]) {
        await expect(form.locator(sel)).toHaveCount(0);
      }
      await form.locator("#cc-pf-desc").fill("Edited by the purposes test.");
      await form.locator('[data-act="cc-purpose-save"]').click();
      await expect(form).toHaveCount(0);

      const saved = (await purposes(request)).find(p => p.id === optional.id);
      expect(saved.description).toBe("Edited by the purposes test.");
      expect(saved.googleSignals).toEqual(["analytics_storage", "ad_storage"]);
      expect(saved.saleOrShare).toBe(true);
    } finally {
      await request.put(`${API}/categories/${optional.id}`, { data: original });
    }
  });

  test("an Always Active purpose's consent model can be changed", async ({ page, request }) => {
    const required = (await purposes(request)).find(p => p.required);
    test.skip(!required, "No Always Active purpose");
    await openPurposes(page);
    await page.click(`.cc-pm-list-row[data-purpose="${required.id}"] [data-act="cc-category-edit"]`);
    const form = page.locator(".modal.cc-pm-form-modal");
    const model = form.locator("#cc-pf-model");
    const basis = form.locator("#cc-pf-basis");
    await expect(model).toBeEnabled();
    await expect(basis).toBeEnabled();
    await expect(form.locator("#cc-pf-shown")).toBeDisabled();
    await expect(form.locator("#cc-pf-model-warn")).toBeHidden();

    await model.selectOption("opt_in");
    await expect(basis).toHaveValue("consent");
    await expect(form.locator("#cc-pf-model-warn")).toBeVisible();
    await expect(form.locator("#cc-pf-shown")).toBeEnabled();

    await model.selectOption("always_active");
    await expect(basis).toHaveValue("strictly_necessary");
    await expect(form.locator("#cc-pf-shown")).toBeDisabled();
    await expect(form.locator("#cc-pf-shown")).toBeChecked();
    await form.locator('[data-act="close"]').first().click(); // Cancel: the purpose is left as it was
  });

  test("changing Always Active to Opt-in is saved", async ({ page, request }) => {
    // Round trip on a throwaway purpose, removed afterwards
    const id = `test_always_${Date.now()}`;
    try {
      await request.post(`${API}/categories`, { data: { id, name: "Test Always", description: "Test", required: true, defaultState: true, showInPref: true } });
      await openPurposes(page);
      await page.click(`.cc-pm-list-row[data-purpose="${id}"] [data-act="cc-category-edit"]`);
      await page.locator("#cc-pf-model").selectOption("opt_in");
      await page.click('.modal.cc-pm-form-modal [data-act="cc-purpose-save"]');
      await expect(page.locator(".modal.cc-pm-form-modal")).toHaveCount(0);
      const saved = (await purposes(request)).find(p => p.id === id);
      expect(saved.required).toBe(false);
      expect(saved.defaultState).toBe(false);
      expect(saved.legalBasis).toBe("consent");
      await expect(page.locator(`.cc-pm-list-row[data-purpose="${id}"] .switch`)).toBeEnabled();
    } finally {
      // The server refuses to delete an Always Active purpose, so make it optional first
      await request.put(`${API}/categories/${id}`, { data: { required: false } });
      await request.delete(`${API}/categories/${id}`);
    }
  });

  test("validation, and adding a purpose", async ({ page, request }) => {
    const id = `test_purpose_${Date.now()}`;
    try {
      await openPurposes(page);
      await page.click('.cc-pm-list [data-act="cc-category-new"], button[data-act="cc-category-new"]');
      const form = page.locator(".modal.cc-pm-form-modal");
      await expect(form).toBeVisible();

      // Strictly necessary needs Always Active
      await form.locator("#cc-pf-name").fill("Test Purpose");
      await form.locator("#cc-pf-desc").fill("Used only by the automated tests.");
      await form.locator("#cc-pf-model").selectOption("opt_in");
      await form.locator("#cc-pf-basis").selectOption("strictly_necessary");
      await form.locator('[data-act="cc-purpose-save"]').click();
      await expect(page.getByText("Strictly necessary purposes must be Always Active").first()).toBeVisible();

      await form.locator("#cc-pf-basis").selectOption("consent");
      await form.locator("#cc-pf-id").fill(id);
      await form.locator('[data-act="cc-purpose-save"]').click();
      await expect(form).toHaveCount(0);
      await expect(page.locator(`.cc-pm-list-row[data-purpose="${id}"]`)).toBeVisible();
      expect((await purposes(request)).some(p => p.id === id)).toBe(true);

      await openPreference(page);
      await expect(page.locator(`.pc-acc-item[data-pc-item="${id}"]`)).toHaveCount(1);
    } finally {
      await request.delete(`${API}/categories/${id}`);
    }
  });
});
