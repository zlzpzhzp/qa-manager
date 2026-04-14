import { describe, it, expect } from 'vitest';
import { normalizeAbbreviations, parseContent, formatAnalysis } from '../src/app/api/analyze/route';

describe('normalizeAbbreviations', () => {
  it('개쎈 → 개념쎈', () => {
    expect(normalizeAbbreviations('개쎈 54쪽 21번')).toBe('개념쎈 54쪽 21번');
  });

  it('개원 → 개념원리', () => {
    expect(normalizeAbbreviations('개원 30p 18번')).toBe('개념원리 30p 18번');
  });

  it('알피엠 → RPM', () => {
    expect(normalizeAbbreviations('알피엠 136번')).toBe('RPM 136번');
  });

  it('개념쎈을 개념원리로 바꾸지 않음', () => {
    expect(normalizeAbbreviations('개념쎈 55쪽 22번')).toBe('개념쎈 55쪽 22번');
  });

  it('단평 → 단원평가', () => {
    expect(normalizeAbbreviations('단평 3번')).toBe('단원평가 3번');
  });
});

describe('parseContent', () => {
  const emptyRef = new Set<number>();

  it('RPM 번호만 추출', () => {
    const result = parseContent('민수', 'RPM 47 48 49', emptyRef);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ textbook: 'RPM', number: 47, studentName: '민수' });
    expect(result[1]).toMatchObject({ textbook: 'RPM', number: 48 });
    expect(result[2]).toMatchObject({ textbook: 'RPM', number: 49 });
  });

  it('개념쎈 쪽수+번호 파싱', () => {
    const result = parseContent('서연', '개념쎈 54쪽 21번 55쪽 24번', emptyRef);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ textbook: '개념쎈', page: 54, number: 21 });
    expect(result[1]).toMatchObject({ textbook: '개념쎈', page: 55, number: 24 });
  });

  it('한 줄에 RPM + 개념쎈 혼합', () => {
    const result = parseContent('다호', 'Rpm 64 78 개념쎈 54쪽 21번', emptyRef);
    const rpm = result.filter(r => r.textbook === 'RPM');
    const gs = result.filter(r => r.textbook === '개념쎈');
    expect(rpm).toHaveLength(2);
    expect(gs).toHaveLength(1);
    expect(gs[0]).toMatchObject({ page: 54, number: 21 });
  });

  it('쎈은 쪽수 무시', () => {
    const result = parseContent('지훈', '쎈 53쪽 147번 158번', emptyRef);
    // 53은 쪽수로 표기됐지만 쎈은 번호만 교재이므로 쪽수 무시
    const nums = result.map(r => r.number);
    expect(nums).toContain(147);
    expect(nums).toContain(158);
    // 53은 쪽수 마커가 붙어있으므로 제거되어야 함
    expect(nums).not.toContain(53);
  });

  it('개념원리 p.55-24,25번 형식', () => {
    const result = parseContent('예진', '개념쎈 p.55-24,25번', emptyRef);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const nums = result.map(r => r.number);
    expect(nums).toContain(24);
    expect(nums).toContain(25);
  });

  it('줄임말 자동 변환', () => {
    const result = parseContent('철수', '개쎈 53쪽 15번', emptyRef);
    expect(result[0].textbook).toBe('개념쎈');
  });
});

describe('formatAnalysis — N=N\' 검증', () => {
  it('단일 학생 RPM', () => {
    const subs = [
      { id: 1, class_name: '중2S', student_name: '김민수', content: 'RPM 47 48 49', created_at: '2026-04-01T12:00:00Z' },
    ];
    const { totalInput, totalOutput } = formatAnalysis(subs);
    expect(totalInput).toBe(totalOutput);
    expect(totalInput).toBe(3);
  });

  it('여러 학생 혼합 교재', () => {
    const subs = [
      { id: 1, class_name: '중2S', student_name: '이승아', content: '개념쎈 53쪽 15번 개념쎈 54쪽 21번 Rpm 159번', created_at: '2026-04-01T12:00:00Z' },
      { id: 2, class_name: '중2S', student_name: '김서연', content: 'RPM 78 163', created_at: '2026-04-01T12:00:00Z' },
    ];
    const { totalInput, totalOutput } = formatAnalysis(subs);
    expect(totalInput).toBe(totalOutput);
  });

  it('같은 문제 여러 학생 — 중복 카운트', () => {
    const subs = [
      { id: 1, class_name: '중2S', student_name: '김민수', content: 'RPM 47', created_at: '2026-04-01T12:00:00Z' },
      { id: 2, class_name: '중2S', student_name: '이영희', content: 'RPM 47', created_at: '2026-04-01T12:00:00Z' },
    ];
    const { totalInput, totalOutput, result } = formatAnalysis(subs);
    expect(totalInput).toBe(2);
    expect(totalOutput).toBe(2);
    expect(result).toContain('민수');
    expect(result).toContain('영희');
  });

  it('교재별 섹션 분리 확인', () => {
    const subs = [
      { id: 1, class_name: '중2S', student_name: '최지훈', content: 'RPM 47 개념쎈 53p 13', created_at: '2026-04-01T12:00:00Z' },
    ];
    const { result } = formatAnalysis(subs);
    expect(result).toContain('RPM');
    expect(result).toContain('개념쎈');
  });
});
