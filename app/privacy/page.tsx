'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <h1 className="text-xl font-bold">개인정보처리방침</h1>
        </div>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <p className="rounded-xl border border-yellow-700/60 p-4 text-yellow-100">출시 전 검토안입니다. 서비스 운영 주체와 실제 처리 계약에 따른 위탁·국외이전 사항 및 시행일을 확정한 뒤 적용합니다.</p>

          <section>
            <h2 className="text-white font-bold mb-2">1. 수집하는 개인정보</h2>
            <p className="text-gray-400 mb-2">서비스 이용 시 아래 정보가 수집됩니다.</p>
            <ul className="space-y-1 text-gray-400">
              <li>• <span className="text-white">소셜 로그인 정보:</span> 이름, 이메일 (카카오/구글/네이버 제공)</li>
              <li>• <span className="text-white">서비스 이용 정보:</span> 생년월일·출생 시각·출생 지역, 성별, 이름, 직업·결혼 상태 등 이용자가 입력한 사주 정보</li>
              <li>• <span className="text-white">상담·후기:</span> 직접 입력한 질문, 선택한 답변, 상담 결과와 대화 기록, 후기 본문·별점·공개 표시 이름</li>
              <li>• <span className="text-white">결제 정보:</span> 결제 수단 종류, 결제 금액 (카드번호 등 민감정보는 수집하지 않음)</li>
              <li>• <span className="text-white">자동 수집:</span> 접속 기기, IP 주소, 서비스 이용 기록</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">2. 수집 목적</h2>
            <ul className="space-y-1 text-gray-400">
              <li>• 회원 가입 및 로그인 관리</li>
              <li>• 사주 풀이 및 1:1 대화·선택형 상담 제공, 내 결과 보관과 다시보기</li>
              <li>• 엽전 결제 및 환불 처리</li>
              <li>• 이용자가 신청한 후기 공개·결과 공유, 서비스 개선 및 오류 대응</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">3. 보유 및 이용 기간</h2>
            <p className="text-gray-400">회원 탈퇴 시까지 보유합니다. 단, 관계 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
            <ul className="space-y-1 text-gray-400 mt-2">
              <li>• 전자상거래 결제 기록: 5년 (전자상거래법)</li>
              <li>• 접속 로그: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">4. 서비스 처리와 공개 범위</h2>
            <ul className="space-y-2 text-gray-400">
              <li>• AI 해석을 생성할 때 입력한 사주 정보와 질문 등 해당 기능에 필요한 정보가 Anthropic의 AI 처리에 사용됩니다. 결제 처리는 토스페이먼츠, 계정·결과·거래 기록 저장은 Supabase를 사용합니다.</li>
              <li>• 일반 결과와 상담 기록은 본인 계정에서 확인합니다. 직접 공유 링크를 만들면 링크를 가진 사람이 공유 범위의 해석을 볼 수 있으며, 보관함의 결과 화면에서 링크를 종료할 수 있습니다.</li>
              <li>• 공개 후기를 작성하면 표시 이름·후기 본문·별점 등 후기 화면에 안내한 정보가 다른 이용자에게 보입니다. 후기에는 연락처나 타인의 개인정보를 적지 않도록 안내합니다.</li>
              <li>• 업체별 법적 처리 관계, 처리 항목·보유 기간과 국외이전 상세 고지는 실제 계약 및 운영 설정을 확인하여 확정합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">5. 이용자의 권리</h2>
            <ul className="space-y-1 text-gray-400">
              <li>• 개인정보 열람, 수정, 삭제 요청 가능</li>
              <li>• 회원 탈퇴 시 개인정보 삭제</li>
              <li>• 문의: <span className="text-purple-400">sajuya.help@gmail.com</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">6. 쿠키 및 분석 도구</h2>
            <p className="text-gray-400">서비스 개선을 위해 접속 통계를 수집할 수 있습니다. 브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">7. 개인정보 보호 책임자</h2>
            <p className="text-gray-400">개인정보 관련 문의는 아래로 연락해 주세요.</p>
            <p className="text-purple-400 font-medium mt-1">sajuya.help@gmail.com</p>
          </section>

          <section>
            <p className="text-gray-600 text-xs">개정안 적용일: 운영 고지 시 확정</p>
          </section>

        </div>
      </div>
    </div>
  )
}
