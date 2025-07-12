import { NextAuthOptions } from 'next-auth'
import NextAuth from 'next-auth/next'
import GitHubProvider from 'next-auth/providers/github'
import { randomUUID } from 'crypto'
// ==================== TEMPORARY MIGRATION IMPORT - REMOVE AFTER 2025-02-12 ====================
import {
  migrateAllUserData,
  isMigrationCompleted,
  setMigrationCompleted,
} from '../../../utils/crypto-migration'
import { getKVStore } from '../../../services/kv'
import { log } from '../../../services/LoggingService'
// ============================================================================================

const authOptions: NextAuthOptions = {
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

        // ==================== TEMPORARY MIGRATION CODE - REMOVE AFTER 2025-02-12 ====================
        // Perform crypto key derivation migration on user login
        try {
          const userId = `/github/${user.id}`
          const kvStore = await getKVStore()

          // Check if migration has already been completed for this user
          const alreadyMigrated = await isMigrationCompleted(userId, kvStore)

          if (!alreadyMigrated) {
            log.info(
              '[MIGRATION] User logged in, checking if migration needed',
              { userId }
            )

            // Perform the migration
            const migrationResult = await migrateAllUserData(userId, kvStore)

            if (migrationResult.success) {
              // Mark migration as completed
              await setMigrationCompleted(userId, kvStore)
              log.info(
                '[MIGRATION] Successfully completed migration on login',
                {
                  userId,
                  migratedKeys: migrationResult.migratedKeys.length,
                }
              )
            } else {
              log.error('[MIGRATION] Migration failed on login', undefined, {
                userId,
                failedKeys: migrationResult.failedKeys,
                errors: migrationResult.errors,
              })
              // Don't throw - allow user to continue but log the issue
            }
          } else {
            log.debug('[MIGRATION] User already migrated, skipping', { userId })
          }
        } catch (error) {
          // Don't fail authentication due to migration errors
          log.error(
            '[MIGRATION] Unexpected error during login migration',
            error as Error,
            {
              userId: user.id,
            }
          )
        }
        // ============================================================================================
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

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
