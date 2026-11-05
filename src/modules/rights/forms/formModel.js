// Web form model for the Rights Requests module: the standard fields, defaults, migration of
// older saved forms, publish checks and the translated labels used by the preview.
// No DOM access here, because the server imports this file through rightsData.js.

export const FORM_URL_BASE = "https://rights.aarohan.example/f/";
export const OPTION_TYPES = ["Select", "Radio", "Checkbox"];
export const SIZE_LIMITS = {
  headerSize: [14, 40],
  welcomeSize: [11, 20],
  footerSize: [10, 18],
  deadlineDays: [1, 90],
};

// Standard fields, in their default order. lock: cannot be removed. reqLock: always required.
// half: shares a row with the next half-width field in the preview.
export const STANDARD_FIELDS = [
  { key: "subject", label: "I am a", type: "Radio", required: true, lock: true, reqLock: true },
  { key: "type", label: "What would you like to do?", type: "Radio", required: true, lock: true, reqLock: true },
  { key: "first", label: "First name", type: "Textbox", required: true, lock: true, half: true },
  { key: "last", label: "Last name", type: "Textbox", required: true, lock: true, half: true },
  { key: "email", label: "Email", type: "Textbox", required: true, lock: true, reqLock: true, half: true },
  { key: "mobile", label: "Registered mobile", type: "Textbox", required: true, lock: true, half: true },
  { key: "state", label: "State", type: "Textbox", required: false, half: true },
  { key: "city", label: "City", type: "Textbox", required: false, half: true },
  { key: "details", label: "Request details", type: "Textarea", required: true },
];
export const standardField = key => STANDARD_FIELDS.find(f => f.key === key);

export const FORM_DEFAULTS = {
  status: "Draft",
  languages: ["English"],
  requestTypes: ["Access", "Correction", "Erasure"],
  subjectTypes: ["Customer"],
  logo: "",
  favicon: "",
  headerColor: "#0f766e",
  headerText: "#ffffff",
  headerSize: 24,
  welcomeColor: "#4a5570",
  welcomeSize: 13,
  footerColor: "#f1f3f6",
  footerTextColor: "#4a5570",
  footerSize: 12,
  welcome: "Use this form to exercise your rights over your personal data. We will respond within the timelines set by law.",
  footer: "Aarohan Finance Ltd · Grievance Officer: dpo@aarohan.example",
  thankYou: "Thank you. We have received your request and sent a confirmation to your email.",
  deadlineDays: 30,
  captcha: true,
  attachments: true,
  verifyOtp: true,
  verification: "OTP to registered mobile",
  systems: [],
  history: [],
};

const clone = o => JSON.parse(JSON.stringify(o));
const HEX = /^#[0-9a-f]{6}$/i;
export const IDENTIFIER = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function slugIdentifier(name, taken = []) {
  let base = String(name || "form").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "form";
  // Long names are cut at a word boundary
  if (base.length > 32) base = base.slice(0, 33).replace(/-[^-]*$/, "") || base.slice(0, 32);
  let id = base.length >= 3 ? base : `${base}-form`;
  for (let n = 2; taken.includes(id); n++) id = `${base}-${n}`;
  return id;
}

// The parts of a form that visitors see. Saved-vs-draft and saved-vs-published compare this.
const META_KEYS = ["id", "status", "created", "updated", "history", "published", "custom", "language"];
export function formContent(f) {
  const out = {};
  Object.keys(f || {}).sort().forEach(k => { if (!META_KEYS.includes(k)) out[k] = f[k]; });
  return out;
}
export const sameContent = (a, b) => JSON.stringify(formContent(a)) === JSON.stringify(formContent(b));
export const hasUnpublishedChanges = f => f.status === "Published" && !!f.published && !sameContent(f, f.published);

// Brings a form saved by an older version of the module up to date. Safe to run repeatedly.
export function normalizeForm(f) {
  Object.keys(FORM_DEFAULTS).forEach(k => {
    if (f[k] === undefined || f[k] === null) f[k] = clone(FORM_DEFAULTS[k]);
  });
  if (!Array.isArray(f.languages) || !f.languages.length) f.languages = [f.language || "English"];
  delete f.language;
  if (!f.identifier) f.identifier = String(f.id || "form").replace(/^form-/, "");
  ["headerColor", "headerText", "welcomeColor", "footerColor", "footerTextColor"].forEach(k => {
    if (!HEX.test(f[k])) f[k] = FORM_DEFAULTS[k];
  });
  Object.entries(SIZE_LIMITS).forEach(([k, [min, max]]) => {
    const n = Number(f[k]);
    f[k] = Number.isFinite(n) && n ? Math.min(max, Math.max(min, Math.round(n))) : FORM_DEFAULTS[k];
  });
  if (!Array.isArray(f.fields)) {
    f.fields = STANDARD_FIELDS.map(s => ({ key: s.key, label: s.label, required: s.required }))
      .concat((f.custom || []).map((c, i) => ({
        key: `c${i + 1}`, custom: true, type: c.type, label: c.label, required: !!c.required, options: c.options || [],
      })));
  }
  delete f.custom;
  // Standard fields keep their label and required flag only; the rest comes from STANDARD_FIELDS
  f.fields = f.fields.filter(x => x.custom || standardField(x.key)).map(x => {
    if (x.custom) return { key: x.key, custom: true, type: x.type, label: x.label, required: !!x.required, options: x.options || [] };
    const s = standardField(x.key);
    return { key: x.key, label: x.label || s.label, required: s.reqLock ? true : !!x.required };
  });
  STANDARD_FIELDS.filter(s => s.lock && !f.fields.some(x => x.key === s.key)).forEach(s => {
    f.fields.push({ key: s.key, label: s.label, required: s.required });
  });
  // A published form saved before snapshots existed: treat what is saved as what is live
  if (f.status === "Published" && !f.published) f.published = formContent(f);
  return f;
}

export function createForm({ id, name, property, identifier, now, from }) {
  const base = from ? formContent(clone(from)) : clone(FORM_DEFAULTS);
  return normalizeForm({
    ...base,
    id, name, property, identifier,
    status: "Draft",
    created: now, updated: now,
    history: [],
    published: null,
  });
}

// Problems that block publishing. Each names the editor tab where it is fixed.
export function formProblems(f, forms) {
  const out = [];
  const add = (tab, msg) => out.push({ tab, msg });
  if (!String(f.name || "").trim()) add("Basic", "Enter a form name.");
  if (forms.some(x => x.id !== f.id && x.name.trim().toLowerCase() === String(f.name).trim().toLowerCase())) add("Basic", "Another form already uses this name.");
  if (!IDENTIFIER.test(f.identifier || "")) add("Basic", "The identifier must be 3–40 lowercase letters, numbers or hyphens, and cannot start or end with a hyphen.");
  else if (forms.some(x => x.id !== f.id && x.identifier === f.identifier)) add("Basic", "Another form already uses this identifier.");
  if (!f.languages.length) add("Basic", "Choose at least one language.");
  if (!f.requestTypes.length) add("Basic", "Choose at least one request type.");
  if (!f.subjectTypes.length) add("Basic", "Choose at least one subject type.");
  f.fields.forEach(x => {
    if (!String(x.label || "").trim()) add("Form", "Every field needs a label.");
    if (x.custom && OPTION_TYPES.includes(x.type) && !(x.options || []).length) add("Form", `“${x.label}” needs at least one option.`);
  });
  if (!String(f.welcome || "").replace(/<[^>]*>/g, "").trim()) add("Form", "Add welcome text.");
  return out;
}

/* ---------------- preview translations ----------------
   Labels the visitor sees on the form, by language. A standard field whose label was renamed
   in the editor keeps the custom label in every language. Demo translations: have a native
   speaker review them before going live. */
const STRINGS = {
  English: {
    subject: "I am a", type: "What would you like to do?", first: "First name", last: "Last name", email: "Email",
    mobile: "Registered mobile", state: "State", city: "City", details: "Request details",
    upload: "Attachment (optional)", browse: "Browse", noFile: "No file chosen", captcha: "Captcha",
    capPh: "Enter the characters above", submit: "Submit request", submitOtp: "Verify with OTP and submit",
    required: "Fields marked * are required.", select: "Select",
  },
  Hindi: {
    subject: "मैं हूँ", type: "आप क्या करना चाहते हैं?", first: "पहला नाम", last: "अंतिम नाम", email: "ईमेल",
    mobile: "पंजीकृत मोबाइल", state: "राज्य", city: "शहर", details: "अनुरोध का विवरण",
    upload: "अनुलग्नक (वैकल्पिक)", browse: "चुनें", noFile: "कोई फ़ाइल नहीं चुनी गई", captcha: "कैप्चा",
    capPh: "ऊपर दिए गए अक्षर दर्ज करें", submit: "अनुरोध जमा करें", submitOtp: "ओटीपी से सत्यापित करें और जमा करें",
    required: "* चिह्नित फ़ील्ड आवश्यक हैं।", select: "चुनें",
  },
  Marathi: {
    subject: "मी आहे", type: "तुम्हाला काय करायचे आहे?", first: "पहिले नाव", last: "आडनाव", email: "ईमेल",
    mobile: "नोंदणीकृत मोबाइल", state: "राज्य", city: "शहर", details: "विनंतीचा तपशील",
    upload: "संलग्नक (ऐच्छिक)", browse: "निवडा", noFile: "फाइल निवडलेली नाही", captcha: "कॅप्चा",
    capPh: "वरील अक्षरे टाका", submit: "विनंती सबमिट करा", submitOtp: "ओटीपीने पडताळणी करून सबमिट करा",
    required: "* चिन्हांकित फील्ड आवश्यक आहेत.", select: "निवडा",
  },
  Tamil: {
    subject: "நான் ஒரு", type: "நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?", first: "முதல் பெயர்", last: "கடைசி பெயர்", email: "மின்னஞ்சல்",
    mobile: "பதிவு செய்த மொபைல்", state: "மாநிலம்", city: "நகரம்", details: "கோரிக்கை விவரங்கள்",
    upload: "இணைப்பு (விருப்பத்தேர்வு)", browse: "தேர்வு செய்க", noFile: "கோப்பு தேர்வு செய்யப்படவில்லை", captcha: "கேப்ட்சா",
    capPh: "மேலே உள்ள எழுத்துகளை உள்ளிடவும்", submit: "கோரிக்கையைச் சமர்ப்பிக்கவும்", submitOtp: "OTP மூலம் சரிபார்த்துச் சமர்ப்பிக்கவும்",
    required: "* குறியிட்ட புலங்கள் கட்டாயம்.", select: "தேர்வு செய்க",
  },
  Telugu: {
    subject: "నేను", type: "మీరు ఏమి చేయాలనుకుంటున్నారు?", first: "మొదటి పేరు", last: "ఇంటి పేరు", email: "ఈమెయిల్",
    mobile: "నమోదైన మొబైల్", state: "రాష్ట్రం", city: "నగరం", details: "అభ్యర్థన వివరాలు",
    upload: "జోడింపు (ఐచ్ఛికం)", browse: "ఎంచుకోండి", noFile: "ఫైల్ ఎంచుకోలేదు", captcha: "క్యాప్చా",
    capPh: "పై అక్షరాలను నమోదు చేయండి", submit: "అభ్యర్థనను సమర్పించండి", submitOtp: "OTP తో ధృవీకరించి సమర్పించండి",
    required: "* గుర్తు ఉన్న ఫీల్డ్‌లు తప్పనిసరి.", select: "ఎంచుకోండి",
  },
  Kannada: {
    subject: "ನಾನು", type: "ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?", first: "ಮೊದಲ ಹೆಸರು", last: "ಕೊನೆಯ ಹೆಸರು", email: "ಇಮೇಲ್",
    mobile: "ನೋಂದಾಯಿತ ಮೊಬೈಲ್", state: "ರಾಜ್ಯ", city: "ನಗರ", details: "ವಿನಂತಿಯ ವಿವರಗಳು",
    upload: "ಲಗತ್ತು (ಐಚ್ಛಿಕ)", browse: "ಆಯ್ಕೆಮಾಡಿ", noFile: "ಯಾವುದೇ ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿಲ್ಲ", captcha: "ಕ್ಯಾಪ್ಚಾ",
    capPh: "ಮೇಲಿನ ಅಕ್ಷರಗಳನ್ನು ನಮೂದಿಸಿ", submit: "ವಿನಂತಿ ಸಲ್ಲಿಸಿ", submitOtp: "OTP ಮೂಲಕ ಪರಿಶೀಲಿಸಿ ಸಲ್ಲಿಸಿ",
    required: "* ಗುರುತಿನ ಕ್ಷೇತ್ರಗಳು ಕಡ್ಡಾಯ.", select: "ಆಯ್ಕೆಮಾಡಿ",
  },
  Urdu: {
    subject: "میں ہوں", type: "آپ کیا کرنا چاہتے ہیں؟", first: "پہلا نام", last: "آخری نام", email: "ای میل",
    mobile: "رجسٹرڈ موبائل", state: "ریاست", city: "شہر", details: "درخواست کی تفصیل",
    upload: "منسلکہ (اختیاری)", browse: "منتخب کریں", noFile: "کوئی فائل منتخب نہیں", captcha: "کیپچا",
    capPh: "اوپر دیے گئے حروف درج کریں", submit: "درخواست جمع کریں", submitOtp: "OTP سے تصدیق کر کے جمع کریں",
    required: "* والے خانے لازمی ہیں۔", select: "منتخب کریں",
  },
  Bengali: {
    subject: "আমি একজন", type: "আপনি কী করতে চান?", first: "প্রথম নাম", last: "পদবি", email: "ইমেল",
    mobile: "নিবন্ধিত মোবাইল", state: "রাজ্য", city: "শহর", details: "অনুরোধের বিবরণ",
    upload: "সংযুক্তি (ঐচ্ছিক)", browse: "বাছুন", noFile: "কোনো ফাইল বাছা হয়নি", captcha: "ক্যাপচা",
    capPh: "উপরের অক্ষরগুলি লিখুন", submit: "অনুরোধ জমা দিন", submitOtp: "OTP দিয়ে যাচাই করে জমা দিন",
    required: "* চিহ্নিত ঘরগুলি আবশ্যক।", select: "বাছুন",
  },
};
export const RTL_LANGUAGES = ["Urdu"];
export const tr = (lang, key) => (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.English[key] || key;

// The label a visitor sees for a field in a language
export function fieldLabel(field, lang) {
  if (field.custom) return field.label;
  const s = standardField(field.key);
  return s && field.label === s.label ? tr(lang, field.key) : field.label;
}
