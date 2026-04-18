import { NextRequest, NextResponse } from 'next/server';
import { createAuthToken, getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 15분 창에 5회 실패하면 15분 차단. 서버리스에서도 동작하도록 DB 기반.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const submittedPin = (pin ?? '').toString().trim();
  const correctPin = (process.env.TEACHER_PIN ?? '0999').trim();
  const ip = clientIp(req);
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count: fails } = await admin
    .from('qa_auth_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('success', false)
    .gte('attempted_at', since);

  if ((fails ?? 0) >= MAX_FAILS) {
    return NextResponse.json(
      { success: false, error: '시도 횟수 초과. 15분 후 다시 시도하세요.' },
      { status: 429 }
    );
  }

  const ok = submittedPin === correctPin;
  await admin.from('qa_auth_attempts').insert({ ip, success: ok });

  if (ok) {
    const token = await createAuthToken();
    const res = NextResponse.json({ success: true });
    res.cookies.set('teacher_auth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    return res;
  }

  return NextResponse.json({ success: false, error: '잘못된 핀번호입니다.' }, { status: 401 });
}
