// 워크페스트 ↔ 커리어 컨퍼런스 cross-event 매칭
// 워크페스트: 회원ID 직접 / 커컨: 이메일 → Stage1 m_email + Stage2 localpart SHA256
// 데브콘은 폰번호만 → user_db 폰 매칭 권한 보류로 별도 분석 표시
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHEETS = {
  career: 'https://docs.google.com/spreadsheets/d/1VwLwl4V-v3-KXlAKmZBYJKw2UPq_5tyFP2ClDa_HHhY/gviz/tq?tqx=out:csv',
  workfest: 'https://docs.google.com/spreadsheets/d/16_MPO0BO_Xs82WAFnCLvASORpHVj2izRWidckny_VLU/gviz/tq?tqx=out:csv&gid=1138581478',
};

const METABASE = 'https://bi-metabase.jkintra.net';
const USER = 'hannakim1124@worxphere.ai';
const PASS = 'asdqwe123!';
const DB_ID = 3;
const CUTOFF = new Date('2026-05-19T12:00:00+09:00');

function sha256_16(s) {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

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

function parseTs(s) {
  if (!s) return null;
  const m = s.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)?\s*(\d{1,2}):(\d{2}):(\d{2})/);
  if (m) {
    let [_, y, mo, d, ap, h, mi, se] = m;
    let hh = parseInt(h);
    if (ap === '오후' && hh !== 12) hh += 12;
    if (ap === '오전' && hh === 12) hh = 0;
    return new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${String(hh).padStart(2,'0')}:${mi}:${se}+09:00`);
  }
  return null;
}

async function login() {
  const r = await fetch(`${METABASE}/api/session`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  return (await r.json()).id;
}

async function query(token, sql) {
  const r = await fetch(`${METABASE}/api/dataset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Metabase-Session': token },
    body: JSON.stringify({ database: DB_ID, type: 'native', native: { query: sql } }),
  });
  return await r.json();
}

(async () => {
  console.log('▶ 시트 fetch...');
  const [careerCsv, workfestCsv] = await Promise.all([
    fetch(SHEETS.career).then(r => r.text()),
    fetch(SHEETS.workfest).then(r => r.text()),
  ]);
  const career = parseCsv(careerCsv);
  const workfest = parseCsv(workfestCsv);
  console.log(`  커컨: ${career.rows.length}행 / 워페: ${workfest.rows.length}행`);

  // 커컨 이메일 추출 (유니크)
  const emailKey = career.headers.find(h => h.includes('이메일'));
  const careerEmails = new Set();
  career.rows.forEach(r => {
    const e = (r[emailKey] || '').toLowerCase().trim();
    if (e && e.includes('@')) careerEmails.add(e);
  });
  console.log(`  커컨 유니크 이메일: ${careerEmails.size}`);

  // 워크페스트 5/19 12:00 컷오프 + 회원ID 분류
  const wfTsKey = workfest.headers.find(h => h.includes('타임스탬프'));
  const wfIdKey = workfest.headers.find(h => h.includes('잡코리아'));
  const wfFiltered = workfest.rows.filter(r => {
    const dt = parseTs(r[wfTsKey]);
    return dt && dt <= CUTOFF;
  });
  console.log(`  워페 5/19 12:00 이전: ${wfFiltered.length}`);

  const wfSocial = new Set();
  const wfPlain = new Set();
  const wfEmailLocalpart = new Set();
  const wfEmailRaw = new Set();
  wfFiltered.forEach(r => {
    const id = (r[wfIdKey] || '').trim().toLowerCase();
    if (!id) return;
    const m = id.match(/^(nv|ka|gl|fb)_(\d+)$/);
    if (m) wfSocial.add(parseInt(m[2]));
    else if (id.includes('@')) {
      wfEmailRaw.add(id);
      wfEmailLocalpart.add(sha256_16(id.split('@')[0]));
    } else {
      wfPlain.add(sha256_16(id));
    }
  });
  console.log(`  워페 분류: social ${wfSocial.size} / plain ${wfPlain.size} / email ${wfEmailLocalpart.size}`);

  // 커컨 이메일 → Stage1 + Stage2 매칭용
  const careerEmailRaw = [...careerEmails];
  const careerEmailLocalpartHash = new Set();
  careerEmailRaw.forEach(e => careerEmailLocalpartHash.add(sha256_16(e.split('@')[0])));

  // SQL: 두 이벤트의 m_id 매칭 → 교집합
  // 워페 매칭 m_id 풀
  // 커컨 매칭 m_id 풀
  // 교집합
  const wfSocialVals = wfSocial.size ? [...wfSocial].map(v => `(${v})`).join(',') : '(0)';
  const wfPlainVals = wfPlain.size ? [...wfPlain].map(v => `('${v}')`).join(',') : "('x')";
  const wfEmailLpVals = wfEmailLocalpart.size ? [...wfEmailLocalpart].map(v => `('${v}')`).join(',') : "('x')";
  const wfEmailRawVals = wfEmailRaw.size ? [...wfEmailRaw].map(v => `('${v.replace(/'/g, "''")}')`).join(',') : "('x')";

  const careerEmailRawVals = careerEmailRaw.length ? careerEmailRaw.map(v => `('${v.replace(/'/g, "''")}')`).join(',') : "('x')";
  const careerEmailLpVals = careerEmailLocalpartHash.size ? [...careerEmailLocalpartHash].map(v => `('${v}')`).join(',') : "('x')";

  const sql = `
WITH
  wf_social AS (SELECT mem_sys_no FROM (VALUES ${wfSocialVals}) AS t(mem_sys_no)),
  wf_plain  AS (SELECT m_id FROM (VALUES ${wfPlainVals}) AS t(m_id)),
  wf_email_lp AS (SELECT m_id FROM (VALUES ${wfEmailLpVals}) AS t(m_id)),
  wf_email_raw AS (SELECT email_raw FROM (VALUES ${wfEmailRawVals}) AS t(email_raw)),
  career_email_raw AS (SELECT email_raw FROM (VALUES ${careerEmailRawVals}) AS t(email_raw)),
  career_email_lp AS (SELECT m_id FROM (VALUES ${careerEmailLpVals}) AS t(m_id)),

  wf_matched AS (
    SELECT DISTINCT u.m_id
    FROM box_job_db30_gg.user_db u
    WHERE u.mem_sys_no IN (SELECT mem_sys_no FROM wf_social)
       OR u.m_id IN (SELECT m_id FROM wf_plain)
       OR u.m_id IN (SELECT m_id FROM wf_email_lp)
  ),
  career_matched AS (
    SELECT DISTINCT u.m_id
    FROM box_job_db30_gg.user_db u
    WHERE u.m_id IN (SELECT m_id FROM career_email_lp)
  ),
  intersect_mids AS (
    SELECT m_id FROM wf_matched
    INTERSECT
    SELECT m_id FROM career_matched
  )

SELECT
  (SELECT COUNT(*) FROM wf_matched)       AS wf_matched,
  (SELECT COUNT(*) FROM career_matched)   AS career_matched,
  (SELECT COUNT(*) FROM intersect_mids)   AS cross_overlap
`.trim();

  fs.writeFileSync(path.join(__dirname, 'data', '_cross_event_sql.sql'), sql, 'utf8');
  console.log(`▶ SQL 크기: ${(sql.length / 1024).toFixed(1)}KB`);

  console.log('▶ 로그인 + 쿼리...');
  const token = await login();
  const t0 = Date.now();
  const result = await query(token, sql);
  console.log(`  ✓ 실행 ${((Date.now() - t0) / 1000).toFixed(1)}초`);

  if (result.error) {
    console.error('❌', result.error);
    fs.writeFileSync(path.join(__dirname, 'data', '_cross_event_result.json'), JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const cols = result.data.cols.map(c => c.name);
  const row = result.data.rows[0];
  console.log('\n=== 결과 ===');
  cols.forEach((c, i) => console.log(`  ${c}: ${row[i]}`));

  fs.writeFileSync(path.join(__dirname, 'data', '_cross_event_result.json'), JSON.stringify({
    fetchedAt: new Date().toISOString(),
    method: '커컨 이메일 localpart SHA256 → m_id, 워페 social/plain/email 분류 → m_id, 두 풀 교집합',
    columns: cols,
    values: Object.fromEntries(cols.map((c, i) => [c, row[i]])),
  }, null, 2), 'utf8');
  console.log('\n✅ data/_cross_event_result.json 저장');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
