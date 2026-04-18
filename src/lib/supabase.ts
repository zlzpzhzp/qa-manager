import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 서버 전용 admin 클라이언트 — DELETE/UPDATE 등 RLS가 service_role만 허용하는 작업용.
// 클라이언트 번들에서 process.env.SUPABASE_SERVICE_ROLE_KEY가 undefined로 치환되므로
// 이 함수는 서버 라우트(Route Handler, Server Component)에서만 호출할 것.
export function getSupabaseAdmin() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다 (서버 전용).');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type Submission = {
  id: number;
  class_name: string;
  student_name: string;
  content: string;
  created_at: string;
};
