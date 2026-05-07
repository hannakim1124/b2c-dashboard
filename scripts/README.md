# 대시보드 데이터 갱신 스크립트

## 이력서 업데이트 카운트 갱신 (워크페스트 등 이벤트 진행 중 사용)

**갱신 흐름**:
1. 신청자 시트(구글 폼 응답)에 잡코리아 ID 컬럼이 있어야 함
2. 클로드에게 `/개발자 워크페스트 이력서 매칭 갱신해줘` 요청
3. 클로드가 시트 fetch → ID 분류(평문 SHA256 / 소셜 mem_sys_no) → 메타베이스 쿼리 → `data/resume-stats-{projectId}.json` 갱신

## 캐시 파일 형식

`data/resume-stats-{projectId}.json`
```json
{
  "projectId": "user-XXXX",
  "projectName": "이벤트명",
  "period": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "lastUpdated": "YYYY-MM-DD",
  "totalIds": 0,        // 시트에 제출된 잡코리아 ID 개수 (유니크)
  "matched": 0,         // DB에 매칭된 회원 수
  "resumeUpdated": 0,   // 기간 내 r_edit_dt 기준 이력서 수정자 수
  "byType": { "social": 0, "plain": 0, "email": 0 }
}
```

## ID 매칭 로직 (`reference_member_id_hash.md` 참조)
- 평문 (`abc123`): `substr(to_hex(sha256(to_utf8(lower(id)))), 1, 16)` → `m_id` 매칭
- 소셜 (`NV_12345`): 밑줄 뒤 숫자 = `mem_sys_no` 직접 매칭
- 이메일: 평문과 동일하게 SHA256 (매칭률 ~50%)

## 메타베이스 쿼리 패턴
```sql
WITH ids AS (
  SELECT m_id FROM (VALUES ('hash1'), ('hash2'), ...) AS t(m_id)
), social AS (
  SELECT mem_sys_no FROM (VALUES (12345), (67890), ...) AS t(mem_sys_no)
), matched AS (
  SELECT u.m_id, u.mem_sys_no
  FROM box_job_db30_gg.user_db u
  WHERE u.m_id IN (SELECT m_id FROM ids)
     OR u.mem_sys_no IN (SELECT mem_sys_no FROM social)
)
SELECT COUNT(DISTINCT m.mem_sys_no) AS resume_updated
FROM matched m
JOIN box_job_db30_gg.user_resume_db r ON r.mem_sys_no = m.mem_sys_no
WHERE r.r_edit_dt >= TIMESTAMP '2026-05-01 00:00:00'
  AND r.r_edit_dt <  TIMESTAMP '2026-05-29 00:00:00'
```
