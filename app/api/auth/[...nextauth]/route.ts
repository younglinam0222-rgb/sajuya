// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import KakaoProvider from 'next-auth/providers/kakao'
import GoogleProvider from 'next-auth/providers/google'
import { createClient } from '@supabase/supabase-js'

// service role key 사용 (RLS 우회)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const handler = NextAuth({
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
    async signIn({ user }) {
      try {
        const { data: existing } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existing) {
          const { error } = await supabaseAdmin.from('users').insert({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            yeobjeun_balance: 1,
            streak_days: 0,
            last_visit: null,
          })
          if (error) {
            console.error('signIn DB insert error:', error)
            return false  // 저장 실패 시 로그인 차단
          }
        }
        return true
      } catch (e) {
        console.error('signIn error:', e)
        return false
      }
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub as string
      }
      return session
    },
    async jwt({ token }) {
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
