process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const URL = 'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478';

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
  const r = await fetch(URL);
  const text = await r.text();
  const lines = text.split(/\r?\n/).filter(l => l.length);
  console.log('총', lines.length, '행');

  // 모든 행에서 셀 개수 분포
  const cellCounts = {};
  lines.forEach(l => {
    const n = parseCsvLine(l).length;
    cellCounts[n] = (cellCounts[n] || 0) + 1;
  });
  console.log('셀 개수 분포:', cellCounts);

  // 16셀 행 중에서 폰번호 패턴 (010 또는 11자리 숫자) 가진 행 찾기
  console.log('\n=== 010 패턴 행 찾기 ===');
  let foundCount = 0;
  for (let i = 0; i < lines.length && foundCount < 10; i++) {
    const cells = parseCsvLine(lines[i]);
    for (let j = 0; j < cells.length; j++) {
      const v = cells[j];
      if (/01[016789].{8,9}/.test(v) || /^010[\s\-]?\d{4}[\s\-]?\d{4}$/.test(v)) {
        console.log(`행${i} col${j}: "${v.slice(0, 50)}" / 전체셀수: ${cells.length}`);
        console.log(`  컨텍스트:`, cells.slice(Math.max(0, j - 2), j + 3).map(c => c.slice(0, 20)));
        foundCount++;
        break;
      }
    }
  }

  // 마지막 데이터 행 (4400+ 정도) raw 보기
  console.log('\n=== 최근 데이터 행 (4400~4410) ===');
  for (let i = 4400; i < Math.min(4410, lines.length); i++) {
    const cells = parseCsvLine(lines[i]);
    console.log(`행${i} (${cells.length}셀):`, cells.slice(0, 16).map((c, idx) => `[${idx}]${c.slice(0, 20)}`));
  }
})();
