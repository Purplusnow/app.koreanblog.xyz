#!/usr/bin/env python3
"""Static site generator for app.koreanblog.xyz.

Reads data/ui.json + data/apps.json and emits one crawlable HTML page per
language (root = English + x-default, /<lang>/ for the rest) with all content
baked into the HTML, plus hreflang, canonical, Open Graph and JSON-LD.

Usage:  python3 tools/build.py
"""
import json, os, html, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://app.koreanblog.xyz"

# site locale -> BCP-47 hreflang tag
HREFLANG = {
    "en": "en", "ko": "ko", "ja": "ja", "zh": "zh-Hant", "es": "es",
    "pt": "pt-BR", "fr": "fr", "de": "de", "it": "it", "ru": "ru",
    "id": "id", "vi": "vi", "th": "th", "hi": "hi", "ar": "ar", "tr": "tr",
}
# Open Graph locale
OG_LOCALE = {
    "en": "en_US", "ko": "ko_KR", "ja": "ja_JP", "zh": "zh_TW", "es": "es_ES",
    "pt": "pt_BR", "fr": "fr_FR", "de": "de_DE", "it": "it_IT", "ru": "ru_RU",
    "id": "id_ID", "vi": "vi_VN", "th": "th_TH", "hi": "hi_IN", "ar": "ar_AR",
    "tr": "tr_TR",
}
# schema.org applicationCategory
CAT_SCHEMA = {
    "arcade": "GameApplication", "simulation": "GameApplication",
    "finance": "FinanceApplication", "photography": "MultimediaApplication",
    "tools": "UtilitiesApplication", "entertainment": "EntertainmentApplication",
}


def esc(s):
    return html.escape(str(s), quote=True)


def url_for(code):
    return BASE + "/" if code == "en" else f"{BASE}/{code}/"


def out_path(code):
    return os.path.join(ROOT, "index.html") if code == "en" else os.path.join(ROOT, code, "index.html")


def href_for(code):
    return "/" if code == "en" else f"/{code}/"


def app_localized(app, code):
    return app["i18n"].get(code) or app["i18n"]["en"]


def card_html(app, loc, code):
    txt = app_localized(app, code)
    is_soon = app["status"] == "soon"
    name = txt.get("name") or app["i18n"]["en"]["name"]
    tagline = (txt.get("tagline") or "").strip()
    desc = (txt.get("desc") or "").strip()
    if tagline and desc.startswith(tagline):
        desc = desc[len(tagline):].strip()
    cat = (loc.get("cat") or {}).get(app["category"], app["category"])
    cta = loc["cta_soon"] if is_soon else loc["cta_play"]
    badge = (f'<span class="badge soon">{esc(loc["badge_soon"])}</span>' if is_soon
             else f'<span class="badge live">{esc(loc["badge_live"])}</span>')
    desc_block = ""
    if desc:
        desc_block = (
            f'<p class="card-desc clamped">{esc(desc)}</p>'
            f'<button class="read-toggle" type="button" '
            f'data-more="{esc(loc["read_more"])}" data-less="{esc(loc["read_less"])}">'
            f'{esc(loc["read_more"])}</button>'
        )
    tag_block = f'<p class="card-tagline">{esc(tagline)}</p>' if tagline else ""
    return f'''      <article class="card" style="--card-accent:{esc(app["accent"])}">
        <div class="card-head">
          <img class="card-icon" src="/{esc(app["icon"])}" alt="{esc(name)}" width="64" height="64" loading="lazy">
          <div class="card-headtext">
            <h3 class="card-name">{esc(name)}</h3>
            <div class="chip-row"><span class="chip">{esc(cat)}</span>{badge}</div>
          </div>
        </div>
        {tag_block}
        {desc_block}
        <div class="card-foot">
          <a class="btn btn-play" href="{esc(app["playUrl"])}" target="_blank" rel="noopener">{PLAY_SVG}<span>{esc(cta)}</span></a>
        </div>
      </article>'''


PLAY_SVG = ('<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">'
            '<path fill="currentColor" d="M3.6 2.3a1 1 0 00-.6.9v17.6a1 1 0 001.5.9l3.2-1.8L3.6 2.3zm10.9 8.2L6.9 6.2 16 11.4l-1.5-.9zM18.9 9.7l-2.6-1.5-2.8 3 2.8 3 2.6-1.5a1.6 1.6 0 000-2.9zM6.9 17.8l7.6-4.3 1.5.9L6.9 17.8z"/></svg>')

GLOBE_SVG = ('<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" '
             'd="M12 2a10 10 0 100 20 10 10 0 000-20zm6.9 6h-3a15 15 0 00-1.2-3.6A8 8 0 0118.9 8zM12 4c.8 1.1 1.4 2.5 1.8 4h-3.6C10.6 6.5 11.2 5.1 12 4zM4.3 14a8 8 0 010-4h3.4a17 17 0 000 4H4.3zm.8 2h3a15 15 0 001.2 3.6A8 8 0 015.1 16zm3-8h-3a8 8 0 013.2-3.6A15 15 0 007.1 8zM12 20c-.8-1.1-1.4-2.5-1.8-4h3.6c-.4 1.5-1 2.9-1.8 4zm2.2-6H9.8a15 15 0 010-4h4.4a15 15 0 010 4zm.7 5.6a15 15 0 001.2-3.6h3a8 8 0 01-4.2 3.6zM16.3 14a17 17 0 000-4h3.4a8 8 0 010 4h-3.4z"/></svg>')

SUN_SVG = ('<svg class="sun" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" '
           'd="M12 7a5 5 0 100 10 5 5 0 000-10zm0-5a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm0 16a1 1 0 011 1v2a1 1 0 11-2 0v-2a1 1 0 011-1zM4.2 4.2a1 1 0 011.4 0l1.5 1.5A1 1 0 115.7 7.1L4.2 5.6a1 1 0 010-1.4zm12.6 12.6a1 1 0 011.4 0l1.5 1.5a1 1 0 01-1.4 1.4l-1.5-1.5a1 1 0 010-1.4zM2 12a1 1 0 011-1h2a1 1 0 110 2H3a1 1 0 01-1-1zm16 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM5.6 19.8l1.5-1.5a1 1 0 10-1.4-1.4L4.2 18.4a1 1 0 101.4 1.4zM19.8 5.6l-1.5 1.5a1 1 0 11-1.4-1.4l1.5-1.5a1 1 0 111.4 1.4z"/></svg>')
MOON_SVG = ('<svg class="moon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">'
            '<path fill="currentColor" d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>')


def lang_menu_html(order, locales, code):
    items = []
    for c in order:
        sel = ' aria-selected="true"' if c == code else ""
        tick = '<span class="tick" aria-hidden="true">✓</span>'
        items.append(f'<li role="option"{sel}><a href="{href_for(c)}">{esc(locales[c]["label"])}</a>{tick}</li>')
    return "\n      ".join(items)


def hreflang_links(order):
    out = []
    for c in order:
        out.append(f'<link rel="alternate" hreflang="{HREFLANG[c]}" href="{url_for(c)}">')
    out.append(f'<link rel="alternate" hreflang="x-default" href="{BASE}/">')
    return "\n".join(out)


def jsonld(data, locales, code):
    loc = locales[code]
    graph = [{
        "@type": "Organization",
        "name": "Purplusnow",
        "url": BASE + "/",
        "sameAs": [data["developerUrl"]],
    }]
    for app in data["apps"]:
        txt = app_localized(app, code)
        graph.append({
            "@type": "SoftwareApplication",
            "name": txt.get("name") or app["i18n"]["en"]["name"],
            "operatingSystem": "Android",
            "applicationCategory": CAT_SCHEMA.get(app["category"], "SoftwareApplication"),
            "url": app["playUrl"],
            "installUrl": app["playUrl"],
            "image": f'{BASE}/{app["icon"]}',
            "description": (txt.get("desc") or "").strip()[:300],
            "author": {"@type": "Organization", "name": "Purplusnow"},
        })
    obj = {"@context": "https://schema.org", "@graph": graph}
    return json.dumps(obj, ensure_ascii=False)


ROOT_REDIRECT = """<script>
(function(){try{
 var p=location.pathname; if(p!=='/'&&p!=='/index.html')return;
 if(localStorage.getItem('pn_lang_seen'))return;
 var sup={ko:1,ja:1,zh:1,es:1,pt:1,fr:1,de:1,it:1,ru:1,id:1,vi:1,th:1,hi:1,ar:1};
 var navs=navigator.languages||[navigator.language||''];
 for(var i=0;i<navs.length;i++){var b=(navs[i]||'').toLowerCase().split('-')[0];
   if(b==='en')return;
   if(b==='zh'){localStorage.setItem('pn_lang_seen','1');location.replace('/zh/');return;}
   if(sup[b]){localStorage.setItem('pn_lang_seen','1');location.replace('/'+b+'/');return;}}
}catch(e){}})();
</script>"""


def page_html(data, ui, code):
    locales = ui["locales"]
    order = ui["order"]
    loc = locales[code]
    d = loc.get("dir", "ltr")
    lang_attr = HREFLANG[code]
    title = f'Purplusnow — {loc["hero_kicker"]}'
    desc = loc["hero_sub"]
    canonical = url_for(code)

    live = [a for a in data["apps"] if a["status"] == "live"]
    soon = [a for a in data["apps"] if a["status"] == "soon"]
    live_cards = "\n".join(card_html(a, loc, code) for a in live)
    soon_cards = "\n".join(card_html(a, loc, code) for a in soon)
    soon_section = ""
    if soon:
        soon_section = f'''  <section class="apps-section wrap">
    <h2 class="section-title">{esc(loc["section_soon"])}</h2>
    <div class="app-grid">
{soon_cards}
    </div>
  </section>'''

    redirect = ROOT_REDIRECT if code == "en" else ""

    return f'''<!DOCTYPE html>
<html lang="{lang_attr}" dir="{d}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
{hreflang_links(order)}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Purplusnow">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:locale" content="{OG_LOCALE[code]}">
<meta property="og:image" content="{BASE}/assets/img/apps/pocketarcade.png">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0b0b12">
<link rel="icon" type="image/png" href="/assets/img/apps/facelapse.png">
<link rel="stylesheet" href="/assets/css/styles.css">
<script>try{{var t=localStorage.getItem('pn_theme');if(t)document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}</script>
{redirect}
<script type="application/ld+json">{jsonld(data, locales, code)}</script>
</head>
<body>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="{href_for(code)}" aria-label="Purplusnow">
      <span class="brand-dot"></span>
      <span class="brand-name">Purplusnow</span>
    </a>
    <div class="header-tools">
      <button id="themeToggle" class="icon-btn" type="button" aria-label="Toggle theme">{SUN_SVG}{MOON_SVG}</button>
      <div class="lang-picker">
        <button id="langBtn" class="lang-btn" type="button" aria-haspopup="listbox" aria-expanded="false">
          {GLOBE_SVG}<span id="langLabel">{esc(loc["label"])}</span>
        </button>
        <ul id="langMenu" class="lang-menu" role="listbox" hidden>
      {lang_menu_html(order, locales, code)}
        </ul>
      </div>
    </div>
  </div>
</header>

<main>
  <section class="hero">
    <div class="wrap">
      <p class="hero-kicker">{esc(loc["hero_kicker"])}</p>
      <h1 class="hero-title">{esc(loc["hero_title"])}</h1>
      <p class="hero-sub">{esc(loc["hero_sub"])}</p>
    </div>
    <div class="hero-glow" aria-hidden="true"></div>
  </section>

  <section class="apps-section wrap">
    <h2 class="section-title">{esc(loc["section_live"])}</h2>
    <div class="app-grid">
{live_cards}
    </div>
  </section>

{soon_section}

  <section class="cta-row wrap">
    <a class="btn btn-ghost" href="{esc(data["developerUrl"])}" target="_blank" rel="noopener">{esc(loc["view_all"])}</a>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap footer-inner">
    <span class="brand"><span class="brand-dot"></span><span class="brand-name">Purplusnow</span></span>
    <span class="footer-note">{esc(loc["footer_note"])}</span>
    <span class="footer-rights">{esc(loc["footer_rights"])}</span>
  </div>
</footer>

<script src="/assets/js/app.js"></script>
</body>
</html>
'''


def sitemap(order):
    rows = []
    for c in order:
        alts = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{HREFLANG[a]}" href="{url_for(a)}"/>'
            for a in order
        )
        alts += f'\n    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE}/"/>'
        rows.append(f'  <url>\n    <loc>{url_for(c)}</loc>{alts}\n  </url>')
    body = "\n".join(rows)
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
            f'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n{body}\n</urlset>\n')


def main():
    ui = json.load(open(os.path.join(ROOT, "data", "ui.json"), encoding="utf-8"))
    data = json.load(open(os.path.join(ROOT, "data", "apps.json"), encoding="utf-8"))
    order = ui["order"]
    for code in order:
        path = out_path(code)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(page_html(data, ui, code))
    with open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(sitemap(order))
    print(f"Built {len(order)} pages + sitemap ({len(order)} urls).")


if __name__ == "__main__":
    main()
