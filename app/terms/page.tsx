'use client'

import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="palace-page palace-terms min-h-screen bg-[#0a0a0f] text-white pb-24">
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
            <h2 id="refund" className="text-white font-bold mb-2">제5조 (청약철회 및 환불)</h2>
            <p className="text-yellow-200 text-xs mb-3">환불 기능과 함께 검토 중인 개정안입니다. 운영 적용일은 별도로 안내합니다.</p>
            <ul className="space-y-3 text-gray-300">
              <li>① 엽전 충전과 개별 콘텐츠 제공은 구분합니다. 충전만으로 사주 해석의 제공이 시작되지는 않습니다. 회사는 구매 전에 가격과 제공 범위, 환불 기준을 안내합니다.</li>
              <li>② 이용자는 원칙적으로 계약 내용에 관한 서면을 받은 날부터 7일 이내 청약철회할 수 있습니다. 공급 시기나 계약 정보 누락 등으로 법령상 기산일이 달라지는 경우에는 해당 기준을 따릅니다.</li>
              <li>③ 디지털콘텐츠의 제공이 시작된 경우에는 법령상 요건을 충족한 범위에서 단순 변심에 따른 청약철회가 제한될 수 있습니다. 회사는 제한 사실을 명확히 알리고 관계 법령에 따른 미리보기·체험 등 필요한 조치를 마련합니다. 확인란 동의만으로 법정 환불 권리가 소멸하지 않습니다.</li>
              <li>④ 회사는 미사용 유료 엽전에 대해 7일 이후에도 비례 환불을 제공합니다. 전혀 사용하지 않은 구매 건은 실제 결제금액을 환불하며, 일부 사용한 경우에는 실제 결제금액 × 환불 대상 미사용 유료 엽전 ÷ 구매한 유료 엽전 총수량으로 계산합니다. 원 미만은 올림하되 누적 환불액은 실제 결제금액을 넘지 않습니다. 별도 환불 수수료는 부과하지 않습니다.</li>
              <li>⑤ 예를 들어 3냥을 4,900원에 구매하여 1냥을 사용하고 2냥이 남은 경우 환불액은 3,267원입니다. 패키지 일부를 이용했다는 이유만으로 미사용분 전체의 환불을 거절하지 않습니다.</li>
              <li>⑥ 유료·무료 엽전과 구매 건별 사용 내역을 구분합니다. 사용 가능한 무료 엽전을 먼저, 유료 엽전은 먼저 구매한 순서로 사용합니다. 별도 대가 없이 지급한 무료 엽전은 현금 환불 대상이 아니며, 무료분이 함께 있다는 이유로 유료 잔액의 환불을 거절하지 않습니다.</li>
              <li>⑦ 정상 제공되었고 적법한 청약철회 제한 요건을 갖춘 콘텐츠는 주관적 불만족만으로 환불되지 않을 수 있습니다. 생성 실패, 결과 미제공, 항목 누락, 중복 결제나 표시·광고 또는 계약과 다른 제공은 별도로 확인하여 재제공, 이용 취소 또는 대금 환불 등 적절한 조치를 합니다. 회사 내부에서 AI 생성 비용이 발생한 것만으로 정상 제공으로 보지 않습니다.</li>
              <li>⑧ 표시·광고 또는 계약과 다르게 제공된 경우에는 공급일부터 3개월 이내이면서, 그 사실을 알았거나 알 수 있었던 날부터 30일 이내라는 법정 기간 요건에 따라 청약철회할 수 있습니다. 내부적인 오류 접수 기한으로 법정 권리를 단축하지 않습니다.</li>
              <li>⑨ 환불은 결제·환불 내역 화면 또는 고객센터에서 신청합니다. 조건이 확인되는 미사용분은 자동 처리하고, 제공 내용에 관한 이의나 기록 불일치는 담당자가 검토하여 사유와 결과를 안내합니다. 반복 신청만을 이유로 정당한 환불 권리를 배제하지 않습니다.</li>
              <li>⑩ 환불 대상으로 확정하여 처리 중인 엽전은 중복 사용을 방지하기 위해 보관합니다. 취소 결과가 불명확하면 결제대행사의 거래 내역을 재확인합니다. 환불한 콘텐츠의 재열람·공유 권한은 회수하며, 별개 구매분의 권한이나 최초 무료 이용 기록을 임의로 초기화하지 않습니다.</li>
              <li>⑪ 대금 환급은 관계 법령상 기산일과 기한에 따라 처리하며, 디지털콘텐츠 등의 적법한 청약철회는 그 날부터 3영업일 이내 환급을 원칙으로 합니다. 원 결제수단으로 취소를 요청하고, 결제기관의 실제 반영 시점은 처리 상태와 함께 안내합니다. 기록 확인이나 내부 승인 절차를 이유로 법정 기한을 임의로 연장하지 않습니다.</li>
              <li>⑫ 관계 법령에서 이용자에게 더 유리한 기준을 정한 경우에는 해당 기준을 우선 적용합니다.</li>
            </ul>
            <Link href="/payments" className="inline-block mt-4 text-yellow-200 underline">결제 · 환불 내역 확인하기</Link>
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
