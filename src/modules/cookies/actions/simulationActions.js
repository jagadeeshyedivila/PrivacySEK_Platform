// Visitor simulation in the Live Preview: a choice closes the banner, as on a real site.
// Afterwards the revisit badge (if enabled) reopens the Preference Center, and the
// "Show banner again" preview control replays the first visit.
//
//   ui.bnDismissed   the simulated visitor has made a choice, so the banner is closed
//   ui.pcFromBadge   the Preference Center was opened from the badge (closing it shows no banner)
//
// Registered last, so it wraps the final versions of the banner's choice actions.

const CHOICES = [
  "cc-preview-visitor-accept",
  "cc-preview-visitor-reject",
  "cc-preview-visitor-gpc",
  "cc-preview-visitor-close",
];

// Settings that show a different first visit bring the banner back
const SHOW_BANNER_AGAIN = ["cc-set-region", "cc-preview-age"];

export function registerActions(context, ACT) {
  const { ui, runtime } = context;

  // Set before the original runs, because it re-renders
  for (const name of CHOICES) {
    const original = ACT[name];
    if (!original) continue;
    ACT[name] = (arg, el) => {
      ui.bnDismissed = true;
      ui.pcFromBadge = false;
      original(arg, el);
    };
  }

  for (const name of SHOW_BANNER_AGAIN) {
    const original = ACT[name];
    if (!original) continue;
    ACT[name] = (arg, el) => {
      ui.bnDismissed = false;
      original(arg, el);
    };
  }

  ACT["cc-sim-replay"] = () => {
    ui.bnDismissed = false;
    ui.pcFromBadge = false;
    ui.previewMode = "banner";
    runtime.render();
  };
}
