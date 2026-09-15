import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '사주 풀이 공유',
  description: '친구가 공유한 사주 풀이',
  robots: { index: false, follow: false, nocache: true, noarchive: true },
  openGraph: {
    title: '친구가 공유한 사주 풀이',
    description: '사주궁에서 본 풀이를 확인해보세요.',
    images: [{ url: 'https://sajuya.vercel.app/characters/baekhalma.png', width: 800, height: 800 }],
  },
}

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children
}
