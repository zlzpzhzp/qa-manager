import { describe, it, expect } from 'vitest';
import { classifyQuestions, buildAnalysisText, buildVerification, type Question } from '../src/lib/textbooks';

describe('classifyQuestions', () => {
  it('2명 이상은 common, 1명은 individual', () => {
    const questions: Question[] = [
      { textbook: 'RPM', number: 47, students: ['민수', '서연'] },
      { textbook: 'RPM', number: 48, students: ['민수'] },
      { textbook: '개념쎈', page: 54, number: 21, students: ['서연', '지훈', '민수'] },
    ];
    const { common, individual } = classifyQuestions(questions);
    expect(common).toHaveLength(2);
    expect(common[0].students).toContain('민수');
    expect(common[0].students).toContain('서연');
    expect(Object.keys(individual)).toEqual(['민수']);
    expect(individual['민수']).toHaveLength(1);
    expect(individual['민수'][0].number).toBe(48);
  });

  it('모두 공통이면 individual 비어있음', () => {
    const questions: Question[] = [
      { textbook: 'RPM', number: 47, students: ['민수', '서연'] },
    ];
    const { common, individual } = classifyQuestions(questions);
    expect(common).toHaveLength(1);
    expect(Object.keys(individual)).toHaveLength(0);
  });

  it('빈 배열 처리', () => {
    const { common, individual } = classifyQuestions([]);
    expect(common).toHaveLength(0);
    expect(Object.keys(individual)).toHaveLength(0);
  });
});

describe('buildAnalysisText', () => {
  it('반별 → 교재별 → 번호순 정렬', () => {
    const questions: Question[] = [
      { textbook: 'RPM', number: 48, students: ['민수'] },
      { textbook: 'RPM', number: 47, students: ['민수', '서연'] },
      { textbook: '개념쎈', page: 54, number: 21, students: ['민수'] },
    ];
    const submissions = [
      { class_name: '중2S', student_name: '김민수' },
      { class_name: '중2S', student_name: '이서연' },
    ];
    const text = buildAnalysisText(questions, submissions);
    expect(text).toContain('🏫 중2S');
    expect(text).toContain('📘 RPM');
    expect(text).toContain('📕 개념쎈');
    // 번호순 정렬: 47 before 48
    const idx47 = text.indexOf('47번');
    const idx48 = text.indexOf('48번');
    expect(idx47).toBeLessThan(idx48);
  });

  it('이모지 매핑 정확성', () => {
    const questions: Question[] = [
      { textbook: '개념원리', page: 31, number: 5, students: ['도현'] },
    ];
    const submissions = [{ class_name: '중2H', student_name: '김도현' }];
    const text = buildAnalysisText(questions, submissions);
    expect(text).toContain('📙 개념원리');
    expect(text).toContain('31쪽 5번');
  });

  it('자이스토리 label 사용', () => {
    const questions: Question[] = [
      { textbook: '자이스토리', number: 58, label: 'F58', students: ['민수'] },
    ];
    const submissions = [{ class_name: '고1S', student_name: '김민수' }];
    const text = buildAnalysisText(questions, submissions);
    expect(text).toContain('F58');
  });

  it('페이지 없는 교재는 번호만', () => {
    const questions: Question[] = [
      { textbook: 'RPM', number: 342, students: ['민수'] },
    ];
    const submissions = [{ class_name: '중2S', student_name: '김민수' }];
    const text = buildAnalysisText(questions, submissions);
    expect(text).toContain('342번');
    expect(text).not.toContain('쪽');
  });
});

describe('buildVerification', () => {
  it('질문 수와 학생×문제 건수 정확', () => {
    const questions: Question[] = [
      { textbook: 'RPM', number: 47, students: ['민수', '서연'] },
      { textbook: 'RPM', number: 48, students: ['민수'] },
    ];
    const v = buildVerification(questions);
    expect(v).toContain('질문 2개');
    expect(v).toContain('학생×문제 3건');
  });

  it('빈 배열', () => {
    const v = buildVerification([]);
    expect(v).toContain('질문 0개');
    expect(v).toContain('학생×문제 0건');
  });
});
