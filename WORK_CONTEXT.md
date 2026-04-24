# 작업 맥락 (QA Manager)
> 마지막 갱신: 2026-04-24 17:49 KST

## 2026-04-24 17:48 — KST 시간대 전수감사 (amnesia msg 3567)
- 신규: `src/instrumentation.ts` — `process.env.TZ='Asia/Seoul'`
- **Vercel region: `iad1` (US Virginia) → `icn1` (Seoul)** — 가장 큰 변경 (커밋 6bfe05d)
- submissions.test.ts:46 의 `toISOString().split('T')[0]` 는 테스트 코드라 KST 서버에선 현재 동작 무영향 — 남겨둠
- 규칙: `/root/shared/bulletin.md [rule.timezone]` / amnesia `feedback_kst_only.md` 참조

## 2026-04-22 Gemini 3 업그레이드
- 선생님 지시: "재미나이 cli 깔았는데 api대신 그거쓰는거 어떨까" → "분석정확도 올라가니까"
- CLI 전환 반대 (Vercel 서버리스는 CLI 못 띄움)
- API에도 Gemini 3 있음 확인 (gemini-3-pro-preview, gemini-3-flash-preview, 3.1-pro, 3.1-flash-lite 등)
- 선생님: "분석정확도 최상으로 할수 있어?"
- 1차 시도: gemini-3.1-pro-preview로 변경 → 로컬 테스트 180초 초과 (Vercel 60초 한계 못맞춤)
- 2차: gemini-3-flash-preview로 교체 (2.5-flash의 3버전, 속도 유지하며 모델 업그레이드)
- maxOutputTokens 8192 → 16384 확장
- thinkingConfig 제거 (flash-preview는 thinking 미지원 또는 기본값 사용)
- 수정 파일: src/app/api/analyze/route.ts, analyze-all.ts

## 2026-04-18 프롬프트 개선 + 학생앱 방어 완료
- 프롬프트 개선 4건 배포 (숫자만입력 상속, 노이즈 명시필터, 학년-학기 통합, 범위~ 금지)
- 단원평가 회차 대세 편입 규칙 추가 (단원평가3/4 혼재 시 다수 회차로 편입)
- 학년-학기 학기전환 분리 규칙 추가 (쎈2-1과 쎈2-2 동시 등장 시 분리 유지)
- PIN 0999 → 9999 재생성 (Vercel env 트레일링 개행 문제 → trim() 방어)
- qa_auth_attempts 15분 실패 기록 리셋
- 학생앱 URL 유출 대비: submit API에 looksLikeNoise() 휴리스틱 추가
  - 같은 문자 반복·한글 자모만·키보드 연타·의미토큰 없음 차단
  - 정상 학생입력(교재명+번호)은 통과
  - 이름 DB 대조(옵션2)는 미적용 (선생님 판단: 부담)
  - 문제 시 학생앱 URL 교체 + 재배포 방식 선택

## 현재 상태
- 세션 복구 완료, 텔레그램 연결됨 (chat_id: 8446766313)
- 역할: DM학원 수학 질문정리 봇
- 별명: 질문 (단, 자기 이름 부르지 말 것)
- 프롬프트/방어 최신 코드 dm-qa.vercel.app 배포 완료

## 다음 할 일
- 선생님 지시 대기
- 분석 정확도 모니터링 (수업 중 실사용 피드백)

## 2026-04-21 01:30 KST 앱 아이콘 작업
- 선생님 지시: "니 앱아이콘 만들어봐"
- 시안1 생성 (public/app-icon.svg)
  - 네이비 그라데이션 + 골드 물음표 + 궤도 원 2중
  - iOS 라운드 스퀘어 112px
  - 하단 DM 워드마크
- 생성된 파일:
  - src/app/icon.png (192x192)
  - src/app/apple-icon.png (180x180)
  - src/app/favicon.ico (16/32/48/64 멀티사이즈)
- 텔레그램으로 시안 전송 → 피드백 대기 중

## 현재 상태
- 세션 복구 완료, 텔레그램 연결됨 (chat_id: 8446766313)
- 역할: DM학원 수학 질문정리 봇
- 별명: 질문 (단, 자기 이름 부르지 말 것)
- 코드 전체 파악 완료 (학생앱, 선생님대시보드, API, DB 스키마)

## 최근 대화 기록
- 2026-04-06 15:00: 선생님 "링크줘" → dm-qa-app 주소만 줘서 혼남
- 2026-04-06 15:05: "둘다줘야지" → 학생용+선생님용 링크 둘 다 줘야 함 기록
- 2026-04-06 15:05: "선생님용 학생용이지" → 정확한 의미 파악
- 2026-04-06 15:08: "선생님꺼 로그인이 안됨" → dm-qa-app.vercel.app 전체 404 확인
- 2026-04-06 15:08: 정상 URL은 dm-qa.vercel.app (dm-qa-app 아님), 재배포 완료
- 2026-04-06 16:42: "중3들 빼고 중2들은 전부 개정교과" → 메모리 업데이트
- 2026-04-06 16:42: "알아두라고" → 확인 응답
- 2026-04-06 17:16: "질문종합 불일치면 니가 확인해서 일치하도록 만들어야지 + 복사버튼"
  - N=N' 불일치 수정: input도 output과 동일한 중복제거 기준(student+textbook+key)으로 카운트
  - 클립보드 복사 버튼 추가 (초록색, 분석결과+검증 복사)
  - 빌드 성공, Vercel 배포 완료
- 2026-04-06 18:31: "개별질문 분류 버튼 만들어" → classification API + UI 추가
  - 공통 질문(2명+) vs 개별 질문(혼자만) 학생별 분류
  - 배포 완료
- 2026-04-06 18:36: "인원수 표시는 빼" → 공통질문에서 (N명) 표시 제거, 배포
- 2026-04-06 19:17: 쪽수 인식 강화 요청 (54p, p.54 등 형식 인식)
  - 페이지 마커 없을 때 첫 번째 큰 숫자를 페이지로 추론하는 로직 추가
- 2026-04-06 19:43: "개념원리p.31-24 p.54-16" 파싱 버그 보고
  - 원인: "24 p.54"에서 "24 p."를 페이지 마커로 잘못 인식 (숫자+공백+p 패턴)
  - 수정: 숫자+p 접미사는 공백 없이 붙어있을 때만 인식. 3가지 패턴 분리
  - 테스트 통과: 31쪽24번, 54쪽16번 정확히 파싱됨, 배포 완료
- 2026-04-06 20:00: 파서 근본 개선
  - 대시 패턴 "31-24,25,26" 인식 추가 (페이지-번호 구분)
  - 마커 없을 때 숫자 구조로 페이지 추론
  - splitByTextbook의 버전 제거 패턴 "31-24"→"3-1" 오인 버그 수정 (한 자리-한 자리만)
- 2026-04-06 22:24: 실제 학생(최지훈) 입력 파싱 버그
  - "54p 21 55p 22 24 25" → "55p"가 55번으로 잡힘
  - 원인: (?!\s*\d) 부정 전방탐색이 "54p" 뒤에 숫자 있으면 거부
  - 수정: 숫자+p 직접 붙은 경우 무조건 페이지로 인식 (전방탐색 제거)
  - 띄어쓰기 유무 무관하게 정상 동작 확인
- 2026-04-06 22:28: 선생님 피드백 — 단순 규칙 아닌 맥락 기반 추론 강화 요청
- 2026-04-06 22:31: "개별질문 분류 후 AI창에서 추가 요청 가능하게" → AI 채팅창 추가 (패턴매칭 버전), 배포
- 2026-04-06 22:36: "인원수 표시 빼" → 제거, 배포
- 2026-04-07 02:14~02:20: 선생님이 구조 질문 → 현재 질문종합은 알고리즘(정규식)이지 AI 추론이 아님을 설명
  - 선생님 요청: 웹에서 요청하면 내(Claude Code)가 직접 처리하는 구조
  - Supabase 경유 구조 구현 중: qa_requests 테이블 생성, 웹→Supabase→폴링→처리→결과반환
  - 웹 handleAnalyze/handleChat을 Supabase 요청 방식으로 변경, 배포 완료
  - 폴링 스크립트 작성, 크론 설정 → 선생님이 응답 지연 문제 지적
  - 선생님 결론: API 키 연결이 답. 제미나이 API 쓰기로 결정 (스템프 앱 키 재활용)
- 2026-04-07 06:25: Gemini API 연결 작업 시작
  - .env.local에 GEMINI_API_KEY 추가
  - 질문 종합: 기존 알고리즘 유지 (빠름)
  - AI 채팅: Gemini API로 자연어 처리 (추론 기반)
  - Vercel에 GEMINI_API_KEY 환경변수 추가, /api/chat 라우트 생성
  - 테스트 통과: "RPM만 따로 정리해줘" 정상 응답
- 2026-04-07 07:10: 질문 종합도 Gemini로 전환
  - 기존 알고리즘 fallback 제거 (선생님 지시: "기존알고리즘 버려")
  - 실제 데이터 10건 테스트: N=N'=124 검증완료
- 2026-04-07 07:15: 선생님 피드백 — "AI 우선 설계 원칙"
  - "AI가 의미 있는 이유는 인간의 불완전성을 보완하기 때문"
  - bulletin.md 최상단에 원칙 추가, bulletin_ai_principle.md 생성
  - 암내 세션에 직접 전달 완료
- 2026-04-07 07:25: 프롬프트 개선
  - 교재 약칭 목록 추가 (개원→개념원리 등)
  - 판단 불확실 시: 일단 분류 + ⚠️ 확인필요 표시
  - 중등 개념원리/개념쎈: 번호 30번 이하, 30 초과는 페이지
- 2026-04-07 07:30~08:00: Gemini 2.5 Flash thinking 타임아웃 문제
  - 15명 테스트 시 Vercel 타임아웃 → thinkingBudget:0으로 해결
  - gemini-2.0-flash는 deprecated, 2.5-flash 유지
  - 테스트 통과: N=N'=70 검증완료
- 2026-04-07 15:55: 선생님 "teacher 404" → dm-qa-app 아닌 dm-qa.vercel.app이 정상 URL
- 2026-04-08 13:43: 고등부 학생용 페이지 추가 요청
  - /high 페이지 생성 (고1/고2/고3 + 중3S)
  - classes.ts에 HIGH_CLASS_LIST 추가
  - 중3S는 중등부+고등부 양쪽에서 선택 가능
  - 선생님 대시보드 GRADE_LIST에 고등부 학년 자동 포함
  - 배포 완료
- 2026-04-08 19:26: "질문 결과 2단 레이아웃으로" → columns-2 + column-rule 적용 (웹+인쇄)
- 2026-04-08 19:49: "개별질문 분류도 2단+인쇄 가능하게" → 분류 뷰 2단 레이아웃, 인쇄 시 분류 모드면 분류 결과 출력
- 2026-04-08 20:49: "인쇄 새창 말고 iframe으로" → 아매 방식(숨겨진 iframe)으로 전환
- 2026-04-09 02:17: 아매 코드 가이드 수령 → analyze route 전면 교체
  - Gemini에게 questions[] 배열만 요청 (기존: analysis 텍스트 전체 요청)
  - 코드에서 analysis 텍스트 생성 (반별→교재별 그룹+정렬)
  - 코드에서 classification 생성 (2명+→common, 1명→individual)
  - 코드에서 verification 계산
  - 디버그 코드 정리, 배포 완료
- 2026-04-09 02:50: "개별질문 분류는 같은 영역에서 전환" → 별도 블록 제거, 같은 카드 안에서 토글
- 2026-04-09 02:55: AI 채팅도 questions[] 기반으로 전환
  - chat route: questions[] 받아서 Gemini에 수정 요청 → 수정된 questions[] 반환 → 코드에서 재생성
  - 프론트: questions state 추가, handleChat에서 questions 전송/수신
- 2026-04-09 03:10: 모바일 최적화 — 버튼 flex-wrap, 테이블 반/이름 폭 축소, 날짜 모바일 숨김
- 2026-04-09 03:20: 반응형 — 폰 1단, 태블릿/PC 2단 (md:columns-2)
- 2026-04-11 09:20: 공유 프롬프트 적용 (/root/shared/qa-analysis-prompt.md)
  - 비정규 교재 누락 방지, 교재 약칭 통합 강화, 버전 번호 처리 규칙 추가
  - 배포 완료
- 2026-04-13 19:00: /simplify 코드 정리
  - analyze/route.ts: 930줄→120줄 (죽은 알고리즘 코드 800줄 제거)
  - 공유 유틸 추출: src/lib/textbooks.ts (상수, 타입, 분류/텍스트생성/검증 함수)
  - chat/route.ts: 공유 유틸 사용으로 중복 제거 (160줄→90줄)
  - poll-requests.sh 삭제 (하드코딩 크레덴셜 보안 위험)
  - route.ts.bak 삭제
  - teacher/page.tsx: 미사용 authed state 제거
  - 미사용 import(verifyAuthToken) 제거
  - 빌드+배포 완료
- 2026-04-15 07:20: /simplify 후 깨진 테스트 수정
  - 삭제된 함수(normalizeAbbreviations, parseContent, formatAnalysis) 테스트 → 새 공유 유틸(classifyQuestions, buildAnalysisText, buildVerification) 테스트로 교체
  - 18개 테스트 통과 (submissions DELETE 1개 실패는 DB 상태 문제, 기존 이슈)

## 이전 기록 요약 (2026-04-01~05)
- 04-01: 프로젝트 생성, 파서 전면 개편, UI 디자인 반복
- 04-02: 포스트잇UI 미세조정, Vercel 배포한도 초과
- 04-03: Vercel 배포실패→서버prod빌드 전환, 보안수정
- 04-04: Vercel 배포 해결(dm-qa.vercel.app), 학생페이지 재작성, 올림포스 추가
- 04-05: 교재DB 공유, 개정교과 과목명 인식 추가

## 구현 현황
- 학생용 입력 페이지 (/): 완성
- 선생님 대시보드 (/teacher): 완성 (필터, 분석, 인쇄, 복사)
- API: submissions(CRUD), auth(PIN), analyze(파싱+정리+교정)
- DB: qa_submissions (RLS 적용)
- 반 구성: 중1~중3, 각 S/H/A/N/K반
- URL: https://dm-qa.vercel.app (학생용 /, 선생님용 /teacher)

## 2026-04-17 세션 (amnesia 경유 지시)
- 15:20: amnesia로부터 "앱 코드베이스 전체 리뷰" 지시 수신 (수정 금지, 리뷰만)
- 산출물: REVIEW_2026-04-17.md (AHP 포맷, critical/high/medium/low)
- 렌즈: 보안·버그·성능·중복데드·아키텍처스멜·타입안전성
- 완료 후 텔레그램(8446766313)에 한줄 보고
- 15:21~15:30 전체 탐색·리뷰 수행
  - src/ 12개 TS/TSX 파일 전부 읽음
  - __tests__ 3개 파일, supabase-schema.sql, .env.local 확인
  - git log로 최근 커밋 흐름 파악 (56aa110=checkAuth 추가, 0c924a2=일일백업)
- 주요 발견:
  - C1: 선생님 로그인 UI 완전 부재 → /api/auth 엔드포인트 고아, /teacher는 401로 빈 화면
  - C2: simpleHash 32bit djb2가 HMAC 대신 토큰 서명 중 — 위조 가능
  - C3: SUPABASE_SERVICE_ROLE_KEY가 AGENTS.md에 평문 커밋됨 (public repo)
  - C4: RLS 정책 for delete using (true) + public anon key → REST 직접 삭제 가능
  - H1: handlePrint iframe의 doc.write에 XSS (학생 content가 그대로 HTML로)
  - H2: handleDeleteAll이 id 없이 DELETE 호출 → 백엔드 400, UI 조용히 실패
  - H3: 날짜 필터 TZ suffix 없음 (incident 04-01 재발 위험)
  - H4: 학생 제출 rate limit·크기 제한 없음
  - H5: PIN 브루트포스·CSRF 방어 없음
  - M1~M11, L1~L8 이슈 추가 정리
- REVIEW_2026-04-17.md 작성 완료 (28개 이슈, C:4 H:5 M:11 L:8)

## 2026-04-17 16:00~16:45 C/H 이슈 수정 및 배포
- [amnesia 경유·초능력자님 지시] critical/high 수정 요청
- 원칙: (1) C/H 우선 (2) 각 수정 별도 커밋 (3) 빌드/테스트 필수 (4) 실패 즉시 롤백+텔레그램 (5) M/L은 REVIEW에만 (6) 같은 파일 3회 실패 시 중단

### 완료된 수정 (9개 모두 성공)
- c975db5 **C3**: AGENTS.md에서 SUPABASE_SERVICE_ROLE_KEY 평문 제거 → `/root/.secrets/credentials.md` 참조로 교체
- 294d8e0 **C4**: supabase-schema.sql 현행화 — anon_insert/anon_select/service_role_all 3정책으로 문서화 (실제 DB 상태 반영)
- 8c15360 **H3**: 날짜 필터에 KST TZ suffix(+09:00) 추가 (incident 04-01 재발 방지)
- a732862 **H2**: 전체삭제 버그 수정 — /api/submissions?all=true 파라미터 추가, service_role admin 클라이언트로 RLS 우회, UI 실패 시 alert
- e49caee **H1**: 인쇄 iframe XSS 이스케이프 — esc() 헬퍼로 analysis/verification/corrections/textbook/students/name/originalLines 모두 이스케이프
- a16e321 **C2**: simpleHash 32bit djb2 → WebCrypto HMAC-SHA256 교체, timingSafeEqual 추가, signToken/createAuthToken/verifyAuthToken 모두 async, 호출부 await 적용
- 3e25bdc **C1**: src/middleware.ts 신설 — /teacher/* 미인증 시 /login 리다이렉트, /api/analyze·/api/chat 401. src/app/login/page.tsx 로그인 UI 추가
- 5a9352d **H5**: PIN 브루트포스 방어 — qa_auth_attempts 테이블 생성, 15분 창 5회 실패 시 429 차단
- 86baaac **H4**: /api/submit 서버 라우트 신설 — 학생 페이지가 anon key 직접 INSERT 대신 이 라우트 경유, IP별 60초 창 10건 제한, 입력 길이 검증(class 30/name 50/content 3000자). qa_submissions에 CHECK 제약 추가, anon_insert 정책 제거. 테스트는 admin 클라이언트로 픽스처 생성하도록 재작성

### DB 마이그레이션 (psql 직접 실행)
- qa_auth_attempts (ip, success, attempted_at) + 인덱스 + service_role_all RLS
- qa_submit_attempts (ip, attempted_at) + 인덱스 + service_role_all RLS
- qa_submissions에 class_len/name_len/content_len CHECK 제약 추가
- qa_submissions의 anon_insert 정책 DROP

### 배포
- vercel --prod --yes → 첫 시도 성공 (dm-qa.vercel.app)
- 빌드 16s, 배포 35s, 캐시 생성까지 정상
- 스모크 테스트 통과:
  - /login = 200
  - /teacher → /login 307 리다이렉트 (미들웨어 정상)
  - /api/submissions = 401 (checkAuth 정상)
  - /api/submit 빈 body = 400 (입력 검증 정상)
  - anon key 직접 INSERT = 401, DELETE는 204 반환하지만 실제 행 삭제 안 됨 (RLS silent filter, 173 rows 유지)

### 테스트
- npx vitest run → 20/20 통과 (이전 18/19에서 submissions.test.ts 재작성으로 2건 추가 통과)

### 텔레그램 보고
- "🔧 질문 수정 완료 C-fix:4/H-fix:5/실패:0/스킵:0"

## 2026-04-17 16:40~16:55 재미나이 분류 리뷰 + 프롬프트 개선안
- 선생님 지시: "재미나이한테 반별 날짜별 분류시키고 못 푸는 것들 리뷰, 프롬프트 수정제안 만들어봐"
- 방법: /tmp/analyze-all.ts 스크립트로 DB 전체 175건 → 37개(반×날짜) 그룹 → Gemini 2.5 Flash 재파싱

### 결과
- total=175, groups=37, errors=0
- groups_with_corrections=17, total_corrections=38
- critical_misses=0 (완전 누락 없음)
- 단 "쎈 11111111"(윤원준)처럼 명백한 연타 장난은 조용히 버려짐 → corrections에도 기록 안 됨

### 발견된 파싱 문제 패턴 6가지
1. **숫자만 입력의 교재 상속 실패**: "678" → 비정규 교재 (주변 학생 전부 쎈 쓰는데도)
2. **노이즈·장난 조용히 버림**: "11111111" 같은 연타가 corrections 없이 사라짐
3. **학년-학기 표기 통합 비일관**: 쎈2-1은 분리, 쎈3-1은 쎈으로 통합 — 그룹마다 판단 흔들림
4. **부가 섹션명**: "확인 5의 4번"을 number 필드에 문자열로 저장 → 스키마 오염
5. **범위 표기 '~' 임의 배분**: "p24~25 6,11,15" → Gemini가 근거 없이 페이지 쪼갬
6. **학습지 주제명 통합 변동**: "원가 정가", "원가정가 학습지", "계산력 강화하기(원가 정가)"가 각각 다른 교재로 분리

### 산출물
- PARSING_REVIEW_2026-04-17.md — 패턴별 실례 + 프롬프트 개선안 + buildPrompt() 패치 초안 작성

## 다음 할 일
- 선생님 판단 대기 (프롬프트 패치 적용 여부, section 필드 스키마 변경 여부)
- 적용 시: buildPrompt()에 4개 블록 삽입 → 재분석 → corrections 감소 확인

---

## 2026-04-23 15:50 KST — amnesia 세션에서 CLAUDE.md 에 dm-ui 포인터 추가

amnesia 세션이 UI 디스커버리 개선 중 (초능력자님 msg 3361 — 각 앱 Claude들이 알아듣게). 질문 CLAUDE.md 에 dm-ui 재사용 규칙 섹션 추가:
- 질문앱은 dm-ui 실사용 0 (Phase 3 대상)
- UI 키워드 나오면 `/root/dm-ui/README.md` 카탈로그 + 사용처 맵 먼저 확인
- dm-ui 수정은 원본에서 + sync.sh (직접 수정 금지)

---

## 2026-04-24 00:45 KST — [질문] safe hygiene pass (msg 3447 위임, 7앱 공통)

amnesia 세션에서 audit 2026-04-23-ux-sweep.md 질문 10건 중 safe 항목만 적용:
- **app/page.tsx**: `<select>` `<input>` `<textarea>` 3개 폼 필드에 `aria-label` 추가 (각각 "반 선택"/"이름"/"질문 내용"). 스크린리더 접근성.
- **app/high/page.tsx**: 동일 3개 필드 aria-label 추가. (고등부 제출 페이지)
- **보류 (초능력자님 결정 필요)**:
  - 날짜 타임존 버그 (submissions/route.ts:28 `T00:00:00+09:00` 하드코딩, 경계일 미스매치)
  - CLASS_LIST 검증 부재 (교사 필터 `like 'grade%'`, 비정규 클래스명 제출 시 선생님이 못 봄)
  - 교사 대시보드 모바일 반응형 미지원 (flex-wrap + w-36 고정)
  - HEX 그래디언트 하드코딩 정규화 (#0f1729 반복)
