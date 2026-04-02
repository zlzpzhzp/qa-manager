import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const correctPin = process.env.TEACHER_PIN || '0999';

  if (pin === correctPin) {
    const res = NextResponse.json({ success: true });
    res.cookies.set('teacher_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return res;
  }

  return NextResponse.json({ success: false, error: '잘못된 핀번호입니다.' }, { status: 401 });
}
