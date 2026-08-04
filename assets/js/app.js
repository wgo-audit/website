/* WGO site behaviour — deliberately tiny.
 * No analytics here (analytics are server-side in the Worker).
 *   1. theme toggle (persists choice; light is default)
 *   2. mobile menu open/close
 *   3. copy-to-clipboard for the install command
 * All hooks are data-attributes so markup stays declarative and CSP-friendly. */
(function () {
  "use strict";

  // ── Theme toggle ─────────────────────────────────────────────────────────
  function setTheme(dark) {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch (e) {
      /* ignore */
    }
  }
  document.querySelectorAll('[data-action="toggle-theme"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTheme(!document.documentElement.classList.contains("dark"));
    });
  });

  // ── Mobile menu ──────────────────────────────────────────────────────────
  var menu = document.getElementById("mobile-menu");
  var toggle = document.getElementById("mobile-menu-toggle");
  if (menu && toggle) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("hidden") === false;
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close the menu after tapping a link.
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.add("hidden");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ── Copy install command ─────────────────────────────────────────────────
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      if (!text || !navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        var done = btn.getAttribute("data-copied-label");
        var prev = btn.getAttribute("aria-label");
        if (done) {
          btn.setAttribute("aria-label", done);
          btn.classList.add("is-copied");
          setTimeout(function () {
            btn.setAttribute("aria-label", prev || "");
            btn.classList.remove("is-copied");
          }, 1600);
        }
      });
    });
  });
})();
