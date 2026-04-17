import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/supabase';

// /teacher 페이지와 보호 대상 API는 teacher_auth 쿠키 HMAC 검증 통과해야 접근 가능.
// submissions route는 자체 checkAuth로 이중 방어. 여기선 UI/분석 엔드포인트 게이트.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get('teacher_auth')?.value;
  const ok = token ? await verifyAuthToken(token) : false;

  if (ok) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/login', req.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/teacher/:path*', '/api/analyze', '/api/chat'],
};
