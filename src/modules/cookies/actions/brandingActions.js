// Branding, links and banner behaviour settings (Branding section, Content → Links & Contact,
// Config → close behaviour and backdrop). Generic setters write only the draft paths listed here.
import { brandingOf, linksOf, FONT_OPTIONS } from "../cookieData.js";

const LOGO_BOX = [360, 96];
const MAX_UPLOAD = 1024 * 1024;

const TOGGLES = new Set([
  "branding.showLogoOnBanner", "branding.showLogoInPreference",
  "links.showPrivacy", "links.newTab", "links.showCookiePolicy", "links.showContact",
  "config.backdrop",
]);
const CHOICES = {
  "branding.fontFamily": Object.keys(FONT_OPTIONS),
  "branding.fontScale": ["sm", "md", "lg"],
  "secondaryButtonStyle": ["equal", "outline", "subtle"],
  "config.closeAction": ["dismiss", "reject"],
};
const TEXTS = {
  "branding.brandName": 80,
  "links.cookiePolicyText": 60,
  "links.cookiePolicyUrl": 500,
  "links.contactName": 80,
  "links.contactEmail": 120,
};
const LABELS = {
  "branding.showLogoOnBanner": "Logo on banner",
  "branding.showLogoInPreference": "Logo in Preference Center",
  "links.showPrivacy": "Privacy policy link",
  "links.newTab": "Open links in a new tab",
  "links.showCookiePolicy": "Cookie policy link",
  "links.showContact": "Privacy contact details",
  "config.backdrop": "Dimmed page behind the banner",
  "branding.fontFamily": "Font",
  "branding.fontScale": "Text size",
  "secondaryButtonStyle": "Reject button style",
  "config.closeAction": "Close button behaviour",
};

export function registerActions(context, ACT) {
  const { state, runtime, persist, recordConsent, isoNow } = context;

  // The object a path lives in, created with its defaults for drafts saved before it existed
  function holder(path) {
    const draft = state.draft;
    const [head, key] = path.includes(".") ? path.split(".") : [null, path];
    if (!head) return [draft, key];
    if (head === "branding") draft.branding = brandingOf(draft);
    else if (head === "links") draft.links = linksOf(draft);
    else draft[head] = draft[head] || {};
    return [draft[head], key];
  }

  ACT["cc-draft-toggle"] = path => {
    if (!TOGGLES.has(path)) return;
    const [obj, key] = holder(path);
    obj[key] = !obj[key];
    persist(`${LABELS[path]} ${obj[key] ? "on" : "off"}`);
  };

  // Selects pass their value; buttons pass data-arg. The path is on the element.
  ACT["cc-draft-select"] = (value, el) => {
    const path = el?.dataset?.path;
    if (!CHOICES[path] || !CHOICES[path].includes(value)) return;
    const [obj, key] = holder(path);
    obj[key] = value;
    persist(`${LABELS[path]} updated`);
  };

  // Typing updates the preview; the draft is stored with Save, like the other Content fields
  ACT["cc-draft-input"] = (value, el) => {
    const path = el?.dataset?.path;
    if (!TEXTS[path]) return;
    const [obj, key] = holder(path);
    obj[key] = String(value || "").slice(0, TEXTS[path]);
    runtime.render();
  };

  /* ---- Logo ---- */
  // Scaled down in the browser so the saved draft stays small
  function shrinkImage(file, [maxW, maxH]) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(file.type === "image/png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
      img.src = url;
    });
  }

  ACT["cc-brand-upload"] = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg";
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      if (!/^image\/(png|jpeg)$/.test(file.type)) { runtime.toast("Choose a PNG or JPG image"); return; }
      if (file.size > MAX_UPLOAD) { runtime.toast("The image is larger than 1 MB"); return; }
      try {
        const data = await shrinkImage(file, LOGO_BOX);
        const [obj] = holder("branding.logo");
        obj.logo = data;
        persist("Logo added");
      } catch {
        runtime.toast("That image could not be read");
      }
    };
    input.click();
  };

  ACT["cc-brand-logo-remove"] = () => {
    const [obj] = holder("branding.logo");
    obj.logo = "";
    persist("Logo removed");
  };

  /* ---- Close button behaviour in the preview ---- */
  const originalClose = ACT["cc-preview-visitor-close"];
  ACT["cc-preview-visitor-close"] = (arg, el) => {
    if (state.draft?.config?.closeAction !== "reject") return originalClose?.(arg, el);
    const categories = Object.fromEntries(state.categories.map(c => [c.id, Boolean(c.required)]));
    state.visitor = { status: "Closed: optional off", categories, updatedAt: isoNow() };
    recordConsent("Reject All", categories, "Consent banner (close button)");
    persist("Simulated visitor: closed the banner, optional cookies off");
  };
}
