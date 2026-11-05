import { test, expect } from "@playwright/test";

// DPIA module. Tests create their own assessments and templates and delete them afterwards,
// and never use "Reset demo data", so existing data is left alone.
test.describe("DPIA module", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#assess");
    await page.evaluate(() => sessionStorage.removeItem("dpia_current_user_v1"));
    await page.reload();
    await expect(page.locator(".dp-top-nav")).toBeVisible();
  });

  const tab = (page, name) => page.locator(".dp-top-nav-btn", { hasText: name });
  const uid = () => Math.random().toString(36).slice(2, 7);
  const modal = page => page.locator(".modal");

  // Answers every required question in the open section
  async function answerRequired(page) {
    const qs = page.locator(".dp-q").filter({ has: page.locator(".dp-req") });
    const n = await qs.count();
    for (let i = 0; i < n; i++) {
      const q = qs.nth(i);
      if (await q.locator(".dp-yn").count()) { await q.locator('input[value="No"]').check(); continue; }
      if (await q.locator("select").count()) { await q.locator("select").selectOption({ index: 1 }); continue; }
      if (await q.locator('input[type="checkbox"]').count()) { await q.locator('input[type="checkbox"]').first().check(); continue; }
      if (await q.locator('input[type="date"]').count()) { await q.locator('input[type="date"]').fill("2027-01-15"); continue; }
      await q.locator("input, textarea").first().fill("Answered by the end-to-end test.");
    }
  }

  test("all tabs render, and the module is named DPIA in the sidebar", async ({ page }) => {
    await expect(page.locator('.nav button[data-go="assess"]')).toContainText("DPIA");
    await expect(page.locator(".dp-kpi").first()).toBeVisible();
    await tab(page, "Assessments").click();
    await expect(page.locator("#dp-assessments-table tbody tr").first()).toBeVisible();
    await tab(page, "Templates").click();
    await expect(page.locator(".dp-tpl").first()).toBeVisible();
    await tab(page, "Risk register").click();
    await expect(page.locator("#dp-risks-table tbody tr").first()).toBeVisible();
    await tab(page, "Tasks").click();
    await expect(page.locator("#dp-tasks-list li").first()).toBeVisible();
    await tab(page, "Guide").click();
    await expect(page.locator(".dp-flow")).toBeVisible();
  });

  test("an assessment runs from sending to approval, through a returned review", async ({ page }) => {
    const name = `PW DPIA ${uid()}`;
    await tab(page, "Assessments").click();
    await page.locator('button[data-act="dp-new-assessment"]').first().click();
    await modal(page).locator('button[data-act="dp-save-assessment"]').click();
    await expect(page.locator("#dp-na-err")).toContainText("name");
    await page.locator("#dp-na-name").fill(name);
    await page.locator("#dp-na-tpl").selectOption("tpl-legit");
    await page.locator("#dp-na-who").selectOption("Meera Iyer");
    await modal(page).locator('button[data-act="dp-save-assessment"]').click();
    await expect(page.locator(".dp-detail-title h2")).toHaveText(name);
    await expect(page.locator(".dp-detail-sub")).toContainText("Not started");

    // Submitting with required answers missing lists them
    await page.locator('.dp-head-actions button[data-act="dp-submit"]').click();
    await expect(modal(page)).toContainText("Answer the required questions first");
    await modal(page).locator('button[data-act="dp-jump"]').first().click();

    // Answer every section; the first answer starts the assessment
    const sections = await page.locator('.dp-steps button[data-act="dp-step"]').count() - 2;
    for (let s = 0; s < sections; s++) {
      await page.locator(`.dp-steps button[data-arg="${s}"]`).click();
      await answerRequired(page);
    }
    await expect(page.locator(".dp-detail-sub")).toContainText("In progress");

    // A risk with a mitigation, which also creates a task
    await page.locator('.dp-steps button[data-arg="risks"]').click();
    await page.locator('button[data-act="dp-risk-add"]').first().click();
    await page.locator("#dp-rk-title").fill("Test risk");
    await page.locator("#dp-rk-l").selectOption("3");
    await page.locator("#dp-rk-i").selectOption("3");
    await page.locator("#dp-rk-rl").selectOption("4");
    await page.locator("#dp-rk-ri").selectOption("4");
    await modal(page).locator('button[data-act="dp-risk-save"]').click();
    await expect(page.locator("#dp-rk-err")).toContainText("cannot be higher");
    await page.locator("#dp-rk-rl").selectOption("1");
    await page.locator("#dp-rk-ri").selectOption("2");
    await page.locator("#dp-rk-mit").fill("Test mitigation");
    await modal(page).locator('button[data-act="dp-risk-save"]').click();
    await expect(page.locator(".dp-risk")).toContainText("Test risk");

    // Submit, have it returned, resubmit, approve
    await page.locator('.dp-head-actions button[data-act="dp-submit"]').click();
    await modal(page).locator('button[data-act="dp-confirm-submit"]').click();
    await expect(page.locator(".dp-detail-sub")).toContainText("Under review");
    await page.locator('.dp-steps button[data-arg="0"]').click();
    await expect(page.locator(".dp-q textarea, .dp-q input").first()).toBeDisabled();

    await page.locator('.dp-head-actions button[data-act="dp-request-changes"]').click();
    await modal(page).locator('button[data-act="dp-confirm-changes"]').click();
    await expect(page.locator("#dp-rc-err")).toBeVisible();
    await page.locator("#dp-rc-note").fill("Please add more detail.");
    await modal(page).locator('button[data-act="dp-confirm-changes"]').click();
    await expect(page.locator(".dp-banner.is-risk")).toContainText("Please add more detail.");

    await page.locator('.dp-head-actions button[data-act="dp-submit"]').click();
    await modal(page).locator('button[data-act="dp-confirm-submit"]').click();
    await page.locator('.dp-head-actions button[data-act="dp-approve"]').click();
    await modal(page).locator('button[data-act="dp-confirm-approve"]').click();
    await expect(page.locator(".dp-detail-sub")).toContainText("Approved");
    await page.locator('.dp-steps button[data-arg="summary"]').click();
    await expect(page.locator(".dp-timeline")).toContainText("Requested changes: Please add more detail.");

    // Clean up
    await page.locator('.dp-head-actions button[data-act="dp-delete"]').click();
    await modal(page).locator('button[data-act="dp-confirm-delete"]').click();
    await expect(page.locator("#dp-assessments-table")).not.toContainText(name);
  });

  test("assessors answer only their own assessments; auditors are read-only", async ({ page }) => {
    await page.locator('button[data-act="dp-user-menu"]').click();
    await page.locator('button[data-act="dp-switch-user"][data-arg="d2"]').click();
    await expect(page.locator(".dp-role-tag")).toHaveText("Assessor");
    await tab(page, "Assessments").click();
    await expect(page.locator('button[data-act="dp-new-assessment"]')).toBeDisabled();
    await page.locator("#dp-a-search").fill("New CRM rollout");
    await page.locator('.dp-link[data-act="dp-open"]', { hasText: "New CRM rollout" }).click();
    await expect(page.locator(".dp-banner")).toContainText("Only Kavya Menon or the DPO");
    await expect(page.locator(".dp-q textarea, .dp-q input").first()).toBeDisabled();

    await page.locator('button[data-act="dp-user-menu"]').click();
    await page.locator('button[data-act="dp-switch-user"][data-arg="d3"]').click();
    await expect(page.locator(".dp-banner.is-warn")).toContainText("Read-only");
    await tab(page, "Templates").click();
    await expect(page.locator(".dp-empty-card")).toContainText("Access restricted");

    await page.locator('button[data-act="dp-user-menu"]').click();
    await page.locator('button[data-act="dp-switch-user"][data-arg="d1"]').click();
    await expect(page.locator(".dp-role-tag")).toHaveText("DPO");
  });

  test("template builder checks before publishing and asks before discarding changes", async ({ page }) => {
    const title = `PW Template ${uid()}`;
    await tab(page, "Templates").click();
    await page.locator('button[data-act="dp-t-new"]').click();
    await modal(page).locator('button[data-act="dp-t-create"]').click();
    await expect(page.locator("#dp-t-title")).toBeVisible();

    await page.locator('button[data-act="dp-t-publish"]').click();
    await expect(modal(page)).toContainText("Fix these before publishing");
    await modal(page).locator('.drawer-f button[data-act="close"]').click();

    await page.locator("#dp-t-title").fill(title);
    await page.locator("#dp-t-desc").fill("Created by the end-to-end test.");
    await page.locator("#dp-bs-0").fill("Basics");
    await page.locator("#dp-b-0-0").fill("Which team owns the processing?");
    await page.locator('select[data-act="dp-t-qtype"]').first().selectOption("Single choice");
    await page.locator("#dp-b-0-0-o0").fill("Risk");
    await page.locator('button[data-act="dp-t-publish"]').click();
    await expect(modal(page)).toContainText("at least two options");
    await modal(page).locator('.drawer-f button[data-act="close"]').click();
    await page.locator("#dp-b-0-0-o1").fill("IT");
    await expect(page.locator(".dp-dirty")).toBeVisible();

    // Preview shows the question as assessors see it
    await page.locator('button[data-act="dp-t-mode"][data-arg="preview"]').click();
    await expect(page.locator(".dp-q")).toContainText("Which team owns the processing?");
    await page.locator('button[data-act="dp-t-mode"][data-arg="edit"]').click();

    await page.locator('button[data-act="dp-t-publish"]').click();
    await modal(page).locator('button[data-act="dp-t-confirm-publish"]').click();
    await expect(page.locator(".dp-detail-sub")).toContainText("Published");

    // Editing and leaving asks first
    await page.locator("#dp-t-title").fill(`${title} edited`);
    await tab(page, "Assessments").click();
    await expect(modal(page)).toContainText("Save your changes?");
    await modal(page).locator('button[data-act="dp-leave-discard"]').click();
    await tab(page, "Templates").click();
    const card = page.locator(".dp-tpl", { hasText: title });
    await expect(card.locator("h3")).toHaveText(title);

    await card.locator('button[data-act="dp-t-delete"]').click();
    await modal(page).locator('button[data-act="dp-t-confirm-delete"]').click();
    await expect(page.locator(".dp-tpl", { hasText: title })).toHaveCount(0);
  });

  test("the dashboard offers a DPIA for Data Map activities without one", async ({ page }) => {
    const start = page.locator('.dp-gaps button[data-act="dp-new-assessment"]').first();
    test.skip(!(await start.count()), "Every Data Map activity already has an assessment");
    await start.click();
    await expect(page.locator("#dp-na-act")).not.toHaveValue("");
    await expect(page.locator("#dp-na-name")).not.toHaveValue("");
    await modal(page).locator('.drawer-f button[data-act="close"]').click();
  });

  test("risk register filters by level and exports CSV", async ({ page }) => {
    await tab(page, "Risk register").click();
    await page.locator('.dp-chip[data-arg="Low"]').click();
    const rows = page.locator("#dp-risks-table tbody tr");
    await expect(rows.first()).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator('button[data-act="dp-risks-csv"]').click()]);
    expect(download.suggestedFilename()).toMatch(/^dpia-risk-register-.*\.csv$/);
  });
});
