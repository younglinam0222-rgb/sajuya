import assert from 'node:assert/strict'
import { parseAckBody } from '../lib/contentNoticeParse'
import { contentNoticeHref, safeNextPath } from '../lib/safeNextPath'
import { CONTENT_NOTICE_BODY, CONTENT_NOTICE_CHECKBOX_LABEL } from '../lib/contentNotice'

function testParseAck() {
  assert.equal(parseAckBody(undefined).ok, false)
  assert.equal(parseAckBody(null).ok, false)
  assert.equal((parseAckBody({}) as { code: string }).code, 'missing')
  assert.equal((parseAckBody({ acknowledged: false }) as { code: string }).code, 'not_true')
  assert.equal((parseAckBody({ acknowledged: 'true' }) as { code: string }).code, 'not_true')
  assert.equal((parseAckBody({ acknowledged: 1 }) as { code: string }).code, 'not_true')
  assert.equal(parseAckBody({ acknowledged: true }).ok, true)
}

function testSafeNext() {
  assert.equal(safeNextPath('https://evil.com'), '/')
  assert.equal(safeNextPath('//evil.com'), '/')
  assert.equal(safeNextPath('/saju'), '/saju')
  assert.equal(safeNextPath('/onboarding/content-notice'), '/')
  assert.ok(contentNoticeHref('/daily').startsWith('/onboarding/content-notice?next='))
}

function testCopy() {
  assert.ok(!CONTENT_NOTICE_BODY.includes('엔터테인먼트먼트'))
  assert.ok(CONTENT_NOTICE_BODY.includes('엔터테인먼트 및 참고 목적'))
  assert.equal(CONTENT_NOTICE_CHECKBOX_LABEL, '위 내용을 읽었으며, AI가 생성하는 참고용 콘텐츠임을 확인했습니다.')
}

type AckRow = { userId: string; version: string; at: string }

class MemoryAckStore {
  rows: AckRow[] = []
  load(userId: string, version: string) {
    return this.rows.find((r) => r.userId === userId && r.version === version) ?? null
  }
  save(userId: string, version: string) {
    const existing = this.load(userId, version)
    if (existing) return { duplicate: true, at: existing.at }
    const at = new Date().toISOString()
    this.rows.push({ userId, version, at })
    return { duplicate: false, at }
  }
}

function testStoreIsolation() {
  const store = new MemoryAckStore()
  store.save('user-a', 'v1')
  assert.equal(store.load('user-b', 'v1'), null)
  const again = store.save('user-a', 'v1')
  assert.equal(again.duplicate, true)
  assert.equal(store.rows.length, 1)
}

testParseAck()
testSafeNext()
testCopy()
testStoreIsolation()
console.log('test-content-notice: ok')
