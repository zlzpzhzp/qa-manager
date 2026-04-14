import { NextRequest, NextResponse } from 'next/server';
import { type Question, classifyQuestions, buildAnalysisText, buildVerification } from '@/lib/textbooks';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Submission = {
  id: number;
  class_name: string;
  student_name: string;
  content: string;
  created_at: string;
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

function buildPrompt(submissionsText: string): string {
  return `너는 DM학원 수학 질문정리 전문 봇이야. 학생들이 제출한 질문 데이터를 파싱하여 구조화된 JSON으로 변환해야 해.

## 학생 제출 데이터
${submissionsText}

## 파싱 규칙

### 교재 인식 (매우 중요!)
- 정규 교재: RPM, 쎈, 개념원리, 개념쎈, 일품, 자이스토리, 올림포스, 단원평가, 개념이해도평가, 확인학습
- **비정규 교재 (학습지, 프린트, 모의고사 등)**: 학생이 쓴 원문 그대로 교재명으로 사용! 예: "모의중간", "모의고사", "제곱근 점검", "인수분해 점검", "학습지" 등
- **절대 누락 금지**: 인식 못 하는 교재명이라도 원문 그대로 textbook 필드에 넣고, 번호도 파싱해서 포함할 것
- 어떤 질문도 빠뜨리면 안 됨. 파싱이 불확실하면 corrections에 표시하되 반드시 questions에 포함

### 교재 약칭 & 통합 (매우 중요!)
- 개원/개념원리, 개쎈/개념쎈, 자이/자이스토리, 알피엠/RPM
- 공수1/공통수학1, 공수2/공통수학2, 미적/미적분1, 확통/확률과통계
- 단평/단원평가/단평4 → 전부 "단원평가"로 통합
- 개이평/개념이해도/개념이해도평가 → 전부 "개념이해도평가"로 통합
- **같은 교재의 다른 표기는 반드시 하나로 통합!** 학생마다 "원가정가", "원가 정가", "계산력 강화하기(원가 정가)" 등 다르게 쓰더라도 같은 교재면 하나의 textbook명으로 합칠 것
- **버전 번호**: "쎈3-1", "쎈 3-1", "쎈" → 같은 교재의 다른 버전이 동시에 들어오지 않으면 "쎈"으로 통합. 쎈3-1과 쎈3-2가 동시에 들어오면 구분 유지
- "소금물", "거속시" 등 주제명은 학습지/프린트 이름이므로 그대로 교재명으로 사용

### 번호 체계
- 쎈/RPM: 연속번호. 모든 숫자가 문제번호 (쪽수 없음)
- 자이스토리: 알파벳+번호 (F58, E67). label 필드에 저장
- 개념원리/개념쎈/일품 등: 단원별 번호. 페이지+번호. 중등은 번호 30 이하면 문제번호, 30 초과면 페이지

### 페이지/번호 판별
- "31p 19 20 21" = 31쪽 19,20,21번
- "p.54-16" = 54쪽 16번
- "55p24" = 55쪽 24번
- RPM/쎈은 쪽수 마커 있어도 무시, 번호만 추출
- 학생 오타는 다른 학생 데이터와 대조하여 교정

### 이름 규칙
- 성 빼고 이름만 (김민수 → 민수). 같은 이름 있으면 풀네임

### 분류 규칙
- questions: 모든 질문 (교재+번호+학생 매핑). 같은 교재+번호를 질문한 학생들을 합침.
- 불확실하면 corrections에 명시하되 절대 누락하지 말 것

## 응답 형식 (JSON만, 다른 텍스트 없이)
{
  "questions": [
    {"textbook":"교재명","page":null,"number":번호,"label":null,"students":["이름1","이름2"]}
  ],
  "corrections": ["교정 내역"],
  "verification": "✅ N=N'=숫자 검증완료"
}

- questions: 모든 질문. 같은 교재+페이지+번호는 하나로 합치고 students에 이름 전부.
- page: 쪽수 기반 교재만. RPM/쎈은 null.
- label: 자이스토리만 (예: "F58"). 나머지는 null.
- N = 입력 총 건수(학생×문제, 중복제거), N' = questions의 students 수 합계. 반드시 일치.

JSON만 응답해.`;
}

function parseGeminiResponse(text: string): { questions: Question[]; corrections: string[] } | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) return null;
  const parsed = JSON.parse(jsonMatch[1]);
  return {
    questions: parsed.questions || [],
    corrections: parsed.corrections || [],
  };
}

async function callGemini(prompt: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
}

export async function POST(req: NextRequest) {
  const { submissions } = (await req.json()) as { submissions: Submission[] };

  if (!submissions || submissions.length === 0) {
    return NextResponse.json({ error: '분석할 데이터가 없습니다.' }, { status: 400 });
  }

  const submissionsText = submissions
    .map((s) => `[${s.class_name}] ${s.student_name}: ${s.content}`)
    .join('\n');

  const prompt = buildPrompt(submissionsText);
  const responseText = await callGemini(prompt);
  if (!responseText) {
    return NextResponse.json({ error: 'Gemini API 호출 실패. API 키를 확인해주세요.' }, { status: 500 });
  }

  const parsed = parseGeminiResponse(responseText);
  if (!parsed) {
    return NextResponse.json({ error: 'Gemini 응답 파싱 실패.' }, { status: 500 });
  }

  const { questions, corrections } = parsed;
  const classification = classifyQuestions(questions);
  const analysis = buildAnalysisText(questions, submissions);
  const verification = buildVerification(questions);

  return NextResponse.json({
    analysis,
    verification,
    corrections,
    classification,
    questions,
  });
}
