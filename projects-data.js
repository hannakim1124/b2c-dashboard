// ════════════════════════════════════════════════════════════
//  Projects data — single source of truth
//  index.html (피드) + project-detail.html (상세) 둘 다 사용
// ════════════════════════════════════════════════════════════
window.MEMBERS = {};
// LocalStorage에 저장된 사용자 추가 멤버 자동 복원
(function loadSavedMembers(){
  try {
    const saved = JSON.parse(localStorage.getItem('b2c_members') || '[]');
    saved.forEach(m => { window.MEMBERS[m.id] = m; });
  } catch(e) {}
})();
window.PROJECTS = {};

// ── 사용자 정의 카테고리 ──
window.getCategories = function() {
  try { return JSON.parse(localStorage.getItem('b2c_categories') || '[]'); }
  catch (e) { return []; }
};
window.addCategory = function(name) {
  const n = String(name || '').trim();
  if (!n) return false;
  const list = window.getCategories();
  if (list.includes(n)) return false;
  list.push(n);
  localStorage.setItem('b2c_categories', JSON.stringify(list));
  return true;
};
window.removeCategory = function(name) {
  const list = window.getCategories().filter(c => c !== name);
  localStorage.setItem('b2c_categories', JSON.stringify(list));
};

// ── 사용자 정의 KPI 라벨 ──
window.getKpiLabels = function() {
  try { return JSON.parse(localStorage.getItem('b2c_kpi_labels') || '[]'); }
  catch (e) { return []; }
};
window.addKpiLabel = function(name) {
  const n = String(name || '').trim();
  if (!n) return false;
  const list = window.getKpiLabels();
  if (list.includes(n)) return false;
  list.push(n);
  localStorage.setItem('b2c_kpi_labels', JSON.stringify(list));
  return true;
};
window.renameKpiLabel = function(oldName, newName) {
  const list = window.getKpiLabels();
  const idx = list.indexOf(oldName);
  if (idx < 0) return false;
  if (list.includes(newName)) return false;
  list[idx] = newName;
  localStorage.setItem('b2c_kpi_labels', JSON.stringify(list));
  return true;
};
window.removeKpiLabel = function(name) {
  const list = window.getKpiLabels().filter(x => x !== name);
  localStorage.setItem('b2c_kpi_labels', JSON.stringify(list));
};



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

// ─── 휴지통 (사용자 카드 전용) ───
window.getTrash = function() {
  try { return JSON.parse(localStorage.getItem('b2c_user_trash') || '[]'); }
  catch (e) { return []; }
};
window.trashUserProject = function(id) {
  const list = window.getUserProjects();
  const target = list.find(p => p.id === id);
  if (!target) return false;
  const trash = window.getTrash();
  trash.unshift({ ...target, _deletedAt: new Date().toISOString() });
  localStorage.setItem('b2c_user_trash', JSON.stringify(trash));
  window.deleteUserProject(id);
  return true;
};
window.restoreFromTrash = function(id) {
  const trash = window.getTrash();
  const idx = trash.findIndex(p => p.id === id);
  if (idx < 0) return false;
  const item = { ...trash[idx] };
  delete item._deletedAt;
  trash.splice(idx, 1);
  localStorage.setItem('b2c_user_trash', JSON.stringify(trash));
  const list = window.getUserProjects();
  list.unshift(item);
  localStorage.setItem('b2c_user_projects', JSON.stringify(list));
  return true;
};
window.purgeFromTrash = function(id) {
  const trash = window.getTrash().filter(p => p.id !== id);
  localStorage.setItem('b2c_user_trash', JSON.stringify(trash));
};
window.emptyTrash = function() {
  localStorage.removeItem('b2c_user_trash');
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
    window.trashUserProject(id);
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
  localStorage.removeItem('b2c_user_trash');
  localStorage.removeItem('b2c_overrides');
  localStorage.removeItem('b2c_deleted');
  localStorage.removeItem('b2c_members');
  localStorage.removeItem('b2c_categories');
  localStorage.removeItem('b2c_kpi_labels');
  window.MEMBERS = {};
};
