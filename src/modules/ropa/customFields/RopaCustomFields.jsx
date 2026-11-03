import { DENY_MSG, can } from "../ropaConfig.js";

export function cfUsage(store, f) {
  return (store.act || []).filter(a => {
    const v = a["cf_" + f.key];
    return v != null && v !== "" && !(Array.isArray(v) && !v.length);
  }).length;
}

export function createCustomFieldsRenderer(context) {
  const { card, esc, table, tableEmptyState, tag, ui } = context;

  return function renderCustomFields() {
    const store = context.getStore();
    const list = store.cf || [];
    const allowed = can(ui, "cf");
    const addBtn = '<button class="btn sm p" data-act="rp-cf-add"' + (allowed ? "" : ' disabled title="' + DENY_MSG.cf + '"') + '>+ Add custom field</button>';
    const body = list.length ? table(["Label", "Key", "Type", "Required", "Options", "Used in", ""], list.map(f => {
      const used = cfUsage(store, f);
      return [
        '<b>' + esc(f.label) + '</b>',
        '<span class="mono">' + esc(f.key) + '</span>',
        esc(f.type),
        f.req ? tag("Required", "spi") : '<span class="dim">Optional</span>',
        (f.opts || []).length ? '<div class="tags">' + f.opts.map(o => tag(o)).join("") + '</div>' : '<span class="dim">—</span>',
        used ? used + (used === 1 ? " activity" : " activities") : '<span class="dim">Not used yet</span>',
        '<button class="btn sm d" data-act="rp-cf-delete" data-arg="' + esc(f.id) + '"' + (allowed ? "" : ' disabled title="' + DENY_MSG.cf + '"') + '>Delete</button>'
      ];
    })) : '<div class="card-b">' + tableEmptyState({ title: "No custom fields yet", description: "Custom fields appear as step 7, Additional details, in the processing activity wizard." }) + '</div>';
    return '<div class="banner t"><span>Custom fields appear as <b>Step 7 · Additional details</b> in the processing activity wizard.</span></div>' +
      card("Custom fields · " + list.length, body, addBtn, true);
  };
}
