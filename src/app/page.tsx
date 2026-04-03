'use client';

import { useState } from 'react';
import { CLASS_LIST } from '@/lib/classes';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

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

    const { error: dbError } = await getSupabase().from('qa_submissions').insert({
      class_name: className,
      student_name: studentName.trim(),
      content: content.trim(),
    });

    setSubmitting(false);
    if (dbError) {
      setError('제출 실패: ' + dbError.message);
    } else {
      setSuccess(true);
      setContent('');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden" style={{ background: '#f0ede6' }}>
        <style>{`
          @keyframes flyAway {
            0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
            30% { transform: translate(40px, -60px) rotate(-15deg) scale(0.9); opacity: 1; }
            60% { transform: translate(120px, -180px) rotate(-25deg) scale(0.7); opacity: 0.8; }
            100% { transform: translate(300px, -500px) rotate(-35deg) scale(0.3); opacity: 0; }
          }
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(30px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .fly-animation { animation: flyAway 1.2s ease-in forwards; }
          .fade-in-up { animation: fadeInUp 0.6s ease-out 0.8s forwards; opacity: 0; }
        `}</style>

        {/* Paper airplane flying away */}
        <div className="fly-animation mb-4">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="#1B2D5B" />
          </svg>
        </div>

        {/* Success message appears after airplane flies */}
        <div className="fade-in-up text-center">
          <p className="text-xl font-bold text-navy mb-2">질문이 제출되었어요!</p>
          <p className="text-sm text-navy/40 mb-8">선생님이 확인할 거예요</p>
          <button
            onClick={() => setSuccess(false)}
            className="bg-navy text-white px-8 py-3 rounded-lg font-semibold hover:bg-navy-light transition"
          >
            추가 제출하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4" style={{ background: '#f0ede6' }}>
      <div className="flex flex-col items-center">
      {/* Title + description outside postit */}
      <div className="text-center -mb-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <img src="/dm-logo.jpg" alt="DM" className="w-14 h-14 rounded-full" />
          <h1 className="text-4xl font-bold text-navy">질문 제출</h1>
        </div>
      </div>

      {/* Postit image with form overlaid */}
      <div className="relative" style={{ width: '110vw', maxWidth: 1100, marginLeft: '3.5rem' }}>
        <img src="/postit-bg.png" alt="" className="w-full h-auto select-none pointer-events-none" style={{ transform: 'rotate(3deg)' }} draggable={false} />
        <div className="absolute flex flex-col gap-2" style={{ top: '14%', left: '18%', right: '26%', bottom: '38%' }}>
          {/* Class & Name row */}
          <div className="flex gap-3 justify-end">
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="px-3 py-2 text-[16px] outline-none bg-transparent border-b border-navy/15 text-navy/70"
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
              className="w-32 px-3 py-2 text-[16px] outline-none bg-transparent border-b border-navy/15 text-navy/70 placeholder:text-navy/25"
            />
          </div>

          {/* Question area */}
          <textarea
            placeholder={`쎈 147 158 188 189 201 205\n개념원리 55쪽 22 24 25\n56쪽 27`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full px-4 py-3 text-[16px] resize-none outline-none bg-transparent border-b border-navy/15 text-navy/70 placeholder:text-navy/20"
          />

          {error && <p className="text-red-500 text-xs font-medium mt-1">{error}</p>}
        </div>
      </div>

      {/* Submit button right below postit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-[340px] bg-navy text-white py-4 rounded-xl font-semibold text-lg disabled:opacity-50 hover:bg-navy-light transition -mt-10 ml-6 relative z-10"
      >
        {submitting ? '제출 중...' : '제출하기'}
      </button>
      </div>
    </div>
  );
}
