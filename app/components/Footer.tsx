import Link from 'next/link'
import { COPYRIGHT_LINE, COPYRIGHT_LINE_WITH_EMAIL, SUPPORT_EMAIL } from '@/lib/siteBranding'

type FooterProps = {
  showEmailInCopyright?: boolean
  clearance?: boolean
}

export default function Footer({ showEmailInCopyright = true, clearance = true }: FooterProps) {
  return (
    <footer className={`relative z-[60] bg-[#0a0a0f] border-t border-gray-900 ${clearance ? 'pb-28' : 'pb-8'}`}>
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="relative z-10 flex flex-wrap gap-x-4 gap-y-2 mb-4 justify-center">
          <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-400 py-2 px-1 min-h-11 inline-flex items-center">이용약관</Link>
          <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 py-2 px-1 min-h-11 inline-flex items-center">개인정보처리방침</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-xs text-gray-600 hover:text-gray-400 py-2 px-1 min-h-11 inline-flex items-center">고객센터</a>
        </div>
        <p className="text-center text-[10px] text-gray-700 leading-relaxed">
          본 서비스는 전통 사주 해석 기반 엔터테인먼트 콘텐츠입니다.<br />
          의료·법률·재정 판단을 대체하지 않으며, 만 14세 이상 이용 가능합니다.<br />
          문의: {SUPPORT_EMAIL}
        </p>
        <p className="text-center text-[10px] text-gray-800 mt-2">
          {showEmailInCopyright ? COPYRIGHT_LINE_WITH_EMAIL : COPYRIGHT_LINE}
        </p>
      </div>
    </footer>
  )
}
