import { NextRequest, NextResponse } from 'next/server';
import { supabase, verifyAuthToken } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest): boolean {
  const token = req.cookies.get('teacher_auth')?.value;
  if (!token) return false;
  return verifyAuthToken(token);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const grade = url.searchParams.get('grade');
  const section = url.searchParams.get('section');
  const names = url.searchParams.get('names');

  let query = supabase
    .from('qa_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate + 'T00:00:00+09:00');
  }
  if (endDate) {
    query = query.lte('created_at', endDate + 'T23:59:59+09:00');
  }
  if (grade && grade !== 'all') {
    query = query.like('class_name', `${grade}%`);
  }
  if (section && section !== 'all') {
    query = query.like('class_name', `%${section}`);
  }
  if (names) {
    const nameList = names.split(',').map((n) => n.trim()).filter(Boolean);
    if (nameList.length > 0) {
      query = query.in('student_name', nameList);
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id 파라미터 필수' }, { status: 400 });
  }

  const { error } = await supabase.from('qa_submissions').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
