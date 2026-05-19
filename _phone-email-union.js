// 폰 ∪ 이메일 매칭 — 한 회원이 폰OR이메일 하나라도 겹치면 동일인
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');

const SHEETS = {
  career: { url: 'https://docs.google.com/spreadsheets/d/1VwLwl4V-v3-KXlAKmZBYJKw2UPq_5tyFP2ClDa_HHhY/gviz/tq?tqx=out:csv', phone: 7, email: 8 },
  devcon: { url: 'https://docs.google.com/spreadsheets/d/1UgmgZCjEnI_DWxyfaJWLuiDpl91bnSBpfiSc6asz1Vs/gviz/tq?tqx=out:csv&gid=82584708', phone: 6, email: 7 },
  workfest: { url: 'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478', phone: 10, email: 3 },
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

function normEmail(e) {
  const v = (e || '').toLowerCase().trim();
  return v.includes('@') ? v : '';
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

// 시트 → 유니크 회원 list (phone OR email 기준 dedup)
function extractMembers(lines, phoneIdx, emailIdx, isWorkfest, tsIdx) {
  const expectedCells = isWorkfest ? 16 : null;
  const members = [];
  const seenPhone = new Set();
  const seenEmail = new Set();

  // 헤더 스킵 — 커컨/데브콘은 line 0이 헤더, 워페는 헤더 무용 (셀 갯수로 필터)
  const start = isWorkfest ? 0 : 1;
  for (let i = start; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (isWorkfest) {
      if (cells.length !== expectedCells) continue;
      const dt = parseTs(cells[tsIdx]);
      if (!dt || dt > CUTOFF) continue;
    }
    const p = normPhone(cells[phoneIdx]);
    const e = normEmail(cells[emailIdx]);
    const validP = p && p.length >= 9;
    const validE = !!e;
    if (!validP && !validE) continue;
    // dedup
    if (validP && seenPhone.has(p)) continue;
    if (validE && seenEmail.has(e)) continue;
    if (validP) seenPhone.add(p);
    if (validE) seenEmail.add(e);
    members.push({ phone: validP ? p : null, email: validE ? e : null });
  }
  return { members, phoneSet: seenPhone, emailSet: seenEmail };
}

function countMatch(membersA, phoneSetB, emailSetB) {
  let count = 0;
  const matchedMembers = [];
  for (const m of membersA) {
    const phoneHit = m.phone && phoneSetB.has(m.phone);
    const emailHit = m.email && emailSetB.has(m.email);
    if (phoneHit || emailHit) {
      count++;
      matchedMembers.push({ ...m, phoneHit, emailHit });
    }
  }
  return { count, matched: matchedMembers };
}

(async () => {
  const [c, d, w] = await Promise.all(Object.values(SHEETS).map(s => fetch(s.url).then(r => r.text())));

  const cLines = c.split(/\r?\n/).filter(l => l.length);
  const dLines = d.split(/\r?\n/).filter(l => l.length);
  const wLines = w.split(/\r?\n/).filter(l => l.length);

  const career = extractMembers(cLines, SHEETS.career.phone, SHEETS.career.email, false);
  const devcon = extractMembers(dLines, SHEETS.devcon.phone, SHEETS.devcon.email, false);
  const workfest = extractMembers(wLines, SHEETS.workfest.phone, SHEETS.workfest.email, true, 1);

  console.log(`\n=== 유니크 회원 수 (폰 OR 이메일 dedup) ===`);
  console.log(`커컨   : ${career.members.length} (폰 ${career.phoneSet.size} / 이메일 ${career.emailSet.size})`);
  console.log(`데브콘 : ${devcon.members.length} (폰 ${devcon.phoneSet.size} / 이메일 ${devcon.emailSet.size})`);
  console.log(`워페   : ${workfest.members.length} (폰 ${workfest.phoneSet.size} / 이메일 ${workfest.emailSet.size})`);

  console.log(`\n=== Cross-event 매칭 (폰 OR 이메일 union) ===`);

  const c_d = countMatch(career.members, devcon.phoneSet, devcon.emailSet);
  console.log(`커컨 → 데브콘    : ${c_d.count}명 (${(c_d.count / career.members.length * 100).toFixed(2)}%)`);

  const c_w = countMatch(career.members, workfest.phoneSet, workfest.emailSet);
  console.log(`커컨 → 워페      : ${c_w.count}명 (${(c_w.count / career.members.length * 100).toFixed(2)}%)`);

  const d_w = countMatch(devcon.members, workfest.phoneSet, workfest.emailSet);
  console.log(`데브콘 → 워페    : ${d_w.count}명 (${(d_w.count / devcon.members.length * 100).toFixed(2)}%)`);

  // 3개 모두: 커컨 회원 중 데브콘에도 매칭 + 워페에도 매칭
  let triple = 0;
  const tripleList = [];
  for (const m of career.members) {
    const inD = (m.phone && devcon.phoneSet.has(m.phone)) || (m.email && devcon.emailSet.has(m.email));
    const inW = (m.phone && workfest.phoneSet.has(m.phone)) || (m.email && workfest.emailSet.has(m.email));
    if (inD && inW) {
      triple++;
      tripleList.push(m);
    }
  }
  console.log(`3개 모두          : ${triple}명`);

  // 매칭 키 breakdown
  console.log(`\n=== 매칭 키 breakdown (커컨 → 데브콘) ===`);
  const cdPhoneOnly = c_d.matched.filter(m => m.phoneHit && !m.emailHit).length;
  const cdEmailOnly = c_d.matched.filter(m => !m.phoneHit && m.emailHit).length;
  const cdBoth = c_d.matched.filter(m => m.phoneHit && m.emailHit).length;
  console.log(`  폰만 매칭: ${cdPhoneOnly} / 이메일만: ${cdEmailOnly} / 둘 다: ${cdBoth}`);

  console.log(`\n=== 매칭 키 breakdown (커컨 → 워페) ===`);
  const cwPhoneOnly = c_w.matched.filter(m => m.phoneHit && !m.emailHit).length;
  const cwEmailOnly = c_w.matched.filter(m => !m.phoneHit && m.emailHit).length;
  const cwBoth = c_w.matched.filter(m => m.phoneHit && m.emailHit).length;
  console.log(`  폰만 매칭: ${cwPhoneOnly} / 이메일만: ${cwEmailOnly} / 둘 다: ${cwBoth}`);

  console.log(`\n=== 매칭 키 breakdown (데브콘 → 워페) ===`);
  const dwPhoneOnly = d_w.matched.filter(m => m.phoneHit && !m.emailHit).length;
  const dwEmailOnly = d_w.matched.filter(m => !m.phoneHit && m.emailHit).length;
  const dwBoth = d_w.matched.filter(m => m.phoneHit && m.emailHit).length;
  console.log(`  폰만 매칭: ${dwPhoneOnly} / 이메일만: ${dwEmailOnly} / 둘 다: ${dwBoth}`);

  fs.writeFileSync('C:\\Users\\hannakim1124\\b2c-dashboard\\data\\_cross_union_result.json', JSON.stringify({
    fetchedAt: new Date().toISOString(),
    method: '폰 OR 이메일 union 매칭 (한 회원이 폰 또는 이메일 하나라도 겹치면 동일인)',
    unique_members: {
      career: career.members.length,
      devcon: devcon.members.length,
      workfest: workfest.members.length,
    },
    cross: {
      career_x_devcon: c_d.count,
      career_x_workfest: c_w.count,
      devcon_x_workfest: d_w.count,
      all_three: triple,
    },
    rates: {
      career_x_devcon: (c_d.count / career.members.length * 100).toFixed(2) + '%',
      career_x_workfest: (c_w.count / career.members.length * 100).toFixed(2) + '%',
      devcon_x_workfest: (d_w.count / devcon.members.length * 100).toFixed(2) + '%',
    },
    breakdown: {
      career_x_devcon: { phone_only: cdPhoneOnly, email_only: cdEmailOnly, both: cdBoth },
      career_x_workfest: { phone_only: cwPhoneOnly, email_only: cwEmailOnly, both: cwBoth },
      devcon_x_workfest: { phone_only: dwPhoneOnly, email_only: dwEmailOnly, both: dwBoth },
    },
  }, null, 2), 'utf8');
  console.log('\n✅ data/_cross_union_result.json 저장');
})();
