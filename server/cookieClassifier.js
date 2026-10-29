/**
 * PrivacySEK Cookie Classifier
 * Classifies discovered cookies into categories based on known patterns, domains, and attributes.
 * Categories align with PrivacySEK categories:
 * - necessary (Strictly Necessary)
 * - functional (Functional Preferences)
 * - analytics (Analytics & Measurement)
 * - advertising (Advertising & Targeting)
 * - social_media (Social Media & Widgets)
 * - unclassified (Needs manual review)
 */

const KNOWN_COOKIE_RULES = [
  // NECESSARY / SECURITY / CSRF / SESSION / CDN
  {
    pattern: /^(JSESSIONID|PHPSESSID|ASP\.NET_SessionId|connect\.sid|sid|session_id|sessid)$/i,
    category: 'necessary',
    provider: 'Web Server / Application',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Maintains authenticated user session and state across page requests.',
  },
  {
    pattern: /^(csrftoken|csrf_token|_csrf|xsrf[-_]token|__RequestVerificationToken|X-CSRF-TOKEN)$/i,
    category: 'necessary',
    provider: 'Web Application Security',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Protects the visitor and application from Cross-Site Request Forgery (CSRF) attacks.',
  },
  {
    pattern: /^(__cf_bm|__cfduid|cf_clearance|cf_chl_.*)$/i,
    category: 'necessary',
    provider: 'Cloudflare',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Cloudflare bot management, DDoS mitigation, and rate limiting.',
  },
  {
    pattern: /^(AWSALB|AWSALBCORS|AWSALBTG|AWSALBTGCORS)$/i,
    category: 'necessary',
    provider: 'Amazon Web Services',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Maintains session stickiness to specific AWS application load balancers.',
  },
  {
    pattern: /^(privacysek-session|consent-state|cookieconsent_status|OptanonConsent|OptanonAlertBoxClosed|CookieConsent)$/i,
    category: 'necessary',
    provider: 'Consent Management',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Stores the visitor\'s cookie consent preferences and compliance audit trail.',
  },

  // ANALYTICS & MEASUREMENT
  {
    pattern: /^(_ga|_gid|_gat.*|AMP_TOKEN|_gac_.*)$/i,
    category: 'analytics',
    provider: 'Google Analytics',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Distinguishes unique visitors and monitors page performance metrics in Google Analytics.',
  },
  {
    pattern: /^(_clck|_clsk|CLID|ANONCHK|MR|MUID)$/i,
    category: 'analytics',
    provider: 'Microsoft Clarity',
    partyHint: 'Third-party',
    confidence: 'high',
    purpose: 'Session replay recording and behavioral heatmap telemetry.',
  },
  {
    pattern: /^(_pk_id.*|_pk_ses.*|_pk_ref.*|_pk_cvar.*)$/i,
    category: 'analytics',
    provider: 'Matomo Analytics',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Self-hosted or cloud web traffic analytics and journey attribution.',
  },
  {
    pattern: /^(_hj.*|ajs_.*|mp_.*_mixpanel|amplitude_id.*)$/i,
    category: 'analytics',
    provider: 'Product Analytics',
    partyHint: 'Third-party',
    confidence: 'high',
    purpose: 'User experience measurement, funnel analysis, and feature engagement metrics.',
  },

  // ADVERTISING & TARGETING
  {
    pattern: /^(_fbp|_fbc|fr|tr)$/i,
    category: 'advertising',
    provider: 'Meta Platforms (Facebook)',
    partyHint: 'Third-party',
    confidence: 'high',
    purpose: 'Used by Meta to deliver and measure targeted advertisements across Facebook and Instagram.',
  },
  {
    pattern: /^(__gads|__gpi|IDE|test_cookie|DSID|RUL|GED_PLAYLIST_ACTIVITY)$/i,
    category: 'advertising',
    provider: 'Google AdSense / DoubleClick',
    partyHint: 'Third-party',
    confidence: 'high',
    purpose: 'Delivers personalized advertisements and measures campaign conversion frequency.',
  },
  {
    pattern: /^(bcookie|bscookie|lidc|UserMatchHistory|AnalyticsSyncHistory)$/i,
    category: 'advertising',
    provider: 'LinkedIn Marketing Solutions',
    partyHint: 'Third-party',
    confidence: 'high',
    purpose: 'Tracks LinkedIn members across web properties for advertising attribution and professional demographics.',
  },
  {
    pattern: /^(muc_ads|personalization_id|guest_id|cto_bundle|cto_bidid|criteo_.*)$/i,
    category: 'advertising',
    provider: 'AdTech & Retargeting Network',
    partyHint: 'Third-party',
    confidence: 'high',
    purpose: 'Dynamic programmatic retargeting and cross-site audience segmentation.',
  },

  // FUNCTIONAL & PREFERENCES
  {
    pattern: /^(lang|language|locale|pref_lang|ps_lang|selected_language|i18next.*)$/i,
    category: 'functional',
    provider: 'Website Personalization',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Remembers the visitor\'s selected language preference across visits.',
  },
  {
    pattern: /^(theme|color_scheme|dark_mode|mode|theme_pref)$/i,
    category: 'functional',
    provider: 'Website Personalization',
    partyHint: 'First-party',
    confidence: 'high',
    purpose: 'Remembers user interface appearance, dark/light theme, and contrast settings.',
  },
  {
    pattern: /^(currency|timezone|recently_viewed|cart_items|wishlist)$/i,
    category: 'functional',
    provider: 'E-Commerce / Application',
    partyHint: 'First-party',
    confidence: 'medium',
    purpose: 'Stores shopping cart items, local currency display, or client-side preferences.',
  },

  // SOCIAL MEDIA & EMBEDDED MEDIA
  {
    pattern: /^(VISITOR_INFO1_LIVE|YSC|GPS|PREF|yt-remote-.*)$/i,
    category: 'social_media',
    provider: 'YouTube / Google LLC',
    partyHint: 'Third-party',
    confidence: 'high',
    purpose: 'Embedded YouTube video player bandwidth estimation and playback preferences.',
  },
  {
    pattern: /^(vuid|player)$/i,
    category: 'social_media',
    provider: 'Vimeo LLC',
    partyHint: 'Third-party',
    confidence: 'high',
    purpose: 'Embedded Vimeo video player telemetry and analytics.',
  },
];

/**
 * Classifies an observed cookie by name, domain, path, and security flags.
 */
export function classifyCookie(cookie, targetOrigin) {
  const { name, domain, secure, httpOnly, sameSite, expires } = cookie;

  // Determine first vs third party
  let party = 'First-party';
  let targetHost = '';
  try {
    targetHost = new URL(targetOrigin).hostname.toLowerCase();
  } catch {
    targetHost = '';
  }

  const cookieDomain = (domain || '').replace(/^\./, '').toLowerCase();
  if (cookieDomain && targetHost) {
    if (!targetHost.endsWith(cookieDomain) && !cookieDomain.endsWith(targetHost)) {
      party = 'Third-party';
    }
  }

  // Calculate duration string
  let duration = 'Session';
  if (expires && expires > 0) {
    const nowSec = Date.now() / 1000;
    const diffSec = expires - nowSec;
    if (diffSec > 0) {
      const days = Math.round(diffSec / 86400);
      if (days <= 1) duration = '24 hours';
      else if (days < 30) duration = `${days} days`;
      else if (days < 365) duration = `${Math.round(days / 30)} months`;
      else duration = `${(days / 365).toFixed(1)} years`;
    }
  }

  // Check known patterns
  for (const rule of KNOWN_COOKIE_RULES) {
    if (rule.pattern.test(name)) {
      return {
        name,
        domain: domain || targetHost,
        category: rule.category,
        confidence: rule.confidence,
        provider: rule.provider,
        party: rule.partyHint || party,
        duration,
        description: rule.purpose,
        secure: Boolean(secure),
        httpOnly: Boolean(httpOnly),
        sameSite: sameSite || 'Lax',
        classificationStatus: 'Reviewed',
      };
    }
  }

  // Fallback heuristics based on flags and name clues
  if (/session|sess|auth|token|jwt|login/i.test(name) && httpOnly) {
    return {
      name,
      domain: domain || targetHost,
      category: 'necessary',
      confidence: 'medium',
      provider: party === 'First-party' ? 'Application Server' : 'Third-party Service',
      party,
      duration,
      description: 'Potentially maintains authenticated visitor session or authentication token (HTTP-only flag detected).',
      secure: Boolean(secure),
      httpOnly: Boolean(httpOnly),
      sameSite: sameSite || 'Lax',
      classificationStatus: 'Review required',
    };
  }

  if (/track|pixel|event|ad|lead|banner|click/i.test(name)) {
    return {
      name,
      domain: domain || targetHost,
      category: 'advertising',
      confidence: 'medium',
      provider: party === 'Third-party' ? 'Third-party Ad Network' : 'First-party Marketing',
      party,
      duration,
      description: 'Potential conversion attribution or marketing tracking parameter.',
      secure: Boolean(secure),
      httpOnly: Boolean(httpOnly),
      sameSite: sameSite || 'Lax',
      classificationStatus: 'Review required',
    };
  }

  // Unclassified
  return {
    name,
    domain: domain || targetHost,
    category: 'unclassified',
    confidence: 'low',
    provider: party === 'First-party' ? 'First-party Host' : 'Third-party Service',
    party,
    duration,
    description: 'Unknown cookie observed during site crawl. Requires manual privacy review.',
    secure: Boolean(secure),
    httpOnly: Boolean(httpOnly),
    sameSite: sameSite || 'Lax',
    classificationStatus: 'Review required',
  };
}
