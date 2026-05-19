process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// 다른 gviz 옵션으로 시도 — sheet의 모든 컬럼 강제
const URLS = [
  'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478&headers=0',
  'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478&tq=' + encodeURIComponent('SELECT *'),
  'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/export?format=csv&gid=1138581478',
];

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

(async () => {
  for (const url of URLS) {
    console.log('\n========');
    console.log('URL:', url.slice(0, 100));
    try {
      const r = await fetch(url);
      const text = await r.text();
      const lines = text.split(/\r?\n/).filter(l => l.length);
      console.log('총', lines.length, '행');
      // 최대 5컬럼만 보고 첫 3행
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const cells = parseCsvLine(lines[i]);
        console.log(`행${i}: ${cells.length}개 셀 / 첫4셀:`, cells.slice(0, 4).map(c => c.slice(0, 30)));
      }
      // 데이터 행 샘플 (50~52행)
      if (lines.length > 52) {
        for (let i = 50; i < 53; i++) {
          const cells = parseCsvLine(lines[i]);
          console.log(`데이터행${i}: ${cells.length}셀:`, cells.slice(0, 10).map(c => c.slice(0, 25)));
        }
      }
    } catch (e) {
      console.error('ERROR:', e.message);
    }
  }
})();
