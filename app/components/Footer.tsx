import Link from 'next/link'

export default function Footer({ clearance = true }: { clearance?: boolean } = {}) {
  return (
    <footer className={`bg-[#0c1119] border-t border-[#344151] ${clearance ? 'pb-24' : 'pb-8'}`}>
      <div className="max-w-[640px] mx-auto px-6 py-8">
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 justify-center">
          <Link href="/terms" className="inline-flex min-h-11 items-center text-xs text-[#a7b3c3] hover:text-[#d4bc92]">이용약관</Link>
          <Link href="/privacy" className="inline-flex min-h-11 items-center text-xs text-[#a7b3c3] hover:text-[#d4bc92]">개인정보처리방침</Link>
          <Link href="/refund" className="inline-flex min-h-11 items-center text-xs text-[#a7b3c3] hover:text-[#d4bc92]">환불정책</Link>
          <a href="mailto:sajuya.help@gmail.com" className="inline-flex min-h-11 items-center text-xs text-[#a7b3c3] hover:text-[#d4bc92]">고객센터</a>
        </div>
        <p className="text-center text-xs text-slate-400 leading-relaxed">
          본 서비스는 전통 사주 해석 기반 엔터테인먼트 콘텐츠입니다.<br />
          의료·법률·재정 판단을 대체하지 않으며, 만 14세 이상 이용 가능합니다.<br />
          문의: sajuya.help@gmail.com
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">© {new Date().getFullYear()} 사주궁</p>
      </div>
    </footer>
  )
}
