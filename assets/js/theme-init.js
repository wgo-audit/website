/* Theme pre-paint — MUST load synchronously in <head> before <body> renders,
 * to avoid a flash when a returning visitor has chosen dark.
 * The site is LIGHT by default: we only switch to dark when the visitor has
 * explicitly toggled it (stored as 'dark'). We do not auto-follow the OS. */
(function () {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {
    /* private-mode or storage blocked; stay light */
  }
})();
