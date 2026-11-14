import assert from 'node:assert/strict'
import { isAllowedMutationOrigin } from '../lib/mutation-origin.ts'

const request = (origin, site) => ({
  headers: new Headers({
    host: 'sajuya.vercel.app',
    ...(origin ? { origin } : {}),
    ...(site ? { 'sec-fetch-site': site } : {}),
  }),
})

assert.equal(isAllowedMutationOrigin(request('https://sajuya.vercel.app', 'same-origin')), true)
assert.equal(isAllowedMutationOrigin(request('https://other.example', 'same-site')), false)
assert.equal(isAllowedMutationOrigin(request('https://sajuya.vercel.app', 'cross-site')), false)
assert.equal(isAllowedMutationOrigin(request('null', undefined)), false)
assert.equal(isAllowedMutationOrigin(request(undefined, 'cross-site')), false)
assert.equal(isAllowedMutationOrigin({ headers: new Headers({
  host: '127.0.0.1:3107', origin: 'http://127.0.0.1:3107' }) }), true)
assert.equal(isAllowedMutationOrigin({ headers: new Headers({ origin: 'https://sajuya.vercel.app' }) }), false)
assert.equal(isAllowedMutationOrigin(request('http://sajuya.vercel.app', 'same-origin')), false)
console.log('PASS: actual request origin accepted; foreign and cross-site origins denied')
