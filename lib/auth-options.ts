import type { NextAuthOptions } from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import GoogleProvider from 'next-auth/providers/google'
import NaverProvider from 'next-auth/providers/naver'
import { createServerSupabase } from './supabase'
import { loadContentNoticeAck } from './contentNoticeDb'
import { syncOAuthAccount, type OAuthProfile } from './auth-account'

async function provisionAccount(profile: OAuthProfile) {
  return syncOAuthAccount({
    async find(id) {
      const { data, error } = await createServerSupabase().from('users').select('id').eq('id', id).maybeSingle()
      return { exists: !!data, error: !!error, code: error?.code ?? null }
    },
    async create(account) {
      const { error } = await createServerSupabase().from('users').insert({
        ...account, yeobjeun_balance: 0, streak_days: 0, last_visit: null,
      })
      return { error: !!error, code: error?.code ?? null }
    },
  }, profile)
}

export const authOptions: NextAuthOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID!,
      clientSecret: process.env.NAVER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn() {
      // OAuth identity has already been verified. A transient account-store outage
      // must not turn it into NextAuth's misleading AccessDenied error.
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as typeof session.user & {id: string; yeobjeun_balance?: number; contentNoticeAcked?: boolean; accountReady?: boolean}
        user.id = token.sub as string
        user.contentNoticeAcked = token.contentNoticeAcked === true
        user.accountReady = token.accountReady === true

        // 세션에 잔액 포함
        if (user.accountReady) try {
          const { data } = await createServerSupabase()
            .from('users')
            .select('yeobjeun_balance')
            .eq('id', token.sub)
            .single()
          if (data) user.yeobjeun_balance = data.yeobjeun_balance
        } catch {}
      }
      return session
    },
    async jwt({ token, trigger }) {
      if (!token.sub) return token
      const now = Date.now()
      let accountBecameReady = false
      if (token.accountReady !== true && (trigger === 'signIn' || !token.accountSyncCheckedAt || now - Number(token.accountSyncCheckedAt) >= 30_000)) {
        const result = await provisionAccount({ id: token.sub, name: token.name ?? null,
          email: token.email ?? null, image: token.picture ?? null })
        accountBecameReady = result.ready
        token.accountReady = result.ready
        token.accountSyncCheckedAt = now
        if (!result.ready) console.error('[auth] account sync deferred', { stage: result.stage,
          code: result.code && /^[A-Z0-9]{3,12}$/.test(result.code) ? result.code : null })
      }
      if (token.accountReady === true && (accountBecameReady || trigger === 'signIn' || trigger === 'update' ||
        (token.contentNoticeAcked === undefined && (!token.contentNoticeCheckedAt || now - Number(token.contentNoticeCheckedAt) >= 30_000)))) {
        token.contentNoticeCheckedAt = now
        try {
          const ack = await loadContentNoticeAck(token.sub)
          if (ack.status !== 'unavailable') token.contentNoticeAcked = ack.status === 'acked'
        } catch {
          // Retry after the database is reachable again.
        }
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
