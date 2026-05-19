// 3개 이벤트 시트 fetch + cross-event 매칭 (회원ID 1차, 이메일 2차)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');

const SHEETS = {
  career: {
    name: '커리어 컨퍼런스',
    url: 'https://docs.google.com/spreadsheets/d/1VwLwl4V-v3-KXlAKmZBYJKw2UPq_5tyFP2ClDa_HHhY/gviz/tq?tqx=out:csv',
  },
  devcon: {
    name: '잡코리아 데브콘',
    url: 'https://docs.google.com/spreadsheets/d/1UgmgZCjEnI_DWxyfaJWLuiDpl91bnSBpfiSc6asz1Vs/gviz/tq?tqx=out:csv&gid=82584708',
  },
  workfest: {
    name: 'WORK FEST',
    url: 'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478',
  },
};

// CSV 한 줄 파싱 (쉼표/따옴표 처리)
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      out.push(cur); cur = '';
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.length);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const cells = parseCsvLine(l);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (cells[i] || '').trim());
    return obj;
  });
  return { headers, rows };
}

async function fetchSheet(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`fetch ${url} → ${res.status}`);
  return await res.text();
}

// 헤더 매칭 휴리스틱
function pickField(row, candidates) {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const k = keys.find(k => k.includes(cand));
    if (k && row[k]) return row[k];
  }
  return '';
}

function extractKeys(rows) {
  // 회원ID, 이메일, 폰번호 추출
  return rows.map(r => ({
    memberId: pickField(r, ['회원', '아이디', 'ID', 'id']).toLowerCase().trim(),
    email: pickField(r, ['이메일', '메일', 'mail', 'Email']).toLowerCase().trim(),
    phone: pickField(r, ['연락처', '전화', '폰', '휴대']).replace(/[^\d]/g, ''),
    raw: r,
  })).filter(x => x.memberId || x.email || x.phone);
}

(async () => {
  const out = {};
  for (const [key, cfg] of Object.entries(SHEETS)) {
    try {
      const text = await fetchSheet(cfg.url);
      const { headers, rows } = parseCsv(text);
      const keys = extractKeys(rows);
      out[key] = {
        name: cfg.name,
        rawCount: rows.length,
        headers,
        keys,
      };
      console.log(`[${key}] ${cfg.name}: ${rows.length}행, 헤더 ${headers.length}개`);
      console.log(`  헤더 샘플:`, headers.slice(0, 10).join(' | '));
      console.log(`  키 추출: 회원ID ${keys.filter(k=>k.memberId).length} / 이메일 ${keys.filter(k=>k.email).length} / 폰 ${keys.filter(k=>k.phone).length}`);
    } catch (e) {
      console.error(`[${key}] ERROR:`, e.message);
      out[key] = { error: e.message };
    }
  }

  // cross-event 매칭
  function uniqSet(arr, field) {
    return new Set(arr.map(x => x[field]).filter(v => v));
  }

  function intersect(setA, setB) {
    const r = new Set();
    setA.forEach(v => { if (setB.has(v)) r.add(v); });
    return r;
  }

  // 시트별 매칭 키 — 커컨/데브콘은 폰, 워페는 회원ID 기준
  function normPhone(p) {
    const d = (p || '').replace(/[^\d]/g, '');
    // 010-1234-5678 → 1012345678 형태로 통일 (앞 0 제거)
    return d.replace(/^0/, '');
  }
  function normMemberId(m) {
    return (m || '').toLowerCase().trim();
  }
  function normEmail(e) {
    return (e || '').toLowerCase().trim();
  }

  function eventKeyset(ev) {
    return {
      ids: new Set(ev.keys.map(k => normMemberId(k.memberId)).filter(Boolean)),
      phones: new Set(ev.keys.map(k => normPhone(k.phone)).filter(p => p && p.length >= 9)),
      emails: new Set(ev.keys.map(k => normEmail(k.email)).filter(Boolean)),
    };
  }

  const careerKeys = out.career?.keys ? eventKeyset(out.career) : null;
  const devconKeys = out.devcon?.keys ? eventKeyset(out.devcon) : null;
  const workfestKeys = out.workfest?.keys ? eventKeyset(out.workfest) : null;

  const compare = {
    career_unique: {
      total_rows: out.career?.rawCount || 0,
      unique_phones: careerKeys?.phones.size || 0,
      unique_emails: careerKeys?.emails.size || 0,
    },
    devcon_unique: {
      total_rows: out.devcon?.rawCount || 0,
      unique_phones: devconKeys?.phones.size || 0,
    },
    workfest_unique: {
      total_rows: out.workfest?.rawCount || 0,
      unique_ids: workfestKeys?.ids.size || 0,
    },
    // 커컨 ↔ 데브콘: 폰번호 매칭 가능
    career_x_devcon_phone: careerKeys && devconKeys ? intersect(careerKeys.phones, devconKeys.phones).size : null,
    // 워페는 회원ID만 있어서 다른 이벤트와 직접 매칭 불가 → 메타베이스로 lookup 필요
    workfest_lookup_required: true,
  };

  console.log('\n=== Cross-event 매칭 결과 ===');
  console.log(JSON.stringify(compare, null, 2));

  // 결과 저장 (raw 제외, 매칭용 ID만)
  const summary = {
    fetchedAt: new Date().toISOString(),
    events: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, {
      name: v.name,
      rawCount: v.rawCount,
      uniqueMembers: v.keys ? new Set(v.keys.map(x => x.memberId || x.email).filter(Boolean)).size : 0,
      headersSample: v.headers?.slice(0, 15) || [],
    }])),
    compare,
  };

  const outPath = path.join(__dirname, 'data', '_report-data.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\n✅ ${outPath} 저장 완료`);
})();
