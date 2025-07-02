import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import type { LogContext } from '@/services/LoggingService'

export async function getServerLogContext(): Promise<LogContext> {
  try {
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      return { userId: session.user.id, sessionId: session.sessionId }
    }
  } catch {
    // ignore errors fetching session
  }
  return {}
}
