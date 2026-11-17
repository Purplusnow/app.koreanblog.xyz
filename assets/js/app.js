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


  // Shuffle app cards on every visit (HTML stays download-sorted for crawlers/no-JS).
  function shuffleCards() {
    document.querySelectorAll(".app-grid").forEach(grid => {
      const cards = Array.from(grid.children).filter(el => el.classList.contains("card"));
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      cards.forEach(c => grid.appendChild(c));
    });
  }
  // Script is loaded at the end of <body>, so the grid already exists — run now, before first paint.
  shuffleCards();

  // Screenshot strips: load each data-src shot only when it scrolls (sideways)
  // near the visible part of its strip. Native loading="lazy" fetches every
  // image in a strip once the strip itself is near the viewport.
  function lazyShots() {
    const load = img => { img.src = img.dataset.src; img.removeAttribute("data-src"); };
    const pending = document.querySelectorAll(".shots img[data-src]");
    if (!("IntersectionObserver" in window)) { pending.forEach(load); return; }
    const near = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      near.unobserve(e.target);
      const strip = e.target;
      const inStrip = new IntersectionObserver(xs => xs.forEach(x => {
        if (x.isIntersecting) { inStrip.unobserve(x.target); load(x.target); }
      }), { root: strip, rootMargin: "0px 50% 0px 0px" });  // ~one shot ahead
      strip.querySelectorAll("img[data-src]").forEach(img => inStrip.observe(img));
    }), { rootMargin: "600px 0px" });
    document.querySelectorAll(".shots").forEach(s => near.observe(s));
  }

  function wire() {
    lazyShots();
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
