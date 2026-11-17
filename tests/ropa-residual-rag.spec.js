import { test, expect } from "@playwright/test";
import { residualRisk, activityRisk, evaluateRecord, rule6Suggestion } from "../src/modules/ropa/ropaRules.js";
import { createInitialRopaData } from "../src/modules/ropa/ropaData.js";
import { riskScores } from "../src/modules/dpia/dpiaModel.js";

// RoPA risk self-assessment (Security step): two Yes / Partial / No questions give the control
// effectiveness, and the residual risk is scored on the DPIA 5×5 RAG matrix. The existing 0–100
// inherent score must not change.
const STORE = "http://localhost:3001/api/store";
const seed = () => createInitialRopaData();
const actById = id => seed().act.find(a => a.id === id);

test.describe.configure({ mode: "serial" });

test.describe("RoPA residual risk on the RAG matrix: calculation", () => {
  test("Loan origination (L2 × I5) gives the planned residual and RAG for each answer pair", () => {
    const a = actById("PA-001");
    const cases = [
      ["Yes", "Yes", 4, 2, "GREEN"],
      ["Yes", "Partial", 3, 4, "GREEN"],
      ["Partial", "Partial", 2, 6, "AMBER"],
      ["No", "No", 0, 10, "RED"] // AMBER on the matrix, raised to RED: no controls on children's data
    ];
    for (const [sec, reg, ce, residual, rag] of cases) {
      const x = residualRisk({ ...a, secCtl: sec, regApp: reg });
      expect([x.likelihood, x.impact, x.inherent]).toEqual([2, 5, 10]);
      expect(x.ce).toBe(ce);
      expect(x.residual).toBe(residual);
      expect(x.rag).toBe(rag);
    }
  });

  test("unanswered questions leave the activity Not assessed", () => {
    const x = residualRisk(actById("PA-003"));
    expect(x.assessed).toBe(false);
    expect(x.rag).toBe("");
    expect(x.residual).toBeNull();
  });

  test("a Yes not backed by the Rule 6 checklist only earns Partial credit", () => {
    const a = actById("PA-009");
    expect(rule6Suggestion(a).ans).toBe("Partial");
    const x = residualRisk(a);
    expect(x.secCredit).toBe("Partial");
    expect(x.ce).toBe(3);
    const ev = evaluateRecord("act", a, seed(), {});
    expect(ev.results.some(r => r.id === "R-28")).toBe(true);
  });

  test("regulations not met never stay GREEN", () => {
    const x = residualRisk({ ...actById("PA-004"), secCtl: "Yes", regApp: "No" });
    expect(x.rag).toBe("AMBER");
    expect(x.floor).toContain("AMBER");
  });

  test("RoPA residual agrees with the DPIA risk model for the same L, I and CE", () => {
    for (const a of seed().act) {
      for (const sec of ["Yes", "Partial", "No"]) for (const reg of ["Yes", "Partial", "No"]) {
        const x = residualRisk({ ...a, secCtl: sec, regApp: reg });
        const d = riskScores({ likelihood: x.likelihood, impact: x.impact, controlEffectiveness: x.ce });
        expect(x.residual).toBe(d.residual);
        if (!x.floor) expect(x.rag).toBe(d.rag);
      }
    }
  });

  test("inherent score and band do not depend on the new answers", () => {
    for (const a of seed().act) {
      const base = activityRisk({ ...a, secCtl: undefined, regApp: undefined });
      for (const sec of ["Yes", "Partial", "No"]) {
        const ev = evaluateRecord("act", { ...a, secCtl: sec, regApp: sec }, seed(), {});
        expect(ev.riskScore).toBe(base.score);
      }
    }
  });

  test("seed activities cover every RAG and the R-26 / R-27 severities follow it", () => {
    const store = seed();
    const rags = store.act.map(a => residualRisk(a).rag || "none");
    for (const r of ["RED", "AMBER", "GREEN", "none"]) expect(rags).toContain(r);
    const red = evaluateRecord("act", actById("PA-007"), store, {});
    expect(red.residual.rag).toBe("RED");
    expect(red.results.find(r => r.id === "R-26").sev).toBe("warning");
    expect(red.high).toContain("R-26");
    expect(red.dpiaRecommended).toBe(true);
    const green = evaluateRecord("act", actById("PA-004"), store, {});
    expect(green.results.find(r => r.id === "R-27").sev).toBe("info");
  });

  test("completeness: Partial counts half and the DPDP meter has a regulatory item", () => {
    const ev = evaluateRecord("act", actById("PA-005"), seed(), {});
    const dpdp = ev.completeness.find(m => m.name === "DPDP");
    expect(dpdp.items.map(i => i[0])).toContain("Regulatory requirements");
    expect(dpdp.items.find(i => i[0] === "Regulatory requirements")[1]).toBe(0.5);
    expect(dpdp.items.find(i => i[0] === "Safeguards")[1]).toBe(0.5);
  });
});

test.describe("RoPA residual risk on the RAG matrix: screens", () => {
  test.beforeAll(async ({ request }) => {
    await request.post(`${STORE}/ropa/reset`).catch(() => {});
  });

  test("dashboard shows the residual RAG card and filters the list by RAG", async ({ page }) => {
    await page.goto("/#ropa");
    const card = page.locator(".card").filter({ has: page.locator('button[data-arg="act|rag=RED"]') });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Credit scoring model");
    await card.locator('button[data-arg="act|rag=RED"]').click();
    await expect(page.locator(".rp-rag", { hasText: "RAG RED" })).toHaveCount(1);
  });

  test("Security step asks both questions and the Compliance check follows the answers", async ({ page }) => {
    await page.goto("/#ropa");
    await page.locator('[data-arg="act|PA-007|5|secCtl"]').click();
    await expect(page.locator("#rp-f-secCtl")).toHaveValue("No");
    await expect(page.locator("#rp-f-regApp")).toHaveValue("Partial");
    await expect(page.locator("#rp-f-secGap")).toBeVisible();

    const dock = page.locator(".rp-dock");
    await expect(dock).toContainText("Residual risk · RAG matrix");
    await expect(dock.locator(".rp-dock-sec", { hasText: "Residual risk" }).locator(".rp-rag").first()).toHaveText("RED");
    await expect(dock).toContainText("Raised to RED");
    await expect(dock.locator(".rp-mx-c.on")).toHaveText("10");
    await expect(dock).toContainText("Security controls: No");

    await page.selectOption("#rp-f-secCtl", "Yes");
    await expect(dock.locator(".rp-dock-sec", { hasText: "Residual risk" }).locator(".rp-rag").first()).toHaveText("GREEN");
    await expect(dock).toContainText("Inherent risk score");

    await page.selectOption("#rp-f-regApp", "Yes");
    await expect(page.locator("#rp-f-secGap")).toHaveCount(0);
  });
});
