import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import { SessionProvider } from 'next-auth/react'
import AuthProvider from '../AuthProvider'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  SessionProvider: vi.fn(({ children }) => (
    <div data-testid="session-provider">{children}</div>
  )),
}))

describe('AuthProvider', () => {
  it('wraps children with SessionProvider', () => {
    const TestChild = () => <div data-testid="test-child">Test Child</div>

    render(
      <AuthProvider>
        <TestChild />
      </AuthProvider>
    )

    expect(screen.getByTestId('session-provider')).toBeInTheDocument()
    expect(screen.getByTestId('test-child')).toBeInTheDocument()
    expect(SessionProvider).toHaveBeenCalledTimes(1)
  })

  it('passes through multiple children', () => {
    render(
      <AuthProvider>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </AuthProvider>
    )

    expect(screen.getByTestId('child-1')).toBeInTheDocument()
    expect(screen.getByTestId('child-2')).toBeInTheDocument()
  })
})
