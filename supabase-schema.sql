-- Supabase에서 SQL Editor로 실행하세요
-- 최종 업데이트: 2026-04-17 (C4 보안 수정 — DELETE는 service_role만)

create table qa_submissions (
  id bigint generated always as identity primary key,
  class_name text not null,
  student_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table qa_submissions enable row level security;

-- 학생 페이지: anon으로 insert (공개 anon key 사용)
create policy "anon_insert" on qa_submissions
  for insert to anon with check (true);

-- 대시보드: anon으로 select (공개 anon key로 조회 허용)
-- 향후 service_role 전용으로 좁히려면 server API에서만 읽도록 전환 필요
create policy "anon_select" on qa_submissions
  for select to anon using (true);

-- DELETE / UPDATE: service_role 전용 (Next.js 서버 API에서 SUPABASE_SERVICE_ROLE_KEY 사용)
-- anon으로는 삭제/수정 불가 — PostgREST가 조용히 0 rows affected 반환
create policy "service_role_all" on qa_submissions
  for all to service_role using (true) with check (true);
