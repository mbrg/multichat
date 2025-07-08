import { NextAuthOptions } from 'next-auth'
import GitHubProvider from 'next-auth/providers/github'
import { randomUUID } from 'crypto'
import { DirtyUserIdMigration } from '@/services/migration/DirtyUserIdMigration'

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

        // DIRTY MIGRATION - DELETE AFTER ROLLOUT
        // Migrate user data from old format to new format
        try {
          const migration = new DirtyUserIdMigration()
          await migration.migrateUserData(token.sub!)
        } catch (error) {
          // Log error but don't break authentication
          console.error('User ID migration failed:', error)
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
