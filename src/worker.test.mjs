import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractUtm,
  truncateIP,
  firstLanguage,
  getUmamiWebsiteId,
  requestForAssetHost,
} from "./worker.mjs";
import { detectBot } from "./lib/analytics-policy.mjs";

test("extractUtm surfaces UTM params and cleans the URL", () => {
  const sp = new URLSearchParams(
    "utm_source=hn&utm_medium=social&ref=twitter&utm_campaign=launch",
  );
  const { cleanedSearch, utmData } = extractUtm(sp);
  assert.deepEqual(utmData, {
    utm_source: "hn",
    utm_medium: "social",
    utm_campaign: "launch",
  });
  // Non-UTM params are preserved; UTM keys are stripped.
  assert.equal(cleanedSearch, "?ref=twitter");
});

test("extractUtm returns empty search when no params remain", () => {
  const { cleanedSearch, utmData } = extractUtm(new URLSearchParams(""));
  assert.equal(cleanedSearch, "");
  assert.deepEqual(utmData, {});
});

test("truncateIP zeroes the host portion", () => {
  assert.equal(truncateIP("203.0.113.42"), "203.0.113.0");
  assert.equal(
    truncateIP("2001:db8:1234:5678:9abc:def0:1234:5678"),
    "2001:db8:1234::",
  );
  assert.equal(truncateIP(null), null);
  assert.equal(truncateIP("not-an-ip"), null);
});

test("firstLanguage takes the first Accept-Language tag", () => {
  assert.equal(firstLanguage("fr-CA,fr;q=0.9,en;q=0.8"), "fr-CA");
  assert.equal(firstLanguage(""), "");
  assert.equal(firstLanguage(null), "");
});

test("getUmamiWebsiteId routes brand host to _ID2 with fallback", () => {
  const env = { UMAMI_WEBSITE_ID: "main", UMAMI_WEBSITE_ID2: "brand" };
  assert.equal(getUmamiWebsiteId("wgo-audit.com", env), "main");
  assert.equal(getUmamiWebsiteId("www.wgo-audit.com", env), "main");
  assert.equal(getUmamiWebsiteId("brand.wgo-audit.com", env), "brand");
  // Fallback when _ID2 is unset.
  assert.equal(
    getUmamiWebsiteId("brand.wgo-audit.com", { UMAMI_WEBSITE_ID: "main" }),
    "main",
  );
});

test("requestForAssetHost rewrites brand host into the /brand subtree", () => {
  const brandReq = new Request("https://brand.wgo-audit.com/logo/");
  const rewritten = requestForAssetHost(
    brandReq,
    new URL("https://brand.wgo-audit.com/logo/"),
  );
  assert.equal(new URL(rewritten.url).pathname, "/brand/logo/");

  // Main host is untouched.
  const mainReq = new Request("https://wgo-audit.com/");
  const same = requestForAssetHost(mainReq, new URL("https://wgo-audit.com/"));
  assert.equal(new URL(same.url).pathname, "/");
});

test("detectBot tags known crawlers and passes humans", () => {
  assert.equal(detectBot("Mozilla/5.0 (compatible; Googlebot/2.1)"), "Googlebot");
  assert.equal(detectBot("ClaudeBot/1.0"), "ClaudeBot");
  assert.equal(
    detectBot(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    ),
    null,
  );
});
