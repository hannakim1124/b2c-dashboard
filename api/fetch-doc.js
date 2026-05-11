// 서버에서 구글 docs/sheet/drive 통합 fetch
// POST /api/fetch-doc { url } → { ok, type, text, fetchedAt } | { ok: false, error }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });

    const HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/plain,text/csv,*/*'
    };

    // URL 종류 판별
    const docM = url.match(/docs\.google\.com\/document\/d\/([\w-]+)/);
    const sheetM = url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]+)/);
    const driveM = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);

    if (docM) {
      const docId = docM[1];
      const r = await fetch(`https://docs.google.com/document/d/${docId}/export?format=txt`, { headers: HEADERS });
      if (!r.ok) {
        return res.status(200).json({
          ok: false,
          type: 'doc',
          error: r.status === 401 ? '문서가 비공개. "링크 있는 모두 — 뷰어"로 권한 풀어주세요'
               : r.status === 404 ? '문서를 찾을 수 없음 (URL 확인)'
               : `fetch 실패 (${r.status})`,
          status: r.status
        });
      }
      const text = (await r.text()).replace(/^﻿/, '');
      return res.status(200).json({ ok: true, type: 'doc', docId, text, length: text.length, fetchedAt: new Date().toISOString() });
    }

    if (sheetM) {
      // 시트는 별도 endpoint로 (/api/fetch-sheet가 더 정교)
      return res.status(200).json({ ok: false, error: '시트는 /api/fetch-sheet 사용', type: 'sheet', redirect: '/api/fetch-sheet' });
    }

    if (driveM) {
      const fileId = driveM[1];
      const r = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`, { headers: HEADERS, redirect: 'follow' });
      if (!r.ok) {
        return res.status(200).json({ ok: false, type: 'drive', error: `fetch 실패 (${r.status})`, status: r.status });
      }
      const ct = r.headers.get('content-type') || '';
      // 텍스트 가능한 형식만 본문 반환 (xlsx/pdf 등은 type만 알림)
      if (ct.includes('text') || ct.includes('csv') || ct.includes('plain')) {
        const text = await r.text();
        return res.status(200).json({ ok: true, type: 'drive-text', fileId, text, length: text.length, fetchedAt: new Date().toISOString() });
      }
      const cd = r.headers.get('content-disposition') || '';
      return res.status(200).json({
        ok: true,
        type: 'drive-binary',
        fileId,
        contentType: ct,
        contentDisposition: cd,
        note: 'binary 파일 (xlsx/pdf/이미지). 텍스트 추출 안 됨 — 슬랙으로 첨부 필요',
        fetchedAt: new Date().toISOString()
      });
    }

    return res.status(400).json({ ok: false, error: '지원 URL이 아님 (docs.google.com/document, drive.google.com/file 만 지원)' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
