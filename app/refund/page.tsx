import Link from 'next/link'
import Footer from '@/app/components/Footer'

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <div className="max-w-md mx-auto px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
          <h1 className="text-xl font-bold">환불정책</h1>
        </div>

        <div className="mb-5 rounded-2xl border border-yellow-700/50 bg-yellow-500/10 px-4 py-3 text-xs leading-relaxed text-yellow-200">
          이 페이지는 운영 확정 전 정책 초안입니다. 고객용 확정 약관이 아니며, 수수료·기간·보너스 공제 등 미정 항목은 확정하지 않았습니다.
        </div>

        <div className="space-y-6 text-sm text-gray-300 leading-relaxed">
          <section>
            <h2 className="text-white font-bold mb-2">문의</h2>
            <p>환불·결제 오류·중복 차감 문의는 아래 이메일로 접수합니다.</p>
            <p className="text-purple-400 font-medium mt-1">sajuya.help@gmail.com</p>
            <p className="text-gray-500 text-xs mt-2">신청 시 계정(로그인 이메일), 결제일시 또는 주문번호, 대상 풀이(shareId가 있으면 포함), 요청 사유를 함께 보내 주세요.</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">서비스와 결제 구조</h2>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 신규 판매 표시 기준은 1냥 = 1,900원입니다. 이미 결제된 금액, 영수증, 보유 잔액, 구매한 이용 권한은 이 페이지로 바뀌지 않습니다.</li>
              <li>• 사주풀이 전체보기는 2냥, 궁합·대운·택일·연도별 운세는 각 1냥입니다. 오늘의 운세는 하루 1회 무료이며 추가 생성은 1냥입니다.</li>
              <li>• 충전 패키지는 실제 구성(1냥 1,900원, 3냥 패키지 4,900원)을 따릅니다. 패키지 할인·보너스를 이 초안에서 바꾸지 않습니다.</li>
              <li>• 현재 서버의 엽전 잔액은 유상/무료를 나누어 저장하지 않습니다. 차감 순서는 운영 확정 전까지 단일 잔액에서 차감됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">무료 샘플과 유료 전체보기</h2>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 사주풀이는 성격·재물운·애정운 판결문 3개와 만세력·기본 정보를 무료로 제공합니다.</li>
              <li>• 2냥 전체보기는 해당 풀이 1건의 나머지 판결문 9개, 족집게 질문 답변, 인생 전략·전성기 활용법 등 부가 해석의 이용 권한입니다.</li>
              <li>• 같은 결과를 다시 열거나 새로고침하는 재열람은 새 구매가 아닙니다. 새 풀이 생성과 기존 결과 재열람은 구분합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">청약철회·환불의 법령 기준</h2>
            <p className="text-gray-500 text-xs mb-2">
              근거: 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조, 같은 법 시행령 제21조의2. 찾기쉬운 생활법령정보(easylaw.go.kr) 해설을 참고했습니다.
            </p>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 통신판매 계약은 원칙적으로 계약 내용에 관한 서면 등을 받은 날부터 7일 이내 청약철회가 가능합니다(제17조 제1항).</li>
              <li>• 디지털콘텐츠의 제공이 개시된 경우에는 사업자의 의사에 반하여 청약철회가 제한될 수 있습니다(제17조 제2항 제5호). 가분적 콘텐츠는 아직 제공되지 않은 부분에 대해 철회가 가능할 수 있습니다.</li>
              <li>• 사업자가 청약철회 제한 사실을 명확히 알리고, 시험 사용 상품을 제공하는 등 법령이 정한 조치를 하지 않으면 위 제한을 주장할 수 없습니다(제17조 제2항 단서, 제6항).</li>
              <li>• 표시·광고와 다르거나 계약과 다르게 이행된 경우에는 별도 청약철회 기간이 적용됩니다(제17조 제3항).</li>
              <li>• 디지털콘텐츠라는 이유만으로 모든 환불을 일괄 배제하지 않습니다. 미사용 충전금, 생성 전 취소, 미제공·실패, 중복 결제·중복 차감은 아래와 같이 구분합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">유형별 처리 초안</h2>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 미사용 충전금: 콘텐츠 이용에 쓰지 않은 잔액에 대한 환불 요청은 접수합니다. 가능 기간·수수료·부분 환불 산정은 운영자 확정 사항입니다.</li>
              <li>• 일부 사용 충전금: 이미 차감되어 제공이 개시된 건과 남은 잔액을 나눕니다. 남은 미사용 잔액의 환불 가능 여부는 운영자 확정 사항입니다.</li>
              <li>• 유상 엽전과 무료·보너스 엽전: 현재 DB는 잔액을 구분하지 않습니다. 공제 순서와 환불 시 보너스 차감 기준은 운영자 확정 사항입니다.</li>
              <li>• 유료 생성 전 취소: 전체보기 권한이 생기기 전, 또는 유료 본문 생성이 시작되기 전의 취소 요청은 접수합니다. 자동 환불은 이 범위에 없습니다.</li>
              <li>• 생성·제공 이후: 유료 본문이 제공된 뒤에는 제17조 제2항 제5호가 문제될 수 있습니다. 단순 변심만으로 일괄 거절하지 않고, 미제공 부분·법령상 예외·운영 판단을 구분해 안내합니다.</li>
              <li>• 생성 실패·결과 미제공: 무료 샘플은 보존합니다. 유료 본문이 최종 제공되지 않은 경우의 엽전 복구 여부는 기존 구현상 사주 전체보기는 자동 복구가 없고, 오늘의 운세 유료 재생성은 pending 만료 시 복구 RPC가 있습니다. 사주 전체보기의 최종 실패 복구는 미결정입니다.</li>
              <li>• 중복 결제·중복 차감: 확인되면 중복분을 바로잡지 않은 채 구매 성공으로 두지 않습니다. 복구 방법은 엽전 재지급 또는 원래 결제수단 환불 중 운영자가 정합니다.</li>
              <li>• 엽전 복구와 금전 환불: 서비스 내 잔액 복구와 카드·간편결제 취소는 다릅니다. 어떤 경우에 금전 환불을 할지는 운영자 확정 사항입니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">처리 절차</h2>
            <ul className="space-y-1.5 text-gray-400">
              <li>• 접수: sajuya.help@gmail.com</li>
              <li>• 검토 및 회신 기간, 환불 소요 기간, 수수료는 이 초안에서 정하지 않습니다.</li>
              <li>• 시행일: 운영자가 확정 문구를 게시하는 날. 이 초안의 게시만으로 확정 시행하지 않습니다.</li>
              <li>• 이 페이지는 환불 자동화 기능이 아닙니다. 신청은 고객센터 이메일로 처리합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">관련 문서</h2>
            <p>
              <Link href="/terms" className="text-purple-400 underline">이용약관</Link>
              {' · '}
              <Link href="/privacy" className="text-purple-400 underline">개인정보처리방침</Link>
            </p>
            <p className="text-gray-600 text-xs mt-3">이용약관 제5조에 적힌 7일 미사용 엽전 문구 등은 기존 문서이며, 이 초안이 그 수치를 재확정하지는 않습니다.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  )
}
