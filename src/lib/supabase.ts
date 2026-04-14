import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Submission = {
  id: number;
  class_name: string;
  student_name: string;
  content: string;
  created_at: string;
};

// --- Auth token (simple hash, no crypto dependency) ---
const AUTH_SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function signToken(payload: string): string {
  return simpleHash(payload + AUTH_SECRET + payload);
}

export function createAuthToken(): string {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  const payload = `teacher:${expires}`;
  const sig = signToken(payload);
  return `${payload}:${sig}`;
}

export function verifyAuthToken(token: string): boolean {
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [role, expiresStr, sig] = parts;
  const payload = `${role}:${expiresStr}`;
  if (signToken(payload) !== sig) return false;
  if (Date.now() > Number(expiresStr)) return false;
  return true;
}
