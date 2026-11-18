// Fixed wording for the Cookie Preference Center: tab names, labels, the Privacy Information
// tab and toasts. Everything an administrator can configure comes from the banner draft
// instead, and this file only supplies the fallback when that field is empty:
//   title, intro, Save / Reject / Accept labels, vendor link   Content section (draft.preference)
//   categories                                                 Purposes section (state.categories)
//   cookies in each category                                   Cookie Categories inventory (state.cookies)

export const PREFERENCE_CENTER_TEXT = {
  tabs: { purposes: "Purposes", privacy: "Privacy Information" },
  title: "Privacy Preference Center",
  intro:
    "We use cookies and similar technologies to store and read information about you, your device and your preferences. " +
    "Some of them are needed for the site to work as you expect; others help us understand how the site is used and make it more relevant to you. " +
    "Your privacy matters to us, so you decide which optional categories to allow. You can change your choices at any time from the Cookie Settings link at the bottom of every page.",
  introPreviewLength: 190,
  showMore: "Show More",
  showLess: "Show Less",
  alwaysAllow: "Always Allow",
  cookieLabels: { name: "Cookie", duration: "Duration", description: "Description", party: "Party", domain: "Domain" },
  buttons: { save: "Save My Choices", acceptAll: "Accept All", disableAll: "Disable All" },
  vendorList: "List of Vendors",
  // Privacy Information item added when contact details are configured; {brand} is the brand name
  contactTitle: "How can I contact you?",
  contactIntro: "{brand} is responsible for how your data is used on this site. To ask a question, withdraw your consent or exercise your rights, contact:",
  dataCollected: "Data collected",
  legalBasis: "Legal basis",
  noCookies: "No cookies of this type have been found on the site yet.",
  // Cookies in the inventory whose category is not configured in the Purposes section
  uncategorized: {
    id: "uncategorized",
    name: "Uncategorized Cookies",
    description: "These cookies were found on the site and are still being reviewed. We are working with their providers to place each one in the right category.",
  },
  privacyPolicy: "Privacy Policy",
  poweredBy: "Powered by:",
  privacyHeading: "Learn about privacy",
  privacySubheading: "Use this page to learn more about data privacy and how data is used to improve your site experience.",
  toasts: {
    saved: "Your preferences have been saved",
    acceptedAll: "All cookie categories allowed. Your preferences have been saved",
    disabledAll: "Optional cookies switched off. Your preferences have been saved",
    auditReset: "A new Audit ID has been generated",
  },
};

// Accordion on the Privacy Information tab. Each item is a list of blocks:
//   { type: "heading", text }       bold sub-heading
//   { type: "p", text }             paragraph; "{link}" is replaced by `link`
//   { type: "audit" }               the visitor's Audit ID and the reset link
export const PREFERENCE_CENTER_PRIVACY_INFO = [
  {
    id: "why-consent",
    title: "Why do you need my consent?",
    blocks: [
      { type: "heading", text: "Learn about privacy" },
      {
        type: "p",
        text:
          "Data protection laws such as the GDPR and India's DPDP Act require us to ask for your consent before we process personal data through cookies and similar identifiers. " +
          "When you agree, you allow us and our partners to use that data to give you the best experience on the site. " +
          "You can withdraw your consent at any time; some features of the site may then stop working as before.",
      },
    ],
  },
  {
    id: "cookie-info",
    title: "Cookie Information",
    blocks: [
      { type: "heading", text: "What is a cookie?" },
      {
        type: "p",
        text:
          "A cookie is a small text file that a website sends to your browser, which keeps it on your device. " +
          "It lets the site remember things such as where you left off, that you are signed in, and the settings you chose.",
      },
      { type: "heading", text: "How do they work?" },
      {
        type: "p",
        text:
          "Each time you come back, your browser sends the cookie to the site. That is how the site remembers items in your cart, what you clicked, which pages you visited and what you entered in forms.",
      },
    ],
  },
  {
    id: "why-data",
    title: "Why are you using my data?",
    blocks: [
      {
        type: "p",
        text:
          "We use data for a number of purposes and features, such as keeping the site secure, measuring how it is used and personalising content. " +
          "Your consent lets us improve our services for you. If you decline, some features may be limited.",
      },
    ],
  },
  {
    id: "who-processes",
    title: "Who is processing my data?",
    blocks: [
      {
        type: "p",
        text:
          "We and selected third-party vendors store and access information on your device. " +
          "Some vendors may process your data on the basis of their legitimate interest rather than consent. " +
          "To see who they are and how to object, {link}.",
        link: "click here",
      },
    ],
  },
  {
    id: "audit-id",
    title: "Audit ID",
    blocks: [
      {
        type: "p",
        text:
          "When you visit, we create a random, unique ID for your browser. We use it only to keep a record of your consent history: which cookie categories you allowed and when, the version of the vendor list you saw, and the time of each choice.",
      },
      { type: "audit", label: "MY AUDIT ID*", reset: "Reset my Audit ID" },
    ],
  },
];
