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
    const url = new URL(request.url);
    const method = request.method;

    // Contact form — a plain HTML POST, handled here and mailed via Cloudflare
    // Email (no third-party email API). See handleContact below.
    if (url.pathname === CONTACT_ENDPOINT) {
      return handleContact(request, env);
    }

    if (method !== "GET" && method !== "HEAD") {
      return env.ASSETS.fetch(request);
    }


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

/* ---------------------------------------------------------------------------
   Contact form

   A plain HTML POST — no JavaScript on the page. The form is validated here and
   mailed with Cloudflare Email (the `CONTACT_EMAIL` send binding), then answered
   with a 303 to the confirmation page so a refresh cannot resubmit it.

   Config:
     - CONTACT_EMAIL : send binding (wrangler.toml [[send_email]])
     - CONTACT_TO    : the VERIFIED Email Routing destination that receives the
                       mail — an inbox, not a routing address (runtime var/secret)
     - CONTACT_FROM  : the From identity, on an onboarded domain
                       (default "WGO Contact <privacy@wgo-audit.com>")
     - CONTACT_LIMITER : optional Workers rate-limit binding (fails open)
   --------------------------------------------------------------------------- */
const CONTACT_ENDPOINT = "/api/contact";

// Long enough for a real enquiry, short enough that the endpoint cannot relay
// bulk content through our domain.
const FIELD_LIMITS = { name: 100, email: 254, subject: 120, message: 5000 };

const FALLBACK_REDIRECT = { en: "/en/contact/sent/", fr: "/fr/contact/envoye/" };

async function handleContact(request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return contactError(request, "en", 400);
  }

  const field = (name) => String(form.get(name) || "").trim();
  const locale = field("locale") === "fr" ? "fr" : "en";

  if (!(await withinRateLimit(request, env))) {
    return contactError(request, locale, 429);
  }

  // The honeypot is invisible and untabbable, so only a bot fills it. Answer as
  // if it worked: a bot told it failed simply tries again, differently.
  if (field("website")) {
    return redirectAfterPost(request, safeRedirect(field("redirect"), locale));
  }

  const name = field("name");
  const email = field("email");
  const message = field("message");

  if (!name || !email || !message) return contactError(request, locale, 400);
  if (!form.get("consent")) return contactError(request, locale, 400);
  if (!isEmail(email)) return contactError(request, locale, 400);
  if (oversized(field)) return contactError(request, locale, 413);

  if (!env.CONTACT_EMAIL || !env.CONTACT_TO) {
    console.error("contact form: CONTACT_EMAIL binding or CONTACT_TO is not configured");
    return contactError(request, locale, 500);
  }

  const details = [`Name: ${name}`, `Email: ${email}`, `Language: ${locale}`];
  const body = `${details.join("\n")}\n\n${message}`;

  // headerSafe on everything that lands in a header: a newline in the name or the
  // address is a mail-header injection. The body is not a header.
  try {
    await env.CONTACT_EMAIL.send({
      from: env.CONTACT_FROM || "WGO Contact <privacy@wgo-audit.com>",
      to: env.CONTACT_TO,
      replyTo: headerSafe(email),
      subject: headerSafe(`${field("subject") || "WGO contact"} — ${name}`),
      text: body,
    });
  } catch (err) {
    // Never log the body — it is the visitor's message.
    console.error("contact form: send failed:", err && err.message);
    return contactError(request, locale, 502);
  }

  return redirectAfterPost(request, safeRedirect(field("redirect"), locale));
}

/**
 * Five submissions a minute per IP. Best-effort and per-colo — a brake on
 * floods, not an exact quota. Fails open: if the binding is missing (local dev)
 * or errors, the form still works. A form that silently stops accepting mail is
 * a worse failure than one that accepts a burst.
 */
async function withinRateLimit(request, env) {
  if (!env.CONTACT_LIMITER) return true;
  const key = request.headers.get("cf-connecting-ip");
  if (!key) return true;
  try {
    const { success } = await env.CONTACT_LIMITER.limit({ key });
    return success;
  } catch {
    console.error("contact form: rate limiter unavailable");
    return true;
  }
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= FIELD_LIMITS.email;
}

function oversized(field) {
  return Object.entries(FIELD_LIMITS).some(([name, limit]) => field(name).length > limit);
}

// CR and LF are the whole of a header-injection attack. Strip, do not escape.
function headerSafe(value) {
  return String(value).replace(/[\r\n]+/g, " ").trim();
}

// Only ever redirect to a path on this site. "//evil.example" is a protocol-
// relative URL and would leave the origin, so a leading "/" alone is not enough.
function safeRedirect(candidate, locale) {
  const fallback = FALLBACK_REDIRECT[locale];
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  return candidate;
}

function redirectAfterPost(request, path) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = "";
  // 303, not 302: the follow-up must be a GET, or a refresh resubmits the form.
  return new Response(null, {
    status: 303,
    headers: { location: url.toString(), "cache-control": "no-store" },
  });
}

function contactError(request, locale, status) {
  const back = locale === "fr" ? "/fr/contact/" : "/en/contact/";
  const throttled = status === 429;
  const copy =
    locale === "fr"
      ? {
          lang: "fr-CA",
          title: throttled ? "Trop de tentatives" : "Le message n'a pas pu être envoyé",
          body: throttled
            ? "Vous avez envoyé plusieurs messages coup sur coup. Patientez une minute et réessayez, ou écrivez directement à privacy@wgo-audit.com."
            : "Une erreur est survenue. Réessayez, ou écrivez directement à privacy@wgo-audit.com.",
          link: "Retour au formulaire",
        }
      : {
          lang: "en-CA",
          title: throttled ? "Too many attempts" : "Your message could not be sent",
          body: throttled
            ? "You have sent several messages in quick succession. Please wait a minute and try again, or write directly to privacy@wgo-audit.com."
            : "Something went wrong. Please try again, or write directly to privacy@wgo-audit.com.",
          link: "Back to the form",
        };

  const html = `<!doctype html>
<html lang="${copy.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${copy.title}</title>
<style>:root{color-scheme:light dark}body{margin:0;min-height:100vh;display:grid;place-items:center;
font:16px/1.6 system-ui,sans-serif;background:#fff;color:#0a1424;padding:2rem}
@media(prefers-color-scheme:dark){body{background:#060d18;color:#e5e7eb}}
main{max-width:32rem}h1{font-size:1.5rem;margin:0 0 .5rem}a{color:#0d9488;font-weight:600}</style></head>
<body><main><h1>${copy.title}</h1><p>${copy.body}</p><p><a href="${back}">${copy.link}</a></p></main></body></html>`;

  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

// Exported for unit tests.
export {
  extractUtm,
  truncateIP,
  firstLanguage,
  getUmamiWebsiteId,
  requestForAssetHost,
  isEmail,
  headerSafe,
  safeRedirect,
  oversized,
};
