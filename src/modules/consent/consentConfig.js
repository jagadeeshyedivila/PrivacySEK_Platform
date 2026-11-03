import { BUILDER_STEP_SVG_ICONS } from './consentIcons.js';

export const CONSENT_TOP_TABS = [
  ['dashboard', 'Dashboard', 'chart'],
  ['records', 'Consent Records', 'check'],
  ['builder', 'Preference Build Manager', 'gear'],
  ['jurisdictions', 'Jurisdictions', 'globe'],
  ['workflows', 'Workflow Updates', 'flow'],
  ['emails', 'Email Templates', 'inbox'],
  ['implementation', 'Implementation', 'plug']
];

export const BUILDER_STEPS = [
  'Settings',
  'Language',
  'Content',
  'Layout',
  'Purposes',
  'Preferences',
  'Save and Publish'
];

export const BUILDER_STEP_ICONS = BUILDER_STEP_SVG_ICONS;

export const BUILDER_SUBS = [
  'General',
  'Verification',
  'Branding',
  'Display',
  'Privacy & Legal',
  'Translation'
];

export const DATE_RANGES = [
  [7, 'Last 7 Days'],
  [30, 'Last 30 Days'],
  [90, 'Last 90 Days'],
  [365, 'This Year'],
  [9999, 'All time']
];

export function createConsentUiState() {
  return {
    topTab: 'dashboard',
    range: 365,
    dashCountry: 'all',
    userMenuOpen: false,

    // Records view state
    recordsSearch: '',
    recordsStatusFilter: '',
    recordsPage: 1,
    recordsPageSize: 10,
    recordsSortCol: 'created',
    recordsSortDir: -1,
    selectedRecordId: null,

    // Builder state
    builderStep: 0,
    builderSub: 'General',
    builderLanguageSearch: '',
    openAccordions: {},

    // Purposes & Preferences modal management
    purposeSearch: '',
    preferenceSearch: '',

    // Jurisdictions state
    jurisdictionSearch: '',
    jurisdictionPage: 1,
    jurisdictionPageSize: 10,
    jurisdictionStep: 0,
    jurisdictionData: null,
    regionSearch: '',

    // Workflows state
    workflowSearch: '',
    workflowView: 'list', // 'list' | 'editor'
    activeWorkflow: null,
    workflowDir: 'h', // 'h' | 'v'
    connectingNodeId: null,

    // Email state
    emailSenderDraft: '',
    emailSubjectDraft: '',

    // Modal state tracker
    activeModal: null // 'addRecord' | 'withdraw' | 'purposes' | 'addPurpose' | 'editPurpose' | 'preferences' | 'addPref' | 'editPref' | 'publishHistory' | 'publishConfirm' | 'preview' | 'jurisdictionWizard' | 'workflowIssues' | 'saveWorkflow' | 'newSender' | 'countryCodes' | 'emailPreview'
  };
}
