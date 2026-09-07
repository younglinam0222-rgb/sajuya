import assert from 'node:assert/strict'
import {
  mergeAiResultForSave,
  publicReadingPayload,
  redactAiResult,
  viewerAccess,
} from '../lib/sajuAccess'
import { assessSampleCompletion, PEAK_GUIDE_LABEL } from '../lib/sajuContract'
import { isPaymentsEnabled } from '../lib/paymentFlags'
import { SAJU_UNLOCK_NYANG } from '../lib/pricing'
import { sajuFullViewButtonLabel, sajuFullViewHint } from '../lib/priceDisplay'

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name)
  console.log('ok', name)
}

ok('unlock costs 2 nyang', SAJU_UNLOCK_NYANG === 2)
ok('peak guide label exact', PEAK_GUIDE_LABEL === '전성기 활용법')
ok('full view button copy', sajuFullViewButtonLabel() === '2냥으로 전체보기')
ok('full view hint copy', sajuFullViewHint() === '3,800원 상당 · 나머지 풀이 9개와 족집게 답변 포함')
ok('payments stay disabled unless env', isPaymentsEnabled() === (process.env.PAYMENTS_ENABLED === 'true'))

const paidBody = {
  titles: [
    { id: '1', category: '성격', title: '무료성격제목', content: '가'.repeat(60), is_free: true },
    { id: '2', category: '재물운', title: '무료재물제목', content: '나'.repeat(60), is_free: true },
    { id: '3', category: '애정운', title: '무료애정제목', content: '다'.repeat(60), is_free: true },
    { id: '4', category: '직업운', title: '유료직업제목', content: '라'.repeat(60), is_free: false },
  ],
  strategy: { overview: '전략본문전략본문', golden_period: '전성기본문전성기본문', peak_guide: '활용법본문활용법본문', warning: '경고본문', final_word: '마지막한마디마지막한마디', lifecycle: [{ age: '30대', score: 80, season: '봄', desc: '흐름' }] },
  personalAnswer: { question: '회사 계속 다닐까요?', answer: '유료족집게답변유료족집게답변유료족집게답변유료족집게답변유료족집게답변' },
}

const publicAi = redactAiResult(paidBody, 'public', { form: { personalQuestion: '회사 계속 다닐까요?' } }) as Record<string, unknown>
const publicTitles = publicAi.titles as Array<{ id: string; content: string }>
ok('public sees exactly 3 titles', publicTitles.length === 3)
ok('public titles are free ids', publicTitles.every(t => ['1', '2', '3'].includes(t.id)))
ok('public has no strategy', publicAi.strategy == null)
ok('public has no personal answer', publicAi.personalAnswer == null)
ok('public payload does not include paid body', JSON.stringify(publicAi).includes('유료직업제목') === false)
ok('public payload does not include personal answer', JSON.stringify(publicAi).includes('유료족집게답변') === false)

const ownerFree = redactAiResult(paidBody, 'owner_free', { form: { personalQuestion: '회사 계속 다닐까요?' } }) as Record<string, unknown>
const ownerTitles = ownerFree.titles as Array<{ id: string; locked?: boolean; content: string; category?: string }>
ok('owner free has 3 free + 9 locked', ownerTitles.filter(t => !t.locked).length === 3 && ownerTitles.filter(t => t.locked).length === 9)
ok('locked slots have category and no body', ownerTitles.filter(t => t.locked).every(t => !!t.category && t.content === ''))
ok('owner free personal is locked without answer', JSON.stringify(ownerFree.personalAnswer).includes('전체보기') === false && (ownerFree.personalAnswer as { answer: string; question: string }).answer === '' && (ownerFree.personalAnswer as { question: string }).question === '회사 계속 다닐까요?')

const ownerPaid = redactAiResult(paidBody, 'owner_paid') as Record<string, unknown>
ok('owner paid keeps paid body', JSON.stringify(ownerPaid).includes('유료직업제목') === true)

ok('non-owner is public even if paid', viewerAccess('owner-1', 'other-2', true) === 'public')
ok('owner unpaid is owner_free', viewerAccess('owner-1', 'owner-1', false) === 'owner_free')
ok('owner paid is owner_paid', viewerAccess('owner-1', 'owner-1', true) === 'owner_paid')

const publicRow = publicReadingPayload({
  share_id: 'abc123456789',
  user_id: 'owner-1',
  character_id: 'baekhalma',
  created_at: '2026-01-01',
  is_paid: true,
  saju_data: { form: { name: '테스트', personalQuestion: '비밀질문' }, saju: { animal: '말' } },
  ai_result: paidBody,
}, 'public')
ok('public share hides paid flag', publicRow.is_paid === false)
ok('public saju_data drops personal question', JSON.stringify(publicRow.saju_data).includes('비밀질문') === false)
ok('public ai_result drops paid content', JSON.stringify(publicRow.ai_result).includes('유료족집게답변') === false)

const mergedUnpaid = mergeAiResultForSave(null, paidBody, false)
const mergedTitles = mergedUnpaid.titles as Array<{ id: string }>
ok('unpaid save strips paid titles', mergedTitles.every(t => ['1', '2', '3'].includes(t.id)))
ok('unpaid save strips strategy', mergedUnpaid.strategy == null)
ok('unpaid save strips personal answer body', (mergedUnpaid.personalAnswer as { answer: string }).answer === '')

const sampleReport = assessSampleCompletion({
  titles: paidBody.titles.slice(0, 3),
  receivedGroupIndexes: [0, 1],
  gotDone: true,
})
ok('sample complete with 3 titles', sampleReport.complete === true)

const incompleteSample = assessSampleCompletion({
  titles: paidBody.titles.slice(0, 2),
  receivedGroupIndexes: [0],
  gotDone: true,
})
ok('sample incomplete without title 3', incompleteSample.complete === false)

console.log('all saju-access tests passed')
