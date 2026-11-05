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

  /* ---------- web forms: every test works on its own new form and deletes it ---------- */
  const uid = () => Math.random().toString(36).slice(2, 8);

  async function newForm(page, name) {
    await tab(page, "Web Forms").click();
    await page.locator('button[data-act="rr-new-form"]').first().click();
    await page.locator("#rr-nf-name").fill(name);
    await page.locator('.modal button[data-act="rr-save-new-form"]').click();
    await expect(page.locator(".rr-detail-title h2")).toHaveText(name);
  }

  async function deleteForm(page, name) {
    if (await page.locator('button[data-act="rr-forms-back"]').count()) {
      await page.locator('button[data-act="rr-forms-back"]').click();
      const discard = page.locator('.modal button[data-act="rr-leave-discard"]');
      if (await discard.count()) await discard.click();
    }
    const card = page.locator(".rr-form-card", { hasText: name });
    await card.locator('button[data-act="rr-delete-form"]').click();
    await page.locator('.modal button[data-act="rr-confirm-delete-form"]').click();
    await expect(page.locator(".rr-form-card", { hasText: name })).toHaveCount(0);
  }

  test("web form edits stay in a draft until saved, and leaving asks first", async ({ page }) => {
    const name = `PW Draft ${uid()}`;
    await newForm(page, name);
    const save = page.locator('button[data-act="rr-save-form"]');
    await expect(page.locator(".rr-detail-sub")).toContainText("Draft");
    await expect(save).toBeDisabled();

    // Typing marks the draft as changed and keeps focus in the field
    const nameInput = page.locator("#rr-form-name");
    await nameInput.click();
    await nameInput.press("End");
    await nameInput.pressSequentially(" edited");
    await expect(nameInput).toBeFocused();
    await expect(page.locator(".rr-dirty")).toContainText("Unsaved changes");
    await expect(save).toBeEnabled();

    // Leaving asks; Keep editing stays, Discard throws the change away
    await tab(page, "Requests").click();
    await expect(page.locator(".modal")).toContainText("Save your changes?");
    await page.locator(".modal .drawer-f button[data-act=\"close\"]").click();
    await expect(page.locator("#rr-form-name")).toHaveValue(`${name} edited`);
    await tab(page, "Requests").click();
    await page.locator('.modal button[data-act="rr-leave-discard"]').click();
    await expect(page.locator("#rr-requests-table")).toBeVisible();
    await tab(page, "Web Forms").click();
    await expect(page.locator(".rr-form-card h3", { hasText: name })).toHaveText(name);

    // Save keeps the change
    await page.locator(".rr-form-card", { hasText: name }).locator('button[data-act="rr-open-form"]').click();
    await page.locator("#rr-form-name").fill(`${name} saved`);
    await save.click();
    await expect(page.locator(".rr-dirty")).toHaveCount(0);
    await page.locator('button[data-act="rr-forms-back"]').click();
    await expect(page.locator(".modal")).toHaveCount(0);
    await expect(page.locator(".rr-form-card h3", { hasText: `${name} saved` })).toBeVisible();

    await deleteForm(page, `${name} saved`);
  });

  test("web form fields: add, reorder, translate and remove", async ({ page }) => {
    const name = `PW Fields ${uid()}`;
    await newForm(page, name);

    // Add Hindi so the preview can switch language
    await page.locator('select[data-act="rr-lang-add"]').selectOption("Hindi");
    await expect(page.locator(".rr-multi")).toContainText("Hindi");

    await page.locator('.rr-steps-nav button[data-arg="Form"]').click();
    await page.locator('button[data-act="rr-field-add"]').click();
    await page.locator('button[data-act="rr-field-save"]').click();
    await expect(page.locator("#rr-nf-error")).toContainText("field type");

    // Option fields show option inputs once the type is chosen
    await page.locator("#rr-nf-type").selectOption("Radio");
    await page.locator("#rr-nf-label").fill("Preferred contact");
    await page.locator("#rr-nf-opt-0").fill("Phone");
    await page.locator("#rr-nf-opt-1").fill("Email");
    await page.locator('button[data-act="rr-field-save"]').click();
    const preview = page.locator("#content .rr-preview");
    await expect(preview).toContainText("Preferred contact");
    await expect(preview).toContainText("Phone");

    // The new field is last; move it up one place
    const rows = page.locator(".rr-frow");
    const count = await rows.count();
    await expect(rows.nth(count - 1)).toContainText("Preferred contact");
    await rows.nth(count - 1).locator('button[data-act="rr-field-move"][data-arg$="|-1"]').click();
    await expect(rows.nth(count - 2)).toContainText("Preferred contact");

    // Preview language translates the standard labels
    await page.locator('select[data-act="rr-preview-lang"]').selectOption("Hindi");
    await expect(preview).toContainText("पहला नाम");
    await page.locator('select[data-act="rr-preview-lang"]').selectOption("English");
    await expect(preview).toContainText("First name");

    // Removing asks first
    await rows.nth(count - 2).locator('button[data-act="rr-field-delete"]').click();
    await page.locator('.modal button[data-act="rr-confirm-field-delete"]').click();
    await expect(preview).not.toContainText("Preferred contact");

    await deleteForm(page, name);
  });

  test("web form styling keeps sizes and colours valid", async ({ page }) => {
    const name = `PW Style ${uid()}`;
    await newForm(page, name);
    await page.locator('.rr-steps-nav button[data-arg="Form"]').click();
    await page.locator('button[data-act="rr-form-section"][data-arg="Styling"]').click();

    const size = page.locator("#rr-fs-headerSize");
    await size.fill("200");
    await size.blur();
    await expect(size).toHaveValue("40");
    await expect(page.locator("#content .rr-pv-head")).toHaveCSS("font-size", "40px");

    const hex = page.locator("#rr-fs-headerColor-hex");
    await hex.fill("#123456");
    await expect(page.locator("#content .rr-pv-head")).toHaveCSS("background-color", "rgb(18, 52, 86)");
    await hex.fill("not a colour");
    await hex.blur();
    await expect(hex).toHaveValue("#123456");

    await deleteForm(page, name);
  });

  test("publishing checks the form, and a preview submission creates a request", async ({ page }) => {
    const name = `PW Publish ${uid()}`;
    const ident = `pw-${uid()}`;
    await newForm(page, name);

    // An invalid identifier blocks publishing and points to the Basic tab
    await page.locator("#rr-form-ident").fill("-bad-");
    await expect(page.locator("#rr-err-ident")).toContainText("cannot start or end");
    await expect(page.locator('.rr-steps-nav button[data-arg="Basic"] .rr-tab-issue')).toBeVisible();
    await page.locator('button[data-act="rr-publish-form"]').click();
    await expect(page.locator(".modal")).toContainText("Fix these before publishing");
    await page.locator('.modal button[data-act="rr-goto-tab"]').first().click();

    await page.locator("#rr-form-ident").fill(ident);
    await page.locator('button[data-act="rr-publish-form"]').click();
    await expect(page.locator(".modal")).toContainText(ident);
    await page.locator('.modal button[data-act="rr-confirm-publish"]').click();
    await expect(page.locator(".rr-detail-sub")).toContainText("Published");
    await page.locator('button[data-act="rr-form-history"]').click();
    await expect(page.locator(".modal .rr-hist")).toContainText("v1");
    await page.locator(".modal .drawer-f button[data-act=\"close\"]").click();

    // Fill in the interactive preview
    await page.locator('.rr-head-actions button[data-act="rr-form-preview"]').click();
    const modal = page.locator(".modal");
    await modal.locator('button[data-act="rr-pv-submit"]').click();
    await expect(modal.locator(".rr-pv-formerr")).toContainText("fix the highlighted");
    await modal.locator('[data-pv-key="subject"] input').first().check();
    await modal.locator('[data-pv-key="type"] input').first().check();
    await modal.locator("#pvf-first").fill("Preview");
    await modal.locator("#pvf-last").fill("Visitor");
    await modal.locator("#pvf-email").fill("preview.visitor@example.in");
    await modal.locator("#pvf-mobile").fill("+91 98765 43210");
    await modal.locator("#pvf-details").fill("Testing the web form end to end.");
    const captcha = await modal.locator(".rr-pv-cap-img").evaluate(el => [...el.querySelectorAll("span")].map(s => s.textContent).join(""));
    await modal.locator("#pvf-captcha").fill(captcha);
    await modal.locator('button[data-act="rr-pv-submit"]').click();
    await expect(modal.locator(".rr-pv-thanks")).toContainText("Reference number");

    // The request exists; open it, then clean up
    await modal.locator('button[data-act="rr-pv-open-request"]').click();
    await expect(page.locator(".rr-detail-title h2")).toHaveText("Preview Visitor");
    await page.locator('button[data-act="rr-delete-request"]').click();
    await page.locator('.modal button[data-act="rr-confirm-delete-request"]').click();
    await expect(page.locator("#rr-requests-table")).toBeVisible();

    await tab(page, "Web Forms").click();
    await deleteForm(page, name);
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
