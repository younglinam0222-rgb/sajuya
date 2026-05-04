'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <h1 className="text-xl font-bold">이용약관</h1>
        </div>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">

          <section>
            <h2 className="text-white font-bold mb-2">제1조 (목적)</h2>
            <p>본 약관은 사주야(이하 "서비스")가 제공하는 AI 사주 풀이 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제2조 (서비스 성격)</h2>
            <p>본 서비스는 <span className="text-yellow-400 font-medium">오락 및 참고 목적</span>으로 제공되는 콘텐츠 서비스입니다. 사주 풀이 결과는 실제 미래를 예측하거나 보장하지 않으며, 중요한 결정(의료, 법률, 재정 등)의 근거로 사용해서는 안 됩니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제3조 (회원가입)</h2>
            <p>서비스는 카카오, 구글, 네이버 소셜 로그인을 통해 가입할 수 있습니다. 가입 시 본 약관 및 개인정보처리방침에 동의한 것으로 간주합니다.</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제4조 (엽전 및 결제)</h2>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 엽전은 서비스 내 가상 화폐로, 유료 콘텐츠 이용에 사용됩니다.</li>
              <li>• 엽전 1냥의 가격은 990원이며, 패키지 구매 시 보너스가 지급될 수 있습니다.</li>
              <li>• 결제는 토스페이먼츠를 통해 안전하게 처리됩니다.</li>
              <li>• 충전된 엽전은 현금으로 환불되지 않습니다. 단, 미사용 엽전에 한해 충전일로부터 7일 이내 환불 요청이 가능합니다.</li>
              <li>• 환불 문의: <span className="text-purple-400">sajuya.help@gmail.com</span></li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제5조 (서비스 이용 제한)</h2>
            <p className="text-gray-400">다음의 경우 서비스 이용이 제한될 수 있습니다.</p>
            <ul className="space-y-1 text-gray-400 mt-2">
              <li>• 타인의 개인정보를 도용하여 가입한 경우</li>
              <li>• 서비스의 정상적인 운영을 방해하는 행위</li>
              <li>• 본 약관을 위반한 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제6조 (면책사항)</h2>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 서비스는 사주 풀이 결과의 정확성을 보장하지 않습니다.</li>
              <li>• 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
              <li>• 이용자가 서비스 결과를 근거로 내린 결정에 대한 책임은 이용자 본인에게 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제7조 (문의)</h2>
            <p>서비스 관련 문의사항은 아래 이메일로 연락해 주세요.</p>
            <p className="text-purple-400 font-medium mt-1">sajuya.help@gmail.com</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">부칙</h2>
            <p className="text-gray-500">본 약관은 2025년 1월 1일부터 시행됩니다.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
