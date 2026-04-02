-- Supabase에서 SQL Editor로 실행하세요

create table qa_submissions (
  id bigint generated always as identity primary key,
  class_name text not null,
  student_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- RLS 활성화
alter table qa_submissions enable row level security;

-- 누구나 insert 가능 (학생용)
create policy "Anyone can insert" on qa_submissions
  for insert with check (true);

-- 누구나 select 가능 (대시보드용)
create policy "Anyone can select" on qa_submissions
  for select using (true);

-- 누구나 delete 가능 (선생님 삭제 - 서버에서 auth 검증)
create policy "Anyone can delete" on qa_submissions
  for delete using (true);
