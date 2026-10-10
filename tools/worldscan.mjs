import gplay from 'google-play-scraper';
const g = gplay.default ?? gplay;
const APPS = [
 ['pocketarcade','com.secondact.pocketarcade','GAME_ARCADE','GAME'],
 ['facelapse','com.purplusnow.facelapse','LIFESTYLE','APPLICATION'],
 ['privatecamera','com.purplusnow.private_camera','PHOTOGRAPHY','APPLICATION'],
 ['btcreport','com.koreanblog.btcreport','FINANCE','APPLICATION'],
 ['fxcalc','com.koreanblog.fxwebview','TOOLS','APPLICATION'],
 ['adrevenue','com.purplusnow.adrevenuecontrol','PRODUCTIVITY','APPLICATION'],
 ['secondact','com.purplusnow.secondactlife','GAME_SIMULATION','GAME'],
 ['plopcat','com.purplusnow.plopcat','GAME_PUZZLE','GAME'],
];
const COUNTRIES='kr us jp tw hk cn gb de fr it es pt nl se no dk fi pl ru tr br mx ar cl co pe ca au nz in id th vn ph my sg sa ae eg za ng ke il gr cz hu ro ua by kz uz'.split(' ');
const COLLS=['TOP_FREE','TOP_PAID','GROSSING'];
const scopes=[...new Set(APPS.flatMap(([,,c,o])=>[c,o]))];
const jobs=[]; for(const country of COUNTRIES) for(const cat of scopes) for(const coll of COLLS) jobs.push({country,cat,coll});
const pkgs=new Map(APPS.map(([id,pkg])=>[pkg,id]));

const CONC=Number(process.env.CONC??4), MAX_RETRY=4;
const hits=[]; let ok=0, empty=0, failed=[], i=0, retries=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const t0=Date.now();
async function worker(){
  for(;;){ const k=i++; if(k>=jobs.length) return; const j=jobs[k];
    let last=null;
    for(let a=0;a<=MAX_RETRY;a++){
      if(a){ retries++; await sleep(800*2**(a-1) + Math.random()*400); }
      try{
        const r=await g.list({collection:g.collection[j.coll],category:g.category[j.cat],country:j.country,lang:'en',num:200});
        ok++; r.forEach((x,idx)=>{ if(pkgs.has(x.appId)) hits.push({app:pkgs.get(x.appId),...j,rank:idx+1}); });
        last=null; break;
      }catch(e){ last=e;
        const m=e.message.toLowerCase();
        if(m.includes('fantasy-land')||m.includes('undefined')){ empty++; last=null; break; } // 빈 차트는 재시도 무의미
      }
    }
    if(last) failed.push({...j,err:last.message.slice(0,40)});
  }
}
await Promise.all(Array.from({length:CONC},worker));
const total=jobs.length, done=ok+empty;
console.log(`조회 ${total} / 동시 ${CONC} — 정상 ${ok}, 빈차트 ${empty}, 재시도 ${retries}, 미완 ${failed.length}`);
console.log(`커버리지 ${(100*done/total).toFixed(1)}%  소요 ${((Date.now()-t0)/1000).toFixed(0)}s`);
if(failed.length){ console.log('미완 샘플:', failed.slice(0,5).map(f=>`${f.country}/${f.cat}/${f.coll}`).join(', ')); }
console.log(`\n=== 차트 진입 ${hits.length}건 ===`);
if(!hits.length) console.log(failed.length? '  진입 0건 (단 커버리지 미완 — 위 참고)' : '  전 조회 완주, 진입 0건');
else for(const h of hits.sort((a,b)=>a.rank-b.rank)) console.log(`  ${h.app}  ${h.country.toUpperCase()}  ${h.cat}/${h.coll} → ${h.rank}위`);
