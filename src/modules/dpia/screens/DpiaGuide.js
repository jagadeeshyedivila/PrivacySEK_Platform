// Guide: a plain-language handbook for the DPIA module. Written for people who have never done
// a DPIA: what it is, what each tab is for, the words used, who can do what, and the law behind it.
import { LIKELIHOOD_LABELS, IMPACT_LABELS, CE_LABELS } from "../dpiaConfig.js";

const SECTIONS = [
  ["what", "What is a DPIA?"],
  ["start", "Your first DPIA, step by step"],
  ["tabs", "What each tab does"],
  ["answering", "Answering questions"],
  ["scoring", "How risk is scored"],
  ["example", "A worked example"],
  ["roles", "Who can do what"],
  ["words", "Words you will see"],
  ["law", "The law behind it"],
  ["faq", "Common questions"],
];

// [tab id, name, one-line purpose, what you can do there, tip]
const TABS = [
  ["dashboard", "Dashboard", "Your morning check. It shows what needs attention today.",
    ["See how many assessments are open, waiting for review, overdue or approved", "Spot RED risks and expired evidence at a glance", "Track the annual DPIA that Significant Data Fiduciaries must run", "Find Data Map activities that need a DPIA but have none, and start one in a click"],
    "Every number is clickable and takes you to the list behind it."],
  ["assessments", "Assessments", "Where the work happens. Each assessment is one DPIA for one project or activity.",
    ["Start a new assessment from a template and send it to a colleague", "Answer questions section by section; answers save as you type", "Record risks and how you will reduce them", "Submit for review, and see the reviewer's decision and notes"],
    "Use “Assigned to me or for my review” to see only your own work."],
  ["templates", "Templates", "The question sets assessments are built from. Think of them as blank forms.",
    ["Use ready-made templates: DPIA (DPDP), GDPR DPIA, AI impact, cross-border transfer, legitimate use, and the 194-question Integrated DPIA", "Build your own: add sections, questions and answer types", "Preview a template exactly as the person answering will see it", "Publish a new version; assessments already started keep the old one"],
    "Editing a template never changes an assessment that is already in progress."],
  ["risks", "Risk register", "Every risk from every assessment, in one list.",
    ["Filter by RAG colour, status, priority, owner or Data Map activity", "See which risks are overdue against their target date", "Open the assessment a risk came from", "Export the register as a spreadsheet (CSV) for your risk committee"],
    "Sort your attention by RED first: those risks need action or escalation."],
  ["evidence", "Evidence", "Proof that a control really exists: policies, contracts, records, reports, screenshots.",
    ["Add a document once and link it to many questions and assessments", "Record how good the proof is (sufficiency and reliability) and how long it stays valid", "See which evidence has expired, is weak, or is not used anywhere", "Export the register as a spreadsheet"],
    "An auditor will ask “how do you know?”. Evidence is the answer."],
  ["frameworks", "Frameworks", "How well your answers cover each standard: the DPDP Act and four ISO standards.",
    ["Pick one assessment, or all approved ones", "See coverage and effectiveness percentages for each framework", "See which domains (topics) are strong and which have gaps", "Click any number to open the exact questions behind it"],
    "Useful when an auditor or customer asks “how do you map to ISO 27001?”."],
  ["tasks", "Tasks", "The to-do list that comes out of assessments.",
    ["Review tasks are created automatically when an assessment is submitted", "Fix-it tasks are created from risks and serious gaps", "Tick tasks off as they are done, or change their status", "Filter by yours, overdue or done"],
    "A risk is only really reduced when its task is done."],
];

const WORDS = [
  ["DPIA", "Data Protection Impact Assessment. A structured check of a project that uses personal data, done before it goes live, to find and reduce harm to people."],
  ["Data principal", "The person the data is about: a customer, borrower, employee or visitor. (GDPR calls them the “data subject”.)"],
  ["Data fiduciary", "The organisation that decides why and how personal data is used. Aarohan Finance is a data fiduciary."],
  ["Data processor", "A company that handles data on the fiduciary's behalf, such as a cloud or email provider."],
  ["SDF", "Significant Data Fiduciary. A larger or higher-risk fiduciary named by the Government. SDFs must run a DPIA and an audit every year."],
  ["Processing activity", "One thing the business does with personal data, such as “Loan origination”. These live in the Data Map."],
  ["Control", "Something that protects data: encryption, access reviews, a contract clause, a retention rule."],
  ["Gap", "A question answered No or Partial: the control is missing or only partly there."],
  ["Likelihood", "How likely the bad outcome is, from 1 (rare) to 5 (almost certain)."],
  ["Impact", "How badly people would be hurt if it happened, from 1 (negligible) to 5 (severe)."],
  ["Control effectiveness", "How well existing protections work, from 0 (none) to 5 (optimised). It reduces the risk."],
  ["Inherent risk", "The risk before counting your protections: likelihood × impact."],
  ["Residual risk", "The risk left after your protections. This is the number that matters."],
  ["RAG", "Red, Amber, Green. A traffic-light rating of the residual risk."],
  ["Treatment", "What you will do about a risk: fix it, reduce it, transfer it, or accept it."],
  ["Acceptance", "A recorded decision by the DPO to live with a risk, with a reason. RED risks must also be escalated."],
  ["Evidence", "A document or record that proves a control exists."],
  ["Framework", "A law or standard the questions are mapped to, such as the DPDP Act or ISO/IEC 27001."],
];

const FAQ = [
  ["Do I have to answer all 194 questions in the Integrated DPIA?", "Answer every question that applies. If one does not apply, choose NA and write a short note saying why. “Not Assessed” means you have not looked yet, and counts as unanswered."],
  ["What does “Suggested from Data Map” mean?", "PrivacySEK already knows a lot from other modules, such as which encryption an activity uses. It offers that as a suggested answer. Nothing is filled in until you click “Use suggestion”, and an answer you already gave is never replaced."],
  ["I answered No. What now?", "That is fine: finding gaps is the point. The Assessment details panel opens. Describe the gap, pick an owner, score it, and say how it will be fixed. For serious gaps, click “Create risk from this gap”."],
  ["Why can't I edit an assessment?", "Either it is with the reviewer (answers lock while it is reviewed), it is approved (the DPO can reopen it), it is assigned to someone else, or your role is read-only. The banner at the top tells you which."],
  ["What happens when I submit?", "PrivacySEK checks that required questions are answered and every gap is complete. If anything is missing it lists it, with a button to jump there. Then the reviewer gets a task to approve the assessment or send it back with a note."],
  ["Can I change a template after people have started using it?", "Yes. Assessments keep a copy of the version they started with, so your change only affects new assessments. Publishing again bumps the version number."],
  ["What does the DPO need to approve a RED risk?", "A written rationale and the name of the body it is escalated to, such as the Risk Committee. Assessors cannot accept AMBER or RED risks."],
  ["Is this legal advice?", "No. The guidance and mappings help you structure the work. Confirm legal requirements with your legal team."],
];

export function createGuideRenderer(ctx) {
  const scale = labels => Object.entries(labels).map(([k, v]) => `<li><b>${k}</b> ${v}</li>`).join("");
  const section = (id, body) => `<section class="card dp-guide-sec" id="dp-guide-${id}"><div class="card-h"><h3>${(SECTIONS.find(s => s[0] === id) || [])[1]}</h3></div><div class="card-b">${body}</div></section>`;
  const goBtn = (tab, label) => `<button class="btn sm" data-act="dp-tab" data-arg="${tab}">${label} →</button>`;

  const steps = [
    ["Check if you need one", "Open the Dashboard. Under “Data Map coverage” you'll see activities that need a DPIA. Not sure? Start the “DPIA (DPDP)” template: its first section is a short screening."],
    ["Start an assessment", "Click “+ New assessment”. Give it a name, choose a template, link the Data Map activity, and pick who answers it and who reviews it."],
    ["Answer the questions", "Work through each section on the left. Answers save automatically. Use the suggestions from the Data Map where they are right."],
    ["Describe the gaps", "For each No or Partial, fill in the Assessment details: what is wrong, who owns the fix, and the scores."],
    ["Record risks", "On the “Risks & mitigations” step, turn serious gaps into risks with a treatment and a target date. Tasks are created for the owners."],
    ["Attach proof", "Link evidence, such as policies, contracts and test reports, to the questions it supports."],
    ["Submit and get approval", "On “Summary & sign-off”, check that everything is green and submit. The DPO approves it or sends it back with a note."],
    ["Keep it alive", "Finish the tasks, and review the DPIA again when the processing changes, or every year if you are an SDF."],
  ];

  function render() {
    return `
      <div class="dp-screen-head"><div><h2>Guide</h2><p>A plain-language handbook for this module. No privacy background needed. This is guidance, not legal advice.</p></div></div>

      <nav class="card dp-guide-toc" aria-label="Guide contents">
        ${SECTIONS.map(([id, label], i) => `<button data-act="dp-guide-jump" data-arg="${id}"><i>${i + 1}</i>${label}</button>`).join("")}
      </nav>

      ${section("what", `
        <div class="dp-guide-lead">
          <p>A <b>Data Protection Impact Assessment (DPIA)</b> is a health check for a project that uses people's personal data. Before you launch a new app, a new vendor or a new AI model, you ask:</p>
          <ol class="dp-guide-qs"><li><b>What data</b> are we using, about <b>whom</b>, and <b>why</b>?</li><li><b>What could go wrong</b> for those people?</li><li><b>How likely and how bad</b> would it be?</li><li><b>What are we doing</b> to prevent it, and is it enough?</li></ol>
          <p>The answers are written down, scored, backed with evidence and signed off by the Data Protection Officer (DPO). That record shows a regulator, auditor or customer that you thought about privacy <em>before</em> something went wrong.</p>
        </div>
        <div class="dp-guide-cards">
          <div><b>When to do one</b><p>New or changed processing that is large-scale, sensitive (financial, ID, health, biometric), about children, uses AI or profiling, monitors people, or sends data abroad.</p></div>
          <div><b>Who does it</b><p>The business or IT owner answers the questions. The DPO reviews and approves. Legal, Security and Risk help where needed.</p></div>
          <div><b>How long it takes</b><p>A short screening takes minutes. A project DPIA takes days. The 194-question annual DPIA is a team effort over a few weeks.</p></div>
        </div>`)}

      ${section("start", `
        <ol class="dp-flow">${steps.map(([t, d], i) => `<li><i>${i + 1}</i><b>${t}</b><p>${d}</p></li>`).join("")}</ol>
        <div class="dp-guide-actions">${goBtn("dashboard", "Open the Dashboard")}${goBtn("assessments", "Go to Assessments")}</div>`)}

      ${section("tabs", `
        <div class="dp-guide-tabs">${TABS.map(([id, name, purpose, can, tip]) => `
          <article class="dp-guide-tab">
            <h4>${name}</h4>
            <p class="dp-guide-purpose">${purpose}</p>
            <ul class="dp-bullets">${can.map(x => `<li>${x}</li>`).join("")}</ul>
            <p class="dp-guide-tip"><b>Tip:</b> ${tip}</p>
            ${goBtn(id, `Open ${name}`)}
          </article>`).join("")}
        </div>`)}

      ${section("answering", `
        <div class="dp-guide-cards">
          <div><b>Yes / No questions</b><p>Used in screening. On questions marked ⚑, a Yes means “this is risky”: you'll be asked to record a risk.</p></div>
          <div><b>Compliance responses</b><p>Used in the Integrated DPIA. <span class="dp-guide-chip r-yes">Yes</span> the control is in place. <span class="dp-guide-chip r-partial">Partial</span> it is only partly in place. <span class="dp-guide-chip r-no">No</span> it is missing. <span class="dp-guide-chip">NA</span> it doesn't apply (say why). <span class="dp-guide-chip">Not Assessed</span> you haven't checked yet.</p></div>
          <div><b>Suggestions</b><p>A dashed box under a question shows what other modules already know, with a link to the source. Click <b>Use suggestion</b> if it is right. If the source changes later, you'll see “Source changed since you accepted it”.</p></div>
          <div><b>Assessment details</b><p>Under each checklist question. It opens by itself for No and Partial. Record the finding, the fix, the owners, the business process and systems involved, the scores and the evidence.</p></div>
          <div><b>Codes and tags</b><p><span class="dp-code">DPIA-077</span> is the question's ID in the workbook. Tags such as <span class="dp-fw">27001</span> show which standards the question is mapped to.</p></div>
          <div><b>Filters</b><p>Above the questions, filter by answer, RAG, framework, evidence or owner. For example, show every No with no evidence. Filters search across all sections.</p></div>
        </div>`)}

      ${section("scoring", `
        <div class="dp-guide-formula">
          <div><span>Inherent risk</span><b>Likelihood × Impact</b><small>1 to 25: the risk if nothing protected the data</small></div>
          <div><span>Residual risk</span><b>Inherent × (1 − Control effectiveness ÷ 5)</b><small>what is left after your protections</small></div>
        </div>
        <div class="dp-guide-rag">
          <div class="is-green"><span class="dp-rag is-green">GREEN</span><b>1 – 5</b><p>Low. Keep monitoring.</p></div>
          <div class="is-amber"><span class="dp-rag is-amber">AMBER</span><b>6 – 12</b><p>Medium. Plan a fix with an owner and a date. The DPO must accept it.</p></div>
          <div class="is-red"><span class="dp-rag is-red">RED</span><b>13 – 25</b><p>High. Fix urgently, and escalate to a committee or the board.</p></div>
        </div>
        <div class="dp-guide-scales">
          <div><h4>Likelihood</h4><ul>${scale(LIKELIHOOD_LABELS)}</ul></div>
          <div><h4>Impact</h4><ul>${scale(IMPACT_LABELS)}</ul></div>
          <div><h4>Control effectiveness</h4><ul>${scale(CE_LABELS)}</ul></div>
        </div>
        <p class="dp-muted">The workbook names only the end points of each scale; the middle labels are suggested. An assessment's overall RAG is the worst of its open risks and scored gaps.</p>`)}

      ${section("example", `
        <div class="dp-guide-example">
          <p class="dp-guide-q"><span class="dp-code">DPIA-088</span> “Is DLP implemented where justified by risk?”</p>
          <ol>
            <li><b>Answer:</b> <span class="dp-guide-chip r-no">No</span>. There is no data-loss prevention, and Discovery found a public storage bucket holding PAN numbers.</li>
            <li><b>Likelihood 4</b> (likely: it has already happened once) × <b>Impact 5</b> (severe: identity fraud) = <b>inherent 20</b>.</li>
            <li><b>Control effectiveness 0</b>: nothing stops it today. Residual = 20 × (1 − 0 ÷ 5) = <b>20</b> → <span class="dp-rag is-red">RED</span>.</li>
            <li>Because it is RED, PrivacySEK asks for a <b>treatment</b> (“Deploy DLP on storage and email”) and a <b>target date</b>.</li>
            <li>Click <b>Create risk from this gap</b>. The DPO records a rationale and <b>escalates</b> it to the Risk Committee. A task goes to the IT owner.</li>
            <li>Once DLP is in place, change control effectiveness to 4. Residual = 20 × (1 − 4 ÷ 5) = <b>4</b> → <span class="dp-rag is-green">GREEN</span>.</li>
          </ol>
          <p class="dp-muted">You can see this exact case in the demo assessment “Annual SDF DPIA 2026”.</p>
          ${ctx.state.assessments.some(a => a.id === "DPIA-2026-015") ? '<button class="btn sm" data-act="dp-open" data-arg="DPIA-2026-015">Open the demo assessment →</button>' : goBtn("assessments", "Go to Assessments")}
        </div>`)}

      ${section("roles", `
        <div class="tw"><table class="t dp-table dp-guide-roles">
          <thead><tr><th>What you want to do</th><th>DPO</th><th>Assessor</th><th>Auditor</th></tr></thead>
          <tbody>
            ${[
              ["View assessments, risks, evidence and reports", 1, 1, 1],
              ["Answer an assessment assigned to you", 1, 1, 0],
              ["Answer any assessment", 1, 0, 0],
              ["Add and edit evidence", 1, 1, 0],
              ["Start (send) a new assessment", 1, 0, 0],
              ["Build and publish templates", 1, 0, 0],
              ["Approve, return or reopen an assessment", 1, 0, 0],
              ["Accept or escalate an AMBER or RED risk", 1, 0, 0],
              ["Write reviewer comments", 1, 0, 0],
            ].map(([t, ...r]) => `<tr><td>${t}</td>${r.map(x => `<td class="dp-guide-yn">${x ? '<span class="dp-ok-t" aria-label="Yes">✓</span>' : '<span class="dp-muted" aria-label="No">—</span>'}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table></div>
        <p class="dp-hint">In this demo you can switch between the three accounts with the name button at the top right.</p>`)}

      ${section("words", `<dl class="dp-guide-words">${WORDS.map(([w, d]) => `<div><dt>${w}</dt><dd>${d}</dd></div>`).join("")}</dl>`)}

      ${section("law", `
        <div class="dp-guide-cards">
          <div><b>DPDP Act 2023 (India), s.10(2)(c)</b><p>A Significant Data Fiduciary must run a periodic DPIA covering people's rights, the purpose of the processing, and how risks to those rights are managed.</p></div>
          <div><b>DPDP Rules 2025, Rule 13</b><p>An SDF runs a DPIA <b>and</b> an audit every 12 months, reports significant observations to the Data Protection Board, and checks its algorithmic software. It applies from about May 2027. Use the “Annual SDF DPIA (Rule 13)” assessment type; its summary builds the observations report for you.</p></div>
          <div><b>GDPR Article 35 (EU)</b><p>A DPIA is needed when processing is likely to be high-risk. As a rule of thumb, it is needed when <b>two or more</b> of these apply: scoring or profiling · automated decisions with real effect · systematic monitoring · sensitive data · large scale · combining datasets · vulnerable people (children, employees) · new technology · blocking access to a service or right.</p></div>
          <div><b>ISO standards</b><p>Questions are <em>mapped to</em> ISO/IEC 27001 (information security), ISO 22301 (business continuity), ISO/IEC 20000-1 (IT service management) and ISO 31000 (risk management). The mapping helps you reuse the work. These standards do not themselves require a DPIA.</p></div>
        </div>`)}

      ${section("faq", `<div class="dp-guide-faq">${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>`)}`;
  }

  return { render };
}
