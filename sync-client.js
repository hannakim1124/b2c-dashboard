// ⚠️ 자동 동기화 비활성화됨 (2026-05-08, 한나 선배님 결정)
//
// [비활성화 사유]
// - 서버에 옛 데이터가 남아있을 때 페이지 로드 시 PULL → 로컬 새 데이터 덮어쓰기 → 데이터 손실
// - 일정/광고 효율/메트릭 등이 사라지는 사고 발생
// - 한나 선배님은 1대 디바이스로 작업하시므로 동기화 불필요
//
// [원본 백업]
// 이전 버전(PULL/PUSH 자동 동기화)은 git history에서 복원 가능:
//   git log --all -- sync-client.js
//   git show <commit-hash>:sync-client.js
//
// [재활성화 시 주의사항]
// - 반드시 "로컬 우선 머지" 로직 추가할 것 (서버 데이터로 무조건 덮어쓰기 X)
// - timeline 같은 배열 필드는 둘 다 합치는 방식
// - 또는 충돌 시 사용자 confirm

(function() {
  // 의도적으로 빈 IIFE — 자동 동기화 동작 없음
  console.log('[sync-client] disabled (manual save only)');
})();
