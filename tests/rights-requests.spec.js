import { test, expect } from "@playwright/test";

// Rights Requests (DSAR) module. Tests clean up the records they create and never use
// "Reset demo data", so they leave existing data alone.
test.describe("Rights Requests module", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/#rights");
    await expect(page.locator(".rr-top-nav")).toBeVisible();
    // Start every test as the DPO, who can edit
    await page.evaluate(() => sessionStorage.removeItem("rr_current_user_v1"));
  });

  const tab = (page, name) => page.locator(".rr-top-nav-btn", { hasText: name });

  test("all six tabs render", async ({ page }) => {
    await tab(page, "Dashboard").click();
    await expect(page.locator(".rr-kpi", { hasText: "Received" })).toBeVisible();
    await expect(page.locator(".rr-chart")).toBeVisible();
    await expect(page.locator(".rr-hbar").first()).toBeVisible();

    await tab(page, "Requests").click();
    await expect(page.locator("#rr-requests-table tbody tr").first()).toBeVisible();

    await tab(page, "Web Forms").click();
    await expect(page.locator(".rr-form-card").first()).toBeVisible();

    await tab(page, "Workflows").click();
    await expect(page.locator("#rr-workflows-table tbody tr").first()).toBeVisible();

    await tab(page, "Email Templates").click();
    await expect(page.locator("#rr-templates-table tbody tr").first()).toBeVisible();

    await tab(page, "Tasks").click();
    await expect(page.locator("#rr-tasks-table")).toBeVisible();
  });

  test("type chips and search filter the request list", async ({ page }) => {
    await tab(page, "Requests").click();
    await page.locator('.rr-chip[data-arg="Grievance"]').click();
    const rows = page.locator("#rr-requests-table tbody tr");
    await expect(rows.first()).toContainText("Grievance");
    await page.locator('input[data-input-act="rr-req-search"]').fill("zzzz-no-match");
    await expect(page.locator("#rr-requests-table")).toContainText("No requests match these filters");
    await page.locator('button[data-act="rr-req-clear"]').first().click();
    await expect(rows.first()).not.toContainText("No requests match");
  });

  test("create a request, advance it, add a note and a task, then delete it", async ({ page }) => {
    await tab(page, "Requests").click();
    await page.locator('button[data-act="rr-new-request"]').click();
    const modal = page.locator(".modal");

    // Validation
    await modal.locator('button[data-act="rr-save-request"]').click();
    await expect(modal.locator("#rr-nr-error")).toContainText("web form");

    await modal.locator("#rr-nr-form").selectOption({ index: 1 });
    await modal.locator("#rr-nr-first").fill("Playwright");
    await modal.locator("#rr-nr-last").fill("Tester");
    await modal.locator("#rr-nr-email").fill("not-an-email");
    await modal.locator('button[data-act="rr-save-request"]').click();
    await expect(modal.locator("#rr-nr-error")).toContainText("valid email");

    await modal.locator("#rr-nr-email").fill("playwright.tester@example.in");
    await modal.locator("#rr-nr-type").selectOption("Access");
    await modal.locator('button[data-act="rr-save-request"]').click();

    // Detail page opens on the new request
    await expect(page.locator(".rr-detail-title h2")).toHaveText("Playwright Tester");
    await expect(page.locator(".rr-detail-sub")).toContainText("New");

    // Only the next phase can be selected
    await expect(page.locator('.rr-step button[data-arg="In Progress"]')).toBeDisabled();
    await page.locator('.rr-step button[data-arg="Verifying Identity"]').click();
    await expect(page.locator(".rr-detail-sub")).toContainText("Verifying Identity");

    // Private note
    await page.locator('.rr-tabs button[data-arg="Email"]').click();
    await page.locator("#rr-mail-tpl").selectOption("tpl-ack");
    await expect(page.locator("#rr-mail-body")).toHaveValue(/Playwright Tester/);
    await page.locator('button[data-act="rr-send-mail"]').click();
    await expect(page.locator(".rr-timeline")).toContainText("Private note");

    // Task
    await page.locator('.rr-tabs button[data-arg="Tasks"]').click();
    await page.locator("#rr-task-new").fill("Confirm with legal");
    await page.locator('button[data-act="rr-add-task"]').click();
    await expect(page.locator(".rr-tasks")).toContainText("Confirm with legal");

    // Activity records each step
    await page.locator('.rr-tabs button[data-arg="Activity"]').click();
    await expect(page.locator(".rr-timeline")).toContainText("Status advanced to Verifying Identity");

    // Clean up
    await page.locator('button[data-act="rr-delete-request"]').click();
    await page.locator('.modal button[data-act="rr-confirm-delete-request"]').click();
    await expect(page.locator("#rr-requests-table")).toBeVisible();
    await expect(page.locator("#rr-requests-table")).not.toContainText("Playwright Tester");
  });

  test("web form editor adds a custom field to the live preview", async ({ page }) => {
    await tab(page, "Web Forms").click();
    await page.locator('button[data-act="rr-open-form"]').first().click();
    await page.locator('.rr-steps-nav button[data-arg="Form"]').click();

    await page.locator('button[data-act="rr-field-add"]').click();
    await page.locator('button[data-act="rr-field-save"]').click();
    await expect(page.locator("#rr-nf-error")).toContainText("field type");

    await page.locator("#rr-nf-type").selectOption("Textbox");
    await page.locator("#rr-nf-label").fill("PW test field");
    await page.locator('button[data-act="rr-field-save"]').click();
    await expect(page.locator(".rr-preview")).toContainText("PW test field");

    // Remove it again
    const item = page.locator(".rr-field-list li", { hasText: "PW test field" });
    await item.locator('button[data-act="rr-field-delete"]').click();
    await expect(page.locator(".rr-preview")).not.toContainText("PW test field");
  });

  test("workflow names must be unique", async ({ page }) => {
    await tab(page, "Workflows").click();
    const firstName = (await page.locator("#rr-workflows-table tbody tr").first().locator("td").first().innerText()).trim();
    await page.locator('button[data-act="rr-new-workflow"]').click();
    await page.locator("#rr-wf-name").fill(firstName);
    await page.locator('.modal button[data-act="rr-save-workflow"]').click();
    await expect(page.locator("#rr-wf-error")).toContainText("already exists");
    await page.locator('.modal button[data-act="close"]').first().click();
  });

  test("auditor role is read-only and cannot open web forms", async ({ page }) => {
    await page.locator('button[data-act="rr-toggle-user-menu"]').click();
    await page.locator('button[data-act="rr-switch-user"][data-arg="u3"]').click();
    await expect(page.locator(".rr-role-tag")).toHaveText("Auditor");
    await expect(page.locator(".rr-banner.is-warn")).toContainText("Read-only");

    await tab(page, "Requests").click();
    await expect(page.locator('button[data-act="rr-new-request"]')).toBeDisabled();

    await tab(page, "Web Forms").click();
    await expect(page.locator(".rr-restricted")).toContainText("Access restricted");

    // Switch back to the DPO
    await page.locator('button[data-act="rr-toggle-user-menu"]').click();
    await page.locator('button[data-act="rr-switch-user"][data-arg="u1"]').click();
    await expect(page.locator(".rr-role-tag")).toHaveText("DPO");
  });

  test("requests export as CSV", async ({ page }) => {
    await tab(page, "Requests").click();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('button[data-act="rr-export-csv"]').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^rights-requests-.*\.csv$/);
  });
});
