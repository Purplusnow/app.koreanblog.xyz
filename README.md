# app.koreanblog.xyz — Purplusnow app showcase

최종 업데이트: 2026-08-11

Purplusnow가 구글플레이에 출시한 앱들을 **16개 언어**로 소개하는 정적 웹사이트.

## 구조

```
index.html              # 마크업 (i18n 텍스트 노드는 data-i 속성)
assets/css/styles.css   # 테마(라이트/다크 자동+토글) + RTL 지원
assets/js/app.js        # 데이터 로드·렌더·언어 전환·RTL
assets/img/apps/*.png   # 앱 아이콘 (Play에서 256px)
data/ui.json            # UI 텍스트 16개 언어 (네비/히어로/버튼/카테고리)
data/apps.json          # 앱 데이터 + 앱별 16개 언어 카피 (Play 공식 현지화 텍스트)
CNAME                   # app.koreanblog.xyz
```

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
python3 -m http.server 8791
# http://localhost:8791/?lang=ko  (lang= 로 언어 강제)
```
`file://` 로 열면 fetch가 막히므로 반드시 서버로 실행.

## 콘텐츠 갱신 (새 앱/문구)

1. `data/apps.json`에 앱 항목 추가 (id·package·status·category·accent·icon·playUrl·i18n).
2. 아이콘은 `assets/img/apps/<id>.png` (Play 아이콘 URL 뒤에 `=s256`).
3. 카테고리 라벨 신규 시 `data/ui.json`의 각 로케일 `cat`에 키 추가.

Play에서 16개 로케일 카피를 다시 긁는 스크립트는 커밋 히스토리 참고(`fetch_all_locales.py`).

## 배포

정적 사이트. GitHub Pages 또는 Cloudflare Pages.
- `CNAME` = app.koreanblog.xyz, `.nojekyll` 포함.
- DNS: `app` 서브도메인 CNAME → Pages 호스트.
