import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import PublishButton from '../PublishButton'

describe('PublishButton', () => {
  it('calls on publish', async () => {
    const user = userEvent.setup()
    global.fetch = vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve({ id: '1', url: 'u' }) })
    ) as any
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn() },
      configurable: true,
    })
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new Error('no')),
      configurable: true,
    })
    render(
      <PublishButton
        disabled={false}
        messages={[
          { id: '1', role: 'user', content: '', timestamp: new Date() },
        ]}
      />
    )
    await user.click(screen.getByRole('button'))
    expect(fetch).toHaveBeenCalled()
    expect(await screen.findByText(/now public/)).toBeInTheDocument()
  })
})
