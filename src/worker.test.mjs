import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractUtm,
  truncateIP,
  firstLanguage,
  getUmamiWebsiteId,
  requestForAssetHost,
  isEmail,
  headerSafe,
  safeRedirect,
  oversized,
  contactRecipients,
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

test("isEmail accepts a plausible address and rejects junk", () => {
  assert.equal(isEmail("someone@example.com"), true);
  assert.equal(isEmail("no-at-sign"), false);
  assert.equal(isEmail("a@b"), false);
  assert.equal(isEmail("spaces in@example.com"), false);
  assert.equal(isEmail("x".repeat(250) + "@example.com"), false); // over 254
});

test("headerSafe strips CR/LF to defeat header injection", () => {
  assert.equal(headerSafe("Real Name"), "Real Name");
  assert.equal(headerSafe("evil\r\nBcc: victim@example.com"), "evil Bcc: victim@example.com");
  assert.equal(headerSafe("  trimmed \n"), "trimmed");
});

test("safeRedirect only allows same-site paths", () => {
  assert.equal(safeRedirect("/en/contact/sent/", "en"), "/en/contact/sent/");
  assert.equal(safeRedirect("//evil.example", "en"), "/en/contact/sent/"); // protocol-relative
  assert.equal(safeRedirect("https://evil.example", "fr"), "/fr/contact/envoye/");
  assert.equal(safeRedirect("", "fr"), "/fr/contact/envoye/");
});

test("oversized flags a field past its limit", () => {
  const under = (name) => (name === "message" ? "x".repeat(100) : "ok");
  const over = (name) => (name === "message" ? "x".repeat(6000) : "ok");
  assert.equal(oversized(under), false);
  assert.equal(oversized(over), true);
});

test("contactRecipients parses one or many verified destinations", () => {
  assert.deepEqual(contactRecipients("a@example.com"), ["a@example.com"]);
  assert.deepEqual(contactRecipients("a@example.com, b@example.org"), ["a@example.com", "b@example.org"]);
  assert.deepEqual(contactRecipients("  a@x.com , ,b@y.com "), ["a@x.com", "b@y.com"]);
  assert.deepEqual(contactRecipients(""), []);
  assert.deepEqual(contactRecipients(undefined), []);
});
