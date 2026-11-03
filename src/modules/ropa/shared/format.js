// Small display helpers shared by ROPA screens

export function fmtStamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function ago(iso) {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 6e4));
  if (m < 1) return "just now";
  if (m < 60) return m + " min ago";
  const h = Math.round(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.round(h / 24);
  return d + (d === 1 ? " day ago" : " days ago");
}

export function plural(n, one, many) { return n + " " + (n === 1 ? one : (many || one + "s")); }

export function issuesChip(pill, iss) {
  const n = iss.list.length;
  if (!n) return pill("ok", "✓ Clean");
  return pill(iss.errors ? "act" : "risk", plural(n, "issue"));
}

export function dpiaLabel(rec) {
  if (rec.dpia === "Yes") return rec.dpiaState || "Not started";
  if (rec.dpia === "No") return "Not required";
  return "Undecided";
}

// "Voluntarily provided for a specified purpose (s.7(a))" → "Voluntarily provided · s.7(a)"
export function lawShort(law) {
  if (!law) return "—";
  const m = law.match(/^(.*?)\s*(?:\((s\.[^)]*\)?)\)|–\s*(Art\..*))$/);
  if (!m) return law;
  const words = m[1].split(" ");
  const head = words.length > 2 ? words.slice(0, 2).join(" ") : m[1];
  return head + " · " + (m[2] || m[3]);
}

export function lawRegime(law) { return /\(s\.\d/.test(law || "") ? "DPDP" : /Art\./.test(law || "") ? "GDPR" : ""; }

// Adds data-act to a kpi() tile so it opens a filtered list
export function clickable(html, act, arg, label) {
  return html.replace('<div class="card kpi"', '<div class="card kpi rp-click" role="button" tabindex="0" data-act="' + act + '" data-arg="' + arg + '" aria-label="' + (label || "") + '"');
}
