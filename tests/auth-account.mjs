import assert from 'node:assert/strict'
import { syncOAuthAccount } from '../lib/auth-account.ts'

const profile = { id: 'provider-user', name: '가상 계정', email: null, image: null }
let inserts = 0
const store = (find, create, repeatFind = find) => ({
  finds: 0,
  async find() { return ++this.finds === 1 ? find : repeatFind },
  async create() { inserts++; return create },
})

assert.deepEqual(await syncOAuthAccount(store({ exists: true, error: false, code: null }, null), profile), { ready: true })
assert.equal(inserts, 0, 'Existing account must not be overwritten')
assert.deepEqual(await syncOAuthAccount(store({ exists: false, error: false, code: null }, { error: false, code: null }), profile), { ready: true })
assert.deepEqual(await syncOAuthAccount(store({ exists: false, error: false, code: null }, { error: true, code: '23505' }, { exists: true, error: false, code: null }), profile), { ready: true })
assert.deepEqual(await syncOAuthAccount(store({ exists: false, error: false, code: null }, { error: true, code: '23505' }), profile), { ready: false, stage: 'insert', code: '23505' })
assert.deepEqual(await syncOAuthAccount(store({ exists: false, error: true, code: null }, null), profile), { ready: false, stage: 'lookup', code: null })
assert.deepEqual(await syncOAuthAccount(store({ exists: false, error: true, code: 'PGRST000' }, null), profile), { ready: false, stage: 'lookup', code: 'PGRST000' })
assert.deepEqual(await syncOAuthAccount(store({ exists: false, error: false, code: null }, { error: true, code: null }), profile), { ready: false, stage: 'insert', code: null })
assert.deepEqual(await syncOAuthAccount(store({ exists: false, error: false, code: null }, { error: true, code: '42501' }), profile), { ready: false, stage: 'insert', code: '42501' })
assert.deepEqual(await syncOAuthAccount({ async find() { throw Error('network') }, async create() { throw Error('unexpected') } }, profile), { ready: false, stage: 'lookup', code: null })
assert.deepEqual(await syncOAuthAccount({ async find() { return { exists: false, error: false, code: null } }, async create() { throw Error('network') } }, profile), { ready: false, stage: 'insert', code: null })
console.log('PASS: OAuth account sync preserves existing rows, accepts concurrent duplicates, and defers failed lookups and writes')
