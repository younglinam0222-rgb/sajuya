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
            <p>본 약관은 사주궁(이하 "서비스")가 제공하는 AI 사주 풀이 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
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
              <li>• 엽전은 서비스 내 유료 콘텐츠 이용을 위한 선불 전자적 수단입니다.</li>
              <li>• 엽전 1냥의 가격은 1,900원이며, 3냥 패키지 구매 시 4,900원의 할인가로 이용할 수 있습니다.</li>
              <li>• 결제는 토스페이먼츠를 통해 처리됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제5조 (청약철회 및 환불)</h2>
            <p className="text-gray-500 text-xs mb-2">본 조는 「전자상거래 등에서의 소비자보호에 관한 법률」(이하 "전자상거래법") 및 관련 시행령, 공정거래위원회 디지털콘텐츠 표준약관에 근거합니다.</p>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 엽전으로 이용하는 사주 풀이 등 콘텐츠는 결제 완료와 동시에 즉시 생성·제공되는 디지털콘텐츠입니다.</li>

              <li className="text-gray-300 font-medium mt-2">① 실체적 근거 (전자상거래법 제17조 제2항 제5호)</li>
              <li className="pl-4">- 콘텐츠의 제공이 개시된 경우, 이용자는 회사의 의사에 반하여 청약철회(환불)를 할 수 없습니다.</li>

              <li className="text-gray-300 font-medium mt-2">② 절차적 요건 이행 (전자상거래법 제17조 제6항 단서, 같은 법 시행령 제21조의2)</li>
              <li className="pl-4">- 회사는 청약철회가 제한된다는 사실을 결제 화면에 명확히 표시합니다.</li>
              <li className="pl-4">- 회사는 이용자가 콘텐츠의 특성을 사전에 확인할 수 있도록, 전체 판결문 중 일부(3개)를 결제 전 무료로 미리 제공합니다. 이는 시험 사용이 곤란한 디지털콘텐츠에 대해 법령이 요구하는 사전 정보 제공 조치에 해당합니다.</li>

              <li className="text-gray-300 font-medium mt-2">③ 사전 동의 확보</li>
              <li className="pl-4">- 이용자는 결제 화면에서 위 ①②의 내용을 고지받고 체크박스를 통해 명시적으로 동의한 이후에만 결제를 진행할 수 있으며, 회사는 동의 시각 및 내역을 기록·보관합니다.</li>

              <li>• 하나의 결제(패키지)로 여러 개의 판결문·콘텐츠가 함께 제공되는 경우, 그중 하나라도 열람이 개시되면 해당 결제 전체에 대해 콘텐츠 제공이 개시된 것으로 봅니다.</li>
              <li>• 단순 변심, 착오 구매, 결과 내용에 대한 주관적 불만족은 환불 사유에 해당하지 않습니다.</li>

              <li className="text-gray-300 font-medium mt-2">④ 법령상 예외 (강행규정 — 위 ①②③에도 불구하고 적용)</li>
              <li className="pl-4">- 콘텐츠 내용이 표시·광고 내용과 다르거나 계약 내용과 다르게 이행된 경우: 전자상거래법 제17조 제3항에 따라 콘텐츠를 제공받은 날부터 3개월 이내, 그 사실을 안 날부터 30일 이내 청약철회 가능</li>
              <li className="pl-4">- 결제 시스템 오류 등 회사의 귀책사유로 콘텐츠가 정상적으로 제공되지 않은 경우</li>
              <li className="pl-4">- 위 사유로 환불을 요청하는 경우, 이용자는 사유 발생일로부터 7일 이내에 제7조의 이메일로 결제 내역(주문번호 또는 결제일시)과 사유를 함께 접수해야 하며, 회사는 접수일로부터 3영업일 이내에 검토 결과를 안내합니다.</li>

              <li className="text-gray-300 font-medium mt-2">⑤ 미사용 엽전 잔액 환불</li>
              <li className="pl-4">- 콘텐츠 열람에 사용되지 않은 엽전 잔액에 한해, 충전일로부터 7일 이내 환불 요청이 가능합니다. 7일이 경과했거나 이미 콘텐츠 열람에 사용된 엽전은 환불되지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제6조 (서비스 이용 제한)</h2>
            <p className="text-gray-400">다음의 경우 서비스 이용이 제한될 수 있습니다.</p>
            <ul className="space-y-1 text-gray-400 mt-2">
              <li>• 타인의 개인정보를 도용하여 가입한 경우</li>
              <li>• 서비스의 정상적인 운영을 방해하는 행위</li>
              <li>• 본 약관을 위반한 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제7조 (면책사항)</h2>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 서비스는 사주 풀이 결과의 정확성을 보장하지 않습니다.</li>
              <li>• 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
              <li>• 이용자가 서비스 결과를 근거로 내린 결정에 대한 책임은 이용자 본인에게 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">제8조 (문의)</h2>
            <p>서비스 관련 문의사항은 아래 이메일로 연락해 주세요.</p>
            <p className="text-purple-400 font-medium mt-1">sajuya.help@gmail.com</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">부칙</h2>
            <p className="text-gray-500">본 약관은 2026년 8월 14일부터 시행됩니다.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
