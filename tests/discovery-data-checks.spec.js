import { test, expect } from "@playwright/test";
import { OVERVIEW_SEED, createInitialDiscoveryData } from "../src/modules/discovery/discoveryData.js";
import { runDiscoveryChecks } from "../src/modules/discovery/discoveryChecks.js";
import sampleData from "../src/data/sampleData.js";

// Every figure the Discovery screens show must reconcile before it reaches the UI.
// "verify" items are classifications the scan cannot confirm; the UI must label them.
test.describe("Data Discovery data checks", () => {
  test("All Discovery figures reconcile; unconfirmed classes are known", () => {
    const results = runDiscoveryChecks(createInitialDiscoveryData(), sampleData, OVERVIEW_SEED);
    const failures = results.filter(r => r.status === "fail").map(r => `[${r.area}] ${r.label}: ${r.detail}`);
    expect(failures, failures.join("\n")).toEqual([]);
    const verify = results.filter(r => r.status === "verify").map(r => r.label).sort();
    expect(verify).toEqual([
      "Salary slips / Form 16",
      "call_recordings/: \"Voice\"",
      "gold_loan_vault: \"Photo\"",
      "telecom_call_verif_782.wav: entity classes"
    ]);
  });
});
