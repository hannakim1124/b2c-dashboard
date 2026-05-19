// 3명 풀ID 추출 (상품 발송용)
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
  const [c, d, w] = await Promise.all(Object.values(SHEETS).map(u => fetch(u).then(r => r.text())));

  const cLines = c.split(/\r?\n/).filter(l => l.length);
  const cH = parseCsvLine(cLines[0]);
  const careerMap = new Map();
  cLines.slice(1).forEach(l => {
    const cells = parseCsvLine(l);
    const p = normPhone(cells[cH.findIndex(h => h.includes('핸드폰'))]);
    if (p && p.length >= 9) careerMap.set(p, {
      name: cells[cH.findIndex(h => h.includes('성함'))],
      email: cells[cH.findIndex(h => h.includes('이메일'))],
      phone: cells[cH.findIndex(h => h.includes('핸드폰'))],
      ts: cells[cH.findIndex(h => h.includes('타임스탬프'))],
    });
  });

  const dLines = d.split(/\r?\n/).filter(l => l.length);
  const dH = parseCsvLine(dLines[0]);
  const devconMap = new Map();
  dLines.slice(1).forEach(l => {
    const cells = parseCsvLine(l);
    const p = normPhone(cells[dH.findIndex(h => h.includes('핸드폰'))]);
    if (p && p.length >= 9) devconMap.set(p, {
      name: cells[dH.findIndex(h => h.includes('성함'))],
      phone: cells[dH.findIndex(h => h.includes('핸드폰'))],
      ts: cells[dH.findIndex(h => h.includes('타임스탬프'))],
    });
  });

  const wLines = w.split(/\r?\n/).filter(l => l.length);
  const wfMap = new Map();
  wLines.forEach(l => {
    const cells = parseCsvLine(l);
    if (cells.length !== 16) return;
    const dt = parseTs(cells[1]);
    if (!dt || dt > CUTOFF) return;
    const p = normPhone(cells[10]);
    if (p && p.length >= 9) wfMap.set(p, {
      name: cells[2],
      jkid: cells[3],
      phone: cells[10],
      ts: cells[1],
    });
  });

  const triple = [];
  for (const phone of careerMap.keys()) {
    if (devconMap.has(phone) && wfMap.has(phone)) {
      triple.push({ phone, career: careerMap.get(phone), devcon: devconMap.get(phone), workfest: wfMap.get(phone) });
    }
  }

  let txt = `════════════════════════════════════════════════════════════
3개 이벤트 모두 신청한 진성 코어 3명 — 상품 발송용 (풀ID)
매칭 기준: 휴대폰 번호 정규화 후 교집합
기준 시점: 2026-05-19 12:00
════════════════════════════════════════════════════════════

`;
  triple.forEach((t, i) => {
    txt += `[${i + 1}] ${t.career.name}\n`;
    txt += `   휴대폰    : ${t.career.phone}\n`;
    txt += `   이메일    : ${t.career.email || '(미수집)'}\n`;
    txt += `   잡코리아ID: ${t.workfest.jkid}\n`;
    txt += `   신청 시점:\n`;
    txt += `      커컨   : ${t.career.ts}\n`;
    txt += `      데브콘 : ${t.devcon.ts}\n`;
    txt += `      워페   : ${t.workfest.ts}\n\n`;
  });

  txt += `════════════════════════════════════════════════════════════
※ PII 포함 문서 — 외부 공유 금지. 상품 발송 후 폐기 또는 PII 마스킹.
════════════════════════════════════════════════════════════
`;

  fs.writeFileSync('C:\\Users\\hannakim1124\\Desktop\\클로드 숙제\\03_보고용 대시보드\\TRIPLE_3명_명단_상품발송용.txt', txt, 'utf8');
  console.log('✅ TRIPLE_3명_명단_상품발송용.txt 저장');
  triple.forEach((t, i) => console.log(`[${i + 1}] ${t.career.name} / ${t.career.phone} / ${t.workfest.jkid}`));
})();
