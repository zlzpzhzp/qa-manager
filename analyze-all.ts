import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('/root/qa-manager/.env.local', 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const GEMINI_KEY = env.GEMINI_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !GEMINI_KEY) {
  console.error('env 누락', { u: !!SUPABASE_URL, s: !!SERVICE_KEY, g: !!GEMINI_KEY });
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type Sub = { id: number; class_name: string; student_name: string; content: string; created_at: string };

function buildPrompt(submissionsText: string): string {
  return `너는 DM학원 수학 질문정리 전문 봇이야. 학생들이 제출한 질문 데이터를 파싱하여 구조화된 JSON으로 변환해야 해.

## 학생 제출 데이터
${submissionsText}

## 파싱 규칙

### 교재 인식 (매우 중요!)
- 정규 교재: RPM, 쎈, 개념원리, 개념쎈, 일품, 자이스토리, 올림포스, 단원평가, 개념이해도평가, 확인학습
- **비정규 교재 (학습지, 프린트, 모의고사 등)**: 학생이 쓴 원문 그대로 교재명으로 사용!
- **절대 누락 금지**: 인식 못 하는 교재명이라도 원문 그대로 textbook 필드에 넣고, 번호도 파싱해서 포함할 것
- 어떤 질문도 빠뜨리면 안 됨. 파싱이 불확실하면 corrections에 표시하되 반드시 questions에 포함

### 교재명 없이 숫자만/학년학기만 있는 입력 (매우 중요!)
학생이 "678", "111", "2-1", "3-1" 같이 교재명 없이 번호나 학년-학기만 적었을 때:
1. 본인의 같은 제출에 교재명이 앞서 나왔으면 그 교재로 상속
2. 같은 그룹(같은 반·같은 날)의 다른 학생들이 모두 하나의 교재만 쓰고 있으면 그 교재로 상속
3. 상속했으면 반드시 corrections에 "[학생] 678 → 쎈 678로 추정(그룹 맥락)" 기록
4. 둘 다 애매하면 textbook="불명"으로 저장하고 corrections에 기록
5. 학년-학기만 있는 경우("2-1")도 같은 규칙 적용. 이미 교재가 맥락에 명시된 경우 "쎈 2-1"처럼 붙여 학년-학기 통합 규칙으로 처리

**중복 corrections 방지**: 학생이 이미 교재명을 명시했으면("쎈 109") 상속 기록할 필요 없음. 실제로 추론/통합/보정이 일어난 경우만 corrections에 기록.

### 노이즈·장난 입력 처리 (누락 대신 명시적 제외)
아래는 질문이 아니므로 questions에서 제외하되, **반드시 corrections에
"[학생] [원문] → 노이즈 제외"로 1줄씩 기록**해서 선생님이 추적 가능해야 함:
- 같은 숫자 5회 이상 반복 (예: "11111111", "999999")
- 8자리 이상 의미 없는 연속 숫자 (예: "114520134813", "123456")
- 한글 낙서·인사말·욕설 (예: "잘생겼어요", "바보", "질문 없습니다")
- 키보드 연타 패턴 (예: "ㅁㄴㅇㄹ", "asdf", "zzzz")
애매하면 제외하지 말고 questions에 남길 것. 기록 없이 조용히 사라지면 안 됨.

### 교재 약칭 & 통합
- 개원/개념원리, 개쎈/개념쎈, 자이/자이스토리, 알피엠/RPM
- 공수1/공통수학1, 공수2/공통수학2, 미적/미적분1, 확통/확률과통계
- 단평/단원평가/단평4/단원평가1/단원평가-단항식 등 → **기본은 textbook="단원평가"로 통합**
  - 단원평가 뒤의 숫자/부제(-단항식, -순환소수 등)는 textbook에서 분리하고 number 또는 원문 맥락으로 유지
  - 하이픈 뒤 단원명(단항식 등)은 textbook에 남기지 말고 corrections에 "[학생] 단원평가-단항식 57 → 단원평가 57로 통합(단원: 단항식)" 형태로만 기록
  - **번호 회차(단원평가3, 단원평가4) 처리 규칙 — 매우 중요!**:
    - 같은 그룹 내에 단원평가3과 단원평가4가 동시에 등장하면 **회차별로 구분 유지**
    - **대세 편입 규칙**: 회차 없이 "단원평가 40"처럼 모호하게 쓴 경우, 같은 그룹에서
      **가장 많은 학생이 쓴 회차(대세)로 편입**. 예: 단원평가4(8명) + 단원평가3(2명) → 모호한 건 단원평가4로.
    - corrections에 "[학생] 단원평가 40 → 단원평가4 40으로 추정(그룹 대세)" 기록.
    - 대세가 모호(1:1)하면 "단원평가"로 두고 "회차 불명, 확인 필요" 기록.
- 개이평/개념이해도/개념이해도평가 → 전부 "개념이해도평가"로 통합
- **같은 교재의 다른 표기는 반드시 하나로 통합!**
- **학년-학기 표기 통합 (일관성 필수!)**: "쎈2-1", "쎈3-1", "쎈 중3-1", "쎈" 처럼 학년·학기 접미사 차이만 있는 경우:
  - 같은 그룹(반×날짜) 안에 서로 다른 학년·학기가 동시에 안 섞이면 → 대표 교재 "쎈"으로 통합
  - **서로 다른 학년·학기가 동시에 등장하면 반드시 구분 유지**:
    - 예: 쎈2-1과 쎈2-2 (학기 전환 시기) → "쎈2-1", "쎈2-2"로 분리
    - 예: 쎈2-1과 쎈3-1 (학년 차이) → "쎈2-1", "쎈3-1"로 분리
    - 예: 개념원리2-2와 개념원리3-1 → 분리
  - 통합했으면 corrections에 "쎈2-1 → 쎈으로 통합" 한 줄 기록
  - **판단 원칙: 같은 코퍼스 안에서 뒤집히지 말 것. 전체 제출 데이터를 먼저 훑고 정책을 정한 뒤 적용.**

### 번호 체계
- 쎈/RPM: 연속번호. 모든 숫자가 문제번호 (쪽수 없음)
- 자이스토리: 알파벳+번호 (F58, E67). label 필드에 저장
- 개념원리/개념쎈/일품 등: 단원별 번호. 페이지+번호. 중등은 번호 30 이하면 문제번호, 30 초과면 페이지

### 페이지/번호 판별
- "31p 19 20 21" = 31쪽 19,20,21번
- "p.54-16" = 54쪽 16번
- "55p24" = 55쪽 24번

### 페이지 범위 표기 "~" 처리 (매우 중요!)
"일품 p24~25 6,11,15"처럼 페이지 범위 + 번호 여러 개가 있을 때:
1. **같은 그룹(반×날짜) 안에서 다른 학생이 "일품 24p 6번" 또는 "일품 25p 11번"
   같이 단일 페이지+번호를 명시했는지 먼저 탐색**. 매치되는 번호가 있으면
   그 페이지로 확정. 근거를 corrections에 "홍서준 p24~25 6 → 김영희가 24p 6
   질문한 것 참조하여 24p로 확정" 기록
2. 대조할 데이터가 없어서 번호를 어느 페이지에 넣을지 확정 불가능하면:
   - 번호들을 **전부 시작 페이지(24)로 통일 저장**
   - corrections에 "홍서준 일품 p24~25 6,11,15 — 페이지 확정 불가, 24p로 임시 저장. 확인 필요" 기록
3. **절대 임의로 번호를 여러 페이지에 쪼개 배분하지 말 것**. 근거(다른 학생 대조)가 있을 때만 쪼갬.

### 이름 규칙
- 성 빼고 이름만. 같은 이름 있으면 풀네임

### 분류 규칙
- questions: 모든 질문 (교재+번호+학생 매핑). 같은 교재+번호를 질문한 학생들을 합침.
- 불확실하면 corrections에 명시하되 절대 누락하지 말 것

## 응답 형식 (JSON만)
{
  "questions": [
    {"textbook":"교재명","page":null,"number":번호,"label":null,"students":["이름1","이름2"]}
  ],
  "corrections": ["교정 내역"],
  "verification": "✅ N=N'=숫자 검증완료"
}

JSON만 응답해.`;
}

async function callGemini(prompt: string): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

function parseResponse(text: string): { questions: any[]; corrections: string[] } | null {
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) return null;
  try {
    const p = JSON.parse(m[1]);
    return { questions: p.questions || [], corrections: p.corrections || [] };
  } catch { return null; }
}

function kstDay(iso: string): string {
  const d = new Date(iso);
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function countInputN(subs: Sub[]): number {
  // N = 학생×문제 조합 대략 추정: content 내 숫자/토큰 단순 카운트는 부정확하므로
  // "학생이 쓴 한 줄 안의 문제건수"를 엄밀히 계산하려면 자체 파싱 필요.
  // 여기서는 Gemini 결과의 students 합계(N')와 비교만 하고, 입력 건수는 제출행(subs.length)을 참고로 기록.
  return subs.length;
}

function countOutputN(questions: any[]): number {
  return questions.reduce((acc, q) => acc + (q.students?.length || 0), 0);
}

async function main() {
  const { data, error } = await sb.from('qa_submissions').select('*').order('created_at');
  if (error || !data) { console.error(error); process.exit(1); }
  const all = data as Sub[];
  console.log(`total=${all.length}`);

  const groups = new Map<string, Sub[]>();
  for (const s of all) {
    const key = `${kstDay(s.created_at)}|${s.class_name}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const keys = [...groups.keys()].sort();
  console.log(`groups=${keys.length}`);

  type Result = {
    day: string; class_name: string; n_submissions: number;
    n_output: number; corrections: string[]; raw_inputs: string[];
    questions: any[]; error?: string;
  };
  const results: Result[] = [];

  for (const key of keys) {
    const subs = groups.get(key)!;
    const [day, cn] = key.split('|');
    const text = subs.map(s => `[${s.class_name}] ${s.student_name}: ${s.content}`).join('\n');
    const prompt = buildPrompt(text);
    const resp = await callGemini(prompt);
    if (!resp) {
      results.push({ day, class_name: cn, n_submissions: subs.length, n_output: 0, corrections: [], raw_inputs: subs.map(s => `${s.student_name}: ${s.content}`), questions: [], error: 'gemini_fail' });
      console.log(`[${day} ${cn}] gemini fail`);
      continue;
    }
    const parsed = parseResponse(resp);
    if (!parsed) {
      results.push({ day, class_name: cn, n_submissions: subs.length, n_output: 0, corrections: [], raw_inputs: subs.map(s => `${s.student_name}: ${s.content}`), questions: [], error: 'parse_fail' });
      console.log(`[${day} ${cn}] parse fail`);
      continue;
    }
    const nOut = countOutputN(parsed.questions);
    results.push({
      day, class_name: cn, n_submissions: subs.length, n_output: nOut,
      corrections: parsed.corrections, questions: parsed.questions,
      raw_inputs: subs.map(s => `${s.student_name}: ${s.content}`),
    });
    console.log(`[${day} ${cn}] subs=${subs.length} out=${nOut} corrections=${parsed.corrections.length}`);
    await new Promise(r => setTimeout(r, 400));
  }

  writeFileSync('/tmp/analyze-all-result.json', JSON.stringify(results, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(`groups=${results.length}`);
  console.log(`errors=${results.filter(r => r.error).length}`);
  console.log(`groups_with_corrections=${results.filter(r => r.corrections.length > 0).length}`);
  console.log(`total_corrections=${results.reduce((a, r) => a + r.corrections.length, 0)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
