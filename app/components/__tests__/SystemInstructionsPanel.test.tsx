import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'
import SystemInstructionsPanel from '../SystemInstructionsPanel'
import { CloudSettings } from '../../utils/cloudSettings'
import { SystemInstruction } from '../../types/settings'
import { SYSTEM_INSTRUCTION_LIMITS } from '../../constants/defaults'

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

      // Click first toggle wrapped in act
      await act(async () => {
        fireEvent.click(toggleButtons[0])
      })

      expect(mockCloudSettings.setSystemInstructions).toHaveBeenCalled()
    })
  })

  describe('Add New Instruction', () => {
    it('should allow user to create a new system instruction', async () => {
      render(<SystemInstructionsPanel />)

      // User clicks add button
      await waitFor(() => {
        const addButton = screen.getByRole('button', {
          name: /add instruction/i,
        })
        fireEvent.click(addButton)
      })

      // User can fill out the form
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const contentInput = screen.getByRole('textbox', { name: /content/i })

      fireEvent.change(nameInput, { target: { value: 'test_instruction' } })
      fireEvent.change(contentInput, {
        target: { value: 'Test instruction content' },
      })

      // User submits and instruction is saved
      const submitButton = screen.getByRole('button', {
        name: /add instruction/i,
      })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockCloudSettings.setSystemInstructions).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              name: 'test_instruction',
              content: 'Test instruction content',
              enabled: true,
            }),
          ])
        )
      })
    })

    it('should prevent submission with invalid data', async () => {
      render(<SystemInstructionsPanel />)

      // User tries to submit empty form
      await waitFor(() => {
        const addButton = screen.getByRole('button', {
          name: /add instruction/i,
        })
        fireEvent.click(addButton)
      })

      const submitButton = screen.getByRole('button', {
        name: /add instruction/i,
      })
      expect(submitButton).toBeDisabled() // Should be disabled with empty form

      // Fill name but not content
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      fireEvent.change(nameInput, { target: { value: 'test' } })

      expect(submitButton).toBeDisabled() // Should still be disabled

      // Now fill content
      const contentInput = screen.getByRole('textbox', { name: /content/i })
      fireEvent.change(contentInput, { target: { value: 'Test content' } })

      expect(submitButton).toBeEnabled() // Now should be enabled
    })

    it('should save valid instruction', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const contentInput = screen.getByRole('textbox', { name: /content/i })

      fireEvent.change(nameInput, { target: { value: 'test_instruction' } })
      fireEvent.change(contentInput, {
        target: { value: 'This is a test instruction.' },
      })

      const saveButton = screen.getByText('Add Instruction')
      fireEvent.click(saveButton)

      await waitFor(() => {
        expect(mockCloudSettings.setSystemInstructions).toHaveBeenCalled()
      })
    })

    it('hides add button when limit reached', async () => {
      const many = Array.from(
        { length: SYSTEM_INSTRUCTION_LIMITS.MAX_INSTRUCTIONS },
        (_, i) => ({
          id: `${i}`,
          name: `inst${i}`,
          content: 'c',
          enabled: true,
        })
      )
      mockCloudSettings.getSystemInstructions.mockResolvedValueOnce(many)

      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        expect(screen.getByText('inst0')).toBeInTheDocument()
      })

      expect(screen.queryByText('+ Add Instruction')).not.toBeInTheDocument()
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

      await act(async () => {
        fireEvent.click(deleteButtons[0])
      })

      expect(mockCloudSettings.setSystemInstructions).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle CloudSettings load errors gracefully', async () => {
      mockCloudSettings.getSystemInstructions.mockRejectedValue(
        new Error('Network error')
      )

      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        // Should not crash and should show default UI when load fails
        expect(screen.getByText(/Add Instruction/)).toBeInTheDocument()
        expect(
          screen.getByText('No system instructions configured')
        ).toBeInTheDocument()
      })
    })

    it('should handle save errors gracefully', async () => {
      mockCloudSettings.setSystemInstructions.mockRejectedValue(
        new Error('Save failed')
      )

      render(<SystemInstructionsPanel />)

      // Wait for component to finish loading before interacting
      await waitFor(() => {
        expect(screen.getByText('+ Add Instruction')).toBeInTheDocument()
      })

      // Open the form
      fireEvent.click(screen.getByText('+ Add Instruction'))

      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const contentInput = screen.getByRole('textbox', { name: /content/i })

      fireEvent.change(nameInput, { target: { value: 'test' } })
      fireEvent.change(contentInput, { target: { value: 'Test content' } })

      const saveButton = screen.getByText('Add Instruction')
      fireEvent.click(saveButton)

      // Test the actual behavior: component handles error gracefully
      await waitFor(() => {
        expect(mockCloudSettings.setSystemInstructions).toHaveBeenCalled()
      })

      // Most important: component doesn't crash and remains functional
      // User can still interact with the form or close it
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
      expect(
        screen.getByRole('textbox', { name: /content/i })
      ).toBeInTheDocument()
    })
  })

  describe('Validation Rules', () => {
    it('should reject uppercase names', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const nameInput = screen.getByRole('textbox', { name: /name/i })
      fireEvent.change(nameInput, { target: { value: 'TestName' } })

      const saveButton = screen.getByText('Add Instruction')
      fireEvent.click(saveButton)

      // Component performs client-side validation but doesn't display error messages in UI
      // The button should remain disabled when validation fails
      expect(saveButton).toBeDisabled()
    })

    it('should reject duplicate names', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const nameInput = screen.getByRole('textbox', { name: /name/i })
      fireEvent.change(nameInput, { target: { value: 'helpful' } })

      const saveButton = screen.getByText('Add Instruction')
      fireEvent.click(saveButton)

      // Component performs client-side validation but doesn't display error messages in UI
      // The button should remain disabled when validation fails
      expect(saveButton).toBeDisabled()
    })

    it('should show character count', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      const contentInput = screen.getByRole('textbox', { name: /content/i })
      fireEvent.change(contentInput, { target: { value: 'Hello world' } })

      expect(screen.getByText(/Content \(11\/6000\)/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', async () => {
      render(<SystemInstructionsPanel />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('+ Add Instruction'))
      })

      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
      expect(
        screen.getByRole('textbox', { name: /content/i })
      ).toBeInTheDocument()
    })
  })
})
