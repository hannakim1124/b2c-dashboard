// 디바이스 간 동기화 — Upstash Redis (KV) 사용
// GET  /api/sync          → 모든 동기화 데이터 반환
// POST /api/sync          → 받은 데이터로 덮어쓰기

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'b2c-dashboard:main';

async function kvGet(key) {
  if (!KV_URL || !KV_TOKEN) return null;
  const r = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.result;
}

async function kvSet(key, value) {
  if (!KV_URL || !KV_TOKEN) throw new Error('KV not configured');
  const r = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  if (!r.ok) throw new Error('KV set failed: ' + r.status);
  return r.json();
}

export default async function handler(req, res) {
  // CORS — 같은 origin이지만 명시
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'KV 환경변수 없음. Vercel Dashboard → Storage에서 KV 연결 필요' });
  }

  try {
    if (req.method === 'GET') {
      const raw = await kvGet(KEY);
      let data = {};
      if (typeof raw === 'string') {
        try { data = JSON.parse(raw); } catch (e) { data = {}; }
      } else if (raw && typeof raw === 'object') {
        data = raw;
      }
      const updatedAt = data._updatedAt || null;
      return res.status(200).json({ ok: true, data, updatedAt });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const incoming = body.data || {};
      if (typeof incoming !== 'object') {
        return res.status(400).json({ error: 'data 필수 (object)' });
      }
      // 메타 추가
      incoming._updatedAt = new Date().toISOString();
      incoming._updatedBy = body.updatedBy || 'unknown';
      await kvSet(KEY, JSON.stringify(incoming));
      return res.status(200).json({ ok: true, updatedAt: incoming._updatedAt });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
