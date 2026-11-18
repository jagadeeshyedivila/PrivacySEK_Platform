// Actions for the Cookie Preference Center (PreferenceCenterRenderer.js). Its look and text
// come from the banner draft, so the existing Layout / Content / Config / Purposes actions
// already update it; these handle what the visitor does inside it.
//
// Accordion, toggles, "Show More" and the audit reset change the DOM in place and record
// the new state in `ui` / state.visitor, without a full re-render, so the expand animation
// runs and the scroll positions stay where they are. Tab changes and the save buttons
// re-render, which is what closes the dialog or swaps its content.
import { newAuditId, resetPreferenceCenterUi, preferenceCategories, initialChoices, createPreferenceCenterRenderer } from "../banner/PreferenceCenterRenderer.js";
import { PREFERENCE_CENTER_TEXT as TEXT } from "../preferenceCenterData.js";

const ANIMATION_MS = 220;

export function registerActions(context, ACT) {
  const { state, ui, runtime, persist, recordConsent, isoNow } = context;

  // Each time the dialog opens it starts on Purposes with everything collapsed, and full size
  // when it was opened from the full-size banner. Set before the original action re-renders.
  const wrapOpen = name => {
    const original = ACT[name];
    if (!original) return;
    ACT[name] = (arg, el) => {
      const wasOpen = ui.previewMode === "preference";
      const opening = name === "cc-set-preview-mode" ? arg === "preference" : !wasOpen;
      if (opening && !wasOpen) {
        resetPreferenceCenterUi(ui);
        ui.pcFull = Boolean(ui.bnFull);
        ui.pcFromBadge = false;
      }
      if (!opening) {
        ui.pcFull = false;
        ui.bnDismissed = false; // "Banner" chosen in the header: show it
      }
      original(arg, el);
    };
  };
  wrapOpen("cc-set-preview-mode");

  // The revisit badge reopens the Preference Center with the visitor's saved choices
  ACT["cc-badge-click"] = () => {
    resetPreferenceCenterUi(ui);
    ui.previewMode = "preference";
    ui.pcFromBadge = true;
    ui.pcFull = Boolean(ui.bnFull);
    runtime.render();
  };

  // Full-size banner over a mock page (BannerPreviewRenderer.renderFullscreenPreview)
  ACT["cc-banner-fullscreen"] = mode => {
    ui.bnFull = mode === "on";
    runtime.render();
  };

  // Escape leaves full size. One listener; it uses the latest registration's ui and runtime.
  globalThis.__ccFullscreen = { ui, runtime };
  if (!globalThis.__ccFullscreenEsc) {
    globalThis.__ccFullscreenEsc = true;
    document.addEventListener("keydown", e => {
      const { ui: u, runtime: r } = globalThis.__ccFullscreen || {};
      if (e.key !== "Escape" || !u || !(u.bnFull || u.pcFull)) return;
      if (document.querySelector(".modal, .drawer")) return; // an app dialog handles Escape itself
      u.bnFull = false;
      u.pcFull = false;
      r.render();
    });
  }

  // The Content fields update the preview while typing without a full re-render (which
  // would take focus from the field). Redraw just the Preference Center after each of them,
  // keeping its scroll position and skipping the open animation.
  const renderer = createPreferenceCenterRenderer(context);
  function refreshPreferenceCenter() {
    document.querySelectorAll(".pc-overlay").forEach(overlay => {
      const scroll = overlay.querySelector("[data-pc-scroll]")?.scrollTop || 0;
      const tpl = document.createElement("template");
      tpl.innerHTML = renderer.renderPreferenceCenter({ fullscreen: overlay.classList.contains("pc-fullscreen") }).trim();
      const fresh = tpl.content.firstElementChild;
      if (!fresh) return;
      fresh.classList.add("pc-no-anim");
      overlay.replaceWith(fresh);
      const scroller = fresh.querySelector("[data-pc-scroll]");
      if (scroller) scroller.scrollTop = scroll;
    });
  }
  ["cc-input-pref-title", "cc-input-pref-desc", "cc-input-pref-save", "cc-input-pref-reject", "cc-input-pref-vendorlink",
    "cc-input-accept", "cc-input-privtext", "cc-input-privurl"].forEach(name => {
    const original = ACT[name];
    if (!original) return;
    ACT[name] = (value, el) => {
      original(value, el);
      refreshPreferenceCenter();
    };
  });

  ACT["pc-tab"] = tab => {
    ui.pcTab = tab === "privacy" ? "privacy" : "purposes";
    runtime.render();
  };

  ACT["pc-toggle-acc"] = (arg, el) => {
    const [tab, id] = String(arg).split(":");
    ui.pcOpen = ui.pcOpen || { purposes: null, privacy: null };
    const opening = ui.pcOpen[tab] !== id;
    ui.pcOpen[tab] = opening ? id : null;

    const modal = el?.closest(".pc-modal");
    if (!modal) { runtime.render(); return; }
    modal.querySelectorAll(".pc-acc-item").forEach(item => {
      const open = opening && item.getAttribute("data-pc-item") === id;
      item.classList.toggle("open", open);
      item.querySelector(".pc-acc-trigger")?.setAttribute("aria-expanded", String(open));
    });

    // Bring the opened row's header to the top of the scrolling area once the row above
    // it (if any) has finished collapsing, so the measured position is final
    if (opening) {
      const item = modal.querySelector(`.pc-acc-item[data-pc-item="${CSS.escape(id)}"]`);
      const scroller = modal.querySelector("[data-pc-scroll]");
      setTimeout(() => {
        if (!item?.isConnected || !scroller) return;
        const top = item.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        scroller.scrollTo({ top: Math.max(0, top - 4), behavior: "smooth" });
      }, ANIMATION_MS);
    }
  };

  ACT["pc-toggle-cat"] = (id, el) => {
    ui.pcChoices = ui.pcChoices || initialChoices(state, ui.region || "EEA & UK");
    const on = !ui.pcChoices[id];
    ui.pcChoices[id] = on;
    if (el) el.setAttribute("aria-checked", String(on));
    else runtime.render();
  };

  ACT["pc-show-more"] = (_arg, el) => {
    ui.pcMore = !ui.pcMore;
    const intro = el?.closest(".pc-intro");
    if (!intro) { runtime.render(); return; }
    intro.classList.toggle("expanded", ui.pcMore);
    el.textContent = ui.pcMore ? TEXT.showLess : TEXT.showMore;
    el.setAttribute("aria-expanded", String(ui.pcMore));
  };

  ACT["pc-reset-audit"] = (_arg, el) => {
    ui.pcAuditId = newAuditId();
    const target = el?.closest(".pc-audit")?.querySelector("[data-pc-audit]");
    if (target) target.textContent = ui.pcAuditId;
    runtime.toast(TEXT.toasts.auditReset);
  };

  ACT["pc-fullscreen"] = mode => {
    ui.pcFull = mode === "on";
    if (!ui.pcFull) ui.bnFull = false; // back inside the preview frame, banner included
    runtime.render();
  };

  // Every configured category (hidden ones too) plus "uncategorized" when it is shown
  const allIds = () => [...new Set([...state.categories.map(c => c.id), ...preferenceCategories(state, ui.region || "EEA & UK").map(c => c.id)])];
  const isRequired = id => Boolean(state.categories.find(c => c.id === id)?.required);

  function finish(action, categories, status, message) {
    state.visitor = { status, categories, updatedAt: isoNow() };
    recordConsent(action, categories);
    ui.previewMode = "banner";
    ui.pcFull = false;      // the full-size banner view (ui.bnFull) stays as it was
    ui.bnDismissed = true;  // a choice closes the banner
    ui.pcFromBadge = false;
    resetPreferenceCenterUi(ui);
    persist(message);
  }

  ACT["pc-save"] = () => {
    const choices = ui.pcChoices || initialChoices(state, ui.region || "EEA & UK");
    const categories = Object.fromEntries(allIds().map(id => [id, Boolean(isRequired(id) || choices[id])]));
    finish("Save Preferences", categories, "Saved preferences", TEXT.toasts.saved);
  };

  ACT["pc-accept-all"] = () => {
    finish("Accept All", Object.fromEntries(allIds().map(id => [id, true])), "Accepted all", TEXT.toasts.acceptedAll);
  };

  ACT["pc-disable-all"] = () => {
    const categories = Object.fromEntries(allIds().map(id => [id, Boolean(isRequired(id))]));
    finish("Disable All", categories, "Disabled optional", TEXT.toasts.disabledAll);
  };

  // Closing does not save: the working copy is dropped, so the toggles show the last saved choice next time
  // Opened from the banner: back to the banner. Opened from the badge: nothing (choice already made).
  ACT["pc-close"] = () => {
    ui.previewMode = "banner";
    ui.pcFull = false;
    ui.bnDismissed = Boolean(ui.pcFromBadge);
    ui.pcFromBadge = false;
    resetPreferenceCenterUi(ui);
    runtime.render();
  };
}
