import assert from 'node:assert/strict'
import { parseAckBody } from '../lib/contentNoticeParse'
import { contentNoticeHref, safeNextPath } from '../lib/safeNextPath'
import {
  CONTENT_NOTICE_BODY,
  CONTENT_NOTICE_CHECKBOX_LABEL,
  CONTENT_NOTICE_SAVE_UNAVAILABLE,
  contentNoticeSaveErrorMessage,
} from '../lib/contentNotice'
import { classifyContentNoticeError, isMissingRelation } from '../lib/contentNoticeErrors'

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
  assert.equal(safeNextPath('/?open=charge'), '/?open=charge')
  assert.ok(contentNoticeHref('/daily').startsWith('/onboarding/content-notice?next='))
  assert.equal(
    contentNoticeHref('/?open=charge'),
    `/onboarding/content-notice?next=${encodeURIComponent('/?open=charge')}`
  )
}

function testCopy() {
  assert.ok(!CONTENT_NOTICE_BODY.includes('엔터테인먼트먼트'))
  assert.ok(CONTENT_NOTICE_BODY.includes('엔터테인먼트 및 참고 목적'))
  assert.equal(CONTENT_NOTICE_CHECKBOX_LABEL, '위 내용을 읽었으며, AI가 생성하는 참고용 콘텐츠임을 확인했습니다.')
  assert.equal(contentNoticeSaveErrorMessage('unavailable'), CONTENT_NOTICE_SAVE_UNAVAILABLE)
  assert.equal(contentNoticeSaveErrorMessage('content_notice_unavailable'), CONTENT_NOTICE_SAVE_UNAVAILABLE)
  assert.equal(contentNoticeSaveErrorMessage('write_failed'), '확인을 저장하지 못했습니다. 다시 시도해 주세요.')
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

function saveThenReread(store: MemoryAckStore, userId: string, version: string) {
  const saved = store.save(userId, version)
  const read = store.load(userId, version)
  if (!read) return { ok: false as const, code: 'write_failed' }
  return { ok: true as const, duplicate: saved.duplicate, at: read.at }
}

function testStoreIsolation() {
  const store = new MemoryAckStore()
  store.save('user-a', 'v1')
  assert.equal(store.load('user-b', 'v1'), null)
  const again = store.save('user-a', 'v1')
  assert.equal(again.duplicate, true)
  assert.equal(store.rows.length, 1)
}

function testSaveRereadAndRetry() {
  const store = new MemoryAckStore()
  const first = saveThenReread(store, 'user-a', 'v1')
  assert.equal(first.ok, true)
  assert.equal(first.ok && first.duplicate, false)
  const retry = saveThenReread(store, 'user-a', 'v1')
  assert.equal(retry.ok, true)
  assert.equal(retry.ok && retry.duplicate, true)
  assert.equal(retry.ok && first.ok && retry.at, first.at)
  assert.equal(store.rows.length, 1)
}

function testErrorClassification() {
  assert.equal(isMissingRelation({ code: 'PGRST205', message: 'schema cache' }), true)
  assert.equal(isMissingRelation({ code: '42P01', message: 'missing' }), true)
  assert.equal(classifyContentNoticeError({ code: '42501', message: 'permission denied' }).kind, 'permission')
  assert.equal(classifyContentNoticeError({ code: 'PGRST204', message: 'column' }).kind, 'missing_column')
  assert.equal(
    classifyContentNoticeError({ code: '42501', message: 'permission denied for table content_notice_acks' }).kind,
    'permission'
  )
  assert.equal(
    isMissingRelation({ code: '42501', message: 'permission denied for table content_notice_acks' }),
    false
  )
}

testParseAck()
testSafeNext()
testCopy()
testStoreIsolation()
testSaveRereadAndRetry()
testErrorClassification()
console.log('test-content-notice: ok')
