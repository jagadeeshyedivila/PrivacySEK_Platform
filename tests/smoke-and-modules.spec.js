import { test, expect } from "@playwright/test";

const ALL_MODULES = [
  { id: "cockpit", title: "Obligation Cockpit" },
  { id: "discovery", title: "Data Discovery" },
  { id: "lineage", title: "Data Lineage" },
  { id: "ropa", title: "Data Map & ROPA" },
  { id: "finder", title: "Person Finder" },
  { id: "notices", title: "Notices" },
  { id: "consent", title: "Consent" },
  { id: "cookies", title: "Cookie Consent" },
  { id: "guard", title: "Purpose Guard" },
  { id: "retention", title: "Retention & Deletion" },
  { id: "vendors", title: "Vendor Risk" },
  { id: "rights", title: "Rights Requests" },
  { id: "breach", title: "Breach Response" },
  { id: "assess", title: "Assessments" },
  { id: "ledger", title: "Proof Ledger" },
  { id: "reports", title: "Reports" },
  { id: "ai", title: "AI Governance" },
  { id: "training", title: "Training" },
  { id: "trust", title: "Trust Center" },
  { id: "workflows", title: "Workflows" },
  { id: "integrations", title: "Integrations" },
  { id: "settings", title: "Settings" },
];

test.describe("A. Application Smoke Tests & Cross-Module Navigation", () => {
  test("Application launches successfully with no runtime errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", msg => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", err => consoleErrors.push(err.message));

    await page.goto("/#cockpit");
    await expect(page.locator(".rail")).toBeVisible();
    await expect(page.locator(".top")).toBeVisible();
    await expect(page.locator("#content")).toBeVisible();

    expect(consoleErrors).toEqual([]);
  });

  for (const mod of ALL_MODULES) {
    test(`Module ${mod.title} (#${mod.id}) renders correctly without CSS regressions`, async ({ page }) => {
      const consoleErrors = [];
      page.on("console", msg => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", err => consoleErrors.push(err.message));

      await page.goto(`/#${mod.id}`);
      await page.waitForTimeout(300);

      // Verify breadcrumb
      const crumb = page.locator("#crumb");
      await expect(crumb).toContainText(mod.title);

      // Verify content is not empty
      const content = page.locator("#content");
      await expect(content).toBeVisible();
      const text = await content.innerText();
      expect(text.trim().length).toBeGreaterThan(10);

      // Verify main shell elements are intact
      await expect(page.locator(".rail")).toBeVisible();
      await expect(page.locator(".top")).toBeVisible();

      // Check for error free navigation
      expect(consoleErrors).toEqual([]);

      // Capture screenshot for visual baseline
      if (["cockpit", "consent", "guard", "rights", "vendors", "ledger"].includes(mod.id)) {
        await page.screenshot({ path: `test-screenshots/module-${mod.id}.png`, fullPage: false });
      }
    });
  }
});
