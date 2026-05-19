// 세 시트의 이메일 컬럼 위치 정확히 찾기
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SHEETS = {
  career: 'https://docs.google.com/spreadsheets/d/1VwLwl4V-v3-KXlAKmZBYJKw2UPq_5tyFP2ClDa_HHhY/gviz/tq?tqx=out:csv',
  devcon: 'https://docs.google.com/spreadsheets/d/1UgmgZCjEnI_DWxyfaJWLuiDpl91bnSBpfiSc6asz1Vs/gviz/tq?tqx=out:csv&gid=82584708',
  workfest: 'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478',
};

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
  for (const [name, url] of Object.entries(SHEETS)) {
    const r = await fetch(url);
    const text = await r.text();
    const lines = text.split(/\r?\n/).filter(l => l.length);
    console.log(`\n=== ${name} (${lines.length}행) ===`);

    // 셀 개수 분포
    const cnt = {};
    lines.forEach(l => { const n = parseCsvLine(l).length; cnt[n] = (cnt[n] || 0) + 1; });
    console.log('셀 개수 분포:', cnt);

    // 이메일 패턴(@) 가진 셀 통계
    const emailColCount = {};
    for (let i = 0; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]);
      cells.forEach((c, idx) => {
        if (/[\w.\-]+@[\w.\-]+\.[a-zA-Z]{2,}/.test(c)) {
          emailColCount[idx] = (emailColCount[idx] || 0) + 1;
        }
      });
    }
    console.log('이메일 발견 컬럼 (col_idx: 개수):', emailColCount);

    // 헤더 출력
    const headers = parseCsvLine(lines[0]);
    console.log('헤더:', headers);

    // 최근 데이터 샘플 (이메일 있는 컬럼 확인용)
    const recentIdx = Math.max(50, lines.length - 5);
    if (lines.length > recentIdx) {
      const sample = parseCsvLine(lines[recentIdx]);
      console.log(`샘플 행 ${recentIdx}: ${sample.length}셀`);
      sample.forEach((c, idx) => {
        if (c) console.log(`  col${idx}: ${c.slice(0, 50)}`);
      });
    }
  }
})();
