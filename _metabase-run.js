// Metabase REST API 직접 호출 — 워크페스트 이력서 업데이트 SQL 실행
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const path = require('path');

const METABASE = 'https://bi-metabase.jkintra.net';
const USER = 'hannakim1124@worxphere.ai';
const PASS = 'asdqwe123!';
const DB_ID = 3; // Athena

async function login() {
  const r = await fetch(`${METABASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  if (!r.ok) throw new Error(`login ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.id;
}

async function query(token, sql) {
  const r = await fetch(`${METABASE}/api/dataset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Metabase-Session': token },
    body: JSON.stringify({
      database: DB_ID,
      type: 'native',
      native: { query: sql },
    }),
  });
  if (!r.ok) throw new Error(`query ${r.status}: ${await r.text()}`);
  return await r.json();
}

(async () => {
  console.log('▶ 로그인 중...');
  const token = await login();
  console.log('  ✓ 세션 획득');

  const sql = fs.readFileSync(path.join(__dirname, 'data', '_workfest_sql.sql'), 'utf8');
  console.log(`▶ SQL 크기: ${(sql.length / 1024).toFixed(1)}KB`);

  console.log('▶ 메타베이스 쿼리 실행 중... (180초 타임아웃)');
  const t0 = Date.now();
  const result = await query(token, sql);
  console.log(`  ✓ 실행 완료 (${((Date.now() - t0) / 1000).toFixed(1)}초)`);

  if (result.error) {
    console.error('❌ 쿼리 에러:', result.error);
    fs.writeFileSync(path.join(__dirname, 'data', '_workfest_result.json'), JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const cols = result.data?.cols?.map(c => c.name) || [];
  const rows = result.data?.rows || [];
  console.log('\n=== 결과 ===');
  console.log('컬럼:', cols.join(' | '));
  rows.forEach(r => console.log('  ', r.join(' | ')));

  // 결과 저장
  const summary = {
    fetchedAt: new Date().toISOString(),
    cutoff: '2026-05-19 12:00:00 KST',
    period: '2026-05-01 ~ 2026-05-19 12:00',
    columns: cols,
    rows,
    parsed: cols.length && rows.length ? Object.fromEntries(cols.map((c, i) => [c, rows[0][i]])) : null,
  };
  fs.writeFileSync(path.join(__dirname, 'data', '_workfest_result.json'), JSON.stringify(summary, null, 2), 'utf8');
  console.log('\n✅ data/_workfest_result.json 저장');
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
