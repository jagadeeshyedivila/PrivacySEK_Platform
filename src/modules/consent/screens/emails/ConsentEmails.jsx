export function createEmailsRenderer(context) {
  const { state, runtime, ui, safe, canEdit } = context;

  return function renderConsentEmails() {
    const emailConfig = state.email;
    const isEditable = canEdit();

    return `
      <div class="cp-header-row">
        <h2 class="cp-header-title">Email Templates</h2>
      </div>

      <div class="card" style="max-width:680px;padding:22px">
        <h3 style="margin:0 0 14px;font-size:16px;color:var(--text)">Consent Verification Email</h3>
        <p style="color:var(--text-2);font-size:13px;margin-bottom:16px">
          Configure the automated verification email template dispatched when data principals register or update their preferences.
        </p>

        <div class="cp-form-group">
          <label class="required">Email Sender</label>
          <select
            data-act="cp-email-set-sender"
            ${isEditable ? '' : 'disabled'}
            style="width:100%"
            aria-label="Select email sender"
          >
            <option value="">-- Select Sender --</option>
            ${state.senders.map(s => `
              <option value="${safe(s.email)}" ${emailConfig.sender === s.email ? 'selected' : ''}>
                ${safe(s.name)} &lt;${safe(s.email)}&gt;
              </option>
            `).join('')}
          </select>
          <div style="text-align:right;margin-top:6px">
            <a href="javascript:void(0)" data-act="cp-email-new-sender" style="font-size:12px;font-weight:600">
              + Create a new Sender
            </a>
          </div>
        </div>

        <div class="cp-form-group">
          <label class="required">Email Subject</label>
          <input
            type="text"
            id="cp-email-subject-input"
            value="${safe(emailConfig.subject)}"
            data-input-act="cp-email-subject"
            ${isEditable ? '' : 'disabled'}
            placeholder="e.g. Consent Verification Required"
          />
        </div>

        <div class="cp-form-group">
          <label>Email Body <small class="dim">(Use <code>{full_name}</code> for dynamic principal name substitution)</small></label>
          <div class="cp-email-toolbar">
            <button type="button" class="btn sm o" style="padding:3px 10px;font-weight:700" onclick="document.execCommand('bold')">B</button>
            <button type="button" class="btn sm o" style="padding:3px 10px;font-style:italic" onclick="document.execCommand('italic')">I</button>
            <button type="button" class="btn sm o" style="padding:3px 10px;text-decoration:underline" onclick="document.execCommand('underline')">U</button>
          </div>
          <div
            id="cp-email-body-editor"
            class="cp-email-body-editor"
            contenteditable="${isEditable ? 'true' : 'false'}"
            role="textbox"
            aria-multiline="true"
          >${emailConfig.body}</div>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn sm p" ${isEditable ? '' : 'disabled title="Read-only mode"'} data-act="cp-email-save">
            Save Template
          </button>
          <button class="btn sm o" data-act="cp-email-preview">
            Send test preview
          </button>
        </div>
      </div>
    `;
  };
}
