import dns from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * Checks if an IPv4 or IPv6 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateIp(ip) {
  if (!ip) return true;

  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  // IPv4 checks
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const [b0, b1, b2, b3] = parts;

    // Loopback: 127.0.0.0/8
    if (b0 === 127) return true;

    // Zero / Current network: 0.0.0.0/8
    if (b0 === 0) return true;

    // Private Class A: 10.0.0.0/8
    if (b0 === 10) return true;

    // Private Class B: 172.16.0.0/12 (172.16 - 172.31)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

    // Private Class C: 192.168.0.0/16
    if (b0 === 192 && b1 === 168) return true;

    // Link-local / Cloud metadata (AWS, GCP, Azure, OpenStack): 169.254.0.0/16
    if (b0 === 169 && b1 === 254) return true;

    // Shared address space (Carrier-grade NAT): 100.64.0.0/10 (100.64 - 100.127)
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // IETF Protocol assignments: 192.0.0.0/24
    if (b0 === 192 && b1 === 0 && b2 === 0) return true;

    // Documentation: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
    if (b0 === 192 && b1 === 0 && b2 === 2) return true;
    if (b0 === 198 && b1 === 51 && b2 === 100) return true;
    if (b0 === 203 && b1 === 0 && b2 === 113) return true;

    // Multicast & Reserved: 224.0.0.0/4 and 240.0.0.0/4
    if (b0 >= 224) return true;

    // Broadcast: 255.255.255.255
    if (b0 === 255 && b1 === 255 && b2 === 255 && b3 === 255) return true;

    return false;
  }

  // IPv6 checks
  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase();
    // Loopback ::1
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
    // Unique local address fc00::/7 (fc00:: - fdff::)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    // Link-local unicast fe80::/10 (fe80:: - febf::)
    if (/^fe[89ab]/i.test(normalized)) return true;
    // Multicast ff00::/8
    if (normalized.startsWith('ff')) return true;

    return false;
  }

  return true;
}

const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);
const dnsCache = new Map(); // hostname -> { safe: boolean, expires: number }

/**
 * Checks if a hostname or IP address resolves safely to a public destination.
 */
export async function isHostSafeFromSSRF(hostname, allowLocalhost = false) {
  if (!hostname || typeof hostname !== 'string') return false;
  const lower = hostname.toLowerCase().trim();

  if (allowLocalhost) return true;

  if (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === '0.0.0.0'
  ) {
    return false;
  }

  if (isIP(lower)) {
    return !isPrivateIp(lower);
  }

  const cached = dnsCache.get(lower);
  if (cached && Date.now() < cached.expires) {
    return cached.safe;
  }

  try {
    const records = await dns.lookup(lower, { all: true });
    if (!records || records.length === 0) return false;
    for (const rec of records) {
      if (isPrivateIp(rec.address)) {
        dnsCache.set(lower, { safe: false, expires: Date.now() + 60000 });
        return false;
      }
    }
    dnsCache.set(lower, { safe: true, expires: Date.now() + 60000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates a user-supplied target URL against SSRF threats.
 * @param {string} rawUrl - The input URL string.
 * @param {boolean} allowLocalhostForTesting - Only true in test mocks if explicitly configured.
 * @returns {Promise<{ valid: boolean, error?: string, url?: string, hostname?: string }>}
 */
export async function validateTargetUrl(rawUrl, allowLocalhostForTesting = false) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Website URL is required.' };
  }

  const trimmed = rawUrl.trim();
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Include http:// or https://.' };
  }

  // 1. Protocol validation: must be HTTP or HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: `Protocol "${parsed.protocol}" is not supported. Only HTTP and HTTPS are permitted.` };
  }

  // 2. Port validation: standard web ports only
  if (parsed.port && !ALLOWED_PORTS.has(parsed.port)) {
    return { valid: false, error: `Port "${parsed.port}" is not allowed. Standard web ports (80, 443, 8080, 8443) only.` };
  }

  // 3. Hostname checks
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { valid: false, error: 'URL must contain a valid hostname.' };
  }

  if (!allowLocalhostForTesting) {
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname === '0.0.0.0'
    ) {
      return { valid: false, error: 'Internal and loopback addresses are blocked for security (SSRF prevention).' };
    }
  }

  // 4. If hostname is a direct IP address
  if (isIP(hostname)) {
    if (!allowLocalhostForTesting && isPrivateIp(hostname)) {
      return { valid: false, error: `Direct IP ${hostname} is in a private, loopback, or reserved network range.` };
    }
    return { valid: true, url: parsed.href, hostname };
  }

  // 5. DNS Resolution check (prevent DNS rebinding & private IP resolution)
  try {
    const records = await dns.lookup(hostname, { all: true });
    if (!records || records.length === 0) {
      return { valid: false, error: `Could not resolve domain name "${hostname}". Check spelling and connectivity.` };
    }

    if (!allowLocalhostForTesting) {
      for (const rec of records) {
        if (isPrivateIp(rec.address)) {
          return {
            valid: false,
            error: `Domain "${hostname}" resolves to protected or internal IP (${rec.address}). Request blocked.`
          };
        }
      }
    }
  } catch (err) {
    return { valid: false, error: `DNS resolution failed for "${hostname}": ${err.message}` };
  }

  return { valid: true, url: parsed.href, hostname };
}

/**
 * Validates a target URL and automatically follows safe HTTP/HTTPS redirects.
 * Scans and returns the final public destination.
 * If any hop redirects to an unsafe or private destination, aborts with an SSRF error.
 *
 * @param {string} rawUrl - Initial user-supplied URL
 * @param {object} options - Configuration options
 * @returns {Promise<{ valid: boolean, error?: string, initialUrl?: string, finalUrl?: string, finalOrigin?: string, redirectChain?: Array, redirected?: boolean }>}
 */
export async function resolveSafeDestination(rawUrl, options = {}) {
  const { maxRedirects = 10, allowLocalhost = false, timeoutMs = 8000 } = options;

  let currentUrl = (rawUrl || '').trim();
  const visited = new Set();
  const redirectChain = [];

  for (let hop = 0; hop <= maxRedirects; hop++) {
    // 1. Validate the current URL against SSRF rules & DNS resolution
    const validation = await validateTargetUrl(currentUrl, allowLocalhost);
    if (!validation.valid) {
      if (hop === 0) {
        return { valid: false, error: validation.error };
      }
      return {
        valid: false,
        error: `Unsafe redirect blocked: destination "${currentUrl}" was rejected (${validation.error}).`,
        redirectChain,
      };
    }

    const normalized = validation.url;
    if (visited.has(normalized)) {
      return {
        valid: false,
        error: `Redirect loop detected at "${normalized}".`,
        redirectChain,
      };
    }
    visited.add(normalized);

    // 2. Perform a pre-flight probe using fetch with redirect: 'manual' to check for HTTP redirects
    let response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        response = await fetch(normalized, {
          method: 'HEAD',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 PrivacySEK-Scanner/1.0',
          },
        });
      } catch (headErr) {
        // Fallback to GET for servers that return 405 on HEAD
        response = await fetch(normalized, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 PrivacySEK-Scanner/1.0',
            'Range': 'bytes=0-1024',
          },
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (probeErr) {
      // If probe failed on initial URL, return normalized URL so Playwright browser can still attempt
      if (hop === 0) {
        return {
          valid: true,
          initialUrl: normalized,
          finalUrl: normalized,
          finalOrigin: new URL(normalized).origin,
          redirectChain: [],
          redirected: false,
        };
      }
      // If probe on subsequent redirect fails, stop at current validated URL
      currentUrl = normalized;
      break;
    }

    // 3. Check for HTTP redirect status codes (301, 302, 303, 307, 308)
    const status = response.status;
    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = response.headers.get('location');
      if (!location) {
        currentUrl = normalized;
        break;
      }

      let nextUrl;
      try {
        nextUrl = new URL(location, normalized).href;
      } catch {
        return {
          valid: false,
          error: `Malformed redirect location "${location}" from "${normalized}".`,
          redirectChain,
        };
      }

      redirectChain.push({
        from: normalized,
        to: nextUrl,
        status,
      });

      currentUrl = nextUrl;
      continue;
    }

    // Response is non-redirect (e.g. 200 OK)
    currentUrl = normalized;
    break;
  }

  const finalParsed = new URL(currentUrl);
  return {
    valid: true,
    initialUrl: rawUrl,
    finalUrl: currentUrl,
    finalOrigin: finalParsed.origin,
    redirectChain,
    redirected: redirectChain.length > 0,
  };
}
