// 워크페스트 신규 가입 71명 검증 — 일자별 분포 + 표본
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');

const METABASE = 'https://bi-metabase.jkintra.net';
const USER = 'hannakim1124@worxphere.ai';
const PASS = 'asdqwe123!';
const DB_ID = 3;

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
  const token = await login();

  // 기존 SQL 재활용 — matched 풀에서 m_w_date 기간 내 가입자
  const baseSql = fs.readFileSync(path.join(__dirname, 'data', '_workfest_sql.sql'), 'utf8');

  // 신규 가입자만 m_w_date 함께 추출
  const detailSql = baseSql.replace(
    /SELECT\s+\(SELECT COUNT[\s\S]*$/m,
    `SELECT
       DATE(m.m_w_date) AS signup_date,
       COUNT(*) AS signup_count
     FROM matched m
     WHERE m.m_w_date >= TIMESTAMP '2026-05-01 00:00:00'
       AND m.m_w_date <  TIMESTAMP '2026-05-19 12:00:00'
     GROUP BY DATE(m.m_w_date)
     ORDER BY signup_date`
  );

  console.log('▶ 일자별 분포 쿼리 중...');
  const result = await query(token, detailSql);
  if (result.error) { console.error('❌', result.error); process.exit(1); }

  const rows = result.data.rows;
  console.log('\n=== 워크페스트 기간 내 신규 가입 일자별 분포 ===');
  let total = 0;
  rows.forEach(r => {
    console.log(`  ${r[0]} : ${r[1]}명`);
    total += parseInt(r[1]);
  });
  console.log(`  ─────────────`);
  console.log(`  합계: ${total}명`);

  // 표본 m_id 추출 (최대 10명)
  const sampleSql = baseSql.replace(
    /SELECT\s+\(SELECT COUNT[\s\S]*$/m,
    `SELECT m.m_id, m.mem_sys_no, DATE(m.m_w_date) AS signup_date
     FROM matched m
     WHERE m.m_w_date >= TIMESTAMP '2026-05-01 00:00:00'
       AND m.m_w_date <  TIMESTAMP '2026-05-19 12:00:00'
     ORDER BY m.m_w_date
     LIMIT 10`
  );

  console.log('\n▶ 표본 추출 중...');
  const sample = await query(token, sampleSql);
  if (sample.error) { console.error('❌', sample.error); process.exit(1); }

  console.log('\n=== 신규 가입자 표본 (시간순 처음 10명) ===');
  sample.data.rows.forEach((r, i) => {
    console.log(`  [${i + 1}] m_id=${r[0].slice(0, 6)}*** / mem_sys_no=${r[1]} / 가입일=${r[2]}`);
  });

  fs.writeFileSync(path.join(__dirname, 'data', '_new_signup_distribution.json'), JSON.stringify({
    total,
    distribution: rows.map(r => ({ date: r[0], count: parseInt(r[1]) })),
    sample: sample.data.rows.map(r => ({ m_id: r[0].slice(0, 6) + '***', mem_sys_no: r[1], signup_date: r[2] })),
  }, null, 2));
  console.log('\n✅ data/_new_signup_distribution.json 저장');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
