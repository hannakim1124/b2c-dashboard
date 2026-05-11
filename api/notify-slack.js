// Slack 알림 프록시 — webhook URL을 서버 env var로 격리
// POST /api/notify-slack { text, channel? }
// → 200 { ok: true } | 500 { error }
//
// 환경변수:
//   SLACK_WEBHOOK_DDANNA — 딴나집사 봇 webhook URL (기본)
//   SLACK_WEBHOOK_{NAME} — 채널별 webhook 추가 시 사용

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { text, channel } = req.body || {};
    if (!text) return res.status(400).json({ error: 'text required' });

    // 채널별 webhook 선택 (확장 가능)
    const envKey = channel ? `SLACK_WEBHOOK_${channel.toUpperCase()}` : 'SLACK_WEBHOOK_DDANNA';
    const webhook = process.env[envKey] || process.env.SLACK_WEBHOOK_DDANNA;
    if (!webhook) {
      return res.status(500).json({
        ok: false,
        error: `${envKey} 환경변수 없음. vercel Dashboard → Settings → Environment Variables 추가`
      });
    }
    // 디버그 모드 (?debug=1)
    if (req.query?.debug === '1' || (req.body && req.body.debug)) {
      return res.status(200).json({
        ok: true,
        webhookPrefix: webhook.substring(0, 50),
        webhookLength: webhook.length,
        envKey
      });
    }

    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const responseBody = await r.text();
    // 슬랙 webhook 표준: 성공 = body "ok", 실패 = "no_service" / "invalid_payload" 등
    const slackOk = responseBody === 'ok';
    return res.status(200).json({
      ok: slackOk,
      httpStatus: r.status,
      slackResponse: responseBody,
      delivered: slackOk
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
}
