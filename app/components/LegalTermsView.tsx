import Link from 'next/link'
import Footer from '@/app/components/Footer'
import { SUPPORT_EMAIL } from '@/lib/siteBranding'
import { BUSINESS_INFO, type LegalTermsMode } from '@/lib/legalConfig'
import { LEGAL_REVIEW_SOURCES } from '@/lib/legal/sources'

function TocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <a href={href} className="text-purple-300 underline underline-offset-2">{children}</a>
    </li>
  )
}

function PublishedTerms() {
  return (
    <>
      <nav className="rounded-2xl border border-gray-800 bg-[#111118] p-4 mb-6">
        <p className="text-white text-sm font-bold mb-2">목차</p>
        <ul className="space-y-1 text-sm text-gray-400">
          <TocLink href="#article-1">제1조 목적</TocLink>
          <TocLink href="#article-2">제2조 서비스 성격</TocLink>
          <TocLink href="#article-3">제3조 회원가입</TocLink>
          <TocLink href="#article-4">제4조 엽전 및 결제</TocLink>
          <TocLink href="#refund">제5조 청약철회 및 환불</TocLink>
          <TocLink href="#article-6">제6조 서비스 이용 제한</TocLink>
          <TocLink href="#article-7">제7조 면책사항</TocLink>
          <TocLink href="#article-8">제8조 문의</TocLink>
        </ul>
      </nav>

      <section id="article-1">
        <h2 className="text-white font-bold mb-2">제1조 (목적)</h2>
        <p>본 약관은 사주궁(이하 &quot;서비스&quot;)가 제공하는 AI 사주 풀이 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
      </section>

      <section id="article-2">
        <h2 className="text-white font-bold mb-2">제2조 (서비스 성격)</h2>
        <p>본 서비스는 <span className="text-yellow-400 font-medium">오락 및 참고 목적</span>으로 제공되는 콘텐츠 서비스입니다. 사주 풀이 결과는 실제 미래를 예측하거나 보장하지 않으며, 중요한 결정(의료, 법률, 재정 등)의 근거로 사용해서는 안 됩니다.</p>
      </section>

      <section id="article-3">
        <h2 className="text-white font-bold mb-2">제3조 (회원가입)</h2>
        <p>서비스는 카카오, 구글, 네이버 소셜 로그인을 통해 가입할 수 있습니다. 가입 시 본 약관 및 개인정보처리방침에 동의한 것으로 간주합니다.</p>
      </section>

      <section id="article-4">
        <h2 className="text-white font-bold mb-2">제4조 (엽전 및 결제)</h2>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 엽전은 서비스 내 유료 콘텐츠 이용을 위한 선불 전자적 수단입니다.</li>
          <li>• 엽전 1냥의 가격은 1,900원이며, 3냥 패키지 구매 시 4,900원의 할인가로 이용할 수 있습니다.</li>
          <li>• 결제는 토스페이먼츠를 통해 처리됩니다.</li>
        </ul>
      </section>

      <section id="refund" className="scroll-mt-6">
        <h2 className="text-white font-bold mb-2">제5조 (청약철회 및 환불)</h2>
        <p className="text-gray-500 text-xs mb-2">본 조는 「전자상거래 등에서의 소비자보호에 관한 법률」(이하 &quot;전자상거래법&quot;) 및 관련 시행령, 공정거래위원회 디지털콘텐츠 표준약관에 근거합니다.</p>
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
          <li className="pl-4">- 위 사유로 환불을 요청하는 경우, 이용자는 사유 발생일로부터 7일 이내에 제8조의 이메일로 결제 내역(주문번호 또는 결제일시)과 사유를 함께 접수해야 하며, 회사는 접수일로부터 3영업일 이내에 검토 결과를 안내합니다.</li>
          <li className="text-gray-300 font-medium mt-2">⑤ 미사용 엽전 잔액 환불</li>
          <li className="pl-4">- 콘텐츠 열람에 사용되지 않은 엽전 잔액에 한해, 충전일로부터 7일 이내 환불 요청이 가능합니다. 7일이 경과했거나 이미 콘텐츠 열람에 사용된 엽전은 환불되지 않습니다.</li>
        </ul>
      </section>

      <section id="article-6">
        <h2 className="text-white font-bold mb-2">제6조 (서비스 이용 제한)</h2>
        <p className="text-gray-400">다음의 경우 서비스 이용이 제한될 수 있습니다.</p>
        <ul className="space-y-1 text-gray-400 mt-2">
          <li>• 타인의 개인정보를 도용하여 가입한 경우</li>
          <li>• 서비스의 정상적인 운영을 방해하는 행위</li>
          <li>• 본 약관을 위반한 경우</li>
        </ul>
      </section>

      <section id="article-7">
        <h2 className="text-white font-bold mb-2">제7조 (면책사항)</h2>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 서비스는 사주 풀이 결과의 정확성을 보장하지 않습니다.</li>
          <li>• 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
          <li>• 이용자가 서비스 결과를 근거로 내린 결정에 대한 책임은 이용자 본인에게 있습니다.</li>
        </ul>
      </section>

      <section id="article-8">
        <h2 className="text-white font-bold mb-2">제8조 (문의)</h2>
        <p>서비스 관련 문의사항은 아래 이메일로 연락해 주세요.</p>
        <p className="text-purple-400 font-medium mt-1">{SUPPORT_EMAIL}</p>
      </section>

      <section>
        <h2 className="text-white font-bold mb-2">부칙</h2>
        <p className="text-gray-500">본 약관은 2026년 8월 14일부터 시행됩니다.</p>
      </section>
    </>
  )
}

function DraftTerms() {
  const empty = (label: string) => (
    <span className="text-gray-500">{label}: 미입력 — 운영자 확인 후 게시 예정</span>
  )

  return (
    <>
      <nav className="rounded-2xl border border-gray-800 bg-[#111118] p-4 mb-6">
        <p className="text-white text-sm font-bold mb-2">목차</p>
        <ul className="space-y-1 text-sm text-gray-400">
          <TocLink href="#article-1">제1조 목적</TocLink>
          <TocLink href="#article-2">제2조 서비스 성격</TocLink>
          <TocLink href="#article-3">제3조 회원가입</TocLink>
          <TocLink href="#article-4">제4조 엽전 및 결제</TocLink>
          <TocLink href="#refund">제5조 환불 및 결제 취소</TocLink>
          <TocLink href="#article-6">제6조 서비스 이용 제한</TocLink>
          <TocLink href="#article-7">제7조 면책사항</TocLink>
          <TocLink href="#article-8">제8조 문의</TocLink>
          <TocLink href="#article-9">제9조 사업자정보</TocLink>
        </ul>
      </nav>

      <section id="article-1">
        <h2 className="text-white font-bold mb-2">제1조 (목적)</h2>
        <p>본 약관은 사주궁(이하 &quot;서비스&quot;)가 제공하는 AI 사주 풀이 서비스의 이용 조건 및 절차, 이용자와 서비스 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.</p>
      </section>

      <section id="article-2">
        <h2 className="text-white font-bold mb-2">제2조 (서비스 성격)</h2>
        <p>본 서비스는 <span className="text-yellow-400 font-medium">오락 및 참고 목적</span>으로 제공되는 콘텐츠 서비스입니다. 사주 풀이 결과는 실제 미래를 예측하거나 보장하지 않으며, 중요한 결정(의료, 법률, 재정 등)의 근거로 사용해서는 안 됩니다.</p>
      </section>

      <section id="article-3">
        <h2 className="text-white font-bold mb-2">제3조 (회원가입)</h2>
        <p>서비스는 카카오, 구글, 네이버 소셜 로그인을 통해 가입할 수 있습니다. 가입 과정에서 이용약관 및 개인정보처리방침에 대한 안내는 콘텐츠 안내 확인과 별개입니다. 콘텐츠 안내 확인만으로 약관 동의, 개인정보 동의, 마케팅 동의, 결제 확인을 대신하지 않습니다.</p>
      </section>

      <section id="article-4">
        <h2 className="text-white font-bold mb-2">제4조 (엽전 및 결제)</h2>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 엽전은 서비스 내 유료 콘텐츠 이용을 위한 선불 전자적 수단입니다.</li>
          <li>• 확정 단가: 엽전 1냥 = 1,900원.</li>
          <li>• 현재 Production에 표시되는 판매 구성: 1냥(1,900원), 3냥 패키지(4,900원).</li>
          <li>• 다른 작업 브랜치에 5냥·10냥 할인 패키지와 엽전 차감 방식의 사주 전체보기 구현이 있으나, 이 초안 작성 시점 기준으로 Production에 반영되지 않았습니다. 미반영 기능을 현재 운영 중이라고 보지 않습니다.</li>
          <li>• 가입 시 1냥이 지급될 수 있고, 출석 보상으로 무료 엽전이 지급될 수 있습니다. 유상 구매 엽전과 무료·보너스 엽전은 구분하여 기록하는 것이 원칙이나, Production 잔액은 단일 숫자로 관리되고 있습니다.</li>
          <li>• 결제는 토스페이먼츠 연동을 전제로 하되, 실제 결제 활성화·PG 계약 상태는 이 문서가 확정하지 않습니다.</li>
        </ul>
      </section>

      <section id="refund" className="scroll-mt-6">
        <h2 className="text-white font-bold mb-2">제5조 (환불 및 결제 취소)</h2>
        <p className="text-gray-500 text-xs mb-3">본 조는 운영자 확인용 초안입니다. 법령 문구를 그대로 고객 확정 약관으로 단정하지 않으며, 법률 검토 완료를 의미하지 않습니다.</p>

        <h3 className="text-gray-200 font-medium mt-4 mb-2">① 적용 범위와 용어</h3>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 유상 구매 엽전: 이용자가 대금을 지급하고 충전한 엽전.</li>
          <li>• 무료·보너스 엽전: 가입 지급, 출석 보상, 과거 보너스 패키지로 지급된 엽전. 금전 환불 대상이 되는지는 운영자가 별도로 정합니다.</li>
          <li>• 구분 불명 잔액: 유상/무료가 나뉘어 기록되지 않은 기존 잔액. Production 현재 상태입니다.</li>
        </ul>

        <h3 className="text-gray-200 font-medium mt-4 mb-2">② 법령상 요구사항 (운영자가 약관으로 배제할 수 없음)</h3>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 통신판매 계약의 청약철회 기간과 제한 사유는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조를 따릅니다.</li>
          <li>• 디지털콘텐츠의 제공이 개시된 경우 사업자 의사에 반한 청약철회가 제한될 수 있으나, 사업자가 같은 조 제6항 및 시행령 제21조의2에 따른 고지·시험사용 조치를 하지 않으면 그 제한을 주장할 수 없습니다.</li>
          <li>• 가분적 디지털콘텐츠 계약에서는 제공이 개시되지 않은 부분에 대한 청약철회가 가능할 수 있습니다. 엽전 충전과 개별 풀이 제공을 하나의 계약으로 볼지, 가분 계약으로 볼지는 법률 검토가 필요합니다.</li>
          <li>• 표시·광고와 다르거나 계약과 다르게 이행된 경우, 같은 조 제3항에 따라 공급받은 날부터 3개월 이내, 그 사실을 안 날 또는 알 수 있었던 날부터 30일 이내 청약철회를 할 수 있습니다.</li>
          <li>• 청약철회가 인정되면 같은 법 제18조에 따른 대금 환급 기한이 적용됩니다. 디지털콘텐츠의 경우 청약철회한 날을 기준으로 합니다.</li>
          <li>• 디지털콘텐츠라는 이유만으로, 또는 이용자가 안내를 확인했다는 이유만으로 모든 환불을 일괄 배제하지 않습니다.</li>
        </ul>

        <h3 className="text-gray-200 font-medium mt-4 mb-2">③ 현재 확인된 운영 방식 (Production)</h3>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 화면 가격: 1냥 1,900원, 3냥 4,900원.</li>
          <li>• 사주·궁합 등 생성 API는 현재 엽전을 자동 차감하지 않습니다. 일부 결과의 잠금 해제는 토스페이먼츠 결제 확인 후 `is_paid`를 갱신하는 방식으로 구현되어 있습니다.</li>
          <li>• 잔액은 `yeobjeun_balance` 단일 숫자이며, 유상/무료 차감 순서가 Production 코드에 구현되어 있지 않습니다.</li>
          <li>• 환불 자동화 기능은 없습니다. 결제 취소·환불은 문의 접수 후 수동 처리입니다.</li>
        </ul>

        <h3 className="text-gray-200 font-medium mt-4 mb-2">④ 아직 Production에 없는 구현 (다른 브랜치, 운영 중 아님)</h3>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 신규 판매 패키지 초안: 1냥 1,900원, 5냥 9,000원, 10냥 18,000원. 신규 패키지 보너스 0. 과거 5+1·10+2 보너스 잔액은 보존하는 설계.</li>
          <li>• 사주 전체보기: 무료 판결문 3개 이후 나머지 유료 본문을 1냥 예약·차감하는 설계.</li>
          <li>• 확인된 차감 배분 초안: 구분 불명 잔액을 먼저 쓰고, 유상과 보너스가 함께 남으면 유상을 먼저 칩니다. 이 순서는 잔액 회계를 맞추기 위한 임시값이며, 환불 시 보너스 공제 정책으로 확정된 것이 아닙니다.</li>
        </ul>

        <h3 className="text-gray-200 font-medium mt-4 mb-2">⑤ 운영자가 정해야 하는 조건 (초안에서 숫자를 확정하지 않음)</h3>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 미사용 유상 엽전의 환불 가능 여부, 기한, 최소 잔액, 환불 수수료.</li>
          <li>• 일부 사용 후 남은 유상 엽전의 환불 산정 방식.</li>
          <li>• 무료·보너스 엽전을 금전 환불에서 제외할지, 차감 순서에 따라 남은 유상분만 환불할지.</li>
          <li>• 엽전 유효기간.</li>
          <li>• 풀이 생성 전 결제 취소와, 생성·제공 이후 단순 변심의 처리 기준. 생성 전 취소는 제공 개시 전으로 볼 여지가 있으나, 충전 계약과 개별 풀이 계약을 어떻게 나눌지 미정입니다.</li>
        </ul>

        <h3 className="text-gray-200 font-medium mt-4 mb-2">⑥ 생성 실패·미제공·중복 결제·중복 차감</h3>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 회사 귀책으로 유료 콘텐츠가 생성되지 않거나 제공되지 않은 경우, 이용자는 아래 연락처로 접수할 수 있습니다.</li>
          <li>• 처리 방법은 엽전 복구(잔액 환원)와 원래 결제수단으로의 금전 환불로 나뉩니다. 어떤 경우에 어느 방법을 쓸지는 운영자가 정하며, 이 초안은 하나를 강제하지 않습니다.</li>
          <li>• 중복 결제 또는 중복 차감이 확인되면 회사는 중복분을 바로잡아야 합니다. 자동 복구 기능은 현재 Production에 없습니다.</li>
        </ul>

        <h3 className="text-gray-200 font-medium mt-4 mb-2">⑦ 신청 방법과 처리</h3>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 신청: {SUPPORT_EMAIL}</li>
          <li>• 최소 정보: 계정 식별에 필요한 로그인 수단 또는 이메일, 주문번호 또는 결제일시, 신청 사유, 환불을 원하는 대상(충전 건 또는 특정 풀이).</li>
          <li>• 청약철회가 법령상 인정되는 경우의 대금 환급 기한은 전자상거래법 제18조를 따릅니다.</li>
          <li>• 그 외 문의의 검토·회신 기간은 운영자가 정하며, 이 초안은 임의 기한을 두지 않습니다.</li>
        </ul>
      </section>

      <section id="article-6">
        <h2 className="text-white font-bold mb-2">제6조 (서비스 이용 제한)</h2>
        <p className="text-gray-400">다음의 경우 서비스 이용이 제한될 수 있습니다.</p>
        <ul className="space-y-1 text-gray-400 mt-2">
          <li>• 타인의 개인정보를 도용하여 가입한 경우</li>
          <li>• 서비스의 정상적인 운영을 방해하는 행위</li>
          <li>• 본 약관을 위반한 경우</li>
        </ul>
      </section>

      <section id="article-7">
        <h2 className="text-white font-bold mb-2">제7조 (면책사항)</h2>
        <ul className="space-y-1.5 text-gray-400">
          <li>• 서비스는 사주 풀이 결과의 정확성을 보장하지 않습니다. 이 문장은 법령이 정한 환불·청약철회 권리를 배제하지 않습니다.</li>
          <li>• 천재지변, 시스템 장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
          <li>• 이용자가 서비스 결과를 근거로 내린 결정에 대한 책임은 이용자 본인에게 있습니다.</li>
        </ul>
      </section>

      <section id="article-8">
        <h2 className="text-white font-bold mb-2">제8조 (문의)</h2>
        <p>서비스 관련 문의사항은 아래 이메일로 연락해 주세요.</p>
        <p className="text-purple-400 font-medium mt-1">{SUPPORT_EMAIL}</p>
      </section>

      <section id="article-9">
        <h2 className="text-white font-bold mb-2">제9조 (사업자정보)</h2>
        <p className="text-amber-300 text-sm mb-2">사업자정보 미등록 — 운영자 확인 후 게시 예정</p>
        <ul className="space-y-1 text-gray-400">
          <li>• {BUSINESS_INFO.companyName || empty('상호')}</li>
          <li>• {BUSINESS_INFO.representativeName || empty('대표자명')}</li>
          <li>• {BUSINESS_INFO.businessRegistrationNumber || empty('사업자등록번호')}</li>
          <li>• {BUSINESS_INFO.mailOrderReportNumber || empty('통신판매업신고번호')}</li>
          <li>• {BUSINESS_INFO.businessAddress || empty('영업소 주소')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-white font-bold mb-2">부칙</h2>
        <p className="text-gray-500">개정 약관의 시행일은 운영자 확인 및 게시 승인 후에 정합니다. 오늘 날짜로 확정하지 않습니다.</p>
      </section>

      <section className="pt-4 border-t border-gray-800">
        <h2 className="text-white font-bold mb-2">초안 검토 참고 자료</h2>
        <p className="text-gray-500 text-xs mb-2">아래 자료 확인은 법률 검토 완료를 의미하지 않습니다. 확인일 2026-09-08.</p>
        <ul className="space-y-2 text-gray-400 text-xs">
          {LEGAL_REVIEW_SOURCES.map((source) => (
            <li key={source.url}>
              <a href={source.url} className="text-purple-300 underline break-all" target="_blank" rel="noreferrer">
                {source.title}
              </a>
              <span className="block text-gray-500 mt-0.5">{source.note}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export default function LegalTermsView({ mode }: { mode: LegalTermsMode }) {
  const isDraft = mode === 'draft_preview'
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-16">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <h1 className="text-xl font-bold">이용약관</h1>
        </div>

        {isDraft && (
          <div className="mb-5 rounded-2xl border border-amber-700/60 bg-amber-950/40 p-4 text-sm text-amber-100 leading-relaxed">
            <p className="font-bold mb-1">Preview 검토용 초안</p>
            <p>이 문서는 고객용 확정 약관이 아닙니다. 사업자정보 미등록 — 운영자 확인 후 게시 예정. 게시 승인 전까지 Production에는 기존 공개 약관이 유지됩니다.</p>
          </div>
        )}

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          {isDraft ? <DraftTerms /> : <PublishedTerms />}
        </div>
        <Footer clearance={false} />
      </div>
    </div>
  )
}
