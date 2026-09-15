import type { Metadata, Viewport } from 'next'
import './globals.css'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'
import KakaoInit from '@/components/KakaoInit'
import KakaoInAppRedirect from '@/components/KakaoInAppRedirect'

export const metadata: Metadata = {
  title: '사주궁 — 당신의 운명을 읽다',
  description: '생년월일과 고민을 바탕으로 읽는 AI 사주 풀이. 네 명의 가상 안내자와 나를 돌아보세요.',
  keywords: ['사주', '사주팔자', '운세', '무료운세', '사주풀이', '오늘의운세', '궁합', '대운', '신탁', '운명'],
  openGraph: {
    title: '사주궁 — 당신의 운명을 읽다',
    description: '생년월일과 고민을 바탕으로 읽는 AI 사주 풀이. 네 명의 가상 안내자와 나를 돌아보세요.',
    url: 'https://sajuya.vercel.app',
    siteName: '사주궁',
    type: 'website',
    images: [{
      url: 'https://sajuya.vercel.app/characters/baekhalma.png',
      width: 800,
      height: 800,
      alt: '사주궁 — 당신의 운명을 읽다',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사주궁 — 당신의 운명을 읽다',
    description: '생년월일과 고민을 바탕으로 나를 돌아보는 AI 사주 풀이.',
    images: ['https://sajuya.vercel.app/characters/baekhalma.png'],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="palace-theme">
        <KakaoInAppRedirect />
        <KakaoInit />
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
