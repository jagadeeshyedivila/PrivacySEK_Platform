// Pickers for choosing several records. They stay compact however many records exist:
//  - pickList: search box, chips for what is chosen, and a scrolling list of matches. For Data
//    Map activities and assets, which can run into hundreds.
//  - toggleChips: pill toggles for short, fixed sets such as frameworks or people.
// Both are plain checkboxes underneath, so a form reads them with `.<cls> input:checked`.

// items: [{ value, label, sub?, tag? }]; after: an action run after each change (it receives
// "true"/"false" and the checkbox); extra: attributes added to every checkbox
export function pickList(safe, { cls, items, chosen = [], noun = "items", after = "", extra = "", disabled = false }) {
  const sel = new Set(chosen);
  // Chosen items first, so they are visible without searching
  const ordered = items.filter(x => sel.has(x.value)).concat(items.filter(x => !sel.has(x.value)));
  const dis = disabled ? "disabled" : "";
  return `
    <div class="dp-pick ${cls}" data-pick data-noun="${safe(noun)}" ${after ? `data-after="${safe(after)}"` : ""}>
      <div class="dp-pick-chips" data-pick-chips>${chipsHtml(safe, items, sel, disabled)}</div>
      ${items.length > 6 ? `
        <div class="dp-pick-head">
          <label class="dp-search dp-pick-search"><span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Search ${items.length} ${safe(noun)}" data-input-act="dp-pick-filter" aria-label="Search ${safe(noun)}" autocomplete="off" ${dis}></label>
          <button type="button" class="dp-link" data-act="dp-pick-all" ${dis}>Select shown</button>
          <button type="button" class="dp-link" data-act="dp-pick-clear" ${dis}>Clear</button>
        </div>` : ""}
      <ul class="dp-pick-list" aria-label="${safe(noun)}">
        ${ordered.map(x => `
          <li data-pick-text="${safe(`${x.value} ${x.label} ${x.sub || ""}`.toLowerCase())}">
            <label><input type="checkbox" value="${safe(x.value)}" data-label="${safe(x.label)}" data-tag="${safe(x.tag || "")}" data-change-act="dp-pick-toggle" ${extra} ${sel.has(x.value) ? "checked" : ""} ${dis}>
              <span class="dp-pick-t">${x.tag ? `<span class="dp-mono">${safe(x.tag)}</span> ` : ""}${safe(x.label)}${x.sub ? `<small>${safe(x.sub)}</small>` : ""}</span></label>
          </li>`).join("") || `<li class="dp-pick-none">No ${safe(noun)} in the Data Map yet.</li>`}
        <li class="dp-pick-none" data-pick-empty hidden>No matches.</li>
      </ul>
      <p class="dp-pick-count" data-pick-count>${countText(sel.size, items.length, noun)}</p>
    </div>`;
}

export function chipsHtml(safe, items, sel, disabled) {
  const chosen = items.filter(x => sel.has(x.value));
  if (!chosen.length) return '<span class="dp-muted">None selected</span>';
  return chosen.map(x => `<span class="dp-pick-chip">${x.tag ? `<b>${safe(x.tag)}</b> ` : ""}${safe(x.label)}
    <button type="button" data-act="dp-pick-remove" data-arg="${safe(x.value)}" aria-label="Remove ${safe(x.label)}" ${disabled ? "disabled" : ""}>✕</button></span>`).join("");
}

export const countText = (n, total, noun) => `${n} of ${total} ${noun} selected`;

// items: [{ value, label, title? }]
export function toggleChips(safe, { cls, items, chosen = [], label, disabled = false }) {
  return `<div class="dp-toggles ${cls}" role="group" aria-label="${safe(label)}">${items.map(x => `
    <label class="dp-toggle" title="${safe(x.title || x.label)}"><input type="checkbox" value="${safe(x.value)}" ${chosen.includes(x.value) ? "checked" : ""} ${disabled ? "disabled" : ""}><span>${safe(x.label)}</span></label>`).join("")}</div>`;
}
