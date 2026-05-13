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
  // Upstash REST는 body를 raw value로 저장. 호출 측에서 이미 JSON.stringify한 문자열을
  // 또 stringify하면 이중 wrap돼서 GET 시 글자 인덱스 객체로 풀린다 (2026-05 손실 사고 원인).
  const r = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'text/plain' },
    body: typeof value === 'string' ? value : JSON.stringify(value)
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
      // 기본 = merge (타 카드 데이터 보호). replace=true 명시 시만 통째 덮어쓰기
      const merge = body.replace !== true;
      let finalData = incoming;
      let mergedKeys = 0;
      if (merge) {
        const raw = await kvGet(KEY);
        let existing = {};
        if (typeof raw === 'string') {
          try { existing = JSON.parse(raw); } catch (e) { existing = {}; }
        } else if (raw && typeof raw === 'object') {
          existing = raw;
        }
        // 들어온 키만 덮어쓰고 나머지는 보존 (다른 카드 stats 손실 방지)
        finalData = { ...existing, ...incoming };
        mergedKeys = Object.keys(incoming).filter(k => !k.startsWith('_')).length;
      }
      finalData._updatedAt = new Date().toISOString();
      finalData._updatedBy = body.updatedBy || 'unknown';
      await kvSet(KEY, JSON.stringify(finalData));
      return res.status(200).json({ ok: true, updatedAt: finalData._updatedAt, mode: merge ? 'merge' : 'replace', mergedKeys, totalKeys: Object.keys(finalData).filter(k => !k.startsWith('_')).length });
    }

    if (req.method === 'DELETE') {
      // 명시적 전체 초기화 — body.confirm === 'CLEAR_ALL'
      const body = req.body || {};
      if (body.confirm !== 'CLEAR_ALL') {
        return res.status(400).json({ error: 'DELETE 시 body.confirm = "CLEAR_ALL" 필수 (실수 방지)' });
      }
      const empty = { _updatedAt: new Date().toISOString(), _updatedBy: body.updatedBy || 'unknown' };
      await kvSet(KEY, JSON.stringify(empty));
      return res.status(200).json({ ok: true, cleared: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
