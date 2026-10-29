import Cockpit, { createCockpitView, registerCockpitActions } from "../modules/cockpit/Cockpit.jsx";
import Discovery, { createDiscoveryView, registerDiscoveryActions } from "../modules/discovery/Discovery.jsx";
import DataLineage, { createDataLineageView, registerDataLineageActions } from "../modules/lineage/DataLineage.jsx";
import DataMapRopa, { createDataMapRopaView, registerDataMapRopaActions } from "../modules/ropa/DataMapRopa.jsx";
import PersonFinder, { createPersonFinderView, registerPersonFinderActions } from "../modules/finder/PersonFinder.jsx";
import Notices, { createNoticesView, registerNoticesActions } from "../modules/notices/Notices.jsx";
import Consent, { createConsentView, registerConsentActions } from "../modules/consent/Consent.jsx";
import CookieConsent, { createCookieConsentView, registerCookieConsentActions } from "../modules/cookies/CookieConsent.jsx";
import PurposeGuard, { createPurposeGuardView, registerPurposeGuardActions } from "../modules/purpose-guard/PurposeGuard.jsx";
import Retention, { createRetentionView } from "../modules/retention/Retention.jsx";
import VendorRisk, { createVendorRiskView, registerVendorRiskActions } from "../modules/vendors/VendorRisk.jsx";
import RightsRequests, { createRightsRequestsView, registerRightsRequestsActions } from "../modules/rights/RightsRequests.jsx";
import BreachResponse, { createBreachResponseView, registerBreachResponseActions } from "../modules/breach/BreachResponse.jsx";
import Assessments, { createAssessmentsView, registerAssessmentsActions } from "../modules/assessments/Assessments.jsx";
import ProofLedger, { createProofLedgerView, registerProofLedgerActions } from "../modules/proof-ledger/ProofLedger.jsx";
import Reports, { createReportsView, registerReportsActions } from "../modules/reports/Reports.jsx";
import AiGovernance, { createAiGovernanceView, registerAiGovernanceActions } from "../modules/ai-governance/AiGovernance.jsx";
import Training, { createTrainingView } from "../modules/training/Training.jsx";
import TrustCenter, { createTrustCenterView } from "../modules/trust-center/TrustCenter.jsx";
import Workflows, { createWorkflowsView } from "../modules/workflows/Workflows.jsx";
import Integrations, { createIntegrationsView } from "../modules/integrations/Integrations.jsx";
import Settings, { createSettingsView } from "../modules/settings/Settings.jsx";

export const MODULE_RENDERERS = {
  cockpit: createCockpitView,
  discovery: createDiscoveryView,
  lineage: createDataLineageView,
  ropa: createDataMapRopaView,
  finder: createPersonFinderView,
  notices: createNoticesView,
  consent: createConsentView,
  cookies: createCookieConsentView,
  guard: createPurposeGuardView,
  retention: createRetentionView,
  vendors: createVendorRiskView,
  rights: createRightsRequestsView,
  breach: createBreachResponseView,
  assess: createAssessmentsView,
  ledger: createProofLedgerView,
  reports: createReportsView,
  ai: createAiGovernanceView,
  training: createTrainingView,
  trust: createTrustCenterView,
  workflows: createWorkflowsView,
  integrations: createIntegrationsView,
  settings: createSettingsView,
};

export const MODULE_COMPONENTS = {
  cockpit: Cockpit,
  discovery: Discovery,
  lineage: DataLineage,
  ropa: DataMapRopa,
  finder: PersonFinder,
  notices: Notices,
  consent: Consent,
  cookies: CookieConsent,
  guard: PurposeGuard,
  retention: Retention,
  vendors: VendorRisk,
  rights: RightsRequests,
  breach: BreachResponse,
  assess: Assessments,
  ledger: ProofLedger,
  reports: Reports,
  ai: AiGovernance,
  training: Training,
  trust: TrustCenter,
  workflows: Workflows,
  integrations: Integrations,
  settings: Settings,
};

export const MODULE_ACTIONS = {
  cockpit: registerCockpitActions,
  discovery: registerDiscoveryActions,
  lineage: registerDataLineageActions,
  ropa: registerDataMapRopaActions,
  finder: registerPersonFinderActions,
  notices: registerNoticesActions,
  consent: registerConsentActions,
  cookies: registerCookieConsentActions,
  guard: registerPurposeGuardActions,
  vendors: registerVendorRiskActions,
  rights: registerRightsRequestsActions,
  breach: registerBreachResponseActions,
  assess: registerAssessmentsActions,
  ledger: registerProofLedgerActions,
  reports: registerReportsActions,
  ai: registerAiGovernanceActions,
};
