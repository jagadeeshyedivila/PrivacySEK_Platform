# PrivacySEK Platform

A demo of the PrivacySEK privacy operating platform, with a React front end and an Express API backed by MongoDB.

The seeded demo data represents a fictional NBFC, "Aarohan Finance".

## Run it

Requires Node.js 18 or later and a running MongoDB server. By default, the backend connects
to `mongodb://127.0.0.1:27017/privacysek`; set `MONGODB_URI` and `MONGODB_DB_NAME` to use
another database.

```bash
npm install
```

Start the backend and frontend in separate terminals. On first start against a new
database the backend seeds the demo data (see "Databases and seeding" below). ROPA,
Consent, Data Discovery, Rights and DPIA records are created, edited and deleted through
`/api/store` and saved in MongoDB, one document per record:

```bash
npm run server     # backend API at http://localhost:3001
```

```bash
npm run dev        # open http://localhost:5173
```


### Databases and seeding

`MONGODB_URI` and `MONGODB_DB_NAME` alone decide which database the app uses. To switch
databases (local test DB, a PrivacySEK cluster), change those two values. You can start
the new database fresh or bring your existing data along:

**Fresh database with demo data**

```bash
npm run seed -- --dry-run   # show which demo records are missing
npm run seed                # insert them
npm run seed -- --reset     # replace all demo data with a fresh copy of the seed
```

All data in the app is sample data, so seeding keeps every demo record present. The server
does this on each start (a serverless instance on its first request), and `npm run seed`
does it on demand. Records are matched by their key fields and only missing ones are
inserted:

- a new, empty database gets the full demo data set;
- a demo record a user deleted comes back on the next start;
- demo records still present keep their edits, and records users added are kept.

Seeding only adds. After changing the seed itself (renaming or removing a demo record),
run `npm run seed -- --reset` to drop the old version. Scans and schedules are not affected.
Set `SEED_DEMO_DATA=false` to stop the server seeding on start.

**Copy an existing database to another one**

```bash
# PowerShell; in bash use export VAR=value
$env:TARGET_MONGODB_URI = "mongodb+srv://<user>:<password>@<cluster-host>/"
$env:TARGET_DB_NAME     = "privacysek"
npm run db:copy -- --dry-run   # compare source and target counts
npm run db:copy                # copy documents, _id values and indexes
```

The source is `MONGODB_URI` / `MONGODB_DB_NAME` from `.env` unless `SOURCE_MONGODB_URI` /
`SOURCE_DB_NAME` are set. The copy refuses to write if a target collection already has data;
add `--drop` to replace those collections, or `--only a,b` to copy just some. Afterwards,
point `MONGODB_URI` / `MONGODB_DB_NAME` at the target.

### Deployment environment variables

Keep local development and production settings separate:

- Local `.env`: use a MongoDB URI such as `mongodb://127.0.0.1:27017` and leave
  `VITE_SCANNER_API_URL` empty so Vite proxies API requests to the local backend.
- Render backend: set `MONGODB_URI` to your MongoDB provider's connection string and
  `MONGODB_DB_NAME` to the production database name. The Render service URL is not a
  MongoDB connection string.
- Vercel frontend: set `VITE_SCANNER_API_URL` to the Render backend URL
  (for example, `https://privacysek-platform.onrender.com`), then redeploy.

Use separate database names for development and production when both environments share
the same MongoDB cluster. Never put MongoDB credentials in a `VITE_` variable.

To create a production frontend build, run `npm run build`; output is written to `dist/`.
Production deployments must install production dependencies, including Playwright. If Chromium
is unavailable on the host, the scanner switches to its multi-page HTTP crawler.

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
