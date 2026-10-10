// 자사 앱 지표 일일 스냅샷 수집기.
//
// 수집 경로는 google-play-scraper의 app() = `/store/apps/details`이고
// 이는 Play robots.txt에서 허용된 경로다(sync_apps.py가 이미 쓰는 것과 동일).
// 차트 순위(list())와 검색 순위(search())는 각각 `/_/...batchexecute`,
// `/store/search`를 타고 둘 다 robots Disallow이므로 여기서 수집하지 않는다.
//
// 차트 감시(CHART_WATCH)는 robots Disallow 경로(list() → /_/...batchexecute)를 쓴다.
// 개인용 한정·저빈도라는 전제로 켜 둔 것이므로, 공개 서비스로 쓰려면 다시 판단해야 한다.
//
// 2026-10-10 전수 측정: 51개국 × 10스코프 × 3차트 = 1,530개 차트에 자사 8개 앱
// 전부 없었다(커버리지 100%, 진입 0건). 18,491 설치인 secondact도, 16,676 설치인
// 경쟁 앱도 없다. 그래서 평소엔 "진입 없음"이 정상이고, 이건 진입하는 날을
// 놓치지 않기 위한 감시탑이다.
//
// TOP_PAID 는 스캔하지 않는다 — 자사 앱이 전부 무료라 원리적으로 들어갈 수 없다.
// 동시 8이면 이 물량에서 429 가 난다(실측: 1,530건 중 512건 실패). 동시 4는 깨끗했다.

import gplay from 'google-play-scraper';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const g = gplay.default ?? gplay;
const ROOT = new URL('..', import.meta.url).pathname;
const APPS_JSON = `${ROOT}data/apps.json`;
const OUT = `${ROOT}data/metrics.json`;

// 정면승부 중인 경쟁 앱. 공개 카드에는 안 쓰고 ?stats=1 패널에서만 비교에 쓴다.
const RIVALS = {
  plopcat: { pkg: 'com.actionfit.plop.cat.aos', label: '퐁당냥 (ACTIONFIT)' },
};

const COUNTRY = 'kr', LANG = 'ko';
const today = new Date().toISOString().slice(0, 10);

async function snap(pkg) {
  const a = await g.app({ appId: pkg, country: COUNTRY, lang: LANG });
  return {
    i: a.maxInstalls ?? 0,                                  // 정확 설치 수
    s: a.score ? Number(a.score.toFixed(2)) : null,          // 평점
    r: a.ratings ?? 0,                                       // 평가 수
    v: a.reviews ?? 0,                                       // 리뷰 수
  };
}

const apps = JSON.parse(readFileSync(APPS_JSON, 'utf8')).apps;
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { since: today, apps: {} };
const out = { updated: new Date().toISOString(), since: prev.since ?? today, apps: {} };

let okCount = 0, failCount = 0;
for (const app of apps) {
  const id = app.id;
  const old = prev.apps?.[id] ?? { history: [], best: null, rival: null };
  const entry = { history: [...(old.history ?? [])], best: old.best ?? null, rival: old.rival ?? null };

  try {
    const cur = await snap(app.package);
    // 같은 날 재실행이면 덮어쓴다 (하루 한 줄 유지)
    entry.history = entry.history.filter(h => h.d !== today);
    entry.history.push({ d: today, ...cur });
    entry.history.sort((a, b) => a.d.localeCompare(b.d));

    // "추적 시작 이후 최고". 과거 데이터는 어디서도 살 수 없으므로
    // 이 값은 수집을 시작한 날부터만 의미가 있다. UI에 그렇게 표기한다.
    entry.best = {
      i: Math.max(...entry.history.map(h => h.i ?? 0)),
      s: Math.max(...entry.history.map(h => h.s ?? 0)) || null,
      r: Math.max(...entry.history.map(h => h.r ?? 0)),
    };
    okCount++;
  } catch (e) {
    console.error(`  ! ${id}: ${e.message.slice(0, 70)}`);
    failCount++;
  }

  const rv = RIVALS[id];
  if (rv) {
    try {
      const cur = await snap(rv.pkg);
      const hist = (entry.rival?.history ?? []).filter(h => h.d !== today);
      hist.push({ d: today, ...cur });
      hist.sort((a, b) => a.d.localeCompare(b.d));
      entry.rival = { label: rv.label, pkg: rv.pkg, history: hist };
    } catch (e) {
      console.error(`  ! ${id} rival: ${e.message.slice(0, 70)}`);
    }
  }

  out.apps[id] = entry;
  const last = entry.history.at(-1);
  console.log(`  ${id.padEnd(14)} 설치 ${String(last?.i ?? '-').padEnd(7)} 평점 ${last?.s ?? '-'} 평가 ${last?.r ?? 0}` +
              (entry.rival ? `   vs ${entry.rival.label}: 설치 ${entry.rival.history.at(-1).i}, 평점 ${entry.rival.history.at(-1).s}` : ''));
}

// ---- 차트 감시 ----
// 실패해도 지표를 날리지 않는다: 이전 상태를 보존하고 scannedAt 만 안 올린다.
const CHART_WATCH = process.env.CHART_WATCH !== '0';
const WATCH_COUNTRIES = ('kr us jp tw hk cn gb de fr it es pt nl se no dk fi pl ru tr br mx ar cl co pe '
  + 'ca au nz in id th vn ph my sg sa ae eg za ng ke il gr cz hu ro ua by kz uz').split(' ');
const WATCH_COLLS = ['TOP_FREE', 'GROSSING'];
const SCOPE_OF = {
  pocketarcade: ['GAME_ARCADE', 'GAME'], facelapse: ['LIFESTYLE', 'APPLICATION'],
  privatecamera: ['PHOTOGRAPHY', 'APPLICATION'], btcreport: ['FINANCE', 'APPLICATION'],
  fxcalc: ['TOOLS', 'APPLICATION'], adrevenue: ['PRODUCTIVITY', 'APPLICATION'],
  secondact: ['GAME_SIMULATION', 'GAME'], plopcat: ['GAME_PUZZLE', 'GAME'],
};

if (CHART_WATCH) {
  const want = new Map();                      // pkg -> id
  for (const app of apps) want.set(app.package, app.id);
  for (const id of Object.keys(RIVALS)) want.set(RIVALS[id].pkg, `rival:${id}`);

  const scopes = [...new Set(Object.values(SCOPE_OF).flat())];
  const jobs = [];
  for (const country of WATCH_COUNTRIES)
    for (const cat of scopes)
      for (const coll of WATCH_COLLS) jobs.push({ country, cat, coll });

  const found = new Map();                     // id -> [{country,cat,coll,rank}]
  let scanned = 0, emptyCharts = 0, unfinished = 0, k = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function worker() {
    for (;;) {
      const n = k++; if (n >= jobs.length) return;
      const j = jobs[n];
      let last = null;
      for (let a = 0; a <= 4; a++) {
        if (a) await sleep(800 * 2 ** (a - 1) + Math.random() * 400);
        try {
          const r = await g.list({ collection: g.collection[j.coll], category: g.category[j.cat],
                                   country: j.country, lang: 'en', num: 200 });
          scanned++;
          r.forEach((x, idx) => {
            const id = want.get(x.appId);
            if (!id) return;
            if (!found.has(id)) found.set(id, []);
            found.get(id).push({ c: j.country, cat: j.cat, coll: j.coll, rank: idx + 1 });
          });
          last = null; break;
        } catch (e) {
          last = e;
          const m = e.message.toLowerCase();
          if (m.includes('fantasy-land') || m.includes('undefined')) { emptyCharts++; last = null; break; }
        }
      }
      if (last) unfinished++;
    }
  }
  const ct0 = Date.now();
  await Promise.all(Array.from({ length: 4 }, worker));
  const coverage = (scanned + emptyCharts) / jobs.length;
  console.log(`\n  차트 감시: ${jobs.length}개 조회, 정상 ${scanned}, 빈차트 ${emptyCharts}, ` +
              `미완 ${unfinished} (커버리지 ${(100 * coverage).toFixed(1)}%, ${((Date.now() - ct0) / 1000).toFixed(0)}s)`);

  // 커버리지가 낮으면 "진입 없음"이라 단정할 수 없다 → 이전 결과를 유지한다
  if (coverage >= 0.98) {
    out.chart = { scannedAt: today, countries: WATCH_COUNTRIES.length, coverage: Number(coverage.toFixed(3)) };
    for (const app of apps) {
      const mine = (found.get(app.id) ?? []).sort((a, b) => a.rank - b.rank);
      out.apps[app.id].chart = mine;
      const rid = `rival:${app.id}`;
      if (found.has(rid) || RIVALS[app.id]) {
        const rv = (found.get(rid) ?? []).sort((a, b) => a.rank - b.rank);
        if (out.apps[app.id].rival) out.apps[app.id].rival.chart = rv;
      }
      if (mine.length) console.log(`  ★ ${app.id} 차트 진입 ${mine.length}건: ` +
        mine.slice(0, 3).map(h => `${h.c.toUpperCase()} ${h.cat}/${h.coll} ${h.rank}위`).join(', '));
    }
    const totalHits = [...found.values()].reduce((a, v) => a + v.length, 0);
    if (!totalHits) console.log('  진입 없음 (전 조회 완주)');
  } else {
    console.log('  커버리지 부족 → 이전 차트 결과 유지');
    out.chart = prev.chart ?? null;
    for (const app of apps) {
      out.apps[app.id].chart = prev.apps?.[app.id]?.chart ?? null;
      if (out.apps[app.id].rival) out.apps[app.id].rival.chart = prev.apps?.[app.id]?.rival?.chart ?? null;
    }
  }
}

// 수집이 전부 실패했으면 기존 파일을 덮지 않는다 (좋은 데이터를 빈 데이터로 날리지 않기)
if (okCount === 0) {
  console.error('수집 전량 실패 — data/metrics.json을 덮지 않고 종료');
  process.exit(1);
}

writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`\n성공 ${okCount} / 실패 ${failCount}, 추적 시작 ${out.since}, → data/metrics.json`);
