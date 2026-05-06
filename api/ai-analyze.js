export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'API key not set' });

  const { question } = req.body || {};
  if (!question) return res.status(400).json({ error: 'question required' });

  const systemPrompt = `너는 인사이트전략팀 B2C 대시보드의 데이터 분석 AI야. 아래 데이터를 기반으로 질문에 답변해.
답변은 짧고 핵심적으로, 숫자 근거를 포함해서 해줘. 한국어로 답변해.

## 2025년 이벤트 데이터

### 커리어데이 (퇴근 후 밋업) - 2025.10.28~30
- 총 예산(품의): 20,383,000원 / 실 집행: 16,413,647원
- 광고비: 4,998,687원 (META 300만 + 카카오 100만 + 링크드인 100만)
- 신청자: 1,688명 (개발 560 + PMPO 650 + 디자인 478)
- 참석자: 257명 (개발 85 + PMPO 84 + 디자인 88)
- 이력서 업데이트: 117명 (DB 검증, 숫자형 ID 기준)
- 만족도: 개발 92% / PMPO 78% / 디자인 83% / 평균 84%
- 오카방 유입: 141명
- 신청 단가: 9,724원 (실 집행/신청자)
- 광고 신청 단가: 2,961원 (광고비/신청자)
- 연차: 3~5년차 537 > 1~2년차 397 > 6~9년차 295 > 10년↑ 233 > 0년차 226
- 직무: PM/PO 378 > UI/UX디자이너 327 > 백엔드 296 > 프론트 161
- 유입: 잡코리아 442 > SNS광고 421 > 지인 368 > 커뮤니티 204 > 링크드인 200

### 흐레카 (HReka Conference) - 2025.11.12 [B2B]
- 총 예산(품의): 28,440,000원 / 실 집행: 19,434,768원 (68%)
- 광고비: 1,130,362원
- 신청자: 470명 (최초) → 2차 228명
- 참석자: 178명 (참석률 37.9%)
- 만족도: 전반적 4.14/5, 강연 4.24/5, 진행 3.45/5, 종합 3.94/5
- 신청 단가: 41,351원 (실 집행/신청자)

### 퇴근 후 이력서 - 2025.12.16~18
- 총 예산(품의): 13,750,000원 / 실 집행: 미정산
- 신청자: 702명
- 이력서 업데이트: 586명 (KPI 1,000건, 달성률 58.6%)
- 골든티켓 참석자: 72명

## 2026년 이벤트 데이터

### 커리어 컨퍼런스 - 2026.03.26
- 실 집행: 9,695,588원
- 광고비: 4,905,722원
- 신청자: 1,566명 / 참석자: 562명
- 이력서 업데이트: 110명 (DB 검증)
- 만족도: 4.33/5
- 신청 단가: 6,192원

### 데브콘 (DEVCON) - 2026.04.23 [진행중]
- 품의: 6,000,000원
- 신청자: 1,419명 / 이력서: 286명
- KPI 달성률: 94.6%

## Work Fest 2026 (5월 예정)
- 목표: 이력서 업데이트 1,000건
- 예산: 약 1,400만원 (미확정)
- 기간: 5/1~5/28`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    });
    const data = await resp.json();
    if (data.error) return res.status(500).json({ error: data.error.message });
    return res.status(200).json({ answer: data.content[0].text });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
