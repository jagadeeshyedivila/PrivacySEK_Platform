# PrivacySEK Platform

A front-end demo of the PrivacySEK privacy operating platform.

A clickable front-end of the PrivacySEK privacy operating platform, using sample data
for a fictional NBFC, "Aarohan Finance". It contains no backend: every figure is sample data.

## Run it

Requires Node.js 18 or later.

```bash
npm install
npm run dev        # open the URL Vite prints, usually http://localhost:5173
npm run build      # production build in dist/
```

## Structure

```
src/
  main.jsx
  App.jsx
  app/
    AppLayout.jsx           React lifecycle wrapper
    Sidebar.js              Shared sidebar markup
    Topbar.js               Shared topbar markup
    navigation.js           Navigation items and route titles
    routes.jsx              Module renderer and component registry
  components/
    ModuleView.jsx          Shared HTML-preserving React page boundary
    icons/icons.js          Shared icon definitions
    ui/markup.js            Shared markup builders
  data/sampleData.js        All sample data (duties, assets, consents, requests, ledger, ...)
  modules/
    cookies/                Cookie Consent renderer, local demo state, and scoped styles
  platform/engine.js        Shared state, event dispatch, shared actions, and overlays
  styles/global.css         Design tokens (light and dark), layout and shared component styles
  utils/                    Formatting and runtime helpers
public/logo.svg             PrivacySEK mark
```

## Modules

- **Cockpit:** Obligation Cockpit
- **Find:** Data Discovery & DSPM, Data Lineage, Data Map & ROPA, Person Finder
- **Control:** Notices, Consent, Cookie Consent, Purpose Guard, Retention & Deletion, Vendor Risk
- **Prove:** Rights Requests, Breach Response, Assessments, Proof Ledger, Reports
- **Govern:** AI Governance, Training, Trust Center, Workflows
- **System:** Integrations, Settings

Extras: ⌘K command palette, light/dark theme, jurisdiction lens (DPDP / GDPR / CCPA),
a 7-step guided demo (bottom-right button), and responsive layouts for phones.

## How it works

Each module owns its renderer and React component under `src/modules/`. The shared engine
continues to own application state, delegated interactions, navigation, overlays, and timers.
Module output is inserted through the shared `ModuleView` boundary so the existing HTML and
CSS remain unchanged. React mounts the engine once and cleans up its timers on unmount.

## Module organization

The route registry in `src/app/routes.jsx` maps each navigation key to its renderer,
component, and module-action registration. Shared builders stay in
`src/components/ui/markup.js`; module-specific rendering and actions live beside each
component. The sample data remains separate from rendering and can later be replaced by API
responses without changing the module boundaries.

Module interactions still use the existing shared event delegation and state runtime, while
module handlers are registered beside their module. The CSS has been moved as one unchanged
global stylesheet to avoid altering selector scope or visual output. Cookie Consent additionally
owns its scoped stylesheet and local demo state in `src/modules/cookies/`.

Cookie Consent stores its editable state in browser `localStorage` under a module-specific key.
Its workspace includes consent analytics, a live banner and preference-center preview, cookie
inventory and review, scan workflows, tag rules, and consent receipts. Scans, schedules,
integrations, tag gating, and the installation snippet are local simulations: they do not
contact websites, run background jobs, load scripts, or establish production consent. Use
**Reset local data** in Cookie Consent to restore that module's original sample state.
