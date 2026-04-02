import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();
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
    query = query.gte('created_at', startDate + 'T00:00:00');
  }
  if (endDate) {
    query = query.lte('created_at', endDate + 'T23:59:59');
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
  const supabase = getSupabase();
  const url = new URL(req.url);
  const id = url.searchParams.get('id');

  if (id) {
    const { error } = await supabase.from('qa_submissions').delete().eq('id', Number(id));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase.from('qa_submissions').delete().gte('id', 0);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
