import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ConversationPage from '../page'
import { getServerSession } from 'next-auth'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))

const params = Promise.resolve({ id: 'c1' })

describe('ConversationPage', () => {
  it('renders not found message when missing', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ conversation: null }),
      })
    ) as any
    const Component = await ConversationPage({ params })
    const { findByText } = render(Component as any)
    expect(await findByText(/couldn’t be found/)).toBeInTheDocument()
  })
})
