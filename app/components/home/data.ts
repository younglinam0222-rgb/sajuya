export const CHAR_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong:  '/characters/doryeong.png',
  gumiho:    '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}

export const CHARACTERS = [
  { id: 'baekhalma', name: '건물주 백할매', tag: '재물·직업', color: '#C6A66D', bg: 'linear-gradient(135deg, #1a1025, #2d1b69)' },
  { id: 'doRyeong',  name: '근본도령',      tag: '종합 사주', color: '#80A5C4', bg: 'linear-gradient(135deg, #0f1525, #1e3a8a)' },
  { id: 'gumiho',    name: '구미호 선생',   tag: '연애·궁합', color: '#C18C9D', bg: 'linear-gradient(135deg, #1a0f18, #831843)' },
  { id: 'sinRyeong', name: '무등산 신령님', tag: '대운·인생', color: '#8BAB98', bg: 'linear-gradient(135deg, #0a1a14, #065f46)' },
]

// ─── 캐러셀 배너 데이터 ───────────────────────────────
export const BANNERS = [
  {
    id: 0,
    tag: '✦ 건물주 백할매 특급',
    title: '지금 하는 일,\n나와 맞을까',
    desc: '기질부터 돈과 일의 흐름까지, 나를 읽는 사주 풀이',
    href: '/saju',
    cta: '내 사주 풀이 시작하기 →',
    charId: 'baekhalma',
    bg: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 60%, #1a0a2e 100%)',
    accent: '#C6A66D',
    emoji: '💜',
  },
  {
    id: 1,
    tag: '✦ 구미호 선생 특급',
    title: '우리는 왜\n자꾸 엇갈릴까',
    desc: '두 사람의 성향과 관계를 함께 살펴보세요',
    href: '/gunghap',
    cta: '궁합 준비 안내 →',
    charId: 'gumiho',
    bg: 'linear-gradient(135deg, #1a0f18 0%, #831843 60%, #1a0f18 100%)',
    accent: '#C18C9D',
    emoji: '💕',
  },
  {
    id: 2,
    tag: '✦ 무등산 신령님 특급',
    title: '지금 내 대운\n어디쯤 왔나',
    desc: '10년 주기 큰 흐름 해설',
    href: '/daeun',
    cta: '대운 준비 안내 →',
    charId: 'sinRyeong',
    bg: 'linear-gradient(135deg, #0a1a14 0%, #065f46 60%, #0a1a14 100%)',
    accent: '#8BAB98',
    emoji: '🌊',
  },
  {
    id: 3,
    tag: '✦ 첫 1회 무료',
    title: '오늘 하루\n기운 어때',
    desc: '일일운세 첫 1회 무료로 확인',
    href: '/daily',
    cta: '첫 운세 체험하기 →',
    charId: 'doRyeong',
    bg: 'linear-gradient(135deg, #0f1525 0%, #1e3a8a 60%, #0f1525 100%)',
    accent: '#80A5C4',
    emoji: '⭐',
  },
]

interface MenuItem {
  href: string; label: string; desc: string; emoji: string
  icon?: string
  badge: string; badgeColor: string; paid: boolean
}

export const MENUS: MenuItem[] = [
  { href: '/saju',    label: '사주 풀이',   desc: '생년월일시로 보는 종합 사주',  emoji: '🔮', icon: '/icons/saju.png', badge: '1900원',   badgeColor: '#F59E0B', paid: true },
  { href: '/gunghap', label: '궁합 해설',   desc: '두 사람의 사주 궁합 분석',     emoji: '💞', badge: '준비 중',   badgeColor: '#F59E0B', paid: true },
  { href: '/daeun',   label: '대운 해설',   desc: '10년 주기 큰 흐름',           emoji: '🌊', badge: '준비 중', badgeColor: '#8BAB98', paid: false },
  { href: '/taekil',  label: '택 · 일',    desc: '좋은 날짜 골라줌',            emoji: '📅', badge: '준비 중', badgeColor: '#8BAB98', paid: false },
  { href: '/yearly',  label: '연도별 운세', desc: '특정 연도 운세 분석',          emoji: '📆', badge: '준비 중', badgeColor: '#8BAB98', paid: false },
  { href: '/daily',   label: '일일 운세',   desc: '오늘 하루 기운',              emoji: '⭐', badge: '첫 1회 무료',    badgeColor: '#80A5C4', paid: false },
]

