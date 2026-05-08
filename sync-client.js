// ✨ 안전한 PULL 전용 sync 클라이언트 (2026-05-08 재구성)
//
// [정책]
// - PULL_PREFIXES (resume_stats/signup_stats): 항상 서버 우선 — read-only 매칭 결과
// - PULL_IF_EMPTY (user_projects/overrides/categories/kpi_labels):
//     로컬 비어있을 때만 1회 복원. 한나님이 1개라도 만들어두면 절대 덮어쓰지 않음.
// - 그 외 키(일정/광고/메트릭 등)는 절대 안 건드림
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
  // 항상 서버 우선 (read-only 매칭 결과)
  const PULL_PREFIXES = ['b2c_resume_stats_', 'b2c_signup_stats_'];
  // 로컬 비어있거나 빈 배열일 때만 1회 복원 (한나님 카드 데이터 — 절대 덮어쓰기 X)
  const PULL_IF_EMPTY = ['b2c_user_projects', 'b2c_overrides', 'b2c_categories', 'b2c_kpi_labels'];
  const RELOADED_FLAG = '_b2c_pulled_reloaded_v2';

  function isLocallyEmpty(key) {
    const v = localStorage.getItem(key);
    if (v == null) return true;
    if (v === '' || v === '[]' || v === '{}' || v === 'null') return true;
    return false;
  }

  async function safePull() {
    try {
      const r = await fetch(SYNC_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const { data } = await r.json();
      if (!data) return;

      let applied = 0;
      let emptyRestored = 0;
      Object.entries(data).forEach(([k, v]) => {
        if (typeof v !== 'string') return;
        // 1) 항상 서버 우선 (매칭 결과)
        if (PULL_PREFIXES.some(p => k.startsWith(p))) {
          const local = localStorage.getItem(k);
          if (local !== v) { localStorage.setItem(k, v); applied++; }
          return;
        }
        // 2) 로컬 비어있을 때만 1회 복원 (카드 데이터 등)
        if (PULL_IF_EMPTY.includes(k) && isLocallyEmpty(k)) {
          localStorage.setItem(k, v);
          applied++;
          emptyRestored++;
          return;
        }
      });

      if (applied > 0) {
        console.log('[sync] ' + applied + '개 갱신 (empty 복원 ' + emptyRestored + ')');
        // emptyRestored가 발생하면 무조건 reload (비어있을 때만 PULL이라 무한루프 위험 없음)
        // PULL_PREFIXES만 적용된 경우 sessionStorage flag로 1회 제한
        if (emptyRestored > 0 || !sessionStorage.getItem(RELOADED_FLAG)) {
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
