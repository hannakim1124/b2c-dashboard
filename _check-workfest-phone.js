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
  // 헤더 3줄 정도 raw로 보기
  for (let i = 0; i < 3; i++) {
    const cells = parseCsvLine(lines[i]);
    console.log(`\n[행 ${i}]`);
    cells.forEach((c, idx) => console.log(`  col${idx}: "${c.slice(0, 80)}"`));
  }
})();
