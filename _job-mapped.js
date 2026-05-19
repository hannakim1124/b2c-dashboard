// 워페 4분류 기준으로 커컨/데브콘 매핑 후 3개 이벤트 비교
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');

const SHEETS = {
  career: 'https://docs.google.com/spreadsheets/d/1VwLwl4V-v3-KXlAKmZBYJKw2UPq_5tyFP2ClDa_HHhY/gviz/tq?tqx=out:csv',
  devcon: 'https://docs.google.com/spreadsheets/d/1UgmgZCjEnI_DWxyfaJWLuiDpl91bnSBpfiSc6asz1Vs/gviz/tq?tqx=out:csv&gid=82584708',
  workfest: 'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478',
};
const CUTOFF = new Date('2026-05-19T12:00:00+09:00');

function parseCsvLine(line) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseTs(s) {
  if (!s) return null;
  const m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    let [_, y, mo, d, ap, h, mi, se] = m;
    let hh = parseInt(h);
    if (ap === '오후' && hh !== 12) hh += 12;
    if (ap === '오전' && hh === 12) hh = 0;
    return new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${String(hh).padStart(2,'0')}:${mi}:${se || '00'}+09:00`);
  }
  return null;
}

// 워페 4분류로 매핑
function mapToWorkfest(raw) {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();

  // AI·개발·데이터
  if (/개발|engineer|engineering|엔지니어|프론트|백엔드|풀스택|웹|앱|게임|소프트웨어|software|sw|ml|ai|인공지능|데이터|data|보안|qa|dba|클라우드|cloud|블록체인|임베디드|mlops|devops|연구원.*개발|연구.*ai|nodejs|rpa|hardware|hw|infra|인프라|tpm/i.test(v)) {
    return 'AI·개발·데이터';
  }
  // 기획·전략
  if (/기획|planning|전략|strategy|pm$|pmpo|pl.pm|기획자|product manager|서비스 기획|매니저$|매니져$/i.test(v)) {
    return '기획·전략';
  }
  // 디자인
  if (/디자인|design|designer|ux|ui|uxui|영상|콘텐츠|편집|미디어|3d|모델러|퍼블리|publisher/i.test(v)) {
    return '디자인';
  }
  return '기타';
}

function tally(arr) {
  const m = { 'AI·개발·데이터': 0, '기획·전략': 0, '디자인': 0, '기타': 0 };
  arr.forEach(v => { if (v && m.hasOwnProperty(v)) m[v]++; });
  return m;
}

(async () => {
  const [c, d, w] = await Promise.all(Object.values(SHEETS).map(u => fetch(u).then(r => r.text())));

  // 커컨: col[5] = 직군 (자유응답)
  const cLines = c.split(/\r?\n/).filter(l => l.length);
  const careerMapped = [];
  cLines.slice(1).forEach(l => {
    const cells = parseCsvLine(l);
    careerMapped.push(mapToWorkfest(cells[5]));
  });

  // 데브콘: col[5] = 직무
  const dLines = d.split(/\r?\n/).filter(l => l.length);
  const devconMapped = [];
  dLines.slice(1).forEach(l => {
    const cells = parseCsvLine(l);
    devconMapped.push(mapToWorkfest(cells[5]));
  });

  // 워페: col[5] = 직군 (4분류 그대로)
  const wLines = w.split(/\r?\n/).filter(l => l.length);
  const wfMapped = [];
  wLines.forEach(l => {
    const cells = parseCsvLine(l);
    if (cells.length !== 16) return;
    const dt = parseTs(cells[1]);
    if (!dt || dt > CUTOFF) return;
    const v = cells[5];
    if (!v) return;
    // 워페는 이미 4분류라 그대로
    if (['AI·개발·데이터', '기획·전략', '디자인', '기타'].includes(v)) wfMapped.push(v);
    else wfMapped.push('기타');
  });

  const cT = tally(careerMapped);
  const dT = tally(devconMapped);
  const wT = tally(wfMapped);

  function pct(v, total) { return total ? (v / total * 100).toFixed(1) + '%' : '—'; }

  const cTotal = careerMapped.filter(v => v).length;
  const dTotal = devconMapped.filter(v => v).length;
  const wTotal = wfMapped.length;

  console.log('\n=== 3개 이벤트 직군 매핑 결과 (워페 4분류 기준) ===');
  console.log(`\n분모: 커컨 ${cTotal} / 데브콘 ${dTotal} / 워페 ${wTotal}`);
  console.log('\n┌────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│       직군         │     커컨     │    데브콘    │     워페     │');
  console.log('├────────────────────┼──────────────┼──────────────┼──────────────┤');
  ['AI·개발·데이터', '기획·전략', '디자인', '기타'].forEach(k => {
    const row = `│ ${k.padEnd(18)} │ ${String(cT[k]).padStart(4)} (${pct(cT[k], cTotal).padStart(5)}) │ ${String(dT[k]).padStart(4)} (${pct(dT[k], dTotal).padStart(5)}) │ ${String(wT[k]).padStart(4)} (${pct(wT[k], wTotal).padStart(5)}) │`;
    console.log(row);
  });
  console.log('└────────────────────┴──────────────┴──────────────┴──────────────┘');

  fs.writeFileSync('C:\\Users\\hannakim1124\\b2c-dashboard\\data\\_job_mapped.json', JSON.stringify({
    method: '워페 4분류 (AI·개발·데이터 / 기획·전략 / 디자인 / 기타) 기준으로 커컨/데브콘 키워드 매핑',
    totals: { career: cTotal, devcon: dTotal, workfest: wTotal },
    career: cT,
    devcon: dT,
    workfest: wT,
    career_pct: Object.fromEntries(Object.entries(cT).map(([k,v]) => [k, pct(v, cTotal)])),
    devcon_pct: Object.fromEntries(Object.entries(dT).map(([k,v]) => [k, pct(v, dTotal)])),
    workfest_pct: Object.fromEntries(Object.entries(wT).map(([k,v]) => [k, pct(v, wTotal)])),
  }, null, 2), 'utf8');
  console.log('\n✅ data/_job_mapped.json 저장');
})();
