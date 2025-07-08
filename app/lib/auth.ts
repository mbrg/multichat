import { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { randomUUID } from 'crypto'

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = `/github/${token.sub}`
        if (token.sid) {
          // expose session id to client for logging context
          ;(session as any).sessionId = token.sid as string
        }
      }
      return session
    },
    async jwt({ user, token }) {
      if (user) {
        token.uid = user.id
        // generate stable session id when user authenticates
        token.sid = token.sid ?? randomUUID()
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
}
