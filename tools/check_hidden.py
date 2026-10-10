#!/usr/bin/env python3
"""빌드 산출물 검증: `hidden` 속성이 author CSS의 display 지정에 무력화되지 않았는지.

`hidden`의 숨김은 UA 스타일시트라서 author 규칙에 항상 진다. 그래서
`.btn{display:inline-flex}` 같은 규칙을 물려받은 요소는 hidden 이어도 보인다.
2026-10-10에 지표 버튼이 이 함정으로 전 방문자에게 노출됐다. 재발 방지용.
"""
import re, sys, glob, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, "assets/css/styles.css")


def strip_comments(css):
    """CSS 주석을 제거한다. 안 하면 `/* Play button */\n.btn` 처럼
    주석이 선택자에 붙어 `.btn` 매칭이 조용히 실패한다(실제로 겪음)."""
    return re.sub(r"/\*.*?\*/", "", css, flags=re.S)


def display_setting_classes(css):
    """단일 클래스 선택자(.foo)로 display를 지정하는 클래스 집합."""
    out = set()
    for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
        if not re.search(r"(^|;)\s*display\s*:", body):
            continue
        for part in sel.split(","):
            part = part.strip()
            m = re.fullmatch(r"\.([A-Za-z0-9_-]+)", part)
            if m:
                out.add(m.group(1))
    return out


def hidden_override_classes(css):
    """`[hidden]`을 포함하면서 display를 지정하는 규칙이 가리키는 클래스 집합."""
    out = set()
    for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
        if "[hidden]" not in sel or not re.search(r"(^|;)\s*display\s*:", body):
            continue
        out.update(re.findall(r"\.([A-Za-z0-9_-]+)\[hidden\]", sel))
    return out


def main():
    css = strip_comments(open(CSS, encoding="utf-8").read())
    risky = display_setting_classes(css)
    guarded = hidden_override_classes(css)

    pages = ["index.html"] + sorted(glob.glob(os.path.join(ROOT, "*/index.html")))
    problems = []
    for page in pages:
        path = page if os.path.isabs(page) else os.path.join(ROOT, page)
        if not os.path.exists(path):
            continue
        html = open(path, encoding="utf-8").read()
        for tag in re.findall(r"<[a-zA-Z][^>]*\shidden[\s>/]", html):
            m = re.search(r'class="([^"]*)"', tag)
            classes = set(m.group(1).split()) if m else set()
            hit = classes & risky
            if hit and not (classes & guarded):
                problems.append((os.path.relpath(path, ROOT), sorted(hit), sorted(classes)))

    if problems:
        print("❌ hidden 이 author display 규칙에 무력화됨:", file=sys.stderr)
        seen = set()
        for page, hit, classes in problems:
            key = (hit[0], tuple(classes))
            if key in seen:
                continue
            seen.add(key)
            print(f"   {page}: class={classes} 중 {hit} 가 display를 지정 → "
                  f"`.{hit[0]}[hidden]{{display:none}}` 추가 필요", file=sys.stderr)
        return 1
    print(f"✅ hidden 무결성 OK ({len(pages)}페이지, display지정 클래스 {len(risky)}개 검사)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
