# app.koreanblog.xyz — Purplusnow app showcase

최종 업데이트: 2026-08-11

Purplusnow가 구글플레이에 출시한 앱들을 **16개 언어**로 소개하는 정적 웹사이트.

## 구조

```
data/ui.json            # UI 텍스트 16개 언어 (네비/히어로/버튼/카테고리) — 소스
data/apps.json          # 앱 데이터 + 앱별 16개 언어 카피 (Play 공식 현지화) — 소스
tools/build.py          # 소스 → 언어별 정적 HTML 생성기 (SEO)
index.html              # 생성물: 영어(루트, x-default)
<lang>/index.html        # 생성물: ko/ ja/ zh/ ... 15개 언어
sitemap.xml             # 생성물: 16개 URL + hreflang 대체링크
assets/css/styles.css   # 테마(라이트/다크 자동+토글) + RTL 지원
assets/js/app.js        # 향상 전용: 테마·언어메뉴·더보기 (fetch/렌더 없음)
assets/img/apps/*.png   # 앱 아이콘 (Play에서 256px)
CNAME                   # app.koreanblog.xyz
```

**SEO 구조**: 언어별 URL(`/`, `/ko/`, `/ja/` …)에 콘텐츠를 HTML로 직접 구워 넣어 크롤러가 JS 없이 읽음. 각 페이지에 canonical·hreflang(16+x-default)·JSON-LD(SoftwareApplication)·OG 태그. 루트는 브라우저 언어 감지해 해당 언어로 1회 리다이렉트(선택 후 유지). `index.html`/`<lang>/`은 **생성물이라 직접 편집 금지** — `data/`만 고치고 `python3 tools/build.py` 재실행.

## 대상 앱 (7개)

출시(프로덕션) 6개 + 사전등록 1개. 플레이 콘솔 상태 기준.

| 앱 | 패키지 | 상태 |
|---|---|---|
| Pocket Arcade | com.secondact.pocketarcade | live |
| FaceLapse: AI Face Age | com.purplusnow.facelapse | live |
| Private Camera | com.purplusnow.private_camera | live |
| Bitcoin Market Report | com.koreanblog.btcreport | live |
| Currency Converter | com.koreanblog.fxwebview | live |
| Ad Revenue Dashboard | com.purplusnow.adrevenuecontrol | live |
| Second Act: Property Tycoon | com.purplusnow.secondactlife | soon (사전등록) |

제외: Candy Match 3/Premium(Google 정지·삭제), Flying Bird(삭제), Candy Town 3·Space Bird 2020(미출시).

## 언어 (16)

en · ko · ja · zh(繁) · es · pt · fr · de · it · ru · id · vi · th · hi · ar(RTL) · tr

앱 설명문은 **각 앱의 Play 공식 현지화 카피를 그대로** 사용 (직접 번역 X). koreanblog 앱은 스토어 타이틀이 한국어라, 비한국어 로케일에서는 영문 정식명으로 대체.

## 로컬 미리보기

```
python3 tools/build.py          # 소스 → 정적 페이지 생성
python3 -m http.server 8791
# http://localhost:8791/        (영어)
# http://localhost:8791/ja/     (언어별)
```

## 콘텐츠 갱신 (새 앱/문구)

1. `data/apps.json`에 앱 항목 추가 (id·package·status·category·accent·icon·playUrl·i18n).
2. 아이콘은 `assets/img/apps/<id>.png` (Play 아이콘 URL 뒤에 `=s256`).
3. 카테고리 라벨 신규 시 `data/ui.json`의 각 로케일 `cat`에 키 추가.
4. **`python3 tools/build.py` 실행** → 생성물 커밋·푸시.

Play에서 16개 로케일 카피를 다시 긁는 스크립트: `tools/fetch_locales.py`.

## 배포

정적 사이트. GitHub Pages 또는 Cloudflare Pages.
- `CNAME` = app.koreanblog.xyz, `.nojekyll` 포함.
- DNS: `app` 서브도메인 CNAME → Pages 호스트.
