import { NextRequest, NextResponse } from 'next/server';

type Submission = {
  id: number;
  class_name: string;
  student_name: string;
  content: string;
  created_at: string;
};

type ParsedQuestion = {
  textbook: string;
  page?: number;
  number: number;
  studentName: string;
  label?: string; // 자이스토리용 (F58, E67 등)
};

// --- Abbreviation / alias map ---
const TEXTBOOK_ALIASES: [RegExp, string][] = [
  // 순서 중요: 긴 패턴 먼저
  [/개념원리/g, '개념원리'],
  [/개념쎈/g, '개념쎈'],
  [/개쎈/g, '개념쎈'],
  [/개원/g, '개념원리'],
  [/자이스토리/g, '자이스토리'],
  [/자이/g, '자이스토리'],
  [/단평/g, '단원평가'],
  [/개이평/g, '개념이해도평가'],
  [/알피엠/gi, 'RPM'],
];

// hasPage: true = 단원별 번호 리셋 교재 (페이지 필요), false = 연속번호 교재 (페이지 무시)
// type: 'alpha' = 알파벳+번호 형식 (자이스토리)
const TEXTBOOK_PATTERNS: { regex: RegExp; name: string; hasPage: boolean; type?: string }[] = [
  { regex: /개념원리/i, name: '개념원리', hasPage: true },
  { regex: /개념쎈|개쎈/i, name: '개념쎈', hasPage: true },
  { regex: /일품/i, name: '일품', hasPage: true },
  { regex: /자이스토리|자이/i, name: '자이스토리', hasPage: false, type: 'alpha' },
  { regex: /RPM|rpm|알피엠/i, name: 'RPM', hasPage: false },
  { regex: /쎈\s*\d|쎈(?!.*개념)|쎈$/i, name: '쎈', hasPage: false },
  { regex: /단원평가|단평/i, name: '단원평가', hasPage: false },
  { regex: /개념이해도|개이평/i, name: '개념이해도평가', hasPage: false },
  { regex: /확인학습/i, name: '확인학습', hasPage: false },
];

function getFirstName(fullName: string): string {
  const name = fullName.trim();
  if (name.length <= 2) return name;
  return name.slice(1);
}

// --- Normalize abbreviations in raw text ---
function normalizeAbbreviations(text: string): string {
  let result = text;
  for (const [regex, full] of TEXTBOOK_ALIASES) {
    result = result.replace(new RegExp(regex.source, regex.flags || 'g'), full);
  }
  return result;
}

// --- Split concatenated numbers ---
// e.g., "136138" → [136, 138] if both appear in reference set
// e.g., "13971398" → [1397, 1398]
function splitConcatenatedNumbers(numStr: string, referenceNumbers: Set<number>): number[] {
  const num = parseInt(numStr);

  // If the number itself is in references, it's fine as-is
  if (referenceNumbers.has(num)) return [num];

  // Only try to split numbers that are suspiciously large (6+ digits)
  if (numStr.length < 4) return [num];

  // Try splitting into two equal-length parts
  const len = numStr.length;
  const candidates: number[][] = [];

  for (let i = 1; i < len; i++) {
    const left = parseInt(numStr.slice(0, i));
    const right = parseInt(numStr.slice(i));
    if (right > 0 && !numStr.slice(i).startsWith('0')) {
      // Prefer splits where both numbers are in reference set
      const bothInRef = referenceNumbers.has(left) && referenceNumbers.has(right);
      // Or where numbers are close to each other (consecutive-ish)
      const closeNumbers = Math.abs(left - right) < 50 && left > 0 && right > 0;
      // Or where they have similar digit count
      const similarLength = Math.abs(numStr.slice(0, i).length - numStr.slice(i).length) <= 1;

      if (bothInRef) {
        return [left, right]; // Best case: both found in references
      }
      if (closeNumbers && similarLength) {
        candidates.push([left, right]);
      }
    }
  }

  // If we found reasonable splits, use the best one
  if (candidates.length > 0) {
    return candidates[0];
  }

  return [num];
}

// --- Build a reference number set from all submissions for cross-referencing ---
function buildReferenceNumbers(submissions: Submission[]): Set<number> {
  const nums = new Set<number>();
  for (const s of submissions) {
    const matches = s.content.match(/\d+/g);
    if (matches) {
      for (const m of matches) {
        const n = parseInt(m);
        if (n > 0 && n < 10000) nums.add(n);
      }
    }
  }
  return nums;
}

// Split content into segments by textbook mentions
// e.g. "Rpm 64 78 개념쎈 54쪽 21번" → [{textbook: RPM, text: "64 78"}, {textbook: 개념쎈, text: "54쪽 21번"}]
function splitByTextbook(text: string): { textbook: typeof TEXTBOOK_PATTERNS[number] | null; text: string }[] {
  type Match = { textbook: typeof TEXTBOOK_PATTERNS[number]; index: number; length: number };
  const allMatches: Match[] = [];

  // Find all textbook mentions and their positions
  for (const tp of TEXTBOOK_PATTERNS) {
    const globalRegex = new RegExp(tp.regex.source, 'gi');
    let m;
    while ((m = globalRegex.exec(text)) !== null) {
      allMatches.push({ textbook: tp, index: m.index, length: m[0].length });
    }
  }

  if (allMatches.length === 0) {
    return [{ textbook: null, text }];
  }

  // Sort by position, then by match length descending (longer match wins)
  allMatches.sort((a, b) => a.index - b.index || b.length - a.length);

  // Deduplicate overlapping matches — longer match wins
  const deduped: Match[] = [];
  for (const match of allMatches) {
    const last = deduped[deduped.length - 1];
    if (last) {
      const lastEnd = last.index + last.length;
      if (match.index < lastEnd) continue; // overlapping, skip shorter
    }
    deduped.push(match);
  }

  // Merge consecutive same-textbook segments and extract text between mentions
  const result: { textbook: typeof TEXTBOOK_PATTERNS[number] | null; text: string }[] = [];
  for (let i = 0; i < deduped.length; i++) {
    const cur = deduped[i];
    const matchEnd = cur.index + cur.length;
    const nextStart = i + 1 < deduped.length ? deduped[i + 1].index : text.length;
    const segText = text.slice(matchEnd, nextStart).trim();
    // Remove version info like "3-1" at the start
    const cleaned = segText.replace(/^\s*\d+-\d+\s*/, '');

    // If same textbook as previous segment, merge the text
    const prev = result[result.length - 1];
    if (prev && prev.textbook && prev.textbook.name === cur.textbook.name) {
      prev.text = prev.text + ' ' + cleaned;
    } else {
      result.push({ textbook: cur.textbook, text: cleaned });
    }
  }

  return result;
}

// Parse a segment for a page-based textbook (개념원리, 개념쎈)
function parsePageBasedSegment(
  textbook: string,
  text: string,
  studentName: string,
  referenceNumbers: Set<number>
): ParsedQuestion[] {
  const results: ParsedQuestion[] = [];

  // Find all page markers: "54쪽", "54p", "p.54", "p54", "p.55-"
  const pagePattern = /(?:(\d+)\s*(?:쪽|p(?:age)?(?:\.)?)|p\.?\s*(\d+))/gi;
  const pageMatches = [...text.matchAll(pagePattern)];

  if (pageMatches.length > 0) {
    for (let i = 0; i < pageMatches.length; i++) {
      const pm = pageMatches[i];
      const page = parseInt(pm[1] || pm[2]);
      const start = pm.index! + pm[0].length;
      const end = i + 1 < pageMatches.length ? pageMatches[i + 1].index! : text.length;
      const segment = text.slice(start, end);
      // Extract numbers, stopping at next page marker or textbook name
      const rawNums = segment.match(/\d+/g);
      if (rawNums) {
        for (const n of rawNums) {
          const split = splitConcatenatedNumbers(n, referenceNumbers);
          for (const sn of split) {
            results.push({ textbook, page, number: sn, studentName });
          }
        }
      }
    }
  } else {
    // No page markers — just extract numbers without page info
    // (페이지 마커 없이 번호만 나열된 경우, 페이지 0으로 처리)
    const nums = text.match(/\d+/g);
    if (nums) {
      for (const n of nums) {
        const split = splitConcatenatedNumbers(n, referenceNumbers);
        for (const sn of split) {
          results.push({ textbook, page: 0, number: sn, studentName });
        }
      }
    }
  }

  return results;
}

// Parse a segment for a number-based textbook (RPM, 쎈)
// 쪽수 마커가 있어도 무시하고 번호만 추출
function parseNumberBasedSegment(
  textbook: string,
  text: string,
  studentName: string,
  referenceNumbers: Set<number>
): ParsedQuestion[] {
  const results: ParsedQuestion[] = [];
  // Remove version info (3-1 등), page markers (쪽수 무시)
  let cleaned = text.replace(/\d+-\d+/g, '');
  // Remove page markers and the number before them: "53쪽", "53p", "p.53"
  cleaned = cleaned.replace(/\d+\s*(?:쪽|p(?:age)?(?:\.)?)/gi, '');
  cleaned = cleaned.replace(/p\.?\s*\d+/gi, '');
  const rawNums = cleaned.match(/\d+/g);
  if (rawNums) {
    for (const n of rawNums) {
      const split = splitConcatenatedNumbers(n, referenceNumbers);
      for (const sn of split) {
        results.push({ textbook, number: sn, studentName });
      }
    }
  }
  return results;
}

// Parse a segment for alpha+number textbook (자이스토리: F58, E67 등)
function parseAlphaNumberSegment(
  textbook: string,
  text: string,
  studentName: string
): ParsedQuestion[] {
  const results: ParsedQuestion[] = [];
  // Match patterns like F58, E67, B31
  const matches = text.matchAll(/([A-Za-z])[\s-]*(\d+)/g);
  for (const m of matches) {
    const label = m[1].toUpperCase() + m[2];
    results.push({ textbook, number: parseInt(m[2]), studentName, label });
  }
  return results;
}

function parseContent(
  studentName: string,
  content: string,
  referenceNumbers: Set<number>
): ParsedQuestion[] {
  const results: ParsedQuestion[] = [];
  const normalized = normalizeAbbreviations(content);
  // Treat full content as one block — don't split by newlines first
  // This handles cases where textbooks are on the same line or split across lines
  const fullText = normalized.replace(/\n/g, ' ');

  const segments = splitByTextbook(fullText);

  for (const seg of segments) {
    if (!seg.textbook) {
      // No textbook found — treat numbers as unknown
      const rawNums = seg.text.match(/\d+/g);
      if (rawNums) {
        for (const n of rawNums) {
          const split = splitConcatenatedNumbers(n, referenceNumbers);
          for (const sn of split) {
            results.push({ textbook: '기타', number: sn, studentName });
          }
        }
      }
      continue;
    }

    if (seg.textbook.type === 'alpha') {
      results.push(...parseAlphaNumberSegment(seg.textbook.name, seg.text, studentName));
    } else if (seg.textbook.hasPage) {
      results.push(...parsePageBasedSegment(seg.textbook.name, seg.text, studentName, referenceNumbers));
    } else {
      results.push(...parseNumberBasedSegment(seg.textbook.name, seg.text, studentName, referenceNumbers));
    }
  }

  return results;
}

function formatAnalysis(submissions: Submission[]): {
  result: string;
  totalInput: number;
  totalOutput: number;
  corrections: string[];
} {
  const referenceNumbers = buildReferenceNumbers(submissions);
  const corrections: string[] = [];

  // Check for duplicate first names across all submissions
  const allNames = submissions.map((s) => s.student_name);
  const firstNameCount: Record<string, string[]> = {};
  for (const name of allNames) {
    const first = getFirstName(name);
    if (!firstNameCount[first]) firstNameCount[first] = [];
    if (!firstNameCount[first].includes(name)) {
      firstNameCount[first].push(name);
    }
  }

  const getDisplayName = (fullName: string) => {
    const first = getFirstName(fullName);
    if (firstNameCount[first] && firstNameCount[first].length > 1) {
      return fullName;
    }
    return first;
  };

  // Detect abbreviation usage for correction log
  for (const s of submissions) {
    const original = s.content;
    const normalized = normalizeAbbreviations(original);
    if (original !== normalized) {
      for (const [regex, full] of TEXTBOOK_ALIASES) {
        const testRegex = new RegExp(regex.source, regex.flags || 'gi');
        const match = original.match(testRegex);
        if (match) {
          for (const m of match) {
            if (m !== full) {
              const msg = `${getDisplayName(s.student_name)}: "${m}" → "${full}" 변환`;
              if (!corrections.includes(msg)) corrections.push(msg);
            }
          }
        }
      }
    }
  }

  // Group by class
  const byClass: Record<string, Submission[]> = {};
  for (const s of submissions) {
    if (!byClass[s.class_name]) byClass[s.class_name] = [];
    byClass[s.class_name].push(s);
  }

  // --- Fill missing pages by cross-referencing other students ---
  function fillMissingPages(questions: ParsedQuestion[], corrections: string[]): ParsedQuestion[] {
    // Build a map of textbook+number → page from questions that have pages
    const pageMap: Record<string, number> = {};
    for (const q of questions) {
      if (q.page && q.page > 0) {
        const key = `${q.textbook}-${q.number}`;
        if (!pageMap[key]) pageMap[key] = q.page;
      }
    }

    return questions.map((q) => {
      if (q.page === 0 || q.page === undefined) {
        const key = `${q.textbook}-${q.number}`;
        if (pageMap[key]) {
          corrections.push(
            `${q.studentName}: ${q.textbook} ${q.number}번 → ${pageMap[key]}쪽 (다른 학생 데이터 대조)`
          );
          return { ...q, page: pageMap[key] };
        }
      }
      return q;
    });
  }

  // --- Page correction helper ---
  // For page-based textbooks, if most students wrote page X for a given number
  // and one student wrote page X+1 or X-1, correct it
  function correctPages(questions: ParsedQuestion[]): ParsedQuestion[] {
    // Group by textbook + number to find the majority page
    const pageVotes: Record<string, Record<number, string[]>> = {};
    for (const q of questions) {
      if (q.page === undefined) continue;
      const key = `${q.textbook}-${q.number}`;
      if (!pageVotes[key]) pageVotes[key] = {};
      if (!pageVotes[key][q.page]) pageVotes[key][q.page] = [];
      pageVotes[key][q.page].push(q.studentName);
    }

    // Also group by textbook + page to find majority numbers on each page
    const pageNumbers: Record<string, Set<number>> = {};
    for (const q of questions) {
      if (q.page === undefined) continue;
      const key = `${q.textbook}-${q.page}`;
      if (!pageNumbers[key]) pageNumbers[key] = new Set();
      pageNumbers[key].add(q.number);
    }

    return questions.map((q) => {
      if (q.page === undefined) return q;

      const key = `${q.textbook}-${q.number}`;
      const votes = pageVotes[key];
      if (!votes) return q;

      const pages = Object.keys(votes).map(Number);
      if (pages.length <= 1) {
        // Only one page for this number - check if this page has similar numbers
        // by looking at adjacent pages
        const adjPages = [q.page - 1, q.page + 1];
        for (const adjPage of adjPages) {
          const adjKey = `${q.textbook}-${adjPage}`;
          const adjNums = pageNumbers[adjKey];
          if (adjNums && adjNums.size >= 2) {
            // Adjacent page has multiple numbers - check if our number fits better there
            const curKey = `${q.textbook}-${q.page}`;
            const curNums = pageNumbers[curKey];
            if (curNums && curNums.size <= 1 && adjNums.has(q.number)) {
              // This number exists on the adjacent page too, and our page is lonely
              // Don't correct - not enough evidence
            }
          }
        }
        return q;
      }

      // Multiple pages for same number - find majority
      let maxCount = 0;
      let majorityPage = q.page;
      for (const [page, names] of Object.entries(votes)) {
        if (names.length > maxCount) {
          maxCount = names.length;
          majorityPage = Number(page);
        }
      }

      // Only correct if difference is 1-2 pages and majority has 2+ votes
      if (q.page !== majorityPage && Math.abs(q.page - majorityPage) <= 2 && maxCount >= 2) {
        corrections.push(
          `${q.studentName}: ${q.textbook} ${q.page}쪽→${majorityPage}쪽 ${q.number}번 (다수 기준 교정)`
        );
        return { ...q, page: majorityPage };
      }

      return q;
    });
  }

  let totalInput = 0;
  let totalOutput = 0;
  const lines: string[] = [];

  const sortedClasses = Object.keys(byClass).sort();

  for (const cls of sortedClasses) {
    const subs = byClass[cls];
    const allQuestions: ParsedQuestion[] = [];

    for (const s of subs) {
      const displayName = getDisplayName(s.student_name);
      const parsed = parseContent(displayName, s.content, referenceNumbers);

      // Detect concatenated number splits for correction log
      const rawNums = s.content.match(/\d{5,}/g);
      if (rawNums) {
        for (const rn of rawNums) {
          const split = splitConcatenatedNumbers(rn, referenceNumbers);
          if (split.length > 1) {
            corrections.push(`${displayName}: "${rn}" → "${split.join(', ')}" 분리`);
          }
        }
      }

      totalInput += parsed.length;
      allQuestions.push(...parsed);
    }

    // Fill in missing pages by cross-referencing other students' data
    // 쪽수 없는 학생(page=0)의 번호를 다른 학생이 같은 교재에서 같은 번호에 쓴 쪽수로 채움
    const filledQuestions = fillMissingPages(allQuestions, corrections);

    // Apply page correction across all questions in this class
    const correctedQuestions = correctPages(filledQuestions);

    // Group by textbook
    const byTextbook: Record<string, ParsedQuestion[]> = {};
    for (const q of correctedQuestions) {
      if (!byTextbook[q.textbook]) byTextbook[q.textbook] = [];
      byTextbook[q.textbook].push(q);
    }

    const TEXTBOOK_EMOJI: Record<string, string> = {
      'RPM': '📘',
      '쎈': '📗',
      '개념원리': '📙',
      '개념쎈': '📕',
      '일품': '📓',
      '자이스토리': '📒',
      '단원평가': '📔',
      '개념이해도평가': '📔',
      '확인학습': '📔',
      '기타': '📋',
    };

    lines.push(`## 🏫 ${cls}`);

    const textbookOrder = ['RPM', '쎈', '개념원리', '개념쎈', '일품', '자이스토리', '단원평가', '개념이해도평가', '확인학습', '기타'];
    for (const tb of textbookOrder) {
      if (!byTextbook[tb]) continue;
      const questions = byTextbook[tb];
      const emoji = TEXTBOOK_EMOJI[tb] || '📖';

      lines.push(`### ${emoji} ${tb}`);

      // 자이스토리: 알파벳+번호 형식
      if (tb === '자이스토리') {
        const byLabel: Record<string, string[]> = {};
        for (const q of questions) {
          const key = q.label || String(q.number);
          if (!byLabel[key]) byLabel[key] = [];
          if (!byLabel[key].includes(q.studentName)) {
            byLabel[key].push(q.studentName);
          }
        }
        const sorted = Object.keys(byLabel).sort();
        for (const label of sorted) {
          const names = byLabel[label];
          lines.push(`${label} → ${names.join(', ')}`);
          totalOutput += names.length;
        }
      } else if (['개념원리', '개념쎈', '일품'].includes(tb)) {
        const byPageNum: Record<string, string[]> = {};
        for (const q of questions) {
          const key = `${q.page || 0}-${q.number}`;
          if (!byPageNum[key]) byPageNum[key] = [];
          if (!byPageNum[key].includes(q.studentName)) {
            byPageNum[key].push(q.studentName);
          }
        }
        const sorted = Object.keys(byPageNum).sort((a, b) => {
          const [ap, an] = a.split('-').map(Number);
          const [bp, bn] = b.split('-').map(Number);
          return ap - bp || an - bn;
        });
        for (const key of sorted) {
          const [page, num] = key.split('-');
          const names = byPageNum[key];
          if (Number(page) === 0) {
            lines.push(`(쪽수미상) ${num}\uBC88 \u2192 ${names.join(', ')}`);
          } else {
            lines.push(`${page}\uCABD ${num}\uBC88 \u2192 ${names.join(', ')}`);
          }
          totalOutput += names.length;
        }
      } else {
        const byNum: Record<number, string[]> = {};
        for (const q of questions) {
          if (!byNum[q.number]) byNum[q.number] = [];
          if (!byNum[q.number].includes(q.studentName)) {
            byNum[q.number].push(q.studentName);
          }
        }
        const sorted = Object.keys(byNum).map(Number).sort((a, b) => a - b);
        for (const num of sorted) {
          const names = byNum[num];
          lines.push(`${num}\uBC88 \u2192 ${names.join(', ')}`);
          totalOutput += names.length;
        }
      }
      lines.push('');
    }
  }

  return { result: lines.join('\n'), totalInput, totalOutput, corrections };
}

export async function POST(req: NextRequest) {
  const { submissions } = (await req.json()) as { submissions: Submission[] };

  if (!submissions || submissions.length === 0) {
    return NextResponse.json({ error: '\uBD84\uC11D\uD560 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.' }, { status: 400 });
  }

  const { result, totalInput, totalOutput, corrections } = formatAnalysis(submissions);

  const verification =
    totalInput === totalOutput
      ? `\u2705 N=N'=${totalOutput} \uAC80\uC99D\uC644\uB8CC`
      : `\u274C N=${totalInput}, N'=${totalOutput} \u2014 \uBD88\uC77C\uCE58! \uD655\uC778\uD544\uC694`;

  return NextResponse.json({
    analysis: result,
    verification,
    totalInput,
    totalOutput,
    corrections,
  });
}
