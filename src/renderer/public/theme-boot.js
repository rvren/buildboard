// No-flash theme: runs synchronously before the app bundle. Desktop reads the
// preload bridge; the web build falls back to localStorage. A separate same-origin
// file (not inline) so the strict CSP script-src 'self' still allows it.
(function () {
  try {
    var mode =
      window.api && window.api.getThemeSync
        ? window.api.getThemeSync().mode
        : localStorage.getItem("buildboard.theme");
    if (mode === "dark") document.documentElement.classList.add("dark");
  } catch (e) {
    /* first run — default light */
  }
})();
