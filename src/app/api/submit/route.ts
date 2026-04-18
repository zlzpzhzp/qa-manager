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

// 유출 대비 콘텐츠 휴리스틱: 명백한 낙서·스팸은 저장 전에 거부.
// 학생 정상 입력(교재명·페이지·번호)은 통과해야 하므로 느슨하게 잡음.
function looksLikeNoise(content: string): boolean {
  const t = content.trim();
  if (t.length < 2) return true;

  // 같은 문자 5회 이상 반복 전체 점유
  if (/^(.)\1{4,}$/.test(t)) return true;

  // 숫자/공백/쉼표만 있는데 한 자리 숫자만 나열 (예: "1 1 1 1 1")
  const compact = t.replace(/[\s,]+/g, '');
  if (/^(.)\1{4,}$/.test(compact)) return true;

  // 한 글자 반복 80% 이상 (예: "ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ 야")
  const charCounts = new Map<string, number>();
  for (const ch of t.replace(/\s/g, '')) {
    charCounts.set(ch, (charCounts.get(ch) ?? 0) + 1);
  }
  const total = [...charCounts.values()].reduce((a, b) => a + b, 0);
  const maxChar = Math.max(...charCounts.values(), 0);
  if (total >= 8 && maxChar / total >= 0.8) return true;

  // 키보드 연타: qwer/asdf/zxcv/ㅁㄴㅇㄹ 같은 시퀀스만으로 구성
  const kbPattern = /^[qwertyuiopasdfghjklzxcvbnm\s]+$/i;
  if (t.length >= 4 && kbPattern.test(t) && !/[가-힣]/.test(t)) {
    // 영문만 있고 공백 외 구조 없음 + 모음(a,e,i,o,u) 빈도 비정상
    const vowels = (t.match(/[aeiou]/gi) || []).length;
    const letters = (t.match(/[a-z]/gi) || []).length;
    if (letters >= 4 && (vowels / letters < 0.15 || vowels / letters > 0.85)) return true;
  }
  if (/^[ㄱ-ㅎㅏ-ㅣ\s]+$/.test(t) && t.replace(/\s/g, '').length >= 3) return true;

  // 한글 완성자·숫자·교재 관련 기호가 전혀 없음
  const hasMeaningful =
    /[가-힣]/.test(t) || /\d/.test(t) || /(rpm|rpm|ssen|page|p\.)/i.test(t);
  if (!hasMeaningful) return true;

  return false;
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
  if (looksLikeNoise(ct)) {
    return NextResponse.json({ error: '질문으로 보이지 않는 입력입니다. 교재명과 문제번호를 확인해주세요.' }, { status: 400 });
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
