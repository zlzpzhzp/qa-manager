import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const all = url.searchParams.get('all');

  const admin = getSupabaseAdmin();
  let query = admin.from('qa_submissions').delete({ count: 'exact' });

  if (id) {
    query = query.eq('id', Number(id));
  } else if (all === 'true') {
    // 현재 필터된 범위 내 전체 삭제 (선생님 "전체 삭제" 버튼용).
    // 조건 없는 delete는 PostgREST가 거부하므로 id>=0 으로 전체 지정.
    query = query.gte('id', 0);
  } else {
    return NextResponse.json(
      { error: 'id 또는 all=true 파라미터 필수' },
      { status: 400 }
    );
  }

  const { error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, deleted: count ?? 0 });
}
