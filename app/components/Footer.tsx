import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#0a0a0f] border-t border-gray-900 pb-24">
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 justify-center">
          <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-400">이용약관</Link>
          <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-400">개인정보처리방침</Link>
          <Link href="/refund" className="text-xs text-gray-600 hover:text-gray-400">환불정책</Link>
          <a href="mailto:sajuya.help@gmail.com" className="text-xs text-gray-600 hover:text-gray-400">고객센터</a>
        </div>
        <p className="text-center text-[10px] text-gray-700 leading-relaxed">
          본 서비스는 전통 사주 해석 기반 엔터테인먼트 콘텐츠입니다.<br />
          의료·법률·재정 판단을 대체하지 않으며, 만 14세 이상 이용 가능합니다.<br />
          문의: sajuya.help@gmail.com
        </p>
        <p className="text-center text-[10px] text-gray-800 mt-2">© 2025 사주야</p>
      </div>
    </footer>
  )
}
