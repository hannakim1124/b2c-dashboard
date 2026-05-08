// ✨ 안전한 PULL 전용 sync 클라이언트 (2026-05-08 재구성)
//
// [정책]
// - 매칭 결과 키(b2c_resume_stats_*, b2c_signup_stats_*)만 서버 → 로컬 PULL
// - 그 외 데이터(일정/광고/메트릭/카드 등)는 절대 안 건드림
// - PUSH 완전 비활성화 → 한나 선배님 로컬 작업 절대 덮어쓰기 X
//
// [흐름]
// 1. 클로드가 메타베이스 매칭 후 결과를 /api/sync POST로 KV 저장
// 2. 한나 선배님이 페이지 로드 시 자동 PULL → b2c_resume_stats_* 갱신
// 3. KPI 카드에 매칭 결과(이력서 업데이트, 신규/기존 가입자) 자동 반영
//
// [재활성화/변경 시 주의]
// - PULL_PREFIXES 외 다른 키는 절대 PULL하지 말 것 (데이터 손실 사고 방지)
// - PUSH 활성화 시 옛 데이터 덮어쓰기 위험, 별도 머지 전략 필수

(function() {
  const SYNC_URL = '/api/sync';
  // 서버에서 자동 PULL할 키 prefix만 (클로드 매칭 결과 전용)
  const PULL_PREFIXES = ['b2c_resume_stats_', 'b2c_signup_stats_'];
  const RELOADED_FLAG = '_b2c_pulled_reloaded_v2';

  async function safePull() {
    try {
      const r = await fetch(SYNC_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const { data } = await r.json();
      if (!data) return;

      let applied = 0;
      Object.entries(data).forEach(([k, v]) => {
        if (typeof v !== 'string') return;
        // 서버 우선 키 (매칭 결과)만 PULL
        if (!PULL_PREFIXES.some(p => k.startsWith(p))) return;
        const local = localStorage.getItem(k);
        if (local !== v) {
          localStorage.setItem(k, v);
          applied++;
        }
      });

      if (applied > 0) {
        console.log('[sync] ' + applied + '개 매칭 결과 서버에서 갱신');
        // 1회만 reload (KPI 카드에 즉시 반영)
        if (!sessionStorage.getItem(RELOADED_FLAG)) {
          sessionStorage.setItem(RELOADED_FLAG, '1');
          setTimeout(function() { location.reload(); }, 300);
        }
      }
    } catch (e) {
      // 네트워크 오류 무시 (오프라인 OK)
    }
  }

  // 페이지 로드 시 1회 PULL
  safePull();
  console.log('[sync-client] safe PULL-only mode (resume_stats / signup_stats)');
})();
