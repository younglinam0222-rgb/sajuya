// app/saju-info/[ilju]/[job]/page.tsx
// 일주 60개 × 직업 5개 = 300개 SEO 정적 페이지
// 구글 검색: "갑자일주 직장인 재물운" 등 롱테일 키워드 공략

import { Metadata } from 'next'
import Link from 'next/link'
import { ALL_ILJU, OCCUPATIONS, OccupationId } from '@/lib/occupations'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { ilju: string; job: string }
}

// ── 300개 정적 경로 생성 ──
export async function generateStaticParams() {
  const params: { ilju: string; job: string }[] = []
  const jobIds = Object.keys(OCCUPATIONS) as OccupationId[]

  for (const ilju of ALL_ILJU) {
    for (const job of jobIds) {
      params.push({
        ilju: encodeURIComponent(ilju),
        job,
      })
    }
  }
  return params
}

// ── 고유 메타데이터 자동 생성 ──
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const ilju = decodeURIComponent(params.ilju)
  const job = OCCUPATIONS[params.job as OccupationId]
  if (!job) return {}

  const title = `${ilju}일주 ${job.label} 사주 완전분석 | 사주야`
  const desc = `${ilju}일주 ${job.label}의 재물운, 직업운, 연애운을 AI가 분석합니다. ${job.label} 특화 맞춤 사주풀이 무료 제공.`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url: `https://saju-ya.com/saju-info/${params.ilju}/${params.job}`,
    },
    // 구조화 데이터용
    other: {
      'article:section': '사주풀이',
      keywords: `${ilju}일주,${job.label} 사주,${ilju}일주 ${job.label},사주풀이,운세`,
    },
  }
}

// ── 일주별 오행 정보 ──
const ILJU_INFO: Record<string, { element: string; color: string; trait: string }> = {
  갑: { element: '木', color: '#16a34a', trait: '리더십과 성장의 기운' },
  을: { element: '木', color: '#16a34a', trait: '유연함과 적응력' },
  병: { element: '火', color: '#dc2626', trait: '열정과 표현력' },
  정: { element: '火', color: '#dc2626', trait: '섬세한 감수성' },
  무: { element: '土', color: '#d97706', trait: '안정과 신뢰' },
  기: { element: '土', color: '#d97706', trait: '실용적 사고' },
  경: { element: '金', color: '#7c3aed', trait: '결단력과 원칙' },
  신: { element: '金', color: '#7c3aed', trait: '날카로운 통찰' },
  임: { element: '水', color: '#2563eb', trait: '깊은 지혜와 흐름' },
  계: { element: '水', color: '#2563eb', trait: '섬세한 직관력' },
}

export default function IljuJobPage({ params }: PageProps) {
  const ilju = decodeURIComponent(params.ilju)
  const job = OCCUPATIONS[params.job as OccupationId]

  if (!job || !ALL_ILJU.includes(ilju)) notFound()

  const stemChar = ilju[0]
  const iljuInfo = ILJU_INFO[stemChar] || { element: '?', color: '#888', trait: '독특한 기운' }

  // 직업별 맞춤 콘텐츠
  const jobSpecificContent: Record<OccupationId, { career: string; money: string; advice: string }> = {
    business: {
      career: `${ilju}일주 사업가는 ${iljuInfo.trait}을 사업에 발휘하는 타입입니다. 거래처 관리와 타이밍 포착 능력이 탁월하여, 시장의 흐름을 읽는 눈이 발달합니다.`,
      money: `재물운 측면에서 ${ilju}일주 사업가는 꾸준한 현금흐름 관리가 핵심입니다. 큰 한 방보다 안정적인 수익 구조를 먼저 잡는 것이 이 일주의 재물 전략입니다.`,
      advice: `법인 운영비 최적화와 파트너십 타이밍을 신중하게 판단하세요. ${ilju}일주의 강점인 ${iljuInfo.trait}을 비즈니스 전략에 적극 활용하십시오.`,
    },
    employee: {
      career: `${ilju}일주 직장인은 ${iljuInfo.trait}으로 조직 내에서 두각을 나타냅니다. 상사와의 관계에서 신뢰를 구축하는 능력이 뛰어나며, 적절한 이직 타이밍을 잡는 안목이 있습니다.`,
      money: `직장인으로서 ${ilju}일주는 연봉 협상에서 자신의 가치를 정확히 제시하는 것이 중요합니다. 사이드 수입 하나를 본업 외에 마련해두는 것이 이 일주의 재물 안정 전략입니다.`,
      advice: `이직은 하고 싶을 때가 아닌, 사주의 흐름이 맞을 때 해야 합니다. ${ilju}일주의 직장운은 타이밍이 핵심입니다.`,
    },
    housewife: {
      career: `${ilju}일주 주부는 ${iljuInfo.trait}으로 가정의 중심을 잡는 역할을 합니다. 자녀 교육과 가족 구성원들의 운세 흐름을 파악하는 데 직관력이 발달합니다.`,
      money: `가정 재정 관리에서 ${ilju}일주 주부는 장기적 안목이 뛰어납니다. 자녀 교육비 계획과 부부 재정 분리 관리가 이 일주의 가정 재물운을 높이는 열쇠입니다.`,
      advice: `본인의 노후 준비를 자녀 교육과 병행하는 것이 중요합니다. ${ilju}일주의 강점을 가정 경영에 발휘하세요.`,
    },
    student: {
      career: `${ilju}일주 학생은 ${iljuInfo.trait}을 바탕으로 진로 방향을 설정합니다. 시험 운과 취업 타이밍에서 이 일주의 특성이 강하게 작용합니다.`,
      money: `용돈과 알바비 관리에서 ${ilju}일주 학생은 저축 습관을 일찍 들이는 것이 핵심입니다. 수입의 30%를 자동으로 분리 저축하는 시스템을 만드세요.`,
      advice: `스펙보다 방향이 먼저입니다. ${ilju}일주의 ${iljuInfo.trait}이 가장 잘 발휘되는 진로를 선택하면 취업 타이밍도 자연스럽게 맞아떨어집니다.`,
    },
    general: {
      career: `${ilju}일주는 ${iljuInfo.trait}을 가진 일주입니다. 어떤 직종이든 이 기운을 살리는 방향으로 나아가면 자연스러운 성장이 따라옵니다.`,
      money: `${ilju}일주의 재물운은 꾸준함에서 나옵니다. 한 방을 노리기보다 안정적인 자산 증식 전략이 이 일주에 맞는 방향입니다.`,
      advice: `${ilju}일주의 고유한 기운인 ${iljuInfo.trait}을 삶의 여러 방면에서 발휘해 보세요. 사주야에서 더 자세한 풀이를 확인할 수 있습니다.`,
    },
  }

  const content = jobSpecificContent[params.job as OccupationId]

  // 관련 일주 링크 (앞뒤 일주)
  const currentIdx = ALL_ILJU.indexOf(ilju)
  const prevIlju = ALL_ILJU[(currentIdx - 1 + 60) % 60]
  const nextIlju = ALL_ILJU[(currentIdx + 1) % 60]

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff', maxWidth: '680px', margin: '0 auto', padding: '24px 16px', fontFamily: 'Noto Sans KR, sans-serif' }}>

      {/* 헤더 */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/" style={{ color: '#a78bfa', fontSize: '13px', textDecoration: 'none' }}>← 사주야 홈</Link>
        <h1 style={{ fontSize: '26px', fontWeight: 900, marginTop: '12px', lineHeight: 1.3 }}>
          {ilju}일주 {job.emoji} {job.label}<br />
          <span style={{ color: '#a78bfa' }}>사주 완전분석</span>
        </h1>
        <p style={{ color: '#888', fontSize: '13px', marginTop: '8px' }}>
          {iljuInfo.element}({iljuInfo.element}) 기운 · {iljuInfo.trait}
        </p>
      </div>

      {/* 오행 배지 */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#111', border: `1px solid ${iljuInfo.color}40`, borderRadius: '10px', padding: '8px 14px', marginBottom: '24px' }}>
        <span style={{ fontSize: '20px' }}>{ilju}</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: iljuInfo.color }}>{iljuInfo.element} 기운</div>
          <div style={{ fontSize: '10px', color: '#666' }}>{iljuInfo.trait}</div>
        </div>
      </div>

      {/* 직업별 맞춤 콘텐츠 */}
      {[
        { title: `${job.label} 직업·커리어운`, content: content.career, icon: job.emoji },
        { title: '재물·금전운', content: content.money, icon: '💰' },
        { title: '조언 & 전략', content: content.advice, icon: '💡' },
      ].map((section) => (
        <div key={section.title} style={{ background: '#111', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid #1a1a1a' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{section.icon}</span>{section.title}
          </h2>
          <p style={{ fontSize: '14px', color: '#ccc', lineHeight: 1.8 }}>{section.content}</p>
        </div>
      ))}

      {/* 광고 슬롯 */}
      <div style={{ background: '#111', border: '1.5px dashed #222', borderRadius: '10px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: '#333', fontSize: '12px' }}>
        📢 광고 영역 · Google AdSense
      </div>

      {/* CTA - 사주야로 상세 풀이 */}
      <div style={{ background: 'linear-gradient(135deg,#1a0030,#2d1060)', borderRadius: '16px', padding: '20px', textAlign: 'center', border: '1.5px solid rgba(124,58,237,.4)', marginBottom: '20px' }}>
        <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '6px' }}>🔮 {form_name_placeholder}님의 사주를 직접 풀이받으세요</div>
        <div style={{ fontSize: '12px', color: '#888', marginBottom: '14px' }}>백할매가 {job.label} 맞춤 팩폭 풀이를 해드립니다</div>
        <Link href={`/?occupation=${params.job}`}
          style={{ display: 'inline-block', background: '#7c3aed', color: '#fff', padding: '12px 28px', borderRadius: '12px', fontWeight: 700, textDecoration: 'none', fontSize: '14px' }}>
          🪙 990원으로 내 사주 보기
        </Link>
      </div>

      {/* 관련 일주 내비게이션 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
        <Link href={`/saju-info/${encodeURIComponent(prevIlju)}/${params.job}`}
          style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 12px', textDecoration: 'none', color: '#888', fontSize: '12px' }}>
          ← {prevIlju}일주 {job.label}
        </Link>
        <Link href={`/saju-info/${encodeURIComponent(nextIlju)}/${params.job}`}
          style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '10px 12px', textDecoration: 'none', color: '#888', fontSize: '12px', textAlign: 'right' }}>
          {nextIlju}일주 {job.label} →
        </Link>
      </div>

      {/* 직업 전체 보기 */}
      <div style={{ background: '#111', borderRadius: '12px', padding: '14px', border: '1px solid #1a1a1a' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#888', marginBottom: '10px' }}>{ilju}일주 다른 직업 보기</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {Object.values(OCCUPATIONS).map((occ) => (
            <Link key={occ.id} href={`/saju-info/${encodeURIComponent(ilju)}/${occ.id}`}
              style={{
                background: occ.id === params.job ? 'rgba(124,58,237,.15)' : '#1a1a1a',
                border: occ.id === params.job ? '1px solid #7c3aed' : '1px solid #222',
                borderRadius: '8px', padding: '5px 10px', textDecoration: 'none',
                color: occ.id === params.job ? '#a78bfa' : '#888', fontSize: '12px', fontWeight: 600,
              }}>
              {occ.emoji} {occ.label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}

// placeholder 변수 (실제로는 동적으로 처리)
const form_name_placeholder = '내'
