// Guide: when a DPIA is needed and how the module's workflow runs.
export function createGuideRenderer() {
  const steps = [
    ["Screen", "Start from the Data Map or the Assessments tab. The screening section tells you whether a full DPIA is needed."],
    ["Assess", "The assignee answers each section. Answers save automatically, and a Yes to a flagged question suggests a risk."],
    ["Score risks", "Record each risk with its likelihood and impact, before and after the mitigation."],
    ["Review", "Submitting sends the assessment to the DPO, who approves it or returns it with a note."],
    ["Act and monitor", "Mitigations become tasks. Approval updates the Data Map and is written to the Proof Ledger."],
  ];
  const triggers = {
    "DPDP Act 2023 (India)": [
      "Significant Data Fiduciaries must carry out a DPIA periodically (s.10(2)(c)), along with an independent data audit.",
      "Good practice for any fiduciary before launching processing of children's data, large-scale profiling or new technology.",
      "Re-run when the purpose, data categories, recipients or transfers change.",
    ],
    "GDPR (Article 35)": [
      "Systematic and extensive evaluation of people, including profiling, with legal or similarly significant effects.",
      "Large-scale processing of special category data or data about criminal convictions.",
      "Systematic monitoring of a publicly accessible area on a large scale.",
      "Processing on the supervisory authority's list of operations that require a DPIA.",
    ],
  };
  return {
    render: () => `
      <div class="dp-screen-head"><div><h2>Guide</h2><p>How DPIAs work in PrivacySEK. This is guidance, not legal advice: confirm requirements with your legal team.</p></div></div>
      <section class="card"><div class="card-h"><h3>How an assessment moves</h3></div><div class="card-b">
        <ol class="dp-flow">${steps.map(([t, d], i) => `<li><i>${i + 1}</i><b>${t}</b><p>${d}</p></li>`).join("")}</ol>
      </div></section>
      <div class="dp-dash-grid">
        ${Object.entries(triggers).map(([k, list]) => `
          <section class="card"><div class="card-h"><h3>When a DPIA is needed · ${k}</h3></div><div class="card-b">
            <ul class="dp-bullets">${list.map(x => `<li>${x}</li>`).join("")}</ul></div></section>`).join("")}
      </div>
      <section class="card"><div class="card-h"><h3>Risk scoring</h3></div><div class="card-b">
        <p class="dp-muted">Risk = likelihood × impact, each from 1 to 4. A score of 1–3 is Low, 4–6 Medium, 8–9 High and 12–16 Critical. The highest residual risk that is not closed is the assessment's risk level. Approving an assessment with a High or Critical residual risk needs the DPO to accept it explicitly.</p>
      </div></section>`,
  };
}
