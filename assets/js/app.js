/* Purplusnow app showcase — progressive enhancement only.
   Content is server-rendered per language (see tools/build.py); this script
   just adds theme toggle, language-menu open/close, and read-more toggles. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);

  // Remember the chosen language so the root page won't auto-redirect away.
  function rememberLang(code) {
    try { localStorage.setItem("pn_lang", code); localStorage.setItem("pn_lang_seen", "1"); } catch (e) {}
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    const isDark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("pn_theme", next); } catch (e) {}
  }

  const menu = $("#langMenu");
  const langBtn = $("#langBtn");
  function openMenu() { menu.hidden = false; langBtn.setAttribute("aria-expanded", "true"); }
  function closeMenu() { menu.hidden = true; langBtn.setAttribute("aria-expanded", "false"); }

  function wire() {
    const themeBtn = $("#themeToggle");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    if (langBtn && menu) {
      langBtn.addEventListener("click", e => {
        e.stopPropagation();
        menu.hidden ? openMenu() : closeMenu();
      });
      menu.querySelectorAll("a[href]").forEach(a => {
        a.addEventListener("click", () => {
          const code = (a.getAttribute("href").replace(/\//g, "")) || "en";
          rememberLang(code);
        });
      });
      document.addEventListener("click", e => { if (!e.target.closest(".lang-picker")) closeMenu(); });
      document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
    }

    document.querySelectorAll(".read-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const desc = btn.previousElementSibling;
        if (!desc) return;
        const clamped = desc.classList.toggle("clamped");
        btn.textContent = clamped ? btn.dataset.more : btn.dataset.less;
      });
    });

    // Mark current language as seen so returning to "/" keeps the user's choice.
    const cur = document.documentElement.lang || "en";
    const base = cur.toLowerCase().split("-")[0];
    rememberLang(base === "zh" ? "zh" : base);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
