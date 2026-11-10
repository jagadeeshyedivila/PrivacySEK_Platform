import { test, expect } from "@playwright/test";
import { normalizeRisk, riskScores } from "../src/modules/dpia/dpiaModel.js";

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
    await tab(page, "Evidence").click();
    await expect(page.locator("#dp-evidence-table tbody tr").first()).toBeVisible();
    await tab(page, "Frameworks").click();
    await expect(page.locator("#dp-fw-scope")).toBeVisible();
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
    await page.locator("#dp-rk-ce").selectOption("4");
    await expect(page.locator("#dp-rk-calc")).toContainText("residual 1.8");
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
    await page.locator('.dp-chip[data-arg="GREEN"]').click();
    const rows = page.locator("#dp-risks-table tbody tr");
    await expect(rows.first()).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent("download"), page.locator('button[data-act="dp-risks-csv"]').click()]);
    expect(download.suggestedFilename()).toMatch(/^dpia-risk-register-.*\.csv$/);
  });

  /* ---------------- integrated checklist ---------------- */
  const QID = code => `tpl-integrated-${code}`;
  const q = (page, code) => page.locator(`[data-qwrap="${QID(code)}"]`);
  const switchTo = async (page, id) => {
    await page.locator('button[data-act="dp-user-menu"]').click();
    await page.locator(`button[data-act="dp-switch-user"][data-arg="${id}"]`).click();
  };
  const step = (page, i) => page.locator(`.dp-steps button[data-act="dp-step"][data-arg="${i}"]`).click();

  async function createAssessment(page, { name, tpl, who = "Meera Iyer", act = "" }) {
    await tab(page, "Assessments").click();
    await page.locator('.dp-head-actions button[data-act="dp-new-assessment"]').click();
    await page.locator("#dp-na-name").fill(name);
    await page.locator("#dp-na-tpl").selectOption(tpl);
    if (act) await page.locator("#dp-na-act").selectOption(act);
    await page.locator("#dp-na-who").selectOption(who);
    await modal(page).locator('button[data-act="dp-save-assessment"]').click();
    await expect(page.locator(".dp-detail-title h2")).toHaveText(name);
  }
  async function deleteOpenAssessment(page) {
    await page.locator('.dp-head-actions button[data-act="dp-delete"]').click();
    await modal(page).locator('button[data-act="dp-confirm-delete"]').click();
    await expect(page.locator("#dp-assessments-table")).toBeVisible();
  }

  test("the integrated template has 16 domains and 194 questions with framework tags", async ({ page }) => {
    await tab(page, "Templates").click();
    const card = page.locator(".dp-tpl", { hasText: "Integrated DPIA" });
    await expect(card.locator(".dp-tpl-facts")).toContainText("16");
    await expect(card.locator(".dp-tpl-facts")).toContainText("194");
    await expect(card.locator(".dp-bank")).toBeVisible();
    await card.locator('button[data-act="dp-t-preview"]').click();
    await expect(page.locator(".dp-steps li")).toHaveCount(16);
    const first = q(page, "DPIA-001");
    await expect(first.locator(".dp-code")).toHaveText("DPIA-001");
    await expect(first.locator(".dp-fw")).toHaveText(["DPDPA", "27001", "20000", "31000"]);
  });

  test("a gap is scored 5×5 with control effectiveness, blocks submit until complete, and becomes a risk", async ({ page }) => {
    const name = `PW Integrated ${uid()}`;
    await createAssessment(page, { name, tpl: "tpl-integrated" });
    const row = q(page, "DPIA-001");
    const f = k => row.locator(`#dp-c-${QID("DPIA-001")}-${k}`);
    await row.locator('input[value="No"]').check();
    await expect(row.locator(".dp-ctl.is-open")).toBeVisible();
    await f("likelihood").selectOption("4");
    await f("impact").selectOption("4");
    await f("controlEffectiveness").selectOption("2");
    await expect(row.locator('[data-calc="inherent"]')).toHaveText("16");
    await expect(row.locator('[data-calc="residual"]')).toHaveText("9.6");
    await expect(row.locator('[data-calc="rag"]')).toHaveText("AMBER");
    await f("controlEffectiveness").selectOption("0");
    await expect(row.locator('[data-calc="residual"]')).toHaveText("16.0");
    await expect(row.locator('[data-calc="rag"]')).toHaveText("RED");

    // No finding or control owner yet: submit lists it, and the link goes back to the question
    await page.locator('.dp-head-actions button[data-act="dp-submit"]').click();
    await expect(modal(page)).toContainText("DPIA-001");
    await expect(modal(page)).toContainText("finding");
    await expect(modal(page)).toContainText("control owner");
    await modal(page).locator(`button[data-act="dp-jump"][data-arg="0|${QID("DPIA-001")}"]`).last().click();
    await expect(row).toBeVisible();
    await step(page, "summary");
    await expect(page.locator(".dp-checklist")).toContainText("control record");
    await expect(page.locator(`.dp-miss button[data-arg="0|${QID("DPIA-001")}"]`).first()).toBeVisible();

    // Complete it and raise a risk from the gap
    await step(page, 0);
    await f("finding").fill("Role not documented.");
    await f("controlOwner").selectOption("Meera Iyer");
    await row.locator('button[data-act="dp-risk-from-gap"]').click();
    await expect(page.locator("#dp-rk-l")).toHaveValue("4");
    await expect(page.locator("#dp-rk-ce")).toHaveValue("0");
    await expect(page.locator("#dp-rk-q")).toHaveValue(QID("DPIA-001"));
    await modal(page).locator('button[data-act="dp-risk-save"]').click();
    await expect(row.locator(".dp-ctl-f")).toContainText("Risk R1 created");

    await tab(page, "Risk register").click();
    const reg = page.locator("#dp-risks-table tbody tr", { hasText: "Role not documented." });
    await expect(reg).toContainText("DPIA-001");
    await expect(reg).toContainText("RED");
    await reg.locator('button[data-act="dp-open-risks"]').click();
    await deleteOpenAssessment(page);
  });

  test("accepting a RED risk needs the DPO, a rationale and an escalation", async ({ page }) => {
    const name = `PW RED ${uid()}`;
    await createAssessment(page, { name, tpl: "tpl-legit", who: "Rohan Gupta" });
    await step(page, "risks");
    await page.locator('button[data-act="dp-risk-add"]').first().click();
    await page.locator("#dp-rk-title").fill("Severe test risk");
    await page.locator("#dp-rk-l").selectOption("5");
    await page.locator("#dp-rk-i").selectOption("5");
    await page.locator("#dp-rk-ce").selectOption("0");
    await modal(page).locator('button[data-act="dp-risk-save"]').click();
    const card = page.locator(".dp-risk", { hasText: "Severe test risk" });
    await expect(card.locator(".dp-rag")).toHaveText("RED");

    await switchTo(page, "d2");
    await expect(page.locator(".dp-role-tag")).toHaveText("Assessor");
    await card.locator('button[data-act="dp-risk-accept"]').click();
    await expect(page.getByText("Only the DPO can accept or escalate a RED risk")).toBeVisible();
    await expect(page.locator("#dp-ac-why")).toHaveCount(0);

    await switchTo(page, "d1");
    await card.locator('button[data-act="dp-risk-accept"]').click();
    await page.locator("#dp-ac-dec").selectOption("Accepted");
    await page.locator("#dp-ac-to").selectOption("");
    await modal(page).locator('button[data-act="dp-risk-accept-save"]').click();
    await expect(page.locator("#dp-ac-err")).toContainText("rationale");
    await page.locator("#dp-ac-why").fill("Board funding approved for remediation.");
    await modal(page).locator('button[data-act="dp-risk-accept-save"]').click();
    await expect(page.locator("#dp-ac-err")).toContainText("escalated");
    await page.locator("#dp-ac-to").selectOption("Risk Committee");
    await modal(page).locator('button[data-act="dp-risk-accept-save"]').click();
    await expect(card.locator(".dp-risk-acc")).toContainText("escalated to Risk Committee");
    await deleteOpenAssessment(page);
  });

  test("evidence links to a control and warns when it has expired", async ({ page }) => {
    const title = `PW evidence ${uid()}`;
    await tab(page, "Evidence").click();
    await page.locator('.dp-head-actions button[data-act="dp-ev-new"]').click();
    await page.locator("#dp-ev-title").fill(title);
    await page.locator("#dp-ev-got").fill("2019-06-01");
    await page.locator("#dp-ev-valid").fill("2020-01-01");
    await page.locator("#dp-ev-qs").fill("DPIA-077, DPIA-999");
    await modal(page).locator('button[data-act="dp-ev-save"]').click();
    await expect(page.locator("#dp-ev-err")).toContainText("DPIA-999");
    await page.locator("#dp-ev-qs").fill("DPIA-077");
    await modal(page).locator('button[data-act="dp-ev-save"]').click();
    const row = page.locator("#dp-evidence-table tbody tr", { hasText: title });
    await expect(row).toContainText("Expired");
    const evId = (await row.locator(".dp-mono").first().textContent()).trim();

    const name = `PW Evidence DPIA ${uid()}`;
    await createAssessment(page, { name, tpl: "tpl-integrated" });
    await step(page, 6);
    const ctl = q(page, "DPIA-077");
    await ctl.locator('input[value="No"]').check();
    await ctl.locator('select[data-act="dp-ctl-ev-link"]').selectOption(evId);
    await expect(ctl.locator(".dp-ev-chip.is-expired")).toContainText(evId);
    await expect(ctl.locator(".dp-banner.is-warn")).toContainText("Expired evidence");
    await deleteOpenAssessment(page);

    await tab(page, "Evidence").click();
    await page.locator("#dp-evidence-table tbody tr", { hasText: title }).locator('button[data-act="dp-ev-delete"]').click();
    await modal(page).locator('button[data-act="dp-ev-confirm-delete"]').click();
    await expect(page.locator("#dp-evidence-table")).not.toContainText(title);
  });

  test("the framework crosswalk computes coverage, effectiveness and open gaps", async ({ page }) => {
    const title = `PW 22301 ${uid()}`;
    await tab(page, "Templates").click();
    await page.locator('button[data-act="dp-t-new"]').click();
    await modal(page).locator('button[data-act="dp-t-create"]').click();
    await page.locator("#dp-t-title").fill(title);
    await page.locator("#dp-t-desc").fill("Crosswalk test.");
    await page.locator("#dp-bs-0").fill("Continuity");
    await page.locator("#dp-b-0-0").fill("Is a continuity control in place?");
    await page.locator('select[data-act="dp-t-qtype"]').first().selectOption("Compliance response");
    await page.locator('input[data-change-act="dp-t-qfw"][data-fw="ISO 22301"]').first().check();
    for (let i = 0; i < 4; i++) await page.locator('button[data-act="dp-t-qdup"][data-arg="0|0"]').click();
    await expect(page.locator(".dp-bq")).toHaveCount(5);
    await page.locator('button[data-act="dp-t-publish"]').click();
    await modal(page).locator('button[data-act="dp-t-confirm-publish"]').click();
    await expect(page.locator(".dp-detail-sub")).toContainText("Published");
    await page.locator('button[data-act="dp-t-back"]').click();

    const name = `PW Crosswalk ${uid()}`;
    await createAssessment(page, { name, tpl: { label: `${title} · v1` } });
    const answers = ["Yes", "Yes", "Partial", "No", "NA"];
    for (let i = 0; i < 5; i++) await page.locator(".dp-q").nth(i).locator(`input[value="${answers[i]}"]`).check();
    const aid = (await page.locator(".dp-detail-sub .dp-mono").textContent()).trim();

    await tab(page, "Frameworks").click();
    await page.locator("#dp-fw-scope").selectOption(aid);
    const iso = page.locator('#dp-fw-table tr[data-fw="ISO 22301"]');
    await expect(iso.locator('[data-col="coverage"]')).toContainText("50%");
    await expect(iso.locator('[data-col="effective"]')).toContainText("62.5%");
    await expect(iso.locator('[data-col="gaps"]')).toHaveText("1");
    // The open-gap number opens the assessment filtered to that question
    await iso.locator('[data-col="gaps"] button').click();
    await expect(page.locator(".dp-step-card h3")).toHaveText("1 question match");
    await page.locator('button[data-act="dp-qf-clear"]').click();
    await deleteOpenAssessment(page);

    await tab(page, "Templates").click();
    await page.locator(".dp-tpl", { hasText: title }).locator('button[data-act="dp-t-delete"]').click();
    await modal(page).locator('button[data-act="dp-t-confirm-delete"]').click();
    await expect(page.locator(".dp-tpl", { hasText: title })).toHaveCount(0);
  });

  test("a legacy 4-point risk is mapped to the 5×5 model on load", async ({ page }) => {
    const r = normalizeRisk({ id: "R1", title: "Old", l: 3, i: 4, rl: 2, ri: 3, status: "Mitigating", desc: "d", mitigation: "m" });
    expect([r.likelihood, r.impact, r.controlEffectiveness, r.status, r.scenario, r.treatment]).toEqual([4, 5, 3, "In Progress", "d", "m"]);
    expect(riskScores(r)).toMatchObject({ inherent: 20, residual: 8, rag: "AMBER" });
    expect("rl" in r || "l" in r).toBe(false);

    // The same record saved by the old version opens in the app without errors
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const id = `DPIA-LEGACY-${uid()}`;
    await page.evaluate(async id => {
      // The same module instance the app uses: after a hot reload Vite serves it with a ?t= query
      const url = performance.getEntriesByType("resource").map(e => e.name).find(n => n.includes("/src/modules/dpia/dpiaData.js")) || "/src/modules/dpia/dpiaData.js";
      const m = await import(/* @vite-ignore */ url);
      m.loadDpiaState().assessments.unshift({
        id, name: id, tpl: "tpl-legit", tplTitle: "Legacy", tplVersion: 1, who: "Meera Iyer", reviewer: "Meera Iyer",
        due: "2030-01-01", status: "In progress", answers: {}, sections: [{ id: "s", name: "Old section", qs: [{ id: `${id}-q`, t: "Old question", type: "Yes/No", req: false }] }],
        risks: [{ id: "R1", title: "Legacy risk", desc: "Old", l: 3, i: 4, rl: 2, ri: 3, mitigation: "Old mitigation", owner: "Meera Iyer", status: "Mitigating", from: "", level: "High" }],
        activity: [], created: new Date().toISOString(), updated: new Date().toISOString(),
      });
    }, id);
    await tab(page, "Assessments").click();
    await page.locator("#dp-a-search").fill(id);
    await page.locator('.dp-link[data-act="dp-open"]', { hasText: id }).click();
    await step(page, "risks");
    const card = page.locator(".dp-risk", { hasText: "Legacy risk" });
    await expect(card.locator(".dp-risk-lv")).toContainText("L4 × I5 = 20");
    await expect(card.locator(".dp-risk-lv")).toContainText("CE 3 · 8.0");
    await expect(card.locator(".dp-rag")).toHaveText("AMBER");
    await deleteOpenAssessment(page);
    expect(errors).toEqual([]);
  });

  test("suggestions from the Data Map are offered but never overwrite an answer", async ({ page }) => {
    const name = `PW Prefill ${uid()}`;
    await createAssessment(page, { name, tpl: "tpl-integrated", act: "PA-001" });
    await step(page, 6);
    const enc = q(page, "DPIA-075");
    await expect(enc.locator(".dp-sugg")).toContainText("Suggested from Data Map");
    await expect(enc.locator(".dp-sugg")).toContainText("TLS 1.3");
    await enc.locator('button[data-act="dp-prefill"]').click();
    await expect(enc.locator('input[value="Yes"]')).toBeChecked();
    await expect(enc.locator(".dp-sugg")).toContainText("Accepted from Data Map");

    const rest = q(page, "DPIA-076");
    await rest.locator('input[value="No"]').check();
    await expect(rest.locator('button[data-act="dp-prefill"]')).toHaveCount(0);
    await expect(rest.locator(".dp-sugg")).toContainText("Data Map suggests");
    await expect(rest.locator('input[value="No"]')).toBeChecked();

    await step(page, "summary");
    await expect(page.locator(".dp-timeline")).toContainText("Accepted suggestion from Data Map for DPIA-075");
    await deleteOpenAssessment(page);
  });

  test("auditors cannot change checklist answers, controls or evidence", async ({ page }) => {
    await switchTo(page, "d3");
    await expect(page.locator(".dp-role-tag")).toHaveText("Auditor");
    await tab(page, "Assessments").click();
    await page.locator("#dp-a-search").fill("Annual SDF DPIA 2026");
    await page.locator('.dp-link[data-act="dp-open"]', { hasText: "Annual SDF DPIA 2026" }).click();
    await step(page, 1);
    await expect(page.locator(".dp-q input").first()).toBeVisible();
    expect(await page.locator(".dp-q input:not([disabled]), .dp-q textarea:not([disabled]), .dp-q select:not([disabled])").count()).toBe(0);
    await expect(page.locator(".dp-sugg button[data-act='dp-prefill']:not([disabled])")).toHaveCount(0);
    await tab(page, "Evidence").click();
    await expect(page.locator('.dp-head-actions button[data-act="dp-ev-new"]')).toBeDisabled();
    await expect(page.locator('button[data-act="dp-ev-edit"]').first()).toBeDisabled();
    await expect(page.locator('button[data-act="dp-ev-delete"]').first()).toBeDisabled();
    await switchTo(page, "d1");
  });

  test("activity pickers stay compact: search, select, remove", async ({ page }) => {
    const name = `PW Picker ${uid()}`;
    await tab(page, "Assessments").click();
    await page.locator('.dp-head-actions button[data-act="dp-new-assessment"]').click();
    await page.locator("#dp-na-name").fill(name);
    const pick = modal(page).locator(".dp-na-acts .dp-pick");
    const box = await pick.locator(".dp-pick-list").boundingBox();
    expect(box.height).toBeLessThanOrEqual(200);
    await pick.locator('input[type="search"]').fill("kyc");
    await expect(pick.locator("li[data-pick-text]:visible")).toHaveCount(1);
    await pick.locator('li[data-pick-text]:visible input').check();
    await expect(pick.locator(".dp-pick-chip")).toContainText("KYC verification");
    await expect(pick.locator("[data-pick-count]")).toContainText("1 of");
    await pick.locator('input[type="search"]').fill("");
    await pick.locator('input[value="PA-007"]').check();
    await pick.locator('.dp-pick-chip button[data-arg="PA-002"]').click();
    await expect(pick.locator(".dp-pick-chip")).toHaveCount(1);
    await modal(page).locator('.dp-na-fw .dp-toggle', { hasText: "ISO 27001" }).click();
    await modal(page).locator('button[data-act="dp-save-assessment"]').click();
    await expect(page.locator(".dp-detail-title h2")).toHaveText(name);
    await expect(page.locator(".dp-detail-sub")).toContainText("Credit scoring model");
    await expect(page.locator(".dp-facts")).toContainText("27001");
    await deleteOpenAssessment(page);
  });

  test("the guide explains every tab in plain language and links to each one", async ({ page }) => {
    await tab(page, "Guide").click();
    await expect(page.locator(".dp-guide-toc button")).toHaveCount(10);
    for (const name of ["Dashboard", "Assessments", "Templates", "Risk register", "Evidence", "Frameworks", "Tasks"]) {
      await expect(page.locator(".dp-guide-tab h4", { hasText: name }).first()).toBeVisible();
    }
    await expect(page.locator("#dp-guide-words")).toContainText("Residual risk");
    await page.locator('.dp-guide-toc button[data-arg="faq"]').click();
    await expect(page.locator("#dp-guide-faq")).toBeInViewport();
    await page.locator("#dp-guide-faq summary").first().click();
    await expect(page.locator("#dp-guide-faq details").first()).toHaveAttribute("open", "");
    await page.locator('.dp-guide-tab button[data-arg="evidence"]').click();
    await expect(page.locator("#dp-evidence-table")).toBeVisible();
  });

  test("the annual SDF DPIA demo agrees across controls, risks, evidence and crosswalk", async ({ page }) => {
    await tab(page, "Assessments").click();
    await page.locator("#dp-a-search").fill("Annual SDF DPIA 2026");
    await page.locator('.dp-link[data-act="dp-open"]', { hasText: "Annual SDF DPIA 2026" }).click();
    await expect(page.locator("[data-live-rag] .dp-rag")).toHaveText("RED");
    await step(page, "summary");
    await expect(page.locator(".dp-report")).toContainText("Report of significant observations");
    await expect(page.locator(".dp-report")).toContainText("DPIA-088");
    // A gap and the risk raised from it are one observation, worst first, inside the card
    await expect(page.locator(".dp-obs", { hasText: "DPIA-088" })).toHaveCount(1);
    await expect(page.locator(".dp-obs").first()).toContainText("Escalated to Risk Committee");
    await expect(page.locator(".dp-report-kpis")).toContainText("RED observations");
    const card = await page.locator(".dp-step-card").boundingBox();
    const report = await page.locator(".dp-report").boundingBox();
    expect(report.x + report.width).toBeLessThanOrEqual(card.x + card.width + 1);
    const [csv] = await Promise.all([page.waitForEvent("download"), page.locator('button[data-act="dp-report-csv"]').click()]);
    expect(csv.suggestedFilename()).toMatch(/^DPIA-2026-015-significant-observations-.*\.csv$/);
    await expect(page.locator(".dp-checklist")).toContainText("Every gap is scored");
    await tab(page, "Frameworks").click();
    await page.locator("#dp-fw-scope").selectOption("DPIA-2026-015");
    await expect(page.locator('#dp-fw-table tr[data-fw="DPDPA"] [data-col="coverage"]')).toContainText("%");
  });
});
