import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CHARACTERS } from '@/lib/characters'
import { correctToTrueSolarTime } from '@/lib/solarTime'

// ✅ 수정(재발): 120초로도 부족해서 타임아웃 발생 (Vercel Runtime Timeout Error, 504)
// 결혼상태 반영 등 프롬프트 지시사항이 늘어나며 Claude 생성 시간이 길어짐 → 300초로 상향
export const maxDuration = 300
export const runtime = 'nodejs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── 만세력 계산 ───────────────────────────────────
const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const STEM_KR = ['갑','을','병','정','무','기','경','신','임','계']
const BRANCH_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해']
const STEM_ELEMENT = ['木','木','火','火','土','土','金','金','水','水']
const BRANCH_ELEMENT = ['水','土','木','木','土','火','火','土','金','金','土','水']
const ANIMALS = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
const SIPSIN = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인']

function getSipsin(dayStemIdx: number, targetStemIdx: number) {
  return SIPSIN[((targetStemIdx - dayStemIdx + 10) % 10)]
}
function getSipsinBranch(dayStemIdx: number, branchIdx: number) {
  const mainStemMap = [9,5,0,1,4,3,2,5,6,7,4,8]
  return SIPSIN[((mainStemMap[branchIdx] - dayStemIdx + 10) % 10)]
}
function calcYearPillar(year: number) {
  const idx = ((year - 4) % 60 + 60) % 60
  const si = idx % 10, bi = idx % 12
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}
function calcMonthPillar(year: number, month: number) {
  const yearStemIdx = ((year - 4) % 10 + 10) % 10
  const bi = (month + 1) % 12
  const stemBase = [0,2,4,6,8][Math.floor(yearStemIdx / 2)]
  const si = (stemBase + (month - 1)) % 10
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}
function calcDayPillar(year: number, month: number, day: number) {
  const base = new Date(1900, 0, 1)
  const target = new Date(year, month - 1, day)
  const diff = Math.floor((target.getTime() - base.getTime()) / 86400000)
  const idx = ((diff % 60) + 60) % 60
  const si = idx % 10, bi = idx % 12
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}
function calcHourPillar(h: number, dayStemIdx: number) {
  const bi = Math.floor(((h + 1) % 24) / 2)
  const stemBase = [0,2,4,6,8][dayStemIdx % 5]
  const si = (stemBase + bi) % 10
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}
const HOUR_NAMES: Record<number, string> = {
  23:'자시(子時)', 0:'자시(子時)', 1:'축시(丑時)', 2:'축시(丑時)',
  3:'인시(寅時)', 4:'인시(寅時)', 5:'묘시(卯時)', 6:'묘시(卯時)',
  7:'진시(辰時)', 8:'진시(辰時)', 9:'사시(巳時)', 10:'사시(巳時)',
  11:'오시(午時)', 12:'오시(午時)', 13:'미시(未時)', 14:'미시(未時)',
  15:'신시(申時)', 16:'신시(申時)', 17:'유시(酉時)', 18:'유시(酉時)',
  19:'술시(戌時)', 20:'술시(戌時)', 21:'해시(亥時)', 22:'해시(亥時)',
}
function calcManse(year: number, month: number, day: number, hourMinute: string, longitude?: number) {
  // ✅ 신규: 출생지(경도) 선택 입력 시 진태양시로 보정 후 계산.
  // 안 넣으면 기존과 완전히 동일하게 표준시 그대로 사용 (선택사항, 필수 아님).
  let y = year, mo = month, d = day, hm = hourMinute
  let solarTimeCorrection: ReturnType<typeof correctToTrueSolarTime> | null = null
  if (longitude && hourMinute) {
    solarTimeCorrection = correctToTrueSolarTime(year, month, day, hourMinute, longitude)
    y = solarTimeCorrection.correctedYear
    mo = solarTimeCorrection.correctedMonth
    d = solarTimeCorrection.correctedDay
    hm = solarTimeCorrection.correctedHourMinute
  }

  const yp = calcYearPillar(y)
  const mp = calcMonthPillar(y, mo)
  const dp = calcDayPillar(y, mo, d)
  const dayStemIdx = dp.stemIdx
  let hp = null, hourStr = '시간 미상'
  if (hm) {
    const parts = hm.split(':')
    const h = parseInt(parts[0])
    const m = parts[1] ? parseInt(parts[1]) : 0
    if (!isNaN(h) && h >= 0 && h <= 23) {
      hp = calcHourPillar(h, dayStemIdx)
      hourStr = `${String(h).padStart(2,'0')}시 ${String(m).padStart(2,'0')}분 (${HOUR_NAMES[h] ?? ''})`
      if (solarTimeCorrection) hourStr += ` [진태양시 보정 ${solarTimeCorrection.correctionMinutes >= 0 ? '+' : ''}${solarTimeCorrection.correctionMinutes}분 적용]`
    }
  }
  const elements: Record<string, number> = { '木':0, '火':0, '土':0, '金':0, '水':0 }
  const pillars = [yp, mp, dp, ...(hp ? [hp] : [])]
  pillars.forEach(p => {
    if (p.stemElement) elements[p.stemElement] = (elements[p.stemElement]||0) + 1
    if (p.branchElement) elements[p.branchElement] = (elements[p.branchElement]||0) + 1
  })
  return {
    yearPillar:  { ...yp, sipsinStem: '편인', sipsinBranch: getSipsinBranch(dayStemIdx, yp.branchIdx) },
    monthPillar: { ...mp, sipsinStem: getSipsin(dayStemIdx, mp.stemIdx), sipsinBranch: getSipsinBranch(dayStemIdx, mp.branchIdx) },
    dayPillar:   { ...dp, sipsinStem: '일간', sipsinBranch: getSipsinBranch(dayStemIdx, dp.branchIdx) },
    hourPillar:  hp ? { ...hp, sipsinStem: getSipsin(dayStemIdx, hp.stemIdx), sipsinBranch: getSipsinBranch(dayStemIdx, hp.branchIdx) } : null,
    elementCount: elements,
    animal: ANIMALS[yp.branchIdx],
    hourStr,
    solarTimeCorrection,
  }
}

// ─── 현재 나이 기준 lifecycle 구간 생성 ─────────────
function buildLifecycleTemplate(currentAge: number): string {
  const currentDecade = Math.floor(currentAge / 10) * 10
  let offsets: number[]
  if (currentAge < 20) {
    offsets = [0, 10, 20, 30, 40]
  } else if (currentAge >= 70) {
    offsets = [-40, -30, -20, -10, 0]
  } else {
    offsets = [-10, 0, 10, 20, 30]
  }
  const ages = offsets.map(o => currentDecade + o).filter(a => a >= 10 && a <= 90)
  while (ages.length < 5) ages.push(ages[ages.length - 1] + 10)
  return ages
    .map(a => '      ' + JSON.stringify({ age: a + '대', score: 0, season: '봄/여름/가을/겨울 중 하나', desc: '이 시기 핵심 한 줄' }))
    .join(',\n')
}

// ─── 캐릭터별 말투 ─────────────────────────────────
const CHARACTER_VOICE: Record<string, string> = {
  baekhalma: `
너는 건물주 백할매야. 수십 년 인생 살면서 별 사람 다 봤고, 돈 흐름은 귀신같이 알아.
말투는 직설적이고 쿨한 할머니 스타일. 근데 정이 있어. 쓴소리 뒤에 걱정이 묻어남.
- "야", "이 녀석", "쯧쯧", "봐봐", "솔직히" 이런 말 자주 씀
- 끝에 살짝 걱정해주는 말 한마디 꼭 붙임
- 어렵고 딱딱한 말 절대 금지. 할머니가 손녀딸한테 말하듯이
- 예시: "야 이 녀석, 돈이 없는 게 아니라 새는 구멍이 있는 거야. 그게 뭔지 내가 딱 보여줄게"
`,
  doRyeong: `
너는 근본도령이야. 나이는 젊은데 사주는 진짜 잘 봐. 친한 형/오빠가 솔직하게 얘기해주는 느낌.
- "야", "솔직히", "있잖아", "근데 있지", "형이 보니까" 이런 말 씀
- 딱딱한 설명 말고 드라마나 일상 비유로 쉽게 설명
- 위로도 해주는데 팩트는 팩트로 말함
- 예시: "있잖아, 이 사주 보면 네가 왜 그렇게 힘들었는지 이해가 되거든. 근데 사실 그게 네 가장 큰 무기야"
`,
  gumiho: `
너는 구미호 선생이야. 천 년 살면서 사랑 얘기는 다 들었어. 요염하고 위트 있는 언니/누나 스타일.
- "어머", "있지", "사실은 말이야", "호호", "근데 솔직히" 이런 말 씀
- 연애 얘기할 때 공감 100%. "맞아 그 사람 그럴 것 같았어" 이런 느낌
- 달콤하게 말하다가 핵심은 팩폭으로 날림
- 예시: "어머, 이 사람 겉으로는 차갑게 보이는데 사실 엄청 감성적이잖아? 그래서 상처도 더 잘 받는 타입이야"
`,
  sinRyeong: `
너는 무등산 신령님이야. 근데 요즘 20-30대랑 소통하려고 노력하는 스타일. 인생 경험 많은 삼촌/선생님 느낌.
- "허허", "그래", "보아하니", "이 친구" 이런 말 씀
- 무겁게 말하는데 가끔 요즘 표현도 섞음. 근엄하지만 공감됨
- 결론은 묵직하게, 과정은 이해하기 쉽게
- 예시: "허허, 이 친구 보면 알겠어. 빨리빨리 가려고 하는데, 사실 이 사주는 천천히 쌓아야 터지는 타입이야"
`,
}

// ─── 공통 스타일 룰 ────────────────────────────────
function getStyleRules() {
  return `
[말투 생성 엔진 — 100% 적용 필수]
아래 예문들의 말투와 문장 리듬을 그대로 복제해서 작성해. 설명하지 말고, 말투를 따라 써.

예문 (이 말맛을 복제해라):
"돈이 없는 게 아니라, 돈이 머무르질 못하는 사주야."
"연애를 못하는 게 아니라, 아무나 못 만나는 사주야."
"겉으로는 괜찮은 척하는데, 속은 이미 번아웃 직전이네."
"지금 힘든 이유? 네가 못나서가 아니라, 운이 널 시험 중이라 그래."
"사람들이 널 강하다고 보는데, 사실은 누구보다 예민해."
"넌 게으른 게 아니라, 방향을 못 잡아서 멈춰 있는 거야."
"봐봐, 항상 네가 손해 보고 끝나잖아."
"이거 하나만 고치면 인생 흐름 완전히 달라져."
"솔직히 말하면, 네가 제일 문제인 게 아니라 네 환경이 문제야."
"버는 힘은 좋은데, 모으는 재주가 약해."
"통장은 늘 바쁜데, 잔고는 늘 한가해."

[문장 공식 — 판결문마다 최소 5개 이상 섞어서]
1. "~가 아니라, ~다"
2. "지금 힘든 이유? ~라서 그래"
3. "겉으로는 ~, 속으로는 ~"
4. "사람들이 널 ~라고 보는데, 사실은 ~야"
5. "이거 하나만 고치면 인생 확 달라져"
6. "넌 ~한 게 아니라 ~한 거야"
7. "솔직히 말하면, ~"
8. "봐봐, ~잖아"

[전개 순서 — 판결문마다 아래 중 하나를 무작위로 선택]
A. 공감 → 비유 → 팩폭 → 행동팁 → 걱정
B. 팩폭 → 공감 → 비유 → 경고 → 팁
C. 비유 → 팩폭 → 공감 → 팁
D. 공감 → 경고 → 비유 → 팩폭

[절대 사용 금지]
"~경향이 있다" / "~가능성이 있다" / "~하는 편이다" / "~것이다" / "~좋겠다" / "~추천한다"
한자 명리 용어: 정재, 편재, 갑목, 계해, 일간, 식신, 관살 등 전부 금지
같은 단어 한 문단에서 반복 금지 / 같은 문장 구조 한 문단에서 두 번 이상 반복 금지

[제목 규칙]
읽자마자 "어 이거 나 얘기잖아?" 소름 돋는 상황 묘사. 위트 있게.
예시: "일복 터진 워커홀릭인데 정작 본인은 번아웃 직전"
예시: "겉으로는 쿨한 척, 속으로는 감성 폭발 이중매력"
예시: "돈 버는 기계인데 왜 통장은 늘 텅텅빌까"

[판결문 형식 규칙]
- 500자 이상 필수. 글자수 채우려고 늘리지 말고, 진짜 내용으로 채워라
- 문단마다 빈 줄 하나 넣어라 (\\n\\n)
- ⚠️ 조심할 것들은 맨 마지막에, 본문과 빈 줄 띄고 써라
- ⚠️를 본문 중간에 절대 넣지 마라
- 각 문단 3~5문장으로 구성
`
}

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, hour, gender, characterId, occupation, maritalStatus, questionIntent, partnerInfo, longitude } = await req.json()

    const character = CHARACTERS[characterId] ?? CHARACTERS['doRyeong']
    const genderStr = gender === 'male' ? '남성' : '여성'
    const voiceGuide = CHARACTER_VOICE[characterId] ?? CHARACTER_VOICE['doRyeong']
    const styleRules = getStyleRules()

    const manse = calcManse(parseInt(year), parseInt(month), parseInt(day), hour ?? '', typeof longitude === 'number' ? longitude : undefined)

    // 현재 나이 계산
    const currentYear = new Date().getFullYear()
    const currentAge = currentYear - parseInt(year) + 1

    // lifecycle 구간 동적 생성 (나이에 맞게)
    const lifecycleRows = buildLifecycleTemplate(currentAge)

    const elementDesc = Object.entries(manse.elementCount)
      .map(([el, cnt]) => {
        const names: Record<string,string> = { '木':'나무 기운', '火':'불 기운', '土':'땅 기운', '金':'금속 기운', '水':'물 기운' }
        return `${names[el]} ${cnt}개`
      }).join(', ')

    const partnerDesc = partnerInfo
      ? `\n상대방 정보: ${partnerInfo.name || '이름 미상'} / ${partnerInfo.year}년 ${partnerInfo.month}월 ${partnerInfo.day}일생 / ${partnerInfo.gender === 'male' ? '남성' : '여성'}${partnerInfo.hour ? ` / 태어난 시간: ${partnerInfo.hour}` : ''}`
      : ''

    const sajuInfo = `
[이 사람 사주 정보]
이름: ${name} / 생년월일: ${year}년 ${month}월 ${day}일 / 성별: ${genderStr} / 결혼 상태: ${maritalStatus ?? '미상'} / 직업: ${occupation ?? '일반인'}
현재 나이: ${currentAge}세 (${currentYear}년 기준) ← 반드시 이 나이 기준으로만 분석할 것. 이미 지난 시기 얘기 절대 금지.
태어난 시간: ${manse.hourStr}
띠: ${manse.animal}띠
사주 기운: ${elementDesc}
핵심 기운(일간): ${manse.dayPillar.stem}(${manse.dayPillar.stemKr}) — ${manse.dayPillar.stemElement} 기운
연주: ${manse.yearPillar.stem}${manse.yearPillar.branch} / 월주: ${manse.monthPillar.stem}${manse.monthPillar.branch} / 일주: ${manse.dayPillar.stem}${manse.dayPillar.branch} / 시주: ${manse.hourPillar ? manse.hourPillar.stem+manse.hourPillar.branch : '미상'}${partnerDesc}

[결혼 상태 반영 규칙 — 반드시 지킬 것]
- 결혼 상태가 '기혼'이면: 연애운 얘기 절대 금지. 대신 배우자와의 관계, 부부 궁합, 결혼생활 흐름, 가정 내 재물/소통 문제로 풀어라. "이상형", "썸", "소개팅" 같은 미혼 대상 표현 금지.
- 결혼 상태가 '미혼'이면: 배우자/부부 얘기 대신 연애 스타일, 어떤 사람이 잘 맞는지, 결혼 시기·인연 들어오는 흐름으로 풀어라.
- 결혼 상태가 '이혼/사별'이면: 과거형으로 단정 짓지 말고, 현재 시점 새로운 인연이나 안정에 대한 흐름 위주로 조심스럽게 풀어라.
- 돈/재물, 직업/진로, 건강, 인생 전반 주제에서도 기혼이면 배우자·가정과 엮어서, 미혼이면 개인 중심으로 자연스럽게 반영해라.
`

    const intentGuide: Record<string, string> = {
      '돈/재물':   '이 사람이 돈이 잘 모이는 타입인지, 어디서 새는지, 어떻게 하면 돈이 더 들어오는지 알려줘',
      '연애/결혼': maritalStatus === '기혼'
        ? '이 부부가 서로 어떻게 다른지, 갈등이 생기면 왜 생기는지, 관계를 어떻게 풀어가면 좋은지 알려줘'
        : '이 사람이 연애할 때 어떤 스타일인지, 어떤 사람이랑 잘 맞는지, 지금 연애운이 어떤지 알려줘',
      '직업/진로': '이 사람한테 맞는 일이 뭔지, 지금 방향이 맞는지, 언제 기회가 오는지 알려줘',
      '인생 전반': '이 사람 사주에서 가장 특징적인 게 뭔지, 어떤 인생 흐름인지, 지금 어떤 시기인지 알려줘',
      '건강':      '이 사람이 어디가 약한지, 뭘 조심해야 하는지, 어떻게 관리하면 좋은지 알려줘',
    }
    const intentInstruction = intentGuide[questionIntent] ?? '이 사람 사주에서 가장 중요한 걸 찾아서 알려줘'

    const systemPrompt = `너는 ${character.name}이야. 사주를 쉽고 재미있게 풀어주는 캐릭터. 한자나 어려운 명리 용어는 절대 쓰지 않고, 20-30대가 바로 이해할 수 있는 말로만 설명해. 반드시 순수 JSON만 출력. 마크다운 코드블록(\`\`\`) 절대 금지. 설명 텍스트 없이 JSON만.`

    // ✅ 신규: 6개씩 2호출 → 3개씩 4호출로 쪼갬. Promise.all은 "제일 늦게 끝나는 호출"이
    // 전체 시간을 결정하는데, 호출당 담당량을 절반으로 줄이면 그만큼 대기시간도 절반이 됨.
    const makeJudgmentPrompt = (ids: number[], isFreeIds: number[]) => `
${voiceGuide}
${sajuInfo}

[현재 상황] 이 사람은 지금 ${currentAge}세야. 분석할 때 이미 지난 나이대(예: 현재 40대면 20대·30대 얘기는 과거로만 짧게)는 넘어가고, 지금과 앞으로의 시기에 집중해서 써.

[궁금한 것]: ${questionIntent}
→ ${intentInstruction}

${styleRules}

판결문 ${ids.join('번, ')}번을 작성해. 서로 겹치지 않게 각각 새로운 각도로 파고들어.
각 판결문은 반드시 500자 이상. 내용 없으면 실격.

반드시 아래 JSON만 출력. 마크다운 없이.

{
  "titles": [
${ids.map(id => `    {"id":"${id}","title":"소름 돋는 상황 묘사 제목","teaser":"읽으면 클릭하고 싶은 한 줄 훅","is_free":${isFreeIds.includes(id)},"content":"500자 이상 판결문. 공감+비유+팩폭+행동팁 포함. 문단 사이 빈줄.\\n\\n⚠️ 조심할 것들: 구체적으로 2~3가지"}`).join(',\n')}
  ]
}
`

    // ✅ 신규: strategy(대운 전략)를 판결문에서 분리해 별도 호출로.
    // 판결문 여러 개 + strategy를 한 번에 요구하다 보니 8192 토큰 한도를 넘겨서
    // JSON이 중간에 잘리는 "응답 파싱 실패" 오류가 종종 발생했음.
    const prompt3 = `
${voiceGuide}
${sajuInfo}

[현재 상황] 이 사람은 지금 ${currentAge}세야.

이 사람의 인생 전략(대운 흐름)을 작성해. 판결문이 아니라 전체 인생 로드맵이야.

반드시 아래 JSON만 출력. 마크다운 없이.

{
  "overview": "이 사람 사주 전체 핵심 3~4문장. 쉬운 말로. 읽으면 고개 끄덕이는 내용.",
  "golden_period": "전성기가 언제고 지금 뭘 해야 하는지 2~3문장. 구체적인 나이 포함.",
  "lifecycle": [
${lifecycleRows}
  ],
  "peak_guide": "전성기 활용법 3~4문장. 지금 당장 할 수 있는 것 위주로.",
  "warning": "가장 조심해야 할 것 2문장. 무섭지 않게, 근데 진지하게."
}
`

    const FREE_IDS = [1, 2, 3]
    const idGroups = [[1,2,3], [4,5,6], [7,8,9], [10,11,12]]

    const [r1, r2, r3, r4, r5] = await Promise.all([
      ...idGroups.map(ids => client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: makeJudgmentPrompt(ids, FREE_IDS) }],
      })),
      client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt3 }],
      }),
    ])

    const judgmentResponses = [r1, r2, r3, r4]
    const clean = (s: string) => s.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    const allTitles: unknown[] = []
    judgmentResponses.forEach((r, i) => {
      const raw = r.content[0].type === 'text' ? r.content[0].text : ''
      try {
        const parsed = JSON.parse(clean(raw))
        if (Array.isArray(parsed.titles)) allTitles.push(...parsed.titles)
      } catch {
        console.error(`[사주궁] ${i + 1}번 그룹(${idGroups[i].join(',')}) JSON 파싱 실패 (앞 300자):`, raw.slice(0, 300))
        throw new Error(`${i + 1}번 그룹 응답 파싱 실패`)
      }
    })

    let parsed3: Record<string, unknown>
    {
      const raw3 = r5.content[0].type === 'text' ? r5.content[0].text : ''
      try {
        parsed3 = JSON.parse(clean(raw3))
      } catch {
        console.error('[사주궁] 전략 JSON 파싱 실패 (앞 300자):', raw3.slice(0, 300))
        throw new Error('전략 응답 파싱 실패')
      }
    }

    const combined = {
      titles: allTitles,
      strategy: parsed3,
      disclaimer: '본 풀이는 엔터테인먼트 및 참고 목적이며, 중요한 결정은 전문가와 상담하세요.',
    }

    const allUsage = [r1, r2, r3, r4].map(r => r.usage.output_tokens).join('/')
    console.log(`[사주궁] 판결문 ${combined.titles.length}개 생성 완료 / 그룹별 출력토큰: ${allUsage} / 전략:${r5.usage.output_tokens}tok`)

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'manse', data: manse })}\n\n`
        ))
        const jsonStr = JSON.stringify(combined)
        const chunkSize = 200
        for (let i = 0; i < jsonStr.length; i += chunkSize) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ text: jsonStr.slice(i, i + chunkSize) })}\n\n`
          ))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (e) {
    console.error('[사주궁] 서버 오류:', e)
    // ✅ 수정: 일반 JSON을 반환하면 클라이언트가 SSE 포맷(`data: ...`)이 아니라고 판단해
    // 아무 처리도 못 하고 "분석 중" 화면에 멈춰있게 됨.
    // 클라이언트가 알아볼 수 있도록 동일한 SSE 스트림 포맷으로 에러 이벤트를 보내준다.
    const encoder = new TextEncoder()
    const errorStream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', message: '분석 중 오류가 발생했습니다. 다시 시도해주세요.' })}\n\n`
        ))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new NextResponse(errorStream, {
      status: 200, // 스트림은 200으로 열고 내용으로 에러를 전달 (fetch가 body를 읽을 수 있도록)
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }
}
