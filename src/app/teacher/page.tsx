'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Submission } from '@/lib/supabase';
import { GRADE_LIST, SECTION_LIST } from '@/lib/classes';

function localDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return localDateStr(new Date());
}

function mondayStr() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return localDateStr(monday);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 || 12;
  return `${m}/${day}`;
}

export default function TeacherDashboard() {
  const [authed, setAuthed] = useState(true);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  const [grade, setGrade] = useState('all');
  const [section, setSection] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const d = new Date();
    setEndDate(localDateStr(d));
    d.setDate(d.getDate() - 1);
    setStartDate(localDateStr(d));
  }, []);

  const [showList, setShowList] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [verification, setVerification] = useState('');
  const [corrections, setCorrections] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (grade !== 'all') params.set('grade', grade);
    if (section !== 'all') params.set('section', section);
    if (nameFilter.trim()) params.set('names', nameFilter.trim());

    const res = await fetch(`/api/submissions?${params}`);
    if (res.ok) {
      const { data } = await res.json();
      setSubmissions(data || []);
    } else if (res.status === 401) {
      setAuthed(false);
    }
    setLoading(false);
  }, [startDate, endDate, grade, section, nameFilter]);

  useEffect(() => {
    if (startDate && endDate) fetchSubmissions();
  }, [fetchSubmissions, startDate, endDate]);


  const handleAnalyze = async () => {
    setAnalyzing(true);
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submissions }),
    });
    if (res.ok) {
      const data = await res.json();
      setAnalysis(data.analysis);
      setVerification(data.verification);
      setCorrections(data.corrections || []);
    }
    setAnalyzing(false);
  };

  const handleDeleteAll = async () => {
    if (!confirm('정말 전체 삭제하시겠습니까?')) return;
    await fetch('/api/submissions', { method: 'DELETE' });
    fetchSubmissions();
    setAnalysis('');
    setVerification('');
    setCorrections([]);
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;

    // Build original submissions text grouped by class
    const originalLines: string[] = [];
    const byClass: Record<string, typeof submissions> = {};
    for (const s of submissions) {
      if (!byClass[s.class_name]) byClass[s.class_name] = [];
      byClass[s.class_name].push(s);
    }
    for (const cls of Object.keys(byClass).sort()) {
      originalLines.push(`[${cls}]`);
      for (const s of byClass[cls]) {
        originalLines.push(`${s.student_name}: ${s.content}`);
      }
      originalLines.push('');
    }

    const correctionsHtml = corrections.length > 0
      ? `<div style="margin-bottom:8px;padding:6px;background:#fff8e1;border:1px solid #ffe082;border-radius:4px;font-size:11px;"><b>자동 교정</b><br/>${corrections.join('<br/>')}</div>`
      : '';

    win.document.write(`
      <html><head><title>질문 정리 인쇄</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Pretendard Variable', Pretendard, sans-serif; color: #000; font-size: 12px; }
        .page { width: 100%; min-height: 100vh; padding: 16px; page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        h2 { font-size: 15px; font-weight: 700; margin-bottom: 10px; border-bottom: 2px solid #333; padding-bottom: 6px; }
        pre { white-space: pre-wrap; font-family: 'Pretendard Variable', Pretendard, sans-serif; font-size: 11px; line-height: 1.7; }
        .verification { margin-top: 10px; font-weight: 700; font-size: 12px; }
        .page-label { font-size: 9px; color: #bbb; text-align: right; margin-bottom: 4px; }
      </style></head>
      <body>
        <!-- 앞면: 질문 정리만 -->
        <div class="page">
          <div class="page-label">앞면</div>
          <h2>질문 정리</h2>
          <pre>${analysis}</pre>
        </div>
        <!-- 뒷면: 원본 질문 + 교정 로그 + 검증 -->
        <div class="page">
          <div class="page-label">뒷면</div>
          <h2>원본 질문</h2>
          <pre>${originalLines.join('\n')}</pre>
          ${correctionsHtml}
          <div class="verification">${verification}</div>
        </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  const setToday = () => { setStartDate(todayStr()); setEndDate(todayStr()); };
  const setThisWeek = () => { setStartDate(mondayStr()); setEndDate(todayStr()); };

  const uniqueStudents = new Set(submissions.map((s) => s.student_name)).size;

  // Section color map for class badges
  const sectionColors: Record<string, string> = {
    S: 'bg-navy text-white',
    H: 'bg-navy-light text-white',
    A: 'bg-emerald-600 text-white',
    N: 'bg-amber-500 text-white',
    K: 'bg-rose-500 text-white',
  };

  const getClassBadge = (cls: string) => {
    const section = cls.slice(-1);
    const color = sectionColors[section] || 'bg-silver text-navy';
    return color;
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-navy px-6 py-3 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <img src="/dm-logo.jpg" alt="DM" className="w-9 h-9 rounded-full border-2 border-silver" />
          <div>
            <h1 className="text-base font-bold text-white">DM Institute</h1>
            <p className="text-xs text-silver">질문 관리 대시보드</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto p-5">
        {/* Filters bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-border mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-sm text-navy bg-cream focus:bg-white focus:border-navy outline-none transition"
            >
              <option value="all">전체 학년</option>
              {GRADE_LIST.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-sm text-navy bg-cream focus:bg-white focus:border-navy outline-none transition"
            >
              <option value="all">전체 반</option>
              {SECTION_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-sm text-navy bg-cream focus:bg-white focus:border-navy outline-none transition"
            />
            <span className="text-silver text-sm">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-border rounded-lg px-2 py-1.5 text-sm text-navy bg-cream focus:bg-white focus:border-navy outline-none transition"
            />
            <input
              type="text"
              placeholder="이름 (쉼표 구분)"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="w-36 border border-border rounded-lg px-2 py-1.5 text-sm text-navy bg-cream focus:bg-white focus:border-navy outline-none transition placeholder:text-silver"
            />
            <button onClick={setToday} className="border border-border rounded-lg px-3 py-1.5 text-sm text-navy hover:bg-cream transition">
              오늘
            </button>
            <button onClick={setThisWeek} className="border border-border rounded-lg px-3 py-1.5 text-sm text-navy hover:bg-cream transition">
              이번 주
            </button>
            <button
              onClick={fetchSubmissions}
              className="bg-navy text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-navy-light transition"
            >
              조회
            </button>
          </div>
        </div>

        {/* Stats + Actions row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-6 bg-white rounded-xl px-5 py-3 shadow-sm border border-border">
            <div className="text-center">
              <div className="text-2xl font-bold text-navy">{submissions.length}</div>
              <div className="text-xs text-silver">제출</div>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-navy">{uniqueStudents}</div>
              <div className="text-xs text-silver">학생</div>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || submissions.length === 0}
            className="bg-navy text-white px-6 py-2.5 rounded-xl font-semibold disabled:opacity-40 hover:bg-navy-light transition shadow-sm"
          >
            {analyzing ? '분석 중...' : '질문 종합'}
          </button>
          {analysis && (
            <button
              onClick={handlePrint}
              className="bg-navy-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-navy transition shadow-sm"
            >
              인쇄
            </button>
          )}
        </div>

        {/* Analysis Result */}
        {analysis && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-border mb-4" ref={printRef}>
            {corrections.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <div className="font-semibold text-amber-800 mb-2">자동 교정</div>
                {corrections.map((c, i) => (
                  <div key={i} className="text-amber-700 leading-relaxed">{c}</div>
                ))}
              </div>
            )}
            <pre className="text-sm whitespace-pre-wrap leading-relaxed text-navy">{analysis}</pre>
            <div className="mt-4 pt-3 border-t border-border text-sm font-semibold text-silver">{verification}</div>
          </div>
        )}

        {/* Submission List */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-silver uppercase tracking-wider">제출 목록</span>
              <button
                onClick={() => setShowList(!showList)}
                className="text-xs text-navy-light hover:text-navy font-medium transition"
              >
                {showList ? '접기' : '펼치기'}
              </button>
            </div>
            <button
              onClick={handleDeleteAll}
              className="text-xs bg-danger text-white px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition"
            >
              전체 삭제
            </button>
          </div>

          {showList && (
            loading ? (
              <p className="text-sm text-silver py-4">불러오는 중...</p>
            ) : submissions.length === 0 ? (
              <p className="text-sm text-silver py-4">제출 데이터가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-border text-left text-xs text-silver uppercase tracking-wider">
                      <th className="py-3 px-3 w-24 whitespace-nowrap">반</th>
                      <th className="py-3 px-3 w-28 whitespace-nowrap">이름</th>
                      <th className="py-3 px-3">제출 내용</th>
                      <th className="py-3 px-3 w-20 whitespace-nowrap">날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-cream transition">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getClassBadge(s.class_name)}`}>
                            {s.class_name}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-navy whitespace-nowrap">{s.student_name}</td>
                        <td className="py-3 px-3 whitespace-pre-wrap text-navy/70">{s.content}</td>
                        <td className="py-3 px-3 text-xs text-silver whitespace-nowrap">
                          {formatDate(s.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
