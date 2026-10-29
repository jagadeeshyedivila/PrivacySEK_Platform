const CMP_SCRIPT_URL = "https://cdn.privacysek.example/cmp/v2.2/web/demo-bundle.js";
const SITE_ID = "ps-site-88914";

const SCRIPT_TAG = `<script type="application/javascript" src="${CMP_SCRIPT_URL}" data-site-id="${SITE_ID}" async></script>`;

const FRAMEWORKS = {
  html: {
    label: "HTML",
    type: "Direct embed",
    summary: "Add the Consent Management Platform (CMP) loader to your site’s document head.",
    steps: [
      "Open the shared document head or base HTML template used by your site.",
      "Place the loader before any non-essential analytics or advertising scripts.",
      "Deploy the change, then verify the banner and consent-dependent script behavior on the live site.",
    ],
    code: SCRIPT_TAG,
    codeLabel: "HTML script tag",
  },
  react: {
    label: "React",
    type: "Client-side loader",
    summary: "Load the CMP once from a small React component mounted near your application root.",
    steps: [
      "Create a client-side component and mount it once inside your application shell.",
      "Keep the CMP loader ahead of non-essential tracking initialization.",
      "Test route changes and a full page reload to confirm the loader is not mounted repeatedly.",
    ],
    code: `import { useEffect } from "react";

export function PrivacySEKConsentLoader() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "${CMP_SCRIPT_URL}";
    script.async = true;
    script.dataset.siteId = "${SITE_ID}";
    document.head.appendChild(script);
  }, []);

  return null;
}`,
    codeLabel: "React loader component",
  },
  nextjs: {
    label: "Next.js",
    type: "App Router",
    summary: "Use Next.js Script to load the CMP after the page becomes interactive.",
    steps: [
      "Create a client component for the CMP loader.",
      "Render it once from the root layout or shared application shell.",
      "Keep non-essential tracking initialization behind the consent state and test the deployed site.",
    ],
    code: `"use client";

import Script from "next/script";

export function PrivacySEKConsentLoader() {
  return (
    <Script
      src="${CMP_SCRIPT_URL}"
      data-site-id="${SITE_ID}"
      strategy="afterInteractive"
    />
  );
}`,
    codeLabel: "Next.js loader component",
  },
  vue: {
    label: "Vue",
    type: "Composition API",
    summary: "Add a small root-level Vue component that inserts the CMP loader after mount.",
    steps: [
      "Create the loader component below and include it once in App.vue.",
      "Do not mount the loader separately on every route.",
      "Verify the banner and consent-dependent scripts after navigation and reload.",
    ],
    code: `<script setup>
import { onMounted } from "vue";

onMounted(() => {
  const script = document.createElement("script");
  script.src = "${CMP_SCRIPT_URL}";
  script.async = true;
  script.dataset.siteId = "${SITE_ID}";
  document.head.appendChild(script);
});
</script>

<template>
</template>`,
    codeLabel: "Vue loader component",
  },
  angular: {
    label: "Angular",
    type: "Application-wide",
    summary: "Install the CMP once in the application’s shared index.html document head.",
    steps: [
      "Add the loader to src/index.html inside the document head.",
      "Place it before non-essential analytics or advertising scripts.",
      "Build and deploy, then verify the banner and script behavior in the production origin.",
    ],
    code: SCRIPT_TAG,
    codeLabel: "Angular index.html",
  },
  svelte: {
    label: "Svelte",
    type: "Root layout",
    summary: "Load the CMP from a root layout component so it is available across routes.",
    steps: [
      "Create a root-level loader component and add it to the shared layout.",
      "Insert the script after the component mounts in the browser.",
      "Check route navigation and reload behavior after deployment.",
    ],
    code: `<script>
  import { onMount } from "svelte";

  onMount(() => {
    const script = document.createElement("script");
    script.src = "${CMP_SCRIPT_URL}";
    script.async = true;
    script.dataset.siteId = "${SITE_ID}";
    document.head.appendChild(script);
  });
</script>`,
    codeLabel: "Svelte root loader",
  },
  wordpress: {
    label: "WordPress",
    type: "Theme or script manager",
    summary: "Add the loader to the site-wide head rather than an individual page or post.",
    steps: [
      "Use your approved header-code manager or child-theme integration to edit the shared head.",
      "Add the script before non-essential analytics and advertising scripts.",
      "Clear page/CDN caches and test on the published site, including a page that uses a cached template.",
    ],
    code: SCRIPT_TAG,
    codeLabel: "WordPress head snippet",
  },
  shopify: {
    label: "Shopify",
    type: "Online Store theme",
    summary: "Install the loader in the shared theme head so it is available across storefront pages.",
    steps: [
      "Open the active theme’s layout/theme.liquid file, or use your approved theme code manager.",
      "Place the script inside the head and before non-essential tracking scripts.",
      "Preview and publish the theme, then test consent behavior on multiple storefront pages.",
    ],
    code: SCRIPT_TAG,
    codeLabel: "Shopify theme snippet",
  },
  gtm: {
    label: "Google Tag Manager",
    type: "Custom HTML tag",
    summary: "Create a Custom HTML tag for the CMP and load it on the pages where consent is collected.",
    steps: [
      "Create a Custom HTML tag and paste the loader below.",
      "Use an initialization trigger that runs on the required pages, ahead of non-essential tags.",
      "Preview the container, verify tag order and consent behavior, then publish the container.",
    ],
    code: `(function () {
  var script = document.createElement("script");
  script.src = "${CMP_SCRIPT_URL}";
  script.async = true;
  script.setAttribute("data-site-id", "${SITE_ID}");
  document.head.appendChild(script);
})();`,
    codeLabel: "GTM Custom HTML",
  },
};

export function createRenderer(context) {
  const { runtime, ui, safe } = context;

  function renderImplementationModule() {
    const tab = FRAMEWORKS[ui.installCmpTab] ? ui.installCmpTab : "html";
    const framework = FRAMEWORKS[tab];
    const frameworkTabs = Object.entries(FRAMEWORKS).map(([key, item]) => `
      <button
        class="cc-install-tab-btn ${tab === key ? "active" : ""}"
        id="cc-install-tab-${key}"
        aria-pressed="${tab === key}"
        data-act="cc-set-install-tab"
        data-arg="${key}"
      >${item.label}</button>
    `).join("");

    return `
      <section class="cc-implementation">
        <header class="cc-implementation-header">
          <div>
            <div class="cc-implementation-eyebrow">Cookie Consent setup</div>
            <h2>Implementation</h2>
            <p>Install the consent banner on your website, then connect a preference-center entry point.</p>
          </div>
          <span class="cc-implementation-site"><span></span> Site ID <strong>${SITE_ID}</strong></span>
        </header>

        <div class="cc-install-tabs" role="group" aria-label="Choose your platform">
          ${frameworkTabs}
        </div>

        <div class="cc-implementation-grid">
          ${runtime.card(`Install on ${framework.label}`, `
            <div class="cc-implementation-card-intro">
              <span class="cc-implementation-type">${safe(framework.type)}</span>
              <p>${safe(framework.summary)}</p>
            </div>
            <div class="cc-implementation-section-title">Setup steps</div>
            <ol class="cc-implementation-steps">
              ${framework.steps.map((step, index) => `<li><span>${index + 1}</span><p>${safe(step)}</p></li>`).join("")}
            </ol>
          `)}

          ${runtime.card(framework.codeLabel, `
            <div class="cc-implementation-code-heading">
              <p>Use this snippet with the setup steps for ${safe(framework.label)}.</p>
              <button class="btn t sm" data-act="cc-copy-snippet">Copy code</button>
            </div>
            <pre class="cc-code cc-implementation-code" id="cc-snippet"><code>${safe(framework.code)}</code></pre>
            <div class="cc-implementation-footnote">
              <strong>Deployment check</strong>
              <span>The loader must be available on the published site and run before non-essential tracking scripts.</span>
            </div>
          `)}
        </div>

        <div class="cc-implementation-grid cc-implementation-secondary">
          ${runtime.card("Preference center entry point", `
            <p class="cc-implementation-copy">Let visitors reopen their consent choices from a persistent privacy or cookie settings link.</p>
            <div class="cc-implementation-code-heading">
              <span class="cc-implementation-code-label">JavaScript trigger</span>
              <button class="btn sm" data-act="cc-copy-snippet" data-arg="cc-preferences-snippet">Copy trigger</button>
            </div>
            <pre class="cc-code cc-implementation-code" id="cc-preferences-snippet"><code>window.PrivacySEKCMP.openPreferences();</code></pre>
            <div class="cc-implementation-callout">
              <strong>Where to place it</strong>
              <span>Connect this call to a visible “Cookie settings” or “Privacy preferences” control in your site footer or settings area.</span>
            </div>
          `)}

          ${runtime.card("Verify the installation", `
            <ul class="cc-implementation-checklist">
              <li><span class="cc-implementation-check">1</span><span>Open the deployed site in a fresh browser session and confirm the banner appears.</span></li>
              <li><span class="cc-implementation-check">2</span><span>Make a choice, reload the page, and confirm the consent state is retained.</span></li>
              <li><span class="cc-implementation-check">3</span><span>Reopen preferences using the site control and confirm the saved choices can be changed.</span></li>
              <li><span class="cc-implementation-check">4</span><span>Check that non-essential tracking does not run before the applicable consent is collected.</span></li>
            </ul>
            <p class="cc-implementation-note">This checklist is guidance; installation verification is not currently recorded in this module.</p>
          `)}
        </div>

        ${runtime.card("Authenticated Consent API", `
          <div class="cc-implementation-code-heading">
            <p>Retrieve a user’s consent record through the authenticated Consent API.</p>
            <button class="btn sm" data-act="cc-copy-snippet" data-arg="cc-api-endpoint">Copy endpoint</button>
          </div>
          <pre class="cc-code cc-implementation-code" id="cc-api-endpoint"><code>GET https://api.privacysek.example/v1/consent/user/{authId}</code></pre>
          <p class="cc-implementation-note">Use the authentication method configured for your integration. Keep API credentials on a trusted server; the authentication scheme and response contract are not configured in this module.</p>
        `)}
      </section>
    `;
  }

  return { renderImplementationModule };
}
