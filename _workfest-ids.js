// 워크페스트 시트 → 5/19 12:00 컷오프 → 회원ID 분류 (social / plain / email)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478';
const CUTOFF = new Date('2026-05-19T12:00:00+09:00'); // KST

function parseCsvLine(line) {
  const out = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (c === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.length);
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(l => {
    const cells = parseCsvLine(l);
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = (cells[i] || '').trim());
    return obj;
  });
  return { headers, rows };
}

function sha256_16(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function classify(rawId) {
  const id = (rawId || '').trim();
  if (!id) return null;
  const lower = id.toLowerCase();
  const m = lower.match(/^(nv|ka|gl|fb)_(\d+)$/);
  if (m) return { type: 'social', original: id, value: parseInt(m[2]), prefix: m[1].toUpperCase() };
  if (lower.includes('@')) {
    const localpart = lower.split('@')[0];
    return { type: 'email', original: id, email: lower, localpartHash: sha256_16(localpart) };
  }
  return { type: 'plain', original: id, hash: sha256_16(lower) };
}

// 구글시트 타임스탬프 형식: "2026. 5. 19 오전 11:48:23" 또는 ISO 등
function parseSheetTimestamp(s) {
  if (!s) return null;
  // 한국어 형식 시도
  let m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2}):(\d{2})/);
  if (m) {
    let [_, y, mo, d, ap, h, mi, se] = m;
    let hh = parseInt(h);
    if (ap === '오후' && hh !== 12) hh += 12;
    if (ap === '오전' && hh === 12) hh = 0;
    return new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${String(hh).padStart(2,'0')}:${mi}:${se}+09:00`);
  }
  // 폴백 — Date 직접 파싱
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

(async () => {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const { headers, rows } = parseCsv(text);
  console.log('헤더:', headers);
  console.log(`전체 행: ${rows.length}`);

  // 컷오프 적용
  const tsKey = headers.find(h => h.includes('타임스탬프')) || '타임스탬프';
  const idKey = headers.find(h => h.includes('잡코리아 ID') || h.includes('잡코리아ID') || h.includes('회원')) || '잡코리아 ID';
  const nameKey = headers.find(h => h.includes('성함') || h.includes('이름')) || '성함';

  const filtered = rows.filter(r => {
    const dt = parseSheetTimestamp(r[tsKey]);
    if (!dt) return false;
    return dt <= CUTOFF;
  });
  console.log(`5/19 12:00 이전: ${filtered.length}`);

  // 홍예빈 인덱스 확인
  const hongIdx = filtered.findIndex(r => (r[nameKey] || '').includes('홍예빈'));
  console.log(`홍예빈 위치: ${hongIdx >= 0 ? `${hongIdx + 1}번째 행` : '미발견'}`);
  if (hongIdx >= 0) {
    console.log(`  ㅏ 타임스탬프: ${filtered[hongIdx][tsKey]}`);
    console.log(`  ㅏ 잡코리아ID: ${filtered[hongIdx][idKey]}`);
  }

  // 분류
  const classified = filtered.map(r => ({
    timestamp: r[tsKey],
    name: r[nameKey],
    rawId: r[idKey],
    cls: classify(r[idKey]),
  })).filter(x => x.cls);

  console.log(`분류 가능 ID: ${classified.length}`);

  // 회원ID 유니크 처리
  const seen = new Set();
  const unique = [];
  for (const x of classified) {
    let key;
    if (x.cls.type === 'social') key = `s:${x.cls.value}`;
    else if (x.cls.type === 'plain') key = `p:${x.cls.hash}`;
    else key = `e:${x.cls.email}`;
    if (!seen.has(key)) { seen.add(key); unique.push(x); }
  }
  console.log(`유니크 회원ID: ${unique.length}`);

  // 분류별 집계
  const social = unique.filter(x => x.cls.type === 'social');
  const plain = unique.filter(x => x.cls.type === 'plain');
  const email = unique.filter(x => x.cls.type === 'email');
  console.log(`  ├ social (NV/KA/GL/FB): ${social.length}`);
  console.log(`  ├ plain: ${plain.length}`);
  console.log(`  └ email: ${email.length}`);

  // SQL용 VALUES 생성
  const socialValues = social.map(x => `(${x.cls.value})`).join(',');
  const plainValues = plain.map(x => `('${x.cls.hash}')`).join(',');
  const emailLocalpartValues = email.map(x => `('${x.cls.localpartHash}')`).join(','); // Stage 2
  const emailRawValues = email.map(x => `('${x.cls.email.replace(/'/g, "''")}')`).join(','); // Stage 1 (m_email 직접)

  // 표준 SQL 생성
  const sql = `
WITH social_mems AS (SELECT mem_sys_no FROM (VALUES ${socialValues || '(0)'}) AS t(mem_sys_no)),
     plain_hashes AS (SELECT m_id FROM (VALUES ${plainValues || "('x')"}) AS t(m_id)),
     email_localpart_hashes AS (SELECT m_id FROM (VALUES ${emailLocalpartValues || "('x')"}) AS t(m_id)),
     matched AS (
       SELECT DISTINCT u.m_id, u.mem_sys_no, u.m_w_date
       FROM box_job_db30_gg.user_db u
       WHERE u.m_id IN (SELECT m_id FROM plain_hashes)
          OR u.m_id IN (SELECT m_id FROM email_localpart_hashes)
          OR u.mem_sys_no IN (SELECT mem_sys_no FROM social_mems)
     ),
     resume_updated AS (
       SELECT DISTINCT m.m_id
       FROM matched m
       JOIN box_job_db30_gg.user_resume_db r ON r.m_id = m.m_id
       WHERE r.r_edit_dt >= TIMESTAMP '2026-05-01 00:00:00'
         AND r.r_edit_dt <  TIMESTAMP '2026-05-19 12:00:00'
     ),
     resume_created AS (
       SELECT DISTINCT m.m_id
       FROM matched m
       JOIN box_job_db30_gg.user_resume_db r ON r.m_id = m.m_id
       WHERE r.m_w_date >= TIMESTAMP '2026-05-01 00:00:00'
         AND r.m_w_date <  TIMESTAMP '2026-05-19 12:00:00'
     ),
     new_signup AS (
       SELECT m_id FROM matched
       WHERE m_w_date >= TIMESTAMP '2026-05-01 00:00:00'
         AND m_w_date <  TIMESTAMP '2026-05-19 12:00:00'
     )
SELECT
  (SELECT COUNT(*) FROM matched)         AS matched_total,
  (SELECT COUNT(*) FROM new_signup)      AS new_signup_count,
  (SELECT COUNT(*) FROM resume_created)  AS resume_created_count,
  (SELECT COUNT(*) FROM resume_updated)  AS resume_updated_count
`.trim();

  fs.writeFileSync(path.join(__dirname, 'data', '_workfest_sql.sql'), sql, 'utf8');
  fs.writeFileSync(path.join(__dirname, 'data', '_workfest_ids.json'), JSON.stringify({
    cutoff: '2026-05-19 12:00:00 KST',
    totalRows: rows.length,
    filteredCount: filtered.length,
    classifiedCount: classified.length,
    uniqueCount: unique.length,
    social: social.length,
    plain: plain.length,
    email: email.length,
    hongIdx: hongIdx + 1,
  }, null, 2), 'utf8');

  console.log('\n✅ SQL 저장: data/_workfest_sql.sql');
  console.log('✅ 메타데이터: data/_workfest_ids.json');
})();
