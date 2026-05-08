// 디바이스 간 자동 동기화 클라이언트
// - 페이지 로드 시 서버 데이터 pull (서버가 더 최신이면 1회 reload)
// - localStorage b2c_* / cc_* 변경 감지 → debounced push (1.5초 후)

(function() {
  const SYNC_URL = '/api/sync';
  const SYNCED_AT_KEY = '_b2c_synced_at';
  const SYNCED_RELOADED_FLAG = '_b2c_synced_reloaded';
  const PREFIXES = ['b2c_', 'cc_'];

  function isSyncableKey(k) {
    return PREFIXES.some(p => (k || '').startsWith(p));
  }

  // ── PULL: 서버 → 로컬 ──
  async function syncPull() {
    try {
      const r = await fetch(SYNC_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;
      const { data, updatedAt } = await r.json();
      if (!data || !updatedAt) return;

      const localUpdated = localStorage.getItem(SYNCED_AT_KEY) || '';
      if (updatedAt <= localUpdated) return; // 로컬이 더 최신 또는 같음

      // 서버 데이터 적용
      let applied = 0;
      Object.entries(data).forEach(([k, v]) => {
        if (k.startsWith('_')) return; // 메타 키 스킵
        if (!isSyncableKey(k)) return;
        if (typeof v === 'string') {
          // _origSetItem 사용 (push 트리거 방지)
          if (window._origSetItem) window._origSetItem.call(localStorage, k, v);
          else localStorage.setItem(k, v);
          applied++;
        }
      });
      if (applied > 0) {
        if (window._origSetItem) window._origSetItem.call(localStorage, SYNCED_AT_KEY, updatedAt);
        else localStorage.setItem(SYNCED_AT_KEY, updatedAt);
        // UI 반영 위해 1회 reload
        if (!sessionStorage.getItem(SYNCED_RELOADED_FLAG)) {
          sessionStorage.setItem(SYNCED_RELOADED_FLAG, '1');
          console.log(`[sync] ${applied}개 키 서버에서 동기화 → reload`);
          location.reload();
        } else {
          console.log(`[sync] ${applied}개 키 서버에서 동기화 (이미 reload함)`);
        }
      }
    } catch (e) {
      // 네트워크 오류는 무시 (오프라인 OK)
    }
  }

  // ── PUSH: 로컬 → 서버 (debounced) ──
  let pushTimer = null;
  function syncPush() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async () => {
      const data = {};
      Object.keys(localStorage).forEach(k => {
        if (isSyncableKey(k)) data[k] = localStorage.getItem(k);
      });
      try {
        const r = await fetch(SYNC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, updatedBy: navigator.userAgent.slice(0, 60) })
        });
        if (r.ok) {
          const { updatedAt } = await r.json();
          if (updatedAt) {
            if (window._origSetItem) window._origSetItem.call(localStorage, SYNCED_AT_KEY, updatedAt);
            else localStorage.setItem(SYNCED_AT_KEY, updatedAt);
          }
        }
      } catch (e) {}
    }, 1500);
  }

  // ── localStorage setItem/removeItem 가로채기 ──
  window._origSetItem = localStorage.setItem.bind(localStorage);
  window._origRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.setItem = function(k, v) {
    window._origSetItem(k, v);
    if (isSyncableKey(k)) syncPush();
  };
  localStorage.removeItem = function(k) {
    window._origRemoveItem(k);
    if (isSyncableKey(k)) syncPush();
  };

  // 페이지 로드 직후 pull
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncPull);
  } else {
    syncPull();
  }

  // 외부 노출 (수동 호출용)
  window.syncPull = syncPull;
  window.syncPush = syncPush;
})();
