// 서버에서 구글 시트 fetch (CORS 우회 + 시트 권한 처리)
// POST /api/fetch-sheet { sheetUrl, sheetId, gid }
// → { ok, rows, fetchedAt } | { ok: false, error }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const { sheetUrl, sheetId, gid } = req.body || {};
    if (!sheetId) return res.status(400).json({ error: 'sheetId required' });
    const g = gid || (sheetUrl || '').match(/[#&?]gid=(\d+)/)?.[1] || '0';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${g}`;
    const r = await fetch(csvUrl, { redirect: 'follow' });
    if (!r.ok) {
      // 401: 비공개 / 404: 잘못된 ID
      return res.status(200).json({
        ok: false,
        error: r.status === 401 ? '시트가 비공개. "링크 있는 모두 — 뷰어"로 권한 풀어주세요'
             : r.status === 404 ? '시트를 찾을 수 없음 (URL 확인)'
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
