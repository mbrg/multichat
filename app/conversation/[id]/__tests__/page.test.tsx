import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ConversationPage from '../page'
import * as service from '../../../services/ConversationService'
import { getServerSession } from 'next-auth'

vi.mock('../../../services/ConversationService')
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))

const params = Promise.resolve({ id: 'c1' })

describe('ConversationPage', () => {
  it('renders not found message when missing', async () => {
    vi.mocked(service.getConversation).mockResolvedValue(null)
    const Component = await ConversationPage({ params })
    const { findByText } = render(Component as any)
    expect(await findByText(/couldn’t be found/)).toBeInTheDocument()
  })
})
