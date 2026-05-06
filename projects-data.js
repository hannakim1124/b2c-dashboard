// ════════════════════════════════════════════════════════════
//  Projects data — single source of truth
//  index-v2.html (피드) + project-detail.html (상세) 둘 다 사용
// ════════════════════════════════════════════════════════════
window.MEMBERS = {
  hanna:   { name: '한나',     role: '기획 · 이벤트 PM',    avatar: '한', cls: 'hanna'   },
  minji:   { name: '김민지',   role: '자동화 · 콘텐츠',     avatar: '민', cls: 'minji'   },
  jihoon:  { name: '박지훈',   role: '웨비나 · 외부 협업',  avatar: '박', cls: 'jihoon'  },
  suyoung: { name: '이수영',   role: 'SNS · 영상 콘텐츠',   avatar: '수', cls: 'suyoung' },
  taeho:   { name: '최태호',   role: '광고 · 퍼포먼스',     avatar: '태', cls: 'taeho'   },
};
window.PROJECTS = {};



// ── localStorage 키 ──
//  b2c_user_projects : 새로 추가한 카드 (배열)
//  b2c_overrides     : 데모 카드를 수정한 덮어쓰기 (객체 {id: project})
//  b2c_deleted       : 데모 카드 중 숨긴 ID 목록 (배열)

window.getOverrides = function() {
  try { return JSON.parse(localStorage.getItem('b2c_overrides') || '{}'); }
  catch (e) { return {}; }
};
window.saveOverride = function(id, p) {
  const o = window.getOverrides(); o[id] = p;
  localStorage.setItem('b2c_overrides', JSON.stringify(o));
};
window.removeOverride = function(id) {
  const o = window.getOverrides(); delete o[id];
  localStorage.setItem('b2c_overrides', JSON.stringify(o));
};

window.getDeletedIds = function() {
  try { return JSON.parse(localStorage.getItem('b2c_deleted') || '[]'); }
  catch (e) { return []; }
};
window.markDeleted = function(id) {
  const d = window.getDeletedIds();
  if (!d.includes(id)) { d.push(id); localStorage.setItem('b2c_deleted', JSON.stringify(d)); }
};

window.getUserProjects = function() {
  try { return JSON.parse(localStorage.getItem('b2c_user_projects') || '[]'); }
  catch (e) { return []; }
};
window.saveUserProject = function(p) {
  const list = window.getUserProjects(); list.unshift(p);
  localStorage.setItem('b2c_user_projects', JSON.stringify(list));
};
window.updateUserProject = function(id, patch) {
  const list = window.getUserProjects();
  const i = list.findIndex(p => p.id === id);
  if (i >= 0) { list[i] = { ...list[i], ...patch, id }; localStorage.setItem('b2c_user_projects', JSON.stringify(list)); }
};
window.deleteUserProject = function(id) {
  const list = window.getUserProjects().filter(p => p.id !== id);
  localStorage.setItem('b2c_user_projects', JSON.stringify(list));
};

window.getProject = function(id) {
  // 1) override 우선
  const o = window.getOverrides();
  if (o[id]) return o[id];
  // 2) 데모 카드 (단, 숨김 처리되지 않은 것)
  if (window.PROJECTS[id] && !window.getDeletedIds().includes(id)) return window.PROJECTS[id];
  // 3) 사용자가 새로 추가한 카드
  const list = window.getUserProjects();
  return list.find(p => p.id === id) || null;
};

window.isUserProject = function(id) {
  return window.getUserProjects().some(p => p.id === id);
};
window.isDemoProject = function(id) {
  return !!window.PROJECTS[id];
};

// 편집/저장 통합 함수: 데모면 override, 사용자건이면 user 업데이트
window.upsertProject = function(p) {
  if (window.isUserProject(p.id)) {
    window.updateUserProject(p.id, p);
  } else if (window.isDemoProject(p.id)) {
    window.saveOverride(p.id, p);
  } else {
    window.saveUserProject(p);
  }
};

window.deleteProject = function(id) {
  if (window.isUserProject(id)) {
    window.deleteUserProject(id);
    window.removeOverride(id);
  } else if (window.isDemoProject(id)) {
    window.markDeleted(id);
    window.removeOverride(id);
  }
};

window.restoreProject = function(id) {
  if (window.isDemoProject(id)) {
    const deleted = window.getDeletedIds();
    const idx = deleted.indexOf(id);
    if (idx > -1) {
      deleted.splice(idx, 1);
      localStorage.setItem('b2c_deleted', JSON.stringify(deleted));
    }
  }
};

window.purgeProject = function(id) {
  if (window.isUserProject(id)) {
    window.deleteUserProject(id);
    window.removeOverride(id);
  }
};

window.resetAll = function() {
  localStorage.removeItem('b2c_user_projects');
  localStorage.removeItem('b2c_overrides');
  localStorage.removeItem('b2c_deleted');
};
