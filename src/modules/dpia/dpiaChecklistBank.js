// DPIA question bank exported from DPIA_Checklist_FinalV1.xlsx (sheet 'DPIA Assessment', 194 questions),
// with the workbook's dropdown lists ('Lists' sheet) and scoring rules ('Instructions' sheet).
// Added on top of the workbook: answerFormat (descriptive questions get a text answer as well as a
// response) and prefill (which existing PrivacySEK module can suggest an answer). No DOM access, so
// the server can import it through dpiaData.js.
export const DPIA_CHECKLIST = {
 "source": "DPIA_Checklist_FinalV1.xlsx",
 "version": "FinalV1",
 "frameworks": [
  "DPDPA",
  "ISO 27001",
  "ISO 22301",
  "ISO 20000",
  "ISO 31000"
 ],
 "scoring": {
  "likelihoodLabels": {
   "1": "Rare",
   "2": "Unlikely",
   "3": "Possible",
   "4": "Likely",
   "5": "Almost Certain"
  },
  "impactLabels": {
   "1": "Negligible",
   "2": "Minor",
   "3": "Moderate",
   "4": "Major",
   "5": "Severe"
  },
  "controlEffectivenessLabels": {
   "0": "Non-existent",
   "1": "Initial",
   "2": "Developing",
   "3": "Defined",
   "4": "Managed",
   "5": "Optimised"
  },
  "labelNote": "Workbook names only the end points (1 Rare / 5 Almost Certain, 1 Negligible / 5 Severe, 0 Non-existent / 5 Optimised). Middle labels are a suggested fill-in.",
  "inherent": "likelihood * impact",
  "residual": "inherent * (1 - controlEffectiveness / 5)",
  "rag": {
   "GREEN": [
    1,
    5
   ],
   "AMBER": [
    6,
    12
   ],
   "RED": [
    13,
    25
   ]
  },
  "ragRule": "blank if residual missing; residual >= 13 RED; residual >= 6 AMBER; else GREEN (residual can be a decimal, e.g. 12.8 is AMBER)",
  "frameworkCoverage": "Yes / (mapped questions - NA)",
  "frameworkEffective": "(Yes + 0.5 * Partial) / (mapped questions - NA)",
  "openGaps": "count of No"
 },
 "lists": {
  "response": [
   "Yes",
   "No",
   "Partial",
   "NA",
   "Not Assessed"
  ],
  "likelihood": [
   1,
   2,
   3,
   4,
   5
  ],
  "impact": [
   1,
   2,
   3,
   4,
   5
  ],
  "controlEffectiveness": [
   0,
   1,
   2,
   3,
   4,
   5
  ],
  "status": [
   "Open",
   "In Progress",
   "Closed",
   "Accepted",
   "Not Applicable"
  ],
  "priority": [
   "Critical",
   "High",
   "Medium",
   "Low"
  ],
  "evidenceType": [
   "Policy",
   "Procedure",
   "Record",
   "System Evidence",
   "Contract",
   "Certificate",
   "Report",
   "Interview",
   "Screenshot",
   "Other"
  ],
  "evidenceSufficiency": [
   "Sufficient",
   "Partially Sufficient",
   "Insufficient",
   "Pending"
  ],
  "evidenceReliability": [
   "High",
   "Medium",
   "Low"
  ]
 },
 "domains": [
  {
   "code": "GOV",
   "name": "Governance, Accountability & Scope",
   "subDomain": "Governance"
  },
  {
   "code": "DATA",
   "name": "Processing Inventory & Data Mapping",
   "subDomain": "Data Inventory"
  },
  {
   "code": "CLASS",
   "name": "Data Classification & Sensitivity",
   "subDomain": "Classification"
  },
  {
   "code": "LEGAL",
   "name": "Purpose, Legal Ground & Transparency",
   "subDomain": "Legal & Transparency"
  },
  {
   "code": "RIGHTS",
   "name": "Data Principal Rights & Grievance",
   "subDomain": "Data Principal Rights"
  },
  {
   "code": "PRIV",
   "name": "Privacy by Design & Minimisation",
   "subDomain": "Privacy by Design"
  },
  {
   "code": "SEC",
   "name": "Security Safeguards",
   "subDomain": "Security Safeguards"
  },
  {
   "code": "BREACH",
   "name": "Incident & Breach Management",
   "subDomain": "Incident Management"
  },
  {
   "code": "RET",
   "name": "Retention, Archival & Deletion",
   "subDomain": "Retention & Deletion"
  },
  {
   "code": "VEND",
   "name": "Processors, Vendors & Third Parties",
   "subDomain": "Third Parties"
  },
  {
   "code": "CLOUD",
   "name": "Cloud, Infrastructure & Transfers",
   "subDomain": "Cloud & Transfer"
  },
  {
   "code": "BCM",
   "name": "Business Continuity & Resilience",
   "subDomain": "Business Continuity"
  },
  {
   "code": "ITSM",
   "name": "IT Service Management",
   "subDomain": "IT Service Management"
  },
  {
   "code": "RISK",
   "name": "Risk Assessment & Treatment",
   "subDomain": "Risk Management"
  },
  {
   "code": "AI",
   "name": "AI, Analytics & Automated Processing",
   "subDomain": "AI & Analytics"
  },
  {
   "code": "CHILD",
   "name": "Children's Personal Data",
   "subDomain": "Children"
  }
 ],
 "questions": [
  {
   "id": "DPIA-001",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Has the organization identified whether it acts as Data Fiduciary, Data Processor, or both?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "org",
    "fields": "sampleData.org.role",
    "hint": "Organisation role recorded in Settings/org profile (\"Data Fiduciary · SDF candidate\")."
   }
  },
  {
   "id": "DPIA-002",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Is accountability for personal-data processing formally assigned?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-003",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Is there a designated privacy/data-protection owner?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.dpo",
    "hint": "DPO named on Data Map activities."
   }
  },
  {
   "id": "DPIA-004",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Is senior management accountable for privacy risk?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-005",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Has the organization assessed whether it may qualify as a Significant Data Fiduciary?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "org",
    "fields": "sampleData.org.role; sampleData.duties[id=sdf]",
    "hint": "SDF status and SDF duty card in the Obligation Cockpit."
   }
  },
  {
   "id": "DPIA-006",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Are applicable regulatory, contractual and business obligations documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-007",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Is a documented privacy/data-protection policy approved and communicated?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "pol (ptype)",
    "hint": "Policies register in Data Map (privacy policy / notice records)."
   }
  },
  {
   "id": "DPIA-008",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Are privacy roles and responsibilities documented through RACI?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-009",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Are privacy responsibilities embedded into business and technology governance?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-010",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Are privacy risks reported to an appropriate management/risk committee?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-011",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Are privacy obligations included in internal audit/compliance programmes?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-012",
   "domain": "GOV",
   "subDomain": "Governance",
   "text": "Is the DPIA methodology itself formally approved and maintained?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-013",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Is an inventory of personal-data processing activities maintained?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act",
    "hint": "Data Map holds the processing-activity inventory (count of activities)."
   }
  },
  {
   "id": "DPIA-014",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Is each processing activity linked to a business process and owner?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.bu, act.owner, act.sub",
    "hint": "Business unit, owner and sub-processes per activity."
   }
  },
  {
   "id": "DPIA-015",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "What personal data is collected for the processing activity?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "act.cat, act.attr",
    "hint": "Data categories and data elements per activity."
   }
  },
  {
   "id": "DPIA-016",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "From whom is the personal data collected?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "act.dpc",
    "hint": "Data principal categories per activity."
   }
  },
  {
   "id": "DPIA-017",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "How is the personal data collected?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "act.mode, act.srct, act.freq",
    "hint": "Collection channels, source type and frequency."
   }
  },
  {
   "id": "DPIA-018",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "What is the purpose of each processing activity?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "act.purp, act.desc",
    "hint": "Purposes per activity."
   }
  },
  {
   "id": "DPIA-019",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Is each processing purpose documented and approved?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-020",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Is the processing necessary for the stated purpose?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.purp, act.law",
    "hint": "Purpose and legal ground – assessor judges necessity."
   }
  },
  {
   "id": "DPIA-021",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Are excessive or unnecessary data elements identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-022",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Which systems/applications process the personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "act.apps, act.ssys, ast.name",
    "hint": "Applications/systems linked to the activity."
   }
  },
  {
   "id": "DPIA-023",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Where is personal data stored?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "ast.loc, ast.stype, ast.host, act.sjur",
    "hint": "Storage location/jurisdiction of linked assets."
   }
  },
  {
   "id": "DPIA-024",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Are internal data flows documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.int, act.irec, act.ipur",
    "hint": "Internal sharing recipients and purpose."
   }
  },
  {
   "id": "DPIA-025",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Are external data flows documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.ext, act.erec, act.epur, act.erole",
    "hint": "External recipients and purpose."
   }
  },
  {
   "id": "DPIA-026",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Are data-flow diagrams maintained and periodically reviewed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-027",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Are backups and replicated copies included in the inventory?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.bak, act.bjur",
    "hint": "Backups and backup jurisdiction."
   }
  },
  {
   "id": "DPIA-028",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Is personal data used in test/development environments identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.copy",
    "hint": "Copies in non-production / other environments."
   }
  },
  {
   "id": "DPIA-029",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Is personal data present in logs, SIEM or monitoring systems identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "discovery",
    "fields": "connections, findings",
    "hint": "Discovery scans of log/SIEM sources and posture findings."
   }
  },
  {
   "id": "DPIA-030",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Is personal data present in service-management tickets/tools identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "discovery",
    "fields": "connections (Freshdesk etc.), findings",
    "hint": "Personal data found in ticketing tools."
   }
  },
  {
   "id": "DPIA-031",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Is personal data present in email/collaboration systems identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "discovery",
    "fields": "connections (Google Workspace etc.), findings",
    "hint": "Personal data found in email/collaboration."
   }
  },
  {
   "id": "DPIA-032",
   "domain": "DATA",
   "subDomain": "Data Inventory",
   "text": "Are shadow databases, spreadsheets and manual records included?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "discovery",
    "fields": "findings",
    "hint": "Shadow copies / spreadsheets found outside approved locations."
   }
  },
  {
   "id": "DPIA-033",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Has personal data been classified according to sensitivity?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "discovery",
    "fields": "getDiscoveryData(): classification results (cls labels, sensitive counts)",
    "hint": "Classification labels and sensitivity from Discovery."
   }
  },
  {
   "id": "DPIA-034",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Are higher-risk data sets identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "discovery",
    "fields": "getDiscoveryData(): sensitive / sensitiveFiles counts",
    "hint": "Data stores with sensitive data."
   }
  },
  {
   "id": "DPIA-035",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Are financial, identity, authentication or other sensitive business data sets identified where applicable?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.cat (Government IDs, Financial, Biometric)",
    "hint": "Sensitive categories on the activity."
   }
  },
  {
   "id": "DPIA-036",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Are children's personal-data processing activities identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.dpc includes children",
    "hint": "Children listed as data principals."
   }
  },
  {
   "id": "DPIA-037",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Are large-volume processing activities identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "discovery",
    "fields": "getDiscoveryData(): record / file counts per data store",
    "hint": "Record volumes from Discovery."
   }
  },
  {
   "id": "DPIA-038",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Is classification linked to security controls?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-039",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Is classification linked to retention and deletion?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "retention",
    "fields": "sampleData.retention",
    "hint": "Retention schedules by data category."
   }
  },
  {
   "id": "DPIA-040",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Is classification linked to access-control requirements?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-041",
   "domain": "CLASS",
   "subDomain": "Classification",
   "text": "Is classification linked to continuity/recovery requirements?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-042",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Is the specific purpose of processing documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.purp",
    "hint": "Purposes documented on the activity."
   }
  },
  {
   "id": "DPIA-043",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "What ground for processing is being relied upon under the DPDPA?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "act.law",
    "hint": "Legal ground recorded on the activity."
   }
  },
  {
   "id": "DPIA-044",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Has the organization determined whether consent is required?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.law",
    "hint": "Consent (s.6) vs legitimate use (s.7)."
   }
  },
  {
   "id": "DPIA-045",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Where consent is used, is it appropriately obtained and recorded?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "consent",
    "fields": "purposes, consents",
    "hint": "Consent purposes and consent records."
   }
  },
  {
   "id": "DPIA-046",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Can consent be withdrawn through a defined mechanism where applicable?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "consent",
    "fields": "purposes, preferences",
    "hint": "Withdrawal mechanism / preference centre."
   }
  },
  {
   "id": "DPIA-047",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Does withdrawal trigger appropriate downstream actions?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "consent",
    "fields": "workflows",
    "hint": "Withdrawal-triggered workflows."
   }
  },
  {
   "id": "DPIA-048",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Is the privacy notice aligned with actual processing?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "notices",
    "fields": "sampleData.notices.cov",
    "hint": "Notices covering this activity."
   }
  },
  {
   "id": "DPIA-049",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Is the privacy notice understandable and accessible to Data Principals?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "notices",
    "fields": "sampleData.notices.langs",
    "hint": "Languages the notice is available in."
   }
  },
  {
   "id": "DPIA-050",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Are material changes in processing reflected in notices?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "notices",
    "fields": "sampleData.notices.v, upd",
    "hint": "Notice versions and update dates."
   }
  },
  {
   "id": "DPIA-051",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Are secondary uses of personal data identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.purp (more than one purpose)",
    "hint": "Activities with additional purposes; Purpose Guard alerts."
   }
  },
  {
   "id": "DPIA-052",
   "domain": "LEGAL",
   "subDomain": "Legal & Transparency",
   "text": "Is personal data used for analytics/profiling beyond the original purpose?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.ai, ast.ai",
    "hint": "Analytics/AI use recorded on the activity or asset."
   }
  },
  {
   "id": "DPIA-053",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Can Data Principals exercise applicable rights through a defined channel?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "forms (status Published)",
    "hint": "Published rights web forms."
   }
  },
  {
   "id": "DPIA-054",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Is there a formal rights-request process?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "workflows",
    "hint": "Rights request workflows."
   }
  },
  {
   "id": "DPIA-055",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Can requester identity be verified appropriately?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "forms.verifyEmail, workflows",
    "hint": "Identity verification step."
   }
  },
  {
   "id": "DPIA-056",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Can Data Principals request correction/update where applicable?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "requests (type Correction)",
    "hint": "Correction requests handled."
   }
  },
  {
   "id": "DPIA-057",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Can Data Principals request erasure where applicable?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "requests (type Erasure)",
    "hint": "Erasure requests handled."
   }
  },
  {
   "id": "DPIA-058",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Is there a formal grievance mechanism?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "requests (type Grievance)",
    "hint": "Grievance requests and channel."
   }
  },
  {
   "id": "DPIA-059",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Are grievance and rights-request timelines defined?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "requests.slaDays",
    "hint": "SLA days per request type."
   }
  },
  {
   "id": "DPIA-060",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Are requests tracked end-to-end?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "requests.activity",
    "hint": "Request timelines tracked."
   }
  },
  {
   "id": "DPIA-061",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Are requests propagated to relevant processors?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-062",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Are relevant backup/replica implications addressed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-063",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Are exceptions and refusals documented and approved?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-064",
   "domain": "RIGHTS",
   "subDomain": "Data Principal Rights",
   "text": "Are KPIs established for rights and grievance requests?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "rights",
    "fields": "requests (on-time %)",
    "hint": "Rights KPIs from the Rights dashboard."
   }
  },
  {
   "id": "DPIA-065",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Is only necessary personal data collected?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-066",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Is unnecessary collection prevented technically where feasible?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-067",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Is data minimisation considered during application design?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-068",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Are privacy requirements included in the SDLC?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-069",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Are privacy requirements included in new projects?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-070",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Is privacy assessed before new processing begins?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.dpia, act.dpiaState",
    "hint": "DPIA decision recorded before processing."
   }
  },
  {
   "id": "DPIA-071",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Are high-risk processing activities subject to enhanced approval?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-072",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Is anonymisation/pseudonymisation considered where appropriate?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-073",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Are privacy-preserving default settings used?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-074",
   "domain": "PRIV",
   "subDomain": "Privacy by Design",
   "text": "Are privacy requirements included in procurement/vendor selection?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-075",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is personal data encrypted in transit where appropriate?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.sec, act.tr",
    "hint": "Encryption in transit on the activity."
   }
  },
  {
   "id": "DPIA-076",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is personal data encrypted at rest where appropriate?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.rest",
    "hint": "Encryption at rest on the activity."
   }
  },
  {
   "id": "DPIA-077",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is access controlled using least privilege?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.orgm (Role-based access)",
    "hint": "Access controls listed."
   }
  },
  {
   "id": "DPIA-078",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is privileged access controlled and monitored?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-079",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is MFA implemented for sensitive systems?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.orgm (MFA)",
    "hint": "MFA listed."
   }
  },
  {
   "id": "DPIA-080",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Are periodic user access reviews performed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.orgm (Quarterly access review)",
    "hint": "Access reviews listed."
   }
  },
  {
   "id": "DPIA-081",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Are joiner/mover/leaver controls implemented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-082",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Are administrative activities logged?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.orgm (Access logs)",
    "hint": "Logging listed."
   }
  },
  {
   "id": "DPIA-083",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Are security logs protected from unauthorized alteration?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-084",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is vulnerability management implemented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-085",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is patch management implemented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-086",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is endpoint protection implemented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-087",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is network segmentation used for sensitive environments where justified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-088",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is DLP implemented where justified by risk?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-089",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Are backups protected against unauthorized access?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.orgm (Backups tested)",
    "hint": "Backup controls listed."
   }
  },
  {
   "id": "DPIA-090",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Are backup restoration tests performed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.orgm (Backups tested)",
    "hint": "Backup restore tests listed."
   }
  },
  {
   "id": "DPIA-091",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Are secure deletion mechanisms implemented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.dm",
    "hint": "Disposal method on the activity."
   }
  },
  {
   "id": "DPIA-092",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is data masking used in non-production environments where appropriate?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-093",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Is secure software development implemented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-094",
   "domain": "SEC",
   "subDomain": "Security Safeguards",
   "text": "Are security monitoring and alerting capabilities implemented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "discovery",
    "fields": "findings",
    "hint": "Open posture findings (unencrypted / public data)."
   }
  },
  {
   "id": "DPIA-095",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Is there a personal-data breach response procedure?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "breach",
    "fields": "sampleData.incidents",
    "hint": "Breach Response module incidents."
   }
  },
  {
   "id": "DPIA-096",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Is a personal-data breach formally defined and classified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-097",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Is there a breach escalation matrix?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-098",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Are processors contractually required to report relevant incidents?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-099",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Can the organization detect unauthorized access promptly?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-100",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Can the organization identify affected data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "breach",
    "fields": "sampleData.incidents.ppl",
    "hint": "Affected-people counts on incidents."
   }
  },
  {
   "id": "DPIA-101",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Can it identify affected Data Principals where required?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-102",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Is there an incident severity classification?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-103",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Are regulatory notification requirements incorporated into the response plan?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-104",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Are incident communications coordinated with crisis/BCM processes?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-105",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Are incidents subjected to root-cause analysis?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "breach",
    "fields": "sampleData.incidents.st",
    "hint": "Incident status / closure."
   }
  },
  {
   "id": "DPIA-106",
   "domain": "BREACH",
   "subDomain": "Incident Management",
   "text": "Are corrective actions tracked to closure?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-107",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Is a retention period defined for each category of personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.ret, ast.del",
    "hint": "Retention period per activity/asset."
   }
  },
  {
   "id": "DPIA-108",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Is retention based on business and legal necessity?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.retp",
    "hint": "Retention justification."
   }
  },
  {
   "id": "DPIA-109",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Is data automatically deleted when retention expires where feasible?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "retention",
    "fields": "sampleData.retention, deletionJobs",
    "hint": "Automated retention rules and deletion jobs."
   }
  },
  {
   "id": "DPIA-110",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Are deletion exceptions documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "retention",
    "fields": "sampleData.retention (legal hold)",
    "hint": "Documented deletion exceptions / legal holds."
   }
  },
  {
   "id": "DPIA-111",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Are archived records included in retention analysis?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-112",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Are backups included in retention/deletion analysis?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.bak",
    "hint": "Backups exist – check retention covers them."
   }
  },
  {
   "id": "DPIA-113",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Are third parties required to delete/return data at end of service where applicable?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-114",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Is evidence of deletion retained where appropriate?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "retention",
    "fields": "sampleData.deletionJobs",
    "hint": "Completed deletion jobs as evidence."
   }
  },
  {
   "id": "DPIA-115",
   "domain": "RET",
   "subDomain": "Retention & Deletion",
   "text": "Are obsolete applications/databases reviewed for residual personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-116",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are all processors that process personal data identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "ven; act.erec",
    "hint": "Vendors register and external recipients."
   }
  },
  {
   "id": "DPIA-117",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "What data does each processor receive?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "act.erec + act.cat",
    "hint": "Which data each external recipient gets."
   }
  },
  {
   "id": "DPIA-118",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Why does each processor require the data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "ropa",
    "fields": "act.epur",
    "hint": "Purpose of sharing with each recipient."
   }
  },
  {
   "id": "DPIA-119",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are processor agreements documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.dpa, act.dpal, doc (DPA documents)",
    "hint": "DPA flag/link and DPA documents."
   }
  },
  {
   "id": "DPIA-120",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Do contracts specify security requirements?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-121",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are breach notification obligations contractual?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-122",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are deletion/return obligations defined?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-123",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are subprocessors identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "vendors",
    "fields": "sampleData.vendors.sub",
    "hint": "Subprocessor counts per vendor."
   }
  },
  {
   "id": "DPIA-124",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are processor security/privacy assessments performed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "vendors",
    "fields": "sampleData.vendors.q, risk",
    "hint": "Vendor assessment progress and rating."
   }
  },
  {
   "id": "DPIA-125",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are processor certifications/assurance reports reviewed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "ven.atype",
    "hint": "Assurance type (SOC 2 / ISO 27001) recorded on the vendor."
   }
  },
  {
   "id": "DPIA-126",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are critical suppliers included in business continuity assessments?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-127",
   "domain": "VEND",
   "subDomain": "Third Parties",
   "text": "Are processor risks included in the enterprise risk register?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-128",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Is personal data hosted in cloud environments?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "ast.stype = Cloud",
    "hint": "Cloud-hosted assets."
   }
  },
  {
   "id": "DPIA-129",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Is the geographic location of data documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "ast.loc, act.sjur",
    "hint": "Hosting location."
   }
  },
  {
   "id": "DPIA-130",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Are overseas data transfers identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.xb",
    "hint": "Cross-border transfer flag."
   }
  },
  {
   "id": "DPIA-131",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Are cloud subprocessors identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "ast.host, ast.supp",
    "hint": "Cloud host / supplier."
   }
  },
  {
   "id": "DPIA-132",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Are cloud access privileges periodically reviewed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-133",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Are cloud backups included in the DPIA?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.bak, act.bjur",
    "hint": "Backups and backup jurisdiction."
   }
  },
  {
   "id": "DPIA-134",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Are cloud disaster-recovery arrangements assessed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-135",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Is data residency relevant to the processing and documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.sjur, act.bjur",
    "hint": "Storage/backup jurisdictions."
   }
  },
  {
   "id": "DPIA-136",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Are contractual restrictions imposed where required?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-137",
   "domain": "CLOUD",
   "subDomain": "Cloud & Transfer",
   "text": "Can the organization retrieve/delete data from the cloud provider?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-138",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Are critical personal-data processing activities included in the BIA?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-139",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Are critical applications supporting personal-data processing identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "ast.crit",
    "hint": "Critical assets."
   }
  },
  {
   "id": "DPIA-140",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Are RTOs defined for critical personal-data systems?",
   "questionType": "Core",
   "frameworks": [
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-141",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Are RPOs defined for critical personal-data systems?",
   "questionType": "Core",
   "frameworks": [
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-142",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Are backup sites/data centres assessed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-143",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Are DR environments subject to equivalent privacy/security controls?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-144",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Can personal data be restored accurately following disruption?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-145",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Are DR tests performed?",
   "questionType": "Core",
   "frameworks": [
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-146",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Do DR tests include privacy risks?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-147",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Is there a plan for loss/corruption of personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-148",
   "domain": "BCM",
   "subDomain": "Business Continuity",
   "text": "Are critical third-party dependencies included in continuity planning?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-149",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Which IT services process personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "text+response"
  },
  {
   "id": "DPIA-150",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are privacy requirements included in service design?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-151",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are privacy requirements included in service SLAs?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-152",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are personal-data incidents linked to incident management?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-153",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are privacy risks assessed during change management?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-154",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are privacy requirements tested before service deployment?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-155",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are personal-data risks considered in release management?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-156",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are service continuity requirements defined?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-157",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are service providers assessed for privacy/security risks?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-158",
   "domain": "ITSM",
   "subDomain": "IT Service Management",
   "text": "Are service performance metrics related to privacy obligations?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-159",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Has a formal privacy risk assessment been performed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "assessment.risks",
    "hint": "Risks recorded on this assessment."
   }
  },
  {
   "id": "DPIA-160",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "What could go wrong with the processing?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "text+response"
  },
  {
   "id": "DPIA-161",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Who could be harmed by the processing?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "text+response"
  },
  {
   "id": "DPIA-162",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "What is the nature of potential harm?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "text+response"
  },
  {
   "id": "DPIA-163",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Has likelihood of occurrence been assessed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[].likelihood",
    "hint": "Likelihood scored on risks."
   }
  },
  {
   "id": "DPIA-164",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Has potential impact/harm been assessed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[].impact",
    "hint": "Impact scored on risks."
   }
  },
  {
   "id": "DPIA-165",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Has inherent risk been calculated?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[] inherent",
    "hint": "Inherent score computed."
   }
  },
  {
   "id": "DPIA-166",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Are existing controls documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[].existingControls",
    "hint": "Existing controls captured."
   }
  },
  {
   "id": "DPIA-167",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Has control effectiveness been assessed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[].controlEffectiveness",
    "hint": "Control effectiveness scored."
   }
  },
  {
   "id": "DPIA-168",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Has residual risk been calculated?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[] residual",
    "hint": "Residual score computed."
   }
  },
  {
   "id": "DPIA-169",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Is residual risk within approved tolerance?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-170",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Is a risk owner assigned?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[].owner",
    "hint": "Owners assigned."
   }
  },
  {
   "id": "DPIA-171",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Is a treatment plan documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[].treatment",
    "hint": "Treatment recorded."
   }
  },
  {
   "id": "DPIA-172",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Are treatment deadlines established?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "dpia",
    "fields": "risks[].targetDate",
    "hint": "Target dates set."
   }
  },
  {
   "id": "DPIA-173",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Are privacy risks monitored periodically?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-174",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Are emerging privacy risks identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-175",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Are risk assumptions documented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-176",
   "domain": "RISK",
   "subDomain": "Risk Management",
   "text": "Is the risk assessment reviewed when processing changes?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-177",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Is personal data used to train AI/ML models?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ai",
    "fields": "sampleData.ai; ast.train",
    "hint": "AI register and asset \"used for training\" flag."
   }
  },
  {
   "id": "DPIA-178",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Is personal data used for profiling or segmentation?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ai",
    "fields": "sampleData.ai; act.ai",
    "hint": "Profiling / scoring systems."
   }
  },
  {
   "id": "DPIA-179",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Are automated decisions made using personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ai",
    "fields": "sampleData.ai.hl",
    "hint": "Automated decisions and human-in-the-loop setting."
   }
  },
  {
   "id": "DPIA-180",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Can the organization explain the purpose of the algorithmic processing?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-181",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Has algorithmic bias or unfair outcome risk been assessed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-182",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Could inappropriate algorithmic outcomes cause harm to Data Principals?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-183",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Are AI models trained using excessive personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-184",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Is personal data retained inside models, embeddings or vector stores?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-185",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Are prompts/inputs containing personal data retained?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-186",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Are third-party AI services processing personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ai",
    "fields": "sampleData.ai.type (vendor)",
    "hint": "Third-party AI services."
   }
  },
  {
   "id": "DPIA-187",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Has the AI provider's data-use policy been assessed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-188",
   "domain": "AI",
   "subDomain": "AI & Analytics",
   "text": "Are AI/model risks documented and treated?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ai",
    "fields": "sampleData.ai.tier, st",
    "hint": "AI risk tier and status."
   }
  },
  {
   "id": "DPIA-189",
   "domain": "CHILD",
   "subDomain": "Children",
   "text": "Does the organization process children's personal data?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response",
   "prefill": {
    "module": "ropa",
    "fields": "act.dpc includes children",
    "hint": "Children as data principals."
   }
  },
  {
   "id": "DPIA-190",
   "domain": "CHILD",
   "subDomain": "Children",
   "text": "How is age determined for applicable processing?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "text+response"
  },
  {
   "id": "DPIA-191",
   "domain": "CHILD",
   "subDomain": "Children",
   "text": "How is parental consent/verification handled where applicable?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "text+response",
   "prefill": {
    "module": "consent",
    "fields": "consents (parental)",
    "hint": "Parental consent records, if modelled."
   }
  },
  {
   "id": "DPIA-192",
   "domain": "CHILD",
   "subDomain": "Children",
   "text": "Are child-specific risks assessed?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-193",
   "domain": "CHILD",
   "subDomain": "Children",
   "text": "Are profiling/behavioural monitoring activities involving children identified?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 31000"
   ],
   "answerFormat": "response"
  },
  {
   "id": "DPIA-194",
   "domain": "CHILD",
   "subDomain": "Children",
   "text": "Are controls preventing inappropriate processing implemented?",
   "questionType": "Core",
   "frameworks": [
    "DPDPA",
    "ISO 27001",
    "ISO 22301",
    "ISO 20000",
    "ISO 31000"
   ],
   "answerFormat": "response"
  }
 ]
};

export default DPIA_CHECKLIST;
