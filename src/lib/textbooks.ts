export const TEXTBOOK_EMOJI: Record<string, string> = {
  'RPM': '📘', '쎈': '📗', '개념원리': '📙', '개념쎈': '📕', '일품': '📓',
  '자이스토리': '📒', '올림포스': '📚', '단원평가': '📔', '개념이해도평가': '📔', '확인학습': '📔', '기타': '📋',
};

export const TEXTBOOK_ORDER = ['RPM', '쎈', '개념원리', '개념쎈', '일품', '올림포스', '자이스토리', '단원평가', '개념이해도평가', '확인학습', '기타'];

export type Question = {
  textbook: string;
  page?: number;
  number: number;
  label?: string;
  students: string[];
};

export type Classification = {
  common: Question[];
  individual: Record<string, Question[]>;
};

export function classifyQuestions(questions: Question[]): Classification {
  const common = questions.filter(q => q.students.length >= 2);
  const individualMap: Record<string, Question[]> = {};
  for (const q of questions.filter(q => q.students.length === 1)) {
    const name = q.students[0];
    if (!individualMap[name]) individualMap[name] = [];
    individualMap[name].push(q);
  }
  return { common, individual: individualMap };
}

export function buildAnalysisText(
  questions: Question[],
  submissions: { class_name: string; student_name: string }[]
): string {
  const classByStudent: Record<string, string> = {};
  for (const s of submissions) {
    const firstName = s.student_name.length <= 2 ? s.student_name : s.student_name.slice(1);
    classByStudent[firstName] = s.class_name;
    classByStudent[s.student_name] = s.class_name;
  }

  const questionsByClass: Record<string, Question[]> = {};
  for (const q of questions) {
    const cls = classByStudent[q.students[0]] || '기타';
    if (!questionsByClass[cls]) questionsByClass[cls] = [];
    questionsByClass[cls].push(q);
  }

  const lines: string[] = [];
  for (const cls of Object.keys(questionsByClass).sort()) {
    lines.push(`## 🏫 ${cls}`);
    const byTextbook: Record<string, Question[]> = {};
    for (const q of questionsByClass[cls]) {
      if (!byTextbook[q.textbook]) byTextbook[q.textbook] = [];
      byTextbook[q.textbook].push(q);
    }
    for (const tb of TEXTBOOK_ORDER) {
      if (!byTextbook[tb]) continue;
      const emoji = TEXTBOOK_EMOJI[tb] || '📖';
      lines.push(`### ${emoji} ${tb}`);
      const sorted = [...byTextbook[tb]].sort((a, b) => (a.page || 0) - (b.page || 0) || a.number - b.number);
      for (const q of sorted) {
        const label = q.label || (q.page ? `${q.page}쪽 ${q.number}번` : `${q.number}번`);
        lines.push(`${label} → ${q.students.join(', ')}`);
      }
      lines.push('');
    }
  }
  return lines.join('\n').trim();
}

export function buildVerification(questions: Question[]): string {
  const totalStudentQuestions = questions.reduce((sum, q) => sum + q.students.length, 0);
  return `✅ 질문 ${questions.length}개 (학생×문제 ${totalStudentQuestions}건)`;
}
