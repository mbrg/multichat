import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock next-auth/react globally
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock next-auth server session
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock StorageService for tests
vi.mock('./services/storage', () => ({
  StorageService: {
    getStorage: vi.fn(),
    getCloudStorage: vi.fn(),
    getEnvironmentStorage: vi.fn(),
  },
}))

// Mock ServerKeys for tests
vi.mock('./utils/serverKeys', () => ({
  ServerKeys: {
    getApiKey: vi.fn().mockResolvedValue(null),
    hasApiKey: vi.fn().mockResolvedValue(false),
    getAllApiKeys: vi.fn().mockResolvedValue({}),
  },
}))

// Mock DOM methods not available in JSDOM
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
})

// Set up test environment variables
process.env.KV_ENCRYPTION_KEY = 'test-encryption-key-for-testing'

// Clear mocks between tests
import { beforeEach } from 'vitest'
beforeEach(() => {
  vi.clearAllMocks()
})
