/* Purplusnow app showcase — data-driven, 16 languages, RTL-aware */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const PLAY_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M3.6 2.3a1 1 0 00-.6.9v17.6a1 1 0 001.5.9l3.2-1.8L3.6 2.3zm10.9 8.2L6.9 6.2 16 11.4l-1.5-.9zM18.9 9.7l-2.6-1.5-2.8 3 2.8 3 2.6-1.5a1.6 1.6 0 000-2.9zM6.9 17.8l7.6-4.3 1.5.9L6.9 17.8z"/></svg>';
  const TICK = '<span class="tick" aria-hidden="true">✓</span>';

  let UI = null, DATA = null, locale = "en";

  const state = {
    setLocale(l) {
      locale = (UI.locales[l]) ? l : "en";
      try { localStorage.setItem("pn_lang", locale); } catch (e) {}
      render();
    }
  };

  function pickLocale() {
    const url = new URLSearchParams(location.search).get("lang");
    if (url && UI.locales[url]) return url;
    let saved = null;
    try { saved = localStorage.getItem("pn_lang"); } catch (e) {}
    if (saved && UI.locales[saved]) return saved;
    const navs = navigator.languages || [navigator.language || "en"];
    for (const n of navs) {
      const base = n.toLowerCase().split("-")[0];
      if (base === "zh") return "zh";
      if (UI.locales[base]) return base;
    }
    return "en";
  }

  function t(key) { return (UI.locales[locale] && UI.locales[locale][key]) || UI.locales.en[key] || ""; }
  function appText(app) { return app.i18n[locale] || app.i18n.en; }
  function catName(key) {
    const c = UI.locales[locale] && UI.locales[locale].cat;
    return (c && c[key]) || (UI.locales.en.cat[key]) || key;
  }

  function cardHTML(app) {
    const L = UI.locales[locale];
    const txt = appText(app);
    const isSoon = app.status === "soon";
    const name = txt.name || app.i18n.en.name;
    const tagline = txt.tagline || "";
    // description: drop the tagline duplicate first line if identical
    let desc = txt.desc || "";
    if (tagline && desc.startsWith(tagline)) desc = desc.slice(tagline.length).trim();
    const cta = isSoon ? t("cta_soon") : t("cta_play");
    const badge = isSoon
      ? `<span class="badge soon">${L.badge_soon}</span>`
      : `<span class="badge live">${L.badge_live}</span>`;
    return `
      <article class="card" style="--card-accent:${app.accent}">
        <div class="card-head">
          <img class="card-icon" src="${app.icon}" alt="${escapeHtml(name)}" width="64" height="64" loading="lazy">
          <div class="card-headtext">
            <h3 class="card-name">${escapeHtml(name)}</h3>
            <div class="chip-row"><span class="chip">${catName(app.category)}</span>${badge}</div>
          </div>
        </div>
        ${tagline ? `<p class="card-tagline">${escapeHtml(tagline)}</p>` : ""}
        ${desc ? `<p class="card-desc clamped">${escapeHtml(desc)}</p>
          <button class="read-toggle" type="button" data-more="${escapeHtml(t("read_more"))}" data-less="${escapeHtml(t("read_less"))}">${escapeHtml(t("read_more"))}</button>` : ""}
        <div class="card-foot">
          <a class="btn btn-play" href="${app.playUrl}" target="_blank" rel="noopener">${PLAY_SVG}<span>${escapeHtml(cta)}</span></a>
        </div>
      </article>`;
  }

  function render() {
    const L = UI.locales[locale];
    document.documentElement.lang = locale;
    document.documentElement.dir = L.dir || "ltr";
    // static i18n text nodes
    document.querySelectorAll("[data-i]").forEach(el => { el.textContent = t(el.getAttribute("data-i")); });
    $("#langLabel").textContent = L.label;

    const live = DATA.apps.filter(a => a.status === "live");
    const soon = DATA.apps.filter(a => a.status === "soon");
    $("#liveGrid").innerHTML = live.map(cardHTML).join("");
    const soonSec = $("#soonSection");
    if (soon.length) { soonSec.hidden = false; $("#soonGrid").innerHTML = soon.map(cardHTML).join(""); }
    else soonSec.hidden = true;

    const va = $("#viewAll");
    va.textContent = t("view_all");
    va.href = DATA.developerUrl;

    // read-more toggles
    document.querySelectorAll(".read-toggle").forEach(btn => {
      btn.addEventListener("click", () => {
        const desc = btn.previousElementSibling;
        const clamped = desc.classList.toggle("clamped");
        btn.textContent = clamped ? btn.dataset.more : btn.dataset.less;
      });
    });
    buildLangMenu();
  }

  function buildLangMenu() {
    const menu = $("#langMenu");
    menu.innerHTML = UI.order.map(code => {
      const l = UI.locales[code];
      const sel = code === locale ? ' aria-selected="true"' : "";
      return `<li role="option" data-code="${code}"${sel}><span>${escapeHtml(l.label)}</span>${TICK}</li>`;
    }).join("");
    menu.querySelectorAll("li").forEach(li => {
      li.addEventListener("click", () => { closeLangMenu(); state.setLocale(li.dataset.code); });
    });
  }

  function openLangMenu() { $("#langMenu").hidden = false; $("#langBtn").setAttribute("aria-expanded", "true"); }
  function closeLangMenu() { $("#langMenu").hidden = true; $("#langBtn").setAttribute("aria-expanded", "false"); }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function applyStoredTheme() {
    let th = null;
    try { th = localStorage.getItem("pn_theme"); } catch (e) {}
    if (th === "light" || th === "dark") document.documentElement.setAttribute("data-theme", th);
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    const isDark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("pn_theme", next); } catch (e) {}
  }

  function wireGlobalUI() {
    $("#themeToggle").addEventListener("click", toggleTheme);
    $("#langBtn").addEventListener("click", e => {
      e.stopPropagation();
      $("#langMenu").hidden ? openLangMenu() : closeLangMenu();
    });
    document.addEventListener("click", e => {
      if (!e.target.closest(".lang-picker")) closeLangMenu();
    });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeLangMenu(); });
  }

  async function boot() {
    applyStoredTheme();
    try {
      const [ui, data] = await Promise.all([
        fetch("data/ui.json").then(r => r.json()),
        fetch("data/apps.json").then(r => r.json())
      ]);
      UI = ui; DATA = data;
    } catch (e) {
      document.body.innerHTML = '<p style="padding:40px;text-align:center">Failed to load. Please refresh.</p>';
      return;
    }
    locale = pickLocale();
    wireGlobalUI();
    render();
  }

  boot();
})();
