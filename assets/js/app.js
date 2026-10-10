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


  /* ---- 앱 지표 패널 ----
     형 요청(2026-10-10): "나만 보는 사이트니 미관보단 편의성" → 게이트·버튼 없이
     항상 펼쳐서 보여준다. 공개 주소이므로 방문자에게도 보인다는 점은 알고 채택한 것.
     데이터는 data/metrics.json (tools/sync_metrics.mjs가 매일 갱신). */

  const esc = v => String(v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function nfmt(n) {
    try { return new Intl.NumberFormat(document.documentElement.lang || "en").format(n); }
    catch (e) { return String(n); }
  }

  // 설치 수 추이. 1점짜리는 선이 안 되니 2점 이상일 때만 그린다.
  function sparkline(hist) {
    const pts = hist.map(h => h.i ?? 0);
    if (pts.length < 2) return "";
    const max = Math.max(...pts), min = Math.min(...pts);
    const span = max - min || 1;
    const W = 120, H = 28;
    const d = pts.map((v, i) => {
      const x = (i / (pts.length - 1)) * W;
      const y = H - ((v - min) / span) * H;
      return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(" ");
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`
         + `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2" `
         + `stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  function row(label, cur, best, bestLabel) {
    const b = (best !== null && best !== undefined && best !== cur)
      ? ` <span class="stat-best">${esc(bestLabel)} ${esc(best)}</span>` : "";
    return `<div class="stat-row"><span class="stat-k">${esc(label)}</span>`
         + `<span class="stat-v">${esc(cur)}${b}</span></div>`;
  }

  /* 차트 진입. null = 아직 스캔 안 됨(표시 안 함), [] = 완주했고 진입 없음.
     순위는 "위"처럼 언어별 서수를 만들지 않도록 `#12` 로 쓴다. */
  function chartRow(list, t) {
    if (!list) return "";
    if (!list.length) {
      return `<div class="stat-row"><span class="stat-k">${esc(t.stats_chart)}</span>`
           + `<span class="stat-v stat-dim">${esc(t.stats_chart_none)}</span></div>`;
    }
    const label = { TOP_FREE: t.stats_free, GROSSING: t.stats_grossing };
    const items = list.slice(0, 8).map(h =>
      `<li>${esc(h.c.toUpperCase())} · ${esc(label[h.coll] || h.coll)} #${esc(nfmt(h.rank))}</li>`).join("");
    return `<div class="stat-row"><span class="stat-k">${esc(t.stats_chart)}</span>`
         + `<span class="stat-v">${esc(nfmt(list.length))}</span></div>`
         + `<ul class="stat-chart">${items}</ul>`;
  }

  function renderStats(data, id, t) {
    const e = data && data.apps && data.apps[id];
    const last = e && e.history && e.history[e.history.length - 1];
    if (!last) return `<p class="stat-empty">${esc(t.stats_none || "No data yet")}</p>`;
    const best = e.best || {};
    let h = `<div class="stat-head">${esc(t.stats_title || "")}</div>`;
    h += row(t.stats_installs, nfmt(last.i), best.i ? nfmt(best.i) : null, t.stats_best);
    if (last.s) h += row(t.stats_rating, last.s.toFixed(2), best.s ? best.s.toFixed(2) : null, t.stats_best);
    if (last.r) h += row(t.stats_ratings, nfmt(last.r), best.r ? nfmt(best.r) : null, t.stats_best);
    h += chartRow(e.chart, t);
    h += sparkline(e.history);

    const rv = e.rival;
    const rlast = rv && rv.history && rv.history[rv.history.length - 1];
    if (rlast) {
      h += `<div class="stat-head stat-rival">${esc(t.stats_rival || "")} · ${esc(rv.label)}</div>`;
      h += row(t.stats_installs, nfmt(rlast.i), null, t.stats_best);
      if (rlast.s) h += row(t.stats_rating, rlast.s.toFixed(2), null, t.stats_best);
      h += chartRow(rv.chart, t);
    }
    const since = (t.stats_since || "{d}").replace("{d}", data.since || "");
    h += `<div class="stat-since">${esc(since)}</div>`;
    return h;
  }

  async function wireStats() {
    const panels = document.querySelectorAll(".card-statspanel");
    if (!panels.length) return;

    let t = {};
    const blob = $("#statsI18n");
    if (blob) { try { t = JSON.parse(blob.textContent); } catch (e) {} }

    let data = null;
    try {
      const res = await fetch("/data/metrics.json", { cache: "no-cache" });
      if (res.ok) data = await res.json();
    } catch (e) {}
    if (!data) return;                 // 못 받으면 빈 상자를 띄우지 않고 그대로 숨겨 둔다

    panels.forEach(panel => {
      panel.innerHTML = renderStats(data, panel.dataset.app, t);
      panel.hidden = false;
    });
  }

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

    wireStats();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
