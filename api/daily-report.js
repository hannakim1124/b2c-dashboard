export default async function handler(req, res) {
  try {
    // 1. 구글 시트에서 데브콘 데이터 fetch
    const csvUrl = 'https://docs.google.com/spreadsheets/d/1UgmgZCjEnI_DWxyfaJWLuiDpl91bnSBpfiSc6asz1Vs/gviz/tq?tqx=out:csv&gid=82584708';
    const csvResp = await fetch(csvUrl);
    const csvText = await csvResp.text();

    // CSV 파싱
    const lines = csvText.split('\n').filter(l => l.trim());
    const rows = lines.slice(1);

    // 중복 제거 (전화번호 기준)
    const phoneSet = new Set();
    let total = 0, resumeCount = 0, snsCount = 0;
    const dailyMap = {};
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    let todayN = 0, ydN = 0;

    for (const row of rows) {
      // 간단 CSV 파싱 (따옴표 처리)
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

      // 전화번호 중복 체크
      const phone = (cells[6] || '').replace(/[^0-9]/g, '');
      if (phone && phoneSet.has(phone)) continue;
      if (phone) phoneSet.add(phone);
      total++;

      // 날짜 파싱
      const tsMatch = (cells[0] || '').match(/(\d{4})\. (\d{1,2})\. (\d{1,2})/);
      if (tsMatch) {
        const dt = `${tsMatch[1]}-${tsMatch[2].padStart(2, '0')}-${tsMatch[3].padStart(2, '0')}`;
        dailyMap[dt] = (dailyMap[dt] || 0) + 1;
        if (dt === today) todayN++;
        if (dt === yesterday) ydN++;
      }

      // 이력서 (잡코리아 ID)
      if ((cells[10] || '').trim()) resumeCount++;

      // SNS
      if ((cells[11] || '').match(/http/i)) snsCount++;
    }

    // KPI 계산
    const kpiPct = (total / 1500 * 100).toFixed(1);
    const resumePct = (resumeCount / 150 * 100).toFixed(1);
    const eventDate = new Date('2026-04-23');
    const now = new Date();
    const dDay = Math.ceil((eventDate - now) / 86400000);
    const dDayText = dDay > 0 ? `D-${dDay}` : dDay === 0 ? 'D-Day' : '종료';

    // 4/1 이후 일평균
    const dates = Object.keys(dailyMap).filter(d => d >= '2026-04-01').sort();
    const totalSinceApr = dates.reduce((sum, d) => sum + dailyMap[d], 0);
    const avgDaily = dates.length > 0 ? (totalSinceApr / dates.length).toFixed(1) : '0';

    // 2. 슬랙 메시지 발송
    const message = {
      text: `데브콘 모닝 리포트 ☀️\n\n신청자: ${total.toLocaleString()}명 (KPI ${kpiPct}%) | ${dDayText}\n오늘 +${todayN} / 어제 +${ydN}\n이력서: ${resumeCount}명 (KPI ${resumePct}%${resumeCount >= 150 ? ' 달성!' : ''})\n일평균: ${avgDaily}명 (4/1 이후)\n\n<https://b2c-dashboard-sigma.vercel.app/devcon-dashboard.html|대시보드 바로가기>`
    };

    const webhookUrl = 'https://hooks.slack.com/services/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';
    const slackResp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });

    return res.status(200).json({
      success: true,
      total,
      resumeCount,
      kpiPct,
      dDay: dDayText,
      todayN,
      ydN,
      slackStatus: slackResp.status
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
