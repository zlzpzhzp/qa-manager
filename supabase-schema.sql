-- Supabase에서 SQL Editor로 실행하세요
-- 최종 업데이트: 2026-04-17 (C4 보안 수정 — DELETE는 service_role만)

create table qa_submissions (
  id bigint generated always as identity primary key,
  class_name text not null,
  student_name text not null,
  content text not null,
  created_at timestamptz default now(),
  constraint class_len check (char_length(class_name) between 1 and 30),
  constraint name_len check (char_length(student_name) between 1 and 50),
  constraint content_len check (char_length(content) between 1 and 3000)
);

-- RLS 활성화
alter table qa_submissions enable row level security;

-- H4 이후: 학생 INSERT도 /api/submit 서버 라우트 경유 → service_role 전용.
-- anon_insert 정책은 제거되어 공개 키로 직접 INSERT 불가.

-- 대시보드: anon으로 select (공개 anon key로 조회 허용)
-- 향후 service_role 전용으로 좁히려면 server API에서만 읽도록 전환 필요
create policy "anon_select" on qa_submissions
  for select to anon using (true);

-- DELETE / UPDATE: service_role 전용 (Next.js 서버 API에서 SUPABASE_SERVICE_ROLE_KEY 사용)
-- anon으로는 삭제/수정 불가 — PostgREST가 조용히 0 rows affected 반환
create policy "service_role_all" on qa_submissions
  for all to service_role using (true) with check (true);

-- H4: 학생 제출 rate-limit용 IP별 시도 기록. /api/submit에서 60초 창 10건 제한.
create table qa_submit_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  attempted_at timestamptz default now()
);
create index qa_submit_attempts_ip_time on qa_submit_attempts(ip, attempted_at desc);
alter table qa_submit_attempts enable row level security;
create policy "service_role_all" on qa_submit_attempts
  for all to service_role using (true) with check (true);

-- H5: PIN 로그인 브루트포스 방어용 실패 기록 테이블.
-- /api/auth에서 15분 창 실패 5회 이상이면 차단. service_role 전용.
create table qa_auth_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  success boolean not null default false,
  attempted_at timestamptz default now()
);
create index qa_auth_attempts_ip_time on qa_auth_attempts(ip, attempted_at desc);
alter table qa_auth_attempts enable row level security;
create policy "service_role_all" on qa_auth_attempts
  for all to service_role using (true) with check (true);
