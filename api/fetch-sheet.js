// 서버에서 구글 시트 fetch (CORS 우회 + 시트 권한 처리)
// POST /api/fetch-sheet { sheetUrl, sheetId, gid }
// → { ok, rows, fetchedAt } | { ok: false, error }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // CORS: file:// (origin null) 및 모든 origin 허용 — 시트 fetch는 PII 노출 위험 없음 (시트 자체가 공개 권한일 때만 작동)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { sheetUrl, sheetId, gid } = req.body || {};
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' });
    const explicitGid = gid || (sheetUrl || '').match(/[#&?]gid=(\d+)/)?.[1];

    const HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/csv,text/plain,*/*'
    };
    async function tryFetch(g) {
      const u = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${g}`;
      const resp = await fetch(u, { redirect: 'follow', headers: HEADERS });
      return { resp, csvUrl: u };
    }

    // 1차: 명시된 gid (또는 0)
    let g = explicitGid || '0';
    let { resp: r, csvUrl } = await tryFetch(g);

    // 2차: gid 명시 안 된 경우 + 0 탭이 빈/에러면 → HTML에서 첫 데이터 시트 자동 탐색
    if (!r.ok && !explicitGid) {
      try {
        const editUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
        const editResp = await fetch(editUrl, { redirect: 'follow', headers: HEADERS });
        if (editResp.ok) {
          const html = await editResp.text();
          // sheetId 패턴으로 등장하는 첫 번째 숫자 gid 추출
          const m = html.match(/"sheetId":(\d+)/g);
          if (m && m.length) {
            const gids = m.map(x => x.replace(/"sheetId":/, '')).filter(x => x !== '0');
            for (const candidate of gids.slice(0, 5)) {
              const tried = await tryFetch(candidate);
              if (tried.resp.ok) {
                r = tried.resp;
                csvUrl = tried.csvUrl;
                g = candidate;
                break;
              }
            }
          }
        }
      } catch (e) { /* 탐색 실패 시 원래 에러로 진행 */ }
    }

    // 3차 fallback: gviz API — gid 없이도 첫 탭 csv export 가능 (Google 공식 endpoint)
    if (!r.ok) {
      try {
        const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;
        const gv = await fetch(gvizUrl, { redirect: 'follow', headers: HEADERS });
        if (gv.ok) {
          r = gv;
          csvUrl = gvizUrl;
        }
      } catch (e) {}
    }

    if (!r.ok) {
      // 401: 비공개 / 404: 잘못된 ID / 400: gid 없음
      return res.status(200).json({
        ok: false,
        error: r.status === 401 ? '시트가 비공개예요. 우상단 "공유 → 일반 액세스 → 링크 있는 모두 (뷰어)"로 풀어주세요'
             : r.status === 404 ? '시트를 찾을 수 없음 (URL 확인)'
             : r.status === 400 ? '시트의 정확한 탭 URL이 필요해요. 데이터 탭 클릭 후 URL 복사 (gid 포함)'
             : `fetch 실패 (${r.status})`,
        status: r.status
      });
    }
    const text = await r.text();
    // CSV 파싱
    const rows = [];
    let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"' && text[i+1] === '"') { f += '"'; i++; }
        else if (c === '"') q = false;
        else f += c;
      } else {
        if (c === '"') q = true;
        else if (c === ',') { row.push(f); f = ''; }
        else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
        else if (c !== '\r') f += c;
      }
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    const filtered = rows.filter(r => r.some(c => (c || '').trim()));
    return res.status(200).json({
      ok: true,
      rows: filtered,
      fetchedAt: new Date().toISOString(),
      sheetId,
      sheetUrl: sheetUrl || csvUrl
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
