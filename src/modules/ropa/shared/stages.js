// Lifecycle stages of a record: one per wizard step, with what is still open in each
import { getSteps } from "../ropaConfig.js";
import { validateStep } from "../ropaRules.js";
import { plural } from "./format.js";

// state: "e" rule error · "todo" required fields missing · "w" warnings only · "ok" complete
export function stageStates(type, rec, ev, ctx) {
  return getSteps(type, ctx).map((s, i) => {
    const missing = Object.keys(validateStep(type, i, rec, ctx)).length;
    const errors = ev.results.filter(r => r.step === i && r.sev === "error").length;
    const warnings = ev.results.filter(r => r.step === i && r.sev === "warning").length;
    const state = errors ? "e" : missing ? "todo" : warnings ? "w" : "ok";
    return { i, t: s.t, short: s.short || s.t, state, missing, errors, warnings };
  });
}

export function stageNote(s) {
  if (s.errors) return plural(s.errors, "error");
  if (s.missing) return plural(s.missing, "field") + " missing";
  if (s.warnings) return plural(s.warnings, "warning");
  return "Complete";
}

// Segmented tracker for a list row. Each segment opens the record at that stage.
export function stageTrack(context, type, id, stages) {
  const { esc } = context;
  const open = stages.filter(s => s.state !== "ok");
  const done = stages.length - open.length;
  const first = open[0];
  const label = first
    ? '<span class="rp-track-l ' + first.state + '">' + esc(first.short) + ' · ' + stageNote(first) + (open.length > 1 ? '<span class="dim"> +' + (open.length - 1) + ' more</span>' : "") + '</span>'
    : '<span class="rp-track-l ok">All ' + stages.length + ' stages complete</span>';
  return '<div class="rp-track" role="group" aria-label="' + done + ' of ' + stages.length + ' stages complete">' +
    '<div class="rp-segs">' + stages.map(s =>
      '<button type="button" class="rp-seg ' + s.state + '" data-act="rp-open" data-arg="' + esc(type + "|" + id + "|" + s.i) + '"' +
      ' title="' + esc((s.i + 1) + ". " + s.t + ": " + stageNote(s)) + '" aria-label="' + esc(s.t + ": " + stageNote(s)) + '"></button>').join("") +
    '</div>' + label + '</div>';
}
