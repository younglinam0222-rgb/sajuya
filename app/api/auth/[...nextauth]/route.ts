import NextAuth from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions = {
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    {
      id: 'naver',
      name: '네이버',
      type: 'oauth',
      authorization: {
        url: 'https://nid.naver.com/oauth2.0/authorize',
        params: { response_type: 'code', scope: '' },
      },
      token: 'https://nid.naver.com/oauth2.0/token',
      userinfo: 'https://openapi.naver.com/v1/nid/me',
      profile(profile: any) {
        return {
          id: profile.response.id,
          name: profile.response.name,
          email: profile.response.email,
          image: profile.response.profile_image,
        }
      },
      clientId: process.env.NAVER_CLIENT_ID,
      clientSecret: process.env.NAVER_CLIENT_SECRET,
    },
  ],
  callbacks: {
    async signIn({ user }: { user: any }) {
      try {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existing) {
          // 신규 가입 → 1냥 자동 지급
          await supabaseAdmin.from('users').insert({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            yeobjeun_balance: 1,
            streak_days: 0,
            last_visit: null,
          })
        }
      } catch (e) {
        console.error('signIn DB error (ignored):', e)
      }
      return true
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.sub as string

        // 세션에 잔액 포함
        try {
          const { data } = await supabaseAdmin
            .from('users')
            .select('yeobjeun_balance')
            .eq('id', token.sub)
            .single()
          if (data) session.user.yeobjeun_balance = data.yeobjeun_balance
        } catch {}
      }
      return session
    },
    async jwt({ token }: { token: any }) {
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
