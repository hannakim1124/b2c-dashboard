// 3개 이벤트 모두 신청한 3명의 신원 추출 (부분 마스킹)
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

function maskName(n) {
  if (!n) return '?';
  if (n.length === 1) return n;
  if (n.length === 2) return n[0] + '○';
  return n[0] + '○' + n.slice(2);
}

function maskPhone(p) {
  // 01012345678 → 010-****-5678
  if (!p) return '?';
  const d = p.replace(/[^\d]/g, '');
  if (d.length === 11) return `${d.slice(0,3)}-****-${d.slice(-4)}`;
  if (d.length === 10) return `${d.slice(0,3)}-***-${d.slice(-4)}`;
  return d.slice(0, 3) + '****' + d.slice(-4);
}

function maskId(id) {
  if (!id) return '?';
  if (id.includes('@')) {
    const [lp, dom] = id.split('@');
    return lp.slice(0, 2) + '***@' + dom;
  }
  if (id.length <= 3) return id[0] + '**';
  return id.slice(0, 2) + '***' + id.slice(-1);
}

(async () => {
  const [c, d, w] = await Promise.all(Object.values(SHEETS).map(u => fetch(u).then(r => r.text())));

  // 커컨
  const cLines = c.split(/\r?\n/).filter(l => l.length);
  const cH = parseCsvLine(cLines[0]);
  const cPhoneIdx = cH.findIndex(h => h.includes('핸드폰'));
  const cNameIdx = cH.findIndex(h => h.includes('성함'));
  const cEmailIdx = cH.findIndex(h => h.includes('이메일'));
  const cTsIdx = cH.findIndex(h => h.includes('타임스탬프'));
  const careerMap = new Map();
  cLines.slice(1).forEach(l => {
    const cells = parseCsvLine(l);
    const p = normPhone(cells[cPhoneIdx]);
    if (p && p.length >= 9) {
      careerMap.set(p, {
        name: cells[cNameIdx],
        email: cells[cEmailIdx],
        ts: cells[cTsIdx],
        rawPhone: cells[cPhoneIdx],
      });
    }
  });

  // 데브콘
  const dLines = d.split(/\r?\n/).filter(l => l.length);
  const dH = parseCsvLine(dLines[0]);
  const dPhoneIdx = dH.findIndex(h => h.includes('핸드폰'));
  const dNameIdx = dH.findIndex(h => h.includes('성함'));
  const dTsIdx = dH.findIndex(h => h.includes('타임스탬프'));
  const devconMap = new Map();
  dLines.slice(1).forEach(l => {
    const cells = parseCsvLine(l);
    const p = normPhone(cells[dPhoneIdx]);
    if (p && p.length >= 9) {
      devconMap.set(p, {
        name: cells[dNameIdx],
        ts: cells[dTsIdx],
        rawPhone: cells[dPhoneIdx],
      });
    }
  });

  // 워페 (16셀, col[1]=타임스탬프, col[2]=성함, col[3]=잡코리아ID, col[10]=폰)
  const wLines = w.split(/\r?\n/).filter(l => l.length);
  const wfMap = new Map();
  wLines.forEach(l => {
    const cells = parseCsvLine(l);
    if (cells.length !== 16) return;
    const dt = parseTs(cells[1]);
    if (!dt || dt > CUTOFF) return;
    const p = normPhone(cells[10]);
    if (p && p.length >= 9) {
      wfMap.set(p, {
        name: cells[2],
        jkid: cells[3],
        ts: cells[1],
        rawPhone: cells[10],
      });
    }
  });

  // 3개 모두 가진 폰번호 찾기
  const triple = [];
  for (const phone of careerMap.keys()) {
    if (devconMap.has(phone) && wfMap.has(phone)) {
      triple.push({
        phone,
        career: careerMap.get(phone),
        devcon: devconMap.get(phone),
        workfest: wfMap.get(phone),
      });
    }
  }

  console.log(`\n=== 3개 이벤트 모두 신청 (${triple.length}명) ===\n`);
  triple.forEach((t, i) => {
    console.log(`[${i + 1}] ${maskName(t.career.name)} / ${maskPhone(t.career.rawPhone)}`);
    console.log(`    커컨   : ${t.career.ts}  성함:${t.career.name}  ID:${maskId(t.career.email)}`);
    console.log(`    데브콘 : ${t.devcon.ts}  성함:${t.devcon.name}`);
    console.log(`    워페   : ${t.workfest.ts}  성함:${t.workfest.name}  잡코리아ID:${maskId(t.workfest.jkid)}`);
    console.log('');
  });

  // 메모장용 텍스트 작성
  let txt = `════════════════════════════════════════\n3개 이벤트 모두 신청한 ${triple.length}명 (진성 코어)\n매칭 기준: 휴대폰 번호 정규화 후 교집합\n════════════════════════════════════════\n\n`;
  triple.forEach((t, i) => {
    txt += `[${i + 1}] ${maskName(t.career.name)}  ${maskPhone(t.career.rawPhone)}\n`;
    txt += `   ㄴ 커컨 신청  : ${t.career.ts}\n`;
    txt += `              이메일: ${maskId(t.career.email)}\n`;
    txt += `   ㄴ 데브콘 신청: ${t.devcon.ts}\n`;
    txt += `   ㄴ 워페 신청  : ${t.workfest.ts}\n`;
    txt += `              잡코리아ID: ${maskId(t.workfest.jkid)}\n\n`;
  });

  txt += `※ 개인정보는 부분 마스킹 (이름 2글자/이메일/회원ID).\n`;
  txt += `※ 풀ID 필요 시 한나님 추가 요청 시에만 공개.\n`;

  fs.writeFileSync('C:\\Users\\hannakim1124\\Desktop\\클로드 숙제\\03_보고용 대시보드\\TRIPLE_3명_명단.txt', txt, 'utf8');
  console.log('\n✅ TRIPLE_3명_명단.txt 저장');
})();
