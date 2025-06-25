import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'
import SystemInstructionsPanel from '../SystemInstructionsPanel'
import { CloudSettings } from '../../utils/cloudSettings'
import { SystemInstruction } from '../../types/settings'

// Mock dependencies
vi.mock('next-auth/react')
vi.mock('../../utils/cloudSettings')

const mockSession = vi.mocked(useSession)
const mockCloudSettings = vi.mocked(CloudSettings)

describe('SystemInstructionsPanel', () => {
  const mockInstructions: SystemInstruction[] = [
    {
      id: '1',
      name: 'helpful',
      content: 'You are a helpful assistant.',
      enabled: true,
    },
    {
      id: '2',
      name: 'creative',
      content: 'You are a creative assistant that thinks outside the box.',
      enabled: false,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    mockSession.mockReturnValue({
      data: {
        user: { id: 'test-user', email: 'test@example.com' },
        expires: '2024-12-31T23:59:59.999Z',
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    mockCloudSettings.getSystemInstructions.mockResolvedValue(mockInstructions)
    mockCloudSettings.setSystemInstructions.mockResolvedValue()
  })

  describe('Basic Functionality', () => {
    it('should render system instructions panel', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        expect(screen.getByText(/System Instructions/)).toBeInTheDocument()
      })

      expect(screen.getByText('helpful')).toBeInTheDocument()
      expect(screen.getByText('creative')).toBeInTheDocument()
      expect(screen.getByText('+ Add Instruction')).toBeInTheDocument()
    })

    it('should show loading state initially', async () => {
      render(<SystemInstructionsPanel />)

      // Check for loading skeleton
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('helpful')).toBeInTheDocument()
      })
    })

    it('should show unauthenticated state', () => {
      mockSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
        update: vi.fn(),
      })

      render(<SystemInstructionsPanel />)

      expect(screen.getByText(/Sign in to manage/)).toBeInTheDocument()
    })
  })

  describe('System Instructions Management', () => {
    it('should display system instructions with correct content', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        expect(screen.getByText('helpful')).toBeInTheDocument()
        expect(screen.getByText('creative')).toBeInTheDocument()
      })

      expect(
        screen.getByText('You are a helpful assistant.')
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          'You are a creative assistant that thinks outside the box.'
        )
      ).toBeInTheDocument()
    })

    it('should show enabled/disabled status', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        expect(screen.getByText('helpful')).toBeInTheDocument()
      })

      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('should handle toggle functionality', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        expect(screen.getByText('helpful')).toBeInTheDocument()
      })

      // Find toggle buttons
      const toggleButtons = document.querySelectorAll(
        '.relative.w-10.h-5.rounded-full'
      )
      expect(toggleButtons.length).toBe(2)

      // Click first toggle
      fireEvent.click(toggleButtons[0])

      expect(mockCloudSettings.setSystemInstructions).toHaveBeenCalled()
    })
  })

  describe('Add New Instruction', () => {
    it('should show add form when button clicked', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        expect(screen.getByText('+ Add Instruction')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('+ Add Instruction'))

      expect(screen.getByText('Add New System Instruction')).toBeInTheDocument()
      expect(screen.getByLabelText(/Name:/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Content:/)).toBeInTheDocument()
    })

    it('should validate name field', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      })
    })

    it('should validate content field', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const nameInput = screen.getByLabelText(/Name:/)
      fireEvent.change(nameInput, { target: { value: 'test_name' } })

      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Content is required')).toBeInTheDocument()
      })
    })

    it('should save valid instruction', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const nameInput = screen.getByLabelText(/Name:/)
      const contentInput = screen.getByLabelText(/Content:/)

      fireEvent.change(nameInput, { target: { value: 'test_instruction' } })
      fireEvent.change(contentInput, {
        target: { value: 'This is a test instruction.' },
      })

      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockCloudSettings.setSystemInstructions).toHaveBeenCalled()
      })
    })
  })

  describe('Edit Instruction', () => {
    it('should open edit form when edit button clicked', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        expect(screen.getByText('helpful')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByTitle('Edit instruction')
      fireEvent.click(editButtons[0])

      expect(screen.getByText('Edit System Instruction')).toBeInTheDocument()
      expect(screen.getByDisplayValue('helpful')).toBeInTheDocument()
      expect(
        screen.getByDisplayValue('You are a helpful assistant.')
      ).toBeInTheDocument()
    })
  })

  describe('Delete Instruction', () => {
    it('should delete instruction when delete button clicked', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        expect(screen.getByText('helpful')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('Delete instruction')
      fireEvent.click(deleteButtons[0])

      expect(mockCloudSettings.setSystemInstructions).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle CloudSettings load errors', async () => {
      mockCloudSettings.getSystemInstructions.mockRejectedValue(
        new Error('Network error')
      )

      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        // Should not crash and should show some content
        expect(screen.getByText(/Add Instruction/)).toBeInTheDocument()
      })
    })

    it('should handle save errors', async () => {
      mockCloudSettings.setSystemInstructions.mockRejectedValue(
        new Error('Save failed')
      )

      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const nameInput = screen.getByLabelText(/Name:/)
      const contentInput = screen.getByLabelText(/Content:/)

      fireEvent.change(nameInput, { target: { value: 'test' } })
      fireEvent.change(contentInput, { target: { value: 'Test content' } })

      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/Failed to save/)).toBeInTheDocument()
      })
    })
  })

  describe('Validation Rules', () => {
    it('should reject uppercase names', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const nameInput = screen.getByLabelText(/Name:/)
      fireEvent.change(nameInput, { target: { value: 'TestName' } })

      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Name must be lowercase')).toBeInTheDocument()
      })
    })

    it('should reject duplicate names', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const nameInput = screen.getByLabelText(/Name:/)
      fireEvent.change(nameInput, { target: { value: 'helpful' } })

      const saveButton = screen.getByText('Save')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Name must be unique')).toBeInTheDocument()
      })
    })

    it('should show character count', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const contentInput = screen.getByLabelText(/Content:/)
      fireEvent.change(contentInput, { target: { value: 'Hello world' } })

      expect(screen.getByText('11 / 6000')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      expect(screen.getByLabelText(/Name:/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Content:/)).toBeInTheDocument()
    })
  })
})
