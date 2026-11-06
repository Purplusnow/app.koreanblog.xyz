#!/usr/bin/env python3
"""Sync data/apps.json with the public Google Play developer page.

- New packages on the developer page are added with 16-locale Play copy,
  icon, screenshots, category (from Play genre) and an accent color picked
  from the icon.
- Existing apps get their public download bucket and live/soon status
  refreshed.

Prints "CHANGED" when data/ was modified (the caller then runs build.py).

--refresh (on in the daily job since 2026-11-05) also re-pulls every
existing app's 16-locale copy from Play, and its icon/screenshots/accent
when the icon changed. Play is the source of truth: hand edits to copy in
data/apps.json get overwritten -- change the store listing instead.

Usage:  python3 tools/sync_apps.py [--dry-run] [--refresh]
"""
import colorsys, html, io, json, os, re, sys, urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPS = os.path.join(ROOT, "data", "apps.json")
IMG = os.path.join(ROOT, "assets", "img", "apps")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# Removed/suspended apps that must never be re-added.
EXCLUDE = {
    "com.purplusnow.candymatch3", "com.purplusnow.candymatch3premium",
    "com.purplusnow.flyingbird",
    "com.koreanblog.btcreport", "com.koreanblog.fxwebview",  # gone from Play (404) 2026-11
}

# site locale -> (play hl, gl)
LOCALES = {
    "en": ("en", "US"), "ko": ("ko", "KR"), "ja": ("ja", "JP"), "zh": ("zh-TW", "TW"),
    "es": ("es", "ES"), "pt": ("pt-BR", "BR"), "fr": ("fr", "FR"), "de": ("de", "DE"),
    "it": ("it", "IT"), "ru": ("ru", "RU"), "id": ("id", "ID"), "vi": ("vi", "VN"),
    "th": ("th", "TH"), "hi": ("hi", "IN"), "ar": ("ar", "EG"), "tr": ("tr", "TR"),
}

# Play category id -> site category key (labels live in data/ui.json "cat")
CATEGORY = {
    "GAME_PUZZLE": "puzzle", "GAME_SIMULATION": "simulation", "GAME_ARCADE": "arcade",
    "FINANCE": "finance", "PHOTOGRAPHY": "photography", "TOOLS": "tools",
    "PRODUCTIVITY": "tools", "BUSINESS": "tools", "ENTERTAINMENT": "entertainment",
}
SHOTS = 6


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        b = r.read()
    return b if binary else b.decode("utf-8", "replace")


def details(pkg, hl="en", gl="US"):
    return get(f"https://play.google.com/store/apps/details?id={pkg}&hl={hl}&gl={gl}")


def dev_packages(dev_url):
    t = get(dev_url + "&hl=en&gl=US")
    return list(dict.fromkeys(re.findall(r"details\?id=([A-Za-z0-9_.]+)", t)))


def parse_downloads(t):
    m = re.search(r">([0-9.,]+)([KMB]?)\+</div><div[^>]*>Downloads<", t)
    if not m:
        return None
    n = float(m.group(1).replace(",", ""))
    return int(n * {"": 1, "K": 1e3, "M": 1e6, "B": 1e9}[m.group(2)])


def parse_status(t):
    return "soon" if re.search(r">Pre-register<", t) else "live"


def parse_copy(t):
    name = ""
    m = re.search(r'<meta property="og:title" content="(.*?)"', t)
    if m:
        name = html.unescape(m.group(1))
        # strip the localized " - Apps on Google Play" suffix / prefix
        parts = re.split(r"\s+[-–]\s+", name)
        if len(parts) > 1 and "Google Play" in parts[-1]:
            parts = parts[:-1]
        elif len(parts) > 1 and "Google Play" in parts[0]:
            parts = parts[1:]
        name = " - ".join(parts).strip()
    desc = ""
    m = re.search(r'data-g-id="description"[^>]*>(.*?)</div>', t, re.S)
    if m:
        desc = re.sub(r"<br\s*/?>", "\n", m.group(1))
        desc = strip_contact(html.unescape(re.sub(r"<[^>]+>", "", desc)))
    return {"name": name, "tagline": desc.split("\n")[0], "desc": desc}


# Play appends the developer's legal contact block (home address) to the KR listing:
#   "...\n----\n개발자 연락처 :\n<name> <address>..." — never republish it on the site.
CONTACT_RE = re.compile(r"\n\s*-{3,}\s*\n\s*(개발자\s*연락처|Developer contact).*\Z", re.S | re.I)


def strip_contact(desc):
    return CONTACT_RE.sub("", desc or "").strip()


def accent_from(icon):
    """Most common reasonably saturated color in the icon, as #RRGGBB."""
    im = icon.convert("RGB").resize((64, 64)).quantize(12)
    pal = im.getpalette()
    for count, idx in sorted(im.getcolors(), reverse=True):
        r, g, b = pal[idx * 3: idx * 3 + 3]
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s > 0.35 and 0.35 < v < 0.95:
            return f"#{r:02X}{g:02X}{b:02X}"
    return "#7C3AED"


def slug(pkg):
    return re.sub(r"[^a-z0-9]", "", pkg.rsplit(".", 1)[-1].lower())


def play_icon(en_page):
    m = re.search(r'<meta property="og:image" content="(https://play-lh\.googleusercontent\.com/[^"=]+)', en_page)
    return Image.open(io.BytesIO(get(m.group(1) + "=s256", binary=True)))


def save_images(app_id, en_page, icon=None):
    """Write icon + up to SHOTS screenshots; stale extra shots are removed."""
    icon = icon or play_icon(en_page)
    icon.save(os.path.join(IMG, f"{app_id}.png"), optimize=True)
    shot_dir = os.path.join(IMG, app_id)
    os.makedirs(shot_dir, exist_ok=True)
    shot_ids = list(dict.fromkeys(re.findall(
        r"play-lh\.googleusercontent\.com/([A-Za-z0-9_-]+)=w526-h296", en_page)))[:SHOTS]
    for n, sid in enumerate(shot_ids, 1):
        im = Image.open(io.BytesIO(get(f"https://play-lh.googleusercontent.com/{sid}=h400", binary=True)))
        im.convert("RGB").quantize(256, method=Image.Quantize.MEDIANCUT).save(
            os.path.join(shot_dir, f"shot{n}.png"), optimize=True)
    for n in range(len(shot_ids) + 1, SHOTS + 1):
        stale = os.path.join(shot_dir, f"shot{n}.png")
        if os.path.exists(stale):
            os.remove(stale)
    return icon


def fetch_i18n(pkg, en_page):
    i18n = {"en": parse_copy(en_page)}
    for code, (hl, gl) in LOCALES.items():
        if code != "en":
            i18n[code] = parse_copy(details(pkg, hl, gl))
    return i18n


def icon_changed(a, icon):
    """Mean per-channel difference at 64px; > 8 means a redesigned icon, not re-encoding."""
    from PIL import ImageChops, ImageStat
    path = os.path.join(ROOT, a["icon"])
    if not os.path.exists(path):
        return True
    old = Image.open(path).convert("RGB").resize((64, 64))
    new = icon.convert("RGB").resize((64, 64))
    return sum(ImageStat.Stat(ImageChops.difference(old, new)).mean) / 3 > 8


def refresh_app(a, en_page, dry):
    """Re-pull copy (and images if the icon changed). Returns True if anything changed."""
    changed = False
    new = fetch_i18n(a["package"], en_page)
    for code, copy in new.items():
        if not copy["desc"]:  # unparsable page: keep what we have
            continue
        if a["i18n"].get(code) != copy:
            print(f"{a['id']}: {code} copy refreshed"
                  + (f" (name -> {copy['name']})" if a["i18n"].get(code, {}).get("name") != copy["name"] else ""))
            if not dry:
                a["i18n"][code] = copy
            changed = True
    icon = play_icon(en_page)
    if icon_changed(a, icon):
        print(f"{a['id']}: icon/screenshots refreshed")
        if not dry:
            save_images(a["id"], en_page, icon)
            a["accent"] = accent_from(icon)
        changed = True
    return changed


def add_app(pkg, en_page, ids):
    app_id = slug(pkg)
    while app_id in ids:
        app_id += "x"
    cat_ids = re.findall(r'href="/store/apps/category/([A-Z_]+)"', en_page)
    category = next((CATEGORY[c] for c in cat_ids if c in CATEGORY), None)
    if not category:
        category = "arcade" if any(c.startswith("GAME") for c in cat_ids) else "tools"

    icon = save_images(app_id, en_page)
    i18n = fetch_i18n(pkg, en_page)

    return {
        "id": app_id, "package": pkg, "status": parse_status(en_page),
        "category": category, "accent": accent_from(icon),
        "icon": f"assets/img/apps/{app_id}.png",
        "playUrl": f"https://play.google.com/store/apps/details?id={pkg}",
        "i18n": i18n, "installs": 0, "downloads": parse_downloads(en_page) or 0,
    }


def main():
    dry = "--dry-run" in sys.argv
    refresh = "--refresh" in sys.argv
    data = json.load(open(APPS, encoding="utf-8"))
    apps = data["apps"]
    known = {a["package"] for a in apps}
    changed = False

    for a in apps:
        try:
            t = details(a["package"])
        except Exception as e:  # app removed from Play, network blip, ...
            print(f"skip {a['package']}: {e}")
            continue
        dl, st = parse_downloads(t), parse_status(t)
        if dl is not None and dl != a.get("downloads"):
            print(f"{a['id']}: downloads {a.get('downloads')} -> {dl}")
            a["downloads"], changed = dl, True
        if st != a["status"]:
            print(f"{a['id']}: status {a['status']} -> {st}")
            a["status"], changed = st, True
        if refresh and refresh_app(a, t, dry):
            changed = True

    for pkg in dev_packages(data["developerUrl"]):
        if pkg in known or pkg in EXCLUDE:
            continue
        print(f"new app: {pkg}")
        if dry:
            changed = True
            continue
        app = add_app(pkg, details(pkg), {a["id"] for a in apps})
        print(f"  added as {app['id']} ({app['category']}, {app['accent']})")
        apps.append(app)
        changed = True

    if changed and not dry:
        with open(APPS, "w", encoding="utf-8") as f:
            f.write(json.dumps(data, ensure_ascii=False, indent=1))
    if changed:
        print("CHANGED")


if __name__ == "__main__":
    main()
