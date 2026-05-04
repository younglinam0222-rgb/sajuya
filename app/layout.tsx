import type { Metadata, Viewport } from 'next'
import './globals.css'
import { getServerSession } from 'next-auth'
import SessionProviderWrapper from '@/components/SessionProviderWrapper'

export const metadata: Metadata = {
  title: '사주야 — 당신의 운명을 읽다',
  description: '태어난 시간이 모든 걸 말해준다. 건물주 백할매·근본도령·구미호 선생의 팩폭 사주 풀이.',
  keywords: ['사주', '사주팔자', '운세', '무료운세', '사주풀이', '오늘의운세', '궁합', '대운', '신탁', '운명'],
  openGraph: {
    title: '사주야 — 당신의 운명을 읽다',
    description: '태어난 순간이 이미 다 정해져 있었다. 건물주 백할매가 팩폭으로 알려주는 내 사주.',
    url: 'https://sajuya.vercel.app',
    siteName: '사주야',
    type: 'website',
    images: [{
      url: 'https://sajuya.vercel.app/characters/baekhalma.png',
      width: 800,
      height: 800,
      alt: '사주야 — 당신의 운명을 읽다',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '사주야 — 당신의 운명을 읽다',
    description: '태어난 순간이 이미 다 정해져 있었다.',
    images: ['https://sajuya.vercel.app/characters/baekhalma.png'],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a' }}>
        <SessionProviderWrapper>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}
