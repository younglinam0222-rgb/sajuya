import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '사주야 - 내 운명을 꿰뚫는 신탁 | 990원',
  description: '건물주 백할매, 근본도령, 구미호 선생이 알려주는 팩폭 사주 풀이. 단 990원에 전체 풀이 열람 가능.',
  keywords: ['사주', '사주팔자', '운세', '무료운세', '사주풀이', '오늘의운세', '궁합', '대운'],
  openGraph: {
    title: '사주야 - 당신의 운명을 읽다',
    description: '태어난 순간이 이미 다 정해져 있었다.건물주 백할매가 팩폭으로 알려주는 내 사주. 단 990원.',
    url: 'https://saju-ya.com',
    siteName: '사주야',
    type: 'website',
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
        {children}
      </body>
    </html>
  )
}
