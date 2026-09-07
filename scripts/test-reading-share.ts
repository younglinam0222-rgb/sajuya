import assert from 'node:assert/strict'
import { buildPublicShareView, clipDisplayName, isShareFunnelEvent, kakaoShareCard } from '../lib/readingShare'
import { InMemoryShareStore } from '../lib/shareStore'
import { isShareTokenShape, newShareToken } from '../lib/shareToken'

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name)
  console.log('ok', name)
}

const ai = JSON.stringify({
  titles: [
    { id: '1', category: '성격', title: '성격제목', content: '김민수 성격 본문' },
    { id: '4', category: '직업운', title: '직업제목', content: '직장인 본문' },
  ],
  strategy: { overview: '전략 개요', warning: '주의' },
  personalAnswer: { question: '그 사람  inter?', answer: '비밀 답변' },
})

const hidden = buildPublicShareView({
  aiResult: ai,
  characterId: 'gumiho',
  displayName: '별명별명',
  includePersonal: false,
})
ok('default excludes personal', hidden.personalAnswer === null && hidden.includePersonal === false)
ok('keeps titles and strategy', hidden.titles.length === 2 && !!hidden.strategy)
ok('no birth keys in public view', !('year' in hidden) && !('saju_data' in hidden) && !('user_email' in hidden) && !('share_id' in hidden))
ok('nickname clipped', clipDisplayName('아주아주긴이름입니다진짜로').length === 12)

const shown = buildPublicShareView({ aiResult: ai, displayName: '별명', includePersonal: true })
ok('opt-in personal included', shown.personalAnswer?.answer === '비밀 답변')

const card = kakaoShareCard('별명')
ok('kakao preview has no birth or question', !card.description.includes('1990') && !card.title.includes('그 사람'))

ok('share click is not purchase', isShareFunnelEvent('share_click') && isShareFunnelEvent('purchase_complete'))
ok('unknown funnel rejected', !isShareFunnelEvent('kakao_sent') && !isShareFunnelEvent('conversion'))

const token = newShareToken()
ok('token hard to guess', isShareTokenShape(token) && token.length >= 32)
ok('reading id is not a share token', !isShareTokenShape('abc123456789'))

async function main() {
  const store = new InMemoryShareStore()
  store.seed({
    shareId: 'abc123456789',
    userId: 'owner1',
    isPaid: true,
    aiResult: ai,
    characterId: 'gumiho',
  })
  store.seed({
    shareId: 'unpaid123456',
    userId: 'owner1',
    isPaid: false,
    aiResult: ai,
    characterId: 'gumiho',
  })
  ok('not purchased blocked', store.enable('unpaid123456', 'owner1').code === 'not_purchased')
  ok('other user cannot enable', store.enable('abc123456789', 'other').code === 'forbidden')

  const first = store.enable('abc123456789', 'owner1', { includePersonal: false, displayName: '별명' })
  ok('enable ok', first.ok && !!first.token)
  const guest = store.readPublic(first.token!)
  ok('guest can read without login', guest.ok && guest.view.displayName === '별명' && guest.view.personalAnswer === null)

  const withQ = store.enable('abc123456789', 'owner1', { includePersonal: true })
  ok('include personal after update', store.readPublic(withQ.token!).ok && store.readPublic(withQ.token!).view?.personalAnswer?.answer === '비밀 답변')

  const oldToken = first.token!
  const reissued = store.reissue('abc123456789', 'owner1')
  ok('reissue new token', reissued.ok && reissued.token !== oldToken)
  ok('old token blocked after reissue', store.readPublic(oldToken).code === 'not_found')
  ok('new token works', store.readPublic(reissued.token!).ok)

  store.disable('abc123456789', 'owner1')
  ok('disabled token blocked', store.readPublic(reissued.token!).code === 'not_found')

  ok('share token is not a personal shareId', first.token !== 'abc123456789' && !isShareTokenShape('abc123456789'))
  console.log('all reading share tests passed')
}

main()
