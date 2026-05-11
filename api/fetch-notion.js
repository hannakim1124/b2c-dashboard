// Notion 페이지 fetch — 페이지 본문 + 내부 docs/sheet/forms URL 자동 추출
// POST /api/fetch-notion { url }
// → { ok, title, text, links: [{type, url, label}], childDatabases: [...] }
//
// 환경변수: NOTION_TOKEN (Notion Integration Internal Token)
//   1. notion.so/profile/integrations → 새 Integration → Internal Integration Secret 복사
//   2. vercel Dashboard → Settings → Environment Variables → NOTION_TOKEN 추가
//   3. 노션 페이지 우상단 ⋯ → Connect to → 이 Integration 연결

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

function extractPageId(url) {
  // 마지막 hyphen 뒤 32자 hex 또는 슬래시 뒤 32자
  const m = url.match(/([0-9a-f]{32})/i) || url.match(/-([0-9a-f]{32})/i);
  if (!m) return null;
  const raw = m[1];
  // 4-4-4-12 형식으로 변환 (Notion API 권장)
  return `${raw.slice(0,8)}-${raw.slice(8,12)}-${raw.slice(12,16)}-${raw.slice(16,20)}-${raw.slice(20)}`;
}

async function notionFetch(path, token) {
  const r = await fetch(`${NOTION_API}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    }
  });
  return { ok: r.ok, status: r.status, body: await r.json() };
}

function richTextToPlain(rt) {
  if (!Array.isArray(rt)) return '';
  return rt.map(t => t.plain_text || '').join('');
}

function extractUrls(text) {
  const urls = [];
  const patterns = [
    { type: 'docs', re: /https:\/\/docs\.google\.com\/document\/d\/[\w-]+[^\s)]*/g },
    { type: 'sheet', re: /https:\/\/docs\.google\.com\/spreadsheets\/d\/[\w-]+[^\s)]*/g },
    { type: 'form', re: /https:\/\/(?:forms\.gle\/[\w-]+|docs\.google\.com\/forms\/d\/[\w-]+[^\s)]*)/g },
    { type: 'drive', re: /https:\/\/drive\.google\.com\/(?:file\/d\/[\w-]+|drive\/folders\/[\w-]+)[^\s)]*/g }
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(text)) !== null) {
      urls.push({ type: p.type, url: m[0] });
    }
  }
  return urls;
}

async function readBlocks(pageId, token, depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return { text: '', links: [], childDatabases: [] };
  const r = await notionFetch(`/blocks/${pageId}/children?page_size=100`, token);
  if (!r.ok) return { text: '', links: [], childDatabases: [], error: r.body };

  let text = '';
  const links = [];
  const childDatabases = [];

  for (const block of (r.body.results || [])) {
    const type = block.type;
    const data = block[type];
    if (!data) continue;

    // 텍스트 블록
    if (data.rich_text) {
      const plain = richTextToPlain(data.rich_text);
      if (plain) text += plain + '\n';
      // rich_text 안의 href도 추출
      data.rich_text.forEach(rt => {
        if (rt.href) {
          const u = rt.href;
          if (/docs\.google\.com|forms\.gle|drive\.google\.com/.test(u)) {
            links.push({ type: u.includes('document') ? 'docs' : u.includes('spreadsheets') ? 'sheet' : u.includes('forms') ? 'form' : 'drive', url: u, label: rt.plain_text });
          }
        }
      });
    }
    // bookmark / embed / link_preview
    if (type === 'bookmark' || type === 'embed' || type === 'link_preview') {
      const u = data.url || '';
      if (u) {
        const matched = extractUrls(u);
        if (matched.length) links.push(...matched.map(m => ({ ...m, blockType: type })));
        else if (/docs\.google|forms\.gle|drive\.google/.test(u)) {
          links.push({ type: 'other', url: u, blockType: type });
        }
      }
    }
    // child_database (inline DB)
    if (type === 'child_database') {
      childDatabases.push({ id: block.id, title: data.title || '(제목 없음)' });
    }
    // 하위 블록 재귀
    if (block.has_children && type !== 'child_database') {
      const child = await readBlocks(block.id, token, depth + 1, maxDepth);
      if (child.text) text += child.text;
      if (child.links) links.push(...child.links);
      if (child.childDatabases) childDatabases.push(...child.childDatabases);
    }
  }

  // 본문 텍스트에서도 URL 패턴 추출
  links.push(...extractUrls(text));

  return { text, links, childDatabases };
}

async function queryDatabase(dbId, token) {
  const r = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ page_size: 50 })
  });
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results || []).map(page => {
    const title = Object.values(page.properties || {}).find(p => p.type === 'title')?.title?.map(t => t.plain_text).join('') || '(제목 없음)';
    const urlProp = Object.values(page.properties || {}).find(p => p.type === 'url')?.url || null;
    return { id: page.id, title, url: page.url, externalUrl: urlProp };
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({
      ok: false,
      error: 'NOTION_TOKEN 환경변수 없음. vercel Dashboard → Settings → Environment Variables → NOTION_TOKEN 추가하세요',
      setupGuide: 'https://www.notion.so/profile/integrations'
    });
  }

  try {
    const { url } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });

    const pageId = extractPageId(url);
    if (!pageId) return res.status(400).json({ ok: false, error: '노션 URL에서 페이지 ID 못 찾음' });

    // 1) 페이지 메타 (제목)
    const pageRes = await notionFetch(`/pages/${pageId}`, token);
    if (!pageRes.ok) {
      const msg = pageRes.status === 401 ? 'Notion 토큰 인증 실패'
                : pageRes.status === 404 ? '페이지를 찾을 수 없거나 Integration에 권한 없음. 노션 페이지 우상단 ⋯ → Connect to → Integration 연결'
                : `Notion API 에러 (${pageRes.status})`;
      return res.status(200).json({ ok: false, error: msg, status: pageRes.status, detail: pageRes.body });
    }
    const titleProp = Object.values(pageRes.body.properties || {}).find(p => p.type === 'title');
    const title = titleProp?.title?.map(t => t.plain_text).join('') || '(제목 없음)';

    // 2) 블록 traverse (텍스트 + URL + child DB)
    const { text, links, childDatabases } = await readBlocks(pageId, token);

    // 3) child DB 안의 페이지들도 lookup (외부 URL 속성 추출)
    const dbContents = [];
    for (const db of childDatabases.slice(0, 5)) {
      const entries = await queryDatabase(db.id, token);
      dbContents.push({ db: db.title, entries });
      // entries 안의 외부 URL도 links에 추가
      entries.forEach(e => {
        if (e.externalUrl) {
          const matched = extractUrls(e.externalUrl);
          if (matched.length) links.push(...matched.map(m => ({ ...m, source: db.title, label: e.title })));
        }
      });
    }

    // 중복 제거
    const seen = new Set();
    const uniqueLinks = links.filter(l => {
      if (seen.has(l.url)) return false;
      seen.add(l.url);
      return true;
    });

    return res.status(200).json({
      ok: true,
      title,
      pageId,
      text,
      links: uniqueLinks,
      childDatabases,
      dbContents,
      fetchedAt: new Date().toISOString()
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
