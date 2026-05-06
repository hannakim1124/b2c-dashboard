export default async function handler(req, res) {
  try {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/1UgmgZCjEnI_DWxyfaJWLuiDpl91bnSBpfiSc6asz1Vs/gviz/tq?tqx=out:csv&gid=82584708';
    const csvResp = await fetch(csvUrl);
    if (!csvResp.ok) throw new Error('Google Sheet fetch failed: ' + csvResp.status);
    const csvText = await csvResp.text();
    const lines = csvText.split('\n').filter(l => l.trim());
    const rows = lines.slice(1);

    function parseRow(row) {
      const cells = [];
      let current = '', inQuote = false;
      for (let i = 0; i < row.length; i++) {
        if (inQuote) {
          if (row[i] === '"' && row[i + 1] === '"') { current += '"'; i++; }
          else if (row[i] === '"') { inQuote = false; }
          else { current += row[i]; }
        } else {
          if (row[i] === '"') { inQuote = true; }
          else if (row[i] === ',') { cells.push(current.trim()); current = ''; }
          else { current += row[i]; }
        }
      }
      cells.push(current.trim());
      return cells;
    }

    const parsed = rows.map(parseRow);

    // 날짜 있는 유효 응답만
    const valid = parsed.filter(r => r[0] && /\d{4}\.\s*\d{1,2}\.\s*\d{1,2}/.test(r[0]));
    const total = valid.length;

    // 유니크 (번호 기준)
    const phoneSet = new Set();
    valid.forEach(r => {
      const phone = (r[6] || '').replace(/[^0-9]/g, '');
      if (phone && phone.length >= 10) phoneSet.add(phone);
    });
    const uniqueTotal = phoneSet.size;

    // 날짜별
    const dailyMap = {};
    const now = new Date();
    const todayKey = String(now.getMonth() + 1).padStart(2, '0') + '/' + String(now.getDate()).padStart(2, '0');
    const yd = new Date(now); yd.setDate(yd.getDate() - 1);
    const ydKey = String(yd.getMonth() + 1).padStart(2, '0') + '/' + String(yd.getDate()).padStart(2, '0');
    let todayN = 0, ydN = 0;

    valid.forEach(r => {
      const m = r[0].match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
      if (m) {
        const key = m[2].padStart(2, '0') + '/' + m[3].padStart(2, '0');
        dailyMap[key] = (dailyMap[key] || 0) + 1;
        if (key === todayKey) todayN++;
        if (key === ydKey) ydN++;
      }
    });

    // 이력서 / SNS
    const resume = valid.filter(r => r[10] && r[10].trim()).length;
    // 유효 ID(4자 이상 + 영숫자 포함, 한글만/단어 아님) 중복 제거
    function isValidId(x) { x = (x||'').trim(); if (x.length < 4) return false; if (/^[가-힣\s]+$/.test(x)) return false; if (!/[a-zA-Z0-9]/.test(x)) return false; return true; }
    const resumeIdSet = new Set();
    valid.forEach(r => { const v = (r[10]||'').trim(); if (isValidId(v)) resumeIdSet.add(v.toLowerCase()); });
    const resumeVerified = resumeIdSet.size;
    const sns = valid.filter(r => r[11] && /https?:\/\//i.test((r[11] || '').trim())).length;

    // 이벤트 참여
    let eventPart = 0, confOnly = 0;
    valid.forEach(r => {
      if ((r[1] || '').includes('이벤트도 참여')) eventPart++; else confOnly++;
    });

    // 유입경로 (광고 합산)
    const chMap = {};
    valid.forEach(r => {
      let ch = (r[8] || '').trim();
      if (ch.includes('광고')) ch = '광고(SNS)';
      if (ch) chMap[ch] = (chMap[ch] || 0) + 1;
    });
    const srcTop = Object.entries(chMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // 연차
    const yearBuckets = { '0년차\n(대학생/취준)': 0, '1~3년차': 0, '4~6년차': 0, '7~9년차': 0, '10년차 이상': 0 };
    const yearRules = [
      [/대학|취준|0년|학생/i, '0년차\n(대학생/취준)'],
      [/1.?3년|1년|2년|3년/i, '1~3년차'],
      [/4.?6년|4년|5년|6년/i, '4~6년차'],
      [/7.?9년|7년|8년|9년/i, '7~9년차'],
      [/10년|11년|12년|15년|20년|이상/i, '10년차 이상']
    ];
    valid.forEach(r => {
      const yr = (r[4] || '').trim();
      for (const [re, key] of yearRules) { if (re.test(yr)) { yearBuckets[key]++; break; } }
    });

    // 직무
    const jobMap = {};
    valid.forEach(r => { const job = (r[5] || '').trim(); if (job) jobMap[job] = (jobMap[job] || 0) + 1; });
    const jobSorted = Object.entries(jobMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    const pad = n => String(n).padStart(2, '0');
    const updateTime = (now.getMonth() + 1) + '/' + now.getDate() + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({
      total, uniqueTotal, todayN, ydN, resume, resumeVerified, sns,
      eventPart, confOnly, updateTime,
      dailyMap, srcTop,
      yearLabels: Object.keys(yearBuckets),
      yearData: Object.values(yearBuckets),
      jobSorted, isLive: true
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
