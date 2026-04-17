import { describe, it, expect } from 'vitest';
import { supabase, getSupabaseAdmin } from '../src/lib/supabase';

const testSubmission = {
  class_name: '중1S',
  student_name: '테스트학생',
  content: 'RPM 999 998 997',
};

let insertedId: number;

describe('submissions CRUD', () => {
  it('INSERT — service_role로 삽입', async () => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('qa_submissions')
      .insert(testSubmission)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.student_name).toBe('테스트학생');
    expect(data!.content).toBe('RPM 999 998 997');
    insertedId = data!.id;
  });

  it('INSERT — anon은 RLS로 차단 (H4)', async () => {
    const { error } = await supabase.from('qa_submissions').insert(testSubmission);
    expect(error).toBeTruthy();
  });

  it('SELECT — anon으로 조회 가능', async () => {
    const { data, error } = await supabase
      .from('qa_submissions')
      .select('*')
      .eq('id', insertedId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.class_name).toBe('중1S');
  });

  it('SELECT — 날짜 필터', async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('qa_submissions')
      .select('*')
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59');

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThan(0);
  });

  it('SELECT — 반 필터', async () => {
    const { data, error } = await supabase
      .from('qa_submissions')
      .select('*')
      .like('class_name', '중1%');

    expect(error).toBeNull();
    expect(data!.some((d) => d.id === insertedId)).toBe(true);
  });

  it('DELETE — service_role로 삭제', async () => {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('qa_submissions').delete().eq('id', insertedId);
    expect(error).toBeNull();

    const { data } = await admin
      .from('qa_submissions')
      .select('*')
      .eq('id', insertedId)
      .maybeSingle();
    expect(data).toBeNull();
  });
});
