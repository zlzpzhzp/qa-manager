import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '../src/lib/supabase';

// 테스트용 데이터
const testSubmission = {
  class_name: '중1S',
  student_name: '테스트학생',
  content: 'RPM 999 998 997',
};

let insertedId: number;

describe('submissions CRUD (Supabase 직접)', () => {
  it('INSERT — 데이터 삽입', async () => {
    const { data, error } = await supabase
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

  it('SELECT — 삽입된 데이터 조회', async () => {
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
    expect(data!.some(d => d.id === insertedId)).toBe(true);
  });

  it('DELETE — 데이터 삭제', async () => {
    const { error } = await supabase
      .from('qa_submissions')
      .delete()
      .eq('id', insertedId);

    expect(error).toBeNull();

    // 삭제 확인
    const { data } = await supabase
      .from('qa_submissions')
      .select('*')
      .eq('id', insertedId)
      .single();

    expect(data).toBeNull();
  });
});
