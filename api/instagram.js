export default async function handler(req, res) {
  try {
    const username = req.query.u || 'worxtory';
    const resp = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9'
      }
    });

    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Instagram fetch failed' });
    }

    const html = await resp.text();

    // OG description에서 팔로워 수 추출
    // 형태: "팔로워 89명, 팔로잉 0명, 게시물 15개"
    const ogMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i);
    if (!ogMatch) {
      return res.status(404).json({ error: 'OG description not found' });
    }

    // HTML 엔티티 디코딩
    const decoded = ogMatch[1]
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));

    // 숫자 추출
    const followerMatch = decoded.match(/(\d[\d,.]*)\s*명/);
    const followers = followerMatch ? parseInt(followerMatch[1].replace(/[,.]/g, '')) : null;

    // 게시물 수
    const postMatch = decoded.match(/게시물\s*(\d[\d,.]*)/);
    const posts = postMatch ? parseInt(postMatch[1].replace(/[,.]/g, '')) : null;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({
      username,
      followers,
      posts,
      raw: decoded,
      fetchedAt: new Date().toISOString()
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
