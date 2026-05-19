// 세 이벤트 직군 분포 분석
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

function tally(arr) {
  const m = {};
  arr.forEach(v => { if (v) m[v] = (m[v] || 0) + 1; });
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

(async () => {
  const [c, d, w] = await Promise.all(Object.values(SHEETS).map(u => fetch(u).then(r => r.text())));

  // 커컨 — 헤더 정상, '직군' 컬럼
  const cLines = c.split(/\r?\n/).filter(l => l.length);
  const cH = parseCsvLine(cLines[0]);
  const cJobIdx = cH.findIndex(h => h.trim() === '직군');
  const cRoleIdx = cH.findIndex(h => h.includes('직무명'));
  const careerJobs = [];
  const careerRoles = [];
  cLines.slice(1).forEach(l => {
    const cells = parseCsvLine(l);
    if (cells[cJobIdx]) careerJobs.push(cells[cJobIdx].trim());
    if (cells[cRoleIdx]) careerRoles.push(cells[cRoleIdx].trim());
  });
  console.log(`\n[커컨] 직군 컬럼 idx=${cJobIdx}, 헤더="${cH[cJobIdx]}"`);
  console.log(`  응답 수: ${careerJobs.length}`);
  console.log(`  직군 분포:`);
  tally(careerJobs).forEach(([k, v]) => console.log(`    ${k.padEnd(30)} ${v}명`));

  // 데브콘 — 헤더 col[5] '직무'
  const dLines = d.split(/\r?\n/).filter(l => l.length);
  const dH = parseCsvLine(dLines[0]);
  const dJobIdx = dH.findIndex(h => h.includes('직무'));
  const devconJobs = [];
  dLines.slice(1).forEach(l => {
    const cells = parseCsvLine(l);
    if (cells[dJobIdx]) devconJobs.push(cells[dJobIdx].trim());
  });
  console.log(`\n[데브콘] 직무 컬럼 idx=${dJobIdx}, 헤더="${dH[dJobIdx]}"`);
  console.log(`  응답 수: ${devconJobs.length}`);
  console.log(`  직무 분포:`);
  tally(devconJobs).forEach(([k, v]) => console.log(`    ${k.padEnd(30)} ${v}명`));

  // 워페 — col[5] 직군, col[6] 보조, col[7-9] 세부
  const wLines = w.split(/\r?\n/).filter(l => l.length);
  const wfJobs = [];
  const wfJobs2 = [];
  wLines.forEach(l => {
    const cells = parseCsvLine(l);
    if (cells.length !== 16) return;
    const dt = parseTs(cells[1]);
    if (!dt || dt > CUTOFF) return;
    if (cells[5]) wfJobs.push(cells[5].trim());
    if (cells[6]) wfJobs2.push(cells[6].trim());
  });
  console.log(`\n[워페] col[5] 직군 응답 수: ${wfJobs.length}`);
  console.log(`  직군 분포:`);
  tally(wfJobs).forEach(([k, v]) => console.log(`    ${k.padEnd(30)} ${v}명`));
  console.log(`\n[워페] col[6] 보조 직군 응답 수: ${wfJobs2.length}`);
  tally(wfJobs2).forEach(([k, v]) => console.log(`    ${k.padEnd(30)} ${v}명`));

  // 결과 저장
  fs.writeFileSync('C:\\Users\\hannakim1124\\b2c-dashboard\\data\\_job_distribution.json', JSON.stringify({
    career: { job_column: cH[cJobIdx], total: careerJobs.length, distribution: tally(careerJobs) },
    devcon: { job_column: dH[dJobIdx], total: devconJobs.length, distribution: tally(devconJobs) },
    workfest_primary: { col: 5, total: wfJobs.length, distribution: tally(wfJobs) },
    workfest_secondary: { col: 6, total: wfJobs2.length, distribution: tally(wfJobs2) },
  }, null, 2), 'utf8');
  console.log('\n✅ data/_job_distribution.json 저장');
})();
