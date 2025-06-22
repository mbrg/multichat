import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AttachmentPreview from '../AttachmentPreview'
import type { Attachment } from '../../types/chat'

describe('AttachmentPreview', () => {
  const createMockAttachment = (overrides: Partial<Attachment> = {}): Attachment => ({
    id: 'att-1',
    name: 'test-file.jpg',
    type: 'image/jpeg',
    size: 1024,
    data: 'base64data',
    ...overrides
  })

  it('renders image attachment with preview', () => {
    const attachment = createMockAttachment({
      type: 'image/jpeg',
      preview: 'data:image/jpeg;base64,preview'
    })

    render(<AttachmentPreview attachment={attachment} />)

    const image = screen.getByRole('img', { name: 'test-file.jpg' })
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'data:image/jpeg;base64,preview')
  })

  it('renders non-image attachment with file info', () => {
    const attachment = createMockAttachment({
      name: 'document.pdf',
      type: 'application/pdf',
      size: 2048000 // 2MB
    })

    render(<AttachmentPreview attachment={attachment} />)

    expect(screen.getByText('document.pdf')).toBeInTheDocument()
    expect(screen.getByText('2.0 MB')).toBeInTheDocument()
    expect(screen.getByText('📄')).toBeInTheDocument() // Document icon
  })

  it('displays correct file size formatting', () => {
    const testCases = [
      { size: 500, expected: '500 B' },
      { size: 1536, expected: '1.5 KB' },
      { size: 2097152, expected: '2.0 MB' }
    ]

    testCases.forEach(({ size, expected }, index) => {
      const attachment = createMockAttachment({
        id: `att-${index}`,
        name: `file-${index}.txt`,
        type: 'text/plain',
        size
      })

      const { unmount } = render(<AttachmentPreview attachment={attachment} />)

      expect(screen.getByText(expected)).toBeInTheDocument()
      unmount()
    })
  })

  it('displays correct icons for different file types', () => {
    const fileTypes = [
      { type: 'image/jpeg', icon: '🖼️' },
      { type: 'audio/mp3', icon: '🎵' },
      { type: 'application/pdf', icon: '📄' },
      { type: 'text/plain', icon: '📄' },
      { type: 'application/unknown', icon: '📎' }
    ]

    fileTypes.forEach(({ type, icon }, index) => {
      const attachment = createMockAttachment({
        id: `att-${index}`,
        type,
        name: `file.${type.split('/')[1]}`
      })

      const { unmount } = render(<AttachmentPreview attachment={attachment} />)

      expect(screen.getByText(icon)).toBeInTheDocument()
      unmount()
    })
  })

  it('calls onRemove when remove button is clicked for image', () => {
    const onRemove = vi.fn()
    const attachment = createMockAttachment({
      type: 'image/jpeg',
      preview: 'data:image/jpeg;base64,preview'
    })

    render(<AttachmentPreview attachment={attachment} onRemove={onRemove} />)

    const removeButton = screen.getByLabelText('Remove attachment')
    fireEvent.click(removeButton)

    expect(onRemove).toHaveBeenCalledWith('att-1')
  })

  it('calls onRemove when remove button is clicked for non-image', () => {
    const onRemove = vi.fn()
    const attachment = createMockAttachment({
      type: 'application/pdf'
    })

    render(<AttachmentPreview attachment={attachment} onRemove={onRemove} />)

    const removeButton = screen.getByLabelText('Remove attachment')
    fireEvent.click(removeButton)

    expect(onRemove).toHaveBeenCalledWith('att-1')
  })

  it('does not show remove button when onRemove is not provided', () => {
    const attachment = createMockAttachment({
      type: 'image/jpeg',
      preview: 'data:image/jpeg;base64,preview'
    })

    render(<AttachmentPreview attachment={attachment} />)

    expect(screen.queryByLabelText('Remove attachment')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const attachment = createMockAttachment()

    const { container } = render(
      <AttachmentPreview attachment={attachment} className="custom-class" />
    )

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles image without preview gracefully', () => {
    const attachment = createMockAttachment({
      type: 'image/jpeg',
      preview: undefined
    })

    render(<AttachmentPreview attachment={attachment} />)

    // Should render as file info instead of image
    expect(screen.getByText('test-file.jpg')).toBeInTheDocument()
    expect(screen.getByText('🖼️')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('truncates long file names in non-image view', () => {
    const attachment = createMockAttachment({
      name: 'very-long-file-name-that-should-be-truncated.pdf',
      type: 'application/pdf'
    })

    const { container } = render(<AttachmentPreview attachment={attachment} />)

    const nameElement = container.querySelector('.truncate')
    expect(nameElement).toBeInTheDocument()
    expect(nameElement).toHaveTextContent('very-long-file-name-that-should-be-truncated.pdf')
  })

  it('shows hover effect for remove button on images', () => {
    const onRemove = vi.fn()
    const attachment = createMockAttachment({
      type: 'image/jpeg',
      preview: 'data:image/jpeg;base64,preview'
    })

    const { container } = render(<AttachmentPreview attachment={attachment} onRemove={onRemove} />)

    const removeButton = container.querySelector('.opacity-0.group-hover\\:opacity-100')
    expect(removeButton).toBeInTheDocument()
  })

  it('handles audio file type correctly', () => {
    const attachment = createMockAttachment({
      name: 'audio.mp3',
      type: 'audio/mp3',
      size: 5242880 // 5MB
    })

    render(<AttachmentPreview attachment={attachment} />)

    expect(screen.getByText('audio.mp3')).toBeInTheDocument()
    expect(screen.getByText('5.0 MB')).toBeInTheDocument()
    expect(screen.getByText('🎵')).toBeInTheDocument()
  })

  it('handles document file types correctly', () => {
    const documentTypes = [
      { type: 'application/pdf', expectedIcon: '📄' },
      { type: 'text/plain', expectedIcon: '📄' },
      { type: 'application/msword', expectedIcon: '📎' } // msword doesn't contain 'document' so gets default icon
    ]

    documentTypes.forEach(({ type, expectedIcon }, index) => {
      const attachment = createMockAttachment({
        id: `doc-${index}`,
        type,
        name: `document.${type.split('/')[1]}`
      })

      const { unmount } = render(<AttachmentPreview attachment={attachment} />)

      expect(screen.getByText(expectedIcon)).toBeInTheDocument()
      unmount()
    })
  })

  it('handles empty or missing file name', () => {
    const attachment = createMockAttachment({
      name: '',
      type: 'text/plain'
    })

    expect(() => {
      render(<AttachmentPreview attachment={attachment} />)
    }).not.toThrow()
  })
})