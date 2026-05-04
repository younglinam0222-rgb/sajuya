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

          <section>
            <h2 className="text-white font-bold mb-2">1. 수집하는 개인정보</h2>
            <p className="text-gray-400 mb-2">서비스 이용 시 아래 정보가 수집됩니다.</p>
            <ul className="space-y-1 text-gray-400">
              <li>• <span className="text-white">소셜 로그인 정보:</span> 이름, 이메일 (카카오/구글/네이버 제공)</li>
              <li>• <span className="text-white">서비스 이용 정보:</span> 생년월일, 성별, 입력한 사주 정보</li>
              <li>• <span className="text-white">결제 정보:</span> 결제 수단 종류, 결제 금액 (카드번호 등 민감정보는 수집하지 않음)</li>
              <li>• <span className="text-white">자동 수집:</span> 접속 기기, IP 주소, 서비스 이용 기록</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">2. 수집 목적</h2>
            <ul className="space-y-1 text-gray-400">
              <li>• 회원 가입 및 로그인 관리</li>
              <li>• 사주 풀이 서비스 제공</li>
              <li>• 엽전 결제 및 환불 처리</li>
              <li>• 서비스 개선 및 오류 대응</li>
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
            <h2 className="text-white font-bold mb-2">4. 제3자 제공</h2>
            <p className="text-gray-400">수집된 개인정보는 원칙적으로 제3자에게 제공하지 않습니다. 단, 결제 처리를 위해 토스페이먼츠에 필요한 최소 정보가 전달됩니다.</p>
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
            <p className="text-gray-600 text-xs">시행일: 2025년 1월 1일</p>
          </section>

        </div>
      </div>
    </div>
  )
}
