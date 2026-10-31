const STORAGE_KEY = "privacysek.cookie-consent.demo.v2";
const DAY = 24 * 60 * 60 * 1000;
const clone = value => JSON.parse(JSON.stringify(value));

export const ALL_LANGUAGES = [
  { code: "en", name: "English (United States)", native: "English" },
  { code: "es", name: "Spanish (Spain)", native: "Español" },
  { code: "fr", name: "French (France)", native: "Français" },
  { code: "de", name: "German (Standard)", native: "Deutsch" },
  { code: "it", name: "Italian (Italy)", native: "Italiano" },
  { code: "pt", name: "Portuguese (Portugal)", native: "Português" },
  { code: "nl", name: "Dutch (Standard)", native: "Nederlands" },
  { code: "bg", name: "Bulgarian (Bulgaria)", native: "Български" },
  { code: "hi", name: "Hindi (India)", native: "हिन्दी" },
  { code: "zh", name: "Chinese (PRC)", native: "简体中文" },
  { code: "ja", name: "Japanese (Japan)", native: "日本語" },
  { code: "ar", name: "Arabic (Standard)", native: "العربية" },
  { code: "ru", name: "Russian (Russia)", native: "Русский" },
];

export const LANGUAGE_TRANSLATIONS = {
  "English (United States)": {
    title: "We Care About Your Privacy",
    description: "By clicking \"Accept All\" you provide consent to our website, sub-domains and all the third parties mentioned in our Privacy and Cookies Preference Setting to store cookies and other technologies to enhance your experience on our website, process your personal data, show you personalized content and advertisements, analyze website efficiency, and improve our marketing efforts.",
    privacyText: "Privacy Policy",
    acceptLabel: "Accept All",
    rejectLabel: "Disable All",
    customizeLabel: "Privacy Settings",
    saveLabel: "Save Preferences",
    prefTitle: "Privacy Preferences Center",
    prefDesc: "When you visit any website, it may store or retrieve information on your browser, mostly in the form of cookies. You can choose not to allow some types of cookies. Review each category below to manage your preferences.",
    vendorListText: "List of Vendors",
  },
  "Spanish (Spain)": {
    title: "Nos importa su privacidad",
    description: "Al hacer clic en «Aceptar todo», autoriza a nuestro sitio web, subdominios y terceros mencionados en nuestras Preferencias de Cookies a almacenar cookies y tecnologías similares para mejorar su experiencia, personalizar contenidos y publicidad y analizar la eficiencia del sitio.",
    privacyText: "Política de privacidad",
    acceptLabel: "Aceptar todo",
    rejectLabel: "Desactivar todo",
    customizeLabel: "Ajustes de privacidad",
    saveLabel: "Guardar preferencias",
    prefTitle: "Centro de preferencias de privacidad",
    prefDesc: "Al visitar cualquier sitio web, este puede almacenar o recuperar información en su navegador, principalmente mediante cookies. Puede elegir no permitir ciertos tipos de cookies.",
    vendorListText: "Lista de proveedores",
  },
  "French (France)": {
    title: "Votre vie privée nous tient à cœur",
    description: "En cliquant sur « Tout accepter », vous consentez à ce que notre site web et ses partenaires tiers stockent des cookies et technologies associées pour améliorer votre navigation, mesurer l'audience et diffuser des publicités personnalisées.",
    privacyText: "Politique de confidentialité",
    acceptLabel: "Tout accepter",
    rejectLabel: "Tout désactiver",
    customizeLabel: "Paramètres de confidentialité",
    saveLabel: "Enregistrer mes choix",
    prefTitle: "Centre de préférences de confidentialité",
    prefDesc: "Lors de vos visites sur notre site, des informations peuvent être stockées sur votre navigateur sous forme de cookies. Vous pouvez modifier vos préférences ci-dessous.",
    vendorListText: "Liste des fournisseurs",
  },
  "German (Standard)": {
    title: "Ihre Privatsphäre ist uns wichtig",
    description: "Mit dem Klick auf «Alle akzeptieren» stimmen Sie der Verwendung von Cookies und ähnlichen Technologien zu, um Ihre Benutzererfahrung zu verbessern, personalisierte Inhalte anzuzeigen und den Datenverkehr zu analysieren.",
    privacyText: "Datenschutzerklärung",
    acceptLabel: "Alle akzeptieren",
    rejectLabel: "Alle deaktivieren",
    customizeLabel: "Datenschutzeinstellungen",
    saveLabel: "Einstellungen speichern",
    prefTitle: "Datenschutz-Präferenzzentrum",
    prefDesc: "Wenn Sie eine Website besuchen, können Informationen in Ihrem Browser gespeichert oder abgerufen werden. Sie können bestimmte Cookie-Kategorien unten anpassen.",
    vendorListText: "Liste der Anbieter",
  },
  "Italian (Italy)": {
    title: "La tua privacy è importante per noi",
    description: "Facendo clic su «Accetta tutto», acconsenti all'uso dei cookie e delle tecnologie correlate da parte del nostro sito e dei nostri partner per ottimizzare la navigazione e misurare le prestazioni.",
    privacyText: "Informativa sulla privacy",
    acceptLabel: "Accetta tutto",
    rejectLabel: "Disabilita tutto",
    customizeLabel: "Impostazioni privacy",
    saveLabel: "Salva preferenze",
    prefTitle: "Centro preferenze privacy",
    prefDesc: "Durante la visita a un sito web, possono essere memorizzate informazioni sul browser sotto forma di cookie. Puoi gestire le tue scelte qui sotto.",
    vendorListText: "Elenco dei fornitori",
  },
  "Portuguese (Portugal)": {
    title: "Cuidamos da sua privacidade",
    description: "Ao clicar em «Aceitar tudo», você concorda com o uso de cookies e tecnologias semelhantes para aprimorar sua experiência e exibir conteúdo personalizado.",
    privacyText: "Política de privacidade",
    acceptLabel: "Aceitar tudo",
    rejectLabel: "Desativar tudo",
    customizeLabel: "Configurações de privacidade",
    saveLabel: "Salvar preferências",
    prefTitle: "Centro de preferências de privacidade",
    prefDesc: "Ao visitar qualquer sítio web, informações podem ser armazenadas no seu navegador na forma de cookies. Você pode personalizar suas preferências abaixo.",
    vendorListText: "Lista de fornecedores",
  },
  "Dutch (Standard)": {
    title: "Wij geven om uw privacy",
    description: "Door op «Alles accepteren» te klikken stemt u in met het opslaan van cookies en soortgelijke technologieën om uw ervaring te verbeteren en advertenties te personaliseren.",
    privacyText: "Privacybeleid",
    acceptLabel: "Alles accepteren",
    rejectLabel: "Alles uitschakelen",
    customizeLabel: "Privacy-instellingen",
    saveLabel: "Voorkeuren opslaan",
    prefTitle: "Voorkeurscentrum voor privacy",
    prefDesc: "Wanneer u een website bezoekt, kan er informatie in uw browser worden opgeslagen in de vorm van cookies.",
    vendorListText: "Lijst met leveranciers",
  },
  "Bulgarian (Bulgaria)": {
    title: "Грижим се за вашата поверителност",
    description: "С натискането на «Приемам всички» се съгласявате с използването на бисквитки за подобряване на вашето преживяване и персонализиране на съдържанието.",
    privacyText: "Политика за поверителност",
    acceptLabel: "Приемам всички",
    rejectLabel: "Деактивиране на всички",
    customizeLabel: "Настройки за поверителност",
    saveLabel: "Запазване на настройките",
    prefTitle: "Център за предпочитания за поверителност",
    prefDesc: "Можете да управлявате съгласието си за всяка категория бисквитки отдолу.",
    vendorListText: "Списък с доставчици",
  },
  "Hindi (India)": {
    title: "हम आपकी गोपनीयता का सम्मान करते हैं",
    description: "«सभी स्वीकार करें» पर क्लिक करके, आप हमारी वेबसाइट और भागीदारों को अपनी प्राथमिकताओं के अनुसार कुकीज़ संग्रहीत करने की सहमति देते हैं।",
    privacyText: "गोपनीयता नीति",
    acceptLabel: "सभी स्वीकार करें",
    rejectLabel: "सभी अस्वीकार करें",
    customizeLabel: "गोपनीयता सेटिंग्स",
    saveLabel: "प्राथमिकताएं सहेजें",
    prefTitle: "गोपनीयता प्राथमिकता केंद्र",
    prefDesc: "वे श्रेणियां चुनें जिनकी आप अनुमति देना चाहते हैं। आवश्यक कुकीज़ हमेशा सक्रिय रहती हैं।",
    vendorListText: "विक्रेताओं की सूची",
  },
  "Chinese (PRC)": {
    title: "我们重视您的隐私",
    description: "点击“全部接受”，即表示您同意在您的设备上存储Cookie以提升体验、展示个性化内容并分析流量。",
    privacyText: "隐私政策",
    acceptLabel: "全部接受",
    rejectLabel: "全部禁用",
    customizeLabel: "隐私设置",
    saveLabel: "保存首选项",
    prefTitle: "隐私首选项中心",
    prefDesc: "您可以根据需要配置不同类别的Cookie首选项。",
    vendorListText: "供应商列表",
  },
  "Japanese (Japan)": {
    title: "お客様のプライバシーを尊重します",
    description: "「すべて同意」をクリックすると、Cookieやトラッキング技術の使用に同意したことになります。",
    privacyText: "プライバシーポリシー",
    acceptLabel: "すべて同意",
    rejectLabel: "すべて無効化",
    customizeLabel: "プライバシー設定",
    saveLabel: "設定を保存",
    prefTitle: "プライバシー設定センター",
    prefDesc: "必須Cookieは常に有効です。その他のCookieカテゴリを以下で設定できます。",
    vendorListText: "ベンダーリスト",
  },
  "Arabic (Standard)": {
    title: "نحن نهتم بخصوصيتك",
    description: "بالنقر فوق «قبول الكل»، فإنك توافق على تخزين ملفات تعريف الارتباط والتقنيات ذات الصلة لتحسين تجربتك وتخصيص الإعلانات.",
    privacyText: "سياسة الخصوصية",
    acceptLabel: "قبول الكل",
    rejectLabel: "تعطيل الكل",
    customizeLabel: "إعدادات الخصوصية",
    saveLabel: "حفظ التفضيلات",
    prefTitle: "مركز تفضيلات الخصوصية",
    prefDesc: "يمكنك إدارة تفضيلاتك لملفات تعريف الارتباط من الخيارات أدناه.",
    vendorListText: "قائمة المزودين",
  },
  "Russian (Russia)": {
    title: "Мы заботимся о вашей конфиденциальности",
    description: "Нажимая «Принять все», вы даете согласие на сохранение файлов cookie для улучшения работы сайта и аналитики.",
    privacyText: "Политика конфиденциальности",
    acceptLabel: "Принять все",
    rejectLabel: "Отключить все",
    customizeLabel: "Настройки конфиденциальности",
    saveLabel: "Сохранить настройки",
    prefTitle: "Центр управления конфиденциальностью",
    prefDesc: "Вы можете настроить параметры разрешенных файлов cookie ниже.",
    vendorListText: "Список поставщиков",
  },
};

export const INITIAL_IAB_VENDORS = [
  { id: "iab-1", name: "Quantcast", policy: "https://www.quantcast.com/privacy/", purposes: ["Store/access device info", "Audience research", "Personalized ads"], enabled: true },
  { id: "iab-2", name: "The UK Trade Desk Ltd", policy: "https://www.thetradedesk.com/general/privacy", purposes: ["Personalized ads", "Ad measurement", "Profile building"], enabled: true },
  { id: "iab-3", name: "Captify Technologies Limited", policy: "https://www.captifytechnologies.com/privacy-policy/", purposes: ["Search intent", "Audience measurement"], enabled: true },
  { id: "iab-4", name: "Index Exchange Inc.", policy: "https://www.indexexchange.com/privacy/", purposes: ["Ad delivery", "Measurement", "Device recognition"], enabled: true },
  { id: "iab-5", name: "RTB House S.A.", policy: "https://www.rtbhouse.com/privacy-center/", purposes: ["Retargeting", "Ad personalization"], enabled: true },
  { id: "iab-6", name: "Nexxen Inc.", policy: "https://nexxen.com/privacy-policy/", purposes: ["Video ads", "Audience intelligence"], enabled: true },
  { id: "iab-7", name: "Epsilon", policy: "https://www.epsilon.com/privacy-policy", purposes: ["Cross-device measurement", "Identity resolution"], enabled: true },
  { id: "iab-8", name: "Triple Lift, Inc.", policy: "https://triplelift.com/privacy/", purposes: ["Native advertising", "Content matching"], enabled: true },
  { id: "iab-9", name: "Ogury Ltd", policy: "https://ogury.com/privacy-policy/", purposes: ["Mobile ad tech", "Consent verification"], enabled: true },
  { id: "iab-10", name: "Xandr, Inc.", policy: "https://about.ads.microsoft.com/privacy", purposes: ["Programmatic marketplace", "Personalized ads"], enabled: true },
  { id: "iab-11", name: "Sovrn, Inc.", policy: "https://www.sovrn.com/privacy-policy/", purposes: ["Publisher monetization", "Audience insights"], enabled: true },
  { id: "iab-12", name: "ShareThis, Inc", policy: "https://sharethis.com/privacy/", purposes: ["Social sharing analytics", "Demographic insights"], enabled: true },
  { id: "iab-13", name: "Criteo SA", policy: "https://www.criteo.com/privacy/", purposes: ["Dynamic retargeting", "Commerce media"], enabled: true },
  { id: "iab-14", name: "Exponential Interactive, Inc d/b/a VDX.tv", policy: "https://vdx.tv/privacy/", purposes: ["Video advertising", "Brand engagement"], enabled: true },
  { id: "iab-15", name: "BeeswaxIO Corporation", policy: "https://www.beeswax.com/privacy/", purposes: ["Custom bidder tech", "Frequency capping"], enabled: true },
  { id: "iab-16", name: "AdSpirit GmbH", policy: "https://www.adspirit.com/privacy/", purposes: ["Ad serving", "Click tracking"], enabled: true },
  { id: "iab-17", name: "Roq.ad GmbH", policy: "https://roq.ad/privacy-policy/", purposes: ["Cross-device graph", "Identity matching"], enabled: true },
  { id: "iab-18", name: "Taboola Europe Limited", policy: "https://www.taboola.com/policies/privacy-policy", purposes: ["Content recommendation", "Sponsored content"], enabled: true },
];

export const INITIAL_GOOGLE_VENDORS = [
  { id: "g-1", name: "Meta (Facebook Technologies)", policy: "https://www.facebook.com/privacy/policy", domains: ["facebook.com", "meta.com"], enabled: true },
  { id: "g-2", name: "Booking.com B.V.", policy: "https://www.booking.com/privacy.html", domains: ["booking.com"], enabled: true },
  { id: "g-3", name: "IBM Corporation", policy: "https://www.ibm.com/privacy", domains: ["ibm.com", "security.ibm.com"], enabled: true },
  { id: "g-4", name: "Constant Contact, Inc.", policy: "https://www.constantcontact.com/legal/privacy-notice", domains: ["constantcontact.com"], enabled: true },
  { id: "g-5", name: "Forbes Media LLC", policy: "https://www.forbes.com/fdc/privacy.html", domains: ["forbes.com"], enabled: true },
  { id: "g-6", name: "DAC (D.A.Consortium Inc.)", policy: "https://www.dac.co.jp/english/utility/privacy-policy", domains: ["dac.co.jp"], enabled: true },
  { id: "g-7", name: "AdPredictive", policy: "https://adpredictive.com/privacy-policy/", domains: ["adpredictive.com"], enabled: true },
  { id: "g-8", name: "Artsai", policy: "https://artsai.com/privacy/", domains: ["artsai.com"], enabled: true },
  { id: "g-9", name: "Akamai Technologies", policy: "https://www.akamai.com/legal/privacy-statement", domains: ["akamai.com"], enabled: true },
  { id: "g-10", name: "direct interactive", policy: "https://direct-interactive.de/datenschutz", domains: ["direct-interactive.de"], enabled: true },
  { id: "g-11", name: "Goodway Group", policy: "https://goodwaygroup.com/privacy-policy", domains: ["goodwaygroup.com"], enabled: true },
  { id: "g-12", name: "GroovinAds", policy: "https://groovinads.com/privacy", domains: ["groovinads.com"], enabled: true },
];

export const REGION_COUNTRY_OPTIONS = {
  "EEA & UK": [
    "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Estonia",
    "Finland", "France", "Germany", "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania",
    "Luxembourg", "Malta", "Netherlands", "Poland", "Portugal", "Romania", "Slovakia", "Slovenia",
    "Spain", "Sweden", "United Kingdom", "Norway", "Iceland", "Liechtenstein"
  ],
  "USA": [
    "California (CCPA/CPRA)", "Virginia (VCDPA)", "Colorado (CPA)", "Connecticut (CTDPA)", "Utah (UCPA)",
    "Texas (TDPSA)", "Oregon (OCPA)", "Montana (MCDPA)", "Florida (FDBR)", "Washington (MHMDA)",
    "Delaware (DPDA)", "New Jersey", "All US States"
  ],
  "India": [
    "India (Pan-India DPDPA)", "Andhra Pradesh", "Delhi NCT", "Gujarat", "Karnataka", "Maharashtra",
    "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal", "All Indian States"
  ],
  "Global": [
    "Worldwide (All other non-specified jurisdictions)", "Canada (PIPEDA)", "Australia (Privacy Act)",
    "Brazil (LGPD)", "Japan (APPI)", "Singapore (PDPA)", "Switzerland (nFADP)"
  ],
};

const categories = [
  { id: "necessary", name: "Necessary", description: "Supports core site features, authentication, and security. Cannot be disabled.", required: true, defaultState: true, showInPref: true },
  { id: "functional", name: "Functional", description: "Remembers optional settings such as language, theme, and saved items.", required: false, defaultState: false, showInPref: true },
  { id: "analytics", name: "Analytics", description: "Measures site usage to help teams understand visitor engagement and optimize journeys.", required: false, defaultState: false, showInPref: true },
  { id: "marketing", name: "Marketing", description: "Enables promotional campaigns, cross-device marketing attribution, and conversion tracking across channels.", required: false, defaultState: false, showInPref: true },
  { id: "advertising", name: "Advertising", description: "Supports marketing attribution, relevant advertising, and campaign measurement across platforms.", required: false, defaultState: false, showInPref: true },
  { id: "social_media", name: "Social Media", description: "Enables social sharing buttons, embedded media players, and community widgets.", required: false, defaultState: false, showInPref: true },
];

const initialCookies = [
  ["privacysek-session", "necessary", "First-party", "PrivacySEK", "Session", "Maintains an active authenticated visitor session.", true, true],
  ["consent-state", "necessary", "First-party", "PrivacySEK", "12 months", "Stores the visitor's verified consent choices and timestamps.", true, true],
  ["lang_pref", "functional", "First-party", "PrivacySEK", "6 months", "Remembers the selected display language for the banner and interface.", false, true],
  ["theme_pref", "functional", "First-party", "PrivacySEK", "6 months", "Remembers the selected interface appearance and contrast settings.", false, true],
  ["_ga", "analytics", "Third-party", "Google Analytics", "13 months", "Distinguishes visitors in the analytics pipeline.", false, true],
  ["_gid", "analytics", "Third-party", "Google Analytics", "24 hours", "Groups page views into short visitor sessions.", false, true],
  ["_cl_demo", "analytics", "Third-party", "Clarity Insights", "30 days", "Unique identifier for session heatmaps and engagement measurement.", false, true],
  ["campaign_ref", "marketing", "First-party", "PrivacySEK", "30 days", "Attributes inbound referral campaigns to landing pages.", false, true],
  ["_fbp", "advertising", "Third-party", "Meta Platforms", "90 days", "Stores and tracks visits across websites for advertising attribution.", false, true],
  ["ad_demo_id", "advertising", "Third-party", "The Trade Desk", "90 days", "Campaign measurement and frequency capping identifier.", false, true],
  ["video-player-id", "social_media", "Third-party", "Media CDN", "Session", "Maintains video player volume and playback state.", false, false],
  ["support-session", "functional", "Third-party", "Support Desk", "30 days", "Maintains customer support chat session state.", false, false],
].map((cookie, index) => ({
  id: `cookie-${index + 1}`,
  name: cookie[0],
  category: cookie[1],
  domain: cookie[2] === "First-party" ? "demo.privacysek.example" : `${cookie[3].toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`,
  path: "/",
  purpose: categories.find(category => category.id === cookie[1])?.name || "Needs review",
  party: cookie[2],
  provider: cookie[3],
  duration: cookie[4],
  description: cookie[5],
  httpOnly: cookie[6],
  secure: cookie[7],
  sameSite: "Lax",
  lastDetected: new Date(Date.now() - index * DAY).toISOString(),
  sourcePage: "https://demo.privacysek.example/",
  classificationStatus: cookie[1] === "unclassified" ? "Review required" : "Reviewed",
  scanId: "scan-initial",
}));

const tag = (id, host, category, status) => ({
  id,
  host,
  source: `https://${host}/demo-script.js`,
  type: "JavaScript",
  category,
  status,
  lastDetected: "2026-10-24",
  reason: category === "unclassified" ? "Category needs review before a consent-based decision." : `${category} is optional in the current demo consent state.`,
});

export function createDefaultBannerConfig() {
  return {
    title: "We Care About Your Privacy",
    description: "By clicking \"Accept All\" you provide consent to our website, sub-domains and all the third parties mentioned in our Privacy and Cookies Preference Setting to store cookies and other technologies to enhance your experience on our website, process your personal data, show you personalized content and advertisements, analyze website efficiency, and improve our marketing efforts.",
    privacyText: "Privacy Policy",
    privacyUrl: "/privacy-policy",
    acceptLabel: "Accept All",
    rejectLabel: "Disable All",
    customizeLabel: "Privacy Settings",
    saveLabel: "Save Preferences",
    layout: "bottom-bar", // "bottom-bar" | "top-bar" | "modal" | "corner-card"
    accent: "#14B8A6",
    borderRadius: "12px",
    theme: "dark", // "dark" | "light"
    secondaryButtonStyle: "outline", // "outline" | "subtle"
    // Multiple languages selected by default (no single default)
    enabledLanguages: [
      "English (United States)",
      "Spanish (Spain)",
      "French (France)",
      "German (Standard)",
      "Hindi (India)",
      "Italian (Italy)"
    ],
    currentEditLanguage: "English (United States)",
    previewLanguage: "English (United States)",
    preference: {
      layout: "modal", // "modal" | "drawer" | "accordion"
      title: "Privacy Preferences Center",
      description: "When you visit any website, it may store or retrieve information on your browser, mostly in the form of cookies. This information might be about you, your preferences or your device and is mostly used to make the site work as you expect it to. Because we respect your right to privacy, you can choose not to allow some types of cookies.",
      saveLabel: "Save Preferences",
      rejectLabel: "Disable All",
      vendorListText: "List of Vendors",
    },
    regions: {
      "EEA & UK": {
        enabled: true,
        targetCountries: ["Belgium", "Bulgaria", "France", "Germany", "Italy", "Spain", "United Kingdom", "Netherlands"],
        enableIab: true,
        googleVendors: true,
        gdprEverywhere: false,
        showPrivacyTab: true,
        actions: ["Accept All", "Reject All", "Customize"],
        validityDays: 180,
        regulation: "GDPR",
        notice: {
          title: "We Care About Your Privacy",
          description: "By clicking \"Accept All\" you provide consent to our website, sub-domains and all third parties mentioned in our Privacy Preference Center to store cookies and technologies. You can reject optional cookies or customize your settings.",
          acceptLabel: "Accept All",
          rejectLabel: "Disable All",
          customizeLabel: "Privacy Settings",
        }
      },
      "USA": {
        enabled: true,
        targetCountries: ["California (CCPA/CPRA)", "Virginia (VCDPA)", "Colorado (CPA)", "Connecticut (CTDPA)", "Utah (UCPA)"],
        enableIab: false,
        googleVendors: true,
        gdprEverywhere: false,
        showPrivacyTab: true,
        actions: ["Accept All", "Reject All", "Customize", "Do Not Sell"],
        validityDays: 180,
        regulation: "CCPA",
        notice: {
          title: "Your Privacy Rights & Choices",
          description: "We use cookies to analyze site traffic, personalize content, and support marketing. Under US State Privacy Laws, you have the right to opt out of the sale or sharing of your personal information.",
          acceptLabel: "Accept All",
          rejectLabel: "Reject Optional",
          customizeLabel: "Privacy Settings",
        }
      },
      "India": {
        enabled: true,
        targetCountries: ["India (Pan-India DPDPA)"],
        enableIab: false,
        googleVendors: true,
        gdprEverywhere: false,
        showPrivacyTab: true,
        actions: ["Accept All", "Reject All", "Customize"],
        validityDays: 180,
        regulation: "DPDPA",
        notice: {
          title: "Cookie Consent & Privacy Notice (DPDP Act)",
          description: "In accordance with India's Digital Personal Data Protection Act (DPDPA), we request your consent before setting non-essential cookies. You have the right to withdraw or customize your consent at any time.",
          acceptLabel: "Accept All",
          rejectLabel: "Disable All",
          customizeLabel: "Privacy Settings",
        }
      },
      "Global": {
        enabled: true,
        targetCountries: ["Worldwide (All other non-specified jurisdictions)"],
        enableIab: false,
        googleVendors: true,
        gdprEverywhere: false,
        showPrivacyTab: true,
        actions: ["Accept All", "Reject All", "Customize"],
        validityDays: 180,
        regulation: "Global",
        notice: {
          title: "We Care About Your Privacy",
          description: "By clicking \"Accept All\" you provide consent to store cookies and similar technologies to enhance your experience, process personal data, and analyze website efficiency.",
          acceptLabel: "Accept All",
          rejectLabel: "Disable All",
          customizeLabel: "Privacy Settings",
        }
      },
    },
    config: {
      defaultRegulation: "GDPR",
      cookieBlocking: "Automatic",
      enableGpp: true,
      showWatermark: true,
      muteCookieNotice: false,
      showDisabledButton: true,
      showCloseButton: true,
      zIndex: 9999,
      googleConsentMode: true,
      googleConsentSignals: {
        ad_storage: true,
        analytics_storage: true,
        ad_user_data: true,
        ad_personalization: true,
      },
      microsoftUetConsent: true,
      badge: {
        show: true,
        position: "bottom-left", // "bottom-left" | "bottom-right"
        label: "Privacy Settings",
      },
    },
    displayFrequency: {
      validityDays: 180,
      showEveryVisit: false,
      repromptOnPolicyChange: true,
      revisitBadge: true,
    },
    vendors: {
      iabEnabled: true,
      googleVendorsEnabled: true,
      iabList: clone(INITIAL_IAB_VENDORS),
      googleList: clone(INITIAL_GOOGLE_VENDORS),
    },
  };
}

function createInitialCookieState() {
  let seed = 41;
  const random = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const countries = ["India", "Germany", "France", "United States", "United Kingdom", "Spain"];
  const devices = ["Desktop", "Mobile", "Tablet"];
  const actions = ["Accept All", "Reject All", "Customize", "Save Preferences", "Close", "Do Not Sell"];
  const pageViews = [];
  const consentRecords = [];
  const today = new Date();
  for (let day = 89; day >= 0; day -= 1) {
    const date = new Date(today.getTime() - day * DAY);
    date.setHours(12, 0, 0, 0);
    const dateKey = date.toISOString().slice(0, 10);
    const views = 160 + Math.floor(random() * 110);
    pageViews.push({ date: dateKey, count: views });
    const eventCount = 5 + Math.floor(random() * 8);
    for (let index = 0; index < eventCount; index += 1) {
      const actionRoll = random();
      const action = actions[actionRoll < 0.39 ? 0 : actionRoll < 0.53 ? 1 : actionRoll < 0.66 ? 2 : actionRoll < 0.79 ? 3 : actionRoll < 0.94 ? 4 : 5];
      const selected = {
        necessary: true,
        functional: action === "Accept All" || (action === "Save Preferences" && random() > 0.45),
        analytics: action === "Accept All" || (action === "Save Preferences" && random() > 0.5),
        advertising: action === "Accept All" || (action === "Save Preferences" && random() > 0.65),
        social_media: action === "Accept All" || (action === "Save Preferences" && random() > 0.7),
      };
      consentRecords.push({
        id: `receipt-${1000 + consentRecords.length}`,
        property: "demo.privacysek.example",
        timestamp: new Date(date.getTime() - Math.floor(random() * 10 * 60 * 60 * 1000)).toISOString(),
        action,
        categories: selected,
        result: action === "Close" ? "No change" : action === "Reject All" ? "Optional categories off" : "Choice recorded",
        version: 1,
        source: action === "Do Not Sell" ? "Global Privacy Control" : "Consent banner",
        device: devices[Math.floor(random() * devices.length)],
        region: countries[Math.floor(random() * countries.length)],
      });
    }
  }

  const demoCategories = clone(categories);
  const cookies = clone(initialCookies);
  const banner = createDefaultBannerConfig();

  return {
    version: 2,
    categories: demoCategories,
    cookies,
    reviewQueue: cookies.filter(cookie => cookie.classificationStatus === "Review required").map((cookie, index) => ({
      ...cookie,
      id: `review-${index + 1}`,
      suggestedCategory: "Unclassified",
      confidence: null,
      discoveredAt: cookie.lastDetected,
    })),
    pageViews,
    consentRecords,
    scans: [],
    schedules: [],
    blockedTags: [
      tag("tag-analytics", "insights.example", "analytics", "Enabled"),
      tag("tag-ads", "campaigns.example", "advertising", "Enabled"),
    ],
    availableTags: [
      tag("tag-video", "media.example", "social_media", "Available"),
      tag("tag-support", "support.example", "functional", "Available"),
    ],
    draft: clone(banner),
    published: clone(banner),
    versions: [
      {
        version: 1,
        publishedAt: new Date(today.getTime() - 14 * DAY).toISOString(),
        publishedBy: "Security Lead (admin@privacysek.example)",
        config: clone(banner),
        note: "Initial production consent banner deployment"
      }
    ],
    visitor: {
      status: "No decision",
      categories: { necessary: true, functional: false, analytics: false, marketing: false, advertising: false, social_media: false },
      updatedAt: null,
    },
    notifications: [],
  };
}

export function createCookieDemoState() {
  return createInitialCookieState();
}

export function saveCookieDemoState(_state) {
  // Authoritative state is persisted in MongoDB via backend APIs.
  // LocalStorage is no longer used for application persistence.
}

export function resetCookieDemoState() {
  return createInitialCookieState();
}
