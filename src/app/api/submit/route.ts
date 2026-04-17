import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// 60초 창 10건 초과 시 차단. 학생 정상 사용(한 번에 1~2건)은 여유롭게 통과,
// 스크립트 flood는 즉시 차단.
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;
const MAX_CONTENT = 3000;
const MAX_NAME = 50;
const MAX_CLASS = 30;

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  let body: { class_name?: unknown; student_name?: unknown; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }
  const { class_name, student_name, content } = body;

  if (typeof class_name !== 'string' || typeof student_name !== 'string' || typeof content !== 'string') {
    return NextResponse.json({ error: '필드 누락' }, { status: 400 });
  }
  const cn = class_name.trim();
  const sn = student_name.trim();
  const ct = content.trim();
  if (!cn || !sn || !ct) return NextResponse.json({ error: '필드 누락' }, { status: 400 });
  if (cn.length > MAX_CLASS || sn.length > MAX_NAME || ct.length > MAX_CONTENT) {
    return NextResponse.json({ error: '입력이 너무 깁니다.' }, { status: 400 });
  }

  const ip = clientIp(req);
  const admin = getSupabaseAdmin();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count } = await admin
    .from('qa_submit_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('attempted_at', since);

  if ((count ?? 0) >= MAX_PER_WINDOW) {
    return NextResponse.json({ error: '잠시 후 다시 시도해주세요.' }, { status: 429 });
  }

  await admin.from('qa_submit_attempts').insert({ ip });

  const { error } = await admin
    .from('qa_submissions')
    .insert({ class_name: cn, student_name: sn, content: ct });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
