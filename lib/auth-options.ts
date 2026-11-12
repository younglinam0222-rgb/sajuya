import type { NextAuthOptions } from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import GoogleProvider from 'next-auth/providers/google'
import NaverProvider from 'next-auth/providers/naver'
import { createServerSupabase } from './supabase'
import { loadContentNoticeAck } from './contentNoticeDb'

const supabaseAdmin = createServerSupabase()

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
    async signIn({ user, account }) {
      try {
        const { data: existing, error: lookupError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', user.id)
          .maybeSingle()

        if (lookupError) {
          console.error('[auth] account lookup failed', { provider: account?.provider, code: lookupError.code })
          return false
        }

        if (!existing) {
          // 무료 일일운세 권한은 별도 서버 원장으로 관리
          const {error:insertError}=await supabaseAdmin.from('users').insert({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            yeobjeun_balance: 0,
            streak_days: 0,
            last_visit: null,
          })
          if(insertError && insertError.code!=='23505') {
            console.error('[auth] account insert failed', { provider: account?.provider, code: insertError.code })
            return false
          }
        }
      } catch {
        console.error('[auth] account sync failed', { provider: account?.provider })
        return false
      }
      return true
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as typeof session.user & {id: string; yeobjeun_balance?: number; contentNoticeAcked?: boolean}
        user.id = token.sub as string
        user.contentNoticeAcked = token.contentNoticeAcked === true

        // 세션에 잔액 포함
        try {
          const { data } = await supabaseAdmin
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
      if (token.sub && (trigger === 'signIn' || trigger === 'update' || token.contentNoticeAcked === undefined)) {
        try {
          const ack = await loadContentNoticeAck(token.sub)
          token.contentNoticeAcked = ack.status === 'acked'
        } catch {
          token.contentNoticeAcked = false
        }
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
