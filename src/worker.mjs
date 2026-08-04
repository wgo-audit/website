import { detectBot } from "./lib/analytics-policy.mjs";

/**
 * wgo-audit.com edge worker — server-side analytics.
 *
 * Architecture:
 *   - wrangler.toml's run_worker_first = ["/*", "!/js/*", ...] narrows Worker
 *     invocation to HTML-ish paths. Asset requests never reach this code
 *     (and aren't billed).
 *   - This Worker fetches the HTML from env.ASSETS, returns it to the user,
 *     and fires a background Umami pageview via ctx.waitUntil().
 *
 * Non-goals:
 *   - No client-side JS, no cookies. Zero client impact.
 *
 * Privacy:
 *   - The browser only talks to wgo-audit.com — never to Umami directly.
 *   - We forward User-Agent and (per UMAMI_GEO_IP_MODE) the visitor IP so Umami's
 *     browser/country detection works.
 *
 * Config:
 *   - UMAMI_ENDPOINT     : e.g. "https://cloud.umami.is/api/send"   (wrangler.toml [vars])
 *   - UMAMI_GEO_IP_MODE  : "full" | "truncate" | "none"             (wrangler.toml [vars])
 *   - UMAMI_WEBSITE_ID   : UUID for wgo-audit.com                   (SECRET, dashboard runtime)
 *   - UMAMI_WEBSITE_ID2  : UUID for brand.wgo-audit.com (optional; falls back to _ID)
 *
 * Set secrets at RUNTIME (Cloudflare → Settings → Variables and Secrets), never
 * the Build section.
 */

const ASSET_EXT_RE =
  /\.(css|js|mjs|map|json|xml|txt|ico|svg|png|jpg|jpeg|gif|webp|avif|woff2?|ttf|otf|eot|pdf|zip|wasm|webmanifest)$/i;

const HOST_SCOPED_ASSET_RE =
  /^\/(?:robots\.txt|sitemap\.xml|index\.xml)$|^\/[^/]+\/(?:sitemap\.xml|index\.xml)$/i;

const BRAND_HOSTS = new Set(["brand.wgo-audit.com"]);
const MAIN_HOSTS = new Set(["wgo-audit.com", "www.wgo-audit.com"]);

const WORKER_UA_FALLBACK =
  // Real-looking browser UA so Umami's isbot filter doesn't drop the event on
  // the OUTBOUND request. The visitor's real UA still travels in payload.userAgent
  // (read from the JSON body, not the header) for accurate attribution.
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.0 Safari/605.1.15";

export default {
  async fetch(request, env, ctx) {
    const method = request.method;
    if (method !== "GET" && method !== "HEAD") {
      return env.ASSETS.fetch(request);
    }

    const url = new URL(request.url);

    // Guard against any asset request that slipped past the wrangler glob.
    if (ASSET_EXT_RE.test(url.pathname)) {
      if (
        BRAND_HOSTS.has(url.hostname.toLowerCase()) &&
        HOST_SCOPED_ASSET_RE.test(url.pathname)
      ) {
        return env.ASSETS.fetch(requestForAssetHost(request, url));
      }
      return env.ASSETS.fetch(request);
    }

    const assetRequest = requestForAssetHost(request, url);
    const response = await env.ASSETS.fetch(assetRequest);

    const contentType = response.headers.get("content-type") || "";
    const isHtml = contentType.toLowerCase().startsWith("text/html");
    const isTrackableStatus = response.status === 200 || response.status === 404;

    if (isHtml && isTrackableStatus && method === "GET") {
      ctx.waitUntil(trackPageview(request, env, response.status));
    }

    return response;
  },
};

/**
 * Fire a single Umami event for the request.
 *   - 200 + non-bot UA + no UTMs → standard pageview.
 *   - 200 + non-bot UA + UTMs    → event name="campaign", data.utm_*.
 *   - 200 + bot UA               → event name="bot", data.bot_name (+ utm_*).
 *   - 404                        → event name="404" (+ utm_*).
 */
async function trackPageview(request, env, status) {
  const url = new URL(request.url);
  const websiteId = getUmamiWebsiteId(url.hostname, env);

  if (!websiteId || !env.UMAMI_ENDPOINT) {
    // Secrets missing — silently skip (keeps `wrangler dev` quiet).
    return;
  }

  try {
    const headers = request.headers;
    const { cleanedSearch, utmData } = extractUtm(url.searchParams);

    const payload = {
      hostname: url.hostname,
      language: firstLanguage(headers.get("accept-language")),
      referrer: headers.get("referer") || "",
      url: url.pathname + cleanedSearch,
      website: websiteId,
    };

    const visitorUA = headers.get("user-agent");
    const visitorIP = headers.get("cf-connecting-ip");
    if (visitorUA) payload.userAgent = visitorUA;

    // IP handling is controlled by env.UMAMI_GEO_IP_MODE:
    //   "full"     → forward the visitor's full IP (most accurate geo/city)
    //   "truncate" → network-prefix only (country-level geo, privacy-preserving) [default]
    //   "none"     → send no IP at all
    const geoMode = (env.UMAMI_GEO_IP_MODE || "truncate").toLowerCase();
    if (visitorIP && geoMode !== "none") {
      const ip = geoMode === "full" ? visitorIP : truncateIP(visitorIP);
      if (ip) payload.ip = ip;
    }

    const botName = detectBot(visitorUA);
    const hasUtm = Object.keys(utmData).length > 0;

    if (status === 404) {
      payload.name = "404";
      if (hasUtm) payload.data = utmData;
    } else if (botName) {
      payload.name = "bot";
      payload.data = { bot_name: botName, ...utmData };
    } else if (hasUtm) {
      payload.name = "campaign";
      payload.data = utmData;
    }

    const body = { type: "event", payload };
    const outgoingUA = botName || !visitorUA ? WORKER_UA_FALLBACK : visitorUA;

    await fetch(env.UMAMI_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": outgoingUA,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("umami tracking failed:", err);
  }
}

/**
 * Choose the Umami website ID for the current host. UMAMI_WEBSITE_ID2 is
 * reserved for brand.wgo-audit.com and falls back to the main ID.
 */
function getUmamiWebsiteId(hostname, env) {
  if (BRAND_HOSTS.has(hostname.toLowerCase())) {
    return env.UMAMI_WEBSITE_ID2 || env.UMAMI_WEBSITE_ID;
  }
  return env.UMAMI_WEBSITE_ID;
}

/**
 * Route the brand hostname to its generated /brand subtree in the shared asset
 * bucket. Dormant until the brand site ships, but ready.
 */
function requestForAssetHost(request, url) {
  if (!BRAND_HOSTS.has(url.hostname.toLowerCase())) {
    return request;
  }
  const assetUrl = new URL(url);
  assetUrl.pathname = "/brand" + assetUrl.pathname;
  return new Request(assetUrl, request);
}

/** "fr-CA,fr;q=0.9,en;q=0.8" → "fr-CA" */
function firstLanguage(header) {
  if (!header) return "";
  const first = header.split(",")[0] || "";
  return first.split(";")[0].trim();
}

/**
 * Extract Google UTM params for filterable Umami dimensions, and return a
 * cleaned search string with those keys removed. Non-UTM params are preserved.
 */
function extractUtm(sp) {
  const UTM_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];
  const utmData = {};
  const cleaned = new URLSearchParams(sp);

  for (const key of UTM_KEYS) {
    const value = cleaned.get(key);
    if (value !== null && value !== "") {
      utmData[key] = value;
    }
    cleaned.delete(key);
  }

  const cleanedSearchString = cleaned.toString();
  return {
    cleanedSearch: cleanedSearchString ? "?" + cleanedSearchString : "",
    utmData,
  };
}

/**
 * Truncate an IP for privacy: keep the network prefix (country-level geo),
 * zero the host portion. IPv4 → last octet 0; IPv6 → first 3 groups + "::".
 */
function truncateIP(ip) {
  if (!ip) return null;

  if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  if (ip.includes(":")) {
    const parts = ip.split(":");
    const firstThree = parts.slice(0, 3).map((p) => p || "0");
    while (firstThree.length < 3) firstThree.push("0");
    return firstThree.join(":") + "::";
  }

  return null;
}

// Exported for unit tests.
export { extractUtm, truncateIP, firstLanguage, getUmamiWebsiteId, requestForAssetHost };
