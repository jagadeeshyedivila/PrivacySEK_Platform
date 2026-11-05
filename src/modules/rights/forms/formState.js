// The web form being edited. Edits go to a draft copy; Save writes the draft to the store and
// Publish also snapshots it as the version visitors see. Shared by the forms screen and actions.
import { normalizeForm, sameContent, hasUnpublishedChanges, formProblems } from "./formModel.js";

const clone = o => JSON.parse(JSON.stringify(o));

export function createFormState(ctx) {
  const { ui } = ctx;

  // Saved forms, migrated to the current shape the first time they are read
  const forms = () => {
    const list = ctx.state.forms;
    list.forEach(normalizeForm);
    return list;
  };
  const find = id => forms().find(f => f.id === id);
  const saved = () => (ui.selectedFormId ? find(ui.selectedFormId) : null);

  function draft() {
    const s = saved();
    if (!s) { ui.formDraft = null; return null; }
    if (!ui.formDraft || ui.formDraft.id !== s.id) ui.formDraft = normalizeForm(clone(s));
    return ui.formDraft;
  }

  const isDirty = () => {
    const s = saved();
    return Boolean(s && ui.formDraft && ui.formDraft.id === s.id && !sameContent(ui.formDraft, s));
  };
  const problems = f => formProblems(f, forms());
  const isEditing = () => ui.topTab === "forms" && Boolean(ui.selectedFormId);

  return { forms, find, saved, draft, isDirty, problems, isEditing, hasUnpublishedChanges, clone };
}
