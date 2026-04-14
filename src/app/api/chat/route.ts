import { NextRequest, NextResponse } from 'next/server';
import { type Question, classifyQuestions, buildAnalysisText, buildVerification } from '@/lib/textbooks';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function POST(req: NextRequest) {
  const { message, questions, submissions } = (await req.json()) as {
    message: string;
    questions: Question[];
    submissions: { class_name: string; student_name: string; content: string }[];
  };

  if (!message) {
    return NextResponse.json({ error: '메시지가 없습니다.' }, { status: 400 });
  }
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini API 키가 설정되지 않았습니다.' }, { status: 500 });
  }

  const questionsJson = JSON.stringify(questions, null, 2);
  const submissionsText = submissions
    .map((s) => `[${s.class_name}] ${s.student_name}: ${s.content}`)
    .join('\n');

  const prompt = `너는 DM학원 수학 질문정리 전문 봇이야. 선생님이 현재 질문 목록에 대해 추가 요청을 했어.

## 현재 questions 배열 (1차 가공 결과)
${questionsJson}

## 원본 제출 데이터 (참고용)
${submissionsText || '(없음)'}

## 선생님 요청
${message}

## 규칙
- 요청에 맞게 questions 배열을 수정해서 돌려줘
- "제외" 요청이면 해당 학생을 students에서 제거, students가 비면 항목 자체 제거
- "~만" 요청이면 해당 교재/학생만 남기고 나머지 제거
- "병합" 요청이면 기존 데이터에 추가
- 기타 자연어 요청도 최선을 다해 처리
- 응답은 JSON으로:
{
  "response": "처리 설명",
  "questions": [수정된 questions 배열]
}

JSON만 응답해. 다른 텍스트 없이.`;

  try {
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

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Gemini API 오류: ${res.status}`, details: err }, { status: 500 });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      const newQuestions: Question[] = parsed.questions || [];

      return NextResponse.json({
        response: parsed.response || '처리 완료',
        analysis: buildAnalysisText(newQuestions, submissions),
        verification: buildVerification(newQuestions),
        corrections: [],
        classification: classifyQuestions(newQuestions),
        questions: newQuestions,
      });
    }

    return NextResponse.json({ response: text, analysis: '', verification: '', questions: [] });
  } catch (err) {
    return NextResponse.json(
      { error: '처리 중 오류 발생', details: String(err) },
      { status: 500 }
    );
  }
}
