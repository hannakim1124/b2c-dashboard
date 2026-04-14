export default async function handler(req, res) {
  const NOTION_KEY = process.env.NOTION_API_KEY;
  const PAGE_ID = 'c8c7d8322b048205949701cca47a0550';

  if (!NOTION_KEY) {
    return res.status(500).json({ error: 'NOTION_API_KEY not set' });
  }

  try {
    // 페이지의 블록(자식) 가져오기
    const resp = await fetch(`https://api.notion.com/v1/blocks/${PAGE_ID}/children?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Notion API error', status: resp.status });
    }

    const data = await resp.json();

    // 테이블 블록 찾기
    let tableBlockId = null;
    for (const block of data.results) {
      if (block.type === 'table') {
        tableBlockId = block.id;
        break;
      }
      // toggle 안에 테이블이 있을 수 있음
      if (block.type === 'toggle' || block.type === 'heading_1') {
        if (block.has_children) {
          const childResp = await fetch(`https://api.notion.com/v1/blocks/${block.id}/children?page_size=100`, {
            headers: {
              'Authorization': `Bearer ${NOTION_KEY}`,
              'Notion-Version': '2022-06-28'
            }
          });
          if (childResp.ok) {
            const childData = await childResp.json();
            for (const child of childData.results) {
              if (child.type === 'table') {
                tableBlockId = child.id;
                break;
              }
            }
          }
          if (tableBlockId) break;
        }
      }
    }

    if (!tableBlockId) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // 테이블 행 가져오기
    const rowsResp = await fetch(`https://api.notion.com/v1/blocks/${tableBlockId}/children?page_size=100`, {
      headers: {
        'Authorization': `Bearer ${NOTION_KEY}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!rowsResp.ok) {
      return res.status(rowsResp.status).json({ error: 'Failed to fetch table rows' });
    }

    const rowsData = await rowsResp.json();
    const rows = rowsData.results.filter(r => r.type === 'table_row');

    // 첫 번째 데이터 행(헤더 다음)에서 총 참석자 수 추출
    // 헤더: 날짜, 총 참석자 수, 개발자, PM/PO/기획, 디자인, 마케팅, 변동요인
    let latest = null;
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].table_row.cells;
      if (cells.length >= 2) {
        const dateText = cells[0].map(t => t.plain_text).join('').trim();
        const totalText = cells[1].map(t => t.plain_text).join('').trim();
        const totalNum = parseInt(totalText.replace(/[^0-9]/g, ''));
        if (totalNum > 0) {
          latest = {
            date: dateText,
            total: totalNum,
            dev: cells[2] ? parseInt(cells[2].map(t => t.plain_text).join('').replace(/[^0-9]/g, '')) || 0 : 0,
            pmpo: cells[3] ? parseInt(cells[3].map(t => t.plain_text).join('').replace(/[^0-9]/g, '')) || 0 : 0,
            design: cells[4] ? parseInt(cells[4].map(t => t.plain_text).join('').replace(/[^0-9]/g, '')) || 0 : 0,
            marketing: cells[5] ? parseInt(cells[5].map(t => t.plain_text).join('').replace(/[^0-9]/g, '')) || 0 : 0
          };
          break; // 첫 번째 유효 행이 최신
        }
      }
    }

    if (!latest) {
      return res.status(404).json({ error: 'No participant data found' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(latest);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
