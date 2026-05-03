// lib/occupations.ts
// 직업 카테고리 시스템
// 캐릭터 프롬프트에 자동 삽입되어 맞춤 풀이 생성

export type OccupationId = 'business' | 'employee' | 'housewife' | 'student' | 'general'

export interface OccupationConfig {
  id: OccupationId
  label: string
  emoji: string
  subLabel: string
  // AI에게 주입하는 직업 컨텍스트
  aiContext: string
  // 재물운 섹션 끝에 자동 삽입되는 광고 유도 문구
  adTrigger: string
  // 직업운 섹션 끝 문구
  careerTrigger: string
  // 카카오 공유 제목 패턴
  shareTitlePatterns: string[]
  // 애드센스 광고 카테고리 힌트
  adCategory: string
  // 예상 CPC 범위
  expectedCPC: string
}

export const OCCUPATIONS: Record<OccupationId, OccupationConfig> = {

  business: {
    id: 'business',
    label: '사업가',
    emoji: '💼',
    subLabel: '창업 / 자영업',
    aiContext: `
이 사람은 사업가 또는 자영업자야.
핵심 관심사: 매출, 현금흐름, 직원 관리, 사업 확장 타이밍, 투자 적기
사용 언어: 현금흐름, 고정비, 매출, 거래처, 직원, 사업 확장, 투자
조언 방향: 사업 운영 타이밍 + 거래처/파트너 관계 + 자금 관리
비유: 회사 비유, 돈의 흐름 비유를 자연스럽게 사용
    `,
    adTrigger: `할미가 보니까 지금 당장 법인 운영비부터 잡아야 해. 기업 대출 금리 높은 거 있으면 빨리 갈아타고, 사업자 보험 설계 다시 받아봐라 인간아.`,
    careerTrigger: `사업 확장 타이밍은 억지로 밀어붙인다고 되는 게 아니야. 지금은 내실 다지는 시기야. 세무사 한 번 만나봐라.`,
    shareTitlePatterns: [
      '{name}의 사업 흑자 전환 시기를 백할매가 짚어줬다',
      '백할매가 내 사업 지금 당장 뭐 해야 한다고 했는데',
      '내 사주에 사업운 있는지 봤더니 소름 돋았다',
      '사업가 사주 봤더니 올해 이렇게 가래',
    ],
    adCategory: 'finance,insurance,business',
    expectedCPC: '3,000~8,000원',
  },

  employee: {
    id: 'employee',
    label: '직장인',
    emoji: '🏢',
    subLabel: '회사원 / 공무원',
    aiContext: `
이 사람은 직장인이야. 회사에 다니는 사람.
핵심 관심사: 이직 타이밍, 연봉 협상, 상사와의 관계, 승진, 번아웃, 워라밸
사용 언어: 연봉, 이직, 팀장, 승진, 프로젝트, 번아웃, 직장, 회사
조언 방향: 이직/승진 타이밍 + 직장 내 인간관계 + 사이드 수입 가능성
비유: 회사 생활, 직장 상황을 자연스럽게 녹여서
    `,
    adTrigger: `이직 생각 있으면 지금 이력서부터 업데이트해라. 전세 대출도 금리 비교 한번 해봐. 그냥 있으면 손해야 인간아.`,
    careerTrigger: `지금 회사에서 인정받을 타이밍이야. 근데 한 군데만 보지 말고 사이드 수입도 하나 만들어놔라. 본업 의존도 낮추는 게 진짜 전략이야.`,
    shareTitlePatterns: [
      '이직 타이밍 사주로 봤더니 소름 돋았다',
      '백할매가 나보고 지금 당장 이직 준비하래',
      '내 직장운 사주로 봤는데 이게 맞네',
      '연봉 협상 언제 해야 되냐고 물었더니',
    ],
    adCategory: 'jobs,finance,realestate',
    expectedCPC: '1,500~4,000원',
  },

  housewife: {
    id: 'housewife',
    label: '주부',
    emoji: '🏠',
    subLabel: '육아 / 가사',
    aiContext: `
이 사람은 주부야. 가정을 책임지는 사람.
핵심 관심사: 가정 재정, 자녀 교육운, 남편 재물운, 가족 건강, 인간관계
사용 언어: 가정, 아이, 자녀, 남편, 살림, 교육비, 가족
조언 방향: 가정 재정 관리 + 자녀 교육 타이밍 + 부부 관계 + 본인 에너지 관리
비유: 집안, 가족 관계를 자연스럽게 녹여서
    `,
    adTrigger: `아이 교육비는 지금부터 분리해서 모아라. 실손보험 갱신 시기 놓치지 마라. 가정을 지키는 게 제일 큰 사업이야 인간아.`,
    careerTrigger: `본인 노후 준비도 지금부터 조금씩 시작해라. 아이들 챙기다가 본인 챙기는 걸 빠뜨리지 마. 연금 하나라도 들어놔라.`,
    shareTitlePatterns: [
      '남편 재물운 봤더니 이래서 돈이 없었구나',
      '백할매가 우리 애 교육 이렇게 하래',
      '주부 사주 봤더니 올해 가정운 이래',
      '내 사주에 자녀운 있는지 봤는데',
    ],
    adCategory: 'insurance,education,finance',
    expectedCPC: '2,000~5,000원',
  },

  student: {
    id: 'student',
    label: '학생',
    emoji: '🎓',
    subLabel: '입시 / 취준',
    aiContext: `
이 사람은 학생이야. 공부하거나 취업 준비 중인 사람.
핵심 관심사: 수능/시험 운, 취업 타이밍, 연애, 아르바이트, 진로
사용 언어: 시험, 취업, 알바, 진로, 친구, 연애, 용돈, 스펙
조언 방향: 시험/취업 타이밍 + 진로 방향 + 인간관계 + 돈 관리 습관
비유: 학교 생활, 취준 상황을 자연스럽게 녹여서
말투: 또래처럼 조금 더 친근하게. 근데 팩트는 팩트로.
    `,
    adTrigger: `취업 플랫폼 프로필 지금 당장 업데이트해. 알바 뛰는 돈이라도 30%는 따로 모아라. 습관이 쌓이면 진짜 달라져 인간아.`,
    careerTrigger: `지금 스펙 쌓는 것도 좋은데, 어떤 방향으로 갈지 먼저 정해라. 방향 없이 스펙 쌓으면 다 헛거야.`,
    shareTitlePatterns: [
      '취업 언제 되냐고 물었더니 백할매가 이래',
      '내 진로 사주로 봤는데 이게 맞네',
      '학생 사주 봤더니 올해 이렇게 가래',
      '수능 운 있는지 사주로 봤더니',
    ],
    adCategory: 'jobs,education,finance',
    expectedCPC: '800~2,000원',
  },

  general: {
    id: 'general',
    label: '일반인',
    emoji: '🙂',
    subLabel: '기타 / 선택 안 함',
    aiContext: `
직업 정보 없음. 기본 사주 풀이를 제공해줘.
폭넓고 다양한 상황에 적용 가능한 조언으로.
    `,
    adTrigger: `할미가 보니까 지금 당장 현금 흐름부터 막아야 해. 이자 비싼 대출 있으면 갈아타고, 쓸데없는 보험부터 정리해라 인간아.`,
    careerTrigger: `지금 하는 일이 맞는 방향인지 한 번 점검해봐. 에너지 낭비 없이 가려면 방향이 제일 중요해.`,
    shareTitlePatterns: [
      '내 사주 봤더니 올해 이렇게 가래',
      '백할매가 나한테 이렇게 팩폭했는데',
      '사주 처음 봤는데 소름 돋았다',
      '내 운세 봤더니 이게 맞는 것 같다',
    ],
    adCategory: 'finance,insurance',
    expectedCPC: '800~1,500원',
  },
}

// 직업별 공유 제목 자동 생성
export function generateShareTitle(
  occupationId: OccupationId,
  name: string
): string {
  const occ = OCCUPATIONS[occupationId]
  const patterns = occ.shareTitlePatterns
  const pattern = patterns[Math.floor(Math.random() * patterns.length)]
  return pattern.replace('{name}', name)
}

// 직업 컨텍스트 + 광고 유도 문구를 시스템 프롬프트에 삽입
export function buildOccupationPrompt(occupationId: OccupationId): string {
  const occ = OCCUPATIONS[occupationId]
  return `
[직업 컨텍스트]
${occ.aiContext}

[재물운 섹션 마지막에 반드시 이 문장 삽입]
${occ.adTrigger}

[직업운 섹션 마지막에 반드시 이 문장 삽입]
${occ.careerTrigger}
`
}

// 일주 60개 목록 (SEO 페이지 생성용)
export const ALL_ILJU = [
  '갑자','을축','병인','정묘','무진','기사','경오','신미','임신','계유',
  '갑술','을해','병자','정축','무인','기묘','경진','신사','임오','계미',
  '갑신','을유','병술','정해','무자','기축','경인','신묘','임진','계사',
  '갑오','을미','병신','정유','무술','기해','경자','신축','임인','계묘',
  '갑진','을사','병오','정미','무신','기유','경술','신해','임자','계축',
  '갑인','을묘','병진','정사','무오','기미','경신','신유','임술','계해',
]

// URL용 슬러그 변환
export function iljuToSlug(ilju: string): string {
  return encodeURIComponent(ilju)
}

export function slugToIlju(slug: string): string {
  return decodeURIComponent(slug)
}
