'use client';

import { useState } from 'react';
import { CLASS_LIST } from '@/lib/classes';

export default function StudentPage() {
  const [className, setClassName] = useState('');
  const [studentName, setStudentName] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!className || !studentName.trim() || !content.trim()) {
      setError('모든 항목을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError('');

    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_name: className,
        student_name: studentName.trim(),
        content: content.trim(),
      }),
    });

    setSubmitting(false);
    if (!res.ok) {
      const { error: msg } = await res.json().catch(() => ({ error: '제출 실패' }));
      setError(msg || '제출 실패');
    } else {
      setSuccess(true);
      setContent('');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'linear-gradient(180deg, #0f1729 0%, #1a2744 100%)' }}>
        <style>{`
          @keyframes popIn {
            0% { transform: scale(0); opacity: 0; }
            60% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .pop-in { animation: popIn 0.5s ease-out forwards; }
          .fade-up { animation: fadeUp 0.5s ease-out 0.3s forwards; opacity: 0; }
          .fade-up-2 { animation: fadeUp 0.5s ease-out 0.5s forwards; opacity: 0; }
        `}</style>

        <div className="w-full max-w-sm">
          {/* Success modal card */}
          <div className="rounded-3xl p-8 text-center shadow-2xl" style={{ background: '#fff' }}>
            <div className="pop-in w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: '#e8f5e9' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#2e7d32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="fade-up text-xl font-bold mb-1" style={{ color: '#1a2744' }}>질문이 전달됐어요!</p>
            <p className="fade-up-2 text-sm mb-6" style={{ color: '#8899aa' }}>선생님이 곧 확인할게요</p>

            <button
              onClick={() => setSuccess(false)}
              className="fade-up-2 w-full py-4 rounded-2xl text-[16px] font-semibold transition hover:opacity-90"
              style={{ background: '#1a2744', color: '#fff' }}
            >
              추가 제출
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10" style={{ background: 'linear-gradient(180deg, #0f1729 0%, #1a2744 100%)' }}>
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-3xl p-7 shadow-2xl" style={{ background: '#fff' }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <img src="/dm-logo.jpg" alt="DM" className="w-11 h-11 rounded-full shadow" />
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1a2744' }}>질문 제출 <span className="text-xs font-normal" style={{ color: '#99aabb' }}>ver.2</span></h1>
            </div>
          </div>

          {/* Class & Name */}
          <div className="flex gap-2.5 mb-4">
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="flex-shrink-0 px-3 py-2.5 text-[16px] rounded-xl outline-none"
              style={{ background: '#f5f6f8', border: 'none', color: className ? '#1a2744' : '#aab5c4' }}
            >
              <option value="">반 선택</option>
              {CLASS_LIST.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              type="text"
              placeholder="이름"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-24 flex-shrink-0 px-3 py-2.5 text-[16px] rounded-xl outline-none"
              style={{ background: '#f5f6f8', border: 'none', color: '#1a2744' }}
            />
          </div>

          {/* Content */}
          <textarea
            placeholder={`쎈 147 158 188 189 201 205\n개념원리\n55쪽 22 24 25\n56쪽 27`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-4 py-3 text-[16px] rounded-xl outline-none resize-none mb-1 leading-relaxed"
            style={{ background: '#f5f6f8', border: '2px solid #3b5998', color: '#1a2744' }}
          />

          <p className="text-sm font-medium mb-5 text-center" style={{ color: '#e53935' }}>* 개념원리 개념쎈은 쪽수를 정확히 적어주세요</p>

          {error && (
            <p className="text-sm mb-3 text-center font-medium" style={{ color: '#e53935' }}>{error}</p>
          )}

          {/* Submit button inside card */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 rounded-2xl text-[17px] font-bold tracking-wider transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
            style={{ background: '#1a2744', color: '#fff' }}
          >
            {submitting ? '제출 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
