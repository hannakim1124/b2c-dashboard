// 메타베이스 매칭 작업 큐 (Vercel KV)
// POST   /api/match-queue  { projectId, sheetUrl, period, kpiLabel, title } → 큐 등록
// GET    /api/match-queue                                                   → pending + done 목록
// PATCH  /api/match-queue  { id, status, result, error }                    → 작업 완료/에러 마킹
// DELETE /api/match-queue  { id } 또는 { id: 'all-done' }                   → 작업 제거

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'b2c-dashboard:match-queue';

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

async function loadQueue() {
  const raw = await kvGet(KEY);
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch (e) { return []; }
  }
  // 어떤 형태로 박혀도 array 보장
  if (Array.isArray(parsed)) return parsed;
  // object일 경우 jobs 키 또는 빈 배열
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.jobs)) return parsed.jobs;
  return [];
}

async function saveQueue(queue) {
  await kvSet(KEY, JSON.stringify(queue));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'KV 환경변수 없음 (Vercel Storage 연결 필요)' });
  }

  try {
    if (req.method === 'GET') {
      const queue = await loadQueue();
      const pending = queue.filter(j => j.status !== 'done' && j.status !== 'error');
      const done = queue.filter(j => j.status === 'done' || j.status === 'error').slice(-20);
      return res.status(200).json({ ok: true, pending, done, totalCount: queue.length });
    }

    if (req.method === 'POST') {
      const { projectId, sheetUrl, period, kpiLabel, title, requestedBy } = req.body || {};
      if (!projectId) return res.status(400).json({ error: 'projectId 필수' });
      const queue = await loadQueue();
      // 동일 projectId pending 중복 제거 (가장 최근만 유지)
      const filtered = queue.filter(j => !(j.projectId === projectId && j.status !== 'done' && j.status !== 'error'));
      const newJob = {
        id: 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        projectId,
        sheetUrl: sheetUrl || '',
        period: period || '',
        kpiLabel: kpiLabel || '이력서 업데이트',
        title: title || projectId,
        requestedBy: requestedBy || 'unknown',
        requestedAt: new Date().toISOString(),
        status: 'pending'
      };
      filtered.push(newJob);
      // 100건 초과면 오래된 done/error 제거
      let final = filtered;
      if (filtered.length > 100) {
        const sorted = filtered.slice().sort((a, b) => (a.requestedAt || '').localeCompare(b.requestedAt || ''));
        const pending = sorted.filter(j => j.status === 'pending');
        const recent = sorted.filter(j => j.status !== 'pending').slice(-50);
        final = [...pending, ...recent];
      }
      await saveQueue(final);
      const pendingCount = final.filter(j => j.status === 'pending').length;
      return res.status(200).json({ ok: true, job: newJob, pendingCount });
    }

    if (req.method === 'PATCH') {
      const { id, status, result, error } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id 필수' });
      const queue = await loadQueue();
      const idx = queue.findIndex(j => j.id === id);
      if (idx < 0) return res.status(404).json({ error: 'job 없음' });
      queue[idx] = {
        ...queue[idx],
        status: status || 'done',
        result: result || queue[idx].result,
        error: error || null,
        completedAt: new Date().toISOString()
      };
      await saveQueue(queue);
      return res.status(200).json({ ok: true, job: queue[idx] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (id === 'all-done') {
        const queue = await loadQueue();
        const newQueue = queue.filter(j => j.status === 'pending');
        await saveQueue(newQueue);
        return res.status(200).json({ ok: true, removed: queue.length - newQueue.length });
      }
      if (!id) return res.status(400).json({ error: 'id 필수' });
      const queue = await loadQueue();
      const newQueue = queue.filter(j => j.id !== id);
      await saveQueue(newQueue);
      return res.status(200).json({ ok: true, removed: queue.length - newQueue.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
