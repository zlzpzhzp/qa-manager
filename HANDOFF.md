@handoff qa 2026-04-15T21:15+09
role=질문 port=Vercel stack=Next.js16,Supabase

[completed]
56aa110 submissions API에 checkAuth() 추가 (보안 취약점 수정)
분류기능 classification API + UI 추가
공통질문 vs 개별질문 학생별 분류
클립보드 복사 버튼 (분석결과+검증)

[state]
deploy=vercel --prod --yes (Vercel)
url=dm-qa.vercel.app (dm-qa-app 아님!)
student_app=/student 경로
teacher_app=/ 루트 경로
auth=checkAuth() 적용됨
curriculum.중2=전부 개정교과
curriculum.중3=구교과

[next]
1. 초능력자님 지시 대기
2. 분석 정확도 개선 (계속)

[trap]
- URL은 dm-qa.vercel.app (dm-qa-app 아님!)
- 링크 줄 때 학생용+선생님용 둘 다 줘야 함
- 인원수 표시 빼라고 한 거 기억 (공통질문에서)
- vercel deploy 시 환경변수 설정 필수
- GitHub 자동 연결 하지 말 것

[user_context]
안정 운영. 수업 때 실사용 중.
