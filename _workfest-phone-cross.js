// 워크페스트 시트 col[10] = 폰번호 → 데브콘/커컨 폰번호 매칭
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');

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

function normPhone(p) {
  const d = (p || '').replace(/[^\d]/g, '');
  return d.replace(/^0/, '');
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

(async () => {
  console.log('▶ 시트 3개 fetch...');
  const [careerCsv, devconCsv, workfestCsv] = await Promise.all(
    Object.values(SHEETS).map(u => fetch(u).then(r => r.text()))
  );

  // 커컨: 헤더 정상, 컬럼명으로 추출
  const careerLines = careerCsv.split(/\r?\n/).filter(l => l.length);
  const careerHeaders = parseCsvLine(careerLines[0]);
  const careerPhoneIdx = careerHeaders.findIndex(h => h.includes('핸드폰') || h.includes('폰'));
  const careerPhones = new Set();
  careerLines.slice(1).forEach(l => {
    const c = parseCsvLine(l);
    const p = normPhone(c[careerPhoneIdx]);
    if (p && p.length >= 9) careerPhones.add(p);
  });
  console.log(`  커컨 유니크 폰: ${careerPhones.size}`);

  // 데브콘
  const devconLines = devconCsv.split(/\r?\n/).filter(l => l.length);
  const devconHeaders = parseCsvLine(devconLines[0]);
  const devconPhoneIdx = devconHeaders.findIndex(h => h.includes('핸드폰') || h.includes('폰'));
  const devconPhones = new Set();
  devconLines.slice(1).forEach(l => {
    const c = parseCsvLine(l);
    const p = normPhone(c[devconPhoneIdx]);
    if (p && p.length >= 9) devconPhones.add(p);
  });
  console.log(`  데브콘 유니크 폰: ${devconPhones.size}`);

  // 워크페스트: 16셀, col[1]=타임스탬프, col[10]=폰
  const wfLines = workfestCsv.split(/\r?\n/).filter(l => l.length);
  const wfPhones = new Set();
  let wfRowsCount = 0;
  let wfRowsBeforeCutoff = 0;
  wfLines.forEach(l => {
    const c = parseCsvLine(l);
    if (c.length !== 16) return; // 데이터 행만
    wfRowsCount++;
    const dt = parseTs(c[1]);
    if (!dt || dt > CUTOFF) return;
    wfRowsBeforeCutoff++;
    const p = normPhone(c[10]);
    if (p && p.length >= 9) wfPhones.add(p);
  });
  console.log(`  워페 데이터 행: ${wfRowsCount} / 5/19 12:00 이전: ${wfRowsBeforeCutoff} / 유니크 폰: ${wfPhones.size}`);

  // 매칭 교집합
  function intersect(a, b) {
    const r = new Set();
    a.forEach(v => { if (b.has(v)) r.add(v); });
    return r;
  }
  const c_x_d = intersect(careerPhones, devconPhones);
  const c_x_w = intersect(careerPhones, wfPhones);
  const d_x_w = intersect(devconPhones, wfPhones);
  const all_three = intersect(intersect(careerPhones, devconPhones), wfPhones);

  console.log('\n=== Cross-event 폰번호 매칭 ===');
  console.log(`커컨 ↔ 데브콘   : ${c_x_d.size}명 (${(c_x_d.size / careerPhones.size * 100).toFixed(1)}%)`);
  console.log(`커컨 ↔ 워페     : ${c_x_w.size}명 (${(c_x_w.size / careerPhones.size * 100).toFixed(1)}%)`);
  console.log(`데브콘 ↔ 워페   : ${d_x_w.size}명 (${(d_x_w.size / devconPhones.size * 100).toFixed(1)}%)`);
  console.log(`3개 모두        : ${all_three.size}명`);

  const result = {
    fetchedAt: new Date().toISOString(),
    cutoff: '2026-05-19 12:00:00 KST',
    method: '폰번호 정규화 (비숫자 제거 + 앞 0 제거) 후 유니크 교집합',
    unique_phones: {
      career: careerPhones.size,
      devcon: devconPhones.size,
      workfest: wfPhones.size,
    },
    cross: {
      career_x_devcon: c_x_d.size,
      career_x_workfest: c_x_w.size,
      devcon_x_workfest: d_x_w.size,
      all_three: all_three.size,
    },
    rates: {
      career_x_devcon: (c_x_d.size / careerPhones.size * 100).toFixed(2) + '%',
      career_x_workfest: (c_x_w.size / careerPhones.size * 100).toFixed(2) + '%',
      devcon_x_workfest: (d_x_w.size / devconPhones.size * 100).toFixed(2) + '%',
    },
  };

  fs.writeFileSync(path.join(__dirname, 'data', '_cross_phone_result.json'), JSON.stringify(result, null, 2), 'utf8');
  console.log('\n✅ data/_cross_phone_result.json 저장');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
