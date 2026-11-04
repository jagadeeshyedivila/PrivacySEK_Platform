export const CONSENT_SDK_SNIPPET = `<script type="application/javascript" src="https://cdn.demo-privacysek.test/cmp/consent-preference/consent-preference-sdk.js"></script>`;

export function createImplementationRenderer(context) {
  const { runtime, safe } = context;

  return function renderConsentImplementation() {
    return `
      <div class="cp-header-row">
        <h2 class="cp-header-title">Implementation</h2>
      </div>

      <div class="card" style="padding:22px;max-width:840px">
        <!-- Step 1 -->
        <div style="display:flex;gap:16px;margin-bottom:24px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:700;flex:none">
            1
          </div>
          <div style="flex:1">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <b style="font-size:15px;color:var(--text)">Copy your Javascript SDK Script</b>
              <button class="btn sm p" data-act="cp-copy-sdk">
                Copy Script
              </button>
            </div>
            <p style="color:var(--text-2);font-size:13px;margin:4px 0 10px">
              Click copy script to copy the client-side preference widget tag into your clipboard.
            </p>
            <pre class="cp-code-block">${safe(CONSENT_SDK_SNIPPET)}</pre>
          </div>
        </div>

        <!-- Step 2 -->
        <div style="display:flex;gap:16px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--surface-2);border:1px solid var(--line);color:var(--text);display:grid;place-items:center;font-weight:700;flex:none">
            2
          </div>
          <div style="flex:1">
            <b style="font-size:15px;color:var(--text)">Where to Paste!</b>
            <p style="color:var(--text-2);font-size:13px;margin:4px 0 10px">
              You must insert the JavaScript SDK script before closing the <code>&lt;/head&gt;</code> tag on every page where you wish to manage user consent.
            </p>
            <pre class="cp-code-block">&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
  &lt;head&gt;
    &lt;meta charset="utf-8"&gt;
    &lt;title&gt;My Application&lt;/title&gt;
    &lt;!-- PrivacySEK Consent Preference SDK --&gt;
    ${safe(CONSENT_SDK_SNIPPET)}
  &lt;/head&gt;
  &lt;body&gt;
    &lt;!-- Your application content --&gt;
  &lt;/body&gt;
&lt;/html&gt;</pre>
          </div>
        </div>
      </div>
    `;
  };
}
