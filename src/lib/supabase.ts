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

// --- Auth token (WebCrypto HMAC-SHA256) ---
// secret이 없으면 토큰 생성/검증 시 에러. 런타임에 실패로 드러나게 하여 기본값 의존 사고 차단.
function getAuthSecret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error('SUPABASE_SERVICE_ROLE_KEY 미설정 — 토큰 서명 불가');
  return s;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  const bytes = new Uint8Array(sigBuf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

// 타이밍 공격 방지: 길이 먼저, 바이트 XOR 누적 후 비교.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signToken(payload: string): Promise<string> {
  return hmacSha256Hex(getAuthSecret(), payload);
}

export async function createAuthToken(): Promise<string> {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `teacher:${expires}`;
  const sig = await signToken(payload);
  return `${payload}:${sig}`;
}

export async function verifyAuthToken(token: string): Promise<boolean> {
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [role, expiresStr, sig] = parts;
  const payload = `${role}:${expiresStr}`;
  let expected: string;
  try {
    expected = await signToken(payload);
  } catch {
    return false;
  }
  if (!timingSafeEqual(expected, sig)) return false;
  if (Date.now() > Number(expiresStr)) return false;
  return true;
}
