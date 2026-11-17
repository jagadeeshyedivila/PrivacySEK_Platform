import { test, expect } from "@playwright/test";

// DPDP children's data and withdrawal (P0): Guardian & Child Consent, child-directed cookie
// banner, Purpose Guard restrictions, guardian-filed rights requests, withdrawal propagation.
// Tests that change data reset the module first so they start from the demo seed.
const STORE = "http://localhost:3001/api/store";

test.describe.configure({ mode: "serial" });

async function openConsentTab(page, label) {
  await page.goto("/#consent");
  await page.click(`button.cp-top-nav-btn:has-text("${label}")`);
}

test.describe("Children's data and withdrawal (DPDP s.6, s.9)", () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${STORE}/consent/reset`).catch(() => {});
    await request.post(`${STORE}/rights/reset`).catch(() => {});
  });

  test("Guardian & Child tab: KPIs, simulation notice, queue and relationships", async ({ page }) => {
    await openConsentTab(page, "Guardian & Child");
    await expect(page.locator(".cp-header-title")).toContainText("Guardian & Child Consent");
    await expect(page.locator(".sim-notice").first()).toContainText("not legal verification");
    await expect(page.locator(".cp-gd-kpis .kpi")).toHaveCount(6);
    await expect(page.locator(".cp-gd-table tbody tr")).toHaveCount(12);

    await page.selectOption('select[data-act="cp-gd-filter-status"]', "verified");
    await expect(page.locator(".cp-gd-table tbody tr")).toHaveCount(6);
    await page.selectOption('select[data-act="cp-gd-filter-status"]', "");

    await page.click('button[data-act="cp-gd-view"][data-arg="relationships"]');
    await expect(page.locator(".cp-gd-table tbody tr")).toHaveCount(6);
    await expect(page.locator(".cp-gd-table")).toContainText("Lawful guardian (PwD)");
  });

  test("An adult guardian can be verified and linked; rejecting needs a reason", async ({ page }) => {
    await openConsentTab(page, "Guardian & Child");

    // Pending request: choose a method, run the simulated check, approve
    await page.click('a[data-act="cp-gd-open"][data-arg="VPC-2026-0145"]');
    const drawer = page.locator(".drawer");
    await expect(drawer).toContainText("not legal verification");
    await drawer.locator('input[value="virtual_token"]').check();
    await drawer.locator('button[data-act="cp-gd-run"]').click();
    await expect(page.locator(".drawer .cp-gd-check")).toHaveCount(2);
    await page.locator('.drawer button[data-act="cp-gd-approve"]').click();
    await expect(page.locator(".toast")).toContainText("Guardian verified");
    await page.click('button[data-act="cp-gd-view"][data-arg="relationships"]');
    await expect(page.locator(".cp-gd-table tbody tr")).toHaveCount(7);

    // Reject needs a reason
    await page.click('button[data-act="cp-gd-view"][data-arg="queue"]');
    await page.click('a[data-act="cp-gd-open"][data-arg="VPC-2026-0136"]');
    await page.locator('.drawer button[data-act="cp-gd-reject"]').click();
    await expect(page.locator("#cp-gd-err")).toContainText("reason is required");
  });

  test("Withdrawal shows its impact, then propagates and blocks further use", async ({ page }) => {
    await openConsentTab(page, "Consent Records");
    await page.fill('input[data-input-act="cp-records-search"]', "CR-5001");
    await page.click('a[data-act="cp-view-record"][data-arg="CR-5001"]');
    const withdraw = page.locator('button[data-act="cp-open-withdraw"]');
    if (await withdraw.count() === 0) test.skip(true, "CR-5001 is already withdrawn in this seed");
    await withdraw.click();
    await page.click('button[data-act="cp-wd-impact"]');
    await expect(page.locator(".modal")).toContainText("Systems and processors told to stop");
    await expect(page.locator(".modal")).toContainText("Partner NBFC (co-lending)");
    await page.click('button[data-act="cp-confirm-withdraw"]');
    await expect(page.locator(".toast")).toContainText("Consent withdrawn");

    await page.click('a[data-act="cp-prop-open"]');
    await expect(page.locator(".drawer")).toContainText("Withdrawal propagation");
    await expect(page.locator(".drawer")).toContainText("Failed", { timeout: 4000 });
    await expect(page.locator(".drawer")).not.toContainText("Children's Data");
    await page.keyboard.press("Escape");

    await page.goto("/#guard");
    await page.click('button[data-act="tab"][data-arg="guard|restrict"]');
    await expect(page.locator("body")).toContainText("Children: no tracking, profiling or targeted ads");
    await expect(page.locator("body")).toContainText("CR-5001");
  });

  test("Child-directed cookie banner stores Necessary only", async ({ page }) => {
    await page.goto("/#cookies");
    await page.click('button[data-act="cc-set-builder-section"][data-arg="purposes"]');
    await expect(page.locator(".cc-child-mode")).toContainText("Child-directed mode");
    // Switch preview to India, then to a child visitor
    await page.click('[data-act="cc-set-region"][data-arg="India"]');
    await page.click('button[data-act="cc-preview-age"][data-arg="child"]');
    await expect(page.locator(".cc-child-banner")).toContainText("Child view");
    await page.click('.cc-child-banner button[data-act="cc-preview-visitor-accept"]');
    await expect(page.locator(".toast")).toContainText("only Necessary");
  });

  test("Guardian-filed rights request cannot start until the guardian is verified", async ({ page }) => {
    await page.goto("/#rights");
    await page.click('button.rr-top-nav-btn:has-text("Requests")');
    await page.fill('input[data-input-act="rr-req-search"]', "DSR-2026-0491");
    await page.click('button[data-act="rr-open-request"][data-arg="DSR-2026-0491"]');
    await expect(page.locator(".rr-guardian")).toContainText("Filed by a guardian");
    await expect(page.locator(".rr-clock")).toContainText("Internal SLA");
    await page.click('button[data-act="rr-advance"][data-arg="In Progress"]');
    await expect(page.locator(".toast")).toContainText("Verify the guardian");
    await page.click('button[data-act="rr-gd-verify"]');
    await expect(page.locator(".rr-guardian")).toContainText("Requester verified");
    await page.click('button[data-act="rr-advance"][data-arg="In Progress"]');
    await expect(page.locator(".rr-step.cur")).toContainText("In Progress");
  });
});
