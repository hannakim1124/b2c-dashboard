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

window.PROJECTS = {
  'devcon-2026': {
    id: 'devcon-2026', title: 'JOBKOREA DEVCON 2026', member: 'hanna',
    jobGroupStats: { 'AI·개발·데이터': 998, '디자인': 76, '기획·전략': 287, '그 외': 150 },
    category: '이벤트', categoryLabel: 'EVENT · 웨비나',
    status: 'live', statusLabel: 'LIVE',
    date: '2026-04-23', period: '2026.04.01 — 2026.04.23',
    emoji: '🎤',
    desc: 'AI 시대, 개발자 고민 완전 정복. 7명 연사가 모인 잡코리아 첫 개발자 컨퍼런스.',
    kpis: [
      { label: 'KPI 달성', value: '100.7%', flavor: 'success' },
      { label: '신청자', value: '1,511' },
      { label: '이력서', value: '156' }
    ],
    extKpis: [
      { label: '목표 신청자', value: '1,500명' },
      { label: '광고비', value: '4,498,434원' },
      { label: 'CPC', value: '174원' },
      { label: 'CTR', value: '2.35%' },
      { label: '연사', value: '7명' },
      { label: 'NPS', value: '+62' }
    ],
    story: '데브콘은 잡코리아의 첫 개발자 대상 B2C 컨퍼런스로, 21일간의 모집 기간 동안 1,511명이 신청해 KPI 100.7%를 달성했어요.\n\n광고 효율도 직전 분기 대비 CPC 59% 개선되어 인사이트팀 상반기 핵심 성과로 기록되었습니다. 특히 이미지형 소재가 CTR 2.69%로 가장 높은 효율을 냈고, 텍스트 소재는 4월 6일자로 OFF했습니다.\n\n행사 당일 만족도 4.5/5, NPS +62로 시리즈화 가능성을 입증했어요.',
    quote: { text: '광고 효율을 학습하면서 운영했어요. 데이터가 보이니까 의사결정이 빨라졌습니다.', who: '한나, 기획 PM' },
    nextActions: [ 'WORK FEST에 광고 학습 내용 적용', '데브콘 vol.2 하반기 기획', '연사 인터뷰 시리즈 영상 발행' ],
    timeline: [
      { date: '2026.03.10', label: '기획 킥오프 · 연사 컨택' },
      { date: '2026.04.01', label: '신청 페이지 오픈 · 광고 집행 시작' },
      { date: '2026.04.18', label: '신청자 1,000 돌파' },
      { date: '2026.04.22', label: '신청 마감 · 1,511명 (KPI 100.7%)' },
      { date: '2026.04.23', label: '본행사 · 7명 연사 · 만족도 4.5' }
    ],
    related: ['career-conf', 'devcon-ad', 'workfest']
  },

  'career-conf': {
    id: 'career-conf', title: '커리어 컨퍼런스', member: 'hanna',
    category: '웨비나', categoryLabel: 'WEBINAR · 3월',
    status: 'done', statusLabel: '완료',
    date: '2026-03-26', period: '2026.03.04 — 2026.03.26',
    emoji: '🪜',
    desc: '선배가 알려주는 이직 치트키. 4명 연사 라인업, 562명 실참석.',
    kpis: [
      { label: '신청자', value: '1,566' },
      { label: '실참석', value: '562' },
      { label: '만족도', value: '4.33' }
    ],
    extKpis: [
      { label: '목표 신청자', value: '5,000명' },
      { label: 'KPI 달성', value: '31.5%' },
      { label: '이력서 업데이트', value: '110명' },
      { label: '광고비', value: '4,905,722원' },
      { label: 'CPC', value: '428원' },
      { label: '신청 단가', value: '3,133원' }
    ],
    story: '3월 진행한 첫 B2C 웨비나. KPI(5,000명) 대비 31.5%로 절대 수치는 미달했어요.\n\n다만 4명 연사 만족도 4.33/5을 확보했고, 데이터로 본 인사이트는 데브콘 광고/타이밍 전략 개선의 핵심 자료가 되었습니다.\n\n실패의 데이터를 활용해 다음 이벤트(데브콘)에서 KPI 100.7%를 달성하는 발판이 되었어요.',
    quote: { text: '신청은 적었지만, 다음 이벤트의 광고 전략을 다 여기서 배웠습니다.', who: '한나, 기획 PM' },
    nextActions: [ '데브콘으로 학습 적용 (완료)', '실시간 채팅 참여 데이터 분석', '연사 풀 정리해 시리즈화' ],
    timeline: [
      { date: '2026.02.10', label: '기획 시작 · 연사 4명 라인업' },
      { date: '2026.03.04', label: '신청 페이지 오픈' },
      { date: '2026.03.26', label: '본행사 · 562명 실참석' },
      { date: '2026.04.02', label: '회고 · 데브콘 전략 개선안 도출' }
    ],
    related: ['devcon-2026', 'hr-webinar', 'devcon-ad']
  },

  'workfest': {
    id: 'workfest', title: 'WORK FEST', member: 'hanna',
    category: '이벤트', categoryLabel: 'EVENT · 5월',
    status: 'soon', statusLabel: '예정 · D-5',
    date: '2026-05-01', period: '2026.05.01 — 2026.05.28',
    emoji: '🎉',
    desc: '4주 이력서 페스티벌. 업데이트만 해도 맥북·에어팟·네이버페이·배민 쿠폰.',
    kpis: [
      { label: '목표 신청', value: '2,000' },
      { label: '목표 이력서', value: '500' },
      { label: '예산', value: '1,400만' }
    ],
    extKpis: [
      { label: '기간', value: '4주' },
      { label: '경품 등급', value: '4단계' },
      { label: '주차당 미션', value: '1회' },
      { label: '광고 채널', value: '4개' },
      { label: 'D-day', value: 'D-5' },
      { label: '예상 단가', value: '7,000원' }
    ],
    story: '데브콘 후속 5월 핵심 이벤트. 4주간 매주 다른 이력서 미션을 던지고 등급별 경품을 제공하는 축제 컨셉. 광고 효율은 데브콘 학습 그대로 적용해 CPC 200원대 목표.',
    timeline: [
      { date: '2026.04.10', label: '기획 시작 · 컨셉 확정' },
      { date: '2026.04.20', label: '랜딩 페이지 디자인 완료' },
      { date: '2026.05.01', label: '오픈 (예정)' },
      { date: '2026.05.28', label: '종료 + 회고 (예정)' }
    ],
    related: ['devcon-2026', 'may-ad', 'metabase-auto']
  },

  'metabase-auto': {
    id: 'metabase-auto', title: '인사이트 메타베이스 자동화', member: 'hanna',
    jobGroupStats: { 'AI·개발·데이터': 412, '디자인': 287, '기획·전략': 198, '그 외': 311 },
    category: '자동화', categoryLabel: 'AUTOMATION · Q2',
    status: 'ongoing', statusLabel: '진행중',
    date: '2026-04-10', period: '2026.04.10 — 2026.06.30',
    emoji: '⚙️',
    desc: '반복 SQL을 데일리 리포트로 자동화. 한 주 12시간 절감.',
    kpis: [
      { label: '자동화', value: '5건' },
      { label: '시간절감', value: '12h/주', flavor: 'success' },
      { label: '진척도', value: '60%' }
    ],
    extKpis: [
      { label: '대상 영역', value: '이력서·광고·이벤트' },
      { label: '자동화 완료', value: '5건' },
      { label: '대기 중', value: '3건' },
      { label: '슬랙 발송 채널', value: '#딴나봇' },
      { label: '주간 절감', value: '12h' },
      { label: '연 환산 절감', value: '624h' }
    ],
    story: '메타베이스 + 슬랙 봇 + 크론을 묶어, 매일 아침 9시 데이터 리포트가 자동으로 #딴나봇 채널에 올라오도록 구성. 이벤트별 신청자/이력서/광고 효율 추이를 실시간에 가깝게 모니터링.',
    timeline: [
      { date: '2026.04.10', label: '데브콘 데일리 리포트 시작' },
      { date: '2026.04.18', label: '광고 효율 자동 리포트 추가' },
      { date: '2026.05', label: '이력서 업데이트 트래킹 추가 (예정)' },
      { date: '2026.06', label: 'Q2 회고 + 영역 확장 (예정)' }
    ],
    related: ['chatbot', 'hr-report', 'devcon-ad']
  },

  'chatbot': {
    id: 'chatbot', title: '사내 챗봇 출시', member: 'minji',
    category: '자동화', categoryLabel: 'AUTOMATION · 3월',
    status: 'done', statusLabel: '완료',
    date: '2026-03-15', period: '2026.02.01 — 2026.03.15',
    emoji: '🤖',
    desc: '팀 워크플로우 자동화 챗봇. 출시 한 달 만에 DAU 320 도달.',
    kpis: [
      { label: 'DAU', value: '320' },
      { label: '활용률', value: '87%', flavor: 'success' },
      { label: '만족도', value: '4.4' }
    ],
    extKpis: [
      { label: '연동 시스템', value: '5종' },
      { label: '커맨드', value: '24개' },
      { label: 'WAU', value: '512' },
      { label: '월간 처리', value: '8,200건' },
      { label: '시간 절감', value: '420h/월' },
      { label: '에러율', value: '0.3%' }
    ],
    story: '슬랙 기반 사내 챗봇. 회의실 예약, 휴가 신청, 데이터 조회 등 24개 커맨드 지원. 활용률 87%로 출시 직후부터 빠르게 정착했어요.',
    timeline: [
      { date: '2026.02.01', label: '기획 + 요구사항 정리' },
      { date: '2026.02.20', label: '베타 (인사이트팀 only)' },
      { date: '2026.03.15', label: '전사 출시' },
      { date: '2026.04.10', label: 'DAU 320 도달' }
    ],
    related: ['lms', 'metabase-auto', 'hr-report']
  },

  'lms': {
    id: 'lms', title: '신규 LMS 개편', member: 'minji',
    category: '자동화', categoryLabel: 'PROJECT · Q2',
    status: 'ongoing', statusLabel: '진행중',
    date: '2026-04-01', period: '2026.04.01 — 2026.06.30',
    emoji: '📚',
    desc: '학습 플랫폼 전면 개편. 24개 모듈, 1,200명 사용자 대상.',
    kpis: [
      { label: '진척도', value: '65%' },
      { label: '사용자', value: '1,200' },
      { label: '모듈', value: '24' }
    ],
    extKpis: [
      { label: '예산', value: '3,200만원' },
      { label: '구축 모듈', value: '24개' },
      { label: '베타 사용자', value: '120명' },
      { label: '베타 NPS', value: '+48' },
      { label: '런칭 예정', value: '2026.06' },
      { label: '진척도', value: '65%' }
    ],
    story: '레거시 LMS의 UX/검색/추천을 전면 개편. 베타 사용자 NPS +48로 좋은 신호. 6월 정식 런칭 예정.',
    timeline: [
      { date: '2026.04.01', label: '프로젝트 킥오프' },
      { date: '2026.04.15', label: '와이어프레임 + 모듈 1차' },
      { date: '2026.05', label: '베타 오픈 (예정)' },
      { date: '2026.06', label: '정식 런칭 (예정)' }
    ],
    related: ['chatbot', 'hr-report']
  },

  'hr-report': {
    id: 'hr-report', title: 'HR 인사이트 리포트', member: 'minji',
    category: '콘텐츠', categoryLabel: 'CONTENT · 4월',
    status: 'done', statusLabel: '완료',
    date: '2026-04-05', period: '2026.03.10 — 2026.04.05',
    emoji: '📊',
    desc: '2026 1분기 HR 트렌드 분석 리포트. PDF 다운로드 412건.',
    kpis: [
      { label: '다운로드', value: '412' },
      { label: '공유', value: '89' },
      { label: '조회', value: '2,140' }
    ],
    extKpis: [
      { label: '발간 분량', value: '48p' },
      { label: '인터뷰', value: '12건' },
      { label: '랜딩 PV', value: '2,140' },
      { label: '리드 수집', value: '184명' },
      { label: 'B2B 미팅 전환', value: '11건' },
      { label: '미디어 인용', value: '3건' }
    ],
    story: '잡코리아 데이터 + HR 담당자 12명 인터뷰 기반 1Q 리포트. 외부 미디어 3곳에 인용되었고, B2B 영업 리드 184명 확보.',
    timeline: [
      { date: '2026.03.10', label: '기획 + 데이터 수집' },
      { date: '2026.03.25', label: '인터뷰 12건 완료' },
      { date: '2026.04.05', label: '발간 + 배포' },
      { date: '2026.04.20', label: '미디어 인용 3건' }
    ],
    related: ['chatbot', 'lms', 'blog']
  },

  'hr-webinar': {
    id: 'hr-webinar', title: 'HR 트렌드 웨비나', member: 'jihoon',
    category: '웨비나', categoryLabel: 'WEBINAR · 3월',
    status: 'done', statusLabel: '완료',
    date: '2026-03-20', period: '2026.02.20 — 2026.03.20',
    emoji: '🎙️',
    desc: '2026 채용 시장 변화와 HR이 준비할 것. 312명 실시간 참여.',
    kpis: [
      { label: '신청자', value: '489' },
      { label: '참여', value: '312' },
      { label: '만족도', value: '4.6', flavor: 'success' }
    ],
    extKpis: [
      { label: '연사', value: '2명 (외부)' },
      { label: '참여율', value: '63.7%' },
      { label: '평균 시청', value: '52분' },
      { label: 'Q&A', value: '38건' },
      { label: '리드 수집', value: '102명' },
      { label: 'NPS', value: '+58' }
    ],
    story: '외부 연사 2명을 모셔 진행한 HR 웨비나. 신청 대비 참여율 63.7%, 만족도 4.6/5로 시리즈 정착의 발판 마련.',
    timeline: [
      { date: '2026.02.20', label: '연사 컨택 + 기획' },
      { date: '2026.03.05', label: '신청 오픈' },
      { date: '2026.03.20', label: '본행사 · 312명 참여' },
      { date: '2026.03.27', label: '회고 + vol.2 기획' }
    ],
    related: ['recruit-webinar', 'career-conf', 'hr-report']
  },

  'recruit-webinar': {
    id: 'recruit-webinar', title: '채용 트렌드 웨비나 vol.2', member: 'jihoon',
    category: '웨비나', categoryLabel: 'WEBINAR · 5월',
    status: 'soon', statusLabel: '예정',
    date: '2026-05-15', period: '2026.04.20 — 2026.05.15',
    emoji: '📅',
    desc: '상반기 채용 시장 결산 + 하반기 전망. 외부 연사 3명.',
    kpis: [
      { label: '목표 신청', value: '600' },
      { label: '연사', value: '3명' },
      { label: 'D-day', value: '19' }
    ],
    extKpis: [
      { label: '주제', value: '상반기 결산 + 하반기' },
      { label: '연사', value: '3명 (외부 2 + 사내 1)' },
      { label: '목표 참여율', value: '65%' },
      { label: '광고 예산', value: '180만원' },
      { label: '랜딩 오픈', value: '2026.04.25' },
      { label: 'D-day', value: 'D-19' }
    ],
    story: 'HR 웨비나 vol.1 성과를 이어받아 시리즈화. 외부 연사 2명 + 사내 데이터 분석가 1명 라인업으로 콘텐츠 깊이 강화.',
    timeline: [
      { date: '2026.04.20', label: '기획 시작' },
      { date: '2026.04.25', label: '랜딩 오픈 (예정)' },
      { date: '2026.05.15', label: '본행사 (예정)' }
    ],
    related: ['hr-webinar', 'career-conf']
  },

  'insta': {
    id: 'insta', title: '@worxtory 인스타 운영', member: 'suyoung',
    category: '콘텐츠', categoryLabel: 'CONTENT · Q2',
    status: 'ongoing', statusLabel: '진행중',
    date: '2026-04-21', period: '2026.01.01 — 진행중',
    emoji: '📱',
    desc: '웍스피어 공식 인스타 채널. 게시물 24개, 좋아요 1.2K 누적.',
    kpis: [
      { label: '팔로워', value: '168' },
      { label: '게시물', value: '24' },
      { label: '좋아요', value: '1,205' }
    ],
    extKpis: [
      { label: '계정', value: '@worxtory' },
      { label: '주간 게시', value: '2~3건' },
      { label: '평균 도달', value: '1,840' },
      { label: '저장수', value: '342' },
      { label: '댓글', value: '108' },
      { label: '팔로워 증가율', value: '+24%/월' }
    ],
    story: '브랜드 톤앤매너부터 정립한 신규 인스타 운영. 4월 데브콘 연계 콘텐츠로 도달 급증, 팔로워 증가율 월 +24%.',
    timeline: [
      { date: '2026.01.10', label: '계정 개설 + 톤앤매너 정립' },
      { date: '2026.02', label: '주간 2~3건 정기 게시 시작' },
      { date: '2026.04', label: '데브콘 연계 콘텐츠 8건' },
      { date: '2026.04.21', label: '팔로워 168 / 좋아요 1.2K' }
    ],
    related: ['blog', 'video', 'devcon-2026']
  },

  'blog': {
    id: 'blog', title: '블로그 콘텐츠 시리즈', member: 'suyoung',
    category: '콘텐츠', categoryLabel: 'CONTENT · 1Q',
    status: 'done', statusLabel: '완료',
    date: '2026-03-30', period: '2026.01.10 — 2026.03.30',
    emoji: '✍️',
    desc: '"이직 잘하는 사람들의 5가지 습관" 시리즈. 누적 12K 조회.',
    kpis: [
      { label: '조회수', value: '12,000' },
      { label: '체류', value: '3:24' },
      { label: '공유', value: '89' }
    ],
    extKpis: [
      { label: '발행', value: '5편' },
      { label: '평균 조회', value: '2,400' },
      { label: '평균 체류', value: '3:24' },
      { label: '공유', value: '89건' },
      { label: '뉴스레터 유입', value: '218명' },
      { label: '시리즈 완독률', value: '46%' }
    ],
    story: '5편 시리즈 콘텐츠. 평균 체류 3분 24초로 일반 아티클 대비 1.8배 높음. 뉴스레터 신규 구독 218명 확보.',
    timeline: [
      { date: '2026.01.10', label: '시리즈 기획' },
      { date: '2026.01.20', label: '1편 발행' },
      { date: '2026.03.30', label: '5편 완결 · 12K 조회' }
    ],
    related: ['insta', 'video', 'hr-report']
  },

  'video': {
    id: 'video', title: '4월 영상 콘텐츠', member: 'suyoung',
    category: '콘텐츠', categoryLabel: 'CONTENT · 4월',
    status: 'ongoing', statusLabel: '진행중',
    date: '2026-04-15', period: '2026.04.01 — 2026.04.30',
    emoji: '🎬',
    desc: '데브콘 연사 인터뷰 시리즈. 릴스 4편 게시 완료.',
    kpis: [
      { label: '조회', value: '8,400' },
      { label: '좋아요', value: '412' },
      { label: '댓글', value: '38' }
    ],
    extKpis: [
      { label: '편수', value: '4편 (예정 7편)' },
      { label: '플랫폼', value: '인스타·유튜브 쇼츠' },
      { label: '평균 조회', value: '2,100' },
      { label: '평균 시청 완료율', value: '62%' },
      { label: '저장', value: '184' },
      { label: '공유', value: '46' }
    ],
    story: '데브콘 연사 7명 짧은 인터뷰 영상 시리즈. 4편 게시 후 시청 완료율 62%로 양호. 추가 3편은 데브콘 종료 후 게시 예정.',
    timeline: [
      { date: '2026.04.01', label: '연사 인터뷰 촬영 시작' },
      { date: '2026.04.10', label: '1·2편 게시' },
      { date: '2026.04.15', label: '3·4편 게시' },
      { date: '2026.05', label: '5~7편 게시 (예정)' }
    ],
    related: ['insta', 'blog', 'devcon-2026']
  },

  'devcon-ad': {
    id: 'devcon-ad', title: '데브콘 광고 캠페인', member: 'taeho',
    category: '캠페인', categoryLabel: 'CAMPAIGN · 4월',
    status: 'done', statusLabel: '완료',
    date: '2026-04-21', period: '2026.04.01 — 2026.04.21',
    emoji: '📈',
    desc: '21일간 3채널 동시 집행. CPC 174원 (전기 대비 ↓59%).',
    kpis: [
      { label: 'CPC', value: '174원', flavor: 'success' },
      { label: 'CTR', value: '2.35%' },
      { label: 'ROAS', value: '3.2x', flavor: 'success' }
    ],
    extKpis: [
      { label: '집행 채널', value: '메타·구글·네이버' },
      { label: '집행액', value: '4,498,434원' },
      { label: '노출', value: '1,102,396' },
      { label: '클릭', value: '25,895' },
      { label: '신청 단가', value: '2,977원' },
      { label: '이력서 단가', value: '28,836원' }
    ],
    story: '데브콘 21일 광고 캠페인. 이미지형 소재가 CTR 2.69%로 가장 높았고, 텍스트 소재는 4/6에 OFF. CPC 직전 분기 대비 59% 개선.',
    timeline: [
      { date: '2026.04.01', label: '집행 시작 (3채널)' },
      { date: '2026.04.06', label: '소재 최적화 (텍스트형 OFF)' },
      { date: '2026.04.18', label: '신청자 1,000 돌파' },
      { date: '2026.04.21', label: '집행 종료 · CPC 174원' }
    ],
    related: ['may-ad', 'devcon-2026', 'career-conf']
  },

  'may-ad': {
    id: 'may-ad', title: '5월 통합 광고 전략', member: 'taeho',
    category: '캠페인', categoryLabel: 'CAMPAIGN · 5월',
    status: 'soon', statusLabel: '예정',
    date: '2026-05-01', period: '2026.05.01 — 2026.05.28',
    emoji: '🎯',
    desc: 'WORK FEST 연계 멀티채널 캠페인. 4채널 통합 운영.',
    kpis: [
      { label: '예산', value: '600만' },
      { label: '채널', value: '4' },
      { label: '목표 CTR', value: '2.5%' }
    ],
    extKpis: [
      { label: '집행 채널', value: '메타·구글·네이버·카카오' },
      { label: '예산', value: '6,000,000원' },
      { label: '목표 CPC', value: '200원' },
      { label: '목표 신청자', value: '2,000명' },
      { label: '목표 CTR', value: '2.5%' },
      { label: 'D-day', value: 'D-5' }
    ],
    story: 'WORK FEST 연계로 채널을 4개로 확장. 데브콘 학습 그대로 적용해 CPC 200원대 목표.',
    timeline: [
      { date: '2026.04.20', label: '소재 제작 시작' },
      { date: '2026.04.28', label: '캠페인 세팅 완료' },
      { date: '2026.05.01', label: '집행 시작 (예정)' },
      { date: '2026.05.28', label: '집행 종료 (예정)' }
    ],
    related: ['workfest', 'devcon-ad']
  }
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
